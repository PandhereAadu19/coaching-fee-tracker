"use client";
import { useT } from "./LangProvider";

export default function LogoutButton({ compact = false }: { compact?: boolean }) {
  const t = useT();
  return (
    <button
      className={`h-12 rounded-xl border border-neutral-300 text-base font-medium text-neutral-800 hover:bg-neutral-50 ${
        compact ? "px-3" : "px-5"
      }`}
      onClick={async () => {
        try {
          await fetch("/api/auth/logout", { method: "POST" });
        } finally {
          window.location.assign("/login");
        }
      }}
    >
      {t("common.logout")}
    </button>
  );
}