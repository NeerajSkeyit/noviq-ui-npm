import React, { createContext, useContext } from "react";
import type { NoviqUIConfig, NoviqUIFormats, NoviqUITableConfig, NoviqUIText } from "./types";
import { devWarn } from "../utils/devWarn";
import {
  CURRENCY_CODE_PATTERN,
  DATE_FORMAT,
  DAYS_IN_WEEK,
  DEFAULT_CURRENCY,
  DEFAULT_LOCALE,
  DEFAULT_TEXT,
} from "../constants";
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

function isLocaleTag(value: unknown): boolean {
  if (typeof value !== "string" || value.trim() === "") return false;
  try {
    Intl.getCanonicalLocales(value);
    return true;
  } catch {
    return false;
  }
}

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

  const { locale, currency, weekStart } = formats;
  if (locale !== undefined && !isLocaleTag(locale)) {
    throw new Error(
      `noviq-ui: config.formats.locale must be a BCP-47 language tag, e.g. "${DEFAULT_LOCALE}" or ` +
        `"de-DE" — got ${JSON.stringify(locale)}.`
    );
  }
  if (currency !== undefined && !(typeof currency === "string" && CURRENCY_CODE_PATTERN.test(currency))) {
    throw new Error(
      `noviq-ui: config.formats.currency must be a three-letter ISO 4217 code, e.g. ` +
        `"${DEFAULT_CURRENCY}" — got ${JSON.stringify(currency)}.`
    );
  }
  if (
    weekStart !== undefined &&
    !(Number.isInteger(weekStart) && weekStart >= 0 && weekStart < DAYS_IN_WEEK)
  ) {
    throw new Error(
      `noviq-ui: config.formats.weekStart must be a whole number from 0 (Sunday) to ` +
        `${DAYS_IN_WEEK - 1} (Saturday) — got ${JSON.stringify(weekStart)}.`
    );
  }
}

function validateText(text: NoviqUIText): void {
  if (text === null || typeof text !== "object" || Array.isArray(text)) {
    throw new Error(
      `noviq-ui: config.text must be an object of { key: string | function } — got ${
        Array.isArray(text) ? "an array" : JSON.stringify(text)
      }.`
    );
  }
  for (const [key, value] of Object.entries(text)) {
    if (!Object.prototype.hasOwnProperty.call(DEFAULT_TEXT, key)) {
      // A typo'd key would otherwise do nothing, silently. Not an error: a key removed in a later
      // release must not crash an app that still sets it.
      devWarn(`config.text.${key} is not a text key noviq-ui reads; it is ignored. See DEFAULT_TEXT.`);
      continue;
    }
    if (value !== undefined && typeof value !== "string" && typeof value !== "function") {
      throw new Error(
        `noviq-ui: config.text.${key} must be a string or a function returning one — got ${JSON.stringify(
          value
        )}.`
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
  if (config.text !== undefined) validateText(config.text);
  return <NoviqUIConfigContext.Provider value={config}>{children}</NoviqUIConfigContext.Provider>;
}

export function useNoviqUIConfig(): NoviqUIConfig | undefined {
  return useContext(NoviqUIConfigContext);
}
