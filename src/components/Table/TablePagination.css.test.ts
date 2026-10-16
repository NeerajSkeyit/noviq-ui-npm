import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// jsdom does no layout, so the wrapping itself is checked in a real browser (see progress.md). This
// pins the declarations that make it possible, so a refactor can't silently drop them again — the
// table wrapper clips overflow, which is what hid the last-page button on phones.
const css = readFileSync(resolve(process.cwd(), "src/components/Table/TablePagination.css"), "utf8");

function rule(selector: string, source = css): string {
  const match = new RegExp(`${selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*\\{([^}]*)\\}`).exec(source);
  if (!match) throw new Error(`no rule for ${selector}`);
  return match[1];
}

describe("TablePagination.css", () => {
  it("lets the right-hand controls wrap instead of overflowing the clipped table wrapper", () => {
    expect(rule(".nq-table-pagination-right")).toMatch(/flex-wrap:\s*wrap/);
    expect(rule(".nq-table-pagination-right")).toMatch(/min-width:\s*0/);
  });

  it("lets the page label + buttons group wrap too (320px phones)", () => {
    expect(rule(".nq-table-pagination-controls")).toMatch(/flex-wrap:\s*wrap/);
  });

  it("gives the page label its own row on the narrowest phones so the buttons stay together", () => {
    const narrowest = css.slice(css.indexOf("@media (max-width: 400px)"));
    expect(narrowest).toMatch(/\.nq-table-pagination-page-info\s*\{[^}]*flex-basis:\s*100%/);
  });

  it("keeps the outer bar wrapping too", () => {
    expect(rule(".nq-table-pagination")).toMatch(/flex-wrap:\s*wrap/);
  });

  it("stacks the bar on narrow screens", () => {
    const narrow = css.slice(css.indexOf("@media (max-width: 640px)"));
    expect(narrow).toContain("flex-direction: column");
  });
});
