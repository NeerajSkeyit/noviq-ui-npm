import React from "react";
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
      className={`switch ${checked ? "switch-checked" : ""} ${
        disabled ? "switch-disabled" : ""
      }`}
      role="switch"
      aria-checked={checked}
      aria-disabled={disabled}
      tabIndex={disabled ? -1 : 0}
      onClick={toggle}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          toggle();
        }
      }}
    >
      <div className="switch-thumb" />
    </div>
  );
}

export default Switch;
