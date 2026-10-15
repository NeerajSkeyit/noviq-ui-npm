import { useCallback, useMemo } from "react";
import { useNoviqUIConfig } from "../config/NoviqUIConfigProvider";
import {
  formatValue,
  resolveFormats,
  type DateTimeInput,
  type ResolvedFormats,
} from "../utils/dateTimeFormat";

/** The date / time / date-time patterns in force: `NoviqUIConfigProvider`'s `formats`, or defaults. */
export function useDateTimeFormats(): ResolvedFormats {
  const formats = useNoviqUIConfig()?.formats;
  const { date, time, dateTime, locale, currency, weekStart } = formats ?? {};
  // Keyed on the values, not the object: apps commonly pass an inline `config={{...}}`.
  return useMemo(
    () => resolveFormats({ date, time, dateTime, locale, currency, weekStart }),
    [date, time, dateTime, locale, currency, weekStart]
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
      formatValue(value, formats.date, options?.isUtc, formats.locale),
    [formats.date, formats.locale]
  );
  const formatTime = useCallback(
    (value: DateTimeInput, options?: { isUtc?: boolean }) =>
      formatValue(value, formats.time, options?.isUtc, formats.locale),
    [formats.time, formats.locale]
  );
  const formatDateTime = useCallback(
    (value: DateTimeInput, options?: { isUtc?: boolean }) =>
      formatValue(value, formats.dateTime, options?.isUtc, formats.locale),
    [formats.dateTime, formats.locale]
  );
  return { formats, formatDate, formatTime, formatDateTime };
}
