import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { QueryClient, QueryClientProvider, useQuery } from "@tanstack/react-query";
import { ArrowDown, ArrowUp, ArrowUpDown } from "../Icon/Icon";
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
  ARIA_SORT,
  CELL_TYPE,
  DEFAULT_COLUMN_WIDTH,
  DEFAULT_EXPORT_FILE_BASE,
  DEFAULT_PAGE_SIZE,
  DEFAULT_PAGE_SIZE_OPTIONS,
  DEFAULT_REQUEST_PARAMS,
  DEFAULT_SORT_REQUEST_PARAMS,
  KEY,
  NO_TEXT_PLACEHOLDER,
  SEARCH_DEBOUNCE_MS,
  SELECT_COLUMN_WIDTH,
  SORT_DIRECTION,
  TABLE_COLUMN_ID,
  type AriaSort,
  type CellType,
  type ColumnAlign,
  type SortDirection,
  type StickyPosition,
  Z_INDEX,
} from "../../constants";
import { getCellValue, buildCellFormatOptions } from "./cellValue";
import { matchesFilter } from "./matchFilter";
import { useNoviqUIConfig } from "../../config/NoviqUIConfigProvider";
import { useDateTimeFormats } from "../../hooks/useDateTimeFormats";
import { useText } from "../../hooks/useText";
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
  /**
   * Custom cell content. `cellValue` is the accessor's value as trimmed text (`"-"` when empty);
   * `rawValue` is that same value untouched — a number, boolean, `null`, array… — `undefined`
   * for a column with no `accessorKey`.
   */
  cell?: (row: T, cellValue: string, rawRow: T, rawValue?: unknown) => React.ReactNode;
  type?: CellType;
  sortable?: boolean;
  /**
   * With `serverSort`, the field name sent to the server when this column is sorted. Defaults to
   * `accessorKey`, then to `id`.
   */
  sortKey?: string;
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
  /**
   * Sort on the server. Clicking a `sortable` header sends `sort_by` / `sort_order` (renamable via
   * `config.table.requestParams`) with the request and shows the rows as they come back, instead
   * of reordering the loaded page. The page goes back to 1, and an export is requested in the same
   * order. Ignored with `preFetchedData`, which is always sorted here.
   */
  serverSort?: boolean;
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
  serverSort = false,
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
  const t = useText();
  const renderColumns = useMemo(() => {
    const cols: TableColumn<T>[] = [];
    if (isRowSelectionEnabled) cols.push({ id: TABLE_COLUMN_ID.SELECT, heading: "", width: SELECT_COLUMN_WIDTH } as TableColumn<T>);
    cols.push(...displayColumns);
    if (rowActions) {
      cols.push({ id: TABLE_COLUMN_ID.ACTIONS, heading: t("tableActionsHeading"), width: ACTIONS_COLUMN_WIDTH } as TableColumn<T>);
    }
    return cols;
  }, [displayColumns, isRowSelectionEnabled, rowActions, t]);

  const isStickyLeft = (col: TableColumn<T>) =>
    col.id === TABLE_COLUMN_ID.SELECT || columnSettings.stickyColumns.left.includes(col.id);
  const isStickyRight = (col: TableColumn<T>) =>
    col.id === TABLE_COLUMN_ID.ACTIONS || columnSettings.stickyColumns.right.includes(col.id);
  const hasStickyColumns = renderColumns.some((col) => isStickyLeft(col) || isStickyRight(col));

  // A pinned column sits at the summed width of the pinned columns before it, so those widths
  // have to be right. `width` is only a hint (and 140 is a guess when it is absent), so while
  // anything is pinned the header cells are measured after layout and whenever the table
  // resizes. A column that can't be measured (not laid out yet, a hidden container, no
  // ResizeObserver) falls back to its declared width.
  const tableRef = useRef<HTMLTableElement>(null);
  const headerCells = useRef<Record<string, HTMLTableCellElement | null>>({});
  const [measuredWidths, setMeasuredWidths] = useState<Record<string, number>>({});

  const measureHeaders = useCallback(() => {
    const next: Record<string, number> = {};
    for (const [id, cell] of Object.entries(headerCells.current)) {
      const width = cell ? cell.getBoundingClientRect().width : 0;
      if (width > 0) next[id] = Math.round(width * 100) / 100;
    }
    setMeasuredWidths((prev) => {
      const ids = Object.keys(next);
      const unchanged = ids.length === Object.keys(prev).length && ids.every((id) => prev[id] === next[id]);
      return unchanged ? prev : next; // no new state, no re-render, no loop
    });
  }, []);

  useLayoutEffect(() => {
    if (hasStickyColumns) measureHeaders();
  }); // after every render: a width can change with the rows, a locale, a font

  useEffect(() => {
    if (!hasStickyColumns || typeof ResizeObserver === "undefined" || !tableRef.current) return;
    const observer = new ResizeObserver(measureHeaders);
    observer.observe(tableRef.current);
    return () => observer.disconnect();
  }, [hasStickyColumns, measureHeaders]);

  const stickyOffsets = useMemo(() => {
    const offsets: Record<string, { left?: number; right?: number }> = {};
    let lastLeftId: string | null = null;
    let lastRightId: string | null = null;

    const widthOf = (col: TableColumn<T>) => measuredWidths[col.id] ?? columnWidthPx(col.width);

    let leftAcc = 0;
    for (const col of renderColumns) {
      if (isStickyLeft(col)) {
        offsets[col.id] = { left: leftAcc };
        leftAcc += widthOf(col);
        lastLeftId = col.id;
      }
    }

    let rightAcc = 0;
    for (let i = renderColumns.length - 1; i >= 0; i--) {
      const col = renderColumns[i];
      if (isStickyRight(col)) {
        offsets[col.id] = { ...offsets[col.id], right: rightAcc };
        rightAcc += widthOf(col);
        lastRightId = col.id;
      }
    }

    return { offsets, boundary: { left: lastLeftId, right: lastRightId } };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [renderColumns, columnSettings.stickyColumns, measuredWidths]);

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
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false); // so a chip can reopen it
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
    // Nothing to apply when the box already matches what was last applied — notably on mount, when
    // the unconditional reset used to send a user who had paged within the first half second back
    // to page 1.
    if (searchValue === debouncedSearch) return;
    const timer = setTimeout(() => {
      setDebouncedSearch(searchValue);
      setPagination((prev) => ({ ...prev, page: 1 }));
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
    // `debouncedSearch` is only read to skip a no-op; it must not re-arm the timer.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchValue]);

  const noviqConfig = useNoviqUIConfig();
  const responseFormat = responseFormatProp ?? noviqConfig?.table?.responseFormat;
  const requestParamNames = {
    ...DEFAULT_REQUEST_PARAMS,
    ...DEFAULT_SORT_REQUEST_PARAMS,
    ...noviqConfig?.table?.requestParams,
  };

  const isUsingApiFunction = !!apiFunction && preFetchedData.length === 0 && !hidden;

  if (isUsingApiFunction && !responseFormat) {
    throw new Error(
      "noviq-ui: <Table> needs a response format. Wrap your app in " +
        '<NoviqUIConfigProvider config={{ table: { responseFormat: {...} } }}> or pass a ' +
        '"responseFormat" prop directly to this <Table>.'
    );
  }

  // The sort the server is asked for: nothing until a column is sorted, and only for a table that
  // opted in and is fetching. (Prefetched rows are sorted below.)
  const sortByName = requestParamNames.sortBy;
  const sortDirectionName = requestParamNames.sortDirection;
  const sortParams = useMemo<Record<string, unknown>>(() => {
    if (!serverSort || !isUsingApiFunction || !sort.column || !sort.direction) return {};
    const column = columns.find((c) => c.id === sort.column);
    if (!column) return {};
    return {
      [sortByName]: column.sortKey ?? column.accessorKey ?? column.id,
      [sortDirectionName]: sort.direction,
    };
  }, [serverSort, isUsingApiFunction, sort, columns, sortByName, sortDirectionName]);

  const queryKey = useMemo(
    () => ["noviq-ui-table", pagination, debouncedSearch, apiParams, updateList, activeFilters, sortParams],
    [pagination, debouncedSearch, apiParams, updateList, activeFilters, sortParams]
  );

  const { data: queryResult, isLoading: isQueryLoading } = useQuery({
    queryKey,
    queryFn: () =>
      apiFunction!({
        ...(apiParams as Record<string, unknown>),
        ...getFilterParams(),
        ...sortParams,
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

  // Rows handed over by the caller are filtered and searched here: there is no server to ask. The
  // filters (every one must pass) read the row's own fields; the search term is matched against the
  // text the visible columns show (a date as "05/03/2024", a status as its label). With an
  // `apiFunction` both go to the server instead and the rows that come back are already the answer.
  const filteredData = useMemo(() => {
    if (!usingPreFetched || activeFilters.length === 0) return data;
    const applied = activeFilters.flatMap((active) => {
      const config = filterConfigs.find((c) => c.id === active.id);
      return config ? [{ config, value: active.value }] : [];
    });
    return data.filter((row) => applied.every(({ config, value }) => matchesFilter(row, config, value)));
  }, [data, usingPreFetched, activeFilters, filterConfigs]);

  const searchedData = useMemo(() => {
    const term = debouncedSearch.trim().toLowerCase();
    if (!usingPreFetched || term === "") return filteredData;
    const textOf = (row: T, column: TableColumn<T>) => {
      const text = String(getExportCellValue(row, column, dateTimeFormats, noviqConfig?.text));
      return text === NO_TEXT_PLACEHOLDER ? "" : text.toLowerCase();
    };
    return filteredData.filter((row) => displayColumns.some((column) => textOf(row, column).includes(term)));
  }, [filteredData, debouncedSearch, usingPreFetched, displayColumns, dateTimeFormats, noviqConfig?.text]);

  const totalItems = usingPreFetched ? searchedData.length : extracted.total;

  const getRenderValue = useCallback(
    (row: T, column: TableColumn<T>, cellValue: string): React.ReactNode => {
      if (!column.type) {
        if (column.cell) {
          const rawValue = column.accessorKey ? (row as Record<string, unknown>)[column.accessorKey] : undefined;
          return column.cell(row, cellValue, row, rawValue);
        }
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
    // With serverSort the rows arrive in the order that was asked for; don't reorder them again.
    if (!sort.column || !sort.direction || (serverSort && !usingPreFetched)) return searchedData;
    const column = columns.find((c) => c.id === sort.column);
    if (!column) return searchedData;

    return [...searchedData].sort((a, b) => {
      const aValue = getCellValue(a, column);
      const bValue = getCellValue(b, column);
      return sort.direction === SORT_DIRECTION.ASC
        ? aValue.localeCompare(bValue)
        : bValue.localeCompare(aValue);
    });
  }, [searchedData, sort, columns, serverSort, usingPreFetched]);

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
    sortParams,
    apiParams,
    totalItems,
  });

  const handleSort = (columnId: string) => {
    // A different order on the server means different rows on every page: start again at page 1.
    if (serverSort && !usingPreFetched) setPagination((p) => ({ ...p, page: 1 }));
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
    if (sort.column !== columnId) return <ArrowUpDown size={14} className="nq-table-sort-icon" />;
    if (sort.direction === SORT_DIRECTION.ASC)
      return <ArrowUp size={14} className="nq-table-sort-icon nq-table-sort-icon-active" />;
    return <ArrowDown size={14} className="nq-table-sort-icon nq-table-sort-icon-active" />;
  };

  const ariaSortOf = (columnId: string): AriaSort => {
    if (sort.column !== columnId) return ARIA_SORT.NONE;
    if (sort.direction === SORT_DIRECTION.ASC) return ARIA_SORT.ASCENDING;
    return sort.direction === SORT_DIRECTION.DESC ? ARIA_SORT.DESCENDING : ARIA_SORT.NONE;
  };

  const stickyStyle = (columnId: string): React.CSSProperties | undefined => {
    const offset = stickyOffsets.offsets[columnId];
    if (!offset) return undefined;
    return {
      position: "sticky",
      left: offset.left,
      right: offset.right,
      zIndex: Z_INDEX.STICKY,
    };
  };

  const stickyClass = (columnId: string): string => {
    if (!stickyOffsets.offsets[columnId]) return "";
    if (columnId === stickyOffsets.boundary.left) return "nq-table-cell-sticky nq-table-cell-sticky-boundary-left";
    if (columnId === stickyOffsets.boundary.right) return "nq-table-cell-sticky nq-table-cell-sticky-boundary-right";
    return "nq-table-cell-sticky";
  };

  return (
    <div className="nq-table-wrapper">
      <ActionBar
        isSearchHidden={isSearchHidden}
        searchValue={searchValue}
        onSearchChange={setSearchValue}
        searchPlaceholder={searchPlaceholder}
        actions={actions}
        filters={
          filterConfigs.length > 0 ? (
            <FilterDrawer
              open={filterDrawerOpen}
              onOpenChange={setFilterDrawerOpen}
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
        <FilterChips
          filters={activeFilters}
          onRemove={handleRemoveFilter}
          onClearAll={handleClearAllFilters}
          onChipClick={() => setFilterDrawerOpen(true)}
        />
      )}

      {isRowSelectionEnabled && (
        <BulkActionsBar
          selectedCount={selectedRows.size}
          actions={bulkActions}
          selectedIds={Array.from(selectedRows)}
          onClearSelection={() => setSelectedRows(new Set())}
        />
      )}

      <div className="nq-table-scroll-container">
        {isLoading && <LoadingOverlay />}
        <table className="nq-table" ref={tableRef}>
          <thead>
            <tr>
              {renderColumns.map((column) => (
                <th
                  key={column.id}
                  ref={(el) => {
                    headerCells.current[column.id] = el;
                  }}
                  className={`nq-table-th ${column.sortable ? "nq-table-th-sortable" : ""} ${
                    column.align ? `nq-table-align-${column.align}` : ""
                  } ${stickyClass(column.id)}`}
                  style={{ width: column.width, ...stickyStyle(column.id) }}
                  onClick={() => column.sortable && handleSort(column.id)}
                  aria-sort={column.sortable ? ariaSortOf(column.id) : undefined}
                  tabIndex={column.sortable ? 0 : undefined}
                  onKeyDown={
                    column.sortable
                      ? (e) => {
                          if (e.key !== KEY.ENTER && e.key !== KEY.SPACE) return;
                          e.preventDefault(); // Space would otherwise scroll the page
                          handleSort(column.id);
                        }
                      : undefined
                  }
                >
                  {column.id === TABLE_COLUMN_ID.SELECT ? (
                    <Checkbox checked={!!allSelected} onChange={handleSelectAll} aria-label={t("tableSelectAll")} />
                  ) : (
                    <span className="nq-table-th-content">
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
                    <div className="nq-table-empty-state nq-table-empty-state-pending" aria-hidden="true" />
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
                  className={onRowClick ? "nq-table-row-clickable" : ""}
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
                            aria-label={t("tableSelectRow")}
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
                        className={`${column.align ? `nq-table-align-${column.align}` : ""} ${stickyClass(
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
