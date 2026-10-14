import React, { useEffect } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import Button from "../Button/Button";
import ScrollArea from "../ScrollArea/ScrollArea";
import {
  BUTTON_SIZE,
  BUTTON_VARIANT,
  DRAWER_HEIGHT_BY_SIZE,
  DRAWER_SIDE,
  DRAWER_SIZE,
  KEY,
  type DrawerSide,
  type DrawerSize,
} from "../../constants";
import "./Drawer.css";

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

function Drawer({
  isOpen,
  onClose,
  title = "Drawer",
  subtitle,
  children,
  footer,
  closeOnOutside = false,
  side = DRAWER_SIDE.RIGHT,
  size = DRAWER_SIZE.MD,
}: DrawerProps) {
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === KEY.ESCAPE && closeOnOutside) onClose();
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
          side === DRAWER_SIDE.LEFT || side === DRAWER_SIDE.RIGHT ? `drawer-content-${size}` : ""
        } ${isOpen ? "drawer-open" : ""}`}
        style={
          side === DRAWER_SIDE.TOP || side === DRAWER_SIDE.BOTTOM
            ? { height: DRAWER_HEIGHT_BY_SIZE[size], maxHeight: "100vh" }
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
            variant={BUTTON_VARIANT.GHOST}
            size={BUTTON_SIZE.ICON}
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
