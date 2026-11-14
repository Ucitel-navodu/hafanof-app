import type { Level } from "../auth";
import type { Gate, WebModule } from "./types";
import { coreModule } from "./core";
import { financeModule } from "./finance";
import { associationModule } from "./association";
import { inventoryModule } from "./inventory";
import { communityModule } from "./community";
import { documentsModule } from "./documents";
import { dataModule } from "./data";
import { securityModule } from "./security";
import { platformModule } from "./platform";

/** Všechny webové moduly. Každý modul přidává navigaci, routy a sekce přes tento registr. */
export const WEB_MODULES: WebModule[] = [
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

type Can = (module: string, min?: Level) => boolean;
export const allowed = (can: Can, g?: Partial<Gate>) => !g?.module || can(g.module, g.min ?? "read");

/** Posbírá položky daného typu ze všech modulů. */
export function collect<K extends keyof WebModule>(key: K): NonNullable<WebModule[K]> extends (infer T)[] ? T[] : never {
  return WEB_MODULES.flatMap((m) => (m[key] as unknown[] | undefined) ?? []) as never;
}

export function entityLabels(): Record<string, string> {
  return Object.assign({}, ...WEB_MODULES.map((m) => m.entityLabels ?? {}));
}
export function fieldLabels(): Record<string, string> {
  return Object.assign({}, ...WEB_MODULES.map((m) => m.fieldLabels ?? {}));
}

export function timelineLinks(): Record<string, (refId: number, dog: any) => string> {
  return Object.assign({}, ...WEB_MODULES.map((m) => m.timelineLinks ?? {}));
}
export function timelineIcons(): Record<string, string> {
  return Object.assign({}, ...WEB_MODULES.map((m) => m.timelineIcons ?? {}));
}
