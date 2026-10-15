import React, { useState } from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import DatePicker from "./DatePicker/DatePicker";
import MonthPicker from "./MonthPicker/MonthPicker";
import TimePicker from "./TimePicker/TimePicker";
import Input from "./Input/Input";
import { NoviqUIConfigProvider } from "../config/NoviqUIConfigProvider";
import type { NoviqUIFormats } from "../config/types";

// "Today" is pinned so an empty picker opens on a known month.
beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"], now: new Date(2024, 2, 15, 12, 0, 0) });
});
afterEach(() => {
  vi.useRealTimers();
});

const withFormats = (ui: React.ReactElement, formats?: NoviqUIFormats) =>
  render(<NoviqUIConfigProvider config={{ formats }}>{ui}</NoviqUIConfigProvider>);

const trigger = () => screen.getAllByRole("combobox").find((el) => el.tagName === "BUTTON")!;
const listOf = (name: string) =>
  within(screen.getByRole("listbox", { name })).getAllByRole("option").map((o) => o.textContent);

describe("DatePicker", () => {
  it("shows DD/MM/YYYY with no formats configured", () => {
    withFormats(<DatePicker value="2024-03-05" />);
    expect(trigger()).toHaveTextContent("05/03/2024");
  });

  it("follows formats.date", () => {
    withFormats(<DatePicker value="2024-03-05" />, { date: "YYYY-MM-DD" });
    expect(trigger()).toHaveTextContent("2024-03-05");
  });

  it("supports month and weekday names", () => {
    withFormats(<DatePicker value="2024-03-05" />, { date: "dddd, D MMMM YYYY" });
    expect(trigger()).toHaveTextContent("Tuesday, 5 March 2024");
  });

  it("a displayFormat prop beats the provider", () => {
    withFormats(<DatePicker value="2024-03-05" displayFormat="DD MMM YYYY" />, { date: "YYYY-MM-DD" });
    expect(trigger()).toHaveTextContent("05 Mar 2024");
  });

  it("labels the calendar days in the same format, while emitting ISO", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    withFormats(<DatePicker value="2024-03-05" onChange={onChange} />, { date: "MM/DD/YYYY" });
    await user.click(trigger());
    await user.click(screen.getByRole("gridcell", { name: "03/20/2024" }));
    expect(onChange).toHaveBeenCalledWith("2024-03-20"); // the value never changes shape
  });

  it("works through <Input type=datePicker> too", () => {
    withFormats(<Input type="datePicker" label="Joined" value="2024-03-05" onChange={() => {}} />, {
      date: "DD.MM.YY",
    });
    expect(screen.getByLabelText("Joined")).toHaveTextContent("05.03.24");
  });
});

describe("MonthPicker", () => {
  it("shows MM/YYYY by default", () => {
    withFormats(<MonthPicker value="2024-03" />);
    expect(trigger()).toHaveTextContent("03/2024");
  });

  it.each([
    ["YYYY-MM-DD", "2024-03"],
    ["MM/DD/YYYY", "03/2024"],
    ["DD MMMM YYYY", "March 2024"],
    ["dddd, DD MMM YYYY", "Mar 2024"],
  ])("derives its display from formats.date %s", (date, shown) => {
    withFormats(<MonthPicker value="2024-03" />, { date });
    expect(trigger()).toHaveTextContent(shown);
  });

  it("a displayFormat prop beats the derived one", () => {
    withFormats(<MonthPicker value="2024-03" displayFormat="MMM 'YY" />, { date: "YYYY-MM-DD" });
    expect(trigger()).toHaveTextContent("Mar '24");
  });
});

