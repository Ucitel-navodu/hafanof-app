# Funkční zadání 1.0 – stav implementace

Rozsah prvního milníku: **akceptační scénáře ze sekcí 23 a 24** a všechny 🔴 body, bez kterých by neprošly.
Finance, spolková administrativa, sklad a sociální sítě jsou záměrně až v dalších milnících.

Legenda: ✅ hotovo · 🟨 částečně · ⏭ další milník

## Hotovo v milníku 1

| Sekce | Stav | Poznámka |
|---|---|---|
| 1 Základní principy | 🟨 | Jedna databáze, PC i mobil, vlastní účty a role, audit, vazby na psa/osobu, globální hledání, zálohy s ověřenou obnovou, PWA. Na psa/osobu zatím nejdou navázat náklady (přijdou s financemi). |
| 2 Role | ✅ | Administrátor, statutární ředitel, revizor, člen týmu, dočaskář, dobrovolník. Kontrola oprávnění na serveru. Veterinář a adoptující portál (🟢) zatím ne. |
| 3 Nástěnka | ✅ | Počty psů, dnešní úkoly a úkoly po termínu, zdravotní termíny a léky, nevyřízené žádosti, dokumenty k doplnění či podpisu, rychlá tlačítka. Výročí adopcí zatím ne. |
| 4 Karta psa | ✅ | Evidenční číslo `HAF-RRRR-NNNN`, všechny požadované údaje, stavy, automatický počet dní v péči, povaha. |
| 5 Časová osa | ✅ | Automatické události, vlastní poznámka nebo problém, proklik na záznam či dokument. |
| 6 Zdraví | ✅ | Vstupní stav, návštěvy, diagnózy, zákroky, očkování s platností, odčervení, laboratoř, fyzioterapie, léky, kastrace, historie váhy, upozornění na další termín. |
| 7 Dokumentace psa | 🟨 | Kategorie dle zadání, nahrávání PDF/DOCX/obrázků, stav dokumentu, náhled PDF a obrázků v prohlížeči. **Generování dokumentů z databáze (🟡) zatím ne.** |
| 8 Osoby | ✅ | Více rolí na jedné kartě, kontakty, vazby na psy, komunikace, datum souhlasu GDPR, hledání podle jména, telefonu a e-mailu. |
| 9 Adopce | ✅ | Celý workflow, více zájemců, interní důvod zamítnutí, jediná rezervace, smlouva, nový majitel, automatické kontroly po adopci (nastavitelné), úmrtí adoptovaného psa. Pozdravy z domova a výročí zatím ne. |
| 10 Dočasná péče | 🟨 | Dočaskáři s kapacitou a omezeními, předání, přesun, vrácení, vydané vybavení, předávací protokol, omezený přístup dočaskáře. **Výdaje dočasky a účtenky přijdou s financemi.** |
| 11 Dobrovolníci | 🟨 | Úkoly a jejich potvrzení, přístup jen k nutným údajům. Směny a akce zatím ne. |
| 12 Úkoly a kalendář | ✅ | Všechny 🔴 body včetně opakovaných úkolů, komentářů a příloh. Synchronizace s Google Kalendářem (🟡) zatím ne. |
| 17 Statistiky | 🟨 | Přijatí psi, adopce, aktuálně v péči a v DP, průměrná délka pobytu. **Náklady na psy chybí – závisí na financích.** |
| 18 Upozornění | 🟨 | V aplikaci na nástěnce (úkoly po termínu, zdravotní termíny, léky, žádosti bez reakce, chybějící dokumenty). E-mailové notifikace zatím ne. |
| 19 Audit | ✅ | Kdo, kdy, původní a nová hodnota, vytvoření i mazání; nemazatelné (DB trigger); filtr podle uživatele, psa, typu a období. |
| 21 Bezpečnost | 🟨 | Responzivní web, scrypt, serverová autorizace, CSRF, limit přihlášení, zálohy s testem obnovy, minimalizace údajů podle role. HTTPS zajišťuje reverzní proxy při nasazení. Export celé evidence a 2FA (🟡) zatím ne. |
| 22 Vzhled | ✅ | Logo s ochrannou zónou, barvy #D1AD3B / #5F574D / #FBF3E7 / bílá, EB Garamond + Public Sans, spodní lišta na mobilu, nástěnka „Můj Hafanof“ podle role. |
| 23 Akceptační scénář – pes | ✅ | Automatický test `apps/api/test/acceptance.test.ts`. Výjimka: „správně zahrnout do statistik“ zatím bez nákladů. |
| 24 Akceptační scénář – oprávnění | ✅ | Automatický test v témže souboru, včetně okamžitého odebrání oprávnění. |

## Další milníky

- **Milník 2 – Finance (sekce 13):** příjmy a výdaje, doklady, vazba na psa a sbírku, automatický součet nákladů na psa, náklady ve statistikách, výdaje dočasek. Nejdřív je potřeba rozhodnout otevřený bod 25: plné účetnictví, nebo jen provozní evidence navázaná na účetnictví.
- **Milník 3 – Spolek (sekce 16):** členové, valné hromady, stanovy, smlouvy, plné moci, hlídání povinných termínů.
- **Milník 4:** sklad (14), sociální sítě (15), generování dokumentů (7), e-mailové notifikace (18), export do Excelu/PDF (17), 2FA (21), směny dobrovolníků (11).
- **Později (🟢):** AI funkce (20), klientský portál adoptujících, přístup pro veterináře.

## Otevřené body ze sekce 25 – zvolené výchozí hodnoty

Tým je může změnit; jde o návrh, ne o rozhodnutí.

| Otázka | Výchozí volba v kódu |
|---|---|
| Formát evidenčního čísla | `HAF-RRRR-NNNN` podle roku přijetí (`apps/api/src/routes/dogs.ts`, `nextRegNumber`) |
| Stavy psa a konečné stavy | 8 stavů ze sekce 4; konečné: adoptovaný, zemřelý, jiné ukončení (uzavírají evidenci) |
| Povinné údaje karty psa | Jen jméno a datum přijetí |
| Kontroly po adopci | 14, 90 a 365 dní; mění se ve Správě |
| Role ve verzi 1.0 | admin, ředitel, revizor, tým, dočaskář, dobrovolník |
| Co vidí dočaskář | Jen aktuálně svěřené psy, bez původu přijetí a nového majitele; zdraví čte, zapisuje váhu, poznámky, problémy a fotky |
| Co vidí dobrovolník | Přidělené a vlastní úkoly, základní údaje a povahu psů; bez čipu, osob, adopcí, zdraví a dokumentů |
| Notifikace | Zatím jen v aplikaci |
| Import historické evidence | Zatím neřešeno – potřebuje vzorek dat a rozhodnutí o formátu čísel |
