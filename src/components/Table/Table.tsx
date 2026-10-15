import React, { useCallback, useEffect, useMemo, useState } from "react";
import { QueryClient, QueryClientProvider, useQuery } from "@tanstack/react-query";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import ActionBar, { type ActionBarAction } from "./ActionBar";
import TablePagination, { type TablePaginationState } from "./TablePagination";
import TableCell from "./TableCell";
import EmptyState from "./EmptyState";
import LoadingOverlay from "./LoadingOverlay";
import ColumnSelector from "./ColumnSelector";
import Checkbox from "../Checkbox/Checkbox";
import RowActionsMenu, { type RowAction } from "./RowActionsMenu";
import BulkActionsBar, { type BulkAction } from "./BulkActionsBar";
import FilterDrawer from "./FilterDrawer";
import FilterChips from "./FilterChips";
import Export from "./Export";
import useTableExport, { getExportCellValue } from "./useTableExport";
import { buildActiveFilter, type FilterConfig, type ActiveFilter } from "./buildActiveFilter";
import { useTableColumnSettings } from "./useTableColumnSettings";
import {
  ACTIONS_COLUMN_WIDTH,
  CELL_TYPE,
  DEFAULT_COLUMN_WIDTH,
  DEFAULT_EXPORT_FILE_BASE,
  DEFAULT_PAGE_SIZE,
  DEFAULT_PAGE_SIZE_OPTIONS,
  DEFAULT_REQUEST_PARAMS,
  NO_TEXT_PLACEHOLDER,
  SEARCH_DEBOUNCE_MS,
  SELECT_COLUMN_WIDTH,
  SORT_DIRECTION,
  TABLE_COLUMN_ID,
  type CellType,
  type ColumnAlign,
  type SortDirection,
  type StickyPosition,
} from "../../constants";
import { getCellValue, buildCellFormatOptions } from "./cellValue";
import { useNoviqUIConfig } from "../../config/NoviqUIConfigProvider";
import { useDateTimeFormats } from "../../hooks/useDateTimeFormats";
import { extractRows, extractTotal } from "../../config/responseFormat";
import type { TableResponseFormat } from "../../config/types";
import "./Table.css";

function columnWidthPx(width: string | number | undefined): number {
  if (typeof width === "number") return width;
  if (typeof width === "string") {
    const parsed = parseInt(width, 10);
    if (!Number.isNaN(parsed)) return parsed;
  }
  return DEFAULT_COLUMN_WIDTH;
}

export interface TableColumn<T = any> {
  id: string;
  heading: string;
  accessorKey?: string;
  cell?: (row: T, cellValue: string, rawRow: T) => React.ReactNode;
  type?: CellType;
  sortable?: boolean;
  align?: ColumnAlign;
  width?: string | number;
  capitalize?: boolean;
  capitalizeEveryWord?: boolean;
  lowercase?: boolean;
  uppercase?: boolean;
  isUtc?: boolean;
  currency?: string;
  maximumFractionDigits?: number;
  fromDate?: string;
  toDate?: string;
  fromDateTime?: string;
  toDateTime?: string;
  fromTime?: string;
  toTime?: string;
  /** Default visibility (before any user customization). Defaults to visible. */
  visible?: boolean;
  /** Default sticky pin side (before any user customization). */
  sticky?: StickyPosition;
  /** Include this column in Excel/CSV export. Defaults to `true`. */
  export?: boolean;
  /** Custom export cell value, overriding the default accessor/formatting-based value. */
  exportValue?: (row: T) => string | number;
}

export type TableQueryParams = Record<string, unknown>;

