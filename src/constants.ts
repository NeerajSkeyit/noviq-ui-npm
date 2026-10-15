/**
 * Every fixed vocabulary the library uses lives in this file. Component code refers to these
 * constants — it never repeats the same string/number as a bare literal (`variant="outline"`,
 * `e.key === "Escape"`, `sort.direction === "asc"`...). `src/constants.test.ts` fails if it does.
 *
 * - **Public** groups are re-exported from `src/index.ts`, so consumers can write
 *   `<Button variant={BUTTON_VARIANT.OUTLINE} />` instead of a stringly-typed literal. Their
 *   values are the exact strings the props always accepted, so plain literals keep working.
 * - **Internal** groups (marked below) are for the library's own code and are not exported.
 *
 * What deliberately stays inline: web-platform vocabulary the browser defines — native
 * `<input type="date">`, `role="listbox"`, `aria-*`, CSS class names — and user-facing copy (that
 * is a separate concern: localisation).
 */

type ValueOf<T> = T[keyof T];

// ─── Input / Form ──────────────────────────────────────────────────────────────────────────────

/**
 * Field types `Input` (and `Form`'s `inputList`) can render. Every value here has a render branch —
 * `src/components/Input/Input.test.tsx` renders each one — so none of them falls through to the
 * "Unsupported input type" fallback.
 */
export const INPUT_TYPE = {
  CHECKBOX: "checkbox",
  DATE: "date",
  EMAIL: "email",
  PASSWORD: "password",
  SEARCH: "search",
  SELECT: "select",
  TEXT: "text",
  TIME: "time",
  FILE: "file",
  TEXTAREA: "textArea",
  MULTI_SELECT: "multiSelect",
  COLOR: "color",
  MONTH: "month",
  RADIO: "radio",
  MULTIPLE_FILE: "multipleFile",
  NUMBER: "number",
  EXCEL_UPLOAD: "excelUpload",
  SWITCH: "switch",
  /** Custom calendar dropdown (value `"YYYY-MM-DD"`); `DATE` is the browser's native input. */
  DATE_PICKER: "datePicker",
  /** Custom hour/minute dropdown (value `"HH:mm"`, 24-hour); `TIME` is the native input. */
  TIME_PICKER: "timePicker",
  /** Custom month grid (value `"YYYY-MM"`); `MONTH` is the native input. */
  MONTH_PICKER: "monthPicker",
} as const;
export type InputType = ValueOf<typeof INPUT_TYPE>;

/** Pseudo field types that `Form` renders itself rather than handing to `Input`. */
export const FORM_FIELD_TYPE = {
  INFO: "info",
} as const;

/** How many fields share a form row: 1 = alone (100% width), 2 = half each, 3 = a third each. */
export const COL_SPAN = {
  FULL: 1,
  HALF: 2,
  THIRD: 3,
} as const;
export type ColSpan = ValueOf<typeof COL_SPAN>;

// ─── Button / Badge ────────────────────────────────────────────────────────────────────────────

export const BUTTON_VARIANT = {
  DEFAULT: "default",
  OUTLINE: "outline",
  DESTRUCTIVE: "destructive",
  SECONDARY: "secondary",
  GHOST: "ghost",
  LINK: "link",
} as const;
export type ButtonVariant = ValueOf<typeof BUTTON_VARIANT>;

export const BUTTON_SIZE = {
  SM: "sm",
  MD: "md",
  LG: "lg",
  ICON: "icon",
} as const;
export type ButtonSize = ValueOf<typeof BUTTON_SIZE>;

/** The native `type` attribute of a `<button>`. */
export const BUTTON_TYPE = {
  BUTTON: "button",
  SUBMIT: "submit",
  RESET: "reset",
} as const;
export type ButtonType = ValueOf<typeof BUTTON_TYPE>;

export const BADGE_VARIANT = {
  DEFAULT: "default",
  SECONDARY: "secondary",
  DESTRUCTIVE: "destructive",
  OUTLINE: "outline",
} as const;
export type BadgeVariant = ValueOf<typeof BADGE_VARIANT>;

