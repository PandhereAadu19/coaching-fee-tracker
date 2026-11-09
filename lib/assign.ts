import { randomUUID } from "node:crypto";
import { Prisma, type PrismaClient } from "@prisma/client";
import { splitGstInclusive } from "./money";
import { nextReceiptNumber } from "./payments";

export type AssignDecision = "ok" | "already_assigned" | "already_paid" | "exceeds_balance";

export function decideAssign(args: {
  payment: { instalmentId: string | null; amount: number };
  balance: number;
}): AssignDecision {
  if (args.payment.instalmentId) return "already_assigned";
  if (args.balance <= 0) return "already_paid";
  if (args.payment.amount > args.balance) return "exceeds_balance";
  return "ok";
}

export async function assignPayment(
  db: PrismaClient,
  args: { paymentId: string; instalmentId: string; today: Date }
): Promise<{ kind: "not_found" | "already_assigned" | "already_paid" | "exceeds_balance" } | { kind: "ok"; receiptId: string }> {
  const payment = await db.payment.findUnique({ where: { id: args.paymentId } });
  const instalment = await db.instalment.findUnique({
    where: { id: args.instalmentId },
    include: { plan: true, payments: { where: { status: "SUCCESS" }, select: { amount: true } } },
  });
  if (!payment || !instalment) return { kind: "not_found" };

  const balance = instalment.amount - instalment.payments.reduce((s, p) => s + p.amount, 0);
  const decision = decideAssign({ payment, balance });
  if (decision !== "ok") return { kind: decision };

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const out = await db.$transaction(async (tx) => {
        const claimed = await tx.payment.updateMany({
          where: { id: payment.id, instalmentId: null },
          data: { instalmentId: instalment.id, status: "SUCCESS", paidAt: payment.paidAt ?? args.today },
        });
        if (claimed.count === 0) return null;

        const last = await tx.receipt.findFirst({ orderBy: { number: "desc" }, select: { number: true } });
        const gst = splitGstInclusive(payment.amount, instalment.plan.gstRate);
        const receipt = await tx.receipt.create({
          data: {
            paymentId: payment.id,
            number: nextReceiptNumber(last?.number ?? null, args.today.getUTCFullYear()),
            baseAmount: gst.base,
            gstAmount: gst.gst,
            total: gst.total,
          },
        });
        await tx.reminder.updateMany({
          where: { instalmentId: instalment.id, status: "PENDING" },
          data: { status: "CANCELLED" },
        });
        return receipt.id;
      });
      if (out === null) return { kind: "already_assigned" };
      return { kind: "ok", receiptId: out };
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") continue;
      throw e;
    }
  }
  throw new Error("Could not allocate a receipt number");
}

/** Demo helper: a payment whose reference matches nothing. It never marks an instalment paid. */
export async function simulateUnmatched(db: PrismaClient, today: Date) {
  return db.payment.create({
    data: {
      instalmentId: null,
      amount: 500_000,
      method: "UPI",
      reference: `UNKNOWN-${randomUUID().slice(0, 6).toUpperCase()}`,
      status: "SUCCESS",
      paidAt: today,
    },
  });
}