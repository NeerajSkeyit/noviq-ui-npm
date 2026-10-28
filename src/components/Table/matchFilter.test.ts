import { describe, it, expect } from "vitest";
import { matchesFilter } from "./matchFilter";
import { buildActiveFilter, type FilterConfig } from "./buildActiveFilter";
import { FILTER_TYPE } from "../../constants";

const select = (extra: Partial<FilterConfig> = {}): FilterConfig => ({ id: "status", label: "Status", type: FILTER_TYPE.SELECT, ...extra });
const search = (extra: Partial<FilterConfig> = {}): FilterConfig => ({ id: "name", label: "Name", type: FILTER_TYPE.SEARCH, ...extra });
const range = (extra: Partial<FilterConfig> = {}): FilterConfig => ({ id: "joined", label: "Joined", type: FILTER_TYPE.DATE_RANGE, ...extra });
const date = (extra: Partial<FilterConfig> = {}): FilterConfig => ({ id: "joined", label: "Joined", type: FILTER_TYPE.DATE, ...extra });
const month = (extra: Partial<FilterConfig> = {}): FilterConfig => ({ id: "joined", label: "Joined", type: FILTER_TYPE.MONTH, ...extra });

describe("matchesFilter — select", () => {
  it("keeps a row whose value is one of the chosen options", () => {
    expect(matchesFilter({ status: "active" }, select(), ["active", "pending"])).toBe(true);
    expect(matchesFilter({ status: "closed" }, select(), ["active", "pending"])).toBe(false);
  });

  it("does not match the word 'null' for an empty field, nor skip the other items of a list", () => {
    expect(matchesFilter({ status: null }, select(), ["null"])).toBe(false);
    expect(matchesFilter({ status: undefined }, select(), ["undefined"])).toBe(false);
    expect(matchesFilter({ status: [null, "b"] }, select(), ["b"])).toBe(true);
  });

  it("compares as text, so a number in the row matches the option's string value", () => {
    expect(matchesFilter({ status: 1 }, select(), ["1"])).toBe(true);
    expect(matchesFilter({ status: true }, select(), ["true"])).toBe(true);
  });

  it("matches a row whose field is a list when any item is chosen", () => {
    expect(matchesFilter({ status: ["a", "b"] }, select(), ["b"])).toBe(true);
    expect(matchesFilter({ status: ["a", "b"] }, select(), ["c"])).toBe(false);
  });

  it("drops a row with no value for the field", () => {
    expect(matchesFilter({ status: null }, select(), ["a"])).toBe(false);
    expect(matchesFilter({}, select(), ["a"])).toBe(false);
    expect(matchesFilter({ status: "" }, select(), ["a"])).toBe(false);
  });

  it("is case-sensitive: the options are the data's own values", () => {
    expect(matchesFilter({ status: "Active" }, select(), ["active"])).toBe(false);
  });
});

describe("matchesFilter — search", () => {
  it("matches a substring, ignoring case and surrounding spaces", () => {
    expect(matchesFilter({ name: "Natalie" }, search(), "ALI")).toBe(true);
    expect(matchesFilter({ name: "Bob" }, search(), "ali")).toBe(false);
    expect(matchesFilter({ name: "Alice" }, search(), "  ali ")).toBe(true);
  });

  it("matches numbers by their text and lists by any item", () => {
    expect(matchesFilter({ name: 1250 }, search(), "25")).toBe(true);
    expect(matchesFilter({ name: ["red", "green"] }, search(), "gre")).toBe(true);
  });

  it("drops a row with no value — it does not search the word 'null' or 'undefined'", () => {
    expect(matchesFilter({ name: null }, search(), "a")).toBe(false);
    expect(matchesFilter({}, search(), "a")).toBe(false);
    expect(matchesFilter({ name: null }, search(), "nul")).toBe(false);
    expect(matchesFilter({}, search(), "undef")).toBe(false);
    expect(matchesFilter({ name: ["red", null] }, search(), "nul")).toBe(false);
  });
});

