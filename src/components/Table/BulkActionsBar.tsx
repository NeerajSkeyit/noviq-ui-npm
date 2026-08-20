import React from "react";
import { X } from "lucide-react";
import Button from "../Button/Button";
import "./BulkActionsBar.css";

export interface BulkAction {
  id: string;
  label: string;
  icon?: React.ReactNode;
  variant?: "destructive" | "secondary";
  onClick: (selectedIds: string[]) => void;
}

export interface BulkActionsBarProps {
  selectedCount: number;
  actions: BulkAction[];
  selectedIds: string[];
  onClearSelection: () => void;
}

function BulkActionsBar({ selectedCount, actions, selectedIds, onClearSelection }: BulkActionsBarProps) {
  if (selectedCount === 0) return null;

  return (
    <div className="bulk-actions-bar">
      <div className="bulk-actions-left">
        <span className="bulk-actions-text">
          {selectedCount} {selectedCount === 1 ? "row" : "rows"} selected
        </span>

        <button type="button" onClick={onClearSelection} className="bulk-actions-clear">
          <X size={12} />
          Clear
        </button>
      </div>

      <div className="bulk-actions-right">
        {actions.map((action) => (
          <Button
            key={action.id}
            variant={action.variant === "destructive" ? "destructive" : "secondary"}
            size="sm"
            onClick={() => action.onClick(selectedIds)}
          >
            {action.icon}
            {action.label}
          </Button>
        ))}
      </div>
    </div>
  );
}

export default BulkActionsBar;
