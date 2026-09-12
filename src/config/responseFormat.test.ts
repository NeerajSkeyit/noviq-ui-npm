import { describe, it, expect, vi } from "vitest";
import { extractRows, extractTotal } from "./responseFormat";
import type { ResponseFormatPaths, ResponseFormatFns } from "./types";

describe("extractRows", () => {
  it("resolves a nested rowsPath", () => {
    const format: ResponseFormatPaths = { rowsPath: "result.result", totalPath: "result.totalCount" };
    const raw = { result: { result: [{ id: 1 }], totalCount: 1 } };
    expect(extractRows(raw, format)).toEqual([{ id: 1 }]);
  });

  it("resolves a top-level rowsPath", () => {
    const format: ResponseFormatPaths = { rowsPath: "items", totalPath: "total" };
    const raw = { items: [{ id: 1 }, { id: 2 }], total: 2 };
    expect(extractRows(raw, format)).toEqual([{ id: 1 }, { id: 2 }]);
  });

  it("returns [] and warns when rowsPath does not resolve to an array", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const format: ResponseFormatPaths = { rowsPath: "missing.path", totalPath: "total" };
    expect(extractRows({ total: 0 }, format)).toEqual([]);
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it("uses getRows when a function-format is given", () => {
    const format: ResponseFormatFns = {
      getRows: (raw: any) => raw.data.items,
      getTotal: (raw: any) => raw.data.meta.total,
    };
    const raw = { data: { items: [{ id: 9 }], meta: { total: 1 } } };
    expect(extractRows(raw, format)).toEqual([{ id: 9 }]);
  });

  it("returns [] and warns when getRows throws", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const format: ResponseFormatFns = {
      getRows: () => {
        throw new Error("boom");
      },
      getTotal: () => 0,
    };
    expect(extractRows({}, format)).toEqual([]);
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });
});

describe("extractTotal", () => {
  it("resolves a nested totalPath", () => {
    const format: ResponseFormatPaths = { rowsPath: "result", totalPath: "meta.total" };
    expect(extractTotal({ meta: { total: 42 } }, format)).toBe(42);
  });

  it("returns 0 when totalPath does not resolve to a number", () => {
    const format: ResponseFormatPaths = { rowsPath: "result", totalPath: "meta.total" };
    expect(extractTotal({ meta: {} }, format)).toBe(0);
  });

  it("uses getTotal when a function-format is given", () => {
    const format: ResponseFormatFns = { getRows: () => [], getTotal: (raw: any) => raw.count };
    expect(extractTotal({ count: 7 }, format)).toBe(7);
  });

  it("returns 0 and warns when getTotal throws", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const format: ResponseFormatFns = {
      getRows: () => [],
      getTotal: () => {
        throw new Error("boom");
      },
    };
    expect(extractTotal({}, format)).toBe(0);
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });
});
