import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import DatePicker from "./DatePicker";
import MonthPicker from "../MonthPicker/MonthPicker";
import { NoviqUIConfigProvider } from "../../config/NoviqUIConfigProvider";
import type { NoviqUIFormats } from "../../config/types";

// Friday 15 March 2024.
beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"], now: new Date(2024, 2, 15, 12, 0, 0) });
});
afterEach(() => {
  vi.useRealTimers();
});

const withFormats = (formats: NoviqUIFormats, ui: React.ReactElement) => (
  <NoviqUIConfigProvider config={{ formats }}>{ui}</NoviqUIConfigProvider>
);

const trigger = () => screen.getAllByRole("combobox").find((el) => el.tagName === "BUTTON")!;
const grid = () => screen.getByRole("grid");
const headings = () => within(grid()).getAllByRole("columnheader").map((h) => h.textContent);
const monthSelect = () => screen.getByRole("combobox", { name: "Month" }) as HTMLSelectElement;
const setup = () => userEvent.setup();

describe("DatePicker — calendar week", () => {
  it("starts on Sunday by default, as it always has", async () => {
    const user = setup();
    render(<DatePicker value="2024-03-05" />);
    await user.click(trigger());
    expect(headings()).toEqual(["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"]);
  });

  it("starts on the configured weekStart", async () => {
    const user = setup();
    render(withFormats({ weekStart: 1 }, <DatePicker value="2024-03-05" />));
    await user.click(trigger());
    expect(headings()).toEqual(["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"]);
  });

  it("puts each date under its own weekday heading when the week starts on Monday", async () => {
    const user = setup();
    render(withFormats({ weekStart: 1 }, <DatePicker value="2024-03-05" />));
    await user.click(trigger());
    const firstRow = within(grid()).getAllByRole("row")[1]; // after the heading row
    // 1 March 2024 is a Friday: Mon 26 Feb … Thu 29 Feb, then Fri 1, Sat 2, Sun 3.
    const days = within(firstRow).getAllByRole("gridcell").map((c) => c.textContent);
    expect(days).toEqual(["26", "27", "28", "29", "1", "2", "3"]);
  });

  it("Home / End follow the configured week", async () => {
    const user = setup();
    render(withFormats({ weekStart: 1 }, <DatePicker value="2024-03-15" />)); // a Friday
    trigger().focus();
    await user.keyboard("{ArrowDown}{Home}");
    expect(trigger().getAttribute("aria-activedescendant")).toBe(
      within(grid()).getByRole("gridcell", { name: "11/03/2024" }).id // Monday
    );
    await user.keyboard("{End}");
    expect(trigger().getAttribute("aria-activedescendant")).toBe(
      within(grid()).getByRole("gridcell", { name: "17/03/2024" }).id // Sunday
    );
  });
});

describe("DatePicker — locale", () => {
  it("names the weekdays, months and title in that language, and starts the week the way it does", async () => {
    const user = setup();
    render(withFormats({ locale: "de-DE" }, <DatePicker value="2024-03-05" />));
    await user.click(trigger());
    expect(headings()).toEqual(["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"]);
    expect(grid()).toHaveAttribute("aria-label", "März 2024");
    expect(within(monthSelect()).getAllByRole("option").map((o) => o.textContent).slice(0, 3)).toEqual([
      "Januar",
      "Februar",
      "März",
    ]);
    expect(monthSelect().value).toBe("3");
  });

  it("shows the chosen date with the language's names", () => {
    render(withFormats({ locale: "de-DE", date: "dddd, D. MMMM YYYY" }, <DatePicker value="2024-03-05" />));
    expect(trigger()).toHaveTextContent("Dienstag, 5. März 2024");
  });

  it("weekStart still wins over the locale's week", async () => {
    const user = setup();
    render(withFormats({ locale: "de-DE", weekStart: 0 }, <DatePicker value="2024-03-05" />));
    await user.click(trigger());
    expect(headings()[0]).toBe("So");
  });

  it("changes nothing for English locales", async () => {
    const user = setup();
    render(withFormats({ locale: "en-US" }, <DatePicker value="2024-03-05" />));
    await user.click(trigger());
    expect(headings()).toEqual(["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"]);
    expect(grid()).toHaveAttribute("aria-label", "March 2024");
  });
});

describe("MonthPicker — locale", () => {
  it("names the months, and the value, in that language", async () => {
    const user = setup();
    render(withFormats({ locale: "fr-FR", date: "DD MMMM YYYY" }, <MonthPicker value="2024-02" />));
    const field = screen.getByRole("combobox");
    expect(field).toHaveTextContent("février 2024");

    await user.click(field);
    const cells = within(screen.getByRole("grid")).getAllByRole("gridcell");
    expect(cells[0]).toHaveAccessibleName("janvier 2024");
    expect(cells[2].textContent).toBe("mars");
  });

  it("is English without a locale", async () => {
    const user = setup();
    render(<MonthPicker value="2024-02" />);
    await user.click(screen.getByRole("combobox"));
    expect(within(screen.getByRole("grid")).getAllByRole("gridcell")[0]).toHaveAccessibleName(
      "January 2024"
    );
  });
});
