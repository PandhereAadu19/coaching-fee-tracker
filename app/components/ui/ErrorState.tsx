"use client";
import Button from "./Button";
import { useT } from "../LangProvider";

export default function ErrorState({ message, onRetry }: { message?: string; onRetry?: () => void }) {
  const t = useT();
  return (
    <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center">
      <p className="text-base text-red-800">{message ?? t("common.error")}</p>
      {onRetry && (
        <div className="mt-4 flex justify-center">
          <Button variant="secondary" onClick={onRetry}>
            {t("common.retry")}
          </Button>
        </div>
      )}
    </div>
  );
}