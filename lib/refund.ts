import { addDays } from "./dates";
import { daysBetween } from "./instalments";

export const ADMIN_FEE_RATE = 0.05;
export const ADMIN_FEE_CAP = 500_000; // ₹5,000 in paise
export const FREE_EXIT_DAYS = 7;
export const PAYOUT_DAYS = 10;

export interface RefundInput {
  netFee: number; // paise, total fee minus discount
  feesPaid: number; // paise
  courseStart: Date;
  courseEnd: Date;
  exitDate: Date;
  requestDate: Date;
}

export interface RefundStep {
  key: "fees_paid" | "tuition_deduction" | "admin_fee" | "refund";
  amount: number; // paise
  formula: string;
}

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

export function calculateRefund(i: RefundInput) {
  const courseDays = Math.max(1, daysBetween(i.courseStart, i.courseEnd));
  const elapsedDays = clamp(daysBetween(i.courseStart, i.exitDate), 0, courseDays);

  const adminFee = Math.min(Math.round(i.netFee * ADMIN_FEE_RATE), ADMIN_FEE_CAP);
  const tuitionDeduction =
    elapsedDays <= FREE_EXIT_DAYS ? 0 : Math.round((i.netFee * elapsedDays) / courseDays);
  const refund = Math.max(0, i.feesPaid - tuitionDeduction - adminFee);
  const payBy = addDays(i.requestDate, PAYOUT_DAYS);

  const steps: RefundStep[] = [
    { key: "fees_paid", amount: i.feesPaid, formula: "total fees paid so far" },
    {
      key: "tuition_deduction",
      amount: tuitionDeduction,
      formula:
        elapsedDays <= FREE_EXIT_DAYS
          ? `exit within first ${FREE_EXIT_DAYS} days: no tuition deduction`
          : `net fee × ${elapsedDays}/${courseDays} days attended`,
    },
    { key: "admin_fee", amount: adminFee, formula: "5% of net fee, capped at ₹5,000" },
    { key: "refund", amount: refund, formula: "fees paid − tuition − admin fee, minimum 0" },
  ];

  return { refund, adminFee, tuitionDeduction, elapsedDays, courseDays, payBy, steps };
}