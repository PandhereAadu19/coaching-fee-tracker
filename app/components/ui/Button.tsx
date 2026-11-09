import type { ButtonHTMLAttributes } from "react";

export type ButtonVariant = "primary" | "secondary" | "danger";

export function buttonClasses(variant: ButtonVariant = "primary", full = false) {
  const base =
    "inline-flex h-12 items-center justify-center rounded-xl px-5 text-base font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50";
  const styles = {
    primary: "bg-indigo-600 text-white hover:bg-indigo-700",
    secondary: "border border-neutral-300 bg-white text-neutral-800 hover:bg-neutral-50",
    danger: "bg-red-600 text-white hover:bg-red-700",
  }[variant];
  return `${base} ${styles} ${full ? "w-full" : ""}`;
}

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  loading?: boolean;
  full?: boolean;
};

export default function Button({
  variant = "primary",
  loading = false,
  full = false,
  className = "",
  disabled,
  children,
  ...rest
}: Props) {
  return (
    <button
      {...rest}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={`${buttonClasses(variant, full)} ${className}`}
    >
      {loading ? "…" : children}
    </button>
  );
}