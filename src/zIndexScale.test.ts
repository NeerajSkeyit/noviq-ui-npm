import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { shippedSourceFiles, stripComments } from "./test/sourceFiles";
import { OVERLAY_Z_STEP, Z_OVERLAY_VAR, Z_POPOVER_VAR, Z_STICKY_VAR } from "./constants";

/**
 * Every z-index in the package comes from one scale, defined once in tokens.css, so an app that
 * has its own layers (a fixed nav at 2000, say) can move the whole set — and so no component can
 * quietly pick a number that beats, or loses to, another.
 */
const SRC = resolve(process.cwd(), "src");
const cssFiles = (dir = SRC): string[] =>
  readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    return statSync(path).isDirectory() ? cssFiles(path) : path.endsWith(".css") ? [path] : [];
  });
const loc = (file: string) => relative(process.cwd(), file);
const tokens = readFileSync(resolve(SRC, "styles/tokens.css"), "utf8");
const tokenValue = (name: string) => Number(new RegExp(`${name}:\\s*(\\d+)\\s*;`).exec(tokens)?.[1]);

describe("the z-index scale", () => {
  it("defines every layer as a custom property", () => {
    for (const name of [Z_OVERLAY_VAR, Z_POPOVER_VAR, Z_STICKY_VAR, "--nq-z-loading"]) {
      expect(Number.isInteger(tokenValue(name)), name).toBe(true);
    }
  });

  it("orders the layers: pinned columns < loading veil < overlays < popups", () => {
    const [sticky, loading, overlay, popover] = [Z_STICKY_VAR, "--nq-z-loading", Z_OVERLAY_VAR, Z_POPOVER_VAR].map(tokenValue);
    expect(sticky).toBeLessThan(loading);
    expect(loading).toBeLessThan(overlay);
    expect(overlay).toBeLessThan(popover);
  });

  it("leaves room for a deep stack of overlays below the popups", () => {
    const room = tokenValue(Z_POPOVER_VAR) - tokenValue(Z_OVERLAY_VAR);
    expect(room).toBeGreaterThanOrEqual(OVERLAY_Z_STEP * 20); // twenty overlays open at once
  });

  it("no stylesheet writes a z-index number", () => {
    const offenders: string[] = [];
    for (const file of cssFiles()) {
      const css = readFileSync(file, "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
      for (const m of css.matchAll(/z-index\s*:\s*([^;}]+)/g)) {
        if (file.endsWith("tokens.css")) continue;
        if (!/^var\(--nq-z-[\w-]+\)$/.test(m[1].trim())) offenders.push(`${loc(file)}  z-index: ${m[1].trim()}`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it("no component writes a zIndex number", () => {
    const offenders: string[] = [];
    for (const file of shippedSourceFiles()) {
      const text = stripComments(readFileSync(file, "utf8"));
      for (const m of text.matchAll(/\bzIndex\s*[:=]\s*(\{?\s*)(-?\d+)/g)) offenders.push(`${loc(file)}  zIndex ${m[2]}`);
    }
    expect(offenders).toEqual([]);
  });

  it("every --nq-z-* a stylesheet or component refers to is defined", () => {
    const used = new Set<string>();
    for (const file of [...cssFiles(), ...shippedSourceFiles()]) {
      if (file.endsWith("tokens.css")) continue;
      for (const m of readFileSync(file, "utf8").matchAll(/--nq-z-[\w-]+/g)) used.add(m[0]);
    }
    for (const name of used) expect(tokens, name).toContain(`${name}:`);
  });
});
