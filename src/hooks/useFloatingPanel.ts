import { useEffect, useLayoutEffect, useState, type RefObject } from "react";
import { FLOATING_PANEL_GAP, FLOATING_PANEL_VIEWPORT_MARGIN } from "../constants";

export interface FloatingPosition {
  top: number;
  left: number;
}

interface UseFloatingPanelArgs {
  open: boolean;
  /** Called on a mousedown outside both `containerRef` and `panelRef`. */
  onOutsideClick: () => void;
  /** The element the panel hangs off; the panel is positioned from its bounding rect. */
  anchorRef: RefObject<HTMLElement | null>;
  /** The portaled panel itself (measured for flip/clamp, and counted as "inside"). */
  panelRef: RefObject<HTMLElement | null>;
  /** Counted as "inside" besides the panel — usually the trigger's wrapper. */
  containerRef: RefObject<HTMLElement | null>;
  /** Changing this re-measures (use it when the panel's size changes while open). */
  remeasureKey?: unknown;
}

/**
 * The mechanics shared by the picker dropdowns (TimePicker, DatePicker, MonthPicker): close on an
 * outside mousedown, and keep a `position: fixed` panel pinned under its anchor — flipped above it
 * near the viewport bottom, clamped inside the viewport horizontally, and following the anchor on
 * scroll/resize. Returns the `{ top, left }` to apply to the panel's style.
 */
export function useFloatingPanel({
  open,
  onOutsideClick,
  anchorRef,
  panelRef,
  containerRef,
  remeasureKey,
}: UseFloatingPanelArgs): FloatingPosition {
  const [position, setPosition] = useState<FloatingPosition>({ top: 0, left: 0 });

  useEffect(() => {
    if (!open) return;
    function handleMouseDown(e: MouseEvent) {
      const target = e.target as Node;
      if (containerRef.current?.contains(target) || panelRef.current?.contains(target)) return;
      onOutsideClick();
    }
    document.addEventListener("mousedown", handleMouseDown);
    return () => document.removeEventListener("mousedown", handleMouseDown);
  }, [open, onOutsideClick, containerRef, panelRef]);

  useLayoutEffect(() => {
    if (!open) return;

    function updatePosition() {
      const anchor = anchorRef.current;
      const panel = panelRef.current;
      if (!anchor || !panel) return;

      const anchorRect = anchor.getBoundingClientRect();
      const panelRect = panel.getBoundingClientRect();

      let top = anchorRect.bottom + FLOATING_PANEL_GAP;
      if (top + panelRect.height > window.innerHeight) {
        top = Math.max(
          FLOATING_PANEL_VIEWPORT_MARGIN,
          anchorRect.top - panelRect.height - FLOATING_PANEL_GAP
        );
      }

      let left = anchorRect.left;
      if (left + panelRect.width > window.innerWidth) {
        left = window.innerWidth - panelRect.width - FLOATING_PANEL_VIEWPORT_MARGIN;
      }
      if (left < FLOATING_PANEL_VIEWPORT_MARGIN) left = FLOATING_PANEL_VIEWPORT_MARGIN;

      setPosition({ top, left });
    }

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open, remeasureKey, anchorRef, panelRef]);

  return position;
}
