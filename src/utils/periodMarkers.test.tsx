import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen, renderHook } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { formatParts, formatValue, resolveFormats } from "./dateTimeFormat";
import { useDateTimeFormatters, useDateTimeFormats } from "../hooks/useDateTimeFormats";
import { NoviqUIConfigProvider } from "../config/NoviqUIConfigProvider";
import TimePicker from "../components/TimePicker/TimePicker";
import Table from "../components/Table/Table";
import { formatTableCellValues } from "../components/Table/TableCell";
import { CELL_TYPE } from "../constants";
import type { NoviqUIText } from "../config/types";

const parts = (hour: number, minute = 5) => ({ year: 2024, month: 3, day: 5, hour, minute, second: 0, weekday: 2 });
const SPANISH = { am: "a. m.", pm: "p. m." };
const withText = (text: NoviqUIText, ui: React.ReactElement) => <NoviqUIConfigProvider config={{ text }}>{ui}</NoviqUIConfigProvider>;

describe("A and a take the AM/PM markers they are given", () => {
  it("default to AM and PM", () => {
    expect(formatParts(parts(9), "hh:mm A")).toBe("09:05 AM");
    expect(formatParts(parts(21), "hh:mm A")).toBe("09:05 PM");
    expect(formatParts(parts(21), "h:mm a")).toBe("9:05 pm");
  });

  it("use the configured ones, before and after noon", () => {
    expect(formatParts(parts(9), "hh:mm A", undefined, SPANISH)).toBe("09:05 a. m.");
    expect(formatParts(parts(12), "hh:mm A", undefined, SPANISH)).toBe("12:05 p. m."); // noon is PM
    expect(formatParts(parts(0), "hh:mm A", undefined, SPANISH)).toBe("12:05 a. m."); // midnight is AM
    expect(formatParts(parts(21), "hh:mm A", undefined, SPANISH)).toBe("09:05 p. m.");
  });

  it("`a` is the lower-case form of the marker", () => {
    expect(formatParts(parts(21), "h:mm a", undefined, { am: "AM", pm: "PM" })).toBe("9:05 pm");
    expect(formatParts(parts(21), "h:mm a", undefined, { am: "Vorm.", pm: "Nachm." })).toBe("9:05 nachm.");
  });

  it("work for markers that have no case", () => {
    expect(formatParts(parts(9), "A h:mm", undefined, { am: "午前", pm: "午後" })).toBe("午前 9:05");
    expect(formatParts(parts(15), "A h:mm", undefined, { am: "午前", pm: "午後" })).toBe("午後 3:05");
  });

  it("leave a 24-hour pattern alone", () => {
    expect(formatParts(parts(21), "HH:mm", undefined, SPANISH)).toBe("21:05");
  });

  it("formatValue passes them through", () => {
    expect(formatValue("2024-03-05T21:05:00", "hh:mm A", false, undefined, SPANISH)).toBe("09:05 p. m.");
    expect(formatValue("14:30", "hh:mm A", false, "es-ES", SPANISH)).toBe("02:30 p. m.");
  });

  it("an escaped [A] is still literal text", () => {
    expect(formatParts(parts(9), "[A] hh:mm A", undefined, SPANISH)).toBe("A 09:05 a. m.");
  });
});

describe("resolveFormats resolves the markers from the text", () => {
  it("AM and PM by default", () => {
    expect(resolveFormats().periods).toEqual({ am: "AM", pm: "PM" });
  });

  it("from the configured text, one at a time", () => {
    expect(resolveFormats(undefined, { timePm: "p. m." }).periods).toEqual({ am: "AM", pm: "p. m." });
    expect(resolveFormats(undefined, { timeAm: "a. m.", timePm: "p. m." }).periods).toEqual(SPANISH);
  });

  it("from a function, too", () => {
    expect(resolveFormats(undefined, { timeAm: () => "vorm." }).periods.am).toBe("vorm.");
  });
});

