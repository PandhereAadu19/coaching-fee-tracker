"use client";
import ErrorState from "../components/ui/ErrorState";

export default function ParentError({ reset }: { error: Error; reset: () => void }) {
  return <ErrorState onRetry={reset} />;
}