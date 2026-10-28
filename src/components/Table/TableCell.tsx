import React from "react";
import Badge from "../Badge/Badge";
import {
  BADGE_VARIANT,
  CELL_TYPE,
  DEFAULT_CURRENCY,
  DEFAULT_TEXT,
  NO_TEXT_PLACEHOLDER,
  type CellType,
} from "../../constants";
import { formatDuration } from "./dateFormat";
import { formatValue, resolveFormats, type FormatsInput } from "../../utils/dateTimeFormat";
import { formatCurrency } from "../../utils/numberFormat";
import { useDateTimeFormats } from "../../hooks/useDateTimeFormats";
import { useNoviqUIConfig } from "../../config/NoviqUIConfigProvider";
import { resolveText } from "../../utils/text";
import type { NoviqUIText } from "../../config/types";
import "./TableCell.css";

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

const DEFAULT_STATUS_VARIANTS: Record<string, string> = {
  active: "nq-status-success",
  true: "nq-status-success",
  approved: "nq-status-success",
  completed: "nq-status-success",
  resolved: "nq-status-success",

  inactive: "nq-status-danger",
  false: "nq-status-danger",
  rejected: "nq-status-danger",
  cancelled: "nq-status-danger",
  failed: "nq-status-danger",

  pending: "nq-status-warning",
  queued: "nq-status-warning",

  "in progress": "nq-status-info",
};

export interface TableCellProps {
  type: CellType;
  options?: CellFormatOptions;
  /** Extend/override the status -> tone mapping used by the `status` cell type. */
  statusVariantMap?: Record<string, string>;
}

/** A status as it is shown: `"true"`/`"false"` read as Active/Inactive (in the configured `text`),
 * anything else has its underscores turned to spaces. */
export function formatStatusLabel(status: string, text?: NoviqUIText): string {
  if (status === "true") return resolveText(DEFAULT_TEXT, text, "statusActive");
  if (status === "false") return resolveText(DEFAULT_TEXT, text, "statusInactive");
  return status.replace(/_/g, " ");
}

function TableCell({ type, options = {}, statusVariantMap }: TableCellProps) {
  const formats = useDateTimeFormats();
  const text = useNoviqUIConfig()?.text;
  if (type === CELL_TYPE.STATUS) {
    if (!options.status) return <>{NO_TEXT_PLACEHOLDER}</>;

    const key = options.status.trim().toLowerCase();
    const variantClass =
      statusVariantMap?.[key] ?? DEFAULT_STATUS_VARIANTS[key] ?? "nq-status-default";

    return (
      <Badge variant={BADGE_VARIANT.OUTLINE} className={variantClass}>
        {formatStatusLabel(options.status, text)}
      </Badge>
    );
  }

  return <>{formatTableCellValues(type, options, formats)}</>;
}

export default TableCell;
