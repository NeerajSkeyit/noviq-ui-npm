import React from "react";
import { X } from "lucide-react";
import type { ActiveFilter } from "./buildActiveFilter";
import { BUTTON_TYPE } from "../../constants";
import { useText } from "../../hooks/useText";
import "./FilterChips.css";

export interface FilterChipsProps {
  filters: ActiveFilter[];
  onRemove: (filterId: string) => void;
  onClearAll: () => void;
  /**
   * Makes a chip's text a button and calls this with the filter's id when it is clicked — what
   * `Table` uses to reopen the filters drawer. Without it the chips are plain text.
   */
  onChipClick?: (filterId: string) => void;
}

function FilterChips({ filters, onRemove, onClearAll, onChipClick }: FilterChipsProps) {
  const t = useText();
  if (filters.length === 0) return null;

  return (
    <div className="nq-filter-chips">
      {filters.map((filter) => (
        <span key={filter.id} className="nq-filter-chip">
          {onChipClick ? (
            <button
              type={BUTTON_TYPE.BUTTON}
              className="nq-filter-chip-body"
              onClick={() => onChipClick(filter.id)}
            >
              <span className="nq-filter-chip-label">{filter.label}:</span>
              {/* A space for the accessible name ("State: Open"); a flex container drops it visually. */}{" "}
              <span className="nq-filter-chip-value">{filter.displayValue}</span>
            </button>
          ) : (
            <>
              <span className="nq-filter-chip-label">{filter.label}:</span>
              <span className="nq-filter-chip-value">{filter.displayValue}</span>
            </>
          )}
          {!filter.mandatory && (
            <button
              type={BUTTON_TYPE.BUTTON}
              className="nq-filter-chip-remove"
              onClick={() => onRemove(filter.id)}
              aria-label={t("filterRemove", { label: filter.label })}
            >
              <X size={12} />
            </button>
          )}
        </span>
      ))}

      {filters.length > 1 && (
        <button type={BUTTON_TYPE.BUTTON} className="nq-filter-chips-clear-all" onClick={onClearAll}>
          {t("filtersClearAll")}
        </button>
      )}
    </div>
  );
}

export default FilterChips;
