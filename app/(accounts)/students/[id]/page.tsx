import Link from "next/link";
import { notFound } from "next/navigation";
import Card from "../../../components/ui/Card";
import EmptyState from "../../../components/ui/EmptyState";
import LinkButton from "../../../components/ui/LinkButton";
import PageHeader from "../../../components/ui/PageHeader";
import StatusChip from "../../../components/ui/StatusChip";
import { Table, Td, Th } from "../../../components/ui/Table";
import { db } from "../../../../lib/db";
import { buildDueRows } from "../../../../lib/dues";
import { formatDate } from "../../../../lib/format";
import { requireAccountsPage } from "../../../../lib/guards";
import type { MessageKey } from "../../../../lib/i18n";
import { getT } from "../../../../lib/i18n-server";
import { maskPhone } from "../../../../lib/mask";
import { formatINR } from "../../../../lib/money";
import { getToday } from "../../../../lib/today";

export const instant = false;

export default async function LedgerPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAccountsPage();
  const { t, lang } = await getT();
  const { id } = await params;

  const s = await db.student.findUnique({
    where: { id },
    include: {
      batch: { include: { centre: true } },
      parent: true,
      feePlan: {
        include: {
          instalments: {
            include: { payments: { include: { receipt: true }, orderBy: { paidAt: "desc" } } },
          },
        },
      },
      attendance: { orderBy: { month: "desc" }, take: 6 },
      testScores: { orderBy: { date: "desc" }, take: 6 },
      riskFlags: { where: { status: "OPEN" } },
    },
  });
  if (!s) notFound();

  const instalments = s.feePlan?.instalments ?? [];
  const rows = buildDueRows(instalments, getToday());
  const payments = instalments.flatMap((i) => i.payments.map((p) => ({ ...p, seq: i.seq })));
  const plan = s.feePlan;
  const openFlag = s.riskFlags[0];

  return (
    <div className="space-y-6">
      <PageHeader
        title={s.name}
        subtitle={`${s.code} · ${s.batch.name} · ${s.batch.centre.name}`}
        action={<LinkButton href={`/refunds?studentId=${s.id}`}>{t("ledger.calcRefund")}</LinkButton>}
      />

      <div className="flex flex-wrap items-center gap-3 text-sm text-neutral-600">
        <span>
          {s.parent.name} · {maskPhone(s.parent.phone)}
        </span>
        {s.status === "EXITED" && <span className="rounded-full bg-neutral-100 px-3 py-1">EXITED</span>}
        {openFlag && (
          <Link href="/queues" className="rounded-full border border-red-300 px-3 py-1 font-medium text-red-700">
            {t("dash.risk")} {openFlag.score}
          </Link>
        )}
      </div>

      {plan && (
        <Card>
          <h2 className="mb-3 text-lg font-semibold">{t("ledger.plan")}</h2>
          <dl className="grid gap-4 sm:grid-cols-4">
            <div>
              <dt className="text-sm text-neutral-500">{t("ledger.totalFee")}</dt>
              <dd className="text-lg font-semibold">{formatINR(plan.totalFee)}</dd>
            </div>
            <div>
              <dt className="text-sm text-neutral-500">{t("ledger.discount")}</dt>
              <dd className="text-lg font-semibold">{formatINR(plan.discount)}</dd>
            </div>
            <div>
              <dt className="text-sm text-neutral-500">{t("ledger.netFee")}</dt>
              <dd className="text-lg font-semibold">{formatINR(plan.totalFee - plan.discount)}</dd>
            </div>
            <div>
              <dt className="text-sm text-neutral-500">GST</dt>
              <dd className="text-lg font-semibold">{plan.gstRate}%</dd>
            </div>
          </dl>
        </Card>
      )}

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">{t("parent.instalments")}</h2>
        {rows.length === 0 ? (
          <EmptyState title={t("common.empty")} />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>#</Th>
                <Th>{t("receipts.date")}</Th>
                <Th className="text-right">{t("pay.amount")}</Th>
                <Th className="text-right">Paid</Th>
                <Th className="text-right">{t("parent.balance")}</Th>
                <Th className="text-right">{t("dash.daysOverdue")}</Th>
                <Th />
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <Td>{r.seq}</Td>
                  <Td>{formatDate(r.dueDate, lang)}</Td>
                  <Td className="text-right">{formatINR(r.amount)}</Td>
                  <Td className="text-right">{formatINR(r.paid)}</Td>
                  <Td className="text-right">{formatINR(r.balance)}</Td>
                  <Td className={`text-right ${r.daysOverdue > 0 ? "font-semibold text-red-600" : ""}`}>
                    {r.daysOverdue > 0 ? r.daysOverdue : "–"}
                  </Td>
                  <Td>
                    <StatusChip status={r.status} label={t(`status.${r.status}` as MessageKey)} />
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">{t("ledger.payments")}</h2>
        {payments.length === 0 ? (
          <EmptyState title={t("common.empty")} />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>{t("receipts.date")}</Th>
                <Th>#</Th>
                <Th className="text-right">{t("pay.amount")}</Th>
                <Th>Method</Th>
                <Th>Reference</Th>
                <Th>{t("receipts.number")}</Th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p.id}>
                  <Td>{p.paidAt ? formatDate(p.paidAt, lang) : "–"}</Td>
                  <Td>{p.seq}</Td>
                  <Td className="text-right">{formatINR(p.amount)}</Td>
                  <Td>{p.method.replace("_", " ")}</Td>
                  <Td className="text-neutral-500">{p.reference}</Td>
                  <Td>{p.receipt?.number ?? "–"}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </section>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <h2 className="mb-3 text-lg font-semibold">{t("ledger.attendance")}</h2>
          {s.attendance.length === 0 ? (
            <p className="text-neutral-500">{t("common.empty")}</p>
          ) : (
            <ul className="divide-y divide-neutral-100">
              {s.attendance.map((a) => (
                <li key={a.month.toISOString()} className="flex justify-between py-2">
                  <span className="text-neutral-600">
                    {new Intl.DateTimeFormat(lang === "hi" ? "hi-IN" : "en-IN", {
                      month: "short",
                      year: "numeric",
                      timeZone: "UTC",
                    }).format(a.month)}
                  </span>
                  <span className="font-medium">{a.percent}%</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card>
          <h2 className="mb-3 text-lg font-semibold">{t("ledger.tests")}</h2>
          {s.testScores.length === 0 ? (
            <p className="text-neutral-500">{t("common.empty")}</p>
          ) : (
            <ul className="divide-y divide-neutral-100">
              {s.testScores.map((x) => (
                <li key={x.id} className="flex justify-between py-2">
                  <span className="text-neutral-600">{x.testName}</span>
                  <span className="font-medium">{x.score}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}