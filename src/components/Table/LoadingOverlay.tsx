import React from "react";
import "./LoadingOverlay.css";

function LoadingOverlay() {
  return (
    <div className="table-loading-overlay" role="status" aria-label="Loading">
      <div className="table-spinner" />
    </div>
  );
}

export default LoadingOverlay;
