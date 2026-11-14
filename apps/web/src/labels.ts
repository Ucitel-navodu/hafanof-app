export const DOG_STATUS: Record<string, string> = {
  new: "Nově přijatý",
  in_care: "V péči",
  foster: "V dočasné péči",
  for_adoption: "K adopci",
  reserved: "Rezervovaný",
  adopted: "Adoptovaný",
  deceased: "Zemřelý",
  ended_other: "Jiné ukončení",
};
export const DOG_STATUS_TONE: Record<string, string> = {
  new: "gold",
  in_care: "taupe",
  foster: "blue",
  for_adoption: "green",
  reserved: "purple",
  adopted: "muted",
  deceased: "muted",
  ended_other: "muted",
};

export const SEX: Record<string, string> = { male: "Pes", female: "Fena", unknown: "Neznámé" };

export const ADOPTION_STATUS: Record<string, string> = {
  new: "Nový zájemce",
  questionnaire: "Dotazník",
  contacted: "Kontaktován",
  visit: "Návštěva",
  approved: "Schválen",
  rejected: "Zamítnut",
  reserved: "Rezervace",
  adopted: "Adopce",
  withdrawn: "Odstoupil",
};
export const ADOPTION_FLOW = ["new", "questionnaire", "contacted", "visit", "approved", "reserved", "adopted"];

export const HEALTH_KIND: Record<string, string> = {
  intake: "Vstupní zdravotní stav",
  vet_visit: "Veterinární návštěva",
  diagnosis: "Diagnóza",
  procedure: "Operace / zákrok",
  vaccination: "Očkování",
  deworming: "Odčervení",
  antiparasitic: "Antiparazitika",
  lab: "Laboratoř",
  physio: "Fyzioterapie",
};

export const DOC_CATEGORY: Record<string, string> = {
  record_card: "Evidenční karta",
  health_summary: "Zdravotní přehled",
  intake: "Dokumentace k přijetí",
  veterinary: "Veterinární dokumentace",
  adoption: "Adopční dokumentace",
  death_end: "Úmrtí / ukončení evidence",
  foster_handover: "Předávací dokumentace (DP)",
  photo: "Fotografie",
  other: "Ostatní",
};
export const DOC_STATUS: Record<string, string> = {
  ready: "Připraven",
  awaiting_signature: "Čeká na podpis",
  signed: "Podepsán",
  missing: "Chybí",
};

export const PERSON_ROLE: Record<string, string> = {
  adopter: "Adoptující",
  foster: "Dočaskář",
  volunteer: "Dobrovolník",
  member: "Člen spolku",
  donor: "Dárce",
  vet: "Veterinář",
  other: "Jiné",
};

export const USER_ROLE: Record<string, string> = {
  admin: "Administrátor",
  director: "Statutární ředitel",
  auditor: "Revizor / kontrola",
  team: "Člen interního týmu",
  foster: "Dočasná péče",
  volunteer: "Dobrovolník",
};

export const TASK_STATUS: Record<string, string> = {
  open: "Otevřený",
  in_progress: "Rozpracovaný",
  done: "Hotovo",
  cancelled: "Zrušený",
};
export const PRIORITY: Record<string, string> = { low: "Nízká", normal: "Běžná", high: "Vysoká" };

export const ENTITY: Record<string, string> = {
  dogs: "Pes",
  health_records: "Zdravotní záznam",
  medications: "Léky",
  weights: "Hmotnost",
  documents: "Dokument",
  people: "Osoba",
  adoptions: "Adopce",
  communications: "Komunikace",
  placements: "Dočasná péče",
  placement_items: "Vybavení DP",
  tasks: "Úkol",
  task_comments: "Komentář",
  users: "Uživatel",
  settings: "Nastavení",
  system: "Systém",
};
export const ACTION: Record<string, string> = {
  create: "vytvořil(a)",
  update: "změnil(a)",
  delete: "smazal(a)",
  login: "přihlášení",
  logout: "odhlášení",
  backup: "záloha",
  restore: "obnova",
  export: "export",
  import: "import",
  anonymize: "anonymizace",
  security: "zabezpečení",
};

