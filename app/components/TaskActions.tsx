"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Button from "./ui/Button";
import { useT } from "./LangProvider";

export default function TaskActions({ taskId }: { taskId: string }) {
  const t = useT();
  const router = useRouter();
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState<"done" | "false_flag" | null>(null);
  const [error, setError] = useState("");

  async function act(action: "done" | "false_flag") {
    setError("");
    setBusy(action);
    try {
      const res = await fetch(`/api/flags/tasks/${taskId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, note: note.trim() || undefined }),
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
      setBusy(null);
    }
  }

  return (
    <div className="space-y-3">
      <label className="block space-y-1 text-sm text-neutral-600">
        {t("queues.noteField")}
        <textarea
          value={note}
          maxLength={500}
          onChange={(e) => setNote(e.target.value)}
          className="block min-h-20 w-full rounded-xl border border-neutral-300 p-3 text-base"
        />
      </label>
      <div className="flex flex-wrap gap-2">
        <Button loading={busy === "done"} disabled={busy !== null} onClick={() => act("done")}>
          {t("queues.done")}
        </Button>
        <Button
          variant="secondary"
          loading={busy === "false_flag"}
          disabled={busy !== null}
          onClick={() => act("false_flag")}
        >
          {t("queues.falseFlag")}
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