export interface TableProps<T = any> {
  columns: TableColumn<T>[];
  /** Stable identifier — when set, column visibility/order/sticky-pin settings persist to
   * localStorage under this key. Omit to keep column customization in-memory only. */
  id?: string;
  isColumnSettingHidden?: boolean;
  /** Consumer-supplied fetcher. Ignored when `preFetchedData` is non-empty. */
  apiFunction?: (params: TableQueryParams) => Promise<unknown>;
  /** Overrides the NoviqUIConfigProvider's table.responseFormat for this instance only. */
  responseFormat?: TableResponseFormat<T>;
  /** Fully-controlled mode: skip fetching, render this array directly. */
  preFetchedData?: T[];
  isPrefetchedDataLoading?: boolean;
  /** Extra params merged into every apiFunction call — memoize this. */
  apiParams?: Record<string, unknown>;
  /** Any value; changing it forces a refetch (e.g. after a mutation). */
  updateList?: unknown;
  /** Disables fetching entirely (e.g. defer until a modal opens). */
  hidden?: boolean;
  isSearchHidden?: boolean;
  isPaginationHidden?: boolean;
  searchPlaceholder?: string;
  actions?: ActionBarAction[];
  emptyMessage?: string;
  statusVariantMap?: Record<string, string>;
  pageSizeOptions?: readonly number[];
  onRowClick?: (row: T) => void;
  /** Presence enables row selection (an auto-injected, always-sticky-left checkbox column). */
  getRowId?: (row: T) => string;
  /** Presence adds an auto-injected, always-sticky-right actions column. */
  rowActions?: (row: T) => RowAction<T>[];
  /** Render `rowActions` inline instead of grouped into a "..." dropdown. Required for a
   * `variant: "reject"` action's confirm-with-reason popover — that variant is only handled
   * specially in inline mode, matching the source component's behavior. */
  isRowActionsWithoutDropdown?: boolean;
  bulkActions?: BulkAction[];
  onRowSelectionChange?: (selectedIds: string[]) => void;
  /** Presence enables the "Filters" drawer + active-filter chip row. */
  filterConfigs?: FilterConfig[];
  /** Base file name for exports, e.g. `"employees"` -> `employees.xlsx`/`employees.csv`. */
  exportFileName?: string;
  isExportHidden?: boolean;
  /** Skip real export and open this pre-generated report link instead (hides the CSV option). */
  responseSheetUrl?: string;
}

