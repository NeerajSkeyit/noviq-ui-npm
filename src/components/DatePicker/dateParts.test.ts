import { describe, it, expect } from "vitest";
import {
  addDays,
  addMonths,
  addMonthsYM,
  buildMonthGrid,
  clampYMD,
  compareYMD,
  daysInMonth,
  formatYM,
  formatYMD,
  formatISODate,
  formatISOMonth,
  isDateDisabled,
  isLeapYear,
  parseISODate,
  parseISOMonth,
  weekdayOf,
} from "./dateParts";

const d = (year: number, month: number, day: number) => ({ year, month, day });

describe("isLeapYear / daysInMonth", () => {
  it("applies the 4 / 100 / 400 rule", () => {
    expect(isLeapYear(2024)).toBe(true);
    expect(isLeapYear(2023)).toBe(false);
    expect(isLeapYear(1900)).toBe(false); // divisible by 100, not 400
    expect(isLeapYear(2000)).toBe(true);
  });

  it("knows each month's length, including February in leap years", () => {
    expect(daysInMonth(2024, 2)).toBe(29);
    expect(daysInMonth(2023, 2)).toBe(28);
    expect(daysInMonth(2023, 4)).toBe(30);
    expect(daysInMonth(2023, 12)).toBe(31);
  });
});

describe("parseISODate", () => {
  it("parses a plain date", () => {
    expect(parseISODate("2024-03-05")).toEqual(d(2024, 3, 5));
  });

  it("ignores a trailing time, like the HRMS date input did", () => {
    expect(parseISODate("2024-03-05 09:30")).toEqual(d(2024, 3, 5));
    expect(parseISODate("2024-03-05T09:30:00Z")).toEqual(d(2024, 3, 5));
  });

  it("accepts 29 February only in a leap year", () => {
    expect(parseISODate("2024-02-29")).toEqual(d(2024, 2, 29));
    expect(parseISODate("2023-02-29")).toBeNull();
  });

  it.each(["", undefined, null, "soon", "2024-13-01", "2024-00-10", "2024-04-31", "2024-3-5", "24-03-05", "2024-03-051"])(
    "returns null for %j",
    (value) => {
      expect(parseISODate(value as string | null | undefined)).toBeNull();
    }
  );
});

describe("parseISOMonth", () => {
  it("parses YYYY-MM and drops the day of a full date", () => {
    expect(parseISOMonth("2024-03")).toEqual({ year: 2024, month: 3 });
    expect(parseISOMonth("2024-03-17")).toEqual({ year: 2024, month: 3 });
  });

  it.each(["", undefined, "2024-13", "2024-00", "2024", "March"])("returns null for %j", (value) => {
    expect(parseISOMonth(value as string | undefined)).toBeNull();
  });
});

describe("formatting", () => {
  it("round-trips ISO and zero-pads", () => {
    expect(formatISODate(d(2024, 3, 5))).toBe("2024-03-05");
    expect(formatISOMonth({ year: 2024, month: 3 })).toBe("2024-03");
  });

  it("renders a date and a month with any display pattern", () => {
    expect(formatYMD(d(2024, 3, 5), "DD/MM/YYYY")).toBe("05/03/2024");
    expect(formatYMD(d(2024, 3, 5), "dddd, D MMMM YYYY")).toBe("Tuesday, 5 March 2024");
    expect(formatYM({ year: 2024, month: 3 }, "MM/YYYY")).toBe("03/2024");
    expect(formatYM({ year: 2024, month: 3 }, "MMMM YYYY")).toBe("March 2024");
  });
});

describe("weekdayOf", () => {
  it("matches known weekdays (0 = Sunday)", () => {
    expect(weekdayOf(d(2024, 1, 1))).toBe(1); // Monday
    expect(weekdayOf(d(2023, 10, 15))).toBe(0); // Sunday
    expect(weekdayOf(d(2000, 2, 29))).toBe(2); // Tuesday
  });
});

describe("addDays", () => {
  it("rolls over month and year boundaries", () => {
    expect(addDays(d(2023, 12, 31), 1)).toEqual(d(2024, 1, 1));
    expect(addDays(d(2024, 1, 1), -1)).toEqual(d(2023, 12, 31));
    expect(addDays(d(2024, 2, 28), 1)).toEqual(d(2024, 2, 29));
    expect(addDays(d(2023, 2, 28), 1)).toEqual(d(2023, 3, 1));
  });

  it("is stable across a daylight-saving change", () => {
    // March 2024 has US/EU DST transitions; day arithmetic must still be exact.
    expect(addDays(d(2024, 3, 9), 3)).toEqual(d(2024, 3, 12));
    expect(addDays(d(2024, 3, 30), 2)).toEqual(d(2024, 4, 1));
  });
});

