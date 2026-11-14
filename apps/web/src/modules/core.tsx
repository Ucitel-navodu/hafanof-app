import { Paw } from "../ui";
import type { WebModule } from "./types";

/** Jádro evidence: hlavní navigace milníku 1. Routy jádra jsou přímo v App.tsx. */
export const coreModule: WebModule = {
  name: "core",
  nav: [
    { to: "/", label: "Můj Hafanof", icon: "⌂", order: 10, mobile: true },
    { to: "/psi", label: "Psi", icon: <Paw size={18} />, module: "dogs", min: "basic", order: 20, mobile: true },
    { to: "/ukoly", label: "Úkoly", icon: "✓", module: "tasks", min: "own", order: 30, mobile: true },
    { to: "/kalendar", label: "Kalendář", icon: "▦", order: 40, mobile: true },
    { to: "/adopce", label: "Adopce", icon: "♥", module: "adoptions", min: "read", order: 50 },
    { to: "/osoby", label: "Osoby", icon: "☺", module: "people", min: "read", order: 60 },
    { to: "/statistiky", label: "Statistiky", icon: "▤", module: "stats", min: "read", order: 900 },
    { to: "/historie", label: "Historie změn", icon: "⟲", module: "audit", min: "read", order: 910 },
    { to: "/sprava", label: "Správa", icon: "⚙", module: "users", min: "read", order: 990 },
  ],
};
