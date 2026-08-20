import React from "react";
import "./Badge.css";

export type BadgeVariant = "default" | "secondary" | "destructive" | "outline";

export interface BadgeProps extends React.ComponentPropsWithRef<"div"> {
  variant?: BadgeVariant;
}

function Badge({ children, variant = "default", className = "", ...props }: BadgeProps) {
  return (
    <div className={`badge badge-${variant} ${className}`} {...props}>
      {children}
    </div>
  );
}

export default Badge;
