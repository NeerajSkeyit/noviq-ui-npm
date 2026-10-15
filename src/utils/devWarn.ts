/**
 * `console.warn`/`console.error` for developer mistakes, silent in production builds. NODE_ENV is
 * read defensively because `process` isn't guaranteed to exist in every consumer's bundle target.
 */
function isProduction(): boolean {
  return typeof process !== "undefined" && process.env?.NODE_ENV === "production";
}

export function devWarn(...args: unknown[]): void {
  if (!isProduction()) console.warn("[noviq-ui]", ...args);
}

export function devError(...args: unknown[]): void {
  if (!isProduction()) console.error("[noviq-ui]", ...args);
}
