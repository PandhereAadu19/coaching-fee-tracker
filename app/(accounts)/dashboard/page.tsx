import Link from "next/link";
import Card from "../../components/ui/Card";
import EmptyState from "../../components/ui/EmptyState";
import PageHeader from "../../components/ui/PageHeader";
import StatusChip from "../../components/ui/StatusChip";
import { Table, Td, Th } from "../../components/ui/Table";
import { db } from "../../../lib/db";
import {
  BUCKETS,
  buildStudentRow,
  filterRows,
  paginate,
  parseBucket,
  sortRows,
  summarise,
} from "../../../lib/dashboard";
import { requireAccountsPage } from "../../../lib/guards";
import type { MessageKey } from "../../../lib/i18n";
import { getT } from "../../../lib/i18n-server";
import { formatINR } from "../../../lib/money";
import { maskPhone } from "../../../lib/mask";
import { getToday } from "../../../lib/today";

export const instant = false;

type SP = Record<string, string | string[] | undefined>;
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

function href(base: Record<string, string | undefined>, over: Record<string, string | undefined>) {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries({ ...base, ...over })) if (v) p.set(k, v);
  const s = p.toString();
  return s ? `/dashboard?${s}` : "/dashboard";
}

const BAR: Record<string, string> = {
  notDue: "bg-indigo-300",
  "1-30": "bg-amber-400",
  "31-60": "bg-orange-500",
  "60+": "bg-red-600",
};

const select = "h-12 rounded-xl border border-neutral-300 bg-white px-3 text-base";

