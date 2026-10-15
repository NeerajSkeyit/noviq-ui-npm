import { describe, it, expect, afterEach } from "vitest";
import {
  deriveMonthPattern,
  formatParts,
  formatValue,
  hourStyleOf,
  resolveFormats,
  toDateTimeParts,
} from "./dateTimeFormat";

const at = (y: number, mo: number, d: number, h = 0, mi = 0, s = 0) => new Date(y, mo - 1, d, h, mi, s);

describe("formatValue — tokens", () => {
  const sample = at(2024, 3, 5, 14, 7, 9); // Tuesday 5 March 2024, 14:07:09

  it.each([
    ["YYYY-MM-DD", "2024-03-05"],
    ["DD/MM/YYYY", "05/03/2024"],
    ["D/M/YY", "5/3/24"],
    ["MMMM D, YYYY", "March 5, 2024"],
    ["MMM DD YYYY", "Mar 05 2024"],
    ["dddd, DD MMMM YYYY", "Tuesday, 05 March 2024"],
    ["ddd D MMM", "Tue 5 Mar"],
  ])("date pattern %s → %s", (pattern, expected) => {
    expect(formatValue(sample, pattern)).toBe(expected);
  });

  it.each([
    ["HH:mm", "14:07"],
    ["H:m", "14:7"],
    ["HH:mm:ss", "14:07:09"],
    ["hh:mm A", "02:07 PM"],
    ["h:mm a", "2:07 pm"],
    ["KK:mm A", "02:07 PM"],
  ])("time pattern %s → %s", (pattern, expected) => {
    expect(formatValue(sample, pattern)).toBe(expected);
  });

  it("combines date and time in one pattern", () => {
    expect(formatValue(sample, "DD-MM-YYYY HH:mm")).toBe("05-03-2024 14:07");
  });

  it("escapes literal text in square brackets", () => {
    // Without the brackets, the "a" in "at" would be read as the am/pm token.
    expect(formatValue(sample, "DD MMM [at] HH:mm")).toBe("05 Mar at 14:07");
    expect(formatValue(sample, "[Week of] D MMM")).toBe("Week of 5 Mar");
  });

  it("leaves unrecognised characters alone", () => {
    expect(formatValue(sample, "YYYY.MM.DD – HH:mm")).toBe("2024.03.05 – 14:07");
  });

  describe("12-hour tokens at the boundaries", () => {
    const hourText = (hour: number, pattern: string) => formatValue(at(2024, 1, 1, hour, 30), pattern);

    it("hh / h are conventional: midnight and noon are 12", () => {
      expect(hourText(0, "hh:mm A")).toBe("12:30 AM");
      expect(hourText(12, "hh:mm A")).toBe("12:30 PM");
      expect(hourText(13, "hh:mm A")).toBe("01:30 PM");
      expect(hourText(0, "h:mm A")).toBe("12:30 AM");
    });

    it("KK / K are zero-based: midnight and noon are 00", () => {
      expect(hourText(0, "KK:mm A")).toBe("00:30 AM");
      expect(hourText(12, "KK:mm A")).toBe("00:30 PM");
      expect(hourText(23, "KK:mm A")).toBe("11:30 PM");
      expect(hourText(12, "K:mm A")).toBe("0:30 PM");
    });

    it("HH / H are 0–23", () => {
      expect(hourText(0, "HH:mm")).toBe("00:30");
      expect(hourText(0, "H:mm")).toBe("0:30");
      expect(hourText(23, "HH:mm")).toBe("23:30");
    });
  });

  it("pads years below 1000 to four digits", () => {
    expect(formatParts({ year: 987, month: 1, day: 2, hour: 0, minute: 0, second: 0, weekday: 0 }, "YYYY")).toBe("0987");
  });
});