describe("TimePicker", () => {
  it("follows the library default `hh:mm A` — the Table's — when the app set no time format", () => {
    withFormats(<TimePicker value="14:30" />);
    expect(trigger()).toHaveTextContent("02:30 PM");
  });

  it("keeps the zero-based 12-hour default for an explicit hourCycle with no format", async () => {
    const user = userEvent.setup();
    withFormats(<TimePicker value="12:30" hourCycle={12} />);
    expect(trigger()).toHaveTextContent("00:30 PM");
    await user.click(trigger());
    expect(listOf("Hours")[0]).toBe("00");
  });

  it("formats.time 'HH:mm' gives a 24-hour picker", async () => {
    const user = userEvent.setup();
    withFormats(<TimePicker value="14:30" />, { time: "HH:mm" });
    expect(trigger()).toHaveTextContent("14:30");
    await user.click(trigger());
    expect(listOf("Hours")).toHaveLength(24);
    expect(screen.queryByRole("listbox", { name: "AM/PM" })).not.toBeInTheDocument();
  });

  it("formats.time 'hh:mm A' gives a conventional 12-hour picker (12, 01 … 11)", async () => {
    const user = userEvent.setup();
    withFormats(<TimePicker value="00:15" />, { time: "hh:mm A" });
    expect(trigger()).toHaveTextContent("12:15 AM");
    await user.click(trigger());
    expect(listOf("Hours")).toEqual(["12", "01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11"]);
    expect(listOf("AM/PM")).toEqual(["AM", "PM"]);
  });

  it("formats.time 'KK:mm A' gives the zero-based 12-hour picker (00 … 11)", async () => {
    const user = userEvent.setup();
    withFormats(<TimePicker value="12:00" />, { time: "KK:mm A" });
    expect(trigger()).toHaveTextContent("00:00 PM");
    await user.click(trigger());
    expect(listOf("Hours")[0]).toBe("00");
  });

  it("follows the pattern's own punctuation and casing", () => {
    withFormats(<TimePicker value="14:30" />, { time: "h:mm a" });
    expect(trigger()).toHaveTextContent("2:30 pm");
  });

  it("an explicit hourCycle wins over the configured format", async () => {
    const user = userEvent.setup();
    withFormats(<TimePicker value="14:30" hourCycle={24} />, { time: "hh:mm A" });
    // The 12-hour pattern would contradict the 24-hour columns, so the 24-hour default is shown.
    expect(trigger()).toHaveTextContent("14:30");
    await user.click(trigger());
    expect(listOf("Hours")).toHaveLength(24);
  });

  it("a displayFormat that contradicts the clock is ignored", () => {
    // The provider's 12-hour pattern selects a 12-hour clock; a 24-hour display pattern would
    // disagree with the AM/PM column beneath it, so the configured pattern is kept.
    withFormats(<TimePicker value="14:30" displayFormat="HH[h]mm" />, { time: "hh:mm A" });
    expect(trigger()).toHaveTextContent("02:30 PM");
  });

  it("a displayFormat that fits the clock is used", () => {
    withFormats(<TimePicker value="14:30" displayFormat="h[h]mm a" />, { time: "hh:mm A" });
    expect(trigger()).toHaveTextContent("2h30 pm");
  });

  it("a displayFormat prop on a 24-hour picker is used as given", () => {
    withFormats(<TimePicker value="14:30" hourCycle={24} displayFormat="HH[h]mm" />);
    expect(trigger()).toHaveTextContent("14h30");
  });

  it("a 24-hour displayFormat is ignored on the default 12-hour clock, as any pattern that contradicts it", () => {
    withFormats(<TimePicker value="14:30" displayFormat="HH[h]mm" />);
    expect(trigger()).toHaveTextContent("02:30 PM");
  });

  it("still emits 24-hour HH:mm whatever is displayed", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    function Controlled() {
      const [value, setValue] = useState("");
      return (
        <TimePicker
          value={value}
          onChange={(v) => {
            setValue(v);
            onChange(v);
          }}
        />
      );
    }
    withFormats(<Controlled />, { time: "hh:mm A" });
    await user.click(trigger());
    await user.click(within(screen.getByRole("listbox", { name: "Hours" })).getByRole("option", { name: "03" }));
    await user.click(within(screen.getByRole("listbox", { name: "AM/PM" })).getByRole("option", { name: "PM" }));
    expect(onChange).toHaveBeenLastCalledWith("15:00");
  });

  it("works through <Input type=timePicker>", () => {
    withFormats(<Input type="timePicker" label="Start" value="14:30" onChange={() => {}} />, { time: "h:mm A" });
    expect(screen.getByLabelText("Start")).toHaveTextContent("2:30 PM");
  });
});
