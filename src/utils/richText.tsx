import React from "react";
import type { TextFn } from "../hooks/useText";
import type { TextKey } from "../constants";

/** Delimits a placeholder name while a filled-in text is being split back into parts. */
const MARK = "\u0001";
const MARKED = new RegExp(`${MARK}([A-Za-z]+)${MARK}`);

/**
 * A text with React nodes where its `{placeholders}` are — for copy that styles a word or a
 * number ("…or **browse**", "Showing **1** to **10**"). The text is asked for with a marker in
 * each placeholder's place and split on the markers, so it works the same for a template string
 * and for a function the app supplied, and a translation is free to reorder the placeholders.
 */
export function richText(
  t: TextFn,
  key: TextKey,
  nodes: Record<string, React.ReactNode>,
  params: Record<string, string | number> = {}
): React.ReactNode[] {
  const markers = Object.fromEntries(Object.keys(nodes).map((name) => [name, `${MARK}${name}${MARK}`]));
  // split() with one capture group alternates: text, marker name, text, marker name, …
  return t(key, { ...params, ...markers })
    .split(MARKED)
    .map((chunk, i) =>
      i % 2 === 1 ? <React.Fragment key={i}>{nodes[chunk]}</React.Fragment> : chunk
    );
}
