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

/** Matches today's fixed names, so an app that never sets requestParams sees no change. */
export const DEFAULT_REQUEST_PARAMS: Required<TableRequestParamNames> = {
  search: "search",
  page: "page_no",
  pageSize: "rows_per_page",
};

export interface NoviqUITableConfig {
  responseFormat: TableResponseFormat;
  requestParams?: TableRequestParamNames;
}

export type NotifyKind = "success" | "error";

/**
 * Receives user-facing feedback the library produces (today: the outcome of a Table export).
 * Route it into whatever notification system the app already has, e.g.
 * `(message, kind) => toast[kind](message)` with react-hot-toast.
 */
export type NotifyFn = (message: string, kind: NotifyKind) => void;

export interface NoviqUIConfig {
  /** Required only if the app renders a `<Table apiFunction>` without a per-instance `responseFormat`. */
  table?: NoviqUITableConfig;
  /** Optional. With none configured the library stays silent (a failed export is still
   * `console.error`ed). */
  notify?: NotifyFn;
}
