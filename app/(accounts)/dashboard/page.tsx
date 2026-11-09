import { requireAccountsPage } from "../../../lib/guards";
import { getT } from "../../../lib/i18n-server";

export const instant = false;

export default async function Dashboard() {
  const user = await requireAccountsPage();
  const { t } = await getT();
  return (
    <div className="space-y-2">
      <h1 className="text-2xl font-semibold">{t("dash.title")}</h1>
      <p className="text-neutral-600">Signed in as {user.name}. Placeholder page.</p>
    </div>
  );
}