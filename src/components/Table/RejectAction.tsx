import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useHotkeys } from "react-hotkeys-hook";
import Button from "../Button/Button";
import { BUTTON_VARIANT, HOTKEY, REJECT_REASON_MIN_LENGTH, Z_INDEX } from "../../constants";
import { useText, type TextFn } from "../../hooks/useText";
import "./RejectAction.css";

const LEADING_SPACE_REGEX = /^\s/;
const REPEATING_CHAR_REGEX = /(.)\1{3,}/;
const ALPHANUMERIC_CHECK_REGEX = /^(?=.*[A-Za-z0-9]).+$/;
const ONLY_NUMBERS_REGEX = /^\d+$/;

function validateReason(value: string, t: TextFn): string {
  if (!value) return t("rejectReasonRequired");
  if (value.length < REJECT_REASON_MIN_LENGTH) {
    return t("rejectReasonMinLength", { min: REJECT_REASON_MIN_LENGTH });
  }
  if (LEADING_SPACE_REGEX.test(value)) return t("rejectReasonLeadingSpace");
  if (REPEATING_CHAR_REGEX.test(value)) return t("rejectReasonRepeating");
  if (!ALPHANUMERIC_CHECK_REGEX.test(value)) return t("rejectReasonSymbolsOnly");
  if (ONLY_NUMBERS_REGEX.test(value)) return t("rejectReasonOnlyNumbers");
  return "";
}

export interface RejectActionProps {
  rejectText?: string;
  onConfirm: (reason: string) => void | Promise<void>;
  disabled?: boolean;
}

function RejectAction({ rejectText, onConfirm, disabled }: RejectActionProps) {
  const t = useText();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [rejectReasonError, setRejectReasonError] = useState("");
  const [position, setPosition] = useState({ top: 0, left: 0, width: 0 });
  const [loading, setLoading] = useState(false);

  const wrapperRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node) &&
        !loading
      ) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [loading]);

  useEffect(() => {
    setReason("");
  }, [open]);

  useEffect(() => {
    const handleScroll = () => setOpen(false);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const calculatePosition = () => {
    if (!buttonRef.current || !popoverRef.current) return;

    const rect = buttonRef.current.getBoundingClientRect();
    const popRect = popoverRef.current.getBoundingClientRect();
    const viewportWidth = window.innerWidth;

    let left = rect.left - popRect.width - 8;
    const top = rect.bottom - popRect.height;

    if (left + popRect.width > viewportWidth - 8) {
      left = viewportWidth - popRect.width - 8;
    }
    if (left < 8) left = 8;

    setPosition({ top, left, width: popRect.width });
  };

  const togglePopover = () => setOpen((prev) => !prev);

  const handleConfirm = async () => {
    const validationError = validateReason(reason, t);
    if (validationError) {
      setRejectReasonError(validationError);
      return;
    }

    setLoading(true);
    try {
      await onConfirm(reason);
      setReason("");
      setRejectReasonError("");
      setOpen(false);
    } catch (err) {
      console.error("Reject failed", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      requestAnimationFrame(() => calculatePosition());
    }
  }, [open]);

  useHotkeys(
    HOTKEY.CLOSE,
    (e) => {
      if (!open) return; // nothing of ours is showing: let Escape reach whatever is beneath
      e.stopPropagation(); // dismisses the popover only, not an overlay it sits in
      if (!loading) setOpen(false);
    },
    // The reason textarea auto-focuses on open, and react-hotkeys-hook
    // ignores hotkeys inside form fields by default — without this, Escape
    // would silently do nothing while the user is typing.
    { enableOnFormTags: true },
    [open]
  );

  return (
    <div className="nq-reject-action-wrapper" ref={wrapperRef}>
      <Button
        ref={buttonRef}
        variant={BUTTON_VARIANT.DESTRUCTIVE}
        onClick={togglePopover}
        disabled={disabled || loading}
        isRowActionBtn
      >
        {loading ? t("rejectWaiting") : rejectText || t("rejectLabel")}
      </Button>

      {open &&
        createPortal(
          <div
            ref={popoverRef}
            className="nq-reject-action-popover"
            style={{ position: "fixed", top: position.top, left: position.left, zIndex: Z_INDEX.POPOVER }}
          >
            <h4>{t("rejectTitle")}</h4>

            <textarea
              placeholder={t("rejectPlaceholder")}
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                setRejectReasonError("");
              }}
              disabled={disabled || loading}
              autoFocus
            />
            {rejectReasonError && (
              <p className="nq-reject-action-error">{rejectReasonError}</p>
            )}

            <Button variant={BUTTON_VARIANT.DESTRUCTIVE} onClick={handleConfirm} disabled={!reason.trim() || disabled || loading}>
              {t("rejectConfirm")}
            </Button>
          </div>,
          document.body
        )}
    </div>
  );
}

export default RejectAction;
