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

export interface NoviqUIConfig {
  table: NoviqUITableConfig;
}
