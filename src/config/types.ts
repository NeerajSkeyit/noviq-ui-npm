import { DEFAULT_REQUEST_PARAMS, type NotifyKind } from "../constants";

export { DEFAULT_REQUEST_PARAMS };
export type { NotifyKind };

export interface ResponseFormatPaths {
  rowsPath: string;
  totalPath: string;
}

export interface ResponseFormatFns<T = any> {
  getRows: (raw: unknown) => T[];
  getTotal: (raw: unknown) => number;
}

/** Exactly one of the two variants — never both, never neither (enforced by NoviqUIConfigProvider). */
export type TableResponseFormat<T = any> = ResponseFormatPaths | ResponseFormatFns<T>;

export interface TableRequestParamNames {
  search?: string;
  page?: string;
  pageSize?: string;
}

export interface NoviqUITableConfig {
  responseFormat: TableResponseFormat;
  requestParams?: TableRequestParamNames;
}

/**
 * Receives user-facing feedback the library produces (today: the outcome of a Table export).
 * Route it into whatever notification system the app already has, e.g.
 * `(message, kind) => toast[kind](message)` with react-hot-toast.
 */
export type NotifyFn = (message: string, kind: NotifyKind) => void;

/**
 * Display patterns for dates and times, applied everywhere the UI shows one: Table cells, exports,
 * filter chips, and the date / month / time pickers. Moment-style tokens — see the README for the
 * full list; wrap literal text in `[square brackets]`. These are *display* formats only: values
 * you pass and receive (`"YYYY-MM-DD"`, `"HH:mm"`) never change.
 */
export interface NoviqUIFormats {
  /** Default `"DD/MM/YYYY"`. */
  date?: string;
  /** Default `"hh:mm A"`. */
  time?: string;
  /** Default: the date pattern, a space, then the time pattern. */
  dateTime?: string;
  /**
   * A BCP-47 language tag such as `"de-DE"` or `"fr-FR"`. It sets the language of month and weekday
   * names (`MMMM`, `ddd`, the calendar headings), how currency cells group and place their symbol,
   * and — unless `weekStart` says otherwise — which day the calendar's week starts on.
   * Default `"en-IN"`: English names, lakh/crore grouping, weeks starting on Sunday.
   */
  locale?: string;
  /**
   * ISO 4217 code a `currency` column uses when it sets none of its own, e.g. `"USD"`.
   * Default `"INR"`.
   */
  currency?: string;
  /**
   * The first day of the calendar's week: `0` = Sunday … `6` = Saturday. Default: the locale's own
   * first day when `locale` is set, otherwise Sunday.
   */
  weekStart?: number;
}

export interface NoviqUIConfig {
  /** Required only if the app renders a `<Table apiFunction>` without a per-instance `responseFormat`. */
  table?: NoviqUITableConfig;
  /** Optional. With none configured the library stays silent (a failed export is still
   * `console.error`ed). */
  notify?: NotifyFn;
  /** Optional. How dates, times and date-times are displayed across the UI. */
  formats?: NoviqUIFormats;
}
