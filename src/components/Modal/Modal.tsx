import React from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import { X } from "../Icon/Icon";
import Button from "../Button/Button";
import { useEscapeLayer } from "../../hooks/useEscapeLayer";
import { useBodyScrollLock } from "../../hooks/useBodyScrollLock";
import { useOverlayZIndex } from "../../hooks/useOverlayZIndex";
import { BUTTON_SIZE, BUTTON_VARIANT, MODAL_SIZE, type ModalSize } from "../../constants";
import "./Modal.css";

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  closeOnOutside?: boolean;
  size?: ModalSize;
}

const backdropVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
};

const modalVariants: Variants = {
  hidden: {
    opacity: 0,
    scale: 0.95,
    y: 40,
  },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      duration: 0.2,
      ease: "easeOut",
    },
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    y: 40,
    transition: {
      duration: 0.15,
      ease: "easeIn",
    },
  },
};

function Modal({
  isOpen,
  onClose,
  title = "",
  subtitle = "",
  children,
  footer,
  closeOnOutside = true,
  size = MODAL_SIZE.MD,
}: ModalProps) {
  useBodyScrollLock(isOpen);

  useEscapeLayer(isOpen, onClose);
  const zIndex = useOverlayZIndex(isOpen);

  // Portaled to <body>, like Drawer: rendered where it is declared, a host ancestor with a
  // `transform`, `filter` or `z-index` would trap it (misplaced, or under the app's own header).
  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="nq-modal-overlay" style={{ zIndex }}>
          <motion.div
            className="nq-modal-backdrop"
            variants={backdropVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
            onClick={() => {
              if (closeOnOutside) onClose();
            }}
          />

          <motion.div
            className={`nq-modal-content nq-modal-${size}`}
            variants={modalVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="nq-modal-header">
              <div>
                <h2 className="nq-modal-title">{title}</h2>
                {subtitle && <p className="nq-modal-subtitle">{subtitle}</p>}
              </div>

              <Button
                variant={BUTTON_VARIANT.GHOST}
                size={BUTTON_SIZE.ICON}
                className="nq-modal-close"
                onClick={() => onClose()}
              >
                <X size={16} />
              </Button>
            </div>

            <div className="nq-modal-body">{children}</div>

            {footer && <div className="nq-modal-footer">{footer}</div>}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}

export default Modal;
