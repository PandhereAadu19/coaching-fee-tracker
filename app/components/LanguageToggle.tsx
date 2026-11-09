"use client";
import { useRouter } from "next/navigation";
import { LANG_COOKIE, type Lang } from "../../lib/i18n";
import { useLang } from "./LangProvider";

export default function LanguageToggle() {
  const router = useRouter();
  const lang = useLang();

  function choose(next: Lang) {
    document.cookie = `${LANG_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
    router.refresh();
  }

  const base = "h-12 min-w-12 px-3 text-base font-medium";
  const on = "bg-indigo-600 text-white";
  const off = "bg-white text-neutral-700 hover:bg-neutral-50";

  return (
    <div className="inline-flex overflow-hidden rounded-xl border border-neutral-300" role="group" aria-label="Language">
      <button className={`${base} ${lang === "en" ? on : off}`} aria-pressed={lang === "en"} onClick={() => choose("en")}>
        EN
      </button>
      <button className={`${base} ${lang === "hi" ? on : off}`} aria-pressed={lang === "hi"} onClick={() => choose("hi")}>
        हिं
      </button>
    </div>
  );
}