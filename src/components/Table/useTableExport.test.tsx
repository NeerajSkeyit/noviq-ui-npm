import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { renderHook, act, waitFor } from "@testing-library/react";
import useTableExport from "./useTableExport";
import { CELL_TYPE } from "./constants";
import type { TableColumn } from "./Table";
import { DEFAULT_REQUEST_PARAMS } from "../../config/types";
import type { ResponseFormatPaths, TableRequestParamNames } from "../../config/types";
import { NoviqUIConfigProvider } from "../../config/NoviqUIConfigProvider";

const FLAT_RESPONSE_FORMAT: ResponseFormatPaths = { rowsPath: "result", totalPath: "totalCount" };

const NESTED_RESPONSE_FORMAT: ResponseFormatPaths = {
  rowsPath: "data.items",
  totalPath: "data.meta.total",
};

const RENAMED_REQUEST_PARAMS: Required<TableRequestParamNames> = {
  search: "q",
  page: "pageNumber",
  pageSize: "perPage",
};

const aoaToSheet = vi.fn((aoa: unknown[][]) => ({ __aoa: aoa }) as any);
const encodeCell = vi.fn(({ r, c }: { r: number; c: number }) => `cell-${r}-${c}`);
const bookNew = vi.fn(() => ({}) as any);
const bookAppendSheet = vi.fn();
const sheetToCsv = vi.fn(() => "csv-content");
const writeFile = vi.fn();

vi.mock("xlsx-js-style", () => ({
  utils: {
    aoa_to_sheet: (...args: unknown[]) => aoaToSheet(...(args as [unknown[][]])),
    encode_cell: (...args: unknown[]) => encodeCell(...(args as [{ r: number; c: number }])),
    book_new: (...args: unknown[]) => bookNew(...args),
    book_append_sheet: (...args: unknown[]) => bookAppendSheet(...args),
    sheet_to_csv: (...args: unknown[]) => sheetToCsv(...args),
  },
  writeFile: (...args: unknown[]) => writeFile(...args),
}));

interface Row {
  id: number;
  name: string;
  department: string;
}

const rows: Row[] = [
  { id: 1, name: "Alice", department: "Engineering" },
  { id: 2, name: "Bob", department: "Sales" },
];

const columns: TableColumn<Row>[] = [
  { id: "name", heading: "Name", accessorKey: "name" },
  { id: "department", heading: "Department", accessorKey: "department" },
];

beforeEach(() => {
  vi.clearAllMocks();
});

