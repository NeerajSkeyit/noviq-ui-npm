import { useMemo } from "react";
import { useNoviqUIConfig } from "../config/NoviqUIConfigProvider";
import { DEFAULT_TEXT, type TextKey } from "../constants";
import type { TextParams } from "../config/types";
import { resolveText } from "../utils/text";

export type TextFn = (key: TextKey, params?: TextParams) => string;

/**
 * The copy in force: `NoviqUIConfigProvider`'s `text` over the English defaults. Returns a
 * function so a component asks for one key at a time and fills its own `{placeholders}`.
 */
export function useText(): TextFn {
  const text = useNoviqUIConfig()?.text;
  return useMemo<TextFn>(
    () => (key, params) => resolveText(DEFAULT_TEXT, text, key, params),
    [text]
  );
}
