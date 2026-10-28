import { FILTER_TYPE } from "../../constants";
import { toDateTimeParts } from "../../utils/dateTimeFormat";
import type { DateRangeValue, FilterConfig } from "./buildActiveFilter";

const pad = (n: number, width = 2) => String(n).padStart(width, "0");

/** Bare times of day ("09:30") would read as 1 January 1970; they are not dates. */
const BARE_TIME = /^\d{1,2}:\d{2}/;

/**
 * The calendar day a value falls on, `"YYYY-MM-DD"`, or `null` if it isn't a date. A date-only
 * string is that day in every time zone; a date-time is the viewer's local day, as the table shows it.
 */
function calendarDay(value: unknown): string | null {
  if (typeof value === "string" && BARE_TIME.test(value.trim())) return null;
  if (typeof value !== "string" && typeof value !== "number" && !(value instanceof Date)) return null;
  const parts = toDateTimeParts(value);
  return parts ? `${pad(parts.year, 4)}-${pad(parts.month)}-${pad(parts.day)}` : null;
}

/** A field's text values: a list contributes each item; nothing/empty contributes nothing. */
function textsOf(field: unknown): string[] {
  const items = Array.isArray(field) ? field : [field];
  return items.filter((item) => item !== undefined && item !== null && item !== "").map(String);
}

/**
 * Whether `row` passes one active filter — what `<Table preFetchedData>` uses, since there is no
 * server to ask. `value` is what the filter holds (`ActiveFilter.value`). The field read is
 * `config.accessorKey`, else `config.id`.
 *
 * - select: the field (or any item of a list) is one of the chosen values, compared as text;
 * - search: the field contains the text, ignoring case;
 * - date: the same calendar day; month: the same year and month;
 * - date range: the day is on or after `from` and on or before `to`, so a time on the last day counts.
 *
 * A row with no value for the field, or one that isn't a date for a date filter, doesn't pass.
 */
export function matchesFilter(row: unknown, config: FilterConfig, value: unknown): boolean {
  const field = (row as Record<string, unknown> | null | undefined)?.[config.accessorKey ?? config.id];

  switch (config.type) {
    case FILTER_TYPE.SELECT: {
      const chosen = (Array.isArray(value) ? value : []).map(String);
      return textsOf(field).some((text) => chosen.includes(text));
    }

    case FILTER_TYPE.DATE_RANGE: {
      const { from, to } = (value as DateRangeValue) ?? {};
      const day = calendarDay(field);
      if (day === null) return false;
      return (!from || day >= from) && (!to || day <= to);
    }

    case FILTER_TYPE.DATE:
      return calendarDay(field) === value;

    case FILTER_TYPE.MONTH:
      return calendarDay(field)?.slice(0, 7) === String(value).slice(0, 7);

    case FILTER_TYPE.SEARCH:
    default: {
      const needle = String(value ?? "").trim().toLowerCase();
      return textsOf(field).some((text) => text.toLowerCase().includes(needle));
    }
  }
}
