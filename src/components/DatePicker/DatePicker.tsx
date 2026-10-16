import React, { useCallback, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import PickerField from "../PickerField/PickerField";
import { useDateTimeFormats } from "../../hooks/useDateTimeFormats";
import { useText } from "../../hooks/useText";
import { useFloatingPanel } from "../../hooks/useFloatingPanel";
import {
  BUTTON_TYPE,
  CALENDAR_WEEKS,
  DAYS_IN_WEEK,
  DEFAULT_MIN_YEAR,
  DEFAULT_YEARS_AHEAD,
  KEY,
} from "../../constants";
import { getDateNames } from "../../utils/dateTimeFormat";
import {
  addDays,
  addMonths,
  addMonthsYM,
  buildMonthGrid,
  clampYMD,
  compareYM,
  compareYMD,
  daysInMonth,
  formatYMD,
  formatISODate,
  isDateDisabled,
  parseISODate,
  todayYMD,
  weekdayOf,
  type YMD,
} from "./dateParts";
import "./DatePicker.css";

export interface DatePickerProps {
  /** `"YYYY-MM-DD"`. Empty string / undefined means "no date chosen". */
  value?: string;
  /** Called with the new `"YYYY-MM-DD"` value, or `""` when cleared. */
  onChange?: (value: string) => void;
  /** Earliest selectable date, `"YYYY-MM-DD"` (inclusive). */
  minDate?: string;
  /** Latest selectable date, `"YYYY-MM-DD"` (inclusive). */
  maxDate?: string;
  /**
   * How the date is shown, e.g. `"DD MMM YYYY"`. Defaults to `NoviqUIConfigProvider`'s
   * `formats.date` (`"DD/MM/YYYY"` if unset). Display only: `value` stays `"YYYY-MM-DD"`.
   */
  displayFormat?: string;
  placeholder?: string;
  disabled?: boolean;
  /** Paints the trigger with the error border. */
  error?: boolean;
  /** Show a clear (×) button once a date is chosen. Defaults to true. */
  clearable?: boolean;
  id?: string;
  name?: string;
  className?: string;
  "aria-label"?: string;
}

const sameDay = (a: YMD, b: YMD) => compareYMD(a, b) === 0;

function DatePicker({
  value = "",
  onChange,
  minDate,
  maxDate,
  displayFormat,
  placeholder: placeholderProp,
  disabled = false,
  error = false,
  clearable = true,
  id,
  name,
  className = "",
  "aria-label": ariaLabel,
}: DatePickerProps) {
  const t = useText();
  const placeholder = placeholderProp ?? t("datePlaceholder");
  const baseId = useId();
  const configuredFormats = useDateTimeFormats(); // unconditional: hooks can't be short-circuited
  const pattern = displayFormat ?? configuredFormats.date;
  const { locale, weekStart } = configuredFormats;
  const names = getDateNames(locale);
  const gridId = `${baseId}-grid`;
  const cellId = (date: YMD) => `${baseId}-${formatISODate(date)}`;

  const wrapperRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const selected = parseISODate(value);
  const min = parseISODate(minDate);
  const max = parseISODate(maxDate);
  const today = todayYMD();

  const [open, setOpen] = useState(false);
  const [view, setView] = useState({ year: today.year, month: today.month });
  const [focused, setFocused] = useState<YMD>(today);

  const closePicker = useCallback(() => setOpen(false), []);
  const position = useFloatingPanel({
    open,
    onOutsideClick: closePicker,
    anchorRef: triggerRef,
    panelRef,
    containerRef: wrapperRef,
    remeasureKey: `${view.year}-${view.month}`,
  });

  const openPicker = () => {
    if (disabled || open) return;
    const start = clampYMD(selected ?? today, min, max);
    setFocused(start);
    setView({ year: start.year, month: start.month });
    setOpen(true);
  };

  /** Moves the keyboard focus (clamped to the allowed range) and brings its month into view. */
  const focusDate = (date: YMD) => {
    const next = clampYMD(date, min, max);
    setFocused(next);
    setView({ year: next.year, month: next.month });
  };

  /** Shows another month; the keyboard focus follows to the same day-of-month (or the last day). */
  const showMonth = (year: number, month: number) => {
    const day = Math.min(focused.day, daysInMonth(year, month));
    focusDate({ year, month, day });
  };

  const choose = (date: YMD) => {
    if (isDateDisabled(date, min, max)) return;
    onChange?.(formatISODate(date));
    closePicker();
    triggerRef.current?.focus();
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

    switch (e.key) {
      case KEY.ARROW_LEFT:
        e.preventDefault();
        focusDate(addDays(focused, -1));
        break;
      case KEY.ARROW_RIGHT:
        e.preventDefault();
        focusDate(addDays(focused, 1));
        break;
      case KEY.ARROW_UP:
        e.preventDefault();
        focusDate(addDays(focused, -DAYS_IN_WEEK));
        break;
      case KEY.ARROW_DOWN:
        e.preventDefault();
        focusDate(addDays(focused, DAYS_IN_WEEK));
        break;
      case KEY.PAGE_UP:
        e.preventDefault();
        focusDate(addMonths(focused, e.shiftKey ? -12 : -1));
        break;
      case KEY.PAGE_DOWN:
        e.preventDefault();
        focusDate(addMonths(focused, e.shiftKey ? 12 : 1));
        break;
      case KEY.HOME:
        e.preventDefault();
        focusDate(addDays(focused, -((weekdayOf(focused) - weekStart + DAYS_IN_WEEK) % DAYS_IN_WEEK)));
        break;
      case KEY.END:
        e.preventDefault();
        focusDate(
          addDays(focused, DAYS_IN_WEEK - 1 - ((weekdayOf(focused) - weekStart + DAYS_IN_WEEK) % DAYS_IN_WEEK))
        );
        break;
      case KEY.ENTER:
      case KEY.SPACE:
        e.preventDefault();
        choose(focused);
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

  const viewYM = { year: view.year, month: view.month };
  const minYM = min ? { year: min.year, month: min.month } : null;
  const maxYM = max ? { year: max.year, month: max.month } : null;
  const prevDisabled = !!minYM && compareYM(addMonthsYM(viewYM, -1), minYM) < 0;
  const nextDisabled = !!maxYM && compareYM(addMonthsYM(viewYM, 1), maxYM) > 0;

  const firstYear = Math.min(min?.year ?? DEFAULT_MIN_YEAR, view.year);
  const lastYear = Math.max(max?.year ?? today.year + DEFAULT_YEARS_AHEAD, view.year);
  const years = Array.from({ length: lastYear - firstYear + 1 }, (_, i) => firstYear + i);

  const isMonthDisabled = (month: number) => {
    const ym = { year: view.year, month };
    return (!!minYM && compareYM(ym, minYM) < 0) || (!!maxYM && compareYM(ym, maxYM) > 0);
  };

  const grid = buildMonthGrid(view.year, view.month, weekStart);
  const weekdayHeadings = Array.from(
    { length: DAYS_IN_WEEK },
    (_, i) => names.weekdaysMin[(weekStart + i) % DAYS_IN_WEEK]
  );

  const todayDisabled = isDateDisabled(today, min, max);

  return (
    <PickerField
      className={className}
      id={id}
      name={name}
      ariaLabel={ariaLabel}
      wrapperRef={wrapperRef}
      triggerRef={triggerRef}
      displayValue={selected ? formatYMD(selected, pattern, locale) : ""}
      placeholder={placeholder}
      hasValue={selected !== null}
      icon={<Calendar size={14} strokeWidth={2.5} aria-hidden />}
      open={open}
      disabled={disabled}
      error={error}
      clearable={clearable}
      clearLabel={t("dateClear")}
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
            className="nq-date-picker-dropdown"
            style={{ position: "fixed", top: position.top, left: position.left }}
            onKeyDown={(e) => {
              // Focus is on a <select>/<button> inside the panel after a mouse interaction.
              if (e.key === KEY.ESCAPE) {
                e.stopPropagation();
                closePicker();
                triggerRef.current?.focus();
              }
            }}
          >
            <div className="nq-date-picker-header">
              <button
                type={BUTTON_TYPE.BUTTON}
                className="nq-date-picker-nav"
                aria-label={t("datePreviousMonth")}
                disabled={prevDisabled}
                onClick={() => {
                  const prev = addMonthsYM(viewYM, -1);
                  showMonth(prev.year, prev.month);
                }}
              >
                <ChevronLeft size={16} aria-hidden />
              </button>

              <select
                className="nq-date-picker-select"
                aria-label={t("dateMonth")}
                value={view.month}
                onChange={(e) => showMonth(view.year, Number(e.target.value))}
              >
                {names.months.map((label, i) => (
                  <option key={label} value={i + 1} disabled={isMonthDisabled(i + 1)}>
                    {label}
                  </option>
                ))}
              </select>

              <select
                className="nq-date-picker-select"
                aria-label={t("dateYear")}
                value={view.year}
                onChange={(e) => showMonth(Number(e.target.value), view.month)}
              >
                {years.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>

              <button
                type={BUTTON_TYPE.BUTTON}
                className="nq-date-picker-nav"
                aria-label={t("dateNextMonth")}
                disabled={nextDisabled}
                onClick={() => {
                  const next = addMonthsYM(viewYM, 1);
                  showMonth(next.year, next.month);
                }}
              >
                <ChevronRight size={16} aria-hidden />
              </button>
            </div>

            <div
              id={gridId}
              role="grid"
              aria-label={`${names.months[view.month - 1]} ${view.year}`}
              className="nq-date-picker-grid"
            >
              <div role="row" className="nq-date-picker-weekdays">
                {weekdayHeadings.map((label) => (
                  <span key={label} role="columnheader" className="nq-date-picker-weekday">
                    {label}
                  </span>
                ))}
              </div>

              {Array.from({ length: CALENDAR_WEEKS }, (_, week) => (
                <div role="row" className="nq-date-picker-week" key={week}>
                  {grid.slice(week * DAYS_IN_WEEK, (week + 1) * DAYS_IN_WEEK).map((date) => {
                    const isOutside = date.month !== view.month;
                    const isDisabled = isDateDisabled(date, min, max);
                    const isSelected = selected !== null && sameDay(date, selected);
                    const classes = [
                      "nq-date-picker-day",
                      isOutside && "nq-is-outside",
                      isDisabled && "nq-is-disabled",
                      isSelected && "nq-is-selected",
                      sameDay(date, today) && "nq-is-today",
                      sameDay(date, focused) && "nq-is-focused",
                    ]
                      .filter(Boolean)
                      .join(" ");
                    return (
                      <div
                        key={formatISODate(date)}
                        id={cellId(date)}
                        role="gridcell"
                        aria-selected={isSelected}
                        aria-disabled={isDisabled || undefined}
                        aria-label={formatYMD(date, pattern, locale)}
                        className={classes}
                        onClick={() => choose(date)}
                      >
                        {date.day}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>

            <div className="nq-date-picker-footer">
              <button
                type={BUTTON_TYPE.BUTTON}
                className="nq-date-picker-today"
                disabled={todayDisabled}
                onClick={() => choose(today)}
              >
                {t("dateToday")}
              </button>
            </div>
          </div>,
          document.body
        )}
    </PickerField>
  );
}

export default DatePicker;
