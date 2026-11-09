import { notFound } from "next/navigation";
import PrintButton from "../../../components/PrintButton";
import Card from "../../../components/ui/Card";
import LinkButton from "../../../components/ui/LinkButton";
import { db } from "../../../../lib/db";
import { formatDate } from "../../../../lib/format";
import { getT } from "../../../../lib/i18n-server";
import { requireParentPage } from "../../../../lib/guards";
import { formatINR } from "../../../../lib/money";

export const instant = false;

export default async function ReceiptPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireParentPage();
  const { t, lang } = await getT();
  const { id } = await params;

  const r = await db.receipt.findUnique({
    where: { id },
    include: {
      payment: {
        include: {
          instalment: {
            include: { plan: { include: { student: { include: { batch: { include: { centre: true } } } } } } },
          },
        },
      },
    },
  });
  const student = r?.payment.instalment?.plan.student;
  if (!r || !student || student.parentUserId !== user.id) notFound();

  const row = (label: string, value: string, strong = false) => (
    <div className="flex justify-between gap-4 py-2">
      <dt className="text-neutral-600">{label}</dt>
      <dd className={strong ? "text-lg font-semibold text-neutral-900" : "text-neutral-900"}>{value}</dd>
    </div>
  );

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <div className="flex gap-2 print:hidden">
        <LinkButton href="/receipts" variant="secondary">
          {t("common.back")}
        </LinkButton>
        <PrintButton />
      </div>
      <Card className="space-y-4">
        <div>
          <h1 className="text-xl font-semibold text-neutral-900">{t("app.name")}</h1>
          <p className="text-sm text-neutral-500">
            {student.batch.centre.name} · {student.batch.name}
          </p>
        </div>
        <dl className="divide-y divide-neutral-100 text-base">
          {row(t("receipts.number"), r.number)}
          {row(t("receipts.date"), r.payment.paidAt ? formatDate(r.payment.paidAt, lang) : "")}
          {row(t("parent.student"), `${student.name} (${student.code})`)}
          {row(t("parent.instalmentN", { n: r.payment.instalment?.seq ?? 0 }), r.payment.method.replace("_", " "))}
          {row(t("receipts.base"), formatINR(r.baseAmount))}
          {row(t("receipts.gst"), formatINR(r.gstAmount))}
          {row(t("receipts.total"), formatINR(r.total), true)}
        </dl>
        <p className="text-sm text-neutral-500">{t("receipts.inclusive")}</p>
      </Card>
    </div>
  );
}