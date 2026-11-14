import type { ReactNode } from "react";
import type { Level } from "../auth";

/** Položka hlavní navigace. `order` určuje pořadí (jádro používá 10–90, moduly 100+). */
export interface NavEntry {
  to: string;
  label: string;
  icon: ReactNode;
  module?: string;
  min?: Level;
  order: number;
  /** Zobrazit ve spodní liště na mobilu (jen nejčastější úkony; jinak v nabídce „Více“). */
  mobile?: boolean;
}

/** Podmínka zobrazení podle oprávnění (jen UI — server ověřuje sám). */
export interface Gate {
  module: string;
  min: Level;
}

export interface WebModule {
  name: string;
  nav?: NavEntry[];
  /** Routy. Pro podstránky použijte path s „/*“ a uvnitř vlastní <Routes>. */
  routes?: { path: string; element: ReactNode }[];
  /** Nové záložky na kartě psa. */
  dogTabs?: (Gate & { key: string; label: string; order: number; render: (dog: any, reload: () => void) => ReactNode })[];
  /** Obsah vložený do existující záložky karty psa (overview | timeline | health | docs | adoption | foster | tasks). */
  dogTabSections?: (Gate & { tab: string; render: (dog: any, reload: () => void) => ReactNode })[];
  /** Sekce na kartě osoby. */
  personSections?: (Gate & { key: string; render: (person: any, reload: () => void) => ReactNode })[];
  /** Rychlá tlačítka v hlavičce nástěnky (sekce 3: přidat psa, osobu, úkol, výdaj, dokument). */
  quickActions?: (Gate & { key: string; label: string; to: string; order: number })[];
  /** Karty na nástěnce „Můj Hafanof“. */
  dashboardWidgets?: (Partial<Gate> & { key: string; order: number; render: () => ReactNode })[];
  /** Sekce na stránce Můj účet. */
  profileSections?: { key: string; order: number; render: () => ReactNode }[];
  /** Sekce na stránce Správa. */
  adminSections?: (Gate & { key: string; order: number; render: () => ReactNode })[];
  /** Akce v hlavičce dokumentace psa (např. „Vygenerovat dokument“). */
  dogDocActions?: (Gate & { key: string; render: (dog: any, reload: () => void) => ReactNode })[];
  /** Akce u adopce (např. vygenerovat smlouvu). */
  adoptionActions?: (Gate & { key: string; render: (adoption: any, reload: () => void) => ReactNode })[];
  /** Odkaz z události časové osy psa s daným ref_type (např. "finance_tx") na záznam modulu. */
  timelineLinks?: Record<string, (refId: number, dog: any) => string>;
  /** Ikona (znak) pro typ události časové osy, který modul zapisuje. */
  timelineIcons?: Record<string, string>;
  /** Popisky pro historii změn: název tabulky → lidský název, název pole → lidský název. */
  entityLabels?: Record<string, string>;
  fieldLabels?: Record<string, string>;
}
