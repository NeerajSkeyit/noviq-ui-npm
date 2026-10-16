import React, { forwardRef } from "react";
import { KEY } from "../../constants";
import "./Checkbox.css";

export interface CheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  /** Names the checkbox for assistive technology — it has no visible label of its own. */
  "aria-label"?: string;
}

const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ checked, onChange, disabled = false, "aria-label": ariaLabel, ...props }, ref) => {
    return (
      <label className="nq-checkbox-wrapper">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          disabled={disabled}
          ref={ref}
          className="nq-checkbox-input"
          // Hidden by the `hidden` attribute (the browser's own `display: none`) rather than only
          // by our stylesheet, so an app that forgot `style.css` doesn't expose two checkboxes.
          hidden
          aria-hidden="true"
          tabIndex={-1}
          {...props}
        />
        {/* The native input above is hidden, which also removes it from the accessibility
            tree — so the visible box below carries the real ARIA checkbox semantics and
            keyboard support instead. */}
        <div
          role="checkbox"
          aria-label={ariaLabel}
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
            if (e.key === KEY.ENTER || e.key === KEY.SPACE) {
              e.preventDefault();
              onChange(!checked);
            }
          }}
          className={`nq-checkbox-box ${checked ? "nq-checkbox-box-checked" : ""} ${disabled ? "nq-checkbox-box-disabled" : ""}`}
        >
          {checked && <span className="nq-checkbox-icon">✓</span>}
        </div>
      </label>
    );
  }
);

Checkbox.displayName = "Checkbox";

export default Checkbox;
