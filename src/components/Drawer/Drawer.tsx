import React from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import Button from "../Button/Button";
import ScrollArea from "../ScrollArea/ScrollArea";
import { useEscapeLayer } from "../../hooks/useEscapeLayer";
import { useBodyScrollLock } from "../../hooks/useBodyScrollLock";
import { useText } from "../../hooks/useText";
import {
  BUTTON_SIZE,
  BUTTON_VARIANT,
  DRAWER_HEIGHT_BY_SIZE,
  DRAWER_SIDE,
  DRAWER_SIZE,
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
  title,
  subtitle,
  children,
  footer,
  closeOnOutside = false,
  side = DRAWER_SIDE.RIGHT,
  size = DRAWER_SIZE.MD,
}: DrawerProps) {
  // Escape dismisses a drawer only when it is the topmost overlay and `closeOnOutside` is set. An
  // open drawer that ignores Escape is still a layer, so it shields a Modal beneath it.
  useEscapeLayer(isOpen, closeOnOutside ? onClose : undefined);

  useBodyScrollLock(isOpen);
  const t = useText();

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
            <h3 className="drawer-title">{title ?? t("drawerTitle")}</h3>
            {subtitle && <p className="drawer-subtitle">{subtitle}</p>}
          </span>

          <Button
            variant={BUTTON_VARIANT.GHOST}
            size={BUTTON_SIZE.ICON}
            className="drawer-close"
            aria-label={t("drawerClose")}
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
