import type { ApiModule, Migration } from "./types";
import { coreModule } from "./core";
import { financeModule } from "./finance";
import { associationModule } from "./association";
import { inventoryModule } from "./inventory";
import { communityModule } from "./community";
import { documentsModule } from "./documents";
import { dataModule } from "./data";
import { securityModule } from "./security";
import { platformModule } from "./platform";

/**
 * Všechny moduly aplikace. Pořadí určuje pořadí skupin ve vyhledávání a upozorněních.
 * Rozsahy ID migrací: core 1–99, platform 100–199, finance 200–299, association 300–399,
 * inventory 400–499, community 500–599, documents 600–699, data 700–799, security 800–899.
 */
export const MODULE_LIST: ApiModule[] = [
  coreModule,
  financeModule,
  associationModule,
  inventoryModule,
  communityModule,
  documentsModule,
  dataModule,
  securityModule,
  platformModule,
];

const RANGES: Record<string, [number, number]> = {
  core: [1, 99],
  platform: [100, 199],
  finance: [200, 299],
  association: [300, 399],
  inventory: [400, 499],
  community: [500, 599],
  documents: [600, 699],
  data: [700, 799],
  security: [800, 899],
};

export function allMigrations(): Migration[] {
  const out: Migration[] = [];
  for (const m of MODULE_LIST) {
    const [lo, hi] = RANGES[m.name] ?? [0, -1];
    for (const mig of m.migrations ?? []) {
      if (mig.id < lo || mig.id > hi) throw new Error(`Migrace ${mig.id} modulu ${m.name} je mimo rozsah ${lo}–${hi}`);
      out.push(mig);
    }
  }
  return out;
}
