import React from "react";
import { useText } from "../../hooks/useText";
import "./LoadingOverlay.css";

function LoadingOverlay() {
  const t = useText();
  return (
    <div className="nq-table-loading-overlay" role="status" aria-label={t("tableLoading")}>
      <div className="nq-table-spinner" />
    </div>
  );
}

export default LoadingOverlay;
