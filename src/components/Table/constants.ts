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

export type CellType = (typeof CELL_TYPE)[keyof typeof CELL_TYPE];

export const NO_TEXT_PLACEHOLDER = "-";

export const DATE_FORMAT = "DD/MM/YYYY";
export const DATE_TIME_FORMAT = "DD/MM/YYYY hh:mm A";
export const TIME_FORMAT = "hh:mm A";
