"use client";
import { createContext, useContext, type ReactNode } from "react";
import { translate, type Lang, type MessageKey, type Messages } from "../../lib/i18n";

const Ctx = createContext<{ lang: Lang; messages: Messages | null }>({ lang: "en", messages: null });

export function LangProvider({
  lang,
  messages,
  children,
}: {
  lang: Lang;
  messages: Messages;
  children: ReactNode;
}) {
  return <Ctx.Provider value={{ lang, messages }}>{children}</Ctx.Provider>;
}

export function useLang() {
  return useContext(Ctx).lang;
}

/** For client components: const t = useT(); t("common.logout") */
export function useT() {
  const { messages } = useContext(Ctx);
  return (key: MessageKey, vars?: Record<string, string | number>) =>
    messages ? translate(messages, key, vars) : key;
}