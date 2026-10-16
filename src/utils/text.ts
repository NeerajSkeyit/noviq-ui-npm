import { devWarn } from "./devWarn";
import type { TextParams, TextValue } from "../config/types";

const PLACEHOLDER = /\{([A-Za-z]+)\}/g;

/**
 * Fills `{name}` placeholders from `params`. A placeholder with no param is left as written — a
 * missing value shows up as `{pages}` on screen instead of silently disappearing. The replacement
 * is a function so `$&`-style sequences inside a param are never interpreted.
 */
export function formatText(template: string, params?: TextParams): string {
  if (!params) return template;
  return template.replace(PLACEHOLDER, (match, name: string) =>
    Object.prototype.hasOwnProperty.call(params, name) ? String(params[name]) : match
  );
}

/**
 * The text for `key`: the app's override if there is one, otherwise the default. A function
 * override that throws or returns a non-string is reported and replaced by the default, because
 * the copy must never be the reason a component fails to render.
 */
export function resolveText<K extends string>(
  defaults: Readonly<Record<K, string>>,
  overrides: Partial<Record<K, TextValue | undefined>> | undefined,
  key: K,
  params?: TextParams
): string {
  const override = overrides?.[key];
  if (typeof override === "string") return formatText(override, params);
  if (typeof override === "function") {
    try {
      const result = override(params ?? {});
      if (typeof result === "string") return result;
      devWarn(`config.text.${key} returned ${typeof result}, not a string; using the default.`);
    } catch (error) {
      devWarn(`config.text.${key} threw; using the default.`, error);
    }
  }
  return formatText(defaults[key], params);
}