describe("useTableExport", () => {
  it("fetches with rows_per_page equal to totalItems and merges search/filter/apiParams", async () => {
    const apiFunction = vi.fn().mockResolvedValue({ result: rows, totalCount: rows.length });
    const { result } = renderHook(() =>
      useTableExport({
        apiFunction,
        responseFormat: FLAT_RESPONSE_FORMAT,
        requestParams: DEFAULT_REQUEST_PARAMS,
        usingPreFetched: false,
        preFetchedData: [],
        columns,
        search: "ali",
        filterParams: { department: "eng" },
        apiParams: { tenant: "acme" },
        totalItems: 42,
      })
    );

    await act(async () => {
      await result.current.exportToExcel();
    });

    expect(apiFunction).toHaveBeenCalledWith({
      tenant: "acme",
      department: "eng",
      search: "ali",
      page_no: 1,
      rows_per_page: 42,
    });
  });

  it("falls back to a large rows_per_page when totalItems is 0", async () => {
    const apiFunction = vi.fn().mockResolvedValue({ result: rows, totalCount: 0 });
    const { result } = renderHook(() =>
      useTableExport({
        apiFunction,
        responseFormat: FLAT_RESPONSE_FORMAT,
        requestParams: DEFAULT_REQUEST_PARAMS,
        usingPreFetched: false,
        preFetchedData: [],
        columns,
        search: "",
        filterParams: {},
        totalItems: 0,
      })
    );

    await act(async () => {
      await result.current.exportToExcel();
    });

    expect(apiFunction.mock.calls[0][0].rows_per_page).toBeGreaterThan(1000);
  });

  it("uses non-default requestParams keys and a nested responseFormat to build the export fetch", async () => {
    const apiFunction = vi.fn().mockResolvedValue({ data: { items: rows, meta: { total: rows.length } } });
    const { result } = renderHook(() =>
      useTableExport({
        apiFunction,
        responseFormat: NESTED_RESPONSE_FORMAT,
        requestParams: RENAMED_REQUEST_PARAMS,
        usingPreFetched: false,
        preFetchedData: [],
        columns,
        search: "ali",
        filterParams: { department: "eng" },
        apiParams: { tenant: "acme" },
        totalItems: 42,
      })
    );

    await act(async () => {
      await result.current.exportToExcel();
    });

    // Would fail if fetchRows fell back to hardcoded search/page_no/rows_per_page keys.
    expect(apiFunction).toHaveBeenCalledWith({
      tenant: "acme",
      department: "eng",
      q: "ali",
      pageNumber: 1,
      perPage: 42,
    });

    // Would fail if fetchRows fell back to hardcoded `.result` extraction (raw has no
    // top-level `result` key here, so that would yield an empty rows array).
    expect(aoaToSheet).toHaveBeenCalledWith([
      ["Name", "Department"],
      ["Alice", "Engineering"],
      ["Bob", "Sales"],
    ]);
  });

  it("skips the fetch entirely and exports the given array when usingPreFetched", async () => {
    const apiFunction = vi.fn();
    const { result } = renderHook(() =>
      useTableExport({
        apiFunction,
        usingPreFetched: true,
        preFetchedData: rows,
        columns,
        search: "",
        filterParams: {},
        totalItems: 0,
      })
    );

    await act(async () => {
      await result.current.exportToExcel();
    });

    expect(apiFunction).not.toHaveBeenCalled();
    expect(aoaToSheet).toHaveBeenCalledWith([
      ["Name", "Department"],
      ["Alice", "Engineering"],
      ["Bob", "Sales"],
    ]);
  });

  it("excludes columns with export: false", async () => {
    const restrictedColumns: TableColumn<Row>[] = [...columns, { id: "id", heading: "ID", export: false }];
    const { result } = renderHook(() =>
      useTableExport({
        usingPreFetched: true,
        preFetchedData: rows,
        columns: restrictedColumns,
        search: "",
        filterParams: {},
        totalItems: 0,
      })
    );

    await act(async () => {
      await result.current.exportToExcel();
    });

    expect(aoaToSheet).toHaveBeenCalledWith([
      ["Name", "Department"],
      ["Alice", "Engineering"],
      ["Bob", "Sales"],
    ]);
  });

  it("uses exportValue to override the default cell value", async () => {
    const columnsWithOverride: TableColumn<Row>[] = [
      { id: "name", heading: "Name", exportValue: (row) => `${row.name} (#${row.id})` },
    ];
    const { result } = renderHook(() =>
      useTableExport({
        usingPreFetched: true,
        preFetchedData: rows,
        columns: columnsWithOverride,
        search: "",
        filterParams: {},
        totalItems: 0,
      })
    );

    await act(async () => {
      await result.current.exportToExcel();
    });

    expect(aoaToSheet).toHaveBeenCalledWith([["Name"], ["Alice (#1)"], ["Bob (#2)"]]);
  });

  it("formats a typed cell value the same way as the table renders it", async () => {
    const typedColumns: TableColumn<Row>[] = [
      { id: "department", heading: "Department", accessorKey: "department", type: CELL_TYPE.STATUS },
    ];
    const { result } = renderHook(() =>
      useTableExport({
        usingPreFetched: true,
        preFetchedData: [{ id: 1, name: "Alice", department: "in_progress" }],
        columns: typedColumns,
        search: "",
        filterParams: {},
        totalItems: 0,
      })
    );

    await act(async () => {
      await result.current.exportToExcel();
    });

    expect(aoaToSheet).toHaveBeenCalledWith([["Department"], ["in progress"]]);
  });

  it("calls XLSX.writeFile for exportToExcel and sheet_to_csv for exportToCSV", async () => {
    const { result } = renderHook(() =>
      useTableExport({
        usingPreFetched: true,
        preFetchedData: rows,
        columns,
        search: "",
        filterParams: {},
        totalItems: 0,
      })
    );

    await act(async () => {
      await result.current.exportToExcel("out.xlsx");
    });
    expect(writeFile).toHaveBeenCalledWith(expect.anything(), "out.xlsx");

    await act(async () => {
      await result.current.exportToCSV("out.csv");
    });
    expect(sheetToCsv).toHaveBeenCalled();
  });

  it("sets exporting true during the call and false after it resolves", async () => {
    let resolveFetch: (value: any) => void = () => {};
    const apiFunction = vi.fn(
      () =>
        new Promise((resolve) => {
          resolveFetch = resolve;
        })
    );
    const { result } = renderHook(() =>
      useTableExport({
        apiFunction,
        responseFormat: FLAT_RESPONSE_FORMAT,
        requestParams: DEFAULT_REQUEST_PARAMS,
        usingPreFetched: false,
        preFetchedData: [],
        columns,
        search: "",
        filterParams: {},
        totalItems: 10,
      })
    );

    expect(result.current.exporting).toBe(false);

    let exportPromise!: Promise<void>;
    act(() => {
      exportPromise = result.current.exportToExcel();
    });

    await waitFor(() => expect(result.current.exporting).toBe(true));

    resolveFetch({ result: rows, totalCount: 2 });
    await act(async () => {
      await exportPromise;
    });

    expect(result.current.exporting).toBe(false);
  });
});

