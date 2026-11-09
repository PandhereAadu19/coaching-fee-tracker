"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { MessageKey } from "../../lib/i18n";
import Button from "./ui/Button";
import { useT } from "./LangProvider";

export default function RunButton({
  url,
  label,
  resultKey,
  variant = "primary",
}: {
  url: string;
  label: MessageKey;
  resultKey: MessageKey;
  variant?: "primary" | "secondary";
}) {
  const t = useT();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [failed, setFailed] = useState(false);

  async function run() {
    setMessage("");
    setFailed(false);
    setLoading(true);
    try {
      const res = await fetch(url, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setFailed(true);
        setMessage(data.error ?? t("common.error"));
        return;
      }
      setMessage(t(resultKey, data.summary ?? {}));
      router.refresh();
    } catch {
      setFailed(true);
      setMessage(t("common.error"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-1">
      <Button variant={variant} loading={loading} onClick={run}>
        {t(label)}
      </Button>
      {message && (
        <p role={failed ? "alert" : "status"} className={`text-sm ${failed ? "text-red-600" : "text-emerald-700"}`}>
          {message}
        </p>
      )}
    </div>
  );
}