function TableInner<T extends Record<string, any> = any>({
  columns,
  id,
  isColumnSettingHidden = false,
  apiFunction,
  responseFormat: responseFormatProp,
  preFetchedData = [],
  isPrefetchedDataLoading = false,
  apiParams,
  updateList,
  hidden = false,
  isSearchHidden = false,
  isPaginationHidden = false,
  searchPlaceholder,
  actions,
  emptyMessage,
  statusVariantMap,
  pageSizeOptions = DEFAULT_PAGE_SIZE_OPTIONS,
  onRowClick,
  getRowId,
  rowActions,
  isRowActionsWithoutDropdown = false,
  bulkActions = [],
  onRowSelectionChange,
  filterConfigs = [],
  exportFileName = DEFAULT_EXPORT_FILE_BASE,
  isExportHidden = false,
  responseSheetUrl,
}: TableProps<T>) {
  const columnSettings = useTableColumnSettings(id, columns);
  const isRowSelectionEnabled = typeof getRowId === "function";

  const displayColumns = useMemo(() => {
    return columnSettings.columnOrder
      .filter((colId) => columnSettings.visibleColumns.includes(colId))
      .map((colId) => columns.find((c) => c.id === colId))
      .filter((c): c is TableColumn<T> => c !== undefined);
  }, [columns, columnSettings.columnOrder, columnSettings.visibleColumns]);

  // "select" and "actions" are auto-injected, always sticky, and not part of
  // the consumer's `columns` config or the column-management pipeline above —
  // matching the source's behavior of always pinning them to the outer edges.
  const renderColumns = useMemo(() => {
    const cols: TableColumn<T>[] = [];
    if (isRowSelectionEnabled) cols.push({ id: TABLE_COLUMN_ID.SELECT, heading: "", width: SELECT_COLUMN_WIDTH } as TableColumn<T>);
    cols.push(...displayColumns);
    if (rowActions) cols.push({ id: TABLE_COLUMN_ID.ACTIONS, heading: "Actions", width: ACTIONS_COLUMN_WIDTH } as TableColumn<T>);
    return cols;
  }, [displayColumns, isRowSelectionEnabled, rowActions]);

  const stickyOffsets = useMemo(() => {
    const offsets: Record<string, { left?: number; right?: number }> = {};
    let lastLeftId: string | null = null;
    let lastRightId: string | null = null;

    const isStickyLeft = (col: TableColumn<T>) =>
      col.id === TABLE_COLUMN_ID.SELECT || columnSettings.stickyColumns.left.includes(col.id);
    const isStickyRight = (col: TableColumn<T>) =>
      col.id === TABLE_COLUMN_ID.ACTIONS || columnSettings.stickyColumns.right.includes(col.id);

    let leftAcc = 0;
    for (const col of renderColumns) {
      if (isStickyLeft(col)) {
        offsets[col.id] = { left: leftAcc };
        leftAcc += columnWidthPx(col.width);
        lastLeftId = col.id;
      }
    }

    let rightAcc = 0;
    for (let i = renderColumns.length - 1; i >= 0; i--) {
      const col = renderColumns[i];
      if (isStickyRight(col)) {
        offsets[col.id] = { ...offsets[col.id], right: rightAcc };
        rightAcc += columnWidthPx(col.width);
        lastRightId = col.id;
      }
    }

    return { offsets, boundary: { left: lastLeftId, right: lastRightId } };
  }, [renderColumns, columnSettings.stickyColumns]);

  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());

  useEffect(() => {
    onRowSelectionChange?.(Array.from(selectedRows));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedRows]);

  const handleRowSelect = (rowId: string, checked: boolean) => {
    if (!isRowSelectionEnabled) return;
    setSelectedRows((prev) => {
      const next = new Set(prev);
      if (checked) next.add(rowId);
      else next.delete(rowId);
      return next;
    });
  };

  const [searchValue, setSearchValue] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [pagination, setPagination] = useState<TablePaginationState>({
    page: 1,
    pageSize: pageSizeOptions[0] ?? DEFAULT_PAGE_SIZE,
  });
  const [sort, setSort] = useState<{ column: string | null; direction: SortDirection | null }>({
    column: null,
    direction: null,
  });

  // Session-only, in-memory (unlike column settings, filters don't persist to
  // localStorage — resetting on remount avoids a surprising "why is this still
  // filtered?" experience across reloads).
  const dateTimeFormats = useDateTimeFormats();
  const [activeFilters, setActiveFilters] = useState<ActiveFilter[]>(() =>
    filterConfigs
      .filter((c) => c.defaultValue !== undefined)
      .map((c) => buildActiveFilter(c, c.defaultValue, dateTimeFormats))
      .filter((f): f is ActiveFilter => f !== null)
  );

  const getFilterParams = useCallback(
    () => activeFilters.reduce((acc, f) => ({ ...acc, ...f.apiPayload }), {} as Record<string, unknown>),
    [activeFilters]
  );

  const handleApplyFilter = (newFilters: ActiveFilter[]) => {
    setActiveFilters((prev) => {
      const merged = new Map(prev.map((f) => [f.id, f]));
      for (const f of newFilters) merged.set(f.id, f);
      return Array.from(merged.values());
    });
    setPagination((p) => ({ ...p, page: 1 }));
  };

  const handleRemoveFilter = (filterId: string) => {
    setActiveFilters((prev) => prev.filter((f) => f.id !== filterId || f.mandatory));
    setPagination((p) => ({ ...p, page: 1 }));
  };

  const handleClearAllFilters = () => {
    setActiveFilters((prev) => prev.filter((f) => f.mandatory));
    setPagination((p) => ({ ...p, page: 1 }));
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchValue);
      setPagination((prev) => ({ ...prev, page: 1 }));
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [searchValue]);

  const noviqConfig = useNoviqUIConfig();
  const responseFormat = responseFormatProp ?? noviqConfig?.table?.responseFormat;
  const requestParamNames = { ...DEFAULT_REQUEST_PARAMS, ...noviqConfig?.table?.requestParams };

  const isUsingApiFunction = !!apiFunction && preFetchedData.length === 0 && !hidden;

  if (isUsingApiFunction && !responseFormat) {
    throw new Error(
      "noviq-ui: <Table> needs a response format. Wrap your app in " +
        '<NoviqUIConfigProvider config={{ table: { responseFormat: {...} } }}> or pass a ' +
        '"responseFormat" prop directly to this <Table>.'
    );
  }

  const queryKey = useMemo(
    () => ["noviq-ui-table", pagination, debouncedSearch, apiParams, updateList, activeFilters],
    [pagination, debouncedSearch, apiParams, updateList, activeFilters]
  );

  const { data: queryResult, isLoading: isQueryLoading } = useQuery({
    queryKey,
    queryFn: () =>
      apiFunction!({
        ...(apiParams as Record<string, unknown>),
        ...getFilterParams(),
        [requestParamNames.search]: debouncedSearch,
        [requestParamNames.page]: pagination.page,
        [requestParamNames.pageSize]: pagination.pageSize,
      }),
    enabled: isUsingApiFunction,
    retry: 3,
  });

  // Prefetched mode is "rows were handed to me", but also "there is no apiFunction to ask": with
  // neither, an empty array still means the caller is feeding the table, so
  // `isPrefetchedDataLoading` must apply while the first rows are still on their way.
  const usingPreFetched = preFetchedData.length > 0 || !apiFunction;

  // Run the response format only against a real response. `queryResult` is `undefined` until the
  // first request resolves; handing that to `getRows`/`getTotal` would force every consumer to
  // null-guard their own functions, and would make the dev-only "did not resolve" warning fire on
  // every initial load. Memoized so a genuinely mismatched response warns once, not per render.
  const extracted = useMemo(() => {
    if (!responseFormat || queryResult === undefined) {
      return { rows: [] as T[], total: 0 };
    }
    return {
      rows: extractRows<T>(queryResult, responseFormat),
      total: extractTotal(queryResult, responseFormat),
    };
  }, [queryResult, responseFormat]);

  const data: T[] = usingPreFetched ? preFetchedData : extracted.rows;
  const isLoading = usingPreFetched ? isPrefetchedDataLoading : isQueryLoading;

  // Rows handed over by the caller are searched here, against the text the visible columns show
  // (a date as "05/03/2024", a status as its label). With an `apiFunction` the term goes to the
  // server instead and the rows that come back are already the answer.
  const searchedData = useMemo(() => {
    const term = debouncedSearch.trim().toLowerCase();
    if (!usingPreFetched || term === "") return data;
    const textOf = (row: T, column: TableColumn<T>) => {
      const text = String(getExportCellValue(row, column, dateTimeFormats));
      return text === NO_TEXT_PLACEHOLDER ? "" : text.toLowerCase();
    };
    return data.filter((row) => displayColumns.some((column) => textOf(row, column).includes(term)));
  }, [data, debouncedSearch, usingPreFetched, displayColumns, dateTimeFormats]);

  const totalItems = usingPreFetched ? searchedData.length : extracted.total;

  const getRenderValue = useCallback(
    (row: T, column: TableColumn<T>, cellValue: string): React.ReactNode => {
      if (!column.type) {
        if (column.cell) return column.cell(row, cellValue, row);
        return cellValue;
      }

      return (
        <TableCell
          type={column.type}
          options={buildCellFormatOptions(row, column, cellValue)}
          statusVariantMap={statusVariantMap}
        />
      );
    },
    [statusVariantMap]
  );

  const sortedData = useMemo(() => {
    if (!sort.column || !sort.direction) return searchedData;
    const column = columns.find((c) => c.id === sort.column);
    if (!column) return searchedData;

    return [...searchedData].sort((a, b) => {
      const aValue = getCellValue(a, column);
      const bValue = getCellValue(b, column);
      return sort.direction === SORT_DIRECTION.ASC
        ? aValue.localeCompare(bValue)
        : bValue.localeCompare(aValue);
    });
  }, [searchedData, sort, columns]);

  // Handed-over rows are all here at once, so the pager is honoured client-side: one page of the
  // searched, sorted rows. A hidden pager means the caller wants every row shown. A page left
  // beyond the end (the rows shrank) shows the last one instead of an empty table.
  const pageCount = Math.max(1, Math.ceil(sortedData.length / pagination.pageSize));
  const currentPage = usingPreFetched ? Math.min(pagination.page, pageCount) : pagination.page;
  const shownPagination = { page: currentPage, pageSize: pagination.pageSize };
  const pageRows = useMemo(
    () =>
      usingPreFetched && !isPaginationHidden
        ? sortedData.slice((currentPage - 1) * pagination.pageSize, currentPage * pagination.pageSize)
        : sortedData,
    [usingPreFetched, isPaginationHidden, sortedData, currentPage, pagination.pageSize]
  );

  const { exportToExcel, exportToCSV, exporting } = useTableExport({
    apiFunction,
    responseFormat,
    requestParams: requestParamNames,
    usingPreFetched,
    preFetchedData: sortedData,
    columns: displayColumns,
    search: debouncedSearch,
    filterParams: getFilterParams(),
    apiParams,
    totalItems,
  });

  const handleSort = (columnId: string) => {
    setSort((prev) => {
      if (prev.column !== columnId) return { column: columnId, direction: SORT_DIRECTION.ASC };
      if (prev.direction === SORT_DIRECTION.ASC) return { column: columnId, direction: SORT_DIRECTION.DESC };
      return { column: null, direction: null };
    });
  };

  const handleSelectAll = (checked: boolean) => {
    if (!isRowSelectionEnabled) return;
    setSelectedRows(checked ? new Set(pageRows.map((row) => getRowId!(row))) : new Set());
  };

  const allSelected =
    isRowSelectionEnabled && pageRows.length > 0 && pageRows.every((row) => selectedRows.has(getRowId!(row)));

  const renderSortIcon = (columnId: string) => {
    if (sort.column !== columnId) return <ArrowUpDown size={14} className="table-sort-icon" />;
    if (sort.direction === SORT_DIRECTION.ASC)
      return <ArrowUp size={14} className="table-sort-icon table-sort-icon-active" />;
    return <ArrowDown size={14} className="table-sort-icon table-sort-icon-active" />;
  };

  const stickyStyle = (columnId: string): React.CSSProperties | undefined => {
    const offset = stickyOffsets.offsets[columnId];
    if (!offset) return undefined;
    return {
      position: "sticky",
      left: offset.left,
      right: offset.right,
      zIndex: 2,
    };
  };

  const stickyClass = (columnId: string): string => {
    if (!stickyOffsets.offsets[columnId]) return "";
    if (columnId === stickyOffsets.boundary.left) return "table-cell-sticky table-cell-sticky-boundary-left";
    if (columnId === stickyOffsets.boundary.right) return "table-cell-sticky table-cell-sticky-boundary-right";
    return "table-cell-sticky";
  };

  return (
    <div className="table-wrapper">
      <ActionBar
        isSearchHidden={isSearchHidden}
        searchValue={searchValue}
        onSearchChange={setSearchValue}
        searchPlaceholder={searchPlaceholder}
        actions={actions}
        filters={
          filterConfigs.length > 0 ? (
            <FilterDrawer
              filters={filterConfigs}
              activeFilters={activeFilters}
              onApplyFilter={handleApplyFilter}
              onRemoveFilter={handleRemoveFilter}
              onClearAll={handleClearAllFilters}
            />
          ) : undefined
        }
        exportControl={
          !isExportHidden ? (
            <Export
              exportToExcel={exportToExcel}
              exportToCSV={exportToCSV}
              exporting={exporting}
              responseSheetUrl={responseSheetUrl}
              fileNameBase={exportFileName}
            />
          ) : undefined
        }
        columnSelector={
          !isColumnSettingHidden && columns.length > 0 ? (
            <ColumnSelector
              columns={columns}
              visibleColumns={columnSettings.visibleColumns}
              columnOrder={columnSettings.columnOrder}
              stickyColumns={columnSettings.stickyColumns}
              onVisibilityChange={columnSettings.setVisibility}
              onReorder={columnSettings.setOrder}
              onStickyChange={columnSettings.setStickyState}
              onReset={columnSettings.reset}
            />
          ) : undefined
        }
      />

      {activeFilters.length > 0 && (
        <FilterChips filters={activeFilters} onRemove={handleRemoveFilter} onClearAll={handleClearAllFilters} />
      )}

      {isRowSelectionEnabled && (
        <BulkActionsBar
          selectedCount={selectedRows.size}
          actions={bulkActions}
          selectedIds={Array.from(selectedRows)}
          onClearSelection={() => setSelectedRows(new Set())}
        />
      )}

      <div className="table-scroll-container">
        {isLoading && <LoadingOverlay />}
        <table className="table">
          <thead>
            <tr>
              {renderColumns.map((column) => (
                <th
                  key={column.id}
                  className={`table-th ${column.sortable ? "table-th-sortable" : ""} ${
                    column.align ? `table-align-${column.align}` : ""
                  } ${stickyClass(column.id)}`}
                  style={{ width: column.width, ...stickyStyle(column.id) }}
                  onClick={() => column.sortable && handleSort(column.id)}
                >
                  {column.id === TABLE_COLUMN_ID.SELECT ? (
                    <Checkbox checked={!!allSelected} onChange={handleSelectAll} />
                  ) : (
                    <span className="table-th-content">
                      {column.heading}
                      {column.sortable && renderSortIcon(column.id)}
                    </span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageRows.length === 0 ? (
              <tr>
                <td colSpan={renderColumns.length}>
                  {isLoading ? (
                    // Nothing has arrived yet. "No data found" would show through the
                    // translucent spinner overlay and read as a verdict, not a wait, so reserve
                    // the same space and say nothing.
                    <div className="table-empty-state table-empty-state-pending" aria-hidden="true" />
                  ) : (
                    <EmptyState message={emptyMessage} />
                  )}
                </td>
              </tr>
            ) : (
              pageRows.map((row, rowIndex) => {
                const rowId = isRowSelectionEnabled ? getRowId!(row) : undefined;
                const isSelected = !!rowId && selectedRows.has(rowId);

                return (
                <tr
                  key={rowId ?? rowIndex}
                  className={onRowClick ? "table-row-clickable" : ""}
                  onClick={(e) => {
                    if (!onRowClick) return;
                    const target = e.target as HTMLElement;
                    if (target.closest("button, input, [data-stop-row-click]")) return;
                    onRowClick(row);
                  }}
                >
                  {renderColumns.map((column) => {
                    if (column.id === TABLE_COLUMN_ID.SELECT) {
                      return (
                        <td
                          key={column.id}
                          className={stickyClass(column.id)}
                          style={stickyStyle(column.id)}
                        >
                          <Checkbox
                            checked={isSelected}
                            onChange={(checked) => rowId && handleRowSelect(rowId, checked)}
                          />
                        </td>
                      );
                    }
                    if (column.id === TABLE_COLUMN_ID.ACTIONS) {
                      return (
                        <td
                          key={column.id}
                          className={stickyClass(column.id)}
                          style={stickyStyle(column.id)}
                        >
                          <RowActionsMenu
                            actions={rowActions!(row)}
                            row={row}
                            rowIndex={rowIndex}
                            pagination={shownPagination}
                            isWithoutDropdown={isRowActionsWithoutDropdown}
                          />
                        </td>
                      );
                    }

                    const cellValue = getCellValue(row, column);
                    return (
                      <td
                        key={column.id}
                        className={`${column.align ? `table-align-${column.align}` : ""} ${stickyClass(
                          column.id
                        )}`}
                        style={stickyStyle(column.id)}
                      >
                        {getRenderValue(row, column, cellValue)}
                      </td>
                    );
                  })}
                </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {!isPaginationHidden && (
        <TablePagination
          pagination={shownPagination}
          totalItems={totalItems}
          onPageChange={(page) => setPagination((prev) => ({ ...prev, page }))}
          onPageSizeChange={(pageSize) => setPagination({ page: 1, pageSize })}
          pageSizeOptions={pageSizeOptions}
        />
      )}
    </div>
  );
}

// Table owns its own QueryClient so consumers don't need to set up
// @tanstack/react-query themselves — it's an internal implementation detail,
// not something the host app should have to know about. Created once per
// Table instance (not per render).
function Table<T extends Record<string, any> = any>(props: TableProps<T>) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <TableInner {...props} />
    </QueryClientProvider>
  );
}

export default Table;
