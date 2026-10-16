import React from "react";
import { useText } from "../../hooks/useText";
import "./LoadingOverlay.css";

function LoadingOverlay() {
  const t = useText();
  return (
    <div className="table-loading-overlay" role="status" aria-label={t("tableLoading")}>
      <div className="table-spinner" />
    </div>
  );
}

export default LoadingOverlay;
