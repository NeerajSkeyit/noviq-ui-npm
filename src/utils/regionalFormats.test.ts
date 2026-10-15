import { describe, it, expect } from "vitest";
import { formatParts, formatValue, getDateNames, resolveFormats } from "./dateTimeFormat";
import { formatCurrency } from "./numberFormat";

// NBSP and narrow NBSP appear between a number and its symbol in several locales.
const plain = (s: string) => s.replace(/[  ]/g, " ");

describe("getDateNames", () => {
  it("is English with no locale", () => {
    const names = getDateNames();
    expect(names.months[0]).toBe("January");
    expect(names.monthsShort[8]).toBe("Sep");
    expect(names.weekdays[0]).toBe("Sunday");
    expect(names.weekdaysShort[2]).toBe("Tue");
    expect(names.weekdaysMin).toEqual(["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"]);
  });

  it.each(["en", "en-IN", "en-GB", "en-US", "en-AU"])(
    "keeps the built-in English names for %s (ICU spells September 'Sept' in some of them)",
    (locale) => {
      expect(getDateNames(locale).monthsShort[8]).toBe("Sep");
      expect(getDateNames(locale).months[8]).toBe("September");
    }
  );

  it("reads other languages from Intl", () => {
    const de = getDateNames("de-DE");
    expect(de.months[2]).toBe("März");
    expect(de.monthsShort[2]).toBe("Mär");
    expect(de.weekdays[0]).toBe("Sonntag");
    expect(de.weekdays[2]).toBe("Dienstag");
    expect(de.weekdaysShort[2]).toBe("Di");

    expect(getDateNames("fr-FR").months[1]).toBe("février");
    expect(getDateNames("es").weekdays[1]).toBe("lunes");
  });

  it("lists twelve months and seven weekdays, January and Sunday first", () => {
    for (const locale of ["de", "fr", "ja", "ar-EG", "hi-IN"]) {
      const names = getDateNames(locale);
      expect(names.months).toHaveLength(12);
      expect(names.monthsShort).toHaveLength(12);
      expect(names.weekdays).toHaveLength(7);
      expect(names.weekdaysMin).toHaveLength(7);
    }
    expect(getDateNames("ja").weekdays[0]).toBe("日曜日"); // Sunday
  });

  it("strips the abbreviation dot from calendar headings", () => {
    expect(getDateNames("fr-FR").weekdaysMin.every((label) => !label.endsWith("."))).toBe(true);
  });

  it("returns the same object for the same locale (it is cached)", () => {
    expect(getDateNames("de-DE")).toBe(getDateNames("de-DE"));
  });

  it("falls back to English for a tag Intl rejects instead of throwing", () => {
    expect(getDateNames("not a locale!").months[0]).toBe("January");
  });
});

describe("formatValue with a locale", () => {
  it("renders month and weekday names in that language", () => {
    expect(formatValue("2024-03-05", "dddd, D. MMMM YYYY", false, "de-DE")).toBe("Dienstag, 5. März 2024");
    expect(formatValue("2024-03-05", "ddd D MMM", false, "de-DE")).toBe("Di 5 Mär");
  });

  it("leaves numeric tokens alone", () => {
    expect(formatValue("2024-03-05", "DD/MM/YYYY", false, "ar-EG")).toBe("05/03/2024");
  });

  it("is English without a locale", () => {
    expect(formatValue("2024-03-05", "dddd, D MMMM YYYY")).toBe("Tuesday, 5 March 2024");
  });

  it("formatParts takes the locale too", () => {
    const parts = { year: 2024, month: 3, day: 5, hour: 0, minute: 0, second: 0, weekday: 2 };
    expect(formatParts(parts, "MMMM", "fr-FR")).toBe("mars");
  });
});

describe("resolveFormats — regional settings", () => {
  it("defaults to the settings the library always had", () => {
    expect(resolveFormats()).toMatchObject({ locale: "en-IN", currency: "INR", weekStart: 0 });
  });

  it("takes the locale and currency as given", () => {
    expect(resolveFormats({ locale: "de-DE", currency: "EUR" })).toMatchObject({
      locale: "de-DE",
      currency: "EUR",
    });
  });

  it.each([
    ["en-US", 0],
    ["en-GB", 1],
    ["de-DE", 1],
    ["fr-FR", 1],
    ["ar-EG", 6],
  ])("starts the week where %s does (%i)", (locale, weekStart) => {
    expect(resolveFormats({ locale }).weekStart).toBe(weekStart);
  });

  it("an explicit weekStart wins over the locale", () => {
    expect(resolveFormats({ locale: "de-DE", weekStart: 0 }).weekStart).toBe(0);
    expect(resolveFormats({ weekStart: 3 }).weekStart).toBe(3);
  });

  it("keeps the date, time and date-time resolution", () => {
    expect(resolveFormats({ locale: "de-DE", date: "DD.MM.YYYY", time: "HH:mm" })).toMatchObject({
      date: "DD.MM.YYYY",
      time: "HH:mm",
      dateTime: "DD.MM.YYYY HH:mm",
    });
  });
});

describe("formatCurrency", () => {
  it("groups the Indian way by default", () => {
    expect(plain(formatCurrency(1234567.5))).toBe("₹12,34,567.50");
  });

  it("follows the locale's grouping and symbol placement", () => {
    expect(formatCurrency(1234567.5, { locale: "en-US", currency: "USD" })).toBe("$1,234,567.50");
    expect(plain(formatCurrency(9876543.21, { locale: "de-DE", currency: "EUR" }))).toBe("9.876.543,21 €");
  });

  it("rounds to maximumFractionDigits", () => {
    expect(plain(formatCurrency(1234567.5, { maximumFractionDigits: 0 }))).toBe("₹12,34,568");
  });

  it("uses the currency's own precision when a currency has none (JPY)", () => {
    expect(plain(formatCurrency(1234567, { locale: "ja-JP", currency: "JPY" }))).toMatch(/1,234,567$/);
  });

  it("shows an unknown currency code instead of throwing", () => {
    expect(() => formatCurrency(5, { currency: "NOT-A-CODE" })).not.toThrow();
    expect(formatCurrency(5, { currency: "NOT-A-CODE" })).toContain("NOT-A-CODE");
    expect(formatCurrency(5, { currency: "NOT-A-CODE" })).toContain("5");
  });

  it("falls back to the default locale for a tag Intl rejects", () => {
    expect(plain(formatCurrency(1234567.5, { locale: "not a locale!" }))).toBe("₹12,34,567.50");
  });
});
