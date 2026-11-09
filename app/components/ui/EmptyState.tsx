export default function EmptyState({ title, hint }: { title: string; hint?: string }) {
    return (
      <div className="rounded-2xl border border-dashed border-neutral-300 p-8 text-center">
        <p className="text-base font-medium text-neutral-800">{title}</p>
        {hint && <p className="mt-1 text-sm text-neutral-500">{hint}</p>}
      </div>
    );
  }