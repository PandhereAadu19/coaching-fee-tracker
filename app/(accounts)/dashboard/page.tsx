import LogoutButton from "../../components/LogoutButton";
import { requireAccountsPage } from "../../../lib/guards";
export const instant = false;

export default async function Dashboard() {
  const user = await requireAccountsPage();
  return (
    <main className="mx-auto w-full max-w-3xl space-y-4 p-6">
      <h1 className="text-2xl font-semibold">Accounts dashboard</h1>
      <p className="text-neutral-600">Signed in as {user.name}. Placeholder page.</p>
      <LogoutButton />
    </main>
  );
}