import React from "react";
import { X } from "lucide-react";
import { BUTTON_TYPE } from "../../constants";
import "./PickerField.css";

interface PickerFieldProps {
  /** Trigger text when a value is set. */
  displayValue: string;
  placeholder: string;
  hasValue: boolean;
  icon: React.ReactNode;
  open: boolean;
  disabled: boolean;
  error: boolean;
  clearable: boolean;
  clearLabel: string;
  /** Popup kind announced to assistive tech (`"grid"` for a calendar). React's own ARIA typing. */
  popupRole: React.AriaAttributes["aria-haspopup"];
  controlsId?: string;
  activeDescendant?: string;
  id?: string;
  name?: string;
  className?: string;
  ariaLabel?: string;
  triggerRef: React.RefObject<HTMLButtonElement | null>;
  wrapperRef: React.RefObject<HTMLDivElement | null>;
  onToggle: () => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLButtonElement>) => void;
  onClear: () => void;
  /** The portaled dropdown, rendered while `open`. */
  children?: React.ReactNode;
}

/**
 * The trigger shell shared by DatePicker and MonthPicker: a combobox button showing the value (or a
 * placeholder), a clear button, and the slot for the portaled dropdown. Internal — not exported.
 */
function PickerField({
  displayValue,
  placeholder,
  hasValue,
  icon,
  open,
  disabled,
  error,
  clearable,
  clearLabel,
  popupRole,
  controlsId,
  activeDescendant,
  id,
  name,
  className = "",
  ariaLabel,
  triggerRef,
  wrapperRef,
  onToggle,
  onKeyDown,
  onClear,
  children,
}: PickerFieldProps) {
  return (
    <div ref={wrapperRef} className={`nq-picker-field ${className}`}>
      <button
        ref={triggerRef}
        type={BUTTON_TYPE.BUTTON}
        id={id}
        name={name}
        role="combobox"
        aria-haspopup={popupRole}
        aria-expanded={open}
        aria-controls={open ? controlsId : undefined}
        aria-activedescendant={activeDescendant}
        aria-label={ariaLabel}
        aria-invalid={error || undefined}
        disabled={disabled}
        className={`nq-picker-field-trigger${error ? " nq-picker-field-error" : ""}`}
        onClick={onToggle}
        onKeyDown={onKeyDown}
      >
        <span className={`nq-picker-field-value${hasValue ? "" : " nq-is-placeholder"}`}>
          {hasValue ? displayValue : placeholder}
        </span>
        {!disabled && icon}
      </button>

      {clearable && hasValue && !disabled && (
        <button
          type={BUTTON_TYPE.BUTTON}
          className="nq-picker-field-clear"
          aria-label={clearLabel}
          onClick={onClear}
        >
          <X size={14} aria-hidden />
        </button>
      )}

      {children}
    </div>
  );
}

export default PickerField;
