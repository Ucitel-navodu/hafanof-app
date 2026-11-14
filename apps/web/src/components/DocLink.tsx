import type { ReactNode } from "react";

/**
 * Odkaz na soubor dokumentu. Modul „documents“ ho rozšíří o náhled přímo v aplikaci
 * (PDF a obrázky v modálním okně); všechna místa v aplikaci proto používají tuto komponentu.
 */
export function DocLink({ doc, children }: { doc: { id: number; title?: string; mime?: string | null; url?: string | null }; children?: ReactNode }) {
  const url = doc.url ?? `/api/documents/${doc.id}/file`;
  return (
    <a href={url} target="_blank" rel="noreferrer">
      {children ?? doc.title ?? "dokument"}
    </a>
  );
}
