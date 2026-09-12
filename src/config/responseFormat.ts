import type { ResponseFormatFns, ResponseFormatPaths, TableResponseFormat } from "./types";

/**
 * Only warns when NODE_ENV isn't "production" (checked defensively — `process` isn't guaranteed
 * to exist in every consumer's bundle target). A missing/malformed response for a single request
 * is expected traffic (an error envelope, a flaky backend), not a setup mistake — see
 * NoviqUIConfigProvider for the setup-mistake case, which throws instead of warning.
 */
function devWarn(...args: unknown[]): void {
  if (typeof process === "undefined" || process.env?.NODE_ENV !== "production") {
    console.warn("[noviq-ui]", ...args);
  }
}

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
