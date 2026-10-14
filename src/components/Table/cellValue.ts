import { CELL_TYPE, NO_TEXT_PLACEHOLDER } from "../../constants";
import { capitalize, capitalizeEveryWord } from "./textTransforms";
import type { CellFormatOptions } from "./TableCell";
import type { TableColumn } from "./Table";

export function getCellValue<T>(row: T, column: TableColumn<T>): string {
  const raw = column.accessorKey ? (row as Record<string, unknown>)?.[column.accessorKey] : undefined;
  const value = raw?.toString()?.trim();
  if (!value) return NO_TEXT_PLACEHOLDER;
  if (column.capitalize) return capitalize(value);
  if (column.capitalizeEveryWord) return capitalizeEveryWord(value);
  if (column.lowercase) return value.toLowerCase();
  if (column.uppercase) return value.toUpperCase();
  return value;
}

/** Builds the `CellFormatOptions` for a column's declared `type`, shared by both `Table`'s
 * render path (via `TableCell`) and the export path (via `formatTableCellValues` directly) so
 * the range-type field lookups (`fromDate`/`toDate`/etc.) aren't duplicated between the two. */
export function buildCellFormatOptions<T>(
  row: T,
  column: TableColumn<T>,
  cellValue: string
): CellFormatOptions {
  const has = (v: string | undefined) => (v ? (row as Record<string, unknown>)[v] : undefined);

  switch (column.type) {
    case CELL_TYPE.DATE:
      return { date: cellValue !== NO_TEXT_PLACEHOLDER ? cellValue : null, isUtc: column.isUtc };
    case CELL_TYPE.DATE_RANGE:
      return {
        fromDate: has(column.fromDate) as CellFormatOptions["fromDate"],
        toDate: has(column.toDate) as CellFormatOptions["toDate"],
        isUtc: column.isUtc,
      };
    case CELL_TYPE.DATE_TIME:
      return {
        dateTime: cellValue !== NO_TEXT_PLACEHOLDER ? cellValue : null,
        isUtc: column.isUtc,
      };
    case CELL_TYPE.DATE_TIME_RANGE:
      return {
        fromDateTime: has(column.fromDateTime) as CellFormatOptions["fromDateTime"],
        toDateTime: has(column.toDateTime) as CellFormatOptions["toDateTime"],
        isUtc: column.isUtc,
      };
    case CELL_TYPE.TIME:
      return { time: cellValue !== NO_TEXT_PLACEHOLDER ? cellValue : null, isUtc: column.isUtc };
    case CELL_TYPE.TIME_RANGE:
      return {
        fromTime: has(column.fromTime) as CellFormatOptions["fromTime"],
        toTime: has(column.toTime) as CellFormatOptions["toTime"],
        isUtc: column.isUtc,
      };
    case CELL_TYPE.DURATION:
      return { duration: cellValue !== NO_TEXT_PLACEHOLDER ? cellValue : null };
    case CELL_TYPE.CURRENCY:
      return {
        value: cellValue !== NO_TEXT_PLACEHOLDER ? Number(cellValue) : 0,
        currency: column.currency,
        maximumFractionDigits: column.maximumFractionDigits,
      };
    case CELL_TYPE.STATUS:
      return { status: cellValue !== NO_TEXT_PLACEHOLDER ? cellValue : null };
    default:
      return {};
  }
}
