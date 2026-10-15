import React, { createContext, useContext } from "react";
import type { NoviqUIConfig, NoviqUIFormats, NoviqUITableConfig } from "./types";
import { DATE_FORMAT } from "../constants";
import { isFnsFormat, isPathsFormat } from "./responseFormat";

const NoviqUIConfigContext = createContext<NoviqUIConfig | undefined>(undefined);

function validateTableConfig(table: NoviqUITableConfig): void {
  if (!table.responseFormat) {
    throw new Error(
      "noviq-ui: NoviqUIConfigProvider requires config.table.responseFormat — provide either " +
        "{ rowsPath, totalPath } or { getRows, getTotal }."
    );
  }
  const paths = isPathsFormat(table.responseFormat);
  const fns = isFnsFormat(table.responseFormat);
  if (paths === fns) {
    throw new Error(
      "noviq-ui: config.table.responseFormat must be exactly one of { rowsPath, totalPath } or " +
        `{ getRows, getTotal } — got a value matching ${paths ? "both" : "neither"}.`
    );
  }
}

const FORMAT_KEYS: (keyof NoviqUIFormats)[] = ["date", "time", "dateTime"];

function validateFormats(formats: NoviqUIFormats): void {
  for (const key of FORMAT_KEYS) {
    const value = formats[key];
    if (value === undefined) continue;
    if (typeof value !== "string" || value.trim() === "") {
      throw new Error(
        `noviq-ui: config.formats.${key} must be a non-empty format string, e.g. "${DATE_FORMAT}" — ` +
          `got ${JSON.stringify(value)}.`
      );
    }
  }
}

export function NoviqUIConfigProvider({
  config,
  children,
}: {
  config: NoviqUIConfig;
  children: React.ReactNode;
}) {
  // `table` is optional (an app may configure only `notify`), but if present it must be valid.
  if (config.table !== undefined) validateTableConfig(config.table);
  if (config.formats !== undefined) validateFormats(config.formats);
  return <NoviqUIConfigContext.Provider value={config}>{children}</NoviqUIConfigContext.Provider>;
}

export function useNoviqUIConfig(): NoviqUIConfig | undefined {
  return useContext(NoviqUIConfigContext);
}