// ─── Drawer / Modal ────────────────────────────────────────────────────────────────────────────

export const DRAWER_SIDE = {
  RIGHT: "right",
  LEFT: "left",
  TOP: "top",
  BOTTOM: "bottom",
} as const;
export type DrawerSide = ValueOf<typeof DRAWER_SIDE>;

export const DRAWER_SIZE = {
  SM: "sm",
  MD: "md",
  LG: "lg",
} as const;
export type DrawerSize = ValueOf<typeof DRAWER_SIZE>;

export const MODAL_SIZE = {
  SM: "sm",
  MD: "md",
  LG: "lg",
  XL: "xl",
  AUTO: "auto",
} as const;
export type ModalSize = ValueOf<typeof MODAL_SIZE>;

/** @internal Height in px of a top/bottom drawer, by size. (Left/right drawers size by width, in CSS.) */
export const DRAWER_HEIGHT_BY_SIZE: Record<DrawerSize, number> = {
  [DRAWER_SIZE.SM]: 420,
  [DRAWER_SIZE.MD]: 520,
  [DRAWER_SIZE.LG]: 620,
};

// ─── Floating panels (picker dropdowns) ────────────────────────────────────────────────────────

/** @internal Px between a picker's trigger and its dropdown. */
export const FLOATING_PANEL_GAP = 4;
/** @internal Px a dropdown keeps clear of the viewport edge when it has to be pulled back in. */
export const FLOATING_PANEL_VIEWPORT_MARGIN = 8;

// ─── TimePicker ────────────────────────────────────────────────────────────────────────────────

/** 24-hour (hours 00–23) or 12-hour (hours 00–11 plus an AM/PM column; 00 PM is noon). */
export const HOUR_CYCLE = {
  H12: 12,
  H24: 24,
} as const;
export type HourCycle = ValueOf<typeof HOUR_CYCLE>;

export const TIME_PERIOD = {
  AM: "AM",
  PM: "PM",
} as const;
export type TimePeriod = ValueOf<typeof TIME_PERIOD>;

/** @internal The scrollable columns of the time picker's dropdown. */
export const TIME_COLUMN = {
  HOUR: "hour",
  MINUTE: "minute",
  PERIOD: "period",
} as const;
export type TimeColumn = ValueOf<typeof TIME_COLUMN>;

/** @internal */
export const DEFAULT_MINUTE_STEP = 1;

/**
 * @internal How a time pattern writes the hour, which decides the TimePicker's clock and the hour
 * list: `H`/`HH` are 0–23; `h`/`hh` are 12-hour with 12 for midnight/noon; `K`/`KK` are the
 * zero-based 12-hour clock (00 for midnight/noon).
 */
export const HOUR_STYLE = {
  H24: "24",
  H12: "12",
  H12_ZERO_BASED: "12-zero",
} as const;
export type HourStyle = ValueOf<typeof HOUR_STYLE>;

/**
 * @internal What the TimePicker shows when the app has not configured `formats.time`: 24-hour
 * `HH:mm`, or the zero-based 12-hour `KK:mm A` (00 AM = midnight, 00 PM = noon).
 */
export const TIME_PICKER_PATTERN = {
  H24: "HH:mm",
  H12: "KK:mm A",
} as const;
/** @internal Height in px of each scrollable column in the time picker's dropdown. */
export const TIME_PICKER_COLUMN_HEIGHT = 180;

// ─── DatePicker / MonthPicker ──────────────────────────────────────────────────────────────────

