import React, { useCallback, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Clock, X } from "lucide-react";
import ScrollArea from "../ScrollArea/ScrollArea";
import { useFloatingPanel } from "../../hooks/useFloatingPanel";
import {
  BUTTON_TYPE,
  DEFAULT_MINUTE_STEP,
  HOUR_CYCLE,
  KEY,
  TIME_COLUMN,
  TIME_PERIOD,
  TIME_PICKER_COLUMN_HEIGHT,
  type HourCycle,
  type TimeColumn,
} from "../../constants";
import "./TimePicker.css";

export interface TimePickerProps {
  /** Current value as `"HH:mm"` (24-hour, always — also in 12-hour mode). Empty string /
   * undefined means "no time chosen". */
  value?: string;
  /** Called with the new `"HH:mm"` 24-hour value, or `""` when cleared. */
  onChange?: (value: string) => void;
  /**
   * How the time is displayed and picked. `24` (default): hours 00–23. `12`: hours 12, 01–11 with
   * an AM/PM column. Only presentation changes — `value`/`onChange` stay 24-hour `"HH:mm"`, which
   * is what forms and backends exchange.
   */
  hourCycle?: HourCycle;
  /** Minute-column granularity. Defaults to 5. */
  minuteStep?: number;
  placeholder?: string;
  disabled?: boolean;
  /** Paints the trigger with the error border. */
  error?: boolean;
  /** Show a clear (×) button once a time is chosen. Defaults to true. */
  clearable?: boolean;
  id?: string;
  name?: string;
  className?: string;
  "aria-label"?: string;
}

const TIME_PATTERN = /^(\d{1,2}):(\d{2})/;
const pad = (n: number) => String(n).padStart(2, "0");

/** `"9:5"`-style or `"09:30:00"` input → `{hour, minute}` as two-digit strings, or `null` if not a valid time. */
function parseTime(value?: string): { hour: string; minute: string } | null {
  const match = value ? TIME_PATTERN.exec(value) : null;
  if (!match) return null;
  const h = Number(match[1]);
  const m = Number(match[2]);
  if (h > 23 || m > 59) return null;
  return { hour: pad(h), minute: pad(m) };
}

const HOURS_24 = Array.from({ length: 24 }, (_, i) => pad(i));
// 12, 01 … 11 (not 01 … 12): the index equals `hour24 % 12`, and 12 AM — midnight — sits first.
const HOURS_12 = ["12", ...Array.from({ length: 11 }, (_, i) => pad(i + 1))];
const PERIODS: string[] = [TIME_PERIOD.AM, TIME_PERIOD.PM];

function buildMinutes(step: number) {
  const safeStep = Number.isInteger(step) && step >= 1 && step <= 60 ? step : DEFAULT_MINUTE_STEP;
  const minutes: string[] = [];
  for (let m = 0; m < 60; m += safeStep) minutes.push(pad(m));
  return minutes;
}

type Column = TimeColumn;

