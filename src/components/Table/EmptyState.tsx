import React from "react";
import { Inbox } from "lucide-react";
import "./EmptyState.css";

export interface EmptyStateProps {
  message?: string;
}

function EmptyState({ message = "No data found" }: EmptyStateProps) {
  return (
    <div className="table-empty-state">
      <Inbox size={32} />
      <p>{message}</p>
    </div>
  );
}

export default EmptyState;
