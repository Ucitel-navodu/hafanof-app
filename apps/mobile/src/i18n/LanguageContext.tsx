import React, { createContext, useContext, useMemo, useState } from "react";
import { CS, EN, Lang, Strings } from "./strings";

interface LanguageContextValue {
  lang: Lang;
  t: Strings;
  toggleLang: () => void;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLang] = useState<Lang>("cs");
  const value = useMemo<LanguageContextValue>(
    () => ({
      lang,
      t: lang === "cs" ? CS : EN,
      toggleLang: () => setLang((l) => (l === "cs" ? "en" : "cs")),
    }),
    [lang]
  );
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within LanguageProvider");
  return ctx;
}
