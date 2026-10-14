import React, { useCallback, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import PickerField from "../PickerField/PickerField";
import { useFloatingPanel } from "../../hooks/useFloatingPanel";
import {
  BUTTON_TYPE,
  KEY,
  MONTH_GRID_COLUMNS,
  MONTH_NAMES,
  MONTH_NAMES_SHORT,
} from "../../constants";
import {
  addMonthsYM,
  compareYM,
  formatDisplayMonth,
  formatISOMonth,
  parseISOMonth,
  todayYMD,
  type YM,
} from "../DatePicker/dateParts";
import "./MonthPicker.css";

export interface MonthPickerProps {
  /** `"YYYY-MM"`. Empty string / undefined means "no month chosen". */
  value?: string;
  /** Called with the new `"YYYY-MM"` value, or `""` when cleared. */
  onChange?: (value: string) => void;
  /** Earliest selectable month, `"YYYY-MM"` (a full `"YYYY-MM-DD"` is accepted; its day is ignored). */
  minMonth?: string;
  /** Latest selectable month, same format as `minMonth`. */
  maxMonth?: string;
  placeholder?: string;
  disabled?: boolean;
  /** Paints the trigger with the error border. */
  error?: boolean;
  /** Show a clear (×) button once a month is chosen. Defaults to true. */
  clearable?: boolean;
  id?: string;
  name?: string;
  className?: string;
  "aria-label"?: string;
}

const MONTHS_IN_YEAR = MONTH_NAMES.length;
const sameMonth = (a: YM, b: YM) => compareYM(a, b) === 0;

function MonthPicker({
  value = "",
  onChange,
  minMonth,
  maxMonth,
  placeholder = "Select month",
  disabled = false,
  error = false,
  clearable = true,
  id,
  name,
  className = "",
  "aria-label": ariaLabel,
}: MonthPickerProps) {
  const baseId = useId();
  const gridId = `${baseId}-grid`;
  const cellId = (ym: YM) => `${baseId}-${formatISOMonth(ym)}`;

  const wrapperRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const selected = parseISOMonth(value);
  const min = parseISOMonth(minMonth);
  const max = parseISOMonth(maxMonth);
  const nowDay = todayYMD();
  const current: YM = { year: nowDay.year, month: nowDay.month };

  const [open, setOpen] = useState(false);
  const [viewYear, setViewYear] = useState(current.year);
  const [focused, setFocused] = useState<YM>(current);

  const closePicker = useCallback(() => setOpen(false), []);
  const position = useFloatingPanel({
    open,
    onOutsideClick: closePicker,
    anchorRef: triggerRef,
    panelRef,
    containerRef: wrapperRef,
  });

  const isDisabledMonth = (ym: YM) =>
    (!!min && compareYM(ym, min) < 0) || (!!max && compareYM(ym, max) > 0);

  const clamp = (ym: YM): YM => {
    if (min && compareYM(ym, min) < 0) return min;
    if (max && compareYM(ym, max) > 0) return max;
    return ym;
  };

  const focusMonth = (ym: YM) => {
    const next = clamp(ym);
    setFocused(next);
    setViewYear(next.year);
  };

  const openPicker = () => {
    if (disabled || open) return;
    focusMonth(selected ?? current);
    setOpen(true);
  };

  const choose = (ym: YM) => {
    if (isDisabledMonth(ym)) return;
    onChange?.(formatISOMonth(ym));
    closePicker();
    triggerRef.current?.focus();
  };

  const showYear = (year: number) => {
    setViewYear(year);
    setFocused((f) => clamp({ year, month: f.month }));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (disabled) return;

    if (!open) {
      if (e.key === KEY.ARROW_DOWN || e.key === KEY.ARROW_UP) {
        e.preventDefault();
        openPicker();
      }
      return;
    }

    switch (e.key) {
      case KEY.ARROW_LEFT:
        e.preventDefault();
        focusMonth(addMonthsYM(focused, -1));
        break;
      case KEY.ARROW_RIGHT:
        e.preventDefault();
        focusMonth(addMonthsYM(focused, 1));
        break;
      case KEY.ARROW_UP:
        e.preventDefault();
        focusMonth(addMonthsYM(focused, -MONTH_GRID_COLUMNS));
        break;
      case KEY.ARROW_DOWN:
        e.preventDefault();
        focusMonth(addMonthsYM(focused, MONTH_GRID_COLUMNS));
        break;
      case KEY.PAGE_UP:
        e.preventDefault();
        focusMonth(addMonthsYM(focused, -MONTHS_IN_YEAR));
        break;
      case KEY.PAGE_DOWN:
        e.preventDefault();
        focusMonth(addMonthsYM(focused, MONTHS_IN_YEAR));
        break;
      case KEY.HOME:
        e.preventDefault();
        focusMonth({ year: focused.year, month: 1 });
        break;
      case KEY.END:
        e.preventDefault();
        focusMonth({ year: focused.year, month: MONTHS_IN_YEAR });
        break;
      case KEY.ENTER:
      case KEY.SPACE:
        e.preventDefault();
        choose(focused);
        break;
      case KEY.ESCAPE:
        e.preventDefault();
        closePicker();
        break;
      case KEY.TAB:
        closePicker();
        break;
    }
  };

  const prevYearDisabled = !!min && viewYear - 1 < min.year;
  const nextYearDisabled = !!max && viewYear + 1 > max.year;

  const rows = Array.from({ length: MONTHS_IN_YEAR / MONTH_GRID_COLUMNS }, (_, row) =>
    Array.from({ length: MONTH_GRID_COLUMNS }, (_, col) => ({
      year: viewYear,
      month: row * MONTH_GRID_COLUMNS + col + 1,
    }))
  );

  return (
    <PickerField
      className={className}
      id={id}
      name={name}
      ariaLabel={ariaLabel}
      wrapperRef={wrapperRef}
      triggerRef={triggerRef}
      displayValue={selected ? formatDisplayMonth(selected) : ""}
      placeholder={placeholder}
      hasValue={selected !== null}
      icon={<Calendar size={14} strokeWidth={2.5} aria-hidden />}
      open={open}
      disabled={disabled}
      error={error}
      clearable={clearable}
      clearLabel="Clear month"
      popupRole="grid"
      controlsId={gridId}
      activeDescendant={open ? cellId(focused) : undefined}
      onToggle={() => (open ? closePicker() : openPicker())}
      onKeyDown={handleKeyDown}
      onClear={() => {
        onChange?.("");
        closePicker();
      }}
    >
      {open &&
        createPortal(
          <div
            ref={panelRef}
            className="month-picker-dropdown"
            style={{ position: "fixed", top: position.top, left: position.left }}
            onKeyDown={(e) => {
              if (e.key === KEY.ESCAPE) {
                closePicker();
                triggerRef.current?.focus();
              }
            }}
          >
            <div className="month-picker-header">
              <button
                type={BUTTON_TYPE.BUTTON}
                className="month-picker-nav"
                aria-label="Previous year"
                disabled={prevYearDisabled}
                onClick={() => showYear(viewYear - 1)}
              >
                <ChevronLeft size={16} aria-hidden />
              </button>
              <span className="month-picker-year" aria-live="polite">
                {viewYear}
              </span>
              <button
                type={BUTTON_TYPE.BUTTON}
                className="month-picker-nav"
                aria-label="Next year"
                disabled={nextYearDisabled}
                onClick={() => showYear(viewYear + 1)}
              >
                <ChevronRight size={16} aria-hidden />
              </button>
            </div>

            <div id={gridId} role="grid" aria-label={String(viewYear)} className="month-picker-grid">
              {rows.map((row, i) => (
                <div role="row" className="month-picker-row" key={i}>
                  {row.map((ym) => {
                    const isDisabled = isDisabledMonth(ym);
                    const isSelected = selected !== null && sameMonth(ym, selected);
                    const classes = [
                      "month-picker-month",
                      isDisabled && "is-disabled",
                      isSelected && "is-selected",
                      sameMonth(ym, current) && "is-current",
                      sameMonth(ym, focused) && "is-focused",
                    ]
                      .filter(Boolean)
                      .join(" ");
                    return (
                      <div
                        key={ym.month}
                        id={cellId(ym)}
                        role="gridcell"
                        aria-selected={isSelected}
                        aria-disabled={isDisabled || undefined}
                        aria-label={`${MONTH_NAMES[ym.month - 1]} ${ym.year}`}
                        className={classes}
                        onClick={() => choose(ym)}
                      >
                        {MONTH_NAMES_SHORT[ym.month - 1]}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>,
          document.body
        )}
    </PickerField>
  );
}

export default MonthPicker;
