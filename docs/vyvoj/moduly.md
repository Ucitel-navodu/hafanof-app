# Vývoj: architektura modulů

Aplikace = **jádro** (milník 1: psi, zdraví, dokumenty, osoby, adopce, DP, úkoly, audit) + **moduly**
(finance, spolek, sklad, komunita, dokumenty, data, zabezpečení, provoz). Každý modul žije ve vlastní
složce a do aplikace se zapojuje přes registr — nesahá do souborů jádra ani jiných modulů.

```
apps/api/src/modules/<modul>/index.ts      → export const <modul>Module: ApiModule
apps/web/src/modules/<modul>/index.tsx     → export const <modul>Module: WebModule
apps/api/test/<modul>.test.ts              → testy modulu
docs/moduly/<modul>.md                     → popis modulu pro tým (česky)
```

## API modul (`apps/api/src/modules/types.ts`)

| Pole | K čemu |
|---|---|
| `migrations` | Migrace schématu. **ID jen ze svého rozsahu** (viz tabulka). Nasazenou migraci nikdy neměňte — přidejte novou. Změny tabulek jádra jen přes `ALTER TABLE … ADD COLUMN`. |
| `routes` | `{ path, router(ctx) }` → připojí se pod `/api/<path>`. `ctx = { db, paths }`. |
| `alerts` | Upozornění (sekce 18) — zobrazí se na nástěnce a půjdou do e-mailového souhrnu. |
| `calendar` | Položky kalendáře (sekce 12) — také do kalendářového feedu (ICS). |
| `search` | Skupina výsledků globálního vyhledávání (sekce 1). |
| `jobs` | Naplánované úlohy (denně v čase Europe/Prague / každých N minut). |
| `documentRefs` | Navázání souborů na záznamy modulu (`ref_type` + `ref_id`) — přístup řídí modul. |
| `seedDemo` | Ukázková data pro `HAFANOF_DEMO=1 npm run seed`. |

Poskytovatelé `alerts/calendar/search` deklarují `module` + `min` — registr je zavolá jen uživateli,
který má v modulu aspoň tuto úroveň. **Uvnitř** poskytovatele musíte i tak omezit data podle úrovně
(`own` = jen vlastní záznamy).

### Rozsahy ID migrací

| Modul | ID |
|---|---|
| core | 1–99 |
| platform | 100–199 |
| finance | 200–299 |
| association | 300–399 |
| inventory | 400–499 |
| community | 500–599 |
| documents | 600–699 |
| data | 700–799 |
| security | 800–899 |

### Povinná pravidla (API)

1. **Oprávnění na serveru u každého endpointu**: `requireLevel(req, "<modul>", "read"|"write"|"own")`
   (`auth.ts`). U úrovně `own` filtrujte na vlastní záznamy (`created_by = user.id`, svěřenci přes
   `fosterDogIds`). U psa použijte `requireDogAccess`. Matice rolí je v `docs/opravneni.md` — **neměňte ji**
   v modulu; potřebujete-li jinou, napište to do zprávy.
2. **Každý zápis auditovat**: `createAudited` / `updateAudited` / `deleteAudited` / `audit` (`audit.ts`).
   Audit ukládá původní i novou hodnotu; tabulka `audit_log` je append-only.
3. **Validace vstupu**: `pick` (whitelist polí), `requireFields`, `assertOneOf`, `assertDate`, `optInt`.
   Nikdy nevkládejte vstup do SQL jinak než přes parametry `?`.
4. **Transakce** pro vícekrokové zápisy: `tx(db, () => …)`.
5. **Časová osa psa**: událost týkající se psa zapište přes `addDogEvent` (s `ref_type`/`ref_id`).
   Citlivé údaje (částky, osobní údaje) do názvu události nepište — časovou osu vidí i dočaskář.
6. **Datum**: `today()` a `addDays()` z `audit.ts` (Europe/Prague), formát `YYYY-MM-DD`. Texty
   pro lidi formátujte `czDate()` z `time.ts`.
