import React from "react";
import "./Label.css";

export interface LabelProps extends React.ComponentPropsWithRef<"label"> {
  disabled?: boolean;
}

function Label({ children, disabled = false, className = "", ...props }: LabelProps) {
  return (
    <label className={`label ${disabled ? "label-disabled" : ""} ${className}`} {...props}>
      {children}
    </label>
  );
}

export default Label;
