import type { ReactNode } from "react";
import { LangProvider } from "../components/LangProvider";
import LanguageToggle from "../components/LanguageToggle";
import LogoutButton from "../components/LogoutButton";
import NavLinks from "../components/NavLinks";
import { requireAccountsPage } from "../../lib/guards";
import { getT } from "../../lib/i18n-server";

export const instant = false;

export default async function AccountsLayout({ children }: { children: ReactNode }) {
  const user = await requireAccountsPage();
  const { lang, messages, t } = await getT();
  const items = [
    { href: "/dashboard", label: t("nav.dashboard"), also: ["/students"] },
    { href: "/refunds", label: t("nav.refunds") },
    { href: "/queues", label: t("nav.queues") },
  ];

  return (
    <LangProvider lang={lang} messages={messages}>
      <div className="min-h-screen bg-white lg:flex">
        <aside className="hidden w-60 shrink-0 flex-col border-r border-neutral-200 p-4 lg:sticky lg:top-0 lg:flex lg:h-screen">
          <span className="text-lg font-semibold text-indigo-700">{t("app.name")}</span>
          <div className="mt-6">
            <NavLinks variant="side" items={items} />
          </div>
          <div className="mt-auto space-y-3">
            <p className="text-sm text-neutral-600">{user.name}</p>
            <LanguageToggle />
            <LogoutButton />
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          <header className="border-b border-neutral-200 p-3 lg:hidden">
            <div className="flex items-center justify-between gap-2">
              <span className="text-lg font-semibold text-indigo-700">{t("app.name")}</span>
              <div className="flex items-center gap-2">
                <LanguageToggle />
                <LogoutButton compact />
              </div>
            </div>
            <div className="mt-2 overflow-x-auto">
              <NavLinks variant="top" items={items} />
            </div>
          </header>
          <div className="mx-auto w-full max-w-6xl px-4 py-6 lg:px-8">{children}</div>
        </div>
      </div>
    </LangProvider>
  );
}