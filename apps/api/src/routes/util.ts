import type { NextFunction, Request, Response } from "express";
import { HttpError } from "../auth";

export type Handler = (req: Request, res: Response) => unknown;

/** Wraps a sync/async handler so thrown HttpErrors become JSON responses. */
export const h =
  (fn: Handler) =>
  (req: Request, res: Response, next: NextFunction) => {
    try {
      const r = fn(req, res);
      if (r instanceof Promise) r.catch(next);
    } catch (e) {
      next(e);
    }
  };

export function intParam(req: Request, name = "id"): number {
  const n = Number(req.params[name]);
  if (!Number.isInteger(n) || n <= 0) throw new HttpError(400, "Neplatné ID");
  return n;
}

export function optInt(v: unknown): number | null {
  if (v === undefined || v === null || v === "") return null;
  const n = Number(v);
  if (!Number.isInteger(n)) throw new HttpError(400, "Neplatné číslo");
  return n;
}

export function str(v: unknown): string | undefined {
  return typeof v === "string" && v.trim() !== "" ? v.trim() : undefined;
}