export function fmtDate(d?: string | null): string {
  if (!d) return "—";
  const [y, m, day] = d.slice(0, 10).split("-");
  return `${Number(day)}. ${Number(m)}. ${y}`;
}
export function fmtDateTime(d?: string | null): string {
  if (!d) return "—";
  const dt = new Date(d.includes("T") ? d : d.replace(" ", "T") + "Z");
  return dt.toLocaleString("cs-CZ", { day: "numeric", month: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" });
}
/** Dnešní datum v místním čase prohlížeče (ne UTC — jinak by po půlnoci byl „dnes“ ještě včerejšek). */
export const todayIso = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
export function addDays(date: string, n: number) {
  const d = new Date(date + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
export function age(birth?: string | null, estimated?: number | boolean) {
  if (!birth) return "—";
  const months = Math.floor((Date.now() - Date.parse(birth)) / (30.44 * 864e5));
  const txt = months < 12 ? `${months} měs.` : `${Math.floor(months / 12)} r.${months % 12 ? " " + (months % 12) + " měs." : ""}`;
  return (estimated ? "cca " : "") + txt;
}
export const fullName = (p?: { first_name?: string; last_name?: string } | null) =>
  p ? `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim() : "";

/** Čitelné názvy polí v historii změn. */
export const FIELD: Record<string, string> = {
  name: "Jméno", alias: "Alias", sex: "Pohlaví", breed: "Plemeno", color: "Barva", birth_date: "Datum narození",
  birth_estimated: "Odhad data narození", chip: "Čip", passport: "Pas", other_id: "Jiná identifikace",
  intake_date: "Datum přijetí", intake_type: "Způsob přijetí", intake_origin: "Původ", location: "Umístění",
  responsible_person_id: "Odpovědná osoba", status: "Stav", end_date: "Datum ukončení", end_reason: "Důvod ukončení",
  death_date: "Datum úmrtí", owner_person_id: "Nový majitel", castrated: "Kastrace", castration_date: "Datum kastrace",
  photo_document_id: "Profilová fotka", title: "Název", category: "Kategorie", due_date: "Termín",
  assignee_user_id: "Odpovědná osoba", priority: "Priorita", completed_at: "Dokončeno", visit_at: "Návštěva",
  adopted_at: "Datum adopce", rejection_reason: "Důvod zamítnutí", questionnaire: "Dotazník", notes: "Poznámky",
  roles: "Role", active: "Aktivní", first_name: "Jméno", last_name: "Příjmení", phone: "Telefon", email: "E-mail",
  address: "Adresa", returned: "Vráceno", kg: "Hmotnost", next_due: "Další termín", valid_until: "Platnost do",
  conclusion: "Závěr", description: "Popis",
};
/** Přeloží hodnotu stavu podle pole a typu záznamu. */
export function fieldValue(entity: string, field: string, v: unknown): string | null {
  if (field !== "status" || typeof v !== "string") return null;
  if (entity === "dogs") return DOG_STATUS[v] ?? v;
  if (entity === "adoptions") return ADOPTION_STATUS[v] ?? v;
  if (entity === "tasks") return TASK_STATUS[v] ?? v;
  if (entity === "documents") return DOC_STATUS[v] ?? v;
  return null;
}

/** Částka v haléřích → „1 234,50 Kč“. V DB i API jsou částky celé číslo v haléřích. */
export function fmtMoney(halere?: number | null, opts: { sign?: boolean } = {}): string {
  if (halere === null || halere === undefined) return "—";
  const s = (halere / 100).toLocaleString("cs-CZ", { minimumFractionDigits: halere % 100 ? 2 : 0, maximumFractionDigits: 2 });
  return `${opts.sign && halere > 0 ? "+" : ""}${s} Kč`;
}
/** „1 234,5“ / „1234.50“ → haléře (celé číslo), nebo null při neplatném vstupu. */
export function parseMoney(input: unknown): number | null {
  if (typeof input === "number") return Number.isFinite(input) ? Math.round(input * 100) : null;
  const s = String(input ?? "").replace(/\s|Kč/g, "").replace(",", ".");
  if (!/^-?\d+(\.\d{1,2})?$/.test(s)) return null;
  return Math.round(Number(s) * 100);
}
