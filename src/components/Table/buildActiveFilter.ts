import { formatDatePart } from "./dateFormat";

export const FILTER_TYPE = {
  SEARCH: "search",
  DATE: "date",
  SELECT: "select",
  DATE_RANGE: "dateRange",
  MONTH: "month",
} as const;

export type FilterType = (typeof FILTER_TYPE)[keyof typeof FILTER_TYPE];

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

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function isBlank(value: unknown): boolean {
  return value === undefined || value === null || value === "";
}

export function buildActiveFilter(config: FilterConfig, rawValue: unknown): ActiveFilter | null {
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
        displayValue = `${formatDatePart(from!)} → ${formatDatePart(to!)}`;
      } else if (!isBlank(from)) {
        displayValue = `From ${formatDatePart(from!)}`;
      } else {
        displayValue = `Until ${formatDatePart(to!)}`;
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
          ? { [config.monthKey ?? "month"]: monthStr, [config.yearKey ?? "year"]: yearStr }
          : { [config.id]: rawValue };
      return { ...base, displayValue, apiPayload };
    }

    case FILTER_TYPE.DATE: {
      if (isBlank(rawValue)) return null;
      return {
        ...base,
        displayValue: formatDatePart(rawValue as string),
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
