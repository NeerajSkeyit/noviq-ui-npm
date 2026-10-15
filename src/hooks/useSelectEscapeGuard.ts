import { useState } from "react";
import { KEY } from "../constants";

/**
 * Props to spread onto a react-select so that Escape which closes its open menu does not also
 * dismiss the Modal/Drawer the select sits in. With the menu closed, Escape passes through.
 */
export function useSelectEscapeGuard() {
  const [menuOpen, setMenuOpen] = useState(false);

  return {
    onMenuOpen: () => setMenuOpen(true),
    onMenuClose: () => setMenuOpen(false),
    onKeyDown: (e: React.KeyboardEvent) => {
      // Runs before react-select's own handling, so `menuOpen` is still true for this keystroke.
      if (e.key === KEY.ESCAPE && menuOpen) e.stopPropagation();
    },
  };
}