describe("toDateTimeParts — reading values", () => {
  const original = process.env.TZ;
  afterEach(() => {
    if (original === undefined) delete process.env.TZ;
    else process.env.TZ = original;
  });

  it("reads a date-only string as that calendar day in any time zone", () => {
    // `new Date("2024-03-05")` is UTC midnight, which is 4 March in the Americas.
    for (const tz of ["America/Los_Angeles", "UTC", "Asia/Kolkata", "Pacific/Auckland"]) {
      process.env.TZ = tz;
      expect(formatValue("2024-03-05", "DD/MM/YYYY"), tz).toBe("05/03/2024");
      expect(formatValue("2024-03-05", "DD/MM/YYYY", true), `${tz} (utc)`).toBe("05/03/2024");
    }
  });

  it("reads a Date, an epoch number and an ISO datetime", () => {
    const d = at(2024, 3, 5, 9, 30);
    expect(formatValue(d, "DD/MM/YYYY HH:mm")).toBe("05/03/2024 09:30");
    expect(formatValue(d.getTime(), "DD/MM/YYYY HH:mm")).toBe("05/03/2024 09:30");
    expect(formatValue("2024-03-05T09:30:00", "DD/MM/YYYY HH:mm")).toBe("05/03/2024 09:30");
  });

  it("with isUtc, reads a zone-less datetime as UTC and uses UTC getters", () => {
    process.env.TZ = "America/Los_Angeles";
    expect(formatValue("2024-03-05T23:30:00", "DD/MM/YYYY HH:mm", true)).toBe("05/03/2024 23:30");
    expect(formatValue("2024-03-05T23:30:00Z", "HH:mm", true)).toBe("23:30");
  });

  it("reads a bare time of day, as a TimePicker produces", () => {
    expect(formatValue("09:30", "hh:mm A")).toBe("09:30 AM");
    expect(formatValue("21:05:44", "HH:mm:ss")).toBe("21:05:44");
    expect(formatValue("7:05", "HH:mm")).toBe("07:05");
  });

  it("returns null for something unreadable, and formatValue hands the original text back", () => {
    expect(toDateTimeParts("not a date")).toBeNull();
    expect(toDateTimeParts("2024-02-30")).toBeNull(); // not a real day
    expect(formatValue("not a date", "DD/MM/YYYY")).toBe("not a date");
  });

  it("works out the weekday for a date-only value", () => {
    expect(toDateTimeParts("2024-03-05")?.weekday).toBe(2); // Tuesday
  });
});

describe("hourStyleOf", () => {
  it.each([
    ["HH:mm", "24"],
    ["H:mm", "24"],
    ["hh:mm A", "12"],
    ["h:mm a", "12"],
    ["KK:mm A", "12-zero"],
    ["K:mm", "12-zero"],
    ["[at] HH:mm", "24"],
    ["DD/MM/YYYY", "24"], // no hour token at all: nothing says 12-hour
  ])("%s → %s", (pattern, expected) => {
    expect(hourStyleOf(pattern)).toBe(expected);
  });

  it("an escaped 'h' is not an hour token", () => {
    expect(hourStyleOf("HH[h]mm")).toBe("24");
  });

  it("a bare AM/PM marker implies a 12-hour clock", () => {
    expect(hourStyleOf("mm A")).toBe("12");
  });
});

describe("deriveMonthPattern", () => {
  it.each([
    ["DD/MM/YYYY", "MM/YYYY"],
    ["MM/DD/YYYY", "MM/YYYY"],
    ["YYYY-MM-DD", "YYYY-MM"],
    ["D.M.YYYY", "M.YYYY"],
    ["MMM D, YYYY", "MMM YYYY"],
    ["DD MMMM YYYY", "MMMM YYYY"],
    ["dddd, DD MMMM YYYY", "MMMM YYYY"],
    ["YYYY/MM/DD", "YYYY/MM"],
  ])("%s → %s", (date, month) => {
    expect(deriveMonthPattern(date)).toBe(month);
  });

  it("falls back to MM/YYYY when nothing is left", () => {
    expect(deriveMonthPattern("DD")).toBe("MM/YYYY");
  });
});

describe("resolveFormats", () => {
  it("defaults to DD/MM/YYYY, hh:mm A and their combination", () => {
    expect(resolveFormats()).toMatchObject({
      date: "DD/MM/YYYY",
      time: "hh:mm A",
      dateTime: "DD/MM/YYYY hh:mm A",
    });
  });

  it("builds the date-time pattern from a customised date and time when none is given", () => {
    expect(resolveFormats({ date: "YYYY-MM-DD", time: "HH:mm" }).dateTime).toBe("YYYY-MM-DD HH:mm");
    expect(resolveFormats({ date: "MM/DD/YYYY" }).dateTime).toBe("MM/DD/YYYY hh:mm A");
  });

  it("an explicit date-time pattern wins", () => {
    expect(resolveFormats({ date: "YYYY-MM-DD", dateTime: "DD MMM YYYY, HH:mm" }).dateTime).toBe(
      "DD MMM YYYY, HH:mm"
    );
  });
});
