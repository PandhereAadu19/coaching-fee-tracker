import { randomUUID } from "node:crypto";
import { Prisma, type PrismaClient } from "@prisma/client";
import { splitGstInclusive } from "./money";

export type PayOutcome = "success" | "fail" | "cancel";

export type PaymentDecision =
  | { kind: "not_found" }
  | { kind: "forbidden" }
  | { kind: "existing"; paymentId: string }
  | { kind: "no_payment"; outcome: "fail" | "cancel" }
  | { kind: "already_paid" }
  | { kind: "create"; amount: number };

/** Pure decision logic, so it can be tested without a database. */
export function decidePayment(args: {
  instalment: { id: string; amount: number; paid: number; ownerUserId: string };
  userId: string;
  outcome: PayOutcome;
  existingPayment?: { id: string; instalmentId: string | null } | null;
}): PaymentDecision {
  const { instalment, userId, outcome, existingPayment } = args;
  if (instalment.ownerUserId !== userId) return { kind: "forbidden" };
  if (existingPayment) {
    return existingPayment.instalmentId === instalment.id
      ? { kind: "existing", paymentId: existingPayment.id }
      : { kind: "forbidden" };
  }
  if (outcome !== "success") return { kind: "no_payment", outcome };
  const balance = instalment.amount - instalment.paid;
  if (balance <= 0) return { kind: "already_paid" };
  return { kind: "create", amount: balance };
}

export function nextReceiptNumber(last: string | null, year: number): string {
  const m = last ? /^RCPT-(\d{4})-(\d+)$/.exec(last) : null;
  const n = m && Number(m[1]) === year ? Number(m[2]) + 1 : 1;
  return `RCPT-${year}-${String(n).padStart(4, "0")}`;
}

export type PayResult =
  | { kind: "not_found" | "forbidden" | "already_paid" }
  | { kind: "no_payment"; outcome: "fail" | "cancel" }
  | { kind: "paid"; paymentId: string; receiptId: string | null; replay: boolean };

export async function payInstalment(
  db: PrismaClient,
  args: {
    userId: string;
    instalmentId: string;
    outcome: PayOutcome;
    idempotencyKey: string;
    today: Date;
  }
): Promise<PayResult> {
  const instalment = await db.instalment.findUnique({
    where: { id: args.instalmentId },
    include: {
      plan: { include: { student: { select: { parentUserId: true } } } },
      payments: { where: { status: "SUCCESS" }, select: { amount: true } },
    },
  });
  if (!instalment) return { kind: "not_found" };

  const existing = await db.payment.findUnique({
    where: { idempotencyKey: args.idempotencyKey },
    select: { id: true, instalmentId: true },
  });

  const decision = decidePayment({
    instalment: {
      id: instalment.id,
      amount: instalment.amount,
      paid: instalment.payments.reduce((s, p) => s + p.amount, 0),
      ownerUserId: instalment.plan.student.parentUserId,
    },
    userId: args.userId,
    outcome: args.outcome,
    existingPayment: existing,
  });

  if (decision.kind === "forbidden") return { kind: "forbidden" };
  if (decision.kind === "already_paid") return { kind: "already_paid" };
  if (decision.kind === "no_payment") return { kind: "no_payment", outcome: decision.outcome };
  if (decision.kind === "not_found") return { kind: "not_found" };

  if (decision.kind === "existing") {
    const receipt = await db.receipt.findUnique({
      where: { paymentId: decision.paymentId },
      select: { id: true },
    });
    return { kind: "paid", paymentId: decision.paymentId, receiptId: receipt?.id ?? null, replay: true };
  }

  const amount = decision.amount;
  const gstRate = instalment.plan.gstRate;

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const out = await db.$transaction(async (tx) => {
        const last = await tx.receipt.findFirst({
          orderBy: { number: "desc" },
          select: { number: true },
        });
        const number = nextReceiptNumber(last?.number ?? null, args.today.getUTCFullYear());
        const payment = await tx.payment.create({
          data: {
            instalmentId: instalment.id,
            amount,
            method: "MOCK_GATEWAY",
            reference: `MOCK-${randomUUID().slice(0, 8).toUpperCase()}`,
            status: "SUCCESS",
            paidAt: args.today,
            idempotencyKey: args.idempotencyKey,
          },
        });
        const gst = splitGstInclusive(amount, gstRate);
        const receipt = await tx.receipt.create({
          data: {
            paymentId: payment.id,
            number,
            baseAmount: gst.base,
            gstAmount: gst.gst,
            total: gst.total,
          },
        });
        // Stop-on-payment: pending reminders for this instalment are cancelled.
        await tx.reminder.updateMany({
          where: { instalmentId: instalment.id, status: "PENDING" },
          data: { status: "CANCELLED" },
        });
        return { paymentId: payment.id, receiptId: receipt.id };
      });
      return { kind: "paid", ...out, replay: false };
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
        // Double click with the same key, or a receipt number clash.
        const again = await db.payment.findUnique({
          where: { idempotencyKey: args.idempotencyKey },
          include: { receipt: { select: { id: true } } },
        });
        if (again && again.instalmentId === instalment.id) {
          return { kind: "paid", paymentId: again.id, receiptId: again.receipt?.id ?? null, replay: true };
        }
        continue;
      }
      throw e;
    }
  }
  throw new Error("Could not allocate a receipt number");
}