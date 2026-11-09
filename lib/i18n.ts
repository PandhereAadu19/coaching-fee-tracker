import en from "../messages/en.json";
import hi from "../messages/hi.json";

export type Lang = "en" | "hi";
export type MessageKey = keyof typeof en;
export type Messages = Record<MessageKey, string>;

// Compile-time check: Hindi must have exactly the same keys as English.
const enMessages: Messages = en;
const hiMessages: Messages = hi;

export const dictionaries: Record<Lang, Messages> = { en: enMessages, hi: hiMessages };
export const LANG_COOKIE = "lang";

export function normaliseLang(value: string | null | undefined): Lang {
  return value === "hi" ? "hi" : "en";
}

export function translate(
  messages: Messages,
  key: MessageKey,
  vars?: Record<string, string | number>
): string {
  let text: string = messages[key] ?? key;
  if (vars) {
    for (const [k, v] of Object.entries(vars)) text = text.split(`{${k}}`).join(String(v));
  }
  return text;
}