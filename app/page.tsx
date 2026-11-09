import { redirect } from "next/navigation";
import { getCurrentUser } from "../lib/guards";
export const instant = false;

export default async function Root() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  redirect(user.role === "ACCOUNTS" ? "/dashboard" : "/home");
}