import Link from "next/link";
import Card from "../../components/ui/Card";
import EmptyState from "../../components/ui/EmptyState";
import PageHeader from "../../components/ui/PageHeader";
import { db } from "../../../lib/db";
import { formatDate } from "../../../lib/format";
import { getT } from "../../../lib/i18n-server";
import { requireParentPage } from "../../../lib/guards";
import { formatINR } from "../../../lib/money";

export const instant = false;

export default async function ReceiptsPage() {
  const user = await requireParentPage();
  const { t, lang } = await getT();

  const receipts = await db.receipt.findMany({
    where: {
      payment: {
        status: "SUCCESS",
        instalment: { plan: { student: { parentUserId: user.id } } },
      },
    },
    include: {
      payment: { include: { instalment: { include: { plan: { include: { student: true } } } } } },
    },
    orderBy: { payment: { paidAt: "desc" } },
  });

  return (
    <div>
      <PageHeader title={t("receipts.title")} />
      {receipts.length === 0 ? (
        <EmptyState title={t("receipts.empty")} />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {receipts.map((r) => (
            <Card key={r.id} className="flex items-center justify-between gap-3">
              <div>
                <p className="text-base font-medium text-neutral-900">{r.number}</p>
                <p className="text-sm text-neutral-500">
                  {r.payment.paidAt ? formatDate(r.payment.paidAt, lang) : ""} ·{" "}
                  {t("parent.instalmentN", { n: r.payment.instalment?.seq ?? 0 })}
                </p>
                <p className="mt-1 text-lg font-semibold text-neutral-900">{formatINR(r.total)}</p>
              </div>
              <Link
                href={`/receipts/${r.id}`}
                className="flex h-12 items-center rounded-xl border border-neutral-300 px-4 text-base font-medium hover:bg-neutral-50"
              >
                {t("receipts.view")}
              </Link>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}