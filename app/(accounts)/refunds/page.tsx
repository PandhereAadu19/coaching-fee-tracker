import Card from "../../components/ui/Card";
import EmptyState from "../../components/ui/EmptyState";
import PageHeader from "../../components/ui/PageHeader";
import RefundApprove from "../../components/RefundApprove";
import { Table, Td, Th } from "../../components/ui/Table";
import { db } from "../../../lib/db";
import { formatDate } from "../../../lib/format";
import { requireAccountsPage } from "../../../lib/guards";
import type { MessageKey } from "../../../lib/i18n";
import { getT } from "../../../lib/i18n-server";
import { daysBetween } from "../../../lib/instalments";
import { formatINR } from "../../../lib/money";
import {
  computeForStudent,
  loadStudentForRefund,
  parseExitDate,
  refundEligibility,
} from "../../../lib/refund-service";
import { getToday } from "../../../lib/today";

export const instant = false;

type SP = Record<string, string | string[] | undefined>;
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

const POLICY = {
  en: "The admin fee is 5% of the net fee, capped at ₹5,000. If the student leaves within the first 7 days, there is no tuition deduction. After that, tuition is deducted for the days attended. The refund is paid within 10 days of the request.",
  hi: "प्रशासनिक शुल्क शुद्ध फीस का 5% है, अधिकतम ₹5,000। पहले 7 दिनों में छोड़ने पर पढ़ाई के दिनों की कोई कटौती नहीं होती। उसके बाद उपस्थित दिनों के अनुसार फीस काटी जाती है। रिफंड अनुरोध के 10 दिनों के भीतर दिया जाता है।",
};

const field = "h-12 rounded-xl border border-neutral-300 bg-white px-3 text-base";

export default async function RefundsPage({ searchParams }: { searchParams: Promise<SP> }) {
  await requireAccountsPage();
  const { t, lang } = await getT();
  const sp = await searchParams;
  const today = getToday();

  const studentId = first(sp.studentId) || undefined;
  const exitStr = first(sp.exitDate) || today.toISOString().slice(0, 10);
  const exitDate = parseExitDate(exitStr);

  const [students, pastRefunds] = await Promise.all([
    db.student.findMany({
      where: { status: "ACTIVE" },
      orderBy: { name: "asc" },
      select: { id: true, code: true, name: true },
    }),
    db.refund.findMany({ orderBy: { requestedAt: "desc" }, take: 20, include: { student: true } }),
  ]);

  let calc: ReturnType<typeof computeForStudent> | null = null;
  let studentName = "";
  let blocked: string | null = null;

  if (studentId && exitDate) {
    const s = await loadStudentForRefund(db, studentId);
    if (s) {
      studentName = `${s.name} (${s.code})`;
      const e = refundEligibility({ status: s.status, refundCount: s.refunds.length, hasPlan: s.feePlan !== null });
      if (e === "ok") calc = computeForStudent({ batch: s.batch, feePlan: s.feePlan! }, exitDate, today);
      else blocked = e;
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title={t("refund.title")} />

      <Card className="space-y-1">
        <h2 className="text-base font-semibold">{t("refund.policy")}</h2>
        <p className="text-base text-neutral-700">{POLICY[lang]}</p>
      </Card>

      <form action="/refunds" className="flex flex-wrap items-end gap-3">
        <label className="space-y-1 text-sm text-neutral-600">
          {t("dash.student")}
          <select name="studentId" defaultValue={studentId ?? ""} required className={`${field} block min-w-64`}>
            <option value="" disabled>
              –
            </option>
            {students.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} · {s.code}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1 text-sm text-neutral-600">
          {t("refund.exitDate")}
          <input type="date" name="exitDate" defaultValue={exitStr} required className={`${field} block`} />
        </label>
        <button className="h-12 rounded-xl bg-indigo-600 px-5 text-base font-medium text-white hover:bg-indigo-700">
          OK
        </button>
      </form>

      {studentId && !exitDate && <p className="text-sm text-red-600">{t("common.error")}</p>}
      {blocked && <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">{studentName}: refund not possible ({blocked.replace("_", " ")}).</p>}

      {calc && exitDate && (
        <Card className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold">{studentName}</h2>
            <p className="text-sm text-neutral-500">
              {calc.elapsedDays}/{calc.courseDays} days
            </p>
          </div>
          <ul className="divide-y divide-neutral-100">
            {calc.steps.map((st) => (
              <li
                key={st.key}
                className={`flex items-start justify-between gap-4 py-3 ${st.key === "refund" ? "font-semibold" : ""}`}
              >
                <div>
                  <p className="text-base text-neutral-900">{t(`refund.step.${st.key}` as MessageKey)}</p>
                  <p className="text-xs font-normal text-neutral-500">{st.formula}</p>
                </div>
                <span className={st.key === "refund" ? "text-2xl text-neutral-900" : "text-base text-neutral-900"}>
                  {st.key === "tuition_deduction" || st.key === "admin_fee" ? "− " : ""}
                  {formatINR(st.amount)}
                </span>
              </li>
            ))}
          </ul>
          <p className="text-base text-neutral-700">
            {t("refund.payBy")}: <strong>{formatDate(calc.payBy, lang)}</strong>
          </p>
          <RefundApprove studentId={studentId!} exitDate={exitStr} />
        </Card>
      )}

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">{t("nav.refunds")}</h2>
        {pastRefunds.length === 0 ? (
          <EmptyState title={t("common.empty")} />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>{t("dash.student")}</Th>
                <Th>{t("receipts.date")}</Th>
                <Th className="text-right">{t("refund.step.refund")}</Th>
                <Th>{t("refund.payBy")}</Th>
                <Th>Status</Th>
              </tr>
            </thead>
            <tbody>
              {pastRefunds.map((r) => {
                const urgent = r.status !== "PAID" && daysBetween(today, r.payBy) <= 2;
                return (
                  <tr key={r.id}>
                    <Td>{r.student.name}</Td>
                    <Td>{formatDate(r.requestedAt, lang)}</Td>
                    <Td className="text-right">{formatINR(r.amount)}</Td>
                    <Td className={urgent ? "font-semibold text-red-600" : ""}>{formatDate(r.payBy, lang)}</Td>
                    <Td>{r.status}</Td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        )}
      </section>
    </div>
  );
}