/** @internal Full month names, January first. Also used for a `month` filter's chip text. */
export const MONTH_NAMES: readonly string[] = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
/** @internal */
export const MONTH_NAMES_SHORT: readonly string[] = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];
/** @internal Sunday first, matching `Date#getDay()`. */
export const WEEKDAY_LABELS: readonly string[] = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
/** @internal Full weekday names, Sunday first (the `dddd` / `ddd` format tokens). */
export const WEEKDAY_NAMES: readonly string[] = [
  "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday",
];
/** @internal `0` = Sunday. */
export const WEEK_START = 0;
/** @internal */
export const DAYS_IN_WEEK = 7;
/** @internal A calendar always shows six weeks, so it never changes height between months. */
export const CALENDAR_WEEKS = 6;
/** @internal Month-picker grid: months per row. */
export const MONTH_GRID_COLUMNS = 3;
/** @internal Earliest year the year select offers when there is no `minDate`. */
export const DEFAULT_MIN_YEAR = 1900;
/** @internal How many years past today the year select reaches when there is no `maxDate`. */
export const DEFAULT_YEARS_AHEAD = 100;

// ─── Table ─────────────────────────────────────────────────────────────────────────────────────

/** Cell formatting types for `TableColumn.type`. */
export const CELL_TYPE = {
  DATE: "date",
  DATE_RANGE: "dateRange",
  DATE_TIME: "dateTime",
  DATE_TIME_RANGE: "dateTimeRange",
  TIME: "time",
  TIME_RANGE: "timeRange",
  CURRENCY: "currency",
  DURATION: "duration",
  STATUS: "status",
} as const;
export type CellType = ValueOf<typeof CELL_TYPE>;

/** Filter control types for `Table`'s `filterConfigs`. */
export const FILTER_TYPE = {
  SEARCH: "search",
  DATE: "date",
  SELECT: "select",
  DATE_RANGE: "dateRange",
  MONTH: "month",
} as const;
export type FilterType = ValueOf<typeof FILTER_TYPE>;

export const SORT_DIRECTION = {
  ASC: "asc",
  DESC: "desc",
} as const;
export type SortDirection = ValueOf<typeof SORT_DIRECTION>;

/** Which edge a column is pinned to. */
export const STICKY_POSITION = {
  LEFT: "left",
  RIGHT: "right",
} as const;
export type StickyPosition = ValueOf<typeof STICKY_POSITION>;

export const COLUMN_ALIGN = {
  LEFT: "left",
  CENTER: "center",
  RIGHT: "right",
} as const;
export type ColumnAlign = ValueOf<typeof COLUMN_ALIGN>;

/** Ids of the pseudo-columns `Table` injects itself (never declare these in `columns`). */
export const TABLE_COLUMN_ID = {
  SELECT: "select",
  ACTIONS: "actions",
} as const;

/** @internal Widths in px of the auto-injected pseudo-columns. */
export const SELECT_COLUMN_WIDTH = 48;
/** @internal */
export const ACTIONS_COLUMN_WIDTH = 90;

/** @internal Column ids the "Columns" chooser never lists. `"action"` is the singular spelling HRMS used. */
export const NON_CONFIGURABLE_COLUMN_IDS: readonly string[] = [
  TABLE_COLUMN_ID.SELECT,
  TABLE_COLUMN_ID.ACTIONS,
  "action",
];

/** Conventional ids for `Table` toolbar `actions`. An action with `id: "add"` is the primary action. */
export const ACTION_ID = {
  ADD: "add",
} as const;

/** How a `RowAction` is rendered. */
export const ROW_ACTION_TYPE = {
  BUTTON: "button",
  CHECKBOX: "checkbox",
  ICON: "icon",
} as const;
export type RowActionType = ValueOf<typeof ROW_ACTION_TYPE>;

/** `RowAction.variant` values beyond the button variants. */
export const ROW_ACTION_VARIANT = {
  /** A confirm-with-reason popover (inline mode only). */
  REJECT: "reject",
} as const;
export type RowActionVariant = ValueOf<typeof ROW_ACTION_VARIANT>;

export const BULK_ACTION_VARIANT = {
  DESTRUCTIVE: BUTTON_VARIANT.DESTRUCTIVE,
  SECONDARY: BUTTON_VARIANT.SECONDARY,
} as const;
export type BulkActionVariant = ValueOf<typeof BULK_ACTION_VARIANT>;