describe("matchesFilter — date range", () => {
  const row = (joined: unknown) => ({ joined });

  it("includes both ends of the range", () => {
    const value = { from: "2024-03-01", to: "2024-03-31" };
    expect(matchesFilter(row("2024-03-01"), range(), value)).toBe(true);
    expect(matchesFilter(row("2024-03-31"), range(), value)).toBe(true);
    expect(matchesFilter(row("2024-02-29"), range(), value)).toBe(false);
    expect(matchesFilter(row("2024-04-01"), range(), value)).toBe(false);
  });

  it("works with only a start, or only an end", () => {
    expect(matchesFilter(row("2024-05-01"), range(), { from: "2024-03-01" })).toBe(true);
    expect(matchesFilter(row("2024-01-01"), range(), { from: "2024-03-01" })).toBe(false);
    expect(matchesFilter(row("2024-01-01"), range(), { to: "2024-03-01" })).toBe(true);
    expect(matchesFilter(row("2024-05-01"), range(), { to: "2024-03-01" })).toBe(false);
  });

  it("takes a date-time on the last day as inside the range (the day, not midnight, is the bound)", () => {
    const value = { from: "2024-03-01", to: "2024-03-31" };
    expect(matchesFilter(row("2024-03-31T18:30:00"), range(), value)).toBe(true);
    expect(matchesFilter(row("2024-03-01T00:00:00"), range(), value)).toBe(true);
    expect(matchesFilter(row("2024-04-01T00:00:00"), range(), value)).toBe(false);
  });

  it("drops a row whose value is not a date once a range is set", () => {
    const value = { from: "2024-03-01" };
    expect(matchesFilter(row("soon"), range(), value)).toBe(false);
    expect(matchesFilter(row(null), range(), value)).toBe(false);
    expect(matchesFilter(row(undefined), range(), value)).toBe(false);
  });

  it("does not read a bare time of day as a date", () => {
    // "09:30" would otherwise be taken for 1 January 1970 and pass a range that covers it
    expect(matchesFilter({ joined: "09:30" }, range(), { from: "1969-01-01", to: "1971-01-01" })).toBe(false);
    expect(matchesFilter({ joined: "9:30:15" }, date(), "1970-01-01")).toBe(false);
  });

  it("reads a Date object and an epoch number too", () => {
    const value = { from: "2024-03-01", to: "2024-03-31" };
    expect(matchesFilter(row(new Date(2024, 2, 15, 12)), range(), value)).toBe(true);
    expect(matchesFilter(row(new Date(2024, 2, 15, 12).getTime()), range(), value)).toBe(true);
  });
});

describe("matchesFilter — date and month", () => {
  it("a date matches that calendar day, whatever the time", () => {
    expect(matchesFilter({ joined: "2024-03-05" }, date(), "2024-03-05")).toBe(true);
    expect(matchesFilter({ joined: "2024-03-05T23:59:00" }, date(), "2024-03-05")).toBe(true);
    expect(matchesFilter({ joined: "2024-03-06" }, date(), "2024-03-05")).toBe(false);
  });

  it("a month matches every day of it", () => {
    expect(matchesFilter({ joined: "2024-03-17" }, month(), "2024-03")).toBe(true);
    expect(matchesFilter({ joined: "2024-03-31T20:00:00" }, month(), "2024-03")).toBe(true);
    expect(matchesFilter({ joined: "2024-04-01" }, month(), "2024-03")).toBe(false);
    expect(matchesFilter({ joined: "2023-03-17" }, month(), "2024-03")).toBe(false);
  });
});

describe("matchesFilter — which field it reads", () => {
  it("reads the field named by accessorKey, else by id", () => {
    expect(matchesFilter({ dept: "eng", status: "x" }, select({ accessorKey: "dept" }), ["eng"])).toBe(true);
    expect(matchesFilter({ dept: "eng", status: "x" }, select(), ["eng"])).toBe(false);
  });

  it("is built to be used with what buildActiveFilter produced", () => {
    const config = select({ options: [{ value: "a", label: "A" }] });
    const active = buildActiveFilter(config, ["a"])!;
    expect(matchesFilter({ status: "a" }, config, active.value)).toBe(true);
    expect(matchesFilter({ status: "b" }, config, active.value)).toBe(false);
  });
});

describe("buildActiveFilter carries the value", () => {
  it.each([
    [select(), ["a", "b"], ["a", "b"]],
    [search(), "ali", "ali"],
    [range(), { from: "2024-03-01", to: "2024-03-31" }, { from: "2024-03-01", to: "2024-03-31" }],
    [date(), "2024-03-05", "2024-03-05"],
    [month(), "2024-03", "2024-03"],
  ])("%j", (config, raw, expected) => {
    expect(buildActiveFilter(config as FilterConfig, raw)?.value).toEqual(expected);
  });

  it("drops blank selections from the select's value, as from its payload", () => {
    expect(buildActiveFilter(select(), ["a", "", "b"])?.value).toEqual(["a", "b"]);
  });
});
