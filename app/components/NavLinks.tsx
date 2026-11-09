"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

export interface NavItem {
  href: string;
  label: string;
  also?: string[]; // other path prefixes that should highlight this item
}

export default function NavLinks({
  items,
  variant,
}: {
  items: NavItem[];
  variant: "top" | "bottom" | "side";
}) {
  const pathname = usePathname();
  const isActive = (i: NavItem) =>
    [i.href, ...(i.also ?? [])].some((p) => pathname === p || pathname.startsWith(p + "/"));

  const wrap = {
    top: "flex gap-1",
    bottom: "grid grid-flow-col auto-cols-fr",
    side: "flex flex-col gap-1",
  }[variant];

  const link = {
    top: "flex h-12 items-center rounded-lg px-4 text-base font-medium whitespace-nowrap",
    bottom: "flex h-16 items-center justify-center border-t-2 text-sm font-medium",
    side: "flex h-12 items-center rounded-lg px-3 text-base font-medium",
  }[variant];

  const active = {
    top: "bg-indigo-50 text-indigo-700",
    bottom: "border-indigo-600 text-indigo-700",
    side: "bg-indigo-50 text-indigo-700",
  }[variant];

  const idle = {
    top: "text-neutral-600 hover:bg-neutral-50",
    bottom: "border-transparent text-neutral-500",
    side: "text-neutral-600 hover:bg-neutral-50",
  }[variant];

  return (
    <nav className={wrap}>
      {items.map((i) => (
        <Link
          key={i.href}
          href={i.href}
          aria-current={isActive(i) ? "page" : undefined}
          className={`${link} ${isActive(i) ? active : idle}`}
        >
          {i.label}
        </Link>
      ))}
    </nav>
  );
}