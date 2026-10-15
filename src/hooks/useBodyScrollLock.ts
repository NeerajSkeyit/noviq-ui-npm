import { useEffect } from "react";

// Shared by every open overlay (module-level on purpose, like the Escape layer stack): the page is
// locked while *any* of them is open, and only the last one to close releases it.
let openLocks = 0;
let overflowBeforeLock = "";

/**
 * Locks page scroll (`body { overflow: hidden }`) while `active`.
 *
 * Reference-counted. Each overlay used to write `overflow = isOpen ? "hidden" : ""` on its own, so
 * closing a nested Drawer unlocked the page under a Modal that was still open, and a closed
 * Drawer (every Table mounts two) could cancel a Modal's lock. Now an overlay only takes a lock
 * while it is open, and the page's own previous `overflow` is restored at the end.
 */
export function useBodyScrollLock(active: boolean): void {
  useEffect(() => {
    if (!active) return;

    if (openLocks === 0) {
      overflowBeforeLock = document.body.style.overflow;
      document.body.style.overflow = "hidden";
    }
    openLocks += 1;

    return () => {
      openLocks -= 1;
      if (openLocks === 0) document.body.style.overflow = overflowBeforeLock;
    };
  }, [active]);
}
