// Lightweight DD/MM/YYYY-family formatting to replace moment.js. Input is
// expected to be ISO-8601 (or a Date/epoch number) — arbitrary custom-format
// parsing (moment's `currentFormat` option) is intentionally not supported.

import { TIME_PERIOD } from "../../constants";

const HAS_TZ_SUFFIX = /(Z|[+-]\d{2}:?\d{2})$/i;

function toDate(value: string | number | Date, isUtc?: boolean): Date {
  if (value instanceof Date) return value;
  if (typeof value === "number") return new Date(value);
  if (isUtc && !HAS_TZ_SUFFIX.test(value)) {
    return new Date(`${value}Z`);
  }
  return new Date(value);
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

export function formatDatePart(value: string | number | Date, isUtc?: boolean): string {
  const date = toDate(value, isUtc);
  const day = isUtc ? date.getUTCDate() : date.getDate();
  const month = (isUtc ? date.getUTCMonth() : date.getMonth()) + 1;
  const year = isUtc ? date.getUTCFullYear() : date.getFullYear();
  return `${pad(day)}/${pad(month)}/${year}`;
}

export function formatTimePart(value: string | number | Date, isUtc?: boolean): string {
  const date = toDate(value, isUtc);
  const minutes = isUtc ? date.getUTCMinutes() : date.getMinutes();
  let hours = isUtc ? date.getUTCHours() : date.getHours();
  const period = hours >= 12 ? TIME_PERIOD.PM : TIME_PERIOD.AM;
  hours = hours % 12 || 12;
  return `${pad(hours)}:${pad(minutes)} ${period}`;
}

export function formatDateTime(value: string | number | Date, isUtc?: boolean): string {
  return `${formatDatePart(value, isUtc)} ${formatTimePart(value, isUtc)}`;
}

// Mirrors the source's odd-but-intentional convention: a duration value that
// contains "T" is an ISO datetime whose epoch-ms IS the duration length (e.g.
// an API returning "1970-01-01T02:30:00" to mean "2h 30m"); otherwise the
// value is a plain number of minutes.
export function formatDuration(value: number | string): string {
  const totalMs =
    typeof value === "string" && value.includes("T")
      ? toDate(value, true).getTime()
      : Number(value) * 60 * 1000;

  const totalSeconds = Math.max(0, Math.floor(totalMs / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return [hours, minutes, seconds].map(pad).join(":");
}
