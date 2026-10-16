import { useLayoutEffect, useEffect, useRef, useState } from "react";
import { OVERLAY_Z_STEP, Z_OVERLAY_VAR } from "../constants";

// Open overlays and the depth each was given. Module-level on purpose, like the Escape stack: a
// Modal, a Drawer opened from it and a Drawer inside a Table inside that Modal are different
// components that all have to agree who is on top.
const open = new Map<symbol, number>();
const highest = () => (open.size === 0 ? -1 : Math.max(...open.values()));

// useLayoutEffect warns when rendering on a server, where it does nothing anyway.
const useIsomorphicLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

/** `calc(var(--nq-z-overlay) + 10)` for depth 1: the scale's base plus a step per layer. */
const zIndexAt = (depth: number) => `calc(var(${Z_OVERLAY_VAR}) + ${depth * OVERLAY_Z_STEP})`;

/**
 * The z-index for a modal or drawer: above every overlay that was already open, whatever order
 * the components happened to mount in.
 *
 * With one shared `z-index` the winner among overlays is whichever sits later in the DOM — a
 * Modal opened from a Drawer ended up *behind* it, because the Drawer's element was added to the
 * page after the Modal's. So each overlay takes the next depth when it opens, keeps it for as long
 * as it stays open (nothing moves when a lower one closes), and releases it on close or unmount.
 * An overlay that has just closed keeps its last value, so it doesn't drop behind a still-open
 * one while it animates away.
 *
 * Returns `undefined` until the overlay has opened once.
 */
export function useOverlayZIndex(isOpen: boolean): string | undefined {
  const id = useRef<symbol | undefined>(undefined);
  if (!id.current) id.current = Symbol("overlay");
  const [depth, setDepth] = useState<number | null>(null);
  const last = useRef<string | undefined>(undefined);

  useIsomorphicLayoutEffect(() => {
    if (!isOpen) return;
    const mine = highest() + 1;
    open.set(id.current!, mine);
    setDepth(mine);
    return () => {
      open.delete(id.current!);
      setDepth(null);
    };
  }, [isOpen]);

  if (isOpen) last.current = zIndexAt(depth ?? highest() + 1); // before the effect has run, the depth it is about to take
  return last.current;
}
