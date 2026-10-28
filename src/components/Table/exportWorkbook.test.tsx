import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import useTableExport from "./useTableExport";
import type { TableColumn } from "./Table";
import { CELL_TYPE, EXPORT_HEADER_FILL, EXPORT_MAX_COLUMN_WIDTH, EXPORT_MIN_COLUMN_WIDTH } from "../../constants";
import { columnWidths, readXlsxParts } from "../../test/xlsxParts";

// These tests run the real spreadsheet library and read the bytes it produces, so they see what
// Excel would open. (useTableExport.test.tsx mocks the library and only checks the calls.)
let written: { fileName: string; bytes: Uint8Array } | undefined;

vi.mock("xlsx-js-style", async (importOriginal) => {
  type Library = typeof import("xlsx-js-style");
  const module = await importOriginal<Library & { default?: Library }>();
  const real = module.default ?? module; // a CommonJS package: its API may sit under `default`
  return {
    ...real,
    writeFile: (workbook: Parameters<typeof real.write>[0], fileName: string) => {
      written = { fileName, bytes: real.write(workbook, { type: "buffer", bookType: "xlsx" }) as Uint8Array };
    },
  };
});

interface Shift {
  who: string;
  note: string;
  day: string;
  pay: number;
}

const WINDOW = "05 Mar 2024 09:00 AM - 05 Mar 2024 05:30 PM"; // 43 characters
const shifts: Shift[] = [
  { who: "Ada Lovelace", note: WINDOW, day: "2024-03-05", pay: 1234.5 },
  { who: "Grace", note: "", day: "2024-02-29", pay: 980 },
];

const columns: TableColumn<Shift>[] = [
  { id: "who", heading: "Employee", accessorKey: "who" },
  { id: "note", heading: "Window", accessorKey: "note" },
  { id: "day", heading: "Day", accessorKey: "day", type: CELL_TYPE.DATE },
  { id: "pay", heading: "Pay", accessorKey: "pay", exportValue: (row) => row.pay },
];

async function exportXlsx(cols = columns, data: Shift[] = shifts) {
  written = undefined;
  const { result } = renderHook(() =>
    useTableExport({
      usingPreFetched: true,
      preFetchedData: data,
      columns: cols,
      search: "",
      filterParams: {},
      totalItems: data.length,
    })
  );
  await act(async () => {
    await result.current.exportToExcel("shifts.xlsx");
  });
  if (!written) throw new Error("the workbook was never written");
  return readXlsxParts(written.bytes);
}

beforeEach(() => {
  written = undefined;
});

