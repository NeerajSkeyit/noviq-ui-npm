import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useHotkeys } from "react-hotkeys-hook";
import Button from "../Button/Button";
import { BUTTON_VARIANT, HOTKEY } from "../../constants";
import "./RejectAction.css";

const LEADING_SPACE_REGEX = /^\s/;
const REPEATING_CHAR_REGEX = /(.)\1{3,}/;
const ALPHANUMERIC_CHECK_REGEX = /^(?=.*[A-Za-z0-9]).+$/;
const ONLY_NUMBERS_REGEX = /^\d+$/;

function validateReason(value: string): string {
  if (!value) return "Reject reason is required";
  if (value.length < 4) return "Minimum 4 characters required";
  if (LEADING_SPACE_REGEX.test(value)) return "Reason cannot start with a space";
  if (REPEATING_CHAR_REGEX.test(value)) return "Reason cannot contain repeating characters";
  if (!ALPHANUMERIC_CHECK_REGEX.test(value)) return "Reason cannot contain only symbols";
  if (ONLY_NUMBERS_REGEX.test(value)) return "Cannot contain only numbers";
  return "";
}

export interface RejectActionProps {
  rejectText?: string;
  onConfirm: (reason: string) => void | Promise<void>;
  disabled?: boolean;
}

function RejectAction({ rejectText, onConfirm, disabled }: RejectActionProps) {
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
    const validationError = validateReason(reason);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    <div className="reject-action-wrapper" ref={wrapperRef}>
      <Button
        ref={buttonRef}
        variant={BUTTON_VARIANT.DESTRUCTIVE}
        onClick={togglePopover}
        disabled={disabled || loading}
        isRowActionBtn
      >
        {loading ? "Please wait..." : rejectText || "Reject"}
      </Button>

      {open &&
        createPortal(
          <div
            ref={popoverRef}
            className="reject-action-popover"
            style={{ position: "fixed", top: position.top, left: position.left, zIndex: 10 }}
          >
            <h4>Add Reason</h4>

            <textarea
              placeholder="Reason..."
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                setRejectReasonError("");
              }}
              disabled={disabled || loading}
              autoFocus
            />
            {rejectReasonError && (
              <p className="reject-action-error">{rejectReasonError}</p>
            )}

            <Button variant={BUTTON_VARIANT.DESTRUCTIVE} onClick={handleConfirm} disabled={!reason.trim() || disabled || loading}>
              Confirm
            </Button>
          </div>,
          document.body
        )}
    </div>
  );
}

export default RejectAction;
