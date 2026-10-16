import React from "react";
import { BADGE_VARIANT, type BadgeVariant } from "../../constants";
import "./Badge.css";

export interface BadgeProps extends React.ComponentPropsWithRef<"div"> {
  variant?: BadgeVariant;
}

function Badge({ children, variant = BADGE_VARIANT.DEFAULT, className = "", ...props }: BadgeProps) {
  return (
    <div className={`nq-badge nq-badge-${variant} ${className}`} {...props}>
      {children}
    </div>
  );
}

export default Badge;