describe("the .xlsx a table exports", () => {
  it("is a workbook with one sheet named Sheet1 and a row per record under the headings", async () => {
    const parts = await exportXlsx();
    expect(parts["xl/workbook.xml"]).toContain('<sheet name="Sheet1"');

    const sheet = parts["xl/worksheets/sheet1.xml"];
    expect(sheet).toContain('<dimension ref="A1:D3"/>');
    for (const heading of ["Employee", "Window", "Day", "Pay"]) expect(sheet).toContain(`<v>${heading}</v>`);
    expect(sheet).toContain("<v>Ada Lovelace</v>");
    expect(sheet).toContain("<v>05/03/2024</v>"); // a date, written the way the table shows it (the default DD/MM/YYYY)
    expect(sheet).toContain("<v>1234.5</v>"); // exportValue's number stays a number
  });

  it("styles the heading row bold and white on the brand fill, with spreadsheet-valid ARGB colours", async () => {
    const styles = (await exportXlsx())["xl/styles.xml"];

    expect(styles).toMatch(/<font>(?=[^]*<b\/>)[^]*?<color rgb="FFFFFFFF"\/>[^]*?<\/font>/);
    expect(styles).toContain(`<fgColor rgb="FF${EXPORT_HEADER_FILL}"/>`);
    // every colour in the file is 8 hex digits — a 6-digit rgb is outside the schema
    for (const [, rgb] of styles.matchAll(/rgb="([0-9A-Fa-f]+)"/g)) expect(rgb).toHaveLength(8);
  });

  it("makes each column wide enough for its longest cell, not just its heading", async () => {
    const sheet = (await exportXlsx())["xl/worksheets/sheet1.xml"];
    const [who, note, day, pay] = columnWidths(sheet);

    expect(note).toBeGreaterThanOrEqual(WINDOW.length); // "Window" is 6 wide; its cell is 43
    expect(who).toBeGreaterThanOrEqual("Ada Lovelace".length);
    expect(day).toBeGreaterThanOrEqual("05/03/2024".length);
    expect(pay).toBeGreaterThanOrEqual(EXPORT_MIN_COLUMN_WIDTH);
  });

  it("never lets a column narrower than the minimum, or wider than the maximum", async () => {
    const long = "x".repeat(EXPORT_MAX_COLUMN_WIDTH * 3);
    const sheet = (await exportXlsx(columns, [{ ...shifts[0], who: "Al", note: long }]))["xl/worksheets/sheet1.xml"];
    const [who, note] = columnWidths(sheet);

    expect(who).toBeGreaterThanOrEqual(EXPORT_MIN_COLUMN_WIDTH);
    expect(note).toBeLessThan(EXPORT_MAX_COLUMN_WIDTH + 2);
    expect(note).toBeGreaterThanOrEqual(EXPORT_MAX_COLUMN_WIDTH);
  });

  it("keeps a heading longer than every cell fully visible", async () => {
    const heading = "Average monthly working hours";
    const sheet = (await exportXlsx([{ id: "who", heading, accessorKey: "who" }]))["xl/worksheets/sheet1.xml"];
    expect(columnWidths(sheet)[0]).toBeGreaterThanOrEqual(heading.length);
  });

  it("measures numbers from exportValue by their text", async () => {
    const big = [{ ...shifts[0], pay: 123456789012.5 }];
    const sheet = (await exportXlsx(columns, big))["xl/worksheets/sheet1.xml"];
    expect(columnWidths(sheet)[3]).toBeGreaterThanOrEqual(String(123456789012.5).length);
  });

  it("exports an empty table as just the heading row, still sized by the headings", async () => {
    const sheet = (await exportXlsx(columns, []))["xl/worksheets/sheet1.xml"];
    expect(sheet).toContain('<dimension ref="A1:D1"/>');
    expect(columnWidths(sheet)).toHaveLength(4);
  });
});

describe("the .csv a table exports", () => {
  let blob: Blob | undefined;
  const original = { create: URL.createObjectURL, revoke: URL.revokeObjectURL };

  beforeEach(() => {
    blob = undefined;
    URL.createObjectURL = vi.fn((b: Blob | MediaSource) => {
      blob = b as Blob;
      return "blob:csv";
    });
    URL.revokeObjectURL = vi.fn();
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
  });

  afterEach(() => {
    URL.createObjectURL = original.create;
    URL.revokeObjectURL = original.revoke;
    vi.restoreAllMocks();
  });

  async function exportCsv(data: Shift[]) {
    const { result } = renderHook(() =>
      useTableExport({
        usingPreFetched: true,
        preFetchedData: data,
        columns: [
          { id: "who", heading: "Employee", accessorKey: "who" },
          { id: "note", heading: "Note", accessorKey: "note" },
        ],
        search: "",
        filterParams: {},
        totalItems: data.length,
      })
    );
    await act(async () => {
      await result.current.exportToCSV("shifts.csv");
    });
    if (!blob) throw new Error("no file was offered");
    // read the raw bytes: a text reader would swallow the byte-order mark this test is about
    const bytes = await new Promise<Uint8Array>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(new Uint8Array(reader.result as ArrayBuffer));
      reader.onerror = () => reject(reader.error);
      reader.readAsArrayBuffer(blob!);
    });
    return { bytes, text: new TextDecoder("utf-8", { ignoreBOM: true }).decode(bytes) };
  }

  it("opens in Excel as UTF-8 and quotes the commas, quotes and line breaks inside a cell", async () => {
    const { bytes, text } = await exportCsv([
      { ...shifts[0], who: "Lovelace, Ada", note: 'said "hi"' },
      { ...shifts[1], who: "Grace", note: "line one\nline two" },
    ]);

    expect([...bytes.slice(0, 3)]).toEqual([0xef, 0xbb, 0xbf]); // the UTF-8 byte-order mark
    expect(text).toContain("Employee,Note");
    expect(text).toContain('"Lovelace, Ada","said ""hi"""');
    expect(text).toContain('Grace,"line one\nline two"');
  });
});
