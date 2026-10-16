import React from "react";
import "./ScrollArea.css";

export interface ScrollAreaProps {
  children?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

function ScrollArea({ children, className = "", style = {} }: ScrollAreaProps) {
  return (
    <div className={`nq-scrollAreaRoot ${className}`} style={style}>
      <div className="nq-scrollAreaViewport">{children}</div>
    </div>
  );
}

export default ScrollArea;
