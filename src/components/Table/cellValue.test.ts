import { describe, it, expect } from "vitest";
import { getCellValue, buildCellFormatOptions } from "./cellValue";
import { CELL_TYPE, NO_TEXT_PLACEHOLDER } from "./constants";
import type { TableColumn } from "./Table";

interface Row {
  name: string;
  from: string;
  to: string;
  value: number;
}

describe("getCellValue", () => {
  const row: Row = { name: "alice smith", from: "2026-01-01", to: "2026-01-31", value: 100 };

  it("returns the placeholder when the accessor value is empty", () => {
    const column: TableColumn<Row> = { id: "missing", heading: "Missing" };
    expect(getCellValue(row, column)).toBe(NO_TEXT_PLACEHOLDER);
  });

  it("returns the raw trimmed value by default", () => {
    const column: TableColumn<Row> = { id: "name", heading: "Name", accessorKey: "name" };
    expect(getCellValue(row, column)).toBe("alice smith");
  });

  it("applies capitalize", () => {
    const column: TableColumn<Row> = { id: "name", heading: "Name", accessorKey: "name", capitalize: true };
    expect(getCellValue(row, column)).toBe("Alice smith");
  });

  it("applies capitalizeEveryWord", () => {
    const column: TableColumn<Row> = {
      id: "name",
      heading: "Name",
      accessorKey: "name",
      capitalizeEveryWord: true,
    };
    expect(getCellValue(row, column)).toBe("Alice Smith");
  });

  it("applies uppercase", () => {
    const column: TableColumn<Row> = { id: "name", heading: "Name", accessorKey: "name", uppercase: true };
    expect(getCellValue(row, column)).toBe("ALICE SMITH");
  });
});

describe("buildCellFormatOptions", () => {
  const row: Row = { name: "alice", from: "2026-01-01", to: "2026-01-31", value: 100 };

  it("builds DATE options from the cell value", () => {
    const column: TableColumn<Row> = { id: "d", heading: "D", type: CELL_TYPE.DATE, isUtc: true };
    expect(buildCellFormatOptions(row, column, "2026-01-01")).toEqual({
      date: "2026-01-01",
      isUtc: true,
    });
  });

  it("builds DATE_RANGE options from the configured field names", () => {
    const column: TableColumn<Row> = {
      id: "r",
      heading: "R",
      type: CELL_TYPE.DATE_RANGE,
      fromDate: "from",
      toDate: "to",
    };
    expect(buildCellFormatOptions(row, column, NO_TEXT_PLACEHOLDER)).toEqual({
      fromDate: "2026-01-01",
      toDate: "2026-01-31",
      isUtc: undefined,
    });
  });

  it("builds CURRENCY options, defaulting value to 0 for the placeholder", () => {
    const column: TableColumn<Row> = { id: "v", heading: "V", type: CELL_TYPE.CURRENCY, currency: "USD" };
    expect(buildCellFormatOptions(row, column, NO_TEXT_PLACEHOLDER)).toEqual({
      value: 0,
      currency: "USD",
      maximumFractionDigits: undefined,
    });
  });

  it("builds STATUS options", () => {
    const column: TableColumn<Row> = { id: "s", heading: "S", type: CELL_TYPE.STATUS };
    expect(buildCellFormatOptions(row, column, "active")).toEqual({ status: "active" });
  });
});
