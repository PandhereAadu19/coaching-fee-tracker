"use client";
import Button from "./ui/Button";
import { useT } from "./LangProvider";

export default function PrintButton() {
  const t = useT();
  return (
    <Button variant="secondary" onClick={() => window.print()}>
      {t("receipts.print")}
    </Button>
  );
}