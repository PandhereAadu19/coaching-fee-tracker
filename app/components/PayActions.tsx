"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Button from "./ui/Button";
import { useT } from "./LangProvider";

export default function PayActions({ instalmentId }: { instalmentId: string }) {
  const t = useT();
  const router = useRouter();
  const keyRef = useRef<string | null>(null);
  const [busy, setBusy] = useState<"success" | "fail" | "cancel" | null>(null);
  const [message, setMessage] = useState("");

  async function submit(outcome: "success" | "fail" | "cancel") {
    setMessage("");
    setBusy(outcome);
    keyRef.current ??= crypto.randomUUID();
    try {
      const res = await fetch("/api/pay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ instalmentId, outcome, idempotencyKey: keyRef.current }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage(res.status === 409 ? "Already paid." : t("common.error"));
        return;
      }
      if (data.status === "paid" && data.receiptId) {
        router.replace(`/receipts/${data.receiptId}`);
        return;
      }
      if (data.status === "cancelled") {
        router.replace("/home");
        return;
      }
      setMessage(t("pay.failedMessage"));
    } catch {
      setMessage(t("common.error"));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-3">
      <Button full loading={busy === "success"} disabled={busy !== null} onClick={() => submit("success")}>
        {t("pay.success")}
      </Button>
      <Button full variant="secondary" loading={busy === "fail"} disabled={busy !== null} onClick={() => submit("fail")}>
        {t("pay.fail")}
      </Button>
      <Button full variant="secondary" loading={busy === "cancel"} disabled={busy !== null} onClick={() => submit("cancel")}>
        {t("pay.cancel")}
      </Button>
      {message && (
        <p role="alert" className="text-sm text-red-600">
          {message}
        </p>
      )}
    </div>
  );
}