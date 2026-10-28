import {
  BUILT_IN_NAMES_LANGUAGE,
  DEFAULT_TEXT,
  DATE_FORMAT,
  DAYS_IN_WEEK,
  DEFAULT_CURRENCY,
  DEFAULT_LOCALE,
  HOUR_STYLE,
  MONTH_NAMES,
  MONTH_NAMES_SHORT,
  MONTH_SAMPLE_DAY,
  TIME_FORMAT,
  TIME_PERIOD,
  WEEKDAY_LABELS,
  WEEKDAY_NAMES,
  WEEKDAY_SAMPLE_YEAR,
  WEEK_START,
  type HourStyle,
} from "../constants";
import type { NoviqUIFormats, NoviqUIText } from "../config/types";
import { resolveText } from "./text";

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

// ─── Names ─────────────────────────────────────────────────────────────────────────────────────

/** Month and weekday names in one language. Months start at January, weekdays at Sunday. */
export interface DateNames {
  months: readonly string[];
  monthsShort: readonly string[];
  weekdays: readonly string[];
  /** For the `ddd` token. */
  weekdaysShort: readonly string[];
  /** For calendar column headings: as short as the language allows. */
  weekdaysMin: readonly string[];
}

const ENGLISH_NAMES: DateNames = {
  months: MONTH_NAMES,
  monthsShort: MONTH_NAMES_SHORT,
  weekdays: WEEKDAY_NAMES,
  weekdaysShort: WEEKDAY_NAMES.map((name) => name.slice(0, 3)),
  weekdaysMin: WEEKDAY_LABELS,
};

const namesByLocale = new Map<string, DateNames>();

function languageOf(locale: string): string | undefined {
  try {
    return new Intl.Locale(locale).language;
  } catch {
    return undefined; // not a tag at all
  }
}

function namesFromIntl(locale: string): DateNames {
  const nameOf = (options: Intl.DateTimeFormatOptions, date: Date) =>
    new Intl.DateTimeFormat(locale, { ...options, timeZone: "UTC" }).format(date);
  const monthDate = (m: number) => new Date(Date.UTC(WEEKDAY_SAMPLE_YEAR, m, MONTH_SAMPLE_DAY));
  const weekdayDate = (d: number) => new Date(Date.UTC(WEEKDAY_SAMPLE_YEAR, 0, 1 + d));
  const range = (count: number) => Array.from({ length: count }, (_, i) => i);

  const weekdaysShort = range(DAYS_IN_WEEK).map((d) => nameOf({ weekday: "short" }, weekdayDate(d)));
  return {
    months: range(MONTH_NAMES.length).map((m) => nameOf({ month: "long" }, monthDate(m))),
    monthsShort: range(MONTH_NAMES.length).map((m) => nameOf({ month: "short" }, monthDate(m))),
    weekdays: range(DAYS_IN_WEEK).map((d) => nameOf({ weekday: "long" }, weekdayDate(d))),
    weekdaysShort,
    weekdaysMin: weekdaysShort.map((name) => name.replace(/\.$/, "")),
  };
}

/**
 * Month and weekday names for a locale. English (and anything unreadable) uses the built-in
 * tables so a date reads the same on every runtime; other languages come from `Intl` and are
 * cached, since a table asks for them once per cell.
 */
export function getDateNames(locale?: string): DateNames {
  if (!locale) return ENGLISH_NAMES;
  const cached = namesByLocale.get(locale);
  if (cached) return cached;

  const language = languageOf(locale);
  let names: DateNames;
  if (language === undefined || language === BUILT_IN_NAMES_LANGUAGE) {
    names = ENGLISH_NAMES;
  } else {
    try {
      names = namesFromIntl(locale);
    } catch {
      names = ENGLISH_NAMES;
    }
  }
  namesByLocale.set(locale, names);
  return names;
}

// ─── Patterns ──────────────────────────────────────────────────────────────────────────────────

/**
 * Moment-style tokens. Longer tokens come first so `YYYY` is not read as `YY` twice. `[...]` is a
 * literal. Note `a`/`A`: text such as "at" must be escaped, `[at]`, exactly as in moment.
 */
const TOKEN_PATTERN =
  /\[([^\]]*)\]|YYYY|YY|MMMM|MMM|MM|M|dddd|ddd|DD|D|HH|H|hh|h|KK|K|mm|m|ss|s|A|a/g;

const pad = (n: number, width = 2) => String(n).padStart(width, "0");

/** What `A` / `a` print before and after noon. Default `AM` / `PM`; `config.text` can replace them. */
export interface PeriodMarkers {
  am: string;
  pm: string;
}

const DEFAULT_MARKERS: PeriodMarkers = { am: TIME_PERIOD.AM, pm: TIME_PERIOD.PM };

/**
 * Renders `parts` with `pattern`. `locale` picks the language of month and weekday names, and
 * `markers` what `A` / `a` print (`a` is the lower-case form); numbers are the same everywhere.
 */
export function formatParts(
  parts: DateTimeParts,
  pattern: string,
  locale?: string,
  markers: PeriodMarkers = DEFAULT_MARKERS
): string {
  const { year, month, day, hour, minute, second, weekday } = parts;
  const period = hour >= 12 ? markers.pm : markers.am;
  const names = getDateNames(locale);

  return pattern.replace(TOKEN_PATTERN, (match: string, literal: string | undefined) => {
    if (literal !== undefined) return literal;
    switch (match) {
      case "YYYY": return pad(year, 4);
      case "YY": return pad(year % 100);
      case "MMMM": return names.months[month - 1];
      case "MMM": return names.monthsShort[month - 1];
      case "MM": return pad(month);
      case "M": return String(month);
      case "dddd": return names.weekdays[weekday];
      case "ddd": return names.weekdaysShort[weekday];
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
      case "a": return period.toLocaleLowerCase(locale);
      default: return match;
    }
  });
}

/**
 * Formats a value with a pattern. A value that can't be read as a date or time is returned as
 * the text it was — better to show the data than to hide it or print "NaN/NaN/NaN".
 */
export function formatValue(
  value: DateTimeInput,
  pattern: string,
  isUtc?: boolean,
  locale?: string,
  markers?: PeriodMarkers
): string {
  const parts = toDateTimeParts(value, isUtc);
  return parts ? formatParts(parts, pattern, locale, markers) : String(value);
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
  /** The BCP-47 tag in force; `"en-IN"` when none was configured. */
  locale: string;
  /** The default currency code for `currency` cells. */
  currency: string;
  /** First day of the calendar week, `0` = Sunday. */
  weekStart: number;
  /** What `A` / `a` print: `AM` / `PM` unless `config.text` sets `timeAm` / `timePm`. */
  periods: PeriodMarkers;
}

/**
 * What the formatting functions accept: the three patterns, and the regional settings if the
 * caller has them. Hand-built `{ date, time, dateTime }` objects (from before regional settings
 * existed) keep working and behave as the defaults for the rest.
 */
export type FormatsInput = Pick<ResolvedFormats, "date" | "time" | "dateTime"> & Partial<ResolvedFormats>;

/** The day a locale's calendar week starts on (`0` = Sunday), or `undefined` if the runtime can't say. */
function localeWeekStart(locale: string): number | undefined {
  try {
    const tag = new Intl.Locale(locale) as Intl.Locale & {
      getWeekInfo?: () => { firstDay: number };
      weekInfo?: { firstDay: number };
    };
    // Chrome and Node have `getWeekInfo()`; older engines had a `weekInfo` property. Both count
    // Monday = 1 … Sunday = 7.
    const info = typeof tag.getWeekInfo === "function" ? tag.getWeekInfo() : tag.weekInfo;
    return typeof info?.firstDay === "number" ? info.firstDay % DAYS_IN_WEEK : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Applies the defaults. `dateTime` follows a customised `date` and `time` unless it is set; the
 * week starts where the configured locale's does, and on Sunday if none is configured.
 */
export function resolveFormats(input?: NoviqUIFormats, text?: NoviqUIText): ResolvedFormats {
  const date = input?.date ?? DATE_FORMAT;
  const time = input?.time ?? TIME_FORMAT;
  const weekStart =
    input?.weekStart ?? (input?.locale ? localeWeekStart(input.locale) : undefined) ?? WEEK_START;
  return {
    date,
    time,
    dateTime: input?.dateTime ?? `${date} ${time}`,
    locale: input?.locale ?? DEFAULT_LOCALE,
    currency: input?.currency ?? DEFAULT_CURRENCY,
    weekStart,
    periods: {
      am: resolveText(DEFAULT_TEXT, text, "timeAm"),
      pm: resolveText(DEFAULT_TEXT, text, "timePm"),
    },
  };
}
