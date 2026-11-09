import { redirect } from "next/navigation";
import { getSession } from "./auth";
import { db } from "./db";

export async function getCurrentUser() {
  const session = await getSession();
  if (!session) return null;
  return db.user.findUnique({ where: { id: session.userId } });
}

export async function requireParentPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "PARENT") redirect("/dashboard");
  if (!user.consentAt) redirect("/login");
  return user;
}

export async function requireAccountsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "ACCOUNTS") redirect("/home");
  return user;
}