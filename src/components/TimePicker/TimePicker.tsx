import React, { useCallback, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Clock, X } from "lucide-react";
import ScrollArea from "../ScrollArea/ScrollArea";
import { useFloatingPanel } from "../../hooks/useFloatingPanel";
import { useConfiguredTimePattern } from "../../hooks/useDateTimeFormats";
import { formatParts, hourStyleOf } from "../../utils/dateTimeFormat";
import {
  BUTTON_TYPE,
  DEFAULT_MINUTE_STEP,
  HOUR_CYCLE,
  HOUR_STYLE,
  KEY,
  TIME_COLUMN,
  TIME_FORMAT,
  TIME_PERIOD,
  TIME_PICKER_PATTERN,
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
   * The clock. `24`: hours 00–23. `12`: an AM/PM column and hours 12, 01–11 — or 00–11 when the
   * time pattern uses `KK`, the zero-based form (00 AM midnight, 00 PM noon).
   *
   * Left unset it follows `NoviqUIConfigProvider`'s `formats.time` (`HH:mm` → 24, `hh:mm A` → 12),
   * and is 12 — the default `hh:mm A`, as in Table cells — when the app has not set one. Only
   * presentation changes — `value`/`onChange` stay 24-hour `"HH:mm"`, which is what forms and
   * backends exchange.
   */
  hourCycle?: HourCycle;
  /**
   * How the chosen time reads in the field, e.g. `"HH[h]mm"`. Defaults to `formats.time`. It must
   * agree with the clock (a 12-hour pattern on a 24-hour picker is ignored).
   */
  displayFormat?: string;
  /** Minute-column granularity. Defaults to 1, i.e. every minute 00–59. */
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
// The two 12-hour lists. Either way the index equals `hour24 % 12`, so midnight and noon sit first.
// Conventional (`hh`/`h` patterns): 12, 01 … 11.   Zero-based (`KK`/`K`): 00 … 11 — 00 AM is
// midnight, 00 PM is noon. Which one applies is decided by the time pattern in force.
const HOURS_12_CONVENTIONAL = ["12", ...HOURS_24.slice(1, 12)];
const HOURS_12_ZERO_BASED = HOURS_24.slice(0, 12);
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
  hourCycle: hourCycleProp,
  displayFormat,
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

  // Clock and pattern. An explicit `hourCycle` always wins. Otherwise the clock follows the time
  // pattern in force — the app's `formats.time`, or the library default `hh:mm A`, the same one a
  // Table cell uses — so a picker and a cell show a time the same way (`HH` → 24-hour,
  // `hh`/`KK` → 12-hour). An explicit `hourCycle` with no configured pattern keeps the clock's own
  // default text. The pattern only supplies the *text*, so one that contradicts the clock is
  // ignored in favour of that clock's default — the trigger must never disagree with the columns
  // beneath it.
  const configuredTime = useConfiguredTimePattern();
  const followedPattern =
    configuredTime ?? (hourCycleProp === undefined ? TIME_FORMAT : undefined);
  const hourCycle =
    hourCycleProp ??
    (hourStyleOf(followedPattern ?? TIME_FORMAT) === HOUR_STYLE.H24 ? HOUR_CYCLE.H24 : HOUR_CYCLE.H12);
  const is12 = hourCycle === HOUR_CYCLE.H12;

  const fitsClock = (pattern: string | undefined): pattern is string =>
    pattern !== undefined && (hourStyleOf(pattern) !== HOUR_STYLE.H24) === is12;
  const pattern = fitsClock(displayFormat)
    ? displayFormat
    : fitsClock(followedPattern)
      ? followedPattern
      : is12
        ? TIME_PICKER_PATTERN.H12
        : TIME_PICKER_PATTERN.H24;
  const zeroBasedHours = is12 && hourStyleOf(pattern) === HOUR_STYLE.H12_ZERO_BASED;

  const parsed = parseTime(value);
  const hasValue = parsed !== null;
  const hour24 = parsed ? Number(parsed.hour) : 0;
  const minute = parsed?.minute ?? "00";
  const period = hour24 >= 12 ? TIME_PERIOD.PM : TIME_PERIOD.AM;

  const minutes = useMemo(() => buildMinutes(minuteStep), [minuteStep]);
  const hourItems = is12 ? (zeroBasedHours ? HOURS_12_ZERO_BASED : HOURS_12_CONVENTIONAL) : HOURS_24;
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
        e.stopPropagation(); // closes the picker only, not an overlay it sits in
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
    ? formatParts(
        {
          year: 1970,
          month: 1,
          day: 1,
          hour: hour24,
          minute: Number(minute),
          second: 0,
          weekday: 4,
        },
        pattern
      )
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
