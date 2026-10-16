import React, { useRef, useState } from "react";
import { useHotkeys } from "react-hotkeys-hook";
import { ChevronDown, Search } from "lucide-react";
import Button from "../Button/Button";
import { DropdownMenu, DropdownMenuItem } from "../Dropdown/Dropdown";
import { ACTION_ID, BUTTON_SIZE, BUTTON_VARIANT, HOTKEY } from "../../constants";
import { useText } from "../../hooks/useText";
import "./ActionBar.css";

export interface ActionBarOption {
  id?: string;
  label: string;
  icon?: React.ComponentType<{ size?: number }>;
  onClick?: (ctx: { option: ActionBarOption }) => void;
  disabled?: boolean;
  loading?: boolean;
}

export interface ActionBarAction {
  id?: string;
  label: string;
  icon?: React.ComponentType<{ size?: number }>;
  onClick?: (ctx: { action: ActionBarAction }) => void;
  disabled?: boolean;
  loading?: boolean;
  options?: ActionBarOption[];
}

export interface ActionBarProps {
  isSearchHidden?: boolean;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  actions?: ActionBarAction[];
  /** Rendered in the toolbar's right section, before `exportControl`/`columnSelector` (e.g. a filters drawer trigger). */
  filters?: React.ReactNode;
  /** Rendered in the toolbar's right section, between `filters` and `columnSelector`. */
  exportControl?: React.ReactNode;
  /** Rendered at the end of the toolbar's right section (e.g. a column chooser). */
  columnSelector?: React.ReactNode;
}

function ActionBar({
  isSearchHidden = false,
  searchValue = "",
  onSearchChange = () => {},
  searchPlaceholder,
  actions = [],
  filters,
  exportControl,
  columnSelector,
}: ActionBarProps) {
  const [openMenus, setOpenMenus] = useState<Record<string, boolean>>({});
  const inputRef = useRef<HTMLInputElement>(null);
  const t = useText();

  useHotkeys(
    HOTKEY.FOCUS_SEARCH,
    (e) => {
      e.preventDefault();
      inputRef.current?.focus();
    },
    { enableOnFormTags: false, enableOnContentEditable: false }
  );

  return (
    <div className="table-action-bar">
      <div className="table-action-row">
        <div className="table-action-left">
          {!isSearchHidden && (
            <div className="table-search-wrapper">
              <Search size={16} className="table-search-icon" />
              <input
                type="search"
                ref={inputRef}
                value={searchValue}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder={searchPlaceholder ?? t("tableSearchPlaceholder")}
                className="table-search-input"
              />
            </div>
          )}
        </div>

        <div className="table-action-right">
          {actions.map((action) => {
            const Icon = action.icon;

            if (action.options?.length) {
              if (action.options.length > 1 && !action.onClick) {
                return (
                  <DropdownMenu
                    key={action.label}
                    isOpen={!!openMenus[action.label]}
                    setIsOpen={(open) =>
                      setOpenMenus((prev) => ({ ...prev, [action.label]: open }))
                    }
                    trigger={
                      <Button
                        variant={
                          action.id === ACTION_ID.ADD ? BUTTON_VARIANT.DEFAULT : BUTTON_VARIANT.OUTLINE
                        }
                        size={BUTTON_SIZE.SM}
                        onClick={() =>
                          setOpenMenus((prev) => ({
                            ...prev,
                            [action.label]: !prev[action.label],
                          }))
                        }
                      >
                        {Icon ? <Icon size={16} /> : null}
                        {action.label}
                        <ChevronDown size={16} />
                      </Button>
                    }
                  >
                    {action.options.map((option) => {
                      const OptionIcon = option.icon;
                      return (
                        <DropdownMenuItem
                          key={option.label}
                          disabled={option.disabled || option.loading}
                          onClick={() => option.onClick?.({ option })}
                        >
                          {OptionIcon ? <OptionIcon size={16} /> : null}
                          {option.label}
                        </DropdownMenuItem>
                      );
                    })}
                  </DropdownMenu>
                );
              }

              if (!action.onClick) {
                return action.options.map((option) => {
                  const OptionIcon = option.icon;
                  return (
                    <Button
                      key={option.label}
                      variant={
                        option.id === ACTION_ID.ADD ? BUTTON_VARIANT.DEFAULT : BUTTON_VARIANT.OUTLINE
                      }
                      size={BUTTON_SIZE.SM}
                      onClick={() => option.onClick?.({ option })}
                      disabled={option.disabled || option.loading}
                    >
                      {OptionIcon ? <OptionIcon size={16} /> : null}
                      {option.label}
                    </Button>
                  );
                });
              }
            }

            return (
              <Button
                key={action.label}
                variant={
                  action.id === ACTION_ID.ADD ? BUTTON_VARIANT.DEFAULT : BUTTON_VARIANT.OUTLINE
                }
                size={BUTTON_SIZE.SM}
                onClick={() => action.onClick?.({ action })}
                disabled={action.disabled || action.loading}
              >
                {Icon ? <Icon size={16} /> : null}
                {action.label}
              </Button>
            );
          })}
          {filters}
          {exportControl}
          {columnSelector}
        </div>
      </div>
    </div>
  );
}

export default ActionBar;
