import { inflateRawSync } from "node:zlib";

const END_OF_CENTRAL_DIRECTORY = 0x06054b50;
const CENTRAL_DIRECTORY_ENTRY = 0x02014b50;
const STORED = 0;
const DEFLATED = 8;

/**
 * The text of every part of an `.xlsx` (a zip), keyed by its path — `xl/worksheets/sheet1.xml`,
 * `xl/styles.xml`… Reads the zip itself rather than through the spreadsheet library under test,
 * so an assertion about the file is an assertion about the bytes a user's Excel would open.
 */
export function readXlsxParts(bytes: Uint8Array): Record<string, string> {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let end = bytes.length - 22;
  while (end >= 0 && view.getUint32(end, true) !== END_OF_CENTRAL_DIRECTORY) end--;
  if (end < 0) throw new Error("not a zip: no end-of-central-directory record");

  const count = view.getUint16(end + 10, true);
  let cursor = view.getUint32(end + 16, true);
  const parts: Record<string, string> = {};

  for (let i = 0; i < count; i++) {
    if (view.getUint32(cursor, true) !== CENTRAL_DIRECTORY_ENTRY) throw new Error("corrupt central directory");
    const method = view.getUint16(cursor + 10, true);
    const compressedSize = view.getUint32(cursor + 20, true);
    const nameLength = view.getUint16(cursor + 28, true);
    const extraLength = view.getUint16(cursor + 30, true);
    const commentLength = view.getUint16(cursor + 32, true);
    const localHeader = view.getUint32(cursor + 42, true);
    const name = new TextDecoder().decode(bytes.subarray(cursor + 46, cursor + 46 + nameLength));

    const dataStart = localHeader + 30 + view.getUint16(localHeader + 26, true) + view.getUint16(localHeader + 28, true);
    const data = bytes.subarray(dataStart, dataStart + compressedSize);
    if (method !== STORED && method !== DEFLATED) throw new Error(`unsupported zip method ${method} for ${name}`);
    parts[name] = new TextDecoder().decode(method === STORED ? data : inflateRawSync(data));

    cursor += 46 + nameLength + extraLength + commentLength;
  }
  return parts;
}

/** `<col>` widths of a sheet, by 1-based column number. */
export function columnWidths(sheetXml: string): number[] {
  return [...sheetXml.matchAll(/<col [^>]*min="(\d+)"[^>]*width="([\d.]+)"/g)].map((m) => Number(m[2]));
}
