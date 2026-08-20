import { useState } from "react";
import toast from "react-hot-toast";
import type { TableColumn, TableQueryParams, TableQueryResult } from "./Table";
import { CELL_TYPE, NO_TEXT_PLACEHOLDER } from "./constants";
import { getCellValue, buildCellFormatOptions } from "./cellValue";
import { formatTableCellValues, formatStatusLabel } from "./TableCell";

const FALLBACK_ROWS_PER_PAGE = 100000;
const HEADER_FILL = "02699B";

export interface UseTableExportArgs<T> {
  apiFunction?: (params: TableQueryParams) => Promise<TableQueryResult<T>>;
  usingPreFetched: boolean;
  /** The already client-sorted array, used directly (no fetch) when `usingPreFetched`. */
  preFetchedData: T[];
  /** Already visibility-filtered/ordered columns (`export !== false` still applied here). */
  columns: TableColumn<T>[];
  search: string;
  filterParams: Record<string, unknown>;
  apiParams?: Record<string, unknown>;
  totalItems: number;
}

export interface UseTableExportResult {
  exportToExcel: (fileName?: string) => Promise<void>;
  exportToCSV: (fileName?: string) => Promise<void>;
  exporting: boolean;
}

function getExportCellValue<T>(row: T, column: TableColumn<T>): string | number {
  if (column.exportValue) return column.exportValue(row);

  const cellValue = getCellValue(row, column);
  if (!column.type) return cellValue;
  if (column.type === CELL_TYPE.STATUS) {
    return cellValue === NO_TEXT_PLACEHOLDER ? cellValue : formatStatusLabel(cellValue);
  }
  return formatTableCellValues(column.type, buildCellFormatOptions(row, column, cellValue));
}

function useTableExport<T>({
  apiFunction,
  usingPreFetched,
  preFetchedData,
  columns,
  search,
  filterParams,
  apiParams,
  totalItems,
}: UseTableExportArgs<T>): UseTableExportResult {
  const [exporting, setExporting] = useState(false);

  const exportColumns = columns.filter((c) => c.export !== false);

  const fetchRows = async (): Promise<T[]> => {
    if (usingPreFetched) return preFetchedData;
    if (!apiFunction) return [];
    const { result } = await apiFunction({
      ...(apiParams as Record<string, unknown>),
      ...filterParams,
      search,
      page_no: 1,
      rows_per_page: totalItems > 0 ? totalItems : FALLBACK_ROWS_PER_PAGE,
    });
    return result;
  };

  const buildAoa = (rows: T[]): unknown[][] => {
    const header = exportColumns.map((c) => c.heading);
    const body = rows.map((row) => exportColumns.map((c) => getExportCellValue(row, c)));
    return [header, ...body];
  };

  const exportToExcel = async (fileName = "export.xlsx") => {
    setExporting(true);
    const toastId = toast.loading("Preparing export...");
    try {
      const rows = await fetchRows();
      const aoa = buildAoa(rows);
      const XLSX = await import("xlsx-js-style");
      const ws = XLSX.utils.aoa_to_sheet(aoa);

      exportColumns.forEach((column, i) => {
        const address = XLSX.utils.encode_cell({ r: 0, c: i });
        if (ws[address]) {
          ws[address].s = {
            font: { bold: true, color: { rgb: "FFFFFF" } },
            fill: { patternType: "solid", fgColor: { rgb: HEADER_FILL } },
          };
        }
        ws["!cols"] = ws["!cols"] || [];
        ws["!cols"][i] = { wch: Math.max(column.heading.length, 10) };
      });

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
      XLSX.writeFile(wb, fileName);
      toast.success("Export complete", { id: toastId });
    } catch (err) {
      console.error("Export failed", err);
      toast.error("Export failed", { id: toastId });
    } finally {
      setExporting(false);
    }
  };

  const exportToCSV = async (fileName = "export.csv") => {
    setExporting(true);
    const toastId = toast.loading("Preparing export...");
    try {
      const rows = await fetchRows();
      const aoa = buildAoa(rows);
      const XLSX = await import("xlsx-js-style");
      const ws = XLSX.utils.aoa_to_sheet(aoa);
      const csv = XLSX.utils.sheet_to_csv(ws);

      const UTF8_BOM = "﻿";
      const blob = new Blob([UTF8_BOM + csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success("Export complete", { id: toastId });
    } catch (err) {
      console.error("Export failed", err);
      toast.error("Export failed", { id: toastId });
    } finally {
      setExporting(false);
    }
  };

  return { exportToExcel, exportToCSV, exporting };
}

export default useTableExport;