describe("the hooks follow config.text", () => {
  it("useDateTimeFormats carries the markers", () => {
    const { result } = renderHook(() => useDateTimeFormats(), {
      wrapper: ({ children }) => withText({ timeAm: "a. m.", timePm: "p. m." }, <>{children}</>),
    });
    expect(result.current.periods).toEqual(SPANISH);
  });

  it("useDateTimeFormatters formats with them", () => {
    const { result } = renderHook(() => useDateTimeFormatters(), {
      wrapper: ({ children }) => withText({ timeAm: "a. m.", timePm: "p. m." }, <>{children}</>),
    });
    expect(result.current.formatTime("2024-03-05T14:30:00")).toBe("02:30 p. m.");
  });

  it("follow a change of text alone (nothing else about the config changed)", () => {
    let text: NoviqUIText = { timePm: "PM" };
    const Wrapper = ({ children }: { children: React.ReactNode }) => withText(text, <>{children}</>);
    const { result, rerender } = renderHook(() => useDateTimeFormats(), { wrapper: Wrapper });
    expect(result.current.periods.pm).toBe("PM");
    text = { timePm: "p. m." };
    rerender();
    expect(result.current.periods.pm).toBe("p. m.");
  });

  it("are unchanged without text", () => {
    const { result } = renderHook(() => useDateTimeFormatters());
    expect(result.current.formatTime("2024-03-05T14:30:00")).toBe("02:30 PM");
  });
});

describe("Table time cells and the export use them", () => {
  it("formatTableCellValues, given resolved formats", () => {
    const formats = resolveFormats(undefined, { timePm: "p. m." });
    expect(formatTableCellValues(CELL_TYPE.TIME, { time: "2024-03-05T14:30:00" }, formats)).toBe("02:30 p. m.");
    expect(formatTableCellValues(CELL_TYPE.DATE_TIME_RANGE, { fromDateTime: "2024-03-05T09:00:00", toDateTime: "2024-03-05T17:30:00" }, formats)).toBe(
      "05/03/2024 09:00 AM - 05/03/2024 05:30 p. m."
    );
  });

  it("a rendered cell", () => {
    render(
      withText(
        { timeAm: "a. m.", timePm: "p. m." },
        <Table columns={[{ id: "at", heading: "At", accessorKey: "at", type: CELL_TYPE.TIME }]} preFetchedData={[{ at: "2024-03-05T14:30:00" }, { at: "2024-03-05T08:00:00" }]} isPaginationHidden />
      )
    );
    expect(screen.getByText("02:30 p. m.")).toBeInTheDocument();
    expect(screen.getByText("08:00 a. m.")).toBeInTheDocument();
  });
});

describe("TimePicker", () => {
  const picker = (value: string, props: Partial<React.ComponentProps<typeof TimePicker>> = {}, onChange = () => {}) =>
    withText({ timeAm: "a. m.", timePm: "p. m." }, <TimePicker value={value} onChange={onChange} {...props} />);

  it("shows the markers in its field", () => {
    render(picker("14:30"));
    expect(screen.getByRole("combobox")).toHaveTextContent("02:30 p. m.");
  });

  it("labels the AM/PM column with them", async () => {
    const user = userEvent.setup();
    render(picker("14:30"));
    await user.click(screen.getByRole("combobox"));
    const options = screen.getAllByRole("option", { name: /^[ap]\. m\.$/ });
    expect(options.map((o) => o.textContent)).toEqual(["a. m.", "p. m."]);
    expect(screen.queryByRole("option", { name: "AM" })).not.toBeInTheDocument();
  });

  it("marks the current half of the day, by its label", async () => {
    const user = userEvent.setup();
    render(picker("14:30"));
    await user.click(screen.getByRole("combobox"));
    expect(screen.getByRole("option", { name: "p. m." })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("option", { name: "a. m." })).toHaveAttribute("aria-selected", "false");
  });

  it("still emits the same 24-hour value whatever the label", async () => {
    const user = userEvent.setup();
    const emitted: string[] = [];
    function Harness() {
      const [value, setValue] = React.useState("09:30");
      return picker(value, {}, (v: string) => {
        emitted.push(v);
        setValue(v);
      });
    }
    render(<Harness />);
    await user.click(screen.getByRole("combobox"));
    await user.click(screen.getByRole("option", { name: "p. m." }));
    expect(emitted.at(-1)).toBe("21:30");
    await user.click(screen.getByRole("option", { name: "a. m." }));
    expect(emitted.at(-1)).toBe("09:30");
  });

  it("keeps the column's own accessible name (it is not one of the markers)", async () => {
    const user = userEvent.setup();
    render(picker("14:30"));
    await user.click(screen.getByRole("combobox"));
    expect(screen.getByRole("listbox", { name: "AM/PM" })).toBeInTheDocument();
  });

  it("is unchanged without text: AM and PM", async () => {
    const user = userEvent.setup();
    render(<TimePicker value="14:30" />);
    expect(screen.getByRole("combobox")).toHaveTextContent("02:30 PM");
    await user.click(screen.getByRole("combobox"));
    expect(screen.getByRole("option", { name: "PM" })).toHaveAttribute("aria-selected", "true");
  });
});
