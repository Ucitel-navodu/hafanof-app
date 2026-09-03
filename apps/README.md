# Hafanof App

Full implementation of the `Hafanof App.dc.html` Claude Design handoff: a bilingual (CZ/EN)
React Native app for Hafanof z.s. with four switchable roles — coordinator, foster carer,
patron and adopter — backed by a real Express + SQLite API.

## Structure

- `apps/server` — Express + TypeScript API, SQLite (via Node's built-in `node:sqlite`), JWT
  demo auth, seeded with the dogs/tasks/wishes data from the design.
- `apps/mobile` — Expo (React Native + TypeScript) app. React Navigation, CZ/EN i18n, theme
  ported from the design's brown/gold/cream identity, real photo upload via `expo-image-picker`.

## Running locally

```bash
# 1. Backend
cd apps/server
npm install
npm run seed     # creates apps/server/data/hafanof.sqlite and seeds demo data
npm run dev       # http://localhost:4000

# 2. Mobile app (separate terminal)
cd apps/mobile
npm install
npm start          # then press i / a / w for iOS / Android / web
```

The mobile app talks to `http://localhost:4000` by default (`10.0.2.2` on the Android
emulator). Override with `EXPO_PUBLIC_API_URL` for a physical device or LAN host, e.g.:

```bash
EXPO_PUBLIC_API_URL=http://192.168.1.23:4000 npm start
```

## Demo login

There is a single seeded demo account ("Klára Nováková") with all four roles. The login
screen (and the avatar button on every screen) lets you switch between them instantly —
no password, matching the design's role-picker flow.
