import React from "react";
import { X } from "lucide-react";
import type { ActiveFilter } from "./buildActiveFilter";
import "./FilterChips.css";

export interface FilterChipsProps {
  filters: ActiveFilter[];
  onRemove: (filterId: string) => void;
  onClearAll: () => void;
}

function FilterChips({ filters, onRemove, onClearAll }: FilterChipsProps) {
  if (filters.length === 0) return null;

  return (
    <div className="filter-chips">
      {filters.map((filter) => (
        <span key={filter.id} className="filter-chip">
          <span className="filter-chip-label">{filter.label}:</span>
          <span className="filter-chip-value">{filter.displayValue}</span>
          {!filter.mandatory && (
            <button
              type="button"
              className="filter-chip-remove"
              onClick={() => onRemove(filter.id)}
              aria-label={`Remove ${filter.label} filter`}
            >
              <X size={12} />
            </button>
          )}
        </span>
      ))}

      {filters.length > 1 && (
        <button type="button" className="filter-chips-clear-all" onClick={onClearAll}>
          Clear all
        </button>
      )}
    </div>
  );
}

export default FilterChips;
