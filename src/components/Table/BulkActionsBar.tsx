import React from "react";
import { X } from "lucide-react";
import Button from "../Button/Button";
import {
  BULK_ACTION_VARIANT,
  BUTTON_SIZE,
  BUTTON_TYPE,
  BUTTON_VARIANT,
  type BulkActionVariant,
} from "../../constants";
import "./BulkActionsBar.css";

export interface BulkAction {
  id: string;
  label: string;
  icon?: React.ReactNode;
  variant?: BulkActionVariant;
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

        <button type={BUTTON_TYPE.BUTTON} onClick={onClearSelection} className="bulk-actions-clear">
          <X size={12} />
          Clear
        </button>
      </div>

      <div className="bulk-actions-right">
        {actions.map((action) => (
          <Button
            key={action.id}
            variant={
              action.variant === BULK_ACTION_VARIANT.DESTRUCTIVE
                ? BUTTON_VARIANT.DESTRUCTIVE
                : BUTTON_VARIANT.SECONDARY
            }
            size={BUTTON_SIZE.SM}
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
