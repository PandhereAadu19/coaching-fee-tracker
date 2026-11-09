import { Prisma, type PrismaClient } from "@prisma/client";
import { calculateRefund } from "./refund";

export function parseExitDate(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const d = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== value) return null;
  return d;
}

export function refundEligibility(s: {
  status: "ACTIVE" | "EXITED";
  refundCount: number;
  hasPlan: boolean;
}): "ok" | "no_plan" | "already_exited" | "already_refunded" {
  if (!s.hasPlan) return "no_plan";
  if (s.refundCount > 0) return "already_refunded";
  if (s.status === "EXITED") return "already_exited";
  return "ok";
}

export interface RefundStudentData {
  batch: { startDate: Date; endDate: Date };
  feePlan: {
    totalFee: number;
    discount: number;
    instalments: { payments: { amount: number; status: string }[] }[];
  };
}

export function computeForStudent(s: RefundStudentData, exitDate: Date, today: Date) {
  const feesPaid = s.feePlan.instalments
    .flatMap((i) => i.payments)
    .filter((p) => p.status === "SUCCESS")
    .reduce((sum, p) => sum + p.amount, 0);
  return calculateRefund({
    netFee: s.feePlan.totalFee - s.feePlan.discount,
    feesPaid,
    courseStart: s.batch.startDate,
    courseEnd: s.batch.endDate,
    exitDate,
    requestDate: today,
  });
}

export async function loadStudentForRefund(db: PrismaClient, studentId: string) {
  return db.student.findUnique({
    where: { id: studentId },
    include: {
      batch: true,
      refunds: { select: { id: true } },
      feePlan: {
        include: {
          instalments: {
            include: { payments: { where: { status: "SUCCESS" }, select: { amount: true, status: true } } },
          },
        },
      },
    },
  });
}

export type ApproveResult =
  | { kind: "not_found" | "no_plan" | "already_exited" | "already_refunded" }
  | { kind: "ok"; refundId: string };

/** The amount is always recomputed here. The client never sends it. */
export async function approveRefund(
  db: PrismaClient,
  args: { studentId: string; exitDate: Date; today: Date }
): Promise<ApproveResult> {
  const s = await loadStudentForRefund(db, args.studentId);
  if (!s) return { kind: "not_found" };
  const eligibility = refundEligibility({
    status: s.status,
    refundCount: s.refunds.length,
    hasPlan: s.feePlan !== null,
  });
  if (eligibility !== "ok") return { kind: eligibility };

  const result = computeForStudent({ batch: s.batch, feePlan: s.feePlan! }, args.exitDate, args.today);

  return db.$transaction(async (tx) => {
    // Only one request can flip ACTIVE to EXITED, so a double click cannot refund twice.
    const flipped = await tx.student.updateMany({
      where: { id: s.id, status: "ACTIVE" },
      data: { status: "EXITED", exitDate: args.exitDate },
    });
    if (flipped.count === 0) return { kind: "already_exited" as const };

    const refund = await tx.refund.create({
      data: {
        studentId: s.id,
        amount: result.refund,
        breakdownJson: result.steps as unknown as Prisma.InputJsonValue,
        requestedAt: args.today,
        payBy: result.payBy,
        status: "APPROVED",
      },
    });
    await tx.reminder.updateMany({
      where: { instalment: { plan: { studentId: s.id } }, status: "PENDING" },
      data: { status: "CANCELLED" },
    });
    return { kind: "ok" as const, refundId: refund.id };
  });
}