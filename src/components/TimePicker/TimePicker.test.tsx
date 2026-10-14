import React, { useState } from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import TimePicker from "./TimePicker";

/** Holds the value in state the way a real form would, so display updates after onChange. */
function Controlled({
  initial = "",
  onChange,
  ...rest
}: {
  initial?: string;
  onChange?: (v: string) => void;
} & Partial<React.ComponentProps<typeof TimePicker>>) {
  const [value, setValue] = useState(initial);
  return (
    <TimePicker
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
const hourOption = (h: string) =>
  within(screen.getByRole("listbox", { name: "Hours" })).getByRole("option", { name: h });
const minuteOption = (m: string) =>
  within(screen.getByRole("listbox", { name: "Minutes" })).getByRole("option", { name: m });

describe("TimePicker", () => {
  describe("display", () => {
    it("shows the placeholder when empty — not 00:00", () => {
      render(<TimePicker value="" placeholder="Pick a time" />);
      expect(trigger()).toHaveTextContent("Pick a time");
      expect(trigger()).not.toHaveTextContent("00:00");
    });

    it("shows the value as HH:mm", () => {
      render(<TimePicker value="09:30" />);
      expect(trigger()).toHaveTextContent("09:30");
    });

    it("normalises a value with seconds or a single-digit hour", () => {
      const { rerender } = render(<TimePicker value="09:30:45" />);
      expect(trigger()).toHaveTextContent("09:30");
      rerender(<TimePicker value="7:05" />);
      expect(trigger()).toHaveTextContent("07:05");
    });

    it("treats an out-of-range or malformed value as empty", () => {
      const { rerender } = render(<TimePicker value="25:00" />);
      expect(trigger()).toHaveTextContent("Select time");
      rerender(<TimePicker value="soon" />);
      expect(trigger()).toHaveTextContent("Select time");
    });
  });

  describe("dropdown", () => {
    it("is closed until the trigger is clicked", async () => {
      const user = userEvent.setup();
      render(<TimePicker value="" />);
      expect(screen.queryByRole("listbox", { name: "Hours" })).not.toBeInTheDocument();
      expect(trigger()).toHaveAttribute("aria-expanded", "false");

      await user.click(trigger());
      expect(screen.getByRole("listbox", { name: "Hours" })).toBeInTheDocument();
      expect(trigger()).toHaveAttribute("aria-expanded", "true");
    });

    it("lists 24 hours and minutes at the requested step", async () => {
      const user = userEvent.setup();
      render(<TimePicker value="" minuteStep={15} />);
      await user.click(trigger());
      expect(within(screen.getByRole("listbox", { name: "Hours" })).getAllByRole("option")).toHaveLength(24);
      const minutes = within(screen.getByRole("listbox", { name: "Minutes" })).getAllByRole("option");
      expect(minutes.map((o) => o.textContent)).toEqual(["00", "15", "30", "45"]);
    });

    it("falls back to a 5-minute step for an invalid minuteStep", async () => {
      const user = userEvent.setup();
      render(<TimePicker value="" minuteStep={0} />);
      await user.click(trigger());
      expect(within(screen.getByRole("listbox", { name: "Minutes" })).getAllByRole("option")).toHaveLength(12);
    });

    it("marks the current hour and minute as selected", async () => {
      const user = userEvent.setup();
      render(<TimePicker value="14:35" />);
      await user.click(trigger());
      expect(hourOption("14")).toHaveAttribute("aria-selected", "true");
      expect(hourOption("13")).toHaveAttribute("aria-selected", "false");
      expect(minuteOption("35")).toHaveAttribute("aria-selected", "true");
    });

    it("selects nothing when the value is empty", async () => {
      const user = userEvent.setup();
      render(<TimePicker value="" />);
      await user.click(trigger());
      expect(hourOption("00")).toHaveAttribute("aria-selected", "false");
    });

    it("closes on an outside mousedown", async () => {
      const user = userEvent.setup();
      render(
        <div>
          <TimePicker value="" />
          <button>elsewhere</button>
        </div>
      );
      await user.click(trigger());
      await user.click(screen.getByText("elsewhere"));
      expect(screen.queryByRole("listbox", { name: "Hours" })).not.toBeInTheDocument();
    });

    it("stays open when clicking inside the dropdown", async () => {
      const user = userEvent.setup();
      render(<Controlled initial="" />);
      await user.click(trigger());
      await user.click(hourOption("10"));
      expect(screen.getByRole("listbox", { name: "Hours" })).toBeInTheDocument();
    });
  });

  describe("selection by click", () => {
    it("clicking an hour keeps the current minute", async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(<Controlled initial="09:30" onChange={onChange} />);
      await user.click(trigger());
      await user.click(hourOption("14"));
      expect(onChange).toHaveBeenLastCalledWith("14:30");
    });

    it("clicking an hour with no value starts the minute at 00", async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(<Controlled onChange={onChange} />);
      await user.click(trigger());
      await user.click(hourOption("14"));
      expect(onChange).toHaveBeenLastCalledWith("14:00");
    });

    it("clicking a minute keeps the current hour", async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(<Controlled initial="09:30" onChange={onChange} />);
      await user.click(trigger());
      await user.click(minuteOption("45"));
      expect(onChange).toHaveBeenLastCalledWith("09:45");
    });

    it("builds a complete time from an hour click then a minute click", async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(<Controlled onChange={onChange} />);
      await user.click(trigger());
      await user.click(hourOption("17"));
      await user.click(minuteOption("20"));
      expect(onChange).toHaveBeenLastCalledWith("17:20");
      expect(trigger()).toHaveTextContent("17:20");
    });
  });

  describe("keyboard", () => {
    it("ArrowDown opens the picker", async () => {
      const user = userEvent.setup();
      render(<TimePicker value="" />);
      trigger().focus();
      await user.keyboard("{ArrowDown}");
      expect(screen.getByRole("listbox", { name: "Hours" })).toBeInTheDocument();
    });

    it("Enter opens the picker when closed", async () => {
      const user = userEvent.setup();
      render(<TimePicker value="" />);
      trigger().focus();
      await user.keyboard("{Enter}");
      expect(screen.getByRole("listbox", { name: "Hours" })).toBeInTheDocument();
    });

    it("does not open merely from receiving focus", () => {
      render(<TimePicker value="" />);
      trigger().focus();
      expect(screen.queryByRole("listbox", { name: "Hours" })).not.toBeInTheDocument();
    });

    it("picks an hour then a minute entirely by keyboard, closing at the end", async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(<Controlled initial="09:00" onChange={onChange} minuteStep={15} />);
      trigger().focus();
      await user.keyboard("{ArrowDown}"); // open, focus lands on the current hour (09)
      await user.keyboard("{ArrowDown}{ArrowDown}"); // 11
      await user.keyboard("{Enter}"); // commit hour, move to minutes
      expect(onChange).toHaveBeenLastCalledWith("11:00");

      await user.keyboard("{ArrowDown}{ArrowDown}"); // 00 → 15 → 30
      await user.keyboard("{Enter}"); // commit minute, close
      expect(onChange).toHaveBeenLastCalledWith("11:30");
      expect(screen.queryByRole("listbox", { name: "Hours" })).not.toBeInTheDocument();
    });

    it("ArrowRight / ArrowLeft switch between the hour and minute columns", async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(<Controlled initial="09:00" onChange={onChange} />);
      trigger().focus();
      await user.keyboard("{ArrowDown}{ArrowRight}{ArrowDown}{Enter}");
      expect(onChange).toHaveBeenLastCalledWith("09:05");

      // reopen, then go back left: Enter now commits an hour again
      trigger().focus();
      await user.keyboard("{ArrowDown}{ArrowRight}{ArrowLeft}{ArrowDown}{Enter}");
      expect(onChange).toHaveBeenLastCalledWith("10:05");
    });

    it("does not run past either end of a column", async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(<Controlled initial="00:00" onChange={onChange} />);
      trigger().focus();
      await user.keyboard("{ArrowDown}{ArrowUp}{ArrowUp}{Enter}");
      expect(onChange).toHaveBeenLastCalledWith("00:00");
    });

    it("Escape closes without changing the value", async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(<Controlled initial="09:00" onChange={onChange} />);
      trigger().focus();
      await user.keyboard("{ArrowDown}{ArrowDown}{Escape}");
      expect(onChange).not.toHaveBeenCalled();
      expect(screen.queryByRole("listbox", { name: "Hours" })).not.toBeInTheDocument();
    });

    it("Tab closes the picker and lets focus move on", async () => {
      const user = userEvent.setup();
      render(
        <div>
          <TimePicker value="" />
          <button>next</button>
        </div>
      );
      trigger().focus();
      await user.keyboard("{ArrowDown}");
      await user.tab();
      expect(screen.queryByRole("listbox", { name: "Hours" })).not.toBeInTheDocument();
    });

    it("exposes the keyboard-focused option through aria-activedescendant", async () => {
      const user = userEvent.setup();
      render(<TimePicker value="09:00" />);
      trigger().focus();
      await user.keyboard("{ArrowDown}");
      expect(trigger()).toHaveAttribute("aria-activedescendant", hourOption("09").id);
      await user.keyboard("{ArrowDown}");
      expect(trigger()).toHaveAttribute("aria-activedescendant", hourOption("10").id);
    });
  });

  describe("clearing", () => {
    it("shows a clear button once a time is set and clears to an empty string", async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(<Controlled initial="09:30" onChange={onChange} />);
      await user.click(screen.getByRole("button", { name: "Clear time" }));
      expect(onChange).toHaveBeenCalledWith("");
      expect(trigger()).toHaveTextContent("Select time");
      expect(screen.queryByRole("button", { name: "Clear time" })).not.toBeInTheDocument();
    });

    it("has no clear button when empty", () => {
      render(<TimePicker value="" />);
      expect(screen.queryByRole("button", { name: "Clear time" })).not.toBeInTheDocument();
    });

    it("has no clear button when clearable is false", () => {
      render(<TimePicker value="09:30" clearable={false} />);
      expect(screen.queryByRole("button", { name: "Clear time" })).not.toBeInTheDocument();
    });
  });

  describe("disabled / error", () => {
    it("does not open or show a clear button when disabled", async () => {
      const user = userEvent.setup();
      render(<TimePicker value="09:30" disabled />);
      await user.click(trigger());
      expect(screen.queryByRole("listbox", { name: "Hours" })).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Clear time" })).not.toBeInTheDocument();
      expect(trigger()).toBeDisabled();
    });

    it("flags the trigger as invalid when error is set", () => {
      render(<TimePicker value="" error />);
      expect(trigger()).toHaveAttribute("aria-invalid", "true");
      expect(trigger()).toHaveClass("time-picker-error");
    });
  });

  it("wires id through to the trigger so a <label htmlFor> works", () => {
    render(
      <div>
        <label htmlFor="shift-start">Shift start</label>
        <TimePicker id="shift-start" value="" />
      </div>
    );
    expect(screen.getByLabelText("Shift start")).toBe(trigger());
  });
});