describe("useTableExport notifications", () => {
  const baseArgs = {
    responseFormat: FLAT_RESPONSE_FORMAT,
    requestParams: DEFAULT_REQUEST_PARAMS,
    usingPreFetched: false,
    preFetchedData: [] as Row[],
    columns,
    search: "",
    filterParams: {},
    totalItems: 2,
  };
  const okApi = () => vi.fn().mockResolvedValue({ result: rows, totalCount: rows.length });
  const failingApi = () => vi.fn().mockRejectedValue(new Error("boom"));

  it("reports a successful Excel export through the notify argument", async () => {
    const notify = vi.fn();
    const { result } = renderHook(() => useTableExport({ ...baseArgs, apiFunction: okApi(), notify }));
    await act(async () => {
      await result.current.exportToExcel();
    });
    expect(notify).toHaveBeenCalledTimes(1);
    expect(notify).toHaveBeenCalledWith("Export complete", "success");
  });

  it("reports a successful CSV export through the notify argument", async () => {
    const notify = vi.fn();
    const { result } = renderHook(() => useTableExport({ ...baseArgs, apiFunction: okApi(), notify }));
    await act(async () => {
      await result.current.exportToCSV();
    });
    expect(notify).toHaveBeenCalledTimes(1);
    expect(notify).toHaveBeenCalledWith("Export complete", "success");
  });

  it("reports a failure as an error, logs it, and clears the exporting flag", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    const notify = vi.fn();
    const { result } = renderHook(() =>
      useTableExport({ ...baseArgs, apiFunction: failingApi(), notify })
    );
    await act(async () => {
      await result.current.exportToExcel();
    });
    expect(notify).toHaveBeenCalledTimes(1);
    expect(notify).toHaveBeenCalledWith("Export failed", "error");
    expect(consoleError).toHaveBeenCalled();
    expect(result.current.exporting).toBe(false);
    consoleError.mockRestore();
  });

  it("does not announce a 'loading' state — only the outcome", async () => {
    const notify = vi.fn();
    const { result } = renderHook(() => useTableExport({ ...baseArgs, apiFunction: okApi(), notify }));
    await act(async () => {
      await result.current.exportToExcel();
    });
    const kinds = notify.mock.calls.map((c) => c[1]);
    expect(kinds).toEqual(["success"]);
  });

  it("falls back to NoviqUIConfigProvider's config.notify", async () => {
    const notify = vi.fn();
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <NoviqUIConfigProvider config={{ notify }}>{children}</NoviqUIConfigProvider>
    );
    const { result } = renderHook(() => useTableExport({ ...baseArgs, apiFunction: okApi() }), {
      wrapper,
    });
    await act(async () => {
      await result.current.exportToExcel();
    });
    expect(notify).toHaveBeenCalledWith("Export complete", "success");
  });

  it("prefers the notify argument over the provider's", async () => {
    const providerNotify = vi.fn();
    const argNotify = vi.fn();
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <NoviqUIConfigProvider config={{ notify: providerNotify }}>{children}</NoviqUIConfigProvider>
    );
    const { result } = renderHook(
      () => useTableExport({ ...baseArgs, apiFunction: okApi(), notify: argNotify }),
      { wrapper }
    );
    await act(async () => {
      await result.current.exportToExcel();
    });
    expect(argNotify).toHaveBeenCalledTimes(1);
    expect(providerNotify).not.toHaveBeenCalled();
  });

  it("stays silent, without throwing, when no notify is configured anywhere", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    const { result } = renderHook(() => useTableExport({ ...baseArgs, apiFunction: failingApi() }));
    await expect(
      act(async () => {
        await result.current.exportToExcel();
      })
    ).resolves.not.toThrow();
    // The failure is still visible to a developer even though nothing was announced to the user.
    expect(consoleError).toHaveBeenCalled();
    consoleError.mockRestore();
  });
});
