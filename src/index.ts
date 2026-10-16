// src/index.ts
import "./styles/tokens.css";

// Fixed vocabularies (variants, sizes, sides, types, ...). The values are the exact strings the
// props have always accepted; the constants just give them names. See src/constants.ts.
export {
  INPUT_TYPE,
  FORM_FIELD_TYPE,
  COL_SPAN,
  BUTTON_VARIANT,
  BUTTON_SIZE,
  BUTTON_TYPE,
  BADGE_VARIANT,
  DRAWER_SIDE,
  DRAWER_SIZE,
  MODAL_SIZE,
  HOUR_CYCLE,
  TIME_PERIOD,
  CELL_TYPE,
  FILTER_TYPE,
  SORT_DIRECTION,
  STICKY_POSITION,
  COLUMN_ALIGN,
  TABLE_COLUMN_ID,
  ACTION_ID,
  ROW_ACTION_TYPE,
  ROW_ACTION_VARIANT,
  BULK_ACTION_VARIANT,
  NOTIFY_KIND,
  NO_TEXT_PLACEHOLDER,
  DEFAULT_TEXT,
} from "./constants";
export type {
  InputType,
  ColSpan,
  ButtonVariant,
  ButtonSize,
  ButtonType,
  BadgeVariant,
  DrawerSide,
  DrawerSize,
  ModalSize,
  HourCycle,
  TimePeriod,
  CellType,
  FilterType,
  SortDirection,
  StickyPosition,
  ColumnAlign,
  RowActionType,
  RowActionVariant,
  BulkActionVariant,
  TextKey,
} from "./constants";

export { default as Input } from "./components/Input/Input";
export { default as Button } from "./components/Button/Button";
export { default as ScrollArea } from "./components/ScrollArea/ScrollArea";
export { default as Drawer } from "./components/Drawer/Drawer";
export { default as Modal } from "./components/Modal/Modal";
export { default as Label } from "./components/Label/Label";
export { default as Switch } from "./components/Switch/Switch";
export { default as FormFooter } from "./components/FormFooter/FormFooter";
export { default as FullPageSection } from "./components/FullPageSection/FullPageSection";
export { default as Form } from "./components/Form/Form";
export { default as Badge } from "./components/Badge/Badge";
export { DropdownMenu, DropdownMenuItem } from "./components/Dropdown/Dropdown";
export { default as Table } from "./components/Table/Table";
export { NoviqUIConfigProvider, useNoviqUIConfig } from "./config/NoviqUIConfigProvider";
export { useDateTimeFormatters } from "./hooks/useDateTimeFormats";
export {
  default as TableCell,
  formatTableCellValues,
  formatStatusLabel,
} from "./components/Table/TableCell";
export { default as TablePagination } from "./components/Table/TablePagination";
export { default as ColumnSelector } from "./components/Table/ColumnSelector";
export { useTableColumnSettings } from "./components/Table/useTableColumnSettings";
export { default as Checkbox } from "./components/Checkbox/Checkbox";
export { default as TimePicker } from "./components/TimePicker/TimePicker";
export { default as DatePicker } from "./components/DatePicker/DatePicker";
export { default as MonthPicker } from "./components/MonthPicker/MonthPicker";
export { default as RowActionsMenu } from "./components/Table/RowActionsMenu";
export { default as BulkActionsBar } from "./components/Table/BulkActionsBar";
export { default as RejectAction } from "./components/Table/RejectAction";
export { default as FilterDrawer } from "./components/Table/FilterDrawer";
export { default as FilterChips } from "./components/Table/FilterChips";
export { buildActiveFilter } from "./components/Table/buildActiveFilter";
export { default as Export } from "./components/Table/Export";
export { default as useTableExport } from "./components/Table/useTableExport";
export { getCellValue, buildCellFormatOptions } from "./components/Table/cellValue";

export type { ButtonProps } from "./components/Button/Button";
export type { ScrollAreaProps } from "./components/ScrollArea/ScrollArea";
export type { DrawerProps } from "./components/Drawer/Drawer";
export type { ModalProps } from "./components/Modal/Modal";
export type { InputProps, InputOption } from "./components/Input/Input";
export type { LabelProps } from "./components/Label/Label";
export type { SwitchProps } from "./components/Switch/Switch";
export type { TimePickerProps } from "./components/TimePicker/TimePicker";
export type { DatePickerProps } from "./components/DatePicker/DatePicker";
export type { MonthPickerProps } from "./components/MonthPicker/MonthPicker";
export type { FormFooterProps, FormFooterButton } from "./components/FormFooter/FormFooter";
export type { FullPageSectionProps } from "./components/FullPageSection/FullPageSection";
export type { FormProps, FormFieldConfig, FormController } from "./components/Form/Form";
export type { BadgeProps } from "./components/Badge/Badge";
export type { DropdownMenuProps, DropdownMenuItemProps } from "./components/Dropdown/Dropdown";
export type {
  TableProps,
  TableColumn,
  TableQueryParams,
} from "./components/Table/Table";
export type {
  NoviqUIConfig,
  NoviqUITableConfig,
  NotifyFn,
  NotifyKind,
  NoviqUIFormats,
  NoviqUIText,
  NoviqUIInheritedConfig,
  TextValue,
  TextParams,
  TableResponseFormat,
  ResponseFormatPaths,
  ResponseFormatFns,
  TableRequestParamNames,
} from "./config/types";
export type { TableCellProps, CellFormatOptions } from "./components/Table/TableCell";
export type { TablePaginationProps, TablePaginationState } from "./components/Table/TablePagination";
export type { ActionBarAction, ActionBarOption } from "./components/Table/ActionBar";
export type { ColumnSelectorProps } from "./components/Table/ColumnSelector";
export type {
  TableColumnSettings,
  StickyColumnsState,
} from "./components/Table/useTableColumnSettings";
export type { CheckboxProps } from "./components/Checkbox/Checkbox";
export type {
  RowActionsMenuProps,
  RowAction,
  RowActionContext,
  TablePaginationLike,
} from "./components/Table/RowActionsMenu";
export type { BulkActionsBarProps, BulkAction } from "./components/Table/BulkActionsBar";
export type { RejectActionProps } from "./components/Table/RejectAction";
export type { FilterDrawerProps } from "./components/Table/FilterDrawer";
export type { FilterChipsProps } from "./components/Table/FilterChips";
export type {
  FilterConfig,
  FilterOption,
  ActiveFilter,
  DateRangeValue,
} from "./components/Table/buildActiveFilter";
export type { ExportProps } from "./components/Table/Export";
export type { UseTableExportArgs, UseTableExportResult } from "./components/Table/useTableExport";
export type { DateTimeFormatters } from "./hooks/useDateTimeFormats";
export type { ResolvedFormats } from "./utils/dateTimeFormat";