export default async function Dashboard({ searchParams }: { searchParams: Promise<SP> }) {
  await requireAccountsPage();
  const { t } = await getT();
  const sp = await searchParams;

  const centreId = first(sp.centre) || undefined;
  const batchId = first(sp.batch) || undefined;
  const bucket = parseBucket(first(sp.ageing));
  const sort = first(sp.sort) === "balance" ? "balance" : "days";
  const dir = first(sp.dir) === "asc" ? "asc" : "desc";
  const pageNo = Number(first(sp.page)) || 1;

  const [centres, students] = await Promise.all([
    db.centre.findMany({ orderBy: { name: "asc" }, include: { batches: { orderBy: { name: "asc" } } } }),
    db.student.findMany({
      where: { status: "ACTIVE" },
      include: {
        batch: { include: { centre: true } },
        parent: { select: { phone: true } },
        riskFlags: { where: { status: "OPEN" }, select: { id: true } },
        feePlan: {
          include: {
            instalments: {
              include: { payments: { where: { status: "SUCCESS" }, select: { amount: true, status: true } } },
            },
          },
        },
      },
    }),
  ]);

  const today = getToday();
  const rows = students.map((s) =>
    buildStudentRow(
      {
        id: s.id,
        code: s.code,
        name: s.name,
        batch: { id: s.batch.id, name: s.batch.name, centre: { id: s.batch.centre.id, name: s.batch.centre.name } },
        parent: s.parent,
        openFlag: s.riskFlags.length > 0,
        instalments: s.feePlan?.instalments ?? [],
      },
      today
    )
  );

  const scoped = filterRows(rows, { centreId, batchId });
  const summary = summarise(scoped);
  const table = sortRows(filterRows(scoped, { bucket }), sort, dir);
  const pg = paginate(table, pageNo, 25);

  const base = { centre: centreId, batch: batchId, ageing: bucket, sort, dir };
  const maxBucket = Math.max(1, ...BUCKETS.map((b) => summary.buckets[b]));
  const batchOptions = centres.filter((c) => !centreId || c.id === centreId).flatMap((c) =>
    c.batches.map((b) => ({ id: b.id, label: `${b.name} · ${c.name}` }))
  );
  const sortLink = (key: "days" | "balance") =>
    href(base, { sort: key, dir: sort === key && dir === "desc" ? "asc" : "desc", page: undefined });

  return (
    <div className="space-y-6">
      <PageHeader title={t("dash.title")} />

      <form action="/dashboard" className="flex flex-wrap items-end gap-3">
        <label className="space-y-1 text-sm text-neutral-600">
          {t("dash.centre")}
          <select name="centre" defaultValue={centreId ?? ""} className={`${select} block`}>
            <option value="">{t("dash.all")}</option>
            {centres.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1 text-sm text-neutral-600">
          {t("dash.batch")}
          <select name="batch" defaultValue={batchId ?? ""} className={`${select} block`}>
            <option value="">{t("dash.all")}</option>
            {batchOptions.map((b) => (
              <option key={b.id} value={b.id}>
                {b.label}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1 text-sm text-neutral-600">
          {t("dash.ageing")}
          <select name="ageing" defaultValue={bucket ?? ""} className={`${select} block`}>
            <option value="">{t("dash.all")}</option>
            {BUCKETS.map((b) => (
              <option key={b} value={b}>
                {t(`ageing.${b}` as MessageKey)}
              </option>
            ))}
          </select>
        </label>
        <button className="h-12 rounded-xl bg-indigo-600 px-5 text-base font-medium text-white hover:bg-indigo-700">
          OK
        </button>
        <Link href="/dashboard" className="flex h-12 items-center px-2 text-base text-neutral-600 underline">
          ✕
        </Link>
      </form>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-red-200 bg-red-50">
          <p className="text-sm text-red-700">{t("dash.overdue")}</p>
          <p className="mt-1 text-4xl font-semibold text-red-700">{formatINR(summary.totalOverdue)}</p>
        </Card>
        <Card>
          <p className="text-sm text-neutral-600">{t("dash.outstanding")}</p>
          <p className="mt-1 text-3xl font-semibold text-neutral-900">{formatINR(summary.totalOutstanding)}</p>
        </Card>
        <Card>
          <p className="text-sm text-neutral-600">{t("dash.studentsOverdue")}</p>
          <p className="mt-1 text-3xl font-semibold text-neutral-900">{summary.studentsOverdue}</p>
        </Card>
      </div>

      <Card className="space-y-3">
        {BUCKETS.map((b) => (
          <div key={b} className="grid grid-cols-[6.5rem_1fr_auto] items-center gap-3 text-sm">
            <span className="text-neutral-600">{t(`ageing.${b}` as MessageKey)}</span>
            <div className="h-3 rounded-full bg-neutral-100">
              <div
                className={`h-3 rounded-full ${BAR[b]}`}
                style={{ width: `${(summary.buckets[b] / maxBucket) * 100}%` }}
              />
            </div>
            <span className="font-medium text-neutral-900">{formatINR(summary.buckets[b])}</span>
          </div>
        ))}
      </Card>

      {pg.total === 0 ? (
        <EmptyState title={t("dash.noResults")} />
      ) : (
        <>
          <Table>
            <thead>
              <tr>
                <Th>{t("dash.student")}</Th>
                <Th>{t("dash.batch")}</Th>
                <Th className="text-right">
                  <Link href={sortLink("balance")} className="underline decoration-dotted">
                    {t("dash.balance")}
                  </Link>
                </Th>
                <Th className="text-right">
                  <Link href={sortLink("days")} className="underline decoration-dotted">
                    {t("dash.daysOverdue")}
                  </Link>
                </Th>
                <Th />
                <Th>{t("dash.risk")}</Th>
                <Th>Phone</Th>
              </tr>
            </thead>
            <tbody>
              {pg.items.map((r) => (
                <tr key={r.id}>
                  <Td>
                    <Link href={`/students/${r.id}`} className="font-medium text-indigo-700 hover:underline">
                      {r.name}
                    </Link>
                    <div className="text-xs text-neutral-500">{r.code}</div>
                  </Td>
                  <Td>
                    {r.batchName}
                    <div className="text-xs text-neutral-500">{r.centreName}</div>
                  </Td>
                  <Td className="text-right">{formatINR(r.balance)}</Td>
                  <Td className={`text-right ${r.maxDaysOverdue > 0 ? "font-semibold text-red-600" : ""}`}>
                    {r.maxDaysOverdue > 0 ? r.maxDaysOverdue : "–"}
                  </Td>
                  <Td>
                    <StatusChip
                      status={r.balance === 0 ? "paid" : r.maxDaysOverdue > 0 ? "overdue" : "upcoming"}
                      label={t(
                        (r.balance === 0 ? "status.paid" : r.maxDaysOverdue > 0 ? "status.overdue" : "status.upcoming") as MessageKey
                      )}
                    />
                  </Td>
                  <Td>
                    {r.hasOpenFlag && (
                      <span className="rounded-full border border-red-300 px-2 py-0.5 text-xs font-medium text-red-700">
                        {t("dash.risk")}
                      </span>
                    )}
                  </Td>
                  <Td className="text-neutral-500">{maskPhone(r.phone)}</Td>
                </tr>
              ))}
            </tbody>
          </Table>

          {pg.pages > 1 && (
            <div className="flex items-center justify-between text-sm text-neutral-600">
              <span>
                {pg.page} / {pg.pages} · {pg.total}
              </span>
              <div className="flex gap-2">
                {pg.page > 1 && (
                  <Link href={href(base, { page: String(pg.page - 1) })} className="flex h-12 items-center rounded-xl border border-neutral-300 px-4">
                    ←
                  </Link>
                )}
                {pg.page < pg.pages && (
                  <Link href={href(base, { page: String(pg.page + 1) })} className="flex h-12 items-center rounded-xl border border-neutral-300 px-4">
                    →
                  </Link>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}