/** `NO_TEXT_PLACEHOLDER` is what an empty cell shows. */
export const NO_TEXT_PLACEHOLDER = "-";
export const DATE_FORMAT = "DD/MM/YYYY";
export const DATE_TIME_FORMAT = "DD/MM/YYYY hh:mm A";
export const TIME_FORMAT = "hh:mm A";

/** @internal */
export const DEFAULT_PAGE_SIZE_OPTIONS: readonly number[] = [10, 20, 50, 100];
/** @internal Used when `pageSizeOptions` is empty. */
export const DEFAULT_PAGE_SIZE = 10;
/** @internal Used for sticky offsets when a column has no `width`. */
export const DEFAULT_COLUMN_WIDTH = 140;
/** @internal */
export const SEARCH_DEBOUNCE_MS = 500;
/** @internal Currency a `currency` cell falls back to when the column sets none. */
export const DEFAULT_CURRENCY = "INR";
/** @internal Key prefix under which a Table's column settings are persisted in `localStorage`. */
export const COLUMN_SETTINGS_STORAGE_PREFIX = "noviq-ui-table-columns:";

/** @internal Default apiPayload key names for a `month` filter, when the config sets none. */
export const FILTER_PAYLOAD_KEY = {
  MONTH: "month",
  YEAR: "year",
} as const;

/** Query-param names `Table` sends, unless `config.table.requestParams` renames them. */
export const DEFAULT_REQUEST_PARAMS = {
  search: "search",
  page: "page_no",
  pageSize: "rows_per_page",
} as const;

// ─── Table export ──────────────────────────────────────────────────────────────────────────────

/** @internal */
export const EXPORT_FILE_EXTENSION = {
  EXCEL: "xlsx",
  CSV: "csv",
} as const;
/** @internal */
export const DEFAULT_EXPORT_FILE_BASE = "export";
/** @internal */
export const EXPORT_SHEET_NAME = "Sheet1";
/** @internal Excel header row fill (hex, no `#`). */
export const EXPORT_HEADER_FILL = "02699B";
/** @internal `rows_per_page` used to fetch "everything" when the table doesn't know its total. */
export const EXPORT_FALLBACK_ROWS_PER_PAGE = 100000;
/** @internal Lets Excel open a UTF-8 CSV with the right encoding. */
export const CSV_UTF8_BOM = "﻿";
/** @internal */
export const CSV_MIME_TYPE = "text/csv;charset=utf-8;";

// ─── Notifications ─────────────────────────────────────────────────────────────────────────────

/** `kind` passed to `config.notify`. */
export const NOTIFY_KIND = {
  SUCCESS: "success",
  ERROR: "error",
} as const;
export type NotifyKind = ValueOf<typeof NOTIFY_KIND>;

/** @internal What the export flow reports through `config.notify`. */
export const EXPORT_MESSAGE = {
  SUCCESS: "Export complete",
  FAILURE: "Export failed",
} as const;

// ─── Keyboard ──────────────────────────────────────────────────────────────────────────────────

/** @internal `KeyboardEvent.key` values the components react to. */
export const KEY = {
  ENTER: "Enter",
  SPACE: " ",
  ESCAPE: "Escape",
  TAB: "Tab",
  ARROW_UP: "ArrowUp",
  ARROW_DOWN: "ArrowDown",
  ARROW_LEFT: "ArrowLeft",
  ARROW_RIGHT: "ArrowRight",
  PAGE_UP: "PageUp",
  PAGE_DOWN: "PageDown",
  HOME: "Home",
  END: "End",
} as const;

/** @internal Key specs in `react-hotkeys-hook`'s own syntax (not `KeyboardEvent.key`). */
export const HOTKEY = {
  FOCUS_SEARCH: "slash",
  CLOSE: "esc",
} as const;
