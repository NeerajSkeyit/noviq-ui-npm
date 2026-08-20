import React, { forwardRef } from "react";
import "./Checkbox.css";

export interface CheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}

const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ checked, onChange, disabled = false, ...props }, ref) => {
    return (
      <label className="checkbox-wrapper">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          disabled={disabled}
          ref={ref}
          className="checkbox-input"
          {...props}
        />
        {/* The native input above is visually hidden (display:none), which also removes it
            from the accessibility tree — so the visible box below carries the real ARIA
            checkbox semantics and keyboard support instead. */}
        <div
          role="checkbox"
          aria-checked={checked}
          aria-disabled={disabled}
          tabIndex={disabled ? -1 : 0}
          onClick={(e) => {
            // The native input is display:none, so clicking the label can't rely on
            // browser label-forwarding to reach it — handle the toggle here directly.
            e.preventDefault();
            if (!disabled) onChange(!checked);
          }}
          onKeyDown={(e) => {
            if (disabled) return;
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onChange(!checked);
            }
          }}
          className={`checkbox-box ${checked ? "checkbox-box-checked" : ""} ${disabled ? "checkbox-box-disabled" : ""}`}
        >
          {checked && <span className="checkbox-icon">✓</span>}
        </div>
      </label>
    );
  }
);

Checkbox.displayName = "Checkbox";

export default Checkbox;