7. **Peníze**: v DB i API celé číslo v **haléřích** (`INTEGER`), sloupce končí `_hal`
   (např. `amount_hal`). Žádné floaty. Web formátuje `fmtMoney`, parsuje `parseMoney` (`labels.ts`).
8. **Soubory**: nahrávejte přes existující `POST /api/documents` (multipart). Patří-li soubor
   k záznamu modulu (účtenka, zápis…), pošlete `ref_type` + `ref_id` a v modulu zaregistrujte
   `documentRefs` s `canView` / `canAttach`. Takový dokument se nezobrazí v obecných seznamech
   ani v časové ose psa. Seznam: `GET /api/documents?ref_type=…&ref_id=…`.
9. **Chyby**: `throw new HttpError(status, "Česká zpráva")`. Handlery obalte `h(...)` (`routes/util.ts`).
10. **Osobní údaje (GDPR)**: ukládejte jen to, co modul potřebuje. Nové tabulky s osobními údaji
    uveďte v `docs/moduly/<modul>.md` (kvůli exportu/anonymizaci v modulu „data“).
11. **Nastavení** upravitelné ve Správě: `INSERT OR IGNORE INTO settings` v migraci, validátor přes
    `registerSetting(key, fn)` z `routes/admin.ts`, čtení `getSetting` (`db.ts`).

## Webový modul (`apps/web/src/modules/types.ts`)

| Pole | K čemu |
|---|---|
| `nav` | Položka hlavní navigace (`order` ≥ 100, `mobile` jen u nejčastějších úkonů). |
| `routes` | Routy; podstránky přes `path: "/finance/*"` a vlastní `<Routes>` uvnitř. |
| `dogTabs` / `dogTabSections` | Nová záložka na kartě psa / obsah vložený do existující záložky. |
| `personSections` | Sekce na kartě osoby. |
| `dashboardWidgets` | Karta na nástěnce. |
| `profileSections` / `adminSections` | Sekce na stránce Můj účet / Správa. |
| `dogDocActions` / `adoptionActions` | Tlačítka v dokumentaci psa / u adopce. |
| `timelineLinks` / `timelineIcons` | Odkaz a ikona událostí časové osy, které modul zapisuje. |
| `entityLabels` / `fieldLabels` | Lidské názvy tabulek a polí pro Historii změn. |

### Povinná pravidla (web)

1. Používejte sdílené komponenty z `ui.tsx` (`Card`, `PageHead`, `Form`, `Modal`, `Tabs`, `Badge`,
   `KV`, `Empty`, `Loading`, `ErrorBox`, `toFormData`) a `api.ts` (`useApi`, `get/post/patch/del`).
   Odkazy na soubory vždy přes `components/DocLink.tsx`.
2. Barvy jen přes CSS proměnné ze `styles.css` (brand Hafanof). Vlastní styly modulu do
   `modules/<modul>/<modul>.css` (importovat v `index.tsx`), třídy s prefixem modulu.
3. Mobil první: žádný vodorovný posuv na 390 px, dotykové cíle ≥ 40 px, formuláře v `Modal`.
4. UI skrývá jen to, k čemu uživatel nemá přístup (`useAuth().can`); bezpečnost řeší server.
5. Texty česky, datum `fmtDate`, peníze `fmtMoney`.

## Testy a kontrola před odevzdáním

```bash
cd apps/api && npx tsc --noEmit -p . && npm test        # všechny testy musí projít
cd apps/web && npx tsc -b && npx vite build              # typy + build
```

Každý modul má `apps/api/test/<modul>.test.ts` pokrývající jeho požadavky ze zadání **a oprávnění**
(kdo smí číst/zapisovat; dobrovolník, dočaskář a tým nesmí vidět, co nemají). Pomocníci jsou
v `test/helpers.ts` (`startTestServer`, `seedUser`, `Client`, `fileForm`); vlastní pomocníky dejte
do `test/<modul>.helpers.ts`.
