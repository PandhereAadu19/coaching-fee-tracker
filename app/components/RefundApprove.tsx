"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Button from "./ui/Button";
import { useT } from "./LangProvider";

export default function RefundApprove({ studentId, exitDate }: { studentId: string; exitDate: string }) {
  const t = useT();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function approve() {
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/refunds", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId, exitDate }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? t("common.error"));
        return;
      }
      router.replace("/refunds");
      router.refresh();
    } catch {
      setError(t("common.error"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-2">
      <Button loading={loading} onClick={approve}>
        {t("refund.approve")}
      </Button>
      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}