import { requireParentPage } from "../../../lib/guards";
import { getT } from "../../../lib/i18n-server";

export const instant = false;

export default async function ParentHome() {
  const user = await requireParentPage();
  const { t } = await getT();
  return (
    <div className="space-y-2">
      <h1 className="text-2xl font-semibold">{t("parent.hello", { name: user.name })}</h1>
      <p className="text-neutral-600">Parent home placeholder.</p>
    </div>
  );
}