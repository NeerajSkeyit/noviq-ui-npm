import React from "react";
import Badge from "../Badge/Badge";
import {
  BADGE_VARIANT,
  CELL_TYPE,
  DEFAULT_CURRENCY,
  NO_TEXT_PLACEHOLDER,
  type CellType,
} from "../../constants";
import { formatDatePart, formatDateTime, formatDuration, formatTimePart } from "./dateFormat";
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

export function formatTableCellValues(type: CellType, options: CellFormatOptions = {}): string {
  const { isUtc } = options;

  switch (type) {
    case CELL_TYPE.DATE:
      return options.date ? formatDatePart(options.date, isUtc) : NO_TEXT_PLACEHOLDER;

    case CELL_TYPE.DATE_RANGE:
      if (!options.fromDate && !options.toDate) return NO_TEXT_PLACEHOLDER;
      return `${options.fromDate ? formatDatePart(options.fromDate, isUtc) : NO_TEXT_PLACEHOLDER} - ${
        options.toDate ? formatDatePart(options.toDate, isUtc) : NO_TEXT_PLACEHOLDER
      }`;

    case CELL_TYPE.DATE_TIME:
      return options.dateTime ? formatDateTime(options.dateTime, isUtc) : NO_TEXT_PLACEHOLDER;

    case CELL_TYPE.DATE_TIME_RANGE:
      if (!options.fromDateTime && !options.toDateTime) return NO_TEXT_PLACEHOLDER;
      return `${
        options.fromDateTime ? formatDateTime(options.fromDateTime, isUtc) : NO_TEXT_PLACEHOLDER
      } - ${options.toDateTime ? formatDateTime(options.toDateTime, isUtc) : NO_TEXT_PLACEHOLDER}`;

    case CELL_TYPE.TIME:
      return options.time ? formatTimePart(options.time, isUtc) : NO_TEXT_PLACEHOLDER;

    case CELL_TYPE.TIME_RANGE:
      if (!options.fromTime && !options.toTime) return NO_TEXT_PLACEHOLDER;
      return `${options.fromTime ? formatTimePart(options.fromTime, isUtc) : NO_TEXT_PLACEHOLDER} - ${
        options.toTime ? formatTimePart(options.toTime, isUtc) : NO_TEXT_PLACEHOLDER
      }`;

    case CELL_TYPE.DURATION:
      if (options.duration == null || options.duration === "") return NO_TEXT_PLACEHOLDER;
      return formatDuration(options.duration);

    case CELL_TYPE.CURRENCY:
      return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: options.currency || DEFAULT_CURRENCY,
        maximumFractionDigits: options.maximumFractionDigits ?? 2,
      }).format(options.value ?? 0);

    default:
      return "Invalid cell type. Please provide a valid type and options.";
  }
}

const DEFAULT_STATUS_VARIANTS: Record<string, string> = {
  active: "status-success",
  true: "status-success",
  approved: "status-success",
  completed: "status-success",
  resolved: "status-success",

  inactive: "status-danger",
  false: "status-danger",
  rejected: "status-danger",
  cancelled: "status-danger",
  failed: "status-danger",

  pending: "status-warning",
  queued: "status-warning",

  "in progress": "status-info",
};

export interface TableCellProps {
  type: CellType;
  options?: CellFormatOptions;
  /** Extend/override the status -> tone mapping used by the `status` cell type. */
  statusVariantMap?: Record<string, string>;
}

export function formatStatusLabel(status: string): string {
  if (status === "true") return "Active";
  if (status === "false") return "Inactive";
  return status.replace(/_/g, " ");
}

function TableCell({ type, options = {}, statusVariantMap }: TableCellProps) {
  if (type === CELL_TYPE.STATUS) {
    if (!options.status) return <>{NO_TEXT_PLACEHOLDER}</>;

    const key = options.status.trim().toLowerCase();
    const variantClass =
      statusVariantMap?.[key] ?? DEFAULT_STATUS_VARIANTS[key] ?? "status-default";

    return (
      <Badge variant={BADGE_VARIANT.OUTLINE} className={variantClass}>
        {formatStatusLabel(options.status)}
      </Badge>
    );
  }

  return <>{formatTableCellValues(type, options)}</>;
}

export default TableCell;
