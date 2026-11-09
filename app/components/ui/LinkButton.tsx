import Link from "next/link";
import type { ReactNode } from "react";
import { buttonClasses, type ButtonVariant } from "./Button";

export default function LinkButton({
  href,
  children,
  variant = "primary",
  full = false,
}: {
  href: string;
  children: ReactNode;
  variant?: ButtonVariant;
  full?: boolean;
}) {
  return (
    <Link href={href} className={buttonClasses(variant, full)}>
      {children}
    </Link>
  );
}