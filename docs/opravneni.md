# Oprávnění rolí

Server vyhodnocuje oprávnění u **každého** požadavku podle aktuálních rolí v databázi (odebrání role
platí okamžitě). Uživatel může mít více rolí — platí nejvyšší úroveň. Zdroj pravdy: `apps/api/src/auth.ts`.

Úrovně: **—** nic · **základ** jen nezbytné údaje · **vlastní** jen vlastní záznamy · **čtení** · **zápis**.

| Modul | Admin | Ředitel | Revizor | Tým | Dočaskář | Dobrovolník |
|---|---|---|---|---|---|---|
| Psi | zápis | zápis | čtení | zápis | vlastní (svěřenci) | základ |
| Zdraví | zápis | zápis | čtení | zápis | vlastní (čte, zapisuje váhu) | — |
| Dokumenty | zápis | zápis | čtení | zápis | vlastní (fotky, vybrané kategorie) | — |
| Osoby | zápis | zápis | čtení | zápis | — | — |
| Adopce | zápis | zápis | čtení | zápis | — | — |
| Dočasná péče | zápis | zápis | čtení | zápis | — | — |
| Úkoly | zápis | zápis | čtení | zápis | vlastní | vlastní |
| Statistiky | zápis | zápis | čtení | čtení | — | — |
| Historie změn | zápis | zápis | čtení | — | — | — |
| Uživatelé, nastavení | zápis | čtení | čtení | — | — | — |
| Zálohy | zápis | — | — | — | — | — |
| Finance | zápis | zápis | čtení | vlastní (výdaje s doklady, součty nákladů na psa) | vlastní (výdaje svých svěřenců) | — |
| Spolek | zápis | zápis | čtení | — | — | — |
| Sklad | zápis | zápis | čtení | zápis | — | — |
| Dobrovolníci (směny) | zápis | zápis | čtení | zápis | — | vlastní (své směny) |
| Sociální sítě | zápis | zápis | čtení | zápis | — | — |
| Data (export, import, GDPR) | zápis | zápis | čtení (přehledy) | — | — | — |

Zdůvodnění hlavních voleb:

- **Revizor** (kontrolní role, sekce 24) potřebuje přístup k hospodaření a historii — čte vše, nic nemění.
- **Tým u financí jen „vlastní“**: zapisuje běžné výdaje (veterina, krmivo) s účtenkou a vidí náklady
  na psa, ale nevidí dárce ani celé hospodaření (minimalizace osobních údajů, sekce 21).
- **Dočaskář** vidí jen aktuální svěřence; u financí jen výdaje, které sám zadal ke svému svěřenci.
- **Dobrovolník** nevidí osoby, adopce, zdraví, finance ani dokumenty (sekce 24).
