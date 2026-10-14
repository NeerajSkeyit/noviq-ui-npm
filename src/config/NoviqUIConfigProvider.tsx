import React, { createContext, useContext } from "react";
import type { NoviqUIConfig, NoviqUITableConfig } from "./types";
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

export function NoviqUIConfigProvider({
  config,
  children,
}: {
  config: NoviqUIConfig;
  children: React.ReactNode;
}) {
  // `table` is optional (an app may configure only `notify`), but if present it must be valid.
  if (config.table !== undefined) validateTableConfig(config.table);
  return <NoviqUIConfigContext.Provider value={config}>{children}</NoviqUIConfigContext.Provider>;
}

export function useNoviqUIConfig(): NoviqUIConfig | undefined {
  return useContext(NoviqUIConfigContext);
}
