import { describe, it, expect } from "vitest";
import { buildActiveFilter, type FilterConfig } from "./buildActiveFilter";
import { FILTER_TYPE } from "../../constants";

describe("buildActiveFilter", () => {
  it("returns null for an empty search value", () => {
    const config: FilterConfig = { id: "q", label: "Search", type: FILTER_TYPE.SEARCH };
    expect(buildActiveFilter(config, "")).toBeNull();
    expect(buildActiveFilter(config, "   ")).toBeNull();
    expect(buildActiveFilter(config, undefined)).toBeNull();
  });

  it("builds a search filter", () => {
    const config: FilterConfig = { id: "q", label: "Search", type: FILTER_TYPE.SEARCH };
    const result = buildActiveFilter(config, "engineering");
    expect(result).toEqual({
      id: "q",
      label: "Search",
      mandatory: undefined,
      displayValue: "engineering",
      apiPayload: { q: "engineering" },
      value: "engineering",
    });
  });

  it("builds a date filter with a formatted displayValue", () => {
    const config: FilterConfig = { id: "joinDate", label: "Joined", type: FILTER_TYPE.DATE };
    const result = buildActiveFilter(config, "2026-01-15");
    expect(result?.displayValue).toBe("15/01/2026");
    expect(result?.apiPayload).toEqual({ joinDate: "2026-01-15" });
  });

  it("returns null for an empty date", () => {
    const config: FilterConfig = { id: "joinDate", label: "Joined", type: FILTER_TYPE.DATE };
    expect(buildActiveFilter(config, "")).toBeNull();
  });

  describe("SELECT", () => {
    const config: FilterConfig = {
      id: "department",
      label: "Department",
      type: FILTER_TYPE.SELECT,
      options: [
        { value: "eng", label: "Engineering" },
        { value: "sales", label: "Sales" },
      ],
    };

    it("returns null for an empty selection", () => {
      expect(buildActiveFilter(config, [])).toBeNull();
    });

    it("supports selecting multiple options (true multi-select)", () => {
      const result = buildActiveFilter(config, ["eng", "sales"]);
      expect(result?.displayValue).toBe("Engineering, Sales");
      expect(result?.apiPayload).toEqual({ department: "eng,sales" });
    });

    it("falls back to the raw value when no matching option label is found", () => {
      const result = buildActiveFilter(config, ["unknown"]);
      expect(result?.displayValue).toBe("unknown");
    });
  });

  describe("DATE_RANGE", () => {
    const config: FilterConfig = { id: "joinDate", label: "Join date", type: FILTER_TYPE.DATE_RANGE };

    it("returns null when both from and to are empty", () => {
      expect(buildActiveFilter(config, {})).toBeNull();
    });

    it("builds a full range with default key names", () => {
      const result = buildActiveFilter(config, { from: "2026-01-01", to: "2026-01-31" });
      expect(result?.displayValue).toBe("01/01/2026 → 31/01/2026");
      expect(result?.apiPayload).toEqual({ joinDateFrom: "2026-01-01", joinDateTo: "2026-01-31" });
    });

    it("uses configured startDateKey/endDateKey", () => {
      const withKeys: FilterConfig = { ...config, startDateKey: "from", endDateKey: "to" };
      const result = buildActiveFilter(withKeys, { from: "2026-01-01", to: "2026-01-31" });
      expect(result?.apiPayload).toEqual({ from: "2026-01-01", to: "2026-01-31" });
    });

    it("supports an open-ended range (from only)", () => {
      const result = buildActiveFilter(config, { from: "2026-01-01" });
      expect(result?.displayValue).toBe("From 01/01/2026");
      expect(result?.apiPayload).toEqual({ joinDateFrom: "2026-01-01" });
    });

    it("supports an open-ended range (to only)", () => {
      const result = buildActiveFilter(config, { to: "2026-01-31" });
      expect(result?.displayValue).toBe("Until 31/01/2026");
      expect(result?.apiPayload).toEqual({ joinDateTo: "2026-01-31" });
    });
  });

  describe("MONTH", () => {
    it("returns null for an empty value", () => {
      const config: FilterConfig = { id: "reportMonth", label: "Month", type: FILTER_TYPE.MONTH };
      expect(buildActiveFilter(config, "")).toBeNull();
    });

    it("builds a single ISO payload by default", () => {
      const config: FilterConfig = { id: "reportMonth", label: "Month", type: FILTER_TYPE.MONTH };
      const result = buildActiveFilter(config, "2026-08");
      expect(result?.displayValue).toBe("August 2026");
      expect(result?.apiPayload).toEqual({ reportMonth: "2026-08" });
    });

    it("splits into monthKey/yearKey when configured", () => {
      const config: FilterConfig = {
        id: "reportMonth",
        label: "Month",
        type: FILTER_TYPE.MONTH,
        monthKey: "month",
        yearKey: "year",
      };
      const result = buildActiveFilter(config, "2026-08");
      expect(result?.apiPayload).toEqual({ month: "08", year: "2026" });
    });
  });

  it("carries the mandatory flag through", () => {
    const config: FilterConfig = { id: "q", label: "Search", type: FILTER_TYPE.SEARCH, mandatory: true };
    const result = buildActiveFilter(config, "x");
    expect(result?.mandatory).toBe(true);
  });
});
