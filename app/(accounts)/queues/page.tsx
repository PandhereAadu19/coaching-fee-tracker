import Link from "next/link";
import AssignPayment from "../../components/AssignPayment";
import RunButton from "../../components/RunButton";
import TaskActions from "../../components/TaskActions";
import Card from "../../components/ui/Card";
import EmptyState from "../../components/ui/EmptyState";
import PageHeader from "../../components/ui/PageHeader";
import { Table, Td, Th } from "../../components/ui/Table";
import { db } from "../../../lib/db";
import { formatDate } from "../../../lib/format";
import { requireAccountsPage } from "../../../lib/guards";
import type { MessageKey } from "../../../lib/i18n";
import { getT } from "../../../lib/i18n-server";
import { daysBetween } from "../../../lib/instalments";
import { signalsFromReasons } from "../../../lib/llm";
import { formatINR } from "../../../lib/money";

export const instant = false;

type Tab = "reminders" | "unmatched" | "tasks";
const TABS: Tab[] = ["reminders", "unmatched", "tasks"];

const STATUS_STYLE: Record<string, string> = {
  SENT: "bg-emerald-50 text-emerald-700",
  CANCELLED: "bg-neutral-100 text-neutral-600",
  PENDING: "bg-amber-50 text-amber-700",
};

function offsetLabel(days: number) {
  if (days === 0) return "on due date";
  return days < 0 ? `${days} days` : `+${days} days`;
}

