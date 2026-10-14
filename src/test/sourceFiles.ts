import { readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

/**
 * Absolute paths of every file that ships in the package's runtime: `.ts`/`.tsx` under `src/`,
 * minus tests and test helpers. Used by the guard tests that scan source text.
 */
export function shippedSourceFiles(): string[] {
  const root = resolve(process.cwd(), "src");
  const walk = (dir: string): string[] =>
    readdirSync(dir).flatMap((entry) => {
      const path = join(dir, entry);
      if (statSync(path).isDirectory()) {
        return entry === "test" ? [] : walk(path);
      }
      const isSource = /\.(ts|tsx)$/.test(entry) && !/\.test\.(ts|tsx)$/.test(entry) && !/\.d\.ts$/.test(entry);
      return isSource ? [path] : [];
    });
  return walk(root);
}

/** Source text with line and block comments removed, so prose in doc comments cannot trip a scan. */
export function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'`])\/\/[^\n]*/g, "$1");
}
