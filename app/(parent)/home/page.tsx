import Link from "next/link";
import Card from "../../components/ui/Card";
import EmptyState from "../../components/ui/EmptyState";
import LinkButton from "../../components/ui/LinkButton";
import StatusChip from "../../components/ui/StatusChip";
import { db } from "../../../lib/db";
import { buildDueRows, pickNext } from "../../../lib/dues";
import { formatDate } from "../../../lib/format";
import { getT } from "../../../lib/i18n-server";
import type { MessageKey } from "../../../lib/i18n";
import { requireParentPage } from "../../../lib/guards";
import { formatINR } from "../../../lib/money";
import { getToday } from "../../../lib/today";

export const instant = false;

export default async function ParentHome({
  searchParams,
}: {
  searchParams: Promise<{ student?: string }>;
}) {
  const user = await requireParentPage();
  const { t, lang } = await getT();
  const sp = await searchParams;

  const students = await db.student.findMany({
    where: { parentUserId: user.id },
    orderBy: { name: "asc" },
    include: {
      feePlan: {
        include: {
          instalments: {
            include: { payments: { where: { status: "SUCCESS" }, select: { amount: true, status: true } } },
          },
        },
      },
    },
  });

  if (students.length === 0) return <EmptyState title={t("common.empty")} />;

  const student = students.find((s) => s.id === sp.student) ?? students[0];
  const rows = buildDueRows(student.feePlan?.instalments ?? [], getToday());
  const next = pickNext(rows);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-neutral-900">{t("parent.hello", { name: user.name })}</h1>
        <p className="mt-1 text-base text-neutral-600">
          {t("parent.student")}: {student.name} · {student.code}
        </p>
      </div>

      {students.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {students.map((s) => (
            <Link
              key={s.id}
              href={`/home?student=${s.id}`}
              className={`flex h-12 items-center rounded-xl border px-4 text-base ${
                s.id === student.id ? "border-indigo-600 bg-indigo-50 text-indigo-700" : "border-neutral-300"
              }`}
            >
              {s.name}
            </Link>
          ))}
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2 md:items-start">
        <Card className="space-y-4 md:p-8">
          {next ? (
            <>
              <p className="text-base text-neutral-600">{t("parent.nextPayment")}</p>
              <p className="text-5xl font-semibold tracking-tight text-neutral-900">{formatINR(next.balance)}</p>
              <p className="text-base text-neutral-700">{t("parent.dueOn", { date: formatDate(next.dueDate, lang) })}</p>
              {next.status === "overdue" && (
                <p className="text-base font-semibold text-red-600">
                  {t("parent.daysOverdue", { days: next.daysOverdue })}
                </p>
              )}
              <LinkButton href={`/pay/${next.id}`} full>
                {t("parent.payNow")}
              </LinkButton>
            </>
          ) : (
            <p className="py-6 text-center text-xl font-medium text-emerald-700">{t("parent.allPaid")}</p>
          )}
        </Card>

        <Card>
          <h2 className="mb-3 text-lg font-semibold text-neutral-900">{t("parent.instalments")}</h2>
          {rows.length === 0 ? (
            <p className="text-neutral-500">{t("common.empty")}</p>
          ) : (
            <ul className="divide-y divide-neutral-100">
              {rows.map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-3 py-3">
                  <div>
                    <p className="text-base font-medium text-neutral-900">{t("parent.instalmentN", { n: r.seq })}</p>
                    <p className="text-sm text-neutral-500">{formatDate(r.dueDate, lang)}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className="text-base font-medium text-neutral-900">{formatINR(r.amount)}</span>
                    <div className="flex gap-1">
                      <StatusChip status={r.status} label={t(`status.${r.status}` as MessageKey)} />
                      {r.partPaid && r.status === "overdue" && (
                        <StatusChip status="part_paid" label={t("status.part_paid")} />
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}