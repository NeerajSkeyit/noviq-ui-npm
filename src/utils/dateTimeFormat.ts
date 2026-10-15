import {
  DATE_FORMAT,
  HOUR_STYLE,
  MONTH_NAMES,
  MONTH_NAMES_SHORT,
  TIME_FORMAT,
  TIME_PERIOD,
  WEEKDAY_NAMES,
  type HourStyle,
} from "../constants";
import type { NoviqUIFormats } from "../config/types";

/** A wall-clock moment broken into parts. `month` is 1–12, `hour` is 0–23, `weekday` 0 = Sunday. */
export interface DateTimeParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
  weekday: number;
}

export type DateTimeInput = string | number | Date;

// ─── Reading values ────────────────────────────────────────────────────────────────────────────

const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;
const TIME_ONLY = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/;
const HAS_TZ_SUFFIX = /(Z|[+-]\d{2}:?\d{2})$/i;

function daysInMonth(year: number, month: number): number {
  if (month === 2) return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0 ? 29 : 28;
  return [4, 6, 9, 11].includes(month) ? 30 : 31;
}

function weekdayOf(year: number, month: number, day: number): number {
  const d = new Date(0);
  d.setUTCFullYear(year, month - 1, day);
  return d.getUTCDay();
}

/**
 * Breaks a value into display parts, or `null` if it isn't a date/time.
 *
 * - `"YYYY-MM-DD"` is a *calendar day*, read as written in every time zone. (Through
 *   `new Date("2024-03-05")` it would be UTC midnight, i.e. the 4th west of Greenwich.)
 * - `"HH:mm[:ss]"` is a bare time of day, as a time picker produces.
 * - Anything else goes through `Date`. With `isUtc`, a zone-less datetime is taken as UTC and the
 *   UTC getters are used; otherwise the viewer's local time.
 */
export function toDateTimeParts(value: DateTimeInput, isUtc?: boolean): DateTimeParts | null {
  let date: Date;

  if (value instanceof Date) {
    date = value;
  } else if (typeof value === "number") {
    date = new Date(value);
  } else {
    const text = value.trim();

    const day = DATE_ONLY.exec(text);
    if (day) {
      const [year, month, dom] = [Number(day[1]), Number(day[2]), Number(day[3])];
      if (month < 1 || month > 12 || dom < 1 || dom > daysInMonth(year, month)) return null;
      return { year, month, day: dom, hour: 0, minute: 0, second: 0, weekday: weekdayOf(year, month, dom) };
    }

    const time = TIME_ONLY.exec(text);
    if (time) {
      const [hour, minute, second] = [Number(time[1]), Number(time[2]), Number(time[3] ?? 0)];
      if (hour > 23 || minute > 59 || second > 59) return null;
      return { year: 1970, month: 1, day: 1, hour, minute, second, weekday: 4 };
    }

    date = isUtc && !HAS_TZ_SUFFIX.test(text) ? new Date(`${text}Z`) : new Date(text);
  }

  if (Number.isNaN(date.getTime())) return null;

  return isUtc
    ? {
        year: date.getUTCFullYear(),
        month: date.getUTCMonth() + 1,
        day: date.getUTCDate(),
        hour: date.getUTCHours(),
        minute: date.getUTCMinutes(),
        second: date.getUTCSeconds(),
        weekday: date.getUTCDay(),
      }
    : {
        year: date.getFullYear(),
        month: date.getMonth() + 1,
        day: date.getDate(),
        hour: date.getHours(),
        minute: date.getMinutes(),
        second: date.getSeconds(),
        weekday: date.getDay(),
      };
}

// ─── Patterns ──────────────────────────────────────────────────────────────────────────────────

/**
 * Moment-style tokens. Longer tokens come first so `YYYY` is not read as `YY` twice. `[...]` is a
 * literal. Note `a`/`A`: text such as "at" must be escaped, `[at]`, exactly as in moment.
 */
const TOKEN_PATTERN =
  /\[([^\]]*)\]|YYYY|YY|MMMM|MMM|MM|M|dddd|ddd|DD|D|HH|H|hh|h|KK|K|mm|m|ss|s|A|a/g;

const pad = (n: number, width = 2) => String(n).padStart(width, "0");

