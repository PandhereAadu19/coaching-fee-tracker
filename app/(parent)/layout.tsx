import type { ReactNode } from "react";
import { LangProvider } from "../components/LangProvider";
import LanguageToggle from "../components/LanguageToggle";
import LogoutButton from "../components/LogoutButton";
import NavLinks from "../components/NavLinks";
import { requireParentPage } from "../../lib/guards";
import { getT } from "../../lib/i18n-server";

export const instant = false;

export default async function ParentLayout({ children }: { children: ReactNode }) {
  await requireParentPage();
  const { lang, messages, t } = await getT();
  const items = [
    { href: "/home", label: t("nav.home"), also: ["/pay"] },
    { href: "/receipts", label: t("nav.receipts") },
  ];

  return (
    <LangProvider lang={lang} messages={messages}>
      <div className="min-h-screen bg-white">
        <header className="sticky top-0 z-10 border-b border-neutral-200 bg-white">
          <div className="mx-auto flex h-16 w-full max-w-md items-center justify-between gap-3 px-4 md:max-w-5xl md:px-6">
            <span className="text-lg font-semibold text-indigo-700">{t("app.name")}</span>
            <div className="hidden md:block">
              <NavLinks variant="top" items={items} />
            </div>
            <div className="flex items-center gap-2">
              <LanguageToggle />
              <LogoutButton compact />
            </div>
          </div>
        </header>
        <div className="mx-auto w-full max-w-md px-4 pb-28 pt-6 md:max-w-5xl md:px-6 md:pb-10">{children}</div>
        <div className="fixed inset-x-0 bottom-0 z-10 border-t border-neutral-200 bg-white md:hidden">
          <NavLinks variant="bottom" items={items} />
        </div>
      </div>
    </LangProvider>
  );
}