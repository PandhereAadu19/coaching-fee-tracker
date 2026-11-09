import type { ReactNode } from "react";

export default function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-semibold text-neutral-900">{title}</h1>
        {subtitle && <p className="mt-1 text-base text-neutral-600">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}