import { formatValue, resolveFormats, type ResolvedFormats } from "../../utils/dateTimeFormat";
import { FILTER_PAYLOAD_KEY, FILTER_TYPE, MONTH_NAMES, type FilterType } from "../../constants";

export interface FilterOption {
  value: string;
  label: string;
}

export interface FilterConfig {
  id: string;
  label: string;
  type: FilterType;
  mandatory?: boolean;
  defaultValue?: unknown;
  /** SELECT only. */
  options?: FilterOption[];
  /** DATE_RANGE only — apiPayload key names. Default to `${id}From`/`${id}To`. */
  startDateKey?: string;
  endDateKey?: string;
  /** MONTH only — split month/year apiPayload keys. Defaults to a single
   * `{[id]: "YYYY-MM"}` payload when omitted. */
  monthKey?: string;
  yearKey?: string;
}

export interface ActiveFilter {
  id: string;
  label: string;
  displayValue: string;
  mandatory?: boolean;
  apiPayload: Record<string, unknown>;
}

export interface DateRangeValue {
  from?: string;
  to?: string;
}

function isBlank(value: unknown): boolean {
  return value === undefined || value === null || value === "";
}

/**
 * Turns a filter's raw value into an active filter: a chip label plus the payload for the backend.
 * `formats` decide how dates read in the chip; the payload keeps the raw `"YYYY-MM-DD"` values.
 */
export function buildActiveFilter(
  config: FilterConfig,
  rawValue: unknown,
  formats: ResolvedFormats = resolveFormats()
): ActiveFilter | null {
  const formatDate = (value: string) => formatValue(value, formats.date);
  const base = { id: config.id, label: config.label, mandatory: config.mandatory };

  switch (config.type) {
    case FILTER_TYPE.SELECT: {
      const values = Array.isArray(rawValue) ? (rawValue as string[]).filter((v) => !isBlank(v)) : [];
      if (values.length === 0) return null;
      const labels = values.map((v) => config.options?.find((o) => o.value === v)?.label ?? v);
      return {
        ...base,
        displayValue: labels.join(", "),
        apiPayload: { [config.id]: values.join(",") },
      };
    }

    case FILTER_TYPE.DATE_RANGE: {
      const { from, to } = (rawValue as DateRangeValue) ?? {};
      if (isBlank(from) && isBlank(to)) return null;
      const startKey = config.startDateKey ?? `${config.id}From`;
      const endKey = config.endDateKey ?? `${config.id}To`;
      const apiPayload: Record<string, unknown> = {};
      if (!isBlank(from)) apiPayload[startKey] = from;
      if (!isBlank(to)) apiPayload[endKey] = to;

      let displayValue: string;
      if (!isBlank(from) && !isBlank(to)) {
        displayValue = `${formatDate(from!)} → ${formatDate(to!)}`;
      } else if (!isBlank(from)) {
        displayValue = `From ${formatDate(from!)}`;
      } else {
        displayValue = `Until ${formatDate(to!)}`;
      }

      return { ...base, displayValue, apiPayload };
    }

    case FILTER_TYPE.MONTH: {
      if (isBlank(rawValue)) return null;
      const [yearStr, monthStr] = (rawValue as string).split("-");
      const monthIndex = Number(monthStr) - 1;
      const displayValue = `${MONTH_NAMES[monthIndex] ?? monthStr} ${yearStr}`;
      const apiPayload =
        config.monthKey || config.yearKey
          ? {
              [config.monthKey ?? FILTER_PAYLOAD_KEY.MONTH]: monthStr,
              [config.yearKey ?? FILTER_PAYLOAD_KEY.YEAR]: yearStr,
            }
          : { [config.id]: rawValue };
      return { ...base, displayValue, apiPayload };
    }

    case FILTER_TYPE.DATE: {
      if (isBlank(rawValue)) return null;
      return {
        ...base,
        displayValue: formatDate(rawValue as string),
        apiPayload: { [config.id]: rawValue },
      };
    }

    case FILTER_TYPE.SEARCH:
    default: {
      if (isBlank(rawValue) || (typeof rawValue === "string" && rawValue.trim() === "")) return null;
      return {
        ...base,
        displayValue: String(rawValue),
        apiPayload: { [config.id]: rawValue },
      };
    }
  }
}
