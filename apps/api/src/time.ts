export const TZ = "Europe/Prague";

/** Datum a čas v Praze: { date: "YYYY-MM-DD", time: "HH:MM" } — „dnes“ pro uživatele, ne podle UTC. */
export function pragueNow(d = new Date()): { date: string; time: string } {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" })
      .formatToParts(d)
      .map((p) => [p.type, p.value]),
  );
  return { date: `${parts.year}-${parts.month}-${parts.day}`, time: `${parts.hour}:${parts.minute}` };
}

/** "2026-03-05" → "5. 3. 2026" (pro texty upozornění, e-mailů a dokumentů). */
export function czDate(iso?: string | null): string {
  if (!iso) return "—";
  const [y, m, d] = iso.slice(0, 10).split("-");
  return `${Number(d)}. ${Number(m)}. ${y}`;
}
