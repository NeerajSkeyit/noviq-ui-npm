import React, { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Clock, X } from "lucide-react";
import ScrollArea from "../ScrollArea/ScrollArea";
import "./TimePicker.css";

export interface TimePickerProps {
  /** Current value as `"HH:mm"` (24-hour). Empty string / undefined means "no time chosen". */
  value?: string;
  /** Called with the new `"HH:mm"` value, or `""` when cleared. */
  onChange?: (value: string) => void;
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
const COLUMN_HEIGHT = 180;
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

const HOURS = Array.from({ length: 24 }, (_, i) => pad(i));

function buildMinutes(step: number) {
  const safeStep = Number.isInteger(step) && step >= 1 && step <= 60 ? step : 5;
  const minutes: string[] = [];
  for (let m = 0; m < 60; m += safeStep) minutes.push(pad(m));
  return minutes;
}

type Column = "hour" | "minute";

function TimePicker({
  value = "",
  onChange,
  minuteStep = 5,
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
  const hourListId = `${baseId}-hours`;
  const minuteListId = `${baseId}-minutes`;

  const wrapperRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [open, setOpen] = useState(false);
  const [activeColumn, setActiveColumn] = useState<Column>("hour");
  const [focusedIndex, setFocusedIndex] = useState(0);
  const [position, setPosition] = useState({ top: 0, left: 0 });

  const parsed = parseTime(value);
  const hasValue = parsed !== null;
  const hour = parsed?.hour ?? "00";
  const minute = parsed?.minute ?? "00";

  const minutes = useMemo(() => buildMinutes(minuteStep), [minuteStep]);
  const columns: Record<Column, string[]> = { hour: HOURS, minute: minutes };

  // Minute not on the step grid (e.g. "09:32" with step 5) → land on the closest lower slot.
  const indexOfHour = HOURS.indexOf(hour);
  const indexOfMinute = Math.max(
    0,
    minutes.reduce((best, m, i) => (Number(m) <= Number(minute) ? i : best), 0)
  );

  const emit = (h: string, m: string) => onChange?.(`${h}:${m}`);

  const openPicker = () => {
    if (disabled || open) return;
    setActiveColumn("hour");
    setFocusedIndex(indexOfHour);
    setOpen(true);
  };

  const closePicker = () => setOpen(false);

  // Close on a mousedown anywhere outside the trigger wrapper and the portaled dropdown.
  useEffect(() => {
    if (!open) return;
    function handleMouseDown(e: MouseEvent) {
      const target = e.target as Node;
      if (wrapperRef.current?.contains(target) || dropdownRef.current?.contains(target)) return;
      setOpen(false);
    }
    document.addEventListener("mousedown", handleMouseDown);
    return () => document.removeEventListener("mousedown", handleMouseDown);
  }, [open]);

  // Keep the fixed-position dropdown pinned under (or, near the viewport bottom, above) the trigger.
  useLayoutEffect(() => {
    if (!open) return;

    function updatePosition() {
      const triggerEl = triggerRef.current;
      const dropdownEl = dropdownRef.current;
      if (!triggerEl || !dropdownEl) return;

      const triggerRect = triggerEl.getBoundingClientRect();
      const dropdownRect = dropdownEl.getBoundingClientRect();

      let top = triggerRect.bottom + 4;
      if (top + dropdownRect.height > window.innerHeight) {
        top = Math.max(8, triggerRect.top - dropdownRect.height - 4);
      }

      let left = triggerRect.left;
      if (left + dropdownRect.width > window.innerWidth) {
        left = window.innerWidth - dropdownRect.width - 8;
      }
      if (left < 8) left = 8;

      setPosition({ top, left });
    }

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open]);

  // Scroll each column so its selected option sits in the middle when the dropdown opens or the
  // value changes. Scoped to *this* dropdown — the HRMS source used a global `document.querySelector`,
  // which scrolled the wrong picker whenever two were on the page.
  useLayoutEffect(() => {
    if (!open) return;
    dropdownRef.current
      ?.querySelectorAll<HTMLElement>("[role=option][aria-selected=true]")
      .forEach((el) => centerInParent(el));
  }, [open, hour, minute]);

  // Keep the keyboard-focused option visible as the arrow keys move it.
  useLayoutEffect(() => {
    if (!open) return;
    const el = dropdownRef.current?.querySelector<HTMLElement>("[data-focused=true]");
    if (el) revealInParent(el);
  }, [open, focusedIndex, activeColumn]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (disabled) return;

    if (!open) {
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        openPicker();
      }
      // Enter/Space fall through to the button's native click, which opens the picker.
      return;
    }

    const list = columns[activeColumn];

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setFocusedIndex((i) => Math.min(i + 1, list.length - 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        setFocusedIndex((i) => Math.max(i - 1, 0));
        break;
      case "ArrowRight":
        e.preventDefault();
        if (activeColumn === "hour") {
          setActiveColumn("minute");
          setFocusedIndex(indexOfMinute);
        }
        break;
      case "ArrowLeft":
        e.preventDefault();
        if (activeColumn === "minute") {
          setActiveColumn("hour");
          setFocusedIndex(indexOfHour);
        }
        break;
      case "Enter":
      case " ":
        e.preventDefault();
        if (activeColumn === "hour") {
          emit(list[focusedIndex], minute);
          setActiveColumn("minute");
          setFocusedIndex(indexOfMinute);
        } else {
          emit(hour, list[focusedIndex]);
          closePicker();
        }
        break;
      case "Escape":
        e.preventDefault();
        closePicker();
        break;
      case "Tab":
        closePicker();
        break;
    }
  };

  const optionId = (column: Column, i: number) => `${baseId}-${column}-${i}`;
  const activeDescendant = open ? optionId(activeColumn, focusedIndex) : undefined;

  const renderColumn = (column: Column, label: string, listId: string, selected: string) => (
    <div className="time-picker-column">
      <div className="time-picker-column-label">{label}</div>
      <ScrollArea style={{ height: COLUMN_HEIGHT }}>
        <div id={listId} role="listbox" aria-label={label === "HH" ? "Hours" : "Minutes"}>
          {columns[column].map((item, i) => {
            const isSelected = hasValue && item === selected;
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
                  if (column === "hour") emit(item, minute);
                  else emit(hour, item);
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

  return (
    <div ref={wrapperRef} className={`time-picker ${className}`}>
      <button
        ref={triggerRef}
        type="button"
        id={id}
        name={name}
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? `${hourListId} ${minuteListId}` : undefined}
        aria-activedescendant={activeDescendant}
        aria-label={ariaLabel}
        aria-invalid={error || undefined}
        disabled={disabled}
        className={`time-picker-trigger${error ? " time-picker-error" : ""}`}
        onClick={() => (open ? closePicker() : openPicker())}
        onKeyDown={handleKeyDown}
      >
        <span className={`time-picker-value${hasValue ? "" : " is-placeholder"}`}>
          {hasValue ? `${hour}:${minute}` : placeholder}
        </span>
        {!disabled && <Clock size={14} strokeWidth={2.5} aria-hidden />}
      </button>

      {clearable && hasValue && !disabled && (
        <button
          type="button"
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
            {renderColumn("hour", "HH", hourListId, hour)}
            {renderColumn("minute", "MM", minuteListId, minute)}
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
