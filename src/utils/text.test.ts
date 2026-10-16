import { describe, it, expect } from "vitest";
import { formatText, resolveText } from "./text";

describe("formatText", () => {
  it("fills {placeholders} from the params", () => {
    expect(formatText("Showing {start} to {end} of {total} results", { start: 1, end: 10, total: 25 })).toBe(
      "Showing 1 to 10 of 25 results"
    );
  });

  it("fills a placeholder every time it appears", () => {
    expect(formatText("{n} + {n}", { n: 2 })).toBe("2 + 2");
  });

  it("leaves a placeholder with no param as written, so a missing value is visible", () => {
    expect(formatText("Page {page} of {pages}", { page: 3 })).toBe("Page 3 of {pages}");
  });

  it("returns text without placeholders untouched, with or without params", () => {
    expect(formatText("Clear all")).toBe("Clear all");
    expect(formatText("Clear all", { n: 1 })).toBe("Clear all");
  });

  it("does not treat other braces as placeholders", () => {
    expect(formatText("{ not a placeholder } {1}", {})).toBe("{ not a placeholder } {1}");
  });

  it("prints 0 and empty-string params", () => {
    expect(formatText("{a}|{b}", { a: 0, b: "" })).toBe("0|");
  });

  it("does not interpret `$` sequences in a param", () => {
    expect(formatText("Remove {label} filter", { label: "$& cost" })).toBe("Remove $& cost filter");
  });
});

describe("resolveText", () => {
  const defaults = { greeting: "Hello {name}", plain: "Plain", count: "{count} items" };

  it("uses the default when nothing overrides it", () => {
    expect(resolveText(defaults, undefined, "greeting", { name: "Ada" })).toBe("Hello Ada");
  });

  it("uses an override string, filled the same way", () => {
    expect(resolveText(defaults, { greeting: "Hola {name}" }, "greeting", { name: "Ada" })).toBe("Hola Ada");
  });

  it("calls an override function with the params — for plurals the template can't express", () => {
    const text = { count: ({ count }: Record<string, string | number>) => (Number(count) === 1 ? "1 elemento" : `${count} elementos`) };
    expect(resolveText(defaults, text, "count", { count: 1 })).toBe("1 elemento");
    expect(resolveText(defaults, text, "count", { count: 4 })).toBe("4 elementos");
  });

  it("an empty string override is honoured (hides the copy), not treated as unset", () => {
    expect(resolveText(defaults, { plain: "" }, "plain")).toBe("");
  });

  it("an override that is undefined falls back to the default", () => {
    expect(resolveText(defaults, { plain: undefined }, "plain")).toBe("Plain");
  });

  it("a function that returns a non-string falls back to the default rather than rendering it", () => {
    const text = { plain: (() => undefined) as unknown as () => string };
    expect(resolveText(defaults, text, "plain")).toBe("Plain");
  });

  it("a function that throws falls back to the default instead of breaking the render", () => {
    const text = {
      plain: () => {
        throw new Error("boom");
      },
    };
    expect(resolveText(defaults, text, "plain")).toBe("Plain");
  });
});