/** Renders `parts` with `pattern`. */
export function formatParts(parts: DateTimeParts, pattern: string): string {
  const { year, month, day, hour, minute, second, weekday } = parts;
  const period = hour >= 12 ? TIME_PERIOD.PM : TIME_PERIOD.AM;

  return pattern.replace(TOKEN_PATTERN, (match: string, literal: string | undefined) => {
    if (literal !== undefined) return literal;
    switch (match) {
      case "YYYY": return pad(year, 4);
      case "YY": return pad(year % 100);
      case "MMMM": return MONTH_NAMES[month - 1];
      case "MMM": return MONTH_NAMES_SHORT[month - 1];
      case "MM": return pad(month);
      case "M": return String(month);
      case "dddd": return WEEKDAY_NAMES[weekday];
      case "ddd": return WEEKDAY_NAMES[weekday].slice(0, 3);
      case "DD": return pad(day);
      case "D": return String(day);
      case "HH": return pad(hour);
      case "H": return String(hour);
      case "hh": return pad(hour % 12 || 12);
      case "h": return String(hour % 12 || 12);
      case "KK": return pad(hour % 12);
      case "K": return String(hour % 12);
      case "mm": return pad(minute);
      case "m": return String(minute);
      case "ss": return pad(second);
      case "s": return String(second);
      case "A": return period;
      case "a": return period.toLowerCase();
      default: return match;
    }
  });
}

/**
 * Formats a value with a pattern. A value that can't be read as a date or time is returned as
 * the text it was — better to show the data than to hide it or print "NaN/NaN/NaN".
 */
export function formatValue(value: DateTimeInput, pattern: string, isUtc?: boolean): string {
  const parts = toDateTimeParts(value, isUtc);
  return parts ? formatParts(parts, pattern) : String(value);
}

/** Splits a pattern into tokens and literal text, keeping `[escaped]` text as a literal. */
function segments(pattern: string): { text: string; token: boolean }[] {
  const out: { text: string; token: boolean }[] = [];
  let last = 0;
  for (const match of pattern.matchAll(TOKEN_PATTERN)) {
    const index = match.index ?? 0;
    if (index > last) out.push({ text: pattern.slice(last, index), token: false });
    // An escaped `[text]` is a literal; keep its brackets so the pattern still means the same.
    out.push({ text: match[0], token: match[1] === undefined });
    last = index + match[0].length;
  }
  if (last < pattern.length) out.push({ text: pattern.slice(last), token: false });
  return out;
}

const HOUR_TOKENS = new Set(["H", "HH", "h", "hh", "K", "KK"]);
const DAY_TOKENS = new Set(["D", "DD", "ddd", "dddd"]);

/**
 * Which clock a time pattern describes: 24-hour (`HH`), 12-hour (`hh`), or the zero-based 12-hour
 * clock (`KK`). A pattern with only an AM/PM marker and no hour token is 12-hour.
 */
export function hourStyleOf(pattern: string): HourStyle {
  const tokens = segments(pattern).filter((s) => s.token).map((s) => s.text);
  const hour = tokens.find((t) => HOUR_TOKENS.has(t));
  if (hour === "K" || hour === "KK") return HOUR_STYLE.H12_ZERO_BASED;
  if (hour === "h" || hour === "hh") return HOUR_STYLE.H12;
  if (hour === undefined && tokens.some((t) => t === "A" || t === "a")) return HOUR_STYLE.H12;
  return HOUR_STYLE.H24;
}

/**
 * The month-and-year form of a date pattern, for the month picker: day-of-month and weekday tokens
 * go, along with the separator next to them. `DD/MM/YYYY` → `MM/YYYY`, `YYYY-MM-DD` → `YYYY-MM`,
 * `dddd, DD MMMM YYYY` → `MMMM YYYY`.
 */
export function deriveMonthPattern(datePattern: string): string {
  const parts = segments(datePattern);

  for (let i = 0; i < parts.length; i++) {
    if (!parts[i].token || !DAY_TOKENS.has(parts[i].text)) continue;
    parts[i] = { text: "", token: false };
    // Drop the separator after it, or — if it was last — the one before.
    const next = parts[i + 1];
    const prev = parts[i - 1];
    if (next && !next.token && !next.text.startsWith("[")) next.text = "";
    else if (prev && !prev.token && !prev.text.startsWith("[")) prev.text = "";
  }

  const result = parts.map((p) => p.text).join("").trim();
  return result || "MM/YYYY";
}

// ─── Configuration ─────────────────────────────────────────────────────────────────────────────

export interface ResolvedFormats {
  date: string;
  time: string;
  dateTime: string;
}

/** Applies the defaults. `dateTime` follows a customised `date` and `time` unless it is set. */
export function resolveFormats(input?: NoviqUIFormats): ResolvedFormats {
  const date = input?.date ?? DATE_FORMAT;
  const time = input?.time ?? TIME_FORMAT;
  return { date, time, dateTime: input?.dateTime ?? `${date} ${time}` };
}
