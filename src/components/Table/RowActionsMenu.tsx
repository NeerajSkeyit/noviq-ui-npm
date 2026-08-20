import React, { useState } from "react";
import { MoreHorizontal } from "lucide-react";
import Button, { type ButtonVariant } from "../Button/Button";
import { DropdownMenu, DropdownMenuItem } from "../Dropdown/Dropdown";
import Switch from "../Switch/Switch";
import RejectAction from "./RejectAction";
import "./RowActionsMenu.css";

export interface RowActionContext<T = any> {
  action: RowAction<T>;
  index: number;
  row: T;
  rowIndex?: number;
  sn?: number;
  filterValues?: Record<string, unknown>;
  /** The typed-in reason, for a `variant: "reject"` action's confirm/click callbacks. */
  reason?: string;
}

export interface RowAction<T = any> {
  label: string;
  type?: "button" | "checkbox" | "icon";
  variant?: ButtonVariant | "reject";
  icon?: React.ComponentType<{ size?: number }>;
  disabled?: boolean;
  title?: string;
  checked?: boolean;
  onChange?: (checked: boolean) => void;
  onClick?: (ctx: RowActionContext<T>) => void;
  onConfirm?: (ctx: RowActionContext<T>) => void | Promise<void>;
}

export interface TablePaginationLike {
  page: number;
  pageSize: number;
}

export interface RowActionsMenuProps<T = any> {
  actions: RowAction<T>[];
  row: T;
  rowIndex: number;
  pagination: TablePaginationLike;
  getFilterParams?: () => Record<string, unknown>;
  isWithoutDropdown?: boolean;
}

function serialNumber(pagination: TablePaginationLike, rowIndex: number): number {
  return (pagination.page - 1) * pagination.pageSize + 1 + rowIndex;
}

function RowActionsMenu<T = any>({
  actions,
  row,
  rowIndex,
  pagination,
  getFilterParams,
  isWithoutDropdown = false,
}: RowActionsMenuProps<T>) {
  const [isOpen, setIsOpen] = useState(false);

  if (actions.length === 0) return null;

  const context = (action: RowAction<T>, index: number): RowActionContext<T> => ({
    action,
    index,
    row,
    rowIndex,
    sn: serialNumber(pagination, rowIndex),
    filterValues: getFilterParams?.(),
  });

  if (isWithoutDropdown) {
    return (
      <div className="row-actions-inline">
        {actions.map((action, index) => {
          const Icon = action.icon;

          if (action.type === "checkbox") {
            return (
              <Switch
                key={index}
                checked={!!action.checked}
                onChange={(checked) => action.onChange?.(checked)}
                disabled={action.disabled}
              />
            );
          }

          if (action.type === "button") {
            return (
              <Button
                key={index}
                variant={(action.variant as ButtonVariant) || "outline"}
                size="sm"
                disabled={action.disabled}
                title={action.title}
                isRowActionBtn
                onClick={() => action.onClick?.(context(action, index))}
              >
                {Icon ? (
                  <span title={action.label}>
                    <Icon size={16} />
                  </span>
                ) : (
                  action.label
                )}
              </Button>
            );
          }

          if (action.variant === "reject") {
            return (
              <RejectAction
                key={index}
                rejectText={action.label}
                onConfirm={async (reason) => {
                  const ctx = { ...context(action, index), reason };
                  if (action.onConfirm) {
                    await action.onConfirm(ctx);
                  }
                  action.onClick?.(ctx);
                }}
              />
            );
          }

          return (
            <Button
              key={index}
              variant={(action.variant as ButtonVariant) || "outline"}
              size="sm"
              title={action.title}
              disabled={action.disabled}
              isRowActionBtn
              onClick={() => action.onClick?.(context(action, index))}
            >
              {action.label}
            </Button>
          );
        })}
      </div>
    );
  }

  const dropdownActions = actions.filter((a) => a.type !== "button" && a.type !== "checkbox");
  const inlineActions = actions.filter((a) => a.type === "button" || a.type === "checkbox");

  return (
    <div className="row-actions-inline">
      <DropdownMenu
        isOpen={isOpen}
        setIsOpen={setIsOpen}
        trigger={
          <Button
            variant="ghost"
            size="icon"
            data-stop-row-click
            onClick={() => setIsOpen((prev) => !prev)}
          >
            <MoreHorizontal size={16} />
          </Button>
        }
      >
        {dropdownActions.map((action, index) => (
          <DropdownMenuItem
            key={index}
            onClick={() => {
              setIsOpen((prev) => !prev);
              action.onClick?.(context(action, index));
            }}
            destructive={action.variant === "destructive"}
          >
            {action.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenu>

      {inlineActions.map((action, index) => {
        const Icon = action.icon;
        if (action.type === "button") {
          return (
            <Button
              key={index}
              variant={(action.variant as ButtonVariant) || "outline"}
              size="sm"
              disabled={action.disabled}
              title={action.title}
              isRowActionBtn
              data-stop-row-click
              onClick={() => action.onClick?.(context(action, index))}
            >
              {Icon ? (
                <span title={action.label}>
                  <Icon size={16} />
                </span>
              ) : (
                action.label
              )}
            </Button>
          );
        }
        return (
          <Switch
            key={index}
            checked={!!action.checked}
            onChange={(checked) => action.onChange?.(checked)}
            disabled={action.disabled}
          />
        );
      })}
    </div>
  );
}

export default RowActionsMenu;