export default async function QueuesPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string | string[] }>;
}) {
  await requireAccountsPage();
  const { t, lang } = await getT();
  const raw = (await searchParams).tab;
  const first = Array.isArray(raw) ? raw[0] : raw;
  const tab: Tab = TABS.find((x) => x === first) ?? "reminders";

  const tabLink = (id: Tab, label: string) => (
    <Link
      key={id}
      href={`/queues?tab=${id}`}
      aria-current={tab === id ? "page" : undefined}
      className={`flex h-12 items-center whitespace-nowrap rounded-xl px-4 text-base font-medium ${
        tab === id ? "bg-indigo-50 text-indigo-700" : "text-neutral-600 hover:bg-neutral-50"
      }`}
    >
      {label}
    </Link>
  );

  let content: React.ReactNode = null;

  if (tab === "reminders") {
    const reminders = await db.reminder.findMany({
      orderBy: { scheduledFor: "desc" },
      take: 50,
      include: { instalment: { include: { plan: { include: { student: true } } } } },
    });
    content = (
      <div className="space-y-4">
        <RunButton url="/api/reminders/run" label="queues.runNow" resultKey="queues.ranReminders" />
        {reminders.length === 0 ? (
          <EmptyState title={t("common.empty")} />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>{t("dash.student")}</Th>
                <Th>{t("queues.when")}</Th>
                <Th>Lang</Th>
                <Th>{t("queues.status")}</Th>
                <Th>{t("queues.message")}</Th>
              </tr>
            </thead>
            <tbody>
              {reminders.map((r) => (
                <tr key={r.id}>
                  <Td className="font-medium">{r.instalment.plan.student.name}</Td>
                  <Td>
                    {formatDate(r.scheduledFor, lang)}
                    <div className="text-xs text-neutral-500">
                      {offsetLabel(daysBetween(r.instalment.dueDate, r.scheduledFor))}
                    </div>
                  </Td>
                  <Td>{r.language.toUpperCase()}</Td>
                  <Td>
                    <span className={`rounded-full px-3 py-1 text-sm ${STATUS_STYLE[r.status] ?? ""}`}>
                      {r.status}
                    </span>
                  </Td>
                  <Td className="max-w-md truncate text-neutral-600" >
                    <span title={r.message}>{r.message}</span>
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </div>
    );
  }

  if (tab === "unmatched") {
    const payments = await db.payment.findMany({
      where: { instalmentId: null },
      orderBy: { paidAt: "desc" },
    });

    let options: { id: string; label: string }[] = [];
    if (payments.length > 0) {
      const instalments = await db.instalment.findMany({
        where: { plan: { student: { status: "ACTIVE" } } },
        include: {
          payments: { where: { status: "SUCCESS" }, select: { amount: true } },
          plan: { include: { student: { select: { name: true } } } },
        },
      });
      options = instalments
        .map((i) => ({
          id: i.id,
          name: i.plan.student.name,
          seq: i.seq,
          balance: i.amount - i.payments.reduce((s, p) => s + p.amount, 0),
        }))
        .filter((i) => i.balance > 0)
        .sort((a, b) => a.name.localeCompare(b.name) || a.seq - b.seq)
        .slice(0, 400)
        .map((i) => ({ id: i.id, label: `${i.name} · #${i.seq} · ${formatINR(i.balance)}` }));
    }

    content = (
      <div className="space-y-4">
        <RunButton
          url="/api/payments/simulate-unmatched"
          label="queues.simulate"
          resultKey="queues.simulated"
          variant="secondary"
        />
        {payments.length === 0 ? (
          <EmptyState title={t("common.empty")} />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>{t("queues.reference")}</Th>
                <Th>{t("receipts.date")}</Th>
                <Th className="text-right">{t("pay.amount")}</Th>
                <Th />
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p.id}>
                  <Td className="font-medium">{p.reference}</Td>
                  <Td>{p.paidAt ? formatDate(p.paidAt, lang) : "–"}</Td>
                  <Td className="text-right">{formatINR(p.amount)}</Td>
                  <Td>
                    <AssignPayment paymentId={p.id} options={options} />
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </div>
    );
  }

  if (tab === "tasks") {
    const tasks = await db.counsellorTask.findMany({
      where: { status: "OPEN" },
      orderBy: { flag: { score: "desc" } },
      include: { flag: { include: { student: { include: { batch: true } } } } },
    });

    content = (
      <div className="space-y-4">
        <RunButton url="/api/flags/run" label="queues.runRisk" resultKey="queues.ranRisk" />
        {tasks.length === 0 ? (
          <EmptyState title={t("common.empty")} />
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {tasks.map((task) => {
              const f = task.flag;
              const sig = signalsFromReasons(f.reasonsJson, f.score);
              const reasons: { key: string; value: number }[] = [];
              if (sig.overdueCount) reasons.push({ key: "overdue_instalments", value: sig.overdueCount });
              if (sig.maxDaysOverdue) reasons.push({ key: "max_days_overdue", value: sig.maxDaysOverdue });
              if (sig.attendanceDrop) reasons.push({ key: "attendance_drop", value: sig.attendanceDrop });
              if (sig.testDropPercent) reasons.push({ key: "test_drop_percent", value: sig.testDropPercent });

              return (
                <Card key={task.id} className="space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <Link
                        href={`/students/${f.student.id}`}
                        className="text-lg font-semibold text-indigo-700 hover:underline"
                      >
                        {f.student.name}
                      </Link>
                      <p className="text-sm text-neutral-500">
                        {f.student.code} · {f.student.batch.name}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-neutral-500">{t("queues.score")}</p>
                      <p className="text-2xl font-semibold text-red-600">{f.score}</p>
                    </div>
                  </div>

                  {reasons.length > 0 && (
                    <ul className="list-disc space-y-1 pl-5 text-sm text-neutral-700">
                      {reasons.map((r) => (
                        <li key={r.key}>{t(`queues.reason.${r.key}` as MessageKey, { value: r.value })}</li>
                      ))}
                    </ul>
                  )}

                  <div className="rounded-xl bg-neutral-50 p-3">
                    {f.aiNote ? (
                      <>
                        <p className="whitespace-pre-line text-sm text-neutral-800">{f.aiNote}</p>
                        <p className="mt-2 text-xs font-medium text-neutral-500">
                          {f.aiNoteSource === "llm" ? t("queues.aiLabel") : t("queues.autoSummary")}
                        </p>
                      </>
                    ) : (
                      <p className="text-sm text-neutral-500">{t("queues.noNote")}</p>
                    )}
                  </div>

                  <TaskActions taskId={task.id} />
                </Card>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title={t("queues.title")} />
      <div className="flex gap-1 overflow-x-auto">
        {tabLink("reminders", t("queues.reminders"))}
        {tabLink("unmatched", t("queues.unmatched"))}
        {tabLink("tasks", t("queues.tasks"))}
      </div>
      {content}
    </div>
  );
}