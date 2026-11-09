export type ChipStatus = "paid" | "due" | "upcoming" | "part_paid" | "overdue";

const styles: Record<ChipStatus, string> = {
  paid: "bg-emerald-50 text-emerald-700",
  due: "bg-amber-50 text-amber-700",
  upcoming: "bg-neutral-100 text-neutral-600",
  part_paid: "bg-sky-50 text-sky-700",
  overdue: "bg-red-50 font-semibold text-red-700",
};

export default function StatusChip({ status, label }: { status: ChipStatus; label: string }) {
  return (
    <span className={`inline-flex items-center rounded-full px-3 py-1 text-sm ${styles[status]}`}>{label}</span>
  );
}