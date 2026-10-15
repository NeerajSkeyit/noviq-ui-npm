import React, { useEffect, useState } from "react";
import { SlidersHorizontal } from "lucide-react";
import Button from "../Button/Button";
import Drawer from "../Drawer/Drawer";
import ScrollArea from "../ScrollArea/ScrollArea";
import Checkbox from "../Checkbox/Checkbox";
import {
  buildActiveFilter,
  type FilterConfig,
  type ActiveFilter,
  type DateRangeValue,
} from "./buildActiveFilter";
import {
  BUTTON_SIZE,
  BUTTON_VARIANT,
  FILTER_PAYLOAD_KEY,
  FILTER_TYPE,
  type FilterType,
} from "../../constants";
import { useDateTimeFormats } from "../../hooks/useDateTimeFormats";
import "./FilterDrawer.css";

export type { FilterConfig, FilterOption, ActiveFilter, DateRangeValue } from "./buildActiveFilter";

export interface FilterDrawerProps {
  filters: FilterConfig[];
  activeFilters: ActiveFilter[];
  onApplyFilter: (filters: ActiveFilter[]) => void;
  onRemoveFilter: (filterId: string) => void;
  onClearAll: () => void;
}

function emptyDraftValue(type: FilterType): unknown {
  switch (type) {
    case FILTER_TYPE.SELECT:
      return [];
    case FILTER_TYPE.DATE_RANGE:
      return {};
    default:
      return "";
  }
}

function deriveDraftValue(config: FilterConfig, active?: ActiveFilter): unknown {
  if (!active) return config.defaultValue ?? emptyDraftValue(config.type);

  switch (config.type) {
    case FILTER_TYPE.SELECT: {
      const raw = active.apiPayload[config.id];
      return typeof raw === "string" ? raw.split(",") : [];
    }
    case FILTER_TYPE.DATE_RANGE: {
      const startKey = config.startDateKey ?? `${config.id}From`;
      const endKey = config.endDateKey ?? `${config.id}To`;
      return { from: active.apiPayload[startKey], to: active.apiPayload[endKey] };
    }
    case FILTER_TYPE.MONTH: {
      if (config.monthKey || config.yearKey) {
        const month = active.apiPayload[config.monthKey ?? FILTER_PAYLOAD_KEY.MONTH];
        const year = active.apiPayload[config.yearKey ?? FILTER_PAYLOAD_KEY.YEAR];
        return month && year ? `${year}-${String(month).padStart(2, "0")}` : "";
      }
      return active.apiPayload[config.id] ?? "";
    }
    default:
      return active.apiPayload[config.id] ?? "";
  }
}

function renderField(config: FilterConfig, value: unknown, onChange: (v: unknown) => void) {
  switch (config.type) {
    case FILTER_TYPE.SELECT:
      return (
        <div className="filter-drawer-options">
          {(config.options ?? []).map((opt) => {
            const selected = Array.isArray(value) && (value as string[]).includes(opt.value);
            return (
              <div key={opt.value} className="filter-drawer-option">
                <Checkbox
                  checked={selected}
                  onChange={(checked) => {
                    const current = Array.isArray(value) ? (value as string[]) : [];
                    onChange(checked ? [...current, opt.value] : current.filter((v) => v !== opt.value));
                  }}
                />
                <span>{opt.label}</span>
              </div>
            );
          })}
        </div>
      );

    case FILTER_TYPE.DATE_RANGE: {
      const range = (value as DateRangeValue) ?? {};
      return (
        <div className="filter-drawer-range">
          <label className="filter-drawer-range-field">
            <span>From</span>
            <input
              type="date"
              value={range.from ?? ""}
              onChange={(e) => onChange({ ...range, from: e.target.value })}
            />
          </label>
          <label className="filter-drawer-range-field">
            <span>To</span>
            <input
              type="date"
              value={range.to ?? ""}
              onChange={(e) => onChange({ ...range, to: e.target.value })}
            />
          </label>
        </div>
      );
    }

    case FILTER_TYPE.MONTH:
      return (
        <input
          type="month"
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value)}
          className="filter-drawer-input"
        />
      );

    case FILTER_TYPE.DATE:
      return (
        <input
          type="date"
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value)}
          className="filter-drawer-input"
        />
      );

    case FILTER_TYPE.SEARCH:
    default:
      return (
        <input
          type="text"
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value)}
          className="filter-drawer-input"
        />
      );
  }
}

function FilterDrawer({ filters, activeFilters, onApplyFilter, onClearAll }: FilterDrawerProps) {
  const formats = useDateTimeFormats();
  const [open, setOpen] = useState(false);
  const [draftValues, setDraftValues] = useState<Record<string, unknown>>({});

  useEffect(() => {
    if (!open) return;
    const next: Record<string, unknown> = {};
    for (const config of filters) {
      next[config.id] = deriveDraftValue(config, activeFilters.find((f) => f.id === config.id));
    }
    setDraftValues(next);
    // Re-sync draft state from the current activeFilters only when the drawer opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const setDraft = (id: string, value: unknown) => setDraftValues((prev) => ({ ...prev, [id]: value }));

  const handleApply = () => {
    const built = filters
      .map((config) => buildActiveFilter(config, draftValues[config.id], formats))
      .filter((f): f is ActiveFilter => f !== null);
    onApplyFilter(built);
    setOpen(false);
  };

  const handleClearAll = () => {
    setDraftValues((prev) => {
      const next = { ...prev };
      for (const config of filters) {
        if (!config.mandatory) next[config.id] = emptyDraftValue(config.type);
      }
      return next;
    });
    onClearAll();
  };

  return (
    <>
      <Button variant={BUTTON_VARIANT.OUTLINE} size={BUTTON_SIZE.SM} onClick={() => setOpen(true)}>
        <SlidersHorizontal size={16} />
        Filters
        {activeFilters.length > 0 && <span className="filter-drawer-badge">{activeFilters.length}</span>}
      </Button>

      <Drawer
        isOpen={open}
        onClose={() => setOpen(false)}
        title="Filters"
        closeOnOutside
        footer={
          <div className="filter-drawer-footer">
            <Button variant={BUTTON_VARIANT.OUTLINE} size={BUTTON_SIZE.SM} onClick={handleClearAll}>
              Clear all
            </Button>
            <Button variant={BUTTON_VARIANT.DEFAULT} size={BUTTON_SIZE.SM} onClick={handleApply}>
              Apply
            </Button>
          </div>
        }
      >
        <ScrollArea>
          <div className="filter-drawer-sections">
            {filters.map((config) => (
              <div key={config.id} className="filter-drawer-section">
                <span className="filter-drawer-section-label">{config.label}</span>
                {renderField(config, draftValues[config.id], (v) => setDraft(config.id, v))}
              </div>
            ))}
          </div>
        </ScrollArea>
      </Drawer>
    </>
  );
}

export default FilterDrawer;
