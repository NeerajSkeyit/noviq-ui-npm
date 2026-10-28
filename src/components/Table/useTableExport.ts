import { useState } from "react";
import type { TableColumn, TableQueryParams } from "./Table";
import {
  CELL_TYPE,
  CSV_MIME_TYPE,
  CSV_UTF8_BOM,
  DEFAULT_EXPORT_FILE_BASE,
  DEFAULT_TEXT,
  EXPORT_FALLBACK_ROWS_PER_PAGE,
  EXPORT_FILE_EXTENSION,
  EXPORT_HEADER_FILL,
  EXPORT_HEADER_TEXT_COLOR,
  EXPORT_MAX_COLUMN_WIDTH,
  EXPORT_MIN_COLUMN_WIDTH,
  EXPORT_SHEET_NAME,
  NOTIFY_KIND,
  NO_TEXT_PLACEHOLDER,
} from "../../constants";
import { getCellValue, buildCellFormatOptions } from "./cellValue";
import { formatTableCellValues, formatStatusLabel } from "./TableCell";
import { extractRows } from "../../config/responseFormat";
import { useNoviqUIConfig } from "../../config/NoviqUIConfigProvider";
import { useDateTimeFormats } from "../../hooks/useDateTimeFormats";
import type { ResolvedFormats } from "../../utils/dateTimeFormat";
import { useText } from "../../hooks/useText";
import type { NoviqUIText, NotifyFn, TableRequestParamNames, TableResponseFormat } from "../../config/types";


export interface UseTableExportArgs<T> {
  apiFunction?: (params: TableQueryParams) => Promise<unknown>;
  responseFormat?: TableResponseFormat<T>;
  requestParams?: Required<Pick<TableRequestParamNames, "search" | "page" | "pageSize">>;
  usingPreFetched: boolean;
  /** The already client-sorted array, used directly (no fetch) when `usingPreFetched`. */
  preFetchedData: T[];
  /** Already visibility-filtered/ordered columns (`export !== false` still applied here). */
  columns: TableColumn<T>[];
  search: string;
  filterParams: Record<string, unknown>;
  /** The sort the table is showing, as request params — so an export comes out in screen order. */
  sortParams?: Record<string, unknown>;
  apiParams?: Record<string, unknown>;
  totalItems: number;
  /** Where to report the outcome. Defaults to `NoviqUIConfigProvider`'s `config.notify`; when
   * neither is set the hook stays silent (a failure is still `console.error`ed). */
  notify?: NotifyFn;
}

export interface UseTableExportResult {
  exportToExcel: (fileName?: string) => Promise<void>;
  exportToCSV: (fileName?: string) => Promise<void>;
  exporting: boolean;
}

/** The text a column shows (or its `exportValue`) — what an export writes and a search matches. */
export function getExportCellValue<T>(
  row: T,
  column: TableColumn<T>,
  formats: ResolvedFormats,
  text?: NoviqUIText
): string | number {
  if (column.exportValue) return column.exportValue(row);

  const cellValue = getCellValue(row, column);
  if (!column.type) return cellValue;
  if (column.type === CELL_TYPE.STATUS) {
    return cellValue === NO_TEXT_PLACEHOLDER ? cellValue : formatStatusLabel(cellValue, text);
  }
  return formatTableCellValues(column.type, buildCellFormatOptions(row, column, cellValue), formats);
}

/** Characters wide that column `index` of the sheet needs: its widest cell, heading included. */
function exportColumnWidth(aoa: unknown[][], index: number): number {
  let widest = EXPORT_MIN_COLUMN_WIDTH;
  for (const row of aoa) {
    const length = String(row[index] ?? "").length;
    if (length > widest) widest = length;
  }
  return Math.min(widest, EXPORT_MAX_COLUMN_WIDTH); // a loop, not Math.max(...): exports can be 100k rows
}

function useTableExport<T>({
  apiFunction,
  responseFormat,
  requestParams,
  usingPreFetched,
  preFetchedData,
  columns,
  search,
  filterParams,
  sortParams,
  apiParams,
  totalItems,
  notify: notifyArg,
}: UseTableExportArgs<T>): UseTableExportResult {
  const [exporting, setExporting] = useState(false);
  const formats = useDateTimeFormats(); // exports are formatted exactly as the table shows them
  const config = useNoviqUIConfig(); // unconditional: hooks can't be short-circuited
  const t = useText();
  const notify = notifyArg ?? config?.notify;

  const exportColumns = columns.filter((c) => c.export !== false);

  const fetchRows = async (): Promise<T[]> => {
    if (usingPreFetched) return preFetchedData;
    if (!apiFunction || !responseFormat || !requestParams) return [];
    const raw = await apiFunction({
      ...(apiParams as Record<string, unknown>),
      ...filterParams,
      ...sortParams,
      [requestParams.search]: search,
      [requestParams.page]: 1,
      [requestParams.pageSize]: totalItems > 0 ? totalItems : EXPORT_FALLBACK_ROWS_PER_PAGE,
    });
    return extractRows(raw, responseFormat);
  };

  const buildAoa = (rows: T[]): unknown[][] => {
    const header = exportColumns.map((c) => c.heading);
    const body = rows.map((row) => exportColumns.map((c) => getExportCellValue(row, c, formats, config?.text)));
    return [header, ...body];
  };

  const exportToExcel = async (fileName = `${DEFAULT_EXPORT_FILE_BASE}.${EXPORT_FILE_EXTENSION.EXCEL}`) => {
    setExporting(true);
    try {
      const rows = await fetchRows();
      const aoa = buildAoa(rows);
      const XLSX = await import("xlsx-js-style");
      const ws = XLSX.utils.aoa_to_sheet(aoa);

      exportColumns.forEach((column, i) => {
        const address = XLSX.utils.encode_cell({ r: 0, c: i });
        if (ws[address]) {
          ws[address].s = {
            font: { bold: true, color: { rgb: EXPORT_HEADER_TEXT_COLOR } },
            fill: { patternType: "solid", fgColor: { rgb: EXPORT_HEADER_FILL } },
          };
        }
        ws["!cols"] = ws["!cols"] || [];
        ws["!cols"][i] = { wch: exportColumnWidth(aoa, i) };
      });

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, EXPORT_SHEET_NAME);
      XLSX.writeFile(wb, fileName);
      notify?.(t("exportSuccess"), NOTIFY_KIND.SUCCESS);
    } catch (err) {
      console.error(DEFAULT_TEXT.exportFailure, err);
      notify?.(t("exportFailure"), NOTIFY_KIND.ERROR);
    } finally {
      setExporting(false);
    }
  };

  const exportToCSV = async (fileName = `${DEFAULT_EXPORT_FILE_BASE}.${EXPORT_FILE_EXTENSION.CSV}`) => {
    setExporting(true);
    try {
      const rows = await fetchRows();
      const aoa = buildAoa(rows);
      const XLSX = await import("xlsx-js-style");
      const ws = XLSX.utils.aoa_to_sheet(aoa);
      const csv = XLSX.utils.sheet_to_csv(ws);

      const blob = new Blob([CSV_UTF8_BOM + csv], { type: CSV_MIME_TYPE });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      notify?.(t("exportSuccess"), NOTIFY_KIND.SUCCESS);
    } catch (err) {
      console.error(DEFAULT_TEXT.exportFailure, err);
      notify?.(t("exportFailure"), NOTIFY_KIND.ERROR);
    } finally {
      setExporting(false);
    }
  };

  return { exportToExcel, exportToCSV, exporting };
}

export default useTableExport;
