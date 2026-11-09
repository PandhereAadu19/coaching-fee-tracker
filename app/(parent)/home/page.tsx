import LogoutButton from "../../components/LogoutButton";
import { requireParentPage } from "../../../lib/guards";
export const instant = false;

export default async function ParentHome() {
  const user = await requireParentPage();
  return (
    <main className="mx-auto w-full max-w-md space-y-4 p-6">
      <h1 className="text-2xl font-semibold">Hello, {user.name}</h1>
      <p className="text-neutral-600">Parent home placeholder.</p>
      <LogoutButton />
    </main>
  );
}