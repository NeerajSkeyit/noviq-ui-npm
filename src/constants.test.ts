import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { relative, resolve } from "node:path";
import * as C from "./constants";
import * as pkg from "./index";
import { shippedSourceFiles, stripComments } from "./test/sourceFiles";

const SRC = resolve(process.cwd(), "src");
const isConstantsFile = (file: string) => file === resolve(SRC, "constants.ts");

/** `{ A: "a", B: "b" }` → `["a", "b"]` */
const valuesOf = (group: Record<string, string | number>) => Object.values(group);

describe("constants", () => {
  // The public groups are exactly what a consumer reaches for instead of a stringly-typed literal.
  const PUBLIC_GROUPS = [
    "INPUT_TYPE",
    "FORM_FIELD_TYPE",
    "COL_SPAN",
    "BUTTON_VARIANT",
    "BUTTON_SIZE",
    "BUTTON_TYPE",
    "BADGE_VARIANT",
    "DRAWER_SIDE",
    "DRAWER_SIZE",
    "MODAL_SIZE",
    "HOUR_CYCLE",
    "TIME_PERIOD",
    "CELL_TYPE",
    "FILTER_TYPE",
    "SORT_DIRECTION",
    "STICKY_POSITION",
    "COLUMN_ALIGN",
    "TABLE_COLUMN_ID",
    "ACTION_ID",
    "ROW_ACTION_TYPE",
    "ROW_ACTION_VARIANT",
    "BULK_ACTION_VARIANT",
    "NOTIFY_KIND",
  ] as const;

  it.each(PUBLIC_GROUPS)("exports %s from the package root, identical to src/constants", (name) => {
    expect((pkg as Record<string, unknown>)[name]).toBe((C as Record<string, unknown>)[name]);
  });

  it.each(PUBLIC_GROUPS)("%s has no duplicate values", (name) => {
    const values = valuesOf((C as unknown as Record<string, Record<string, string | number>>)[name]);
    expect(new Set(values).size).toBe(values.length);
  });

  it("keeps the exact strings the props have always accepted", () => {
    // Plain-literal callers (`variant="outline"`) must keep working: these are the wire values.
    expect(valuesOf(C.BUTTON_VARIANT)).toEqual(["default", "outline", "destructive", "secondary", "ghost", "link"]);
    expect(valuesOf(C.BUTTON_SIZE)).toEqual(["sm", "md", "lg", "icon"]);
    expect(valuesOf(C.DRAWER_SIDE)).toEqual(["right", "left", "top", "bottom"]);
    expect(valuesOf(C.DRAWER_SIZE)).toEqual(["sm", "md", "lg"]);
    expect(valuesOf(C.MODAL_SIZE)).toEqual(["sm", "md", "lg", "xl", "auto"]);
    expect(valuesOf(C.BADGE_VARIANT)).toEqual(["default", "secondary", "destructive", "outline"]);
    expect(valuesOf(C.COL_SPAN)).toEqual([1, 2, 3]);
    expect(valuesOf(C.HOUR_CYCLE)).toEqual([12, 24]);
    expect(valuesOf(C.SORT_DIRECTION)).toEqual(["asc", "desc"]);
    expect(valuesOf(C.STICKY_POSITION)).toEqual(["left", "right"]);
    expect(valuesOf(C.NOTIFY_KIND)).toEqual(["success", "error"]);
    expect(C.DEFAULT_REQUEST_PARAMS).toEqual({ search: "search", page: "page_no", pageSize: "rows_per_page" });
  });
});

describe("no bare literals for values that have a constant", () => {
  const files = shippedSourceFiles().filter((f) => !isConstantsFile(f));
  const quote = `["']`;
  const alt = (values: readonly (string | number)[]) => values.map(String).join("|");

  /** Prop/field names whose string values must come from a constant, mapped to those values. */
  const BY_NAME: Record<string, readonly string[]> = {
    variant: [
      ...valuesOf(C.BUTTON_VARIANT),
      ...valuesOf(C.BADGE_VARIANT),
      ...valuesOf(C.ROW_ACTION_VARIANT),
      ...valuesOf(C.BULK_ACTION_VARIANT),
    ],
    size: [...valuesOf(C.BUTTON_SIZE), ...valuesOf(C.DRAWER_SIZE), ...valuesOf(C.MODAL_SIZE)],
    side: valuesOf(C.DRAWER_SIDE),
    direction: valuesOf(C.SORT_DIRECTION),
    sticky: valuesOf(C.STICKY_POSITION),
    align: valuesOf(C.COLUMN_ALIGN),
  };

  /** Every violation is reported as `path:line  <matched text>` so a failure points at the line. */
  function findings(pattern: RegExp): string[] {
    const out: string[] = [];
    for (const file of files) {
      const text = stripComments(readFileSync(file, "utf8"));
      for (const match of text.matchAll(pattern)) {
        const line = text.slice(0, match.index).split("\n").length;
        out.push(`${relative(process.cwd(), file)}:${line}  ${match[0].trim()}`);
      }
    }
    return out;
  }

  it.each(Object.entries(BY_NAME))("`%s` is never assigned or compared to a bare literal", (name, values) => {
    const pattern = new RegExp(`\\b${name}\\b\\s*(?:=|===|!==|:)\\s*\\{?\\s*${quote}(?:${alt(values)})${quote}`, "g");
    expect(findings(pattern)).toEqual([]);
  });

  it("a button's `type` is never a bare literal", () => {
    const pattern = new RegExp(`\\btype\\s*=\\s*\\{?\\s*${quote}(?:${alt(valuesOf(C.BUTTON_TYPE))})${quote}`, "g");
    expect(findings(pattern)).toEqual([]);
  });

  it("a row action's / form field's `.type` is never compared to a bare literal", () => {
    const values = [...valuesOf(C.ROW_ACTION_TYPE), ...valuesOf(C.FORM_FIELD_TYPE)];
    const pattern = new RegExp(`\\.type\\s*(?:===|!==)\\s*${quote}(?:${alt(values)})${quote}`, "g");
    expect(findings(pattern)).toEqual([]);
  });

  it("`hourCycle` / `colSpan` are never given a bare number", () => {
    const pattern = /\b(?:hourCycle|colSpan)\b\s*(?:=|===|!==|:)\s*\{?\s*\d+/g;
    expect(findings(pattern)).toEqual([]);
  });

  it("keyboard keys are always KEY.*, never `e.key === \"Enter\"` or `case \"Escape\"`", () => {
    const keys = valuesOf(C.KEY).map((k) => (k === " " ? " " : k));
    const keyAlt = keys.map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|");
    const compared = new RegExp(`\\.key\\s*(?:===|!==)\\s*${quote}[^"']*${quote}`, "g");
    const inCase = new RegExp(`\\bcase\\s+${quote}(?:${keyAlt})${quote}`, "g");
    expect([...findings(compared), ...findings(inCase)]).toEqual([]);
  });

  it("hotkey specs passed to useHotkeys are always HOTKEY.*", () => {
    expect(findings(new RegExp(`useHotkeys\\(\\s*${quote}`, "g"))).toEqual([]);
  });

  it("no hand-written string-literal unions — derive the type from a constant instead", () => {
    const union = new RegExp(`${quote}[A-Za-z0-9_-]+${quote}\\s*\\|\\s*${quote}[A-Za-z0-9_-]+${quote}`);
    const offenders: string[] = [];
    for (const file of files) {
      stripComments(readFileSync(file, "utf8"))
        .split("\n")
        .forEach((line, i) => {
          // `Omit<InputProps, "value" | "onChange">` names property keys, which is not a vocabulary.
          if (union.test(line) && !/\b(Omit|Pick)\b/.test(line)) {
            offenders.push(`${relative(process.cwd(), file)}:${i + 1}  ${line.trim()}`);
          }
        });
    }
    expect(offenders).toEqual([]);
  });

  it("distinctive values (storage key, export strings, default query params, date formats) live only in constants", () => {
    const distinctive = [
      C.COLUMN_SETTINGS_STORAGE_PREFIX,
      C.EXPORT_MESSAGE.SUCCESS,
      C.EXPORT_MESSAGE.FAILURE,
      C.CSV_MIME_TYPE,
      C.EXPORT_HEADER_FILL,
      C.EXPORT_SHEET_NAME,
      C.DEFAULT_REQUEST_PARAMS.page,
      C.DEFAULT_REQUEST_PARAMS.pageSize,
      C.DATE_TIME_FORMAT,
      C.DATE_FORMAT,
      C.TIME_FORMAT,
      C.DEFAULT_CURRENCY,
      C.TIME_PERIOD.AM,
      C.TIME_PERIOD.PM,
    ];
    const offenders: string[] = [];
    for (const file of files) {
      const text = stripComments(readFileSync(file, "utf8"));
      for (const value of distinctive) {
        if (text.includes(`"${value}"`) || text.includes(`'${value}'`)) {
          offenders.push(`${relative(process.cwd(), file)}  "${value}"`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });
});