describe("addMonths", () => {
  it("clamps the day to the target month's last day", () => {
    expect(addMonths(d(2024, 1, 31), 1)).toEqual(d(2024, 2, 29));
    expect(addMonths(d(2023, 1, 31), 1)).toEqual(d(2023, 2, 28));
    expect(addMonths(d(2024, 3, 31), -1)).toEqual(d(2024, 2, 29));
  });

  it("crosses year boundaries in both directions", () => {
    expect(addMonths(d(2023, 12, 15), 1)).toEqual(d(2024, 1, 15));
    expect(addMonths(d(2024, 1, 15), -1)).toEqual(d(2023, 12, 15));
    expect(addMonths(d(2024, 6, 10), 12)).toEqual(d(2025, 6, 10));
    expect(addMonths(d(2024, 6, 10), -18)).toEqual(d(2022, 12, 10));
  });

  it("moves a bare month the same way", () => {
    expect(addMonthsYM({ year: 2023, month: 12 }, 1)).toEqual({ year: 2024, month: 1 });
    expect(addMonthsYM({ year: 2024, month: 1 }, -1)).toEqual({ year: 2023, month: 12 });
    expect(addMonthsYM({ year: 2024, month: 5 }, -29)).toEqual({ year: 2021, month: 12 });
  });
});

describe("compare / clamp / disabled", () => {
  it("orders dates", () => {
    expect(compareYMD(d(2024, 3, 5), d(2024, 3, 5))).toBe(0);
    expect(compareYMD(d(2024, 3, 5), d(2024, 3, 6))).toBeLessThan(0);
    expect(compareYMD(d(2025, 1, 1), d(2024, 12, 31))).toBeGreaterThan(0);
  });

  it("clamps into [min, max]", () => {
    const min = d(2024, 3, 10);
    const max = d(2024, 3, 20);
    expect(clampYMD(d(2024, 3, 1), min, max)).toEqual(min);
    expect(clampYMD(d(2024, 3, 25), min, max)).toEqual(max);
    expect(clampYMD(d(2024, 3, 15), min, max)).toEqual(d(2024, 3, 15));
    expect(clampYMD(d(2024, 3, 1), null, null)).toEqual(d(2024, 3, 1));
  });

  it("treats both bounds as inclusive", () => {
    const min = d(2024, 3, 10);
    const max = d(2024, 3, 20);
    expect(isDateDisabled(d(2024, 3, 10), min, max)).toBe(false);
    expect(isDateDisabled(d(2024, 3, 20), min, max)).toBe(false);
    expect(isDateDisabled(d(2024, 3, 9), min, max)).toBe(true);
    expect(isDateDisabled(d(2024, 3, 21), min, max)).toBe(true);
  });
});

describe("buildMonthGrid", () => {
  it("always returns 42 days, starting on the week start", () => {
    const grid = buildMonthGrid(2024, 2, 0);
    expect(grid).toHaveLength(42);
    expect(weekdayOf(grid[0])).toBe(0);
  });

  it("starts with the previous month's trailing days when the 1st isn't the week start", () => {
    // 1 Feb 2024 is a Thursday → Sun 28 Jan is the first cell.
    const grid = buildMonthGrid(2024, 2, 0);
    expect(grid[0]).toEqual(d(2024, 1, 28));
    expect(grid[4]).toEqual(d(2024, 2, 1));
  });

  it("starts exactly on the 1st when it falls on the week start", () => {
    // 1 Oct 2023 is a Sunday.
    expect(buildMonthGrid(2023, 10, 0)[0]).toEqual(d(2023, 10, 1));
  });

  it("covers a 31-day month starting late in the week, with next-month days after it", () => {
    // 1 Jun 2024 is a Saturday: 6 leading days, 30 days of June, 6 trailing days of July.
    const grid = buildMonthGrid(2024, 6, 0);
    expect(grid[6]).toEqual(d(2024, 6, 1));
    expect(grid[35]).toEqual(d(2024, 6, 30));
    expect(grid[41]).toEqual(d(2024, 7, 6));
  });

  it("honours a Monday week start", () => {
    const grid = buildMonthGrid(2024, 2, 1);
    expect(weekdayOf(grid[0])).toBe(1);
    expect(grid[3]).toEqual(d(2024, 2, 1)); // Thu is the 4th cell when weeks start on Monday
  });
});
