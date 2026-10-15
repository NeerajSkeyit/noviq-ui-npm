import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useEscapeLayer } from "../../hooks/useEscapeLayer";
import "./Dropdown.css";

export interface DropdownMenuItemProps {
  children?: React.ReactNode;
  onClick?: () => void;
  destructive?: boolean;
  disabled?: boolean;
  closeMenu?: () => void;
}

export function DropdownMenuItem({
  children,
  onClick,
  destructive = false,
  closeMenu,
  disabled = false,
  ...props
}: DropdownMenuItemProps) {
  return (
    <div
      className={`dropdown-item ${disabled ? "dropdown-item-disabled" : ""} ${
        destructive ? "dropdown-item-destructive" : ""
      }`}
      onClick={() => {
        if (disabled) return;
        onClick?.();
        closeMenu?.();
      }}
      {...props}
    >
      {children}
    </div>
  );
}

export interface DropdownMenuProps {
  trigger: React.ReactNode;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  children?: React.ReactElement<DropdownMenuItemProps> | React.ReactElement<DropdownMenuItemProps>[];
}

export function DropdownMenu({ trigger, isOpen, setIsOpen, children }: DropdownMenuProps) {
  const [position, setPosition] = useState({ top: 0, left: 0 });

  const wrapperRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  // Escape closes an open menu, and — as the topmost layer — only the menu: a menu opened inside a
  // Modal or Drawer closes before that overlay does.
  useEscapeLayer(isOpen, () => setIsOpen(false));

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(e.target as Node) &&
        contentRef.current &&
        !contentRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useLayoutEffect(() => {
    if (!isOpen) return;

    function updatePosition() {
      const triggerEl = triggerRef.current;
      const contentEl = contentRef.current;
      if (!triggerEl || !contentEl) return;

      const triggerRect = triggerEl.getBoundingClientRect();
      const contentRect = contentEl.getBoundingClientRect();

      let top = triggerRect.bottom;
      let left = triggerRect.left;

      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      if (triggerRect.bottom + contentRect.height > viewportHeight) {
        top = triggerRect.top - contentRect.height;
      }

      if (triggerRect.left + contentRect.width > viewportWidth) {
        left = viewportWidth - contentRect.width - 8;
      }

      if (left < 8) left = 8;

      setPosition({ top, left });
    }

    updatePosition();

    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);

    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [isOpen]);

  return (
    <div ref={wrapperRef}>
      <div ref={triggerRef}>{trigger}</div>

      {isOpen &&
        createPortal(
          <div
            ref={contentRef}
            className="dropdown-content"
            style={{ position: "fixed", top: position.top, left: position.left, zIndex: 1510 }}
          >
            {React.Children.map(children, (child) =>
              React.isValidElement(child)
                ? React.cloneElement(child, { closeMenu: () => setIsOpen(false) })
                : child
            )}
          </div>,
          document.body
        )}
    </div>
  );
}
