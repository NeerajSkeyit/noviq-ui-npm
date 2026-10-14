import React, { useState } from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import DatePicker from "./DatePicker";

// Pin "today" without touching timers (userEvent needs real ones): Friday 15 March 2024.
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
}: { initial?: string; onChange?: (v: string) => void } & Partial<React.ComponentProps<typeof DatePicker>>) {
  const [value, setValue] = useState(initial);
  return (
    <DatePicker
      {...rest}
      value={value}
      onChange={(v) => {
        setValue(v);
        onChange?.(v);
      }}
    />
  );
}

// The month/year <select>s inside the open panel are comboboxes too — the trigger is the <button>.
const trigger = () => screen.getAllByRole("combobox").find((el) => el.tagName === "BUTTON")!;
const grid = () => screen.getByRole("grid");
const cell = (ddmmyyyy: string) => within(grid()).getByRole("gridcell", { name: ddmmyyyy });
const gridTitle = () => grid().getAttribute("aria-label");
const open = async (user: ReturnType<typeof userEvent.setup>) => user.click(trigger());
const setup = () => userEvent.setup();

describe("DatePicker", () => {
  describe("display", () => {
    it("shows the placeholder when empty", () => {
      render(<DatePicker value="" placeholder="Pick a date" />);
      expect(trigger()).toHaveTextContent("Pick a date");
    });

    it("shows a value as DD/MM/YYYY", () => {
      render(<DatePicker value="2024-03-05" />);
      expect(trigger()).toHaveTextContent("05/03/2024");
    });

    it("accepts a value with a trailing time", () => {
      render(<DatePicker value="2024-03-05 09:30" />);
      expect(trigger()).toHaveTextContent("05/03/2024");
    });

    it("displays a leap day", () => {
      render(<DatePicker value="2024-02-29" />);
      expect(trigger()).toHaveTextContent("29/02/2024");
    });

    it("treats an impossible date as empty rather than rolling it over", () => {
      render(<DatePicker value="2023-02-30" placeholder="Select date" />);
      expect(trigger()).toHaveTextContent("Select date");
    });
  });

  describe("opening", () => {
    it("is closed until clicked", async () => {
      const user = setup();
      render(<DatePicker value="" />);
      expect(screen.queryByRole("grid")).not.toBeInTheDocument();
      expect(trigger()).toHaveAttribute("aria-expanded", "false");
      await open(user);
      expect(grid()).toBeInTheDocument();
      expect(trigger()).toHaveAttribute("aria-expanded", "true");
    });

    it("opens on the selected date's month", async () => {
      const user = setup();
      render(<DatePicker value="2023-11-20" />);
      await open(user);
      expect(gridTitle()).toBe("November 2023");
    });

    it("opens on today's month when nothing is selected", async () => {
      const user = setup();
      render(<DatePicker value="" />);
      await open(user);
      expect(gridTitle()).toBe("March 2024");
    });

    it("always lays out six weeks (42 days)", async () => {
      const user = setup();
      render(<DatePicker value="2024-02-10" />);
      await open(user);
      expect(within(grid()).getAllByRole("gridcell")).toHaveLength(42);
    });

    it("shows the neighbouring months' days around the month", async () => {
      const user = setup();
      render(<DatePicker value="2024-02-10" />);
      await open(user);
      // 1 Feb 2024 is a Thursday → the grid starts on Sunday 28 Jan.
      expect(cell("28/01/2024")).toBeInTheDocument();
      expect(cell("01/02/2024")).toBeInTheDocument();
    });

    it("marks the selected day", async () => {
      const user = setup();
      render(<DatePicker value="2024-03-05" />);
      await open(user);
      expect(cell("05/03/2024")).toHaveAttribute("aria-selected", "true");
      expect(cell("06/03/2024")).toHaveAttribute("aria-selected", "false");
    });

    it("closes on an outside mousedown", async () => {
      const user = setup();
      render(
        <div>
          <DatePicker value="" />
          <button>elsewhere</button>
        </div>
      );
      await open(user);
      await user.click(screen.getByText("elsewhere"));
      expect(screen.queryByRole("grid")).not.toBeInTheDocument();
    });
  });

  describe("choosing a date", () => {
    it("emits YYYY-MM-DD and closes", async () => {
      const user = setup();
      const onChange = vi.fn();
      render(<Controlled initial="2024-03-05" onChange={onChange} />);
      await open(user);
      await user.click(cell("20/03/2024"));
      expect(onChange).toHaveBeenCalledWith("2024-03-20");
      expect(trigger()).toHaveTextContent("20/03/2024");
      expect(screen.queryByRole("grid")).not.toBeInTheDocument();
    });

    it("can pick a neighbouring month's day shown in the grid", async () => {
      const user = setup();
      const onChange = vi.fn();
      render(<Controlled initial="2024-02-10" onChange={onChange} />);
      await open(user);
      await user.click(cell("28/01/2024"));
      expect(onChange).toHaveBeenCalledWith("2024-01-28");
    });

    it("selects today with the Today button", async () => {
      const user = setup();
      const onChange = vi.fn();
      render(<Controlled initial="2023-01-01" onChange={onChange} />);
      await open(user);
      await user.click(screen.getByRole("button", { name: "Today" }));
      expect(onChange).toHaveBeenCalledWith("2024-03-15");
    });
  });

  describe("navigating months", () => {
    it("moves with the previous / next buttons", async () => {
      const user = setup();
      render(<DatePicker value="2024-03-05" />);
      await open(user);
      await user.click(screen.getByRole("button", { name: "Next month" }));
      expect(gridTitle()).toBe("April 2024");
      await user.click(screen.getByRole("button", { name: "Previous month" }));
      await user.click(screen.getByRole("button", { name: "Previous month" }));
      expect(gridTitle()).toBe("February 2024");
    });

    it("rolls the year over at December / January", async () => {
      const user = setup();
      render(<DatePicker value="2023-12-10" />);
      await open(user);
      await user.click(screen.getByRole("button", { name: "Next month" }));
      expect(gridTitle()).toBe("January 2024");
      await user.click(screen.getByRole("button", { name: "Previous month" }));
      expect(gridTitle()).toBe("December 2023");
    });

    it("jumps with the month and year selects", async () => {
      const user = setup();
      render(<DatePicker value="2024-03-05" />);
      await open(user);
      await user.selectOptions(screen.getByRole("combobox", { name: "Month" }), "September");
      expect(gridTitle()).toBe("September 2024");
      await user.selectOptions(screen.getByRole("combobox", { name: "Year" }), "2019");
      expect(gridTitle()).toBe("September 2019");
    });

    it("doesn't select anything by merely changing month", async () => {
      const user = setup();
      const onChange = vi.fn();
      render(<DatePicker value="2024-03-05" onChange={onChange} />);
      await open(user);
      await user.click(screen.getByRole("button", { name: "Next month" }));
      expect(onChange).not.toHaveBeenCalled();
    });
  });

  describe("minDate / maxDate", () => {
    it("disables days outside the range and refuses to select them", async () => {
      const user = setup();
      const onChange = vi.fn();
      render(<Controlled initial="2024-03-15" minDate="2024-03-10" maxDate="2024-03-20" onChange={onChange} />);
      await open(user);
      expect(cell("09/03/2024")).toHaveAttribute("aria-disabled", "true");
      expect(cell("21/03/2024")).toHaveAttribute("aria-disabled", "true");
      expect(cell("10/03/2024")).not.toHaveAttribute("aria-disabled");
      expect(cell("20/03/2024")).not.toHaveAttribute("aria-disabled");

      await user.click(cell("09/03/2024"));
      expect(onChange).not.toHaveBeenCalled();
      expect(grid()).toBeInTheDocument(); // still open
    });

    it("can't page before the minimum month or after the maximum month", async () => {
      const user = setup();
      render(<DatePicker value="2024-03-15" minDate="2024-03-10" maxDate="2024-03-20" />);
      await open(user);
      expect(screen.getByRole("button", { name: "Previous month" })).toBeDisabled();
      expect(screen.getByRole("button", { name: "Next month" })).toBeDisabled();
    });

    it("limits the year select to the allowed years", async () => {
      const user = setup();
      render(<DatePicker value="2024-03-15" minDate="2022-06-01" maxDate="2025-02-01" />);
      await open(user);
      const years = within(screen.getByRole("combobox", { name: "Year" }))
        .getAllByRole("option")
        .map((o) => o.textContent);
      expect(years).toEqual(["2022", "2023", "2024", "2025"]);
    });

    it("disables months outside the range within the shown year", async () => {
      const user = setup();
      render(<DatePicker value="2024-03-15" minDate="2024-02-01" maxDate="2024-09-30" />);
      await open(user);
      const month = (name: string) =>
        within(screen.getByRole("combobox", { name: "Month" })).getByRole("option", { name });
      expect(month("January")).toBeDisabled();
      expect(month("February")).not.toBeDisabled();
      expect(month("September")).not.toBeDisabled();
      expect(month("October")).toBeDisabled();
    });

    it("disables Today when today is outside the range", async () => {
      const user = setup();
      render(<DatePicker value="2023-05-01" minDate="2023-01-01" maxDate="2023-12-31" />);
      await open(user);
      expect(screen.getByRole("button", { name: "Today" })).toBeDisabled();
    });

    it("opens inside the range when the value is empty and today is outside it", async () => {
      const user = setup();
      render(<DatePicker value="" minDate="2023-01-01" maxDate="2023-12-31" />);
      await open(user);
      expect(gridTitle()).toBe("December 2023");
    });
  });

  describe("keyboard", () => {
    const activeDescendant = () => trigger().getAttribute("aria-activedescendant");
    const focusedCell = (name: string) => expect(activeDescendant()).toBe(cell(name).id);

    it("ArrowDown opens, focusing the selected date", async () => {
      const user = setup();
      render(<DatePicker value="2024-03-05" />);
      trigger().focus();
      await user.keyboard("{ArrowDown}");
      expect(grid()).toBeInTheDocument();
      focusedCell("05/03/2024");
    });

    it("does not open merely from receiving focus", () => {
      render(<DatePicker value="" />);
      trigger().focus();
      expect(screen.queryByRole("grid")).not.toBeInTheDocument();
    });

    it("moves by day with Left/Right and by week with Up/Down", async () => {
      const user = setup();
      render(<DatePicker value="2024-03-14" />);
      trigger().focus();
      await user.keyboard("{ArrowDown}");
      await user.keyboard("{ArrowRight}");
      focusedCell("15/03/2024");
      await user.keyboard("{ArrowLeft}{ArrowLeft}");
      focusedCell("13/03/2024");
      await user.keyboard("{ArrowDown}");
      focusedCell("20/03/2024");
      await user.keyboard("{ArrowUp}{ArrowUp}");
      focusedCell("06/03/2024");
    });

    it("carries the view across a month boundary", async () => {
      const user = setup();
      render(<DatePicker value="2024-03-31" />);
      trigger().focus();
      await user.keyboard("{ArrowDown}{ArrowRight}");
      expect(gridTitle()).toBe("April 2024");
      focusedCell("01/04/2024");
    });

    it("PageDown / PageUp move a month, clamping the day (31 Jan → 29 Feb)", async () => {
      const user = setup();
      render(<DatePicker value="2024-01-31" />);
      trigger().focus();
      await user.keyboard("{ArrowDown}{PageDown}");
      expect(gridTitle()).toBe("February 2024");
      focusedCell("29/02/2024");
      await user.keyboard("{PageUp}");
      expect(gridTitle()).toBe("January 2024");
    });

    it("Shift+PageDown moves a year", async () => {
      const user = setup();
      render(<DatePicker value="2024-03-15" />);
      trigger().focus();
      await user.keyboard("{ArrowDown}{Shift>}{PageDown}{/Shift}");
      expect(gridTitle()).toBe("March 2025");
    });

    it("Home / End go to the start / end of the week", async () => {
      const user = setup();
      render(<DatePicker value="2024-03-14" />); // a Thursday
      trigger().focus();
      await user.keyboard("{ArrowDown}{Home}");
      focusedCell("10/03/2024"); // Sunday
      await user.keyboard("{End}");
      focusedCell("16/03/2024"); // Saturday
    });

    it("Enter chooses the focused date and closes", async () => {
      const user = setup();
      const onChange = vi.fn();
      render(<Controlled initial="2024-03-14" onChange={onChange} />);
      trigger().focus();
      await user.keyboard("{ArrowDown}{ArrowRight}{ArrowRight}{Enter}");
      expect(onChange).toHaveBeenCalledWith("2024-03-16");
      expect(screen.queryByRole("grid")).not.toBeInTheDocument();
    });

    it("Escape closes without choosing", async () => {
      const user = setup();
      const onChange = vi.fn();
      render(<Controlled initial="2024-03-14" onChange={onChange} />);
      trigger().focus();
      await user.keyboard("{ArrowDown}{ArrowRight}{Escape}");
      expect(onChange).not.toHaveBeenCalled();
      expect(screen.queryByRole("grid")).not.toBeInTheDocument();
    });

    it("never moves focus outside minDate / maxDate", async () => {
      const user = setup();
      render(<DatePicker value="2024-03-12" minDate="2024-03-10" maxDate="2024-03-14" />);
      trigger().focus();
      await user.keyboard("{ArrowDown}{ArrowLeft}{ArrowLeft}{ArrowLeft}{ArrowLeft}");
      focusedCell("10/03/2024");
      await user.keyboard("{ArrowRight}{ArrowRight}{ArrowRight}{ArrowRight}{ArrowRight}{ArrowRight}");
      focusedCell("14/03/2024");
    });

    it("won't choose a disabled focused date", async () => {
      const user = setup();
      const onChange = vi.fn();
      render(<DatePicker value="" minDate="2024-04-01" onChange={onChange} />);
      trigger().focus();
      await user.keyboard("{ArrowDown}{Enter}");
      // Opens clamped to the minimum, which is allowed — so this chooses it.
      expect(onChange).toHaveBeenCalledWith("2024-04-01");
    });

    it("Tab closes the picker", async () => {
      const user = setup();
      render(
        <div>
          <DatePicker value="" />
          <button>next</button>
        </div>
      );
      trigger().focus();
      await user.keyboard("{ArrowDown}");
      await user.tab();
      expect(screen.queryByRole("grid")).not.toBeInTheDocument();
    });
  });

  describe("clearing, disabled, error", () => {
    it("clears to an empty string", async () => {
      const user = setup();
      const onChange = vi.fn();
      render(<Controlled initial="2024-03-05" onChange={onChange} />);
      await user.click(screen.getByRole("button", { name: "Clear date" }));
      expect(onChange).toHaveBeenCalledWith("");
      expect(trigger()).toHaveTextContent("Select date");
    });

    it("has no clear button when empty, not clearable, or disabled", () => {
      const { rerender } = render(<DatePicker value="" />);
      expect(screen.queryByRole("button", { name: "Clear date" })).not.toBeInTheDocument();
      rerender(<DatePicker value="2024-03-05" clearable={false} />);
      expect(screen.queryByRole("button", { name: "Clear date" })).not.toBeInTheDocument();
      rerender(<DatePicker value="2024-03-05" disabled />);
      expect(screen.queryByRole("button", { name: "Clear date" })).not.toBeInTheDocument();
    });

    it("does not open when disabled", async () => {
      const user = setup();
      render(<DatePicker value="2024-03-05" disabled />);
      await user.click(trigger());
      expect(screen.queryByRole("grid")).not.toBeInTheDocument();
      expect(trigger()).toBeDisabled();
    });

    it("flags the trigger invalid when error is set", () => {
      render(<DatePicker value="" error />);
      expect(trigger()).toHaveAttribute("aria-invalid", "true");
    });

    it("wires id through so a <label htmlFor> works", () => {
      render(
        <div>
          <label htmlFor="dob">Date of birth</label>
          <DatePicker id="dob" value="" />
        </div>
      );
      expect(screen.getByLabelText("Date of birth")).toBe(trigger());
    });
  });
});
