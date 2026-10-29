import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { STATUS_CLASS } from "./constants";
import { stripComments } from "./test/sourceFiles";

// A status pill takes every colour from a custom property, so an app can re-theme it from its own CSS.
// tokens.css is the one place the default values live.

const SRC = resolve(process.cwd(), "src");
const tokens = readFileSync(resolve(SRC, "styles/tokens.css"), "utf8");
const cellCss = stripComments(readFileSync(resolve(SRC, "components/Table/TableCell.css"), "utf8"));
const readme = readFileSync(resolve(process.cwd(), "README.md"), "utf8");
const badgeCss = stripComments(readFileSync(resolve(SRC, "components/Badge/Badge.css"), "utf8"));

const norm = (value: string) => value.replace(/\s+/g, " ").trim();
const declared = (name: string) => norm(new RegExp(`${name}:\\s*([^;]+);`).exec(tokens)?.[1] ?? "");

/** The tones, and the three colours of each, with the values the pill has always had. */
const DEFAULTS: Record<string, { bg: string; text: string; border: string }> = {
  success: { bg: "rgba(33, 196, 93, 0.1)", text: "#21c45d", border: "rgba(33, 196, 93, 0.2)" },
  danger: { bg: "rgba(255, 0, 0, 0.08)", text: "var(--nq-danger)", border: "rgba(255, 0, 0, 0.2)" },
  warning: { bg: "rgba(245, 159, 10, 0.1)", text: "#f59f0a", border: "rgba(245, 159, 10, 0.2)" },
  info: { bg: "rgba(2, 132, 199, 0.15)", text: "#37a7df", border: "#37a7df" },
  default: { bg: "var(--nq-secondary-background)", text: "var(--nq-muted)", border: "var(--nq-border-color)" },
};
const PARTS = ["bg", "text", "border"] as const;
const TOKENS = Object.keys(DEFAULTS).flatMap((tone) => PARTS.map((part) => `--nq-status-${tone}-${part}`));

describe("status pill colour tokens", () => {
  it("there is one tone class per tone, and a token set per tone", () => {
    expect(Object.values(STATUS_CLASS).sort()).toEqual(Object.keys(DEFAULTS).map((t) => `nq-status-${t}`).sort());
    expect(TOKENS).toHaveLength(15);
  });

  it.each(TOKENS)("%s is declared in tokens.css", (name) => {
    expect(tokens).toContain(`${name}:`);
  });

  it.each(Object.entries(DEFAULTS))("%s keeps the colours it has always had", (tone, colours) => {
    for (const part of PARTS) expect(declared(`--nq-status-${tone}-${part}`)).toBe(colours[part]);
  });

  it.each(Object.keys(DEFAULTS))("the %s class takes its three colours from that tone's tokens", (tone) => {
    const rule = new RegExp(`\\.nq-status-${tone}\\s*\\{([^}]*)\\}`).exec(cellCss)?.[1] ?? "";
    expect(norm(rule)).toBe(
      norm(`background-color: var(--nq-status-${tone}-bg); color: var(--nq-status-${tone}-text); border-color: var(--nq-status-${tone}-border);`)
    );
  });

  it("TableCell.css has no colour of its own: no hex, rgb(), hsl() or colour name", () => {
    expect(cellCss).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    expect(cellCss).not.toMatch(/\b(?:rgb|rgba|hsl|hsla|hwb|lab|lch|oklab|oklch|color|color-mix)\s*\(/i);
    expect(cellCss).not.toMatch(/\b(?:red|green|blue|white|black|gr[ae]y|orange|yellow|purple|pink|teal|navy|lime|cyan)\b/i);
  });

  it("TableCell.css has no !important: a class of the app's own must be able to win", () => {
    expect(cellCss).not.toContain("!important");
  });

  it("the pill's base rule (.nq-badge) sets no colour that a class of yours would only tie with", () => {
    // A user's class and `.nq-badge` have the same specificity, so whichever stylesheet loads last would win.
    // `border: 1px solid transparent` is such a colour — found by flipping the stylesheet order in a real browser.
    const rule = norm(/(?:^|\})\s*\.nq-badge\s*\{([^}]*)\}/.exec(badgeCss)?.[1] ?? "");
    expect(rule).not.toMatch(/(?:^|[;\s])border\s*:/); // the shorthand carries a colour
    expect(rule).not.toMatch(/(?:^|[;\s])(?:border-color|background|background-color|color|border-[a-z]+-color)\s*:/);
    expect(rule).toMatch(/border-width:\s*1px/);
    expect(rule).toMatch(/border-style:\s*solid/);
  });

  it("a Badge's default border colour is transparent at zero specificity, so any class of yours wins", () => {
    expect(norm(/:where\(\.nq-badge\)\s*\{([^}]*)\}/.exec(badgeCss)?.[1] ?? "")).toBe("border-color: transparent;");
  });

  it.each(TOKENS)("the README documents %s", (name) => {
    expect(readme).toContain(name);
  });
});
