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
/** A token's number, following a `calc(var(--other) + N)` to the token it is built on. */
const tokenValue = (name: string): number => {
  const raw = new RegExp(`${name}:\\s*([^;]+);`).exec(tokens)?.[1]?.trim() ?? "";
  const derived = /^calc\(var\((--nq-z-[\w-]+)\)\s*\+\s*(\d+)\)/.exec(raw);
  return derived ? tokenValue(derived[1]) + Number(derived[2]) : Number(/^\d+/.exec(raw)?.[0]);
};

describe("the z-index scale", () => {
  it("defines every layer as a custom property", () => {
    for (const name of [Z_OVERLAY_VAR, Z_POPOVER_VAR, Z_STICKY_VAR, "--nq-z-loading", "--nq-z-bar"]) {
      expect(Number.isInteger(tokenValue(name)), name).toBe(true);
    }
  });

  it("orders the layers: pinned columns < loading veil < sticky bar < overlays < popups", () => {
    const [sticky, loading, bar, overlay, popover] = [Z_STICKY_VAR, "--nq-z-loading", "--nq-z-bar", Z_OVERLAY_VAR, Z_POPOVER_VAR].map(tokenValue);
    expect(sticky).toBeLessThan(loading);
    expect(loading).toBeLessThan(bar);
    expect(bar).toBeLessThan(overlay);
    expect(overlay).toBeLessThan(popover);
  });

  it("popups follow the overlay base, so raising --nq-z-overlay alone keeps them above it", () => {
    expect(/--nq-z-popover:\s*calc\(var\(--nq-z-overlay\)/.test(tokens)).toBe(true);
  });

  it("leaves room for a deep stack of overlays below the popups", () => {
    const room = tokenValue(Z_POPOVER_VAR) - tokenValue(Z_OVERLAY_VAR);
    expect(room).toBeGreaterThanOrEqual(OVERLAY_Z_STEP * 20); // twenty overlays open at once
  });

  it("the places each layer is used", () => {
    const read = (path: string) => readFileSync(resolve(SRC, path), "utf8");
    // A FullPageSection's sticky footer must sit over a table's pinned columns scrolling beneath it
    // (real-browser finding: with `z-index: auto` the pinned cells painted over the footer).
    expect(read("components/FullPageSection/FullPageSection.css")).toMatch(/\.nq-full-page-section-footer\s*\{[^}]*z-index:\s*var\(--nq-z-bar\)/);
    expect(read("components/Table/LoadingOverlay.css")).toMatch(/z-index:\s*var\(--nq-z-loading\)/);
    expect(read("components/Table/Table.tsx")).toContain("zIndex: Z_INDEX.STICKY");
    // Floating things use the popover layer.
    for (const file of ["components/DatePicker/DatePicker.css", "components/TimePicker/TimePicker.css", "components/MonthPicker/MonthPicker.css"]) {
      expect(read(file), file).toMatch(/z-index:\s*var\(--nq-z-popover\)/);
    }
    for (const file of ["components/Dropdown/Dropdown.tsx", "components/Table/RejectAction.tsx", "components/Input/Input.tsx", "components/Table/TablePagination.tsx"]) {
      expect(read(file), file).toContain("Z_INDEX.POPOVER");
    }
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
