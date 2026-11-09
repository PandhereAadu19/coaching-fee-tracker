import { cookies } from "next/headers";
import {
  LANG_COOKIE,
  dictionaries,
  normaliseLang,
  translate,
  type Lang,
  type MessageKey,
} from "./i18n";

export async function getLang(): Promise<Lang> {
  return normaliseLang((await cookies()).get(LANG_COOKIE)?.value);
}

/** For server components: const { t } = await getT(); t("nav.home") */
export async function getT() {
  const lang = await getLang();
  const messages = dictionaries[lang];
  return {
    lang,
    messages,
    t: (key: MessageKey, vars?: Record<string, string | number>) => translate(messages, key, vars),
  };
}