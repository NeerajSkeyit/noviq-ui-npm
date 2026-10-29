import type { ReactNode } from "react";
import { DEFAULT_STATUS_STYLES, DEFAULT_TEXT, STATUS_CLASS } from "../../constants";
import type { NoviqUIStatusConfig, NoviqUIText, StatusRenderProps, StatusStyle } from "../../config/types";
import { resolveText } from "../../utils/text";

interface StatusEntry {
  className?: string;
  label?: string;
}

/** The levels of `NoviqUIStatusConfig` laid over the built-ins, with every status key normalised. */
export interface MergedStatusConfig {
  styles: ReadonlyMap<string, StatusEntry>;
  fallback: string;
  render?: (props: StatusRenderProps) => ReactNode;
}

export interface ResolvedStatus {
  label: string;
  className: string;
}

/** How a status is matched: trimmed and lower-case, as the table always has. */
const statusKey = (status: string) => status.trim().toLowerCase();

/** A status as it is shown: `"true"`/`"false"` read as Active/Inactive (in the configured `text`),
 * anything else has its underscores turned to spaces. */
export function formatStatusLabel(status: string, text?: NoviqUIText): string {
  if (status === "true") return resolveText(DEFAULT_TEXT, text, "statusActive");
  if (status === "false") return resolveText(DEFAULT_TEXT, text, "statusInactive");
  return status.replace(/_/g, " ");
}

/** The fields of a style that are actually set, so an unset one never wipes what is beneath it. */
function entryOf(style: StatusStyle): StatusEntry {
  const { className, label } = typeof style === "string" ? { className: style, label: undefined } : style;
  return { ...(className !== undefined && { className }), ...(label !== undefined && { label }) };
}

/**
 * Lays `layers` over the built-in statuses, **least specific first** (provider, then table, then
 * column). `styles` merge status by status and, within a status, field by field; `fallback` and
 * `render` are replaced by the latest layer that sets them. Nothing it is given is modified.
 */
export function mergeStatusConfigs(...layers: (NoviqUIStatusConfig | undefined)[]): MergedStatusConfig {
  // A Map, not an object: a status called "constructor" or "__proto__" must not reach Object's own members.
  const styles = new Map<string, StatusEntry>();
  for (const [status, className] of Object.entries(DEFAULT_STATUS_STYLES)) {
    styles.set(statusKey(status), { className });
  }
  let fallback: string = STATUS_CLASS.DEFAULT;
  let render: MergedStatusConfig["render"];

  for (const layer of layers) {
    if (!layer) continue;
    for (const [status, style] of Object.entries(layer.styles ?? {})) {
      if (style === undefined || style === null) continue;
      const key = statusKey(status);
      styles.set(key, { ...styles.get(key), ...entryOf(style) });
    }
    if (layer.fallback !== undefined) fallback = layer.fallback;
    if (layer.render !== undefined) render = layer.render;
  }
  return { styles, fallback, render };
}

/** The built-in statuses and nothing else: what a caller with no configuration resolves against. */
export const DEFAULT_MERGED_STATUSES: MergedStatusConfig = mergeStatusConfigs();

/** The class and label a status resolves to. `config` is the result of `mergeStatusConfigs`. */
export function resolveStatus(status: string, config: MergedStatusConfig, text?: NoviqUIText): ResolvedStatus {
  const entry = config.styles.get(statusKey(status));
  return {
    className: entry?.className ?? config.fallback,
    label: entry?.label ?? formatStatusLabel(status, text),
  };
}
