import { devWarn } from "../utils/devWarn";
import type { ResponseFormatFns, ResponseFormatPaths, TableResponseFormat } from "./types";

function resolvePath(obj: unknown, path: string): unknown {
  return path
    .split(".")
    .reduce<unknown>(
      (acc, key) => (acc && typeof acc === "object" ? (acc as Record<string, unknown>)[key] : undefined),
      obj
    );
}

export function isPathsFormat(f: TableResponseFormat): f is ResponseFormatPaths {
  return "rowsPath" in f;
}

export function isFnsFormat(f: TableResponseFormat): f is ResponseFormatFns {
  return "getRows" in f;
}

export function extractRows<T>(raw: unknown, format: TableResponseFormat<T>): T[] {
  if (isFnsFormat(format)) {
    try {
      return format.getRows(raw) ?? [];
    } catch (err) {
      devWarn("responseFormat.getRows threw", err, raw);
      return [];
    }
  }
  const value = resolvePath(raw, format.rowsPath);
  if (!Array.isArray(value)) {
    devWarn(`responseFormat.rowsPath "${format.rowsPath}" did not resolve to an array`, raw);
    return [];
  }
  return value as T[];
}

export function extractTotal(raw: unknown, format: TableResponseFormat): number {
  if (isFnsFormat(format)) {
    try {
      return format.getTotal(raw) ?? 0;
    } catch (err) {
      devWarn("responseFormat.getTotal threw", err, raw);
      return 0;
    }
  }
  const value = resolvePath(raw, format.totalPath);
  if (typeof value !== "number") {
    devWarn(`responseFormat.totalPath "${format.totalPath}" did not resolve to a number`, raw);
    return 0;
  }
  return value;
}
