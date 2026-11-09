import type { Role } from "./session-token";

const PUBLIC = ["/login", "/api/auth", "/api/cron"];
const PARENT_ONLY = ["/home", "/pay", "/receipts", "/api/pay"];
const ACCOUNTS_ONLY = [
  "/dashboard",
  "/students",
  "/refunds",
  "/queues",
  "/api/refunds",
  "/api/flags",
  "/api/reminders",
  "/api/payments",
];

const matches = (path: string, prefix: string) =>
  path === prefix || path.startsWith(prefix + "/");

export type Access = "allow" | "login" | "forbidden";

export function decideAccess(role: Role | null, pathname: string): Access {
  if (PUBLIC.some((p) => matches(pathname, p))) return "allow";
  if (!role) return "login";
  if (pathname === "/") return "allow";
  if (PARENT_ONLY.some((p) => matches(pathname, p))) return role === "PARENT" ? "allow" : "forbidden";
  if (ACCOUNTS_ONLY.some((p) => matches(pathname, p))) return role === "ACCOUNTS" ? "allow" : "forbidden";
  return "allow";
}

export const homeFor = (role: Role) => (role === "ACCOUNTS" ? "/dashboard" : "/home");

export function checkRole(
  session: { role: Role } | null,
  required: Role
): "ok" | "unauthenticated" | "forbidden" {
  if (!session) return "unauthenticated";
  return session.role === required ? "ok" : "forbidden";
}