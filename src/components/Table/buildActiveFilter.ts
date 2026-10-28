import {
  formatValue,
  getDateNames,
  resolveFormats,
  type FormatsInput,
} from "../../utils/dateTimeFormat";
import { DEFAULT_TEXT, FILTER_PAYLOAD_KEY, FILTER_TYPE, type FilterType } from "../../constants";
import { resolveText } from "../../utils/text";
import type { NoviqUIText } from "../../config/types";

export interface FilterOption {
  value: string;
  label: string;
}

export interface FilterConfig {
  id: string;
  label: string;
  type: FilterType;
  /**
   * The row field a `<Table preFetchedData>` reads to apply this filter on the client. Defaults to
   * `id`. (With an `apiFunction` the server filters, using the payload.)
   */
  accessorKey?: string;
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
  /**
   * What the filter holds, for applying it to rows already on the client: the chosen values (a
   * select), `{ from, to }` (a date range), or the text / date / `"YYYY-MM"`. `apiPayload` is
   * the same thing shaped for a backend.
   */
  value?: unknown;
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
 * `formats` decide how dates read in the chip and `text` the words around them ("From …",
 * "Until …"); the payload keeps the raw `"YYYY-MM-DD"` values.
 */
export function buildActiveFilter(
  config: FilterConfig,
  rawValue: unknown,
  formats: FormatsInput = resolveFormats(),
  text?: NoviqUIText
): ActiveFilter | null {
  const formatDate = (value: string) => formatValue(value, formats.date, false, formats.locale);
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
        value: values,
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
        displayValue = resolveText(DEFAULT_TEXT, text, "filterChipFrom", { date: formatDate(from!) });
      } else {
        displayValue = resolveText(DEFAULT_TEXT, text, "filterChipUntil", { date: formatDate(to!) });
      }

      const value: DateRangeValue = {};
      if (!isBlank(from)) value.from = from;
      if (!isBlank(to)) value.to = to;
      return { ...base, displayValue, apiPayload, value };
    }

    case FILTER_TYPE.MONTH: {
      if (isBlank(rawValue)) return null;
      const [yearStr, monthStr] = (rawValue as string).split("-");
      const monthIndex = Number(monthStr) - 1;
      const monthName = getDateNames(formats.locale).months[monthIndex];
      const displayValue = `${monthName ?? monthStr} ${yearStr}`;
      const apiPayload =
        config.monthKey || config.yearKey
          ? {
              [config.monthKey ?? FILTER_PAYLOAD_KEY.MONTH]: monthStr,
              [config.yearKey ?? FILTER_PAYLOAD_KEY.YEAR]: yearStr,
            }
          : { [config.id]: rawValue };
      return { ...base, displayValue, apiPayload, value: rawValue };
    }

    case FILTER_TYPE.DATE: {
      if (isBlank(rawValue)) return null;
      return {
        ...base,
        displayValue: formatDate(rawValue as string),
        apiPayload: { [config.id]: rawValue },
        value: rawValue,
      };
    }

    case FILTER_TYPE.SEARCH:
    default: {
      if (isBlank(rawValue) || (typeof rawValue === "string" && rawValue.trim() === "")) return null;
      return {
        ...base,
        displayValue: String(rawValue),
        apiPayload: { [config.id]: rawValue },
        value: rawValue,
      };
    }
  }
}
