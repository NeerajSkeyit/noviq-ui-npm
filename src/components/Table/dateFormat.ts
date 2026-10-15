// Duration formatting for the `duration` cell type. Dates and times are formatted by
// `utils/dateTimeFormat`, which honours the patterns configured on `NoviqUIConfigProvider`.

const HAS_TZ_SUFFIX = /(Z|[+-]\d{2}:?\d{2})$/i;

function toEpochMs(value: string): number {
  const text = HAS_TZ_SUFFIX.test(value) ? value : `${value}Z`;
  return new Date(text).getTime();
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

// Mirrors the source's odd-but-intentional convention: a duration value that
// contains "T" is an ISO datetime whose epoch-ms IS the duration length (e.g.
// an API returning "1970-01-01T02:30:00" to mean "2h 30m"); otherwise the
// value is a plain number of minutes.
export function formatDuration(value: number | string): string {
  const totalMs =
    typeof value === "string" && value.includes("T") ? toEpochMs(value) : Number(value) * 60 * 1000;

  const totalSeconds = Math.max(0, Math.floor(totalMs / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return [hours, minutes, seconds].map(pad).join(":");
}
