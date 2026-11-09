import { notFound, redirect } from "next/navigation";
import PayActions from "../../../components/PayActions";
import Card from "../../../components/ui/Card";
import { db } from "../../../../lib/db";
import { formatDate } from "../../../../lib/format";
import { getT } from "../../../../lib/i18n-server";
import { requireParentPage } from "../../../../lib/guards";
import { formatINR } from "../../../../lib/money";

export const instant = false;

export default async function PayPage({ params }: { params: Promise<{ instalmentId: string }> }) {
  const user = await requireParentPage();
  const { t, lang } = await getT();
  const { instalmentId } = await params;

  const inst = await db.instalment.findUnique({
    where: { id: instalmentId },
    include: {
      plan: { include: { student: true } },
      payments: { where: { status: "SUCCESS" }, select: { amount: true } },
    },
  });
  if (!inst || inst.plan.student.parentUserId !== user.id) notFound();

  const balance = Math.max(0, inst.amount - inst.payments.reduce((s, p) => s + p.amount, 0));
  if (balance === 0) redirect("/home");

  return (
    <div className="mx-auto max-w-md space-y-4">
      <h1 className="text-2xl font-semibold text-neutral-900">{t("pay.title")}</h1>
      <p className="rounded-lg bg-amber-50 p-3 text-sm font-medium text-amber-800">{t("pay.testMode")}</p>
      <Card className="space-y-2">
        <p className="text-base text-neutral-600">
          {inst.plan.student.name} · {t("parent.instalmentN", { n: inst.seq })}
        </p>
        <p className="text-sm text-neutral-500">{t("parent.dueOn", { date: formatDate(inst.dueDate, lang) })}</p>
        <p className="pt-2 text-sm text-neutral-600">{t("pay.amount")}</p>
        <p className="text-4xl font-semibold text-neutral-900">{formatINR(balance)}</p>
      </Card>
      <PayActions instalmentId={inst.id} />
    </div>
  );
}