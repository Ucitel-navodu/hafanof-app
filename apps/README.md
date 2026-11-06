# Hafanof – aplikace

| Složka | Co to je | Stav |
|---|---|---|
| `apps/api` | Backend evidence (Express + SQLite přes `node:sqlite`) | **aktivní** – milník 1 funkčního zadání 1.0 |
| `apps/web` | Responzivní webová aplikace / PWA (React + Vite) pro PC i mobil | **aktivní** – milník 1 |
| `apps/server`, `apps/mobile` | Původní Expo prototyp podle Claude Design (patroni, adoptéři, demo přihlášení) | **zmrazeno** – nerozvíjí se |

Co z funkčního zadání je hotové a co zbývá, popisuje [`docs/zadani-1.0-stav.md`](../docs/zadani-1.0-stav.md).

## Lokální spuštění

Potřeba je Node.js ≥ 22.13 (kvůli vestavěnému `node:sqlite`).

```bash
cd apps/api
npm install
HAFANOF_DEMO=1 npm run seed   # admin + ukázkové účty všech rolí a pár psů
npm run dev                   # API na http://localhost:4100
```

```bash
cd apps/web
npm install
npm run dev                   # http://localhost:5173 (proxy /api → 4100)
```

Ukázkové účty (heslo `hafanof-demo-2026`): `reditel@`, `revizor@`, `tym@`, `dana@` (dočaskářka), `dobrovolnik@hafanof.cz`.
Heslo administrátora `admin@hafanof.cz` vypíše `seed`. Bez `HAFANOF_DEMO=1` vznikne jen administrátor.

## Testy

```bash
cd apps/api && npm test
```

Testy procházejí akceptační scénáře ze sekcí 23 (pes od příjmu po adopci) a 24 (oprávnění) a ověřují zálohu a obnovu.

## Provoz

1. `cd apps/web && npm run build` – sestavený web servíruje přímo API ze stejné adresy (`apps/web/dist`).
2. `cd apps/api && npm run build && NODE_ENV=production PORT=4100 npm start`
3. Před server dejte reverzní proxy s **HTTPS** (Caddy / nginx). `NODE_ENV=production` zapne cookie jen pro HTTPS a HSTS.
4. Zálohy: `npm run backup` z cronu (např. denně ve 2:00). Záloha = snapshot databáze (`VACUUM INTO`) + kopie nahraných souborů + kontrola integrity. Složky záloh kopírujte i mimo server.
5. Obnova (server zastavený): `npm run restore -- backups/<složka>`.

Proměnné prostředí: `PORT`, `HAFANOF_DATA_DIR` (databáze + soubory), `HAFANOF_BACKUP_DIR`, `HAFANOF_WEB_DIR`, pro seed `HAFANOF_ADMIN_EMAIL`, `HAFANOF_ADMIN_PASSWORD`, `HAFANOF_DEMO`.

## Bezpečnost v kostce

- Hesla: scrypt. Relace: náhodný token v `HttpOnly` cookie, v DB uložen jen hash.
- Oprávnění se ověřují **na serveru** u každého požadavku podle aktuálních rolí v databázi, takže odebrání role nebo deaktivace platí okamžitě.
- Zapisující požadavky musí nést hlavičku `x-hafanof: 1` (ochrana proti CSRF). Přihlášení má limit pokusů.
- Auditní tabulka je jen pro přidávání; úpravu a mazání blokuje trigger v databázi.
- Service worker nekešuje data z `/api`, takže osobní a zdravotní údaje nezůstávají v zařízení.
