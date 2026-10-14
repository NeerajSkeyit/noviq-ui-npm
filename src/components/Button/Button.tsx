import React from "react";
import { BUTTON_SIZE, BUTTON_VARIANT, type ButtonSize, type ButtonVariant } from "../../constants";
import "./Button.css";

export interface ButtonProps
  extends Omit<React.ComponentPropsWithRef<"button">, "size"> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isRowActionBtn?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    {
      children,
      variant = BUTTON_VARIANT.DEFAULT,
      size = BUTTON_SIZE.MD,
      className = "",
      isRowActionBtn,
      ...props
    },
    ref
  ) {
    return (
      <button
        ref={ref}
        className={`btn btn-${variant} ${
          isRowActionBtn ? "btn-row-action" : ""
        } btn-${size} ${className}`}
        {...props}
      >
        {children}
      </button>
    );
  }
);

export default Button;
