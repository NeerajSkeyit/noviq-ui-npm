import React, { useState } from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import MonthPicker from "./MonthPicker";

// Pin "today" without touching timers: 15 March 2024.
beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"], now: new Date(2024, 2, 15, 12, 0, 0) });
});
afterEach(() => {
  vi.useRealTimers();
});

function Controlled({
  initial = "",
  onChange,
  ...rest
}: { initial?: string; onChange?: (v: string) => void } & Partial<React.ComponentProps<typeof MonthPicker>>) {
  const [value, setValue] = useState(initial);
  return (
    <MonthPicker
      {...rest}
      value={value}
      onChange={(v) => {
        setValue(v);
        onChange?.(v);
      }}
    />
  );
}

const trigger = () => screen.getByRole("combobox");
const grid = () => screen.getByRole("grid");
const month = (name: string) => within(grid()).getByRole("gridcell", { name });
const setup = () => userEvent.setup();
const open = (user: ReturnType<typeof userEvent.setup>) => user.click(trigger());

describe("MonthPicker", () => {
  describe("display", () => {
    it("shows the placeholder when empty", () => {
      render(<MonthPicker value="" placeholder="Pick a month" />);
      expect(trigger()).toHaveTextContent("Pick a month");
    });

    it("shows a value as MM/YYYY", () => {
      render(<MonthPicker value="2024-03" />);
      expect(trigger()).toHaveTextContent("03/2024");
    });

    it("accepts a full date and ignores its day", () => {
      render(<MonthPicker value="2024-03-17" />);
      expect(trigger()).toHaveTextContent("03/2024");
    });

    it("treats an invalid month as empty", () => {
      render(<MonthPicker value="2024-13" placeholder="Select month" />);
      expect(trigger()).toHaveTextContent("Select month");
    });
  });

  describe("opening and choosing", () => {
    it("is closed until clicked, then shows all twelve months of the selected year", async () => {
      const user = setup();
      render(<MonthPicker value="2023-07" />);
      expect(screen.queryByRole("grid")).not.toBeInTheDocument();
      await open(user);
      expect(screen.getByText("2023", { selector: ".nq-month-picker-year" })).toBeInTheDocument();
      expect(within(grid()).getAllByRole("gridcell")).toHaveLength(12);
      expect(month("July 2023")).toHaveAttribute("aria-selected", "true");
    });

    it("opens on the current year when empty", async () => {
      const user = setup();
      render(<MonthPicker value="" />);
      await open(user);
      expect(screen.getByText("2024", { selector: ".nq-month-picker-year" })).toBeInTheDocument();
    });

    it("emits YYYY-MM and closes", async () => {
      const user = setup();
      const onChange = vi.fn();
      render(<Controlled initial="2024-03" onChange={onChange} />);
      await open(user);
      await user.click(month("September 2024"));
      expect(onChange).toHaveBeenCalledWith("2024-09");
      expect(trigger()).toHaveTextContent("09/2024");
      expect(screen.queryByRole("grid")).not.toBeInTheDocument();
    });

    it("changes year with the arrows and picks from the new year", async () => {
      const user = setup();
      const onChange = vi.fn();
      render(<Controlled initial="2024-03" onChange={onChange} />);
      await open(user);
      await user.click(screen.getByRole("button", { name: "Next year" }));
      await user.click(month("January 2025"));
      expect(onChange).toHaveBeenCalledWith("2025-01");
    });

    it("steps back a year too", async () => {
      const user = setup();
      render(<MonthPicker value="2024-03" />);
      await open(user);
      await user.click(screen.getByRole("button", { name: "Previous year" }));
      expect(screen.getByText("2023", { selector: ".nq-month-picker-year" })).toBeInTheDocument();
    });

    it("closes on an outside mousedown", async () => {
      const user = setup();
      render(
        <div>
          <MonthPicker value="" />
          <button>elsewhere</button>
        </div>
      );
      await open(user);
      await user.click(screen.getByText("elsewhere"));
      expect(screen.queryByRole("grid")).not.toBeInTheDocument();
    });
  });

  describe("minMonth / maxMonth", () => {
    it("disables months outside the range and refuses to choose them", async () => {
      const user = setup();
      const onChange = vi.fn();
      render(<Controlled initial="2024-06" minMonth="2024-04" maxMonth="2024-08" onChange={onChange} />);
      await open(user);
      expect(month("March 2024")).toHaveAttribute("aria-disabled", "true");
      expect(month("September 2024")).toHaveAttribute("aria-disabled", "true");
      expect(month("April 2024")).not.toHaveAttribute("aria-disabled");
      expect(month("August 2024")).not.toHaveAttribute("aria-disabled");

      await user.click(month("March 2024"));
      expect(onChange).not.toHaveBeenCalled();
    });

    it("stops the year arrows at the bounds", async () => {
      const user = setup();
      render(<MonthPicker value="2024-06" minMonth="2024-04" maxMonth="2024-08" />);
      await open(user);
      expect(screen.getByRole("button", { name: "Previous year" })).toBeDisabled();
      expect(screen.getByRole("button", { name: "Next year" })).toBeDisabled();
    });

    it("accepts full dates for the bounds", async () => {
      const user = setup();
      render(<MonthPicker value="2024-06" minMonth="2024-04-20" maxMonth="2024-08-05" />);
      await open(user);
      expect(month("April 2024")).not.toHaveAttribute("aria-disabled");
      expect(month("March 2024")).toHaveAttribute("aria-disabled", "true");
    });

    it("opens inside the range when the current month is outside it", async () => {
      const user = setup();
      render(<MonthPicker value="" minMonth="2022-01" maxMonth="2022-12" />);
      await open(user);
      expect(screen.getByText("2022", { selector: ".nq-month-picker-year" })).toBeInTheDocument();
    });
  });

  describe("keyboard", () => {
    const activeDescendant = () => trigger().getAttribute("aria-activedescendant");
    const focusedMonth = (name: string) => expect(activeDescendant()).toBe(month(name).id);

    it("ArrowDown opens, focusing the selected month", async () => {
      const user = setup();
      render(<MonthPicker value="2024-03" />);
      trigger().focus();
      await user.keyboard("{ArrowDown}");
      focusedMonth("March 2024");
    });

    it("moves by month with Left/Right and by row with Up/Down", async () => {
      const user = setup();
      render(<MonthPicker value="2024-05" />);
      trigger().focus();
      await user.keyboard("{ArrowDown}{ArrowRight}");
      focusedMonth("June 2024");
      await user.keyboard("{ArrowLeft}{ArrowLeft}");
      focusedMonth("April 2024");
      await user.keyboard("{ArrowDown}");
      focusedMonth("July 2024");
      await user.keyboard("{ArrowUp}{ArrowUp}");
      focusedMonth("January 2024");
    });

    it("carries into the neighbouring year", async () => {
      const user = setup();
      render(<MonthPicker value="2024-12" />);
      trigger().focus();
      await user.keyboard("{ArrowDown}{ArrowRight}");
      expect(screen.getByText("2025", { selector: ".nq-month-picker-year" })).toBeInTheDocument();
      focusedMonth("January 2025");
    });

    it("PageDown / PageUp move a year; Home / End go to January / December", async () => {
      const user = setup();
      render(<MonthPicker value="2024-06" />);
      trigger().focus();
      await user.keyboard("{ArrowDown}{PageDown}");
      focusedMonth("June 2025");
      await user.keyboard("{Home}");
      focusedMonth("January 2025");
      await user.keyboard("{End}");
      focusedMonth("December 2025");
      await user.keyboard("{PageUp}");
      focusedMonth("December 2024");
    });

    it("Enter chooses and closes; Escape closes without choosing", async () => {
      const user = setup();
      const onChange = vi.fn();
      render(<Controlled initial="2024-03" onChange={onChange} />);
      trigger().focus();
      await user.keyboard("{ArrowDown}{ArrowRight}{Escape}");
      expect(onChange).not.toHaveBeenCalled();
      expect(screen.queryByRole("grid")).not.toBeInTheDocument();

      await user.keyboard("{ArrowDown}{ArrowRight}{Enter}");
      expect(onChange).toHaveBeenCalledWith("2024-04");
      expect(screen.queryByRole("grid")).not.toBeInTheDocument();
    });

    it("never moves focus outside the allowed range", async () => {
      const user = setup();
      render(<MonthPicker value="2024-06" minMonth="2024-05" maxMonth="2024-07" />);
      trigger().focus();
      await user.keyboard("{ArrowDown}{ArrowLeft}{ArrowLeft}{ArrowLeft}");
      focusedMonth("May 2024");
      await user.keyboard("{ArrowRight}{ArrowRight}{ArrowRight}{ArrowRight}");
      focusedMonth("July 2024");
    });

    it("does not open merely from receiving focus", () => {
      render(<MonthPicker value="" />);
      trigger().focus();
      expect(screen.queryByRole("grid")).not.toBeInTheDocument();
    });
  });

  describe("clearing, disabled, error", () => {
    it("clears to an empty string", async () => {
      const user = setup();
      const onChange = vi.fn();
      render(<Controlled initial="2024-03" onChange={onChange} />);
      await user.click(screen.getByRole("button", { name: "Clear month" }));
      expect(onChange).toHaveBeenCalledWith("");
      expect(trigger()).toHaveTextContent("Select month");
    });

    it("has no clear button when empty, not clearable, or disabled", () => {
      const { rerender } = render(<MonthPicker value="" />);
      expect(screen.queryByRole("button", { name: "Clear month" })).not.toBeInTheDocument();
      rerender(<MonthPicker value="2024-03" clearable={false} />);
      expect(screen.queryByRole("button", { name: "Clear month" })).not.toBeInTheDocument();
      rerender(<MonthPicker value="2024-03" disabled />);
      expect(screen.queryByRole("button", { name: "Clear month" })).not.toBeInTheDocument();
    });

    it("does not open when disabled", async () => {
      const user = setup();
      render(<MonthPicker value="2024-03" disabled />);
      await user.click(trigger());
      expect(screen.queryByRole("grid")).not.toBeInTheDocument();
    });

    it("flags the trigger invalid and wires id for <label htmlFor>", () => {
      render(
        <div>
          <label htmlFor="period">Billing month</label>
          <MonthPicker id="period" value="" error />
        </div>
      );
      expect(screen.getByLabelText("Billing month")).toBe(trigger());
      expect(trigger()).toHaveAttribute("aria-invalid", "true");
    });
  });
});