function TimePicker({
  value = "",
  onChange,
  hourCycle = HOUR_CYCLE.H24,
  minuteStep = DEFAULT_MINUTE_STEP,
  placeholder = "Select time",
  disabled = false,
  error = false,
  clearable = true,
  id,
  name,
  className = "",
  "aria-label": ariaLabel,
}: TimePickerProps) {
  const baseId = useId();
  const listId: Record<Column, string> = {
    [TIME_COLUMN.HOUR]: `${baseId}-hours`,
    [TIME_COLUMN.MINUTE]: `${baseId}-minutes`,
    [TIME_COLUMN.PERIOD]: `${baseId}-period`,
  };

  const wrapperRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [open, setOpen] = useState(false);
  const [activeColumn, setActiveColumn] = useState<Column>(TIME_COLUMN.HOUR);
  const [focusedIndex, setFocusedIndex] = useState(0);

  const is12 = hourCycle === HOUR_CYCLE.H12;

  const parsed = parseTime(value);
  const hasValue = parsed !== null;
  const hour24 = parsed ? Number(parsed.hour) : 0;
  const minute = parsed?.minute ?? "00";
  const period = hour24 >= 12 ? TIME_PERIOD.PM : TIME_PERIOD.AM;

  const minutes = useMemo(() => buildMinutes(minuteStep), [minuteStep]);
  const hourItems = is12 ? HOURS_12 : HOURS_24;
  const hourIndex = is12 ? hour24 % 12 : hour24;
  const hourLabel = hourItems[hourIndex];

  // Left-to-right, which is also the order ArrowLeft/ArrowRight and Enter walk through.
  const columnOrder: Column[] = is12
    ? [TIME_COLUMN.HOUR, TIME_COLUMN.MINUTE, TIME_COLUMN.PERIOD]
    : [TIME_COLUMN.HOUR, TIME_COLUMN.MINUTE];
  const items: Record<Column, string[]> = {
    [TIME_COLUMN.HOUR]: hourItems,
    [TIME_COLUMN.MINUTE]: minutes,
    [TIME_COLUMN.PERIOD]: PERIODS,
  };

  // Minute not on the step grid (e.g. "09:32" with step 5) → land on the closest lower slot.
  const minuteIndex = Math.max(
    0,
    minutes.reduce((best, m, i) => (Number(m) <= Number(minute) ? i : best), 0)
  );
  const currentIndex: Record<Column, number> = {
    [TIME_COLUMN.HOUR]: hourIndex,
    [TIME_COLUMN.MINUTE]: minuteIndex,
    [TIME_COLUMN.PERIOD]: PERIODS.indexOf(period),
  };

  const emit = (h24: number, m: string) => onChange?.(`${pad(h24)}:${m}`);

  // Turns "the user picked `item` in `column`" into a new 24-hour value. In 12-hour mode a picked
  // hour keeps the current AM/PM, and a picked AM/PM keeps the current hour-of-12.
  const commit = (column: Column, item: string) => {
    if (column === TIME_COLUMN.MINUTE) {
      emit(hour24, item);
    } else if (column === TIME_COLUMN.HOUR) {
      const picked = Number(item);
      emit(is12 ? (picked % 12) + (period === TIME_PERIOD.PM ? 12 : 0) : picked, minute);
    } else {
      emit((hour24 % 12) + (item === TIME_PERIOD.PM ? 12 : 0), minute);
    }
  };

  const openPicker = () => {
    if (disabled || open) return;
    setActiveColumn(TIME_COLUMN.HOUR);
    setFocusedIndex(currentIndex[TIME_COLUMN.HOUR]);
    setOpen(true);
  };

  const closePicker = () => setOpen(false);

  const closePickerCallback = useCallback(() => setOpen(false), []);
  const position = useFloatingPanel({
    open,
    onOutsideClick: closePickerCallback,
    anchorRef: triggerRef,
    panelRef: dropdownRef,
    containerRef: wrapperRef,
    remeasureKey: is12,
  });

  // Scroll each column so its selected option sits in the middle when the dropdown opens or the
  // value changes. Scoped to *this* dropdown — the HRMS source used a global `document.querySelector`,
  // which scrolled the wrong picker whenever two were on the page.
  useLayoutEffect(() => {
    if (!open) return;
    dropdownRef.current
      ?.querySelectorAll<HTMLElement>("[role=option][aria-selected=true]")
      .forEach((el) => centerInParent(el));
  }, [open, hour24, minute, is12]);

  // Keep the keyboard-focused option visible as the arrow keys move it.
  useLayoutEffect(() => {
    if (!open) return;
    const el = dropdownRef.current?.querySelector<HTMLElement>("[data-focused=true]");
    if (el) revealInParent(el);
  }, [open, focusedIndex, activeColumn]);

  const goToColumn = (column: Column) => {
    setActiveColumn(column);
    setFocusedIndex(currentIndex[column]);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (disabled) return;

    if (!open) {
      if (e.key === KEY.ARROW_DOWN || e.key === KEY.ARROW_UP) {
        e.preventDefault();
        openPicker();
      }
      // Enter/Space fall through to the button's native click, which opens the picker.
      return;
    }

    const list = items[activeColumn];
    const columnPosition = columnOrder.indexOf(activeColumn);

    switch (e.key) {
      case KEY.ARROW_DOWN:
        e.preventDefault();
        setFocusedIndex((i) => Math.min(i + 1, list.length - 1));
        break;
      case KEY.ARROW_UP:
        e.preventDefault();
        setFocusedIndex((i) => Math.max(i - 1, 0));
        break;
      case KEY.ARROW_RIGHT:
        e.preventDefault();
        if (columnPosition < columnOrder.length - 1) goToColumn(columnOrder[columnPosition + 1]);
        break;
      case KEY.ARROW_LEFT:
        e.preventDefault();
        if (columnPosition > 0) goToColumn(columnOrder[columnPosition - 1]);
        break;
      case KEY.ENTER:
      case KEY.SPACE:
        e.preventDefault();
        commit(activeColumn, list[focusedIndex]);
        // Walk left to right; committing the last column closes the picker.
        if (columnPosition < columnOrder.length - 1) goToColumn(columnOrder[columnPosition + 1]);
        else closePicker();
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

  const optionId = (column: Column, i: number) => `${baseId}-${column}-${i}`;
  const activeDescendant = open ? optionId(activeColumn, focusedIndex) : undefined;

  const selectedItem: Record<Column, string> = {
    [TIME_COLUMN.HOUR]: hourLabel,
    [TIME_COLUMN.MINUTE]: minute,
    [TIME_COLUMN.PERIOD]: period,
  };
  const columnMeta: Record<Column, { heading: string; ariaLabel: string }> = {
    [TIME_COLUMN.HOUR]: { heading: "HH", ariaLabel: "Hours" },
    [TIME_COLUMN.MINUTE]: { heading: "MM", ariaLabel: "Minutes" },
    [TIME_COLUMN.PERIOD]: { heading: "AM/PM", ariaLabel: "AM/PM" },
  };

  const renderColumn = (column: Column) => (
    <div className="time-picker-column" key={column}>
      <div className="time-picker-column-label">{columnMeta[column].heading}</div>
      <ScrollArea style={{ height: TIME_PICKER_COLUMN_HEIGHT }}>
        <div id={listId[column]} role="listbox" aria-label={columnMeta[column].ariaLabel}>
          {items[column].map((item, i) => {
            const isSelected = hasValue && item === selectedItem[column];
            const isFocused = activeColumn === column && focusedIndex === i;
            return (
              <div
                key={item}
                id={optionId(column, i)}
                role="option"
                aria-selected={isSelected}
                data-focused={isFocused}
                className={`time-picker-option${isSelected ? " is-selected" : ""}${
                  isFocused ? " is-focused" : ""
                }`}
                onClick={() => {
                  commit(column, item);
                  setActiveColumn(column);
                  setFocusedIndex(i);
                  triggerRef.current?.focus();
                }}
              >
                {item}
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );

  const displayValue = hasValue
    ? is12
      ? `${hourLabel}:${minute} ${period}`
      : `${hourLabel}:${minute}`
    : placeholder;

  return (
    <div ref={wrapperRef} className={`time-picker ${className}`}>
      <button
        ref={triggerRef}
        type={BUTTON_TYPE.BUTTON}
        id={id}
        name={name}
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? columnOrder.map((c) => listId[c]).join(" ") : undefined}
        aria-activedescendant={activeDescendant}
        aria-label={ariaLabel}
        aria-invalid={error || undefined}
        disabled={disabled}
        className={`time-picker-trigger${error ? " time-picker-error" : ""}`}
        onClick={() => (open ? closePicker() : openPicker())}
        onKeyDown={handleKeyDown}
      >
        <span className={`time-picker-value${hasValue ? "" : " is-placeholder"}`}>
          {displayValue}
        </span>
        {!disabled && <Clock size={14} strokeWidth={2.5} aria-hidden />}
      </button>

      {clearable && hasValue && !disabled && (
        <button
          type={BUTTON_TYPE.BUTTON}
          className="time-picker-clear"
          aria-label="Clear time"
          onClick={() => {
            onChange?.("");
            closePicker();
          }}
        >
          <X size={14} aria-hidden />
        </button>
      )}

      {open &&
        createPortal(
          <div
            ref={dropdownRef}
            className="time-picker-dropdown"
            style={{ position: "fixed", top: position.top, left: position.left }}
          >
            {columnOrder.map(renderColumn)}
          </div>,
          document.body
        )}
    </div>
  );
}

/** Scrolls `el`'s scroll container so `el` is vertically centred in it. */
function centerInParent(el: HTMLElement) {
  const container = scrollContainerOf(el);
  if (!container) return;
  const c = container.getBoundingClientRect();
  const r = el.getBoundingClientRect();
  container.scrollTop += r.top - c.top - (c.height - r.height) / 2;
}

/** Scrolls `el`'s scroll container the minimum distance needed to bring `el` fully into view. */
function revealInParent(el: HTMLElement) {
  const container = scrollContainerOf(el);
  if (!container) return;
  const c = container.getBoundingClientRect();
  const r = el.getBoundingClientRect();
  if (r.top < c.top) container.scrollTop -= c.top - r.top;
  else if (r.bottom > c.bottom) container.scrollTop += r.bottom - c.bottom;
}

function scrollContainerOf(el: HTMLElement): HTMLElement | null {
  // option → listbox div → ScrollArea viewport (the element that actually scrolls)
  return el.parentElement?.parentElement ?? null;
}

export default TimePicker;
