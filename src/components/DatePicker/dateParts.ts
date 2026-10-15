import { DAYS_IN_WEEK, CALENDAR_WEEKS } from "../../constants";
import { formatParts } from "../../utils/dateTimeFormat";

/** A calendar date with no time zone: `month` is 1–12, `day` is 1–31. */
export interface YMD {
  year: number;
  month: number;
  day: number;
}

export interface YM {
  year: number;
  month: number;
}

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})(?:$|[T\s])/;
const ISO_MONTH = /^(\d{4})-(\d{2})(?:$|-\d{2}(?:$|[T\s]))/;
const MS_PER_DAY = 86_400_000;

const pad = (n: number, width = 2) => String(n).padStart(width, "0");

export function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

export function daysInMonth(year: number, month: number): number {
  if (month === 2) return isLeapYear(year) ? 29 : 28;
  return [4, 6, 9, 11].includes(month) ? 30 : 31;
}

/** Midnight UTC of a date as epoch ms. `setUTCFullYear` avoids `Date`'s 0–99 → 1900–1999 quirk. */
function toEpochDay(date: YMD): number {
  const d = new Date(0);
  d.setUTCFullYear(date.year, date.month - 1, date.day);
  return d.getTime();
}

function fromEpochDay(ms: number): YMD {
  const d = new Date(ms);
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate() };
}

/**
 * `"YYYY-MM-DD"` (a trailing time, as in `"2024-03-05 09:30"` or an ISO datetime, is ignored) →
 * a date, or `null` for anything that isn't a real calendar date (`"2023-02-30"`, `"soon"`).
 * Never goes through `new Date(string)`, which would read it as UTC and shift the day.
 */
export function parseISODate(value?: string | null): YMD | null {
  const match = value ? ISO_DATE.exec(value) : null;
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12 || day < 1 || day > daysInMonth(year, month)) return null;
  return { year, month, day };
}

/** `"YYYY-MM"` (or a full `"YYYY-MM-DD"`, whose day is dropped) → a month, or `null`. */
export function parseISOMonth(value?: string | null): YM | null {
  const match = value ? ISO_MONTH.exec(value) : null;
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  if (month < 1 || month > 12) return null;
  return { year, month };
}

export function formatISODate({ year, month, day }: YMD): string {
  return `${pad(year, 4)}-${pad(month)}-${pad(day)}`;
}

export function formatISOMonth({ year, month }: YM): string {
  return `${pad(year, 4)}-${pad(month)}`;
}

/** A calendar date rendered with a display pattern such as `"DD/MM/YYYY"`. */
export function formatYMD(date: YMD, pattern: string, locale?: string): string {
  return formatParts(
    { ...date, hour: 0, minute: 0, second: 0, weekday: weekdayOf(date) },
    pattern,
    locale
  );
}

/** A month rendered with a display pattern such as `"MM/YYYY"` (day 1, for weekday tokens). */
export function formatYM(month: YM, pattern: string, locale?: string): string {
  return formatYMD({ ...month, day: 1 }, pattern, locale);
}

export function todayYMD(): YMD {
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() + 1, day: now.getDate() };
}

/** `0` = Sunday … `6` = Saturday. */
export function weekdayOf(date: YMD): number {
  return new Date(toEpochDay(date)).getUTCDay();
}

export function compareYMD(a: YMD, b: YMD): number {
  return a.year - b.year || a.month - b.month || a.day - b.day;
}

export function compareYM(a: YM, b: YM): number {
  return a.year - b.year || a.month - b.month;
}

export function addDays(date: YMD, days: number): YMD {
  return fromEpochDay(toEpochDay(date) + days * MS_PER_DAY);
}

/** Moves by whole months, pulling the day back to the new month's last day when it doesn't fit. */
export function addMonths(date: YMD, months: number): YMD {
  const index = date.year * 12 + (date.month - 1) + months;
  const year = Math.floor(index / 12);
  const month = (index % 12 + 12) % 12 + 1;
  return { year, month, day: Math.min(date.day, daysInMonth(year, month)) };
}

export function addMonthsYM(date: YM, months: number): YM {
  const index = date.year * 12 + (date.month - 1) + months;
  return { year: Math.floor(index / 12), month: ((index % 12) + 12) % 12 + 1 };
}

/** Keeps `date` inside `[min, max]` (either bound may be absent). */
export function clampYMD(date: YMD, min?: YMD | null, max?: YMD | null): YMD {
  if (min && compareYMD(date, min) < 0) return min;
  if (max && compareYMD(date, max) > 0) return max;
  return date;
}

export function isDateDisabled(date: YMD, min?: YMD | null, max?: YMD | null): boolean {
  return (!!min && compareYMD(date, min) < 0) || (!!max && compareYMD(date, max) > 0);
}

/**
 * The 42 days (6 weeks × 7) shown for a month: it starts on `weekStart`, so the first row holds the
 * previous month's trailing days and the last row the next month's leading ones.
 */
export function buildMonthGrid(year: number, month: number, weekStart: number): YMD[] {
  const first: YMD = { year, month, day: 1 };
  const lead = (weekdayOf(first) - weekStart + DAYS_IN_WEEK) % DAYS_IN_WEEK;
  const start = addDays(first, -lead);
  return Array.from({ length: CALENDAR_WEEKS * DAYS_IN_WEEK }, (_, i) => addDays(start, i));
}
