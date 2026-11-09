"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Button from "./ui/Button";
import { useT } from "./LangProvider";

export default function AssignPayment({
  paymentId,
  options,
}: {
  paymentId: string;
  options: { id: string; label: string }[];
}) {
  const t = useT();
  const router = useRouter();
  const [instalmentId, setInstalmentId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function assign() {
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/payments/assign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentId, instalmentId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? t("common.error"));
        return;
      }
      router.refresh();
    } catch {
      setError(t("common.error"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-1">
      <div className="flex gap-2">
        <select
          value={instalmentId}
          onChange={(e) => setInstalmentId(e.target.value)}
          className="h-12 min-w-56 max-w-xs rounded-xl border border-neutral-300 bg-white px-3 text-base"
        >
          <option value="">{t("queues.chooseInstalment")}</option>
          {options.map((o) => (
            <option key={o.id} value={o.id}>
              {o.label}
            </option>
          ))}
        </select>
        <Button loading={loading} disabled={!instalmentId} onClick={assign}>
          {t("queues.assign")}
        </Button>
      </div>
      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}