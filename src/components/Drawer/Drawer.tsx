import React, { useEffect, useState } from "react";
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
  DRAWER_EXIT_MS,
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
  /**
   * Take `children` and `footer` out of the page while the drawer is closed. By default a closed
   * drawer keeps them mounted, just hidden — so a form in it stays live (state, effects,
   * autofocus) and two drawers can render the same `id`. With this set they mount when it opens
   * and are removed once it has slid away, and state inside starts fresh on every open.
   */
  unmountOnClose?: boolean;
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
  unmountOnClose = false,
}: DrawerProps) {
  // Escape dismisses a drawer only when it is the topmost overlay and `closeOnOutside` is set. An
  // open drawer that ignores Escape is still a layer, so it shields a Modal beneath it.
  useEscapeLayer(isOpen, closeOnOutside ? onClose : undefined);

  useBodyScrollLock(isOpen);
  const t = useText();

  // Stay mounted through the slide-out, then let go. While open it is always mounted, in the same
  // render the drawer opens — no wait for an effect.
  const [lingering, setLingering] = useState(isOpen);
  useEffect(() => {
    if (isOpen) {
      setLingering(true);
      return;
    }
    if (!unmountOnClose) return;
    const timer = setTimeout(() => setLingering(false), DRAWER_EXIT_MS);
    return () => clearTimeout(timer);
  }, [isOpen, unmountOnClose]);
  const showContent = !unmountOnClose || isOpen || lingering;

  return createPortal(
    <>
      {isOpen && (
        <div
          className="nq-drawer-overlay"
          onClick={() => {
            if (closeOnOutside) onClose();
          }}
        />
      )}

      <div
        className={`nq-drawer-content nq-drawer-${side} ${
          side === DRAWER_SIDE.LEFT || side === DRAWER_SIDE.RIGHT ? `nq-drawer-content-${size}` : ""
        } ${isOpen ? "nq-drawer-open" : ""}`}
        style={
          side === DRAWER_SIDE.TOP || side === DRAWER_SIDE.BOTTOM
            ? { height: DRAWER_HEIGHT_BY_SIZE[size], maxHeight: "100vh" }
            : undefined
        }
        aria-hidden={!isOpen}
      >
        <div className="nq-drawer-header">
          <span>
            <h3 className="nq-drawer-title">{title ?? t("drawerTitle")}</h3>
            {subtitle && <p className="nq-drawer-subtitle">{subtitle}</p>}
          </span>

          <Button
            variant={BUTTON_VARIANT.GHOST}
            size={BUTTON_SIZE.ICON}
            className="nq-drawer-close"
            aria-label={t("drawerClose")}
            onClick={() => onClose()}
          >
            <X size={16} />
          </Button>
        </div>

        <ScrollArea className="nq-drawer-body">{showContent ? children : null}</ScrollArea>

        <div className="nq-drawer-footer">{showContent && footer ? footer : null}</div>
      </div>
    </>,
    document.body
  );
}

export default Drawer;
