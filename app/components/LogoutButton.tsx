"use client";

export default function LogoutButton() {
  return (
    <button
      className="h-12 rounded-xl border border-neutral-300 px-5 text-base font-medium text-neutral-800 hover:bg-neutral-50"
      onClick={async () => {
        try {
          await fetch("/api/auth/logout", { method: "POST" });
        } finally {
          window.location.assign("/login");
        }
      }}
    >
      Log out
    </button>
  );
}