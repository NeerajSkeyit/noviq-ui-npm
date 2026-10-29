import React, { useMemo } from "react";
import {
  CELL_TYPE,
  DEFAULT_CURRENCY,
  NO_TEXT_PLACEHOLDER,
  type CellType,
} from "../../constants";
import { formatDuration } from "./dateFormat";
import { formatValue, resolveFormats, type FormatsInput } from "../../utils/dateTimeFormat";
import { formatCurrency } from "../../utils/numberFormat";
import { useDateTimeFormats } from "../../hooks/useDateTimeFormats";
import { useNoviqUIConfig } from "../../config/NoviqUIConfigProvider";
import type { NoviqUIStatusConfig } from "../../config/types";
import { mergeStatusConfigs, resolveStatus, type MergedStatusConfig } from "./statusStyle";
import "../Badge/Badge.css"; // the pill's shape (`nq-badge`); its colours come from the status class
import "./TableCell.css";

export { formatStatusLabel } from "./statusStyle";

export interface CellFormatOptions {
  date?: string | number | Date | null;
  fromDate?: string | number | Date | null;
  toDate?: string | number | Date | null;
  dateTime?: string | number | Date | null;
  fromDateTime?: string | number | Date | null;
  toDateTime?: string | number | Date | null;
  time?: string | number | Date | null;
  fromTime?: string | number | Date | null;
  toTime?: string | number | Date | null;
  duration?: string | number | null;
  value?: number;
  currency?: string;
  maximumFractionDigits?: number;
  isUtc?: boolean;
  status?: string | null;
}

/**
 * Formats one cell value. `formats` are the resolved settings from `NoviqUIConfigProvider`'s
 * `formats` (patterns, locale, currency) — `useDateTimeFormatters().formats` gives them to you;
 * omit them for the defaults.
 */
export function formatTableCellValues(
  type: CellType,
  options: CellFormatOptions = {},
  formats: FormatsInput = resolveFormats()
): string {
  const { isUtc } = options;
  const dateOf = (v: string | number | Date) => formatValue(v, formats.date, isUtc, formats.locale, formats.periods);
  const timeOf = (v: string | number | Date) => formatValue(v, formats.time, isUtc, formats.locale, formats.periods);
  const dateTimeOf = (v: string | number | Date) =>
    formatValue(v, formats.dateTime, isUtc, formats.locale, formats.periods);

  switch (type) {
    case CELL_TYPE.DATE:
      return options.date ? dateOf(options.date) : NO_TEXT_PLACEHOLDER;

    case CELL_TYPE.DATE_RANGE:
      if (!options.fromDate && !options.toDate) return NO_TEXT_PLACEHOLDER;
      return `${options.fromDate ? dateOf(options.fromDate) : NO_TEXT_PLACEHOLDER} - ${
        options.toDate ? dateOf(options.toDate) : NO_TEXT_PLACEHOLDER
      }`;

    case CELL_TYPE.DATE_TIME:
      return options.dateTime ? dateTimeOf(options.dateTime) : NO_TEXT_PLACEHOLDER;

    case CELL_TYPE.DATE_TIME_RANGE:
      if (!options.fromDateTime && !options.toDateTime) return NO_TEXT_PLACEHOLDER;
      return `${
        options.fromDateTime ? dateTimeOf(options.fromDateTime) : NO_TEXT_PLACEHOLDER
      } - ${options.toDateTime ? dateTimeOf(options.toDateTime) : NO_TEXT_PLACEHOLDER}`;

    case CELL_TYPE.TIME:
      return options.time ? timeOf(options.time) : NO_TEXT_PLACEHOLDER;

    case CELL_TYPE.TIME_RANGE:
      if (!options.fromTime && !options.toTime) return NO_TEXT_PLACEHOLDER;
      return `${options.fromTime ? timeOf(options.fromTime) : NO_TEXT_PLACEHOLDER} - ${
        options.toTime ? timeOf(options.toTime) : NO_TEXT_PLACEHOLDER
      }`;

    case CELL_TYPE.DURATION:
      if (options.duration == null || options.duration === "") return NO_TEXT_PLACEHOLDER;
      return formatDuration(options.duration);

    case CELL_TYPE.CURRENCY:
      return formatCurrency(options.value ?? 0, {
        locale: formats.locale,
        currency: options.currency || formats.currency || DEFAULT_CURRENCY,
        maximumFractionDigits: options.maximumFractionDigits,
      });

    default:
      return "Invalid cell type. Please provide a valid type and options.";
  }
}

export interface TableCellProps {
  type: CellType;
  options?: CellFormatOptions;
  /** @deprecated Use `statuses.styles`; kept working. A status → class-name map for the `status` type. */
  statusVariantMap?: Record<string, string>;
  /**
   * How `status` cells look here: your own statuses, their classes and labels, a fallback class, or a
   * `render`. Laid over `NoviqUIConfigProvider`'s `statuses`, which is laid over the built-in tones.
   */
  statuses?: NoviqUIStatusConfig;
  /** The row, handed on to a custom status `render`. */
  row?: unknown;
  /** @internal What `Table` passes: its provider / table / column levels already merged, once per column. */
  mergedStatuses?: MergedStatusConfig;
}

function TableCell({ type, options = {}, statusVariantMap, statuses, row, mergedStatuses }: TableCellProps) {
  const formats = useDateTimeFormats();
  const config = useNoviqUIConfig();
  const text = config?.text;
  const providerStatuses = config?.statuses;
  const merged = useMemo(
    () => mergedStatuses ?? mergeStatusConfigs(providerStatuses, { styles: statusVariantMap }, statuses),
    [mergedStatuses, providerStatuses, statusVariantMap, statuses]
  );

  if (type === CELL_TYPE.STATUS) {
    if (!options.status) return <>{NO_TEXT_PLACEHOLDER}</>;

    const { label, className } = resolveStatus(options.status, merged, text);
    if (merged.render) return <>{merged.render({ status: options.status, label, className, row })}</>;
    // A plain pill, no Badge variant: nothing but the status class colours it, so a class of the app's
    // own can't lose to a variant's rule.
    return <div className={`nq-badge ${className}`}>{label}</div>;
  }

  return <>{formatTableCellValues(type, options, formats)}</>;
}

export default TableCell;
