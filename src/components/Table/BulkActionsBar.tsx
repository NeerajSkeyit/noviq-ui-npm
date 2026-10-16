import React from "react";
import { X } from "lucide-react";
import Button from "../Button/Button";
import { useText } from "../../hooks/useText";
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
  const t = useText();
  if (selectedCount === 0) return null;

  return (
    <div className="nq-bulk-actions-bar">
      <div className="nq-bulk-actions-left">
        <span className="nq-bulk-actions-text">
          {t(selectedCount === 1 ? "bulkSelectedOne" : "bulkSelected", { count: selectedCount })}
        </span>

        <button type={BUTTON_TYPE.BUTTON} onClick={onClearSelection} className="nq-bulk-actions-clear">
          <X size={12} />
          {t("bulkClear")}
        </button>
      </div>

      <div className="nq-bulk-actions-right">
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
