import React, { useEffect } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import Button from "../Button/Button";
import ScrollArea from "../ScrollArea/ScrollArea";
import "./Drawer.css";

export type DrawerSide = "right" | "left" | "top" | "bottom";
export type DrawerSize = "sm" | "md" | "lg";

export interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  closeOnOutside?: boolean;
  side?: DrawerSide;
  size?: DrawerSize;
}

const heightBySize: Record<DrawerSize, number> = {
  sm: 420,
  md: 520,
  lg: 620,
};

function Drawer({
  isOpen,
  onClose,
  title = "Drawer",
  subtitle,
  children,
  footer,
  closeOnOutside = false,
  side = "right",
  size = "md",
}: DrawerProps) {
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape" && closeOnOutside) onClose();
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEsc);
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }

    return () => {
      document.removeEventListener("keydown", handleEsc);
      document.body.style.overflow = "";
    };
  }, [isOpen, onClose, closeOnOutside]);

  return createPortal(
    <>
      {isOpen && (
        <div
          className="drawer-overlay"
          onClick={() => {
            if (closeOnOutside) onClose();
          }}
        />
      )}

      <div
        className={`drawer-content drawer-${side} ${
          side === "left" || side === "right" ? `drawer-content-${size}` : ""
        } ${isOpen ? "drawer-open" : ""}`}
        style={
          side === "top" || side === "bottom"
            ? { height: heightBySize[size], maxHeight: "100vh" }
            : undefined
        }
        aria-hidden={!isOpen}
      >
        <div className="drawer-header">
          <span>
            <h3 className="drawer-title">{title}</h3>
            {subtitle && <p className="drawer-subtitle">{subtitle}</p>}
          </span>

          <Button
            variant="ghost"
            size="icon"
            className="drawer-close"
            onClick={() => onClose()}
          >
            <X size={16} />
          </Button>
        </div>

        <ScrollArea className="drawer-body">{children}</ScrollArea>

        <div className="drawer-footer">{footer ? footer : null}</div>
      </div>
    </>,
    document.body
  );
}

export default Drawer;
