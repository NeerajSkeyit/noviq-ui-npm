import { useEffect, useRef } from "react";
import { KEY } from "../constants";

interface Layer {
  dismiss: () => void;
}

// Open overlays, oldest first. Module-level on purpose: layers from different components (a Modal,
// a Drawer opened from it, a Drawer inside a Table inside that Modal...) must see each other.
const layers: Layer[] = [];

function handleKeyDown(e: KeyboardEvent) {
  if (e.key !== KEY.ESCAPE) return;
  layers[layers.length - 1]?.dismiss();
}

/**
 * Makes an overlay respond to Escape *only while it is the topmost open overlay*.
 *
 * Without this, every open overlay has its own window/document listener, so one Escape closes a
 * Drawer and the Modal beneath it together. Layers are ordered by when they opened.
 *
 * - `active`: whether the overlay is open.
 * - `onDismiss`: what Escape does. Pass `undefined` for an overlay that is open but not
 *   Escape-dismissable — it is still a layer, so it shields the ones beneath it.
 *
 * Things that own an Escape *inside* an overlay (pickers, a select's menu) stop the event
 * themselves before it gets here, so Escape closes them first.
 */
export function useEscapeLayer(active: boolean, onDismiss?: () => void): void {
  // Always call the latest callback without re-registering: re-registering on every render would
  // move the layer to the top of the stack.
  const dismissRef = useRef(onDismiss);
  useEffect(() => {
    dismissRef.current = onDismiss;
  });

  useEffect(() => {
    if (!active) return;

    const layer: Layer = { dismiss: () => dismissRef.current?.() };
    layers.push(layer);
    if (layers.length === 1) window.addEventListener("keydown", handleKeyDown);

    return () => {
      const index = layers.indexOf(layer);
      if (index !== -1) layers.splice(index, 1);
      if (layers.length === 0) window.removeEventListener("keydown", handleKeyDown);
    };
  }, [active]);
}
