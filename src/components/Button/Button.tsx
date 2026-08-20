import React from "react";
import "./Button.css";

export type ButtonVariant =
  | "default"
  | "outline"
  | "destructive"
  | "secondary"
  | "ghost"
  | "link";

export type ButtonSize = "sm" | "md" | "lg" | "icon";

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
      variant = "default",
      size = "md",
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
