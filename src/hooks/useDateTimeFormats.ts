import { useCallback, useMemo } from "react";
import { useNoviqUIConfig } from "../config/NoviqUIConfigProvider";
import { DEFAULT_TEXT } from "../constants";
import { resolveText } from "../utils/text";
import {
  formatValue,
  resolveFormats,
  type DateTimeInput,
  type ResolvedFormats,
} from "../utils/dateTimeFormat";

/** The date / time / date-time patterns in force: `NoviqUIConfigProvider`'s `formats`, or defaults. */
export function useDateTimeFormats(): ResolvedFormats {
  const config = useNoviqUIConfig();
  const { date, time, dateTime, locale, currency, weekStart } = config?.formats ?? {};
  // The AM/PM markers come from `config.text`. Resolved here to plain strings so the memo is keyed
  // on values: apps commonly pass an inline `config={{...}}`, whose `text` is a new object each render.
  const timeAm = resolveText(DEFAULT_TEXT, config?.text, "timeAm");
  const timePm = resolveText(DEFAULT_TEXT, config?.text, "timePm");
  return useMemo(
    () => resolveFormats({ date, time, dateTime, locale, currency, weekStart }, { timeAm, timePm }),
    [date, time, dateTime, locale, currency, weekStart, timeAm, timePm]
  );
}

/**
 * The time pattern **only if the app set one**. Used by the TimePicker, whose clock follows an
 * explicit `formats.time` but otherwise keeps its own default (24-hour) rather than inheriting
 * the table's "hh:mm A".
 */
export function useConfiguredTimePattern(): string | undefined {
  return useNoviqUIConfig()?.formats?.time;
}

export interface DateTimeFormatters {
  /** The resolved patterns. */
  formats: ResolvedFormats;
  formatDate: (value: DateTimeInput, options?: { isUtc?: boolean }) => string;
  formatTime: (value: DateTimeInput, options?: { isUtc?: boolean }) => string;
  formatDateTime: (value: DateTimeInput, options?: { isUtc?: boolean }) => string;
}

/**
 * Format dates and times in your own components exactly as noviq-ui formats them, using the
 * patterns from `NoviqUIConfigProvider`. Unreadable values are returned as they were.
 */
export function useDateTimeFormatters(): DateTimeFormatters {
  const formats = useDateTimeFormats();
  const formatDate = useCallback(
    (value: DateTimeInput, options?: { isUtc?: boolean }) =>
      formatValue(value, formats.date, options?.isUtc, formats.locale, formats.periods),
    [formats.date, formats.locale, formats.periods]
  );
  const formatTime = useCallback(
    (value: DateTimeInput, options?: { isUtc?: boolean }) =>
      formatValue(value, formats.time, options?.isUtc, formats.locale, formats.periods),
    [formats.time, formats.locale, formats.periods]
  );
  const formatDateTime = useCallback(
    (value: DateTimeInput, options?: { isUtc?: boolean }) =>
      formatValue(value, formats.dateTime, options?.isUtc, formats.locale, formats.periods),
    [formats.dateTime, formats.locale, formats.periods]
  );
  return { formats, formatDate, formatTime, formatDateTime };
}
