import React from "react";
import { Inbox } from "lucide-react";
import { useText } from "../../hooks/useText";
import "./EmptyState.css";

export interface EmptyStateProps {
  message?: string;
}

function EmptyState({ message }: EmptyStateProps) {
  const t = useText();
  return (
    <div className="nq-table-empty-state">
      <Inbox size={32} />
      <p>{message ?? t("tableEmpty")}</p>
    </div>
  );
}

export default EmptyState;
