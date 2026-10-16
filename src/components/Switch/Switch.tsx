import React from "react";
import { KEY } from "../../constants";
import "./Switch.css";

export interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}

function Switch({ checked, onChange, disabled = false }: SwitchProps) {
  const toggle = () => {
    if (!disabled) onChange(!checked);
  };

  return (
    <div
      className={`nq-switch ${checked ? "nq-switch-checked" : ""} ${
        disabled ? "nq-switch-disabled" : ""
      }`}
      role="switch"
      aria-checked={checked}
      aria-disabled={disabled}
      tabIndex={disabled ? -1 : 0}
      onClick={toggle}
      onKeyDown={(e) => {
        if (e.key === KEY.ENTER || e.key === KEY.SPACE) {
          e.preventDefault();
          toggle();
        }
      }}
    >
      <div className="nq-switch-thumb" />
    </div>
  );
}

export default Switch;
