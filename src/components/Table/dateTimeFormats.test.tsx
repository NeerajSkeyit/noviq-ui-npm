import React from "react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Table, { type TableColumn } from "./Table";
import TableCell, { formatTableCellValues } from "./TableCell";
import FilterChips from "./FilterChips";
import FilterDrawer from "./FilterDrawer";
import { buildActiveFilter } from "./buildActiveFilter";
import { resolveFormats } from "../../utils/dateTimeFormat";
import { NoviqUIConfigProvider } from "../../config/NoviqUIConfigProvider";
import { CELL_TYPE, FILTER_TYPE } from "../../constants";
import type { NoviqUIFormats } from "../../config/types";

const ISO_FORMATS: NoviqUIFormats = {
  date: "YYYY-MM-DD",
  time: "HH:mm",
  dateTime: "YYYY-MM-DD HH:mm",
};
const US_FORMATS: NoviqUIFormats = { date: "MM/DD/YYYY", time: "h:mm a" };

interface Shift {
  id: number;
  day: string;
  from: string;
  to: string;
  stamp: string;
  stampFrom: string;
  stampTo: string;
  at: string;
  atFrom: string;
  atTo: string;
}

const shift: Shift = {
  id: 1,
  day: "2024-03-05",
  from: "2024-03-01",
  to: "2024-03-31",
  stamp: "2024-03-05T14:30:00",
  stampFrom: "2024-03-05T09:00:00",
  stampTo: "2024-03-05T17:30:00",
  at: "2024-03-05T14:30:00",
  atFrom: "2024-03-05T09:00:00",
  atTo: "2024-03-05T17:30:00",
};

const columns: TableColumn<Shift>[] = [
  { id: "day", heading: "Day", accessorKey: "day", type: CELL_TYPE.DATE },
  { id: "range", heading: "Range", type: CELL_TYPE.DATE_RANGE, fromDate: "from", toDate: "to" },
  { id: "stamp", heading: "Stamp", accessorKey: "stamp", type: CELL_TYPE.DATE_TIME },
  { id: "window", heading: "Window", type: CELL_TYPE.DATE_TIME_RANGE, fromDateTime: "stampFrom", toDateTime: "stampTo" },
  { id: "at", heading: "At", accessorKey: "at", type: CELL_TYPE.TIME },
  { id: "hours", heading: "Hours", type: CELL_TYPE.TIME_RANGE, fromTime: "atFrom", toTime: "atTo" },
];

function renderTable(formats?: NoviqUIFormats, extra: Partial<React.ComponentProps<typeof Table<Shift>>> = {}) {
  return render(
    <NoviqUIConfigProvider config={{ formats }}>
      <Table columns={columns} preFetchedData={[shift]} isPaginationHidden {...extra} />
    </NoviqUIConfigProvider>
  );
}

const cellsOf = () => within(screen.getAllByRole("row")[1]).getAllByRole("cell").map((c) => c.textContent?.trim());

describe("formatTableCellValues with explicit formats", () => {
  const iso = resolveFormats(ISO_FORMATS);

  it("formats every date/time cell type with the given patterns", () => {
    expect(formatTableCellValues(CELL_TYPE.DATE, { date: shift.day }, iso)).toBe("2024-03-05");
    expect(formatTableCellValues(CELL_TYPE.DATE_RANGE, { fromDate: shift.from, toDate: shift.to }, iso)).toBe(
      "2024-03-01 - 2024-03-31"
    );
    expect(formatTableCellValues(CELL_TYPE.DATE_TIME, { dateTime: shift.stamp }, iso)).toBe("2024-03-05 14:30");
    expect(
      formatTableCellValues(CELL_TYPE.DATE_TIME_RANGE, { fromDateTime: shift.stampFrom, toDateTime: shift.stampTo }, iso)
    ).toBe("2024-03-05 09:00 - 2024-03-05 17:30");
    expect(formatTableCellValues(CELL_TYPE.TIME, { time: shift.at }, iso)).toBe("14:30");
    expect(formatTableCellValues(CELL_TYPE.TIME_RANGE, { fromTime: shift.atFrom, toTime: shift.atTo }, iso)).toBe(
      "09:00 - 17:30"
    );
  });

  it("keeps the original look when no formats are passed", () => {
    expect(formatTableCellValues(CELL_TYPE.DATE_TIME, { dateTime: shift.stamp })).toBe("05/03/2024 02:30 PM");
  });

  it("still shows the placeholder for an empty value", () => {
    expect(formatTableCellValues(CELL_TYPE.DATE, { date: null }, iso)).toBe("-");
  });
});

describe("<TableCell> reads the provider", () => {
  it("formats a bare cell using the configured date format", () => {
    render(
      <NoviqUIConfigProvider config={{ formats: { date: "DD MMM YYYY" } }}>
        <TableCell type={CELL_TYPE.DATE} options={{ date: "2024-03-05" }} />
      </NoviqUIConfigProvider>
    );
    expect(screen.getByText("05 Mar 2024")).toBeInTheDocument();
  });
});

describe("<Table> under a provider", () => {
  it("uses the defaults with no formats configured", () => {
    renderTable(undefined);
    expect(cellsOf()).toEqual([
      "05/03/2024",
      "01/03/2024 - 31/03/2024",
      "05/03/2024 02:30 PM",
      "05/03/2024 09:00 AM - 05/03/2024 05:30 PM",
      "02:30 PM",
      "09:00 AM - 05:30 PM",
    ]);
  });

  it("applies an ISO / 24-hour configuration to every cell", () => {
    renderTable(ISO_FORMATS);
    expect(cellsOf()).toEqual([
      "2024-03-05",
      "2024-03-01 - 2024-03-31",
      "2024-03-05 14:30",
      "2024-03-05 09:00 - 2024-03-05 17:30",
      "14:30",
      "09:00 - 17:30",
    ]);
  });

  it("applies a US configuration, with date-time following date + time", () => {
    renderTable(US_FORMATS);
    const cells = cellsOf();
    expect(cells[0]).toBe("03/05/2024");
    expect(cells[2]).toBe("03/05/2024 2:30 pm"); // not given → "<date> <time>"
    expect(cells[4]).toBe("2:30 pm");
  });

  it("an explicit date-time pattern is used for date-time cells only", () => {
    renderTable({ date: "DD/MM/YYYY", time: "HH:mm", dateTime: "dddd, D MMMM YYYY [at] HH:mm" });
    const cells = cellsOf();
    expect(cells[0]).toBe("05/03/2024");
    expect(cells[2]).toBe("Tuesday, 5 March 2024 at 14:30");
    expect(cells[4]).toBe("14:30");
  });

  it("shows a date-only value on the right day, whatever the viewer's time zone", () => {
    const original = process.env.TZ;
    process.env.TZ = "America/Los_Angeles";
    try {
      renderTable(ISO_FORMATS);
      expect(cellsOf()[0]).toBe("2024-03-05");
    } finally {
      if (original === undefined) delete process.env.TZ;
      else process.env.TZ = original;
    }
  });
});

describe("export uses the same patterns", () => {
  afterEach(() => vi.restoreAllMocks());

  it("writes dates and times to the CSV in the configured format", async () => {
    const user = userEvent.setup();
    const blobs: Blob[] = [];
    vi.spyOn(URL, "createObjectURL").mockImplementation((b) => {
      blobs.push(b as Blob);
      return "blob:x";
    });
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => undefined);

    renderTable(ISO_FORMATS, { exportFileName: "shifts" });
    await user.click(screen.getByRole("button", { name: /^Export$/ }));
    await user.click(screen.getByText("Export as CSV"));

    await waitFor(() => expect(blobs).toHaveLength(1));
    const csv = await blobs[0].text();
    expect(csv).toContain("2024-03-05");
    expect(csv).toContain("2024-03-05 14:30");
    expect(csv).toContain("09:00 - 17:30");
    expect(csv).not.toContain("05/03/2024");
  });
});

describe("filter chips use the date format", () => {
  const dateFilter = { id: "day", label: "Day", type: FILTER_TYPE.DATE };
  const rangeFilter = { id: "range", label: "Range", type: FILTER_TYPE.DATE_RANGE };

  it("buildActiveFilter formats DATE and DATE_RANGE with the given patterns", () => {
    const iso = resolveFormats(ISO_FORMATS);
    expect(buildActiveFilter(dateFilter, "2024-03-05", iso)?.displayValue).toBe("2024-03-05");
    expect(buildActiveFilter(rangeFilter, { from: "2024-03-01", to: "2024-03-31" }, iso)?.displayValue).toBe(
      "2024-03-01 → 2024-03-31"
    );
    expect(buildActiveFilter(rangeFilter, { from: "2024-03-01" }, iso)?.displayValue).toBe("From 2024-03-01");
  });

  it("keeps DD/MM/YYYY when no formats are passed", () => {
    expect(buildActiveFilter(dateFilter, "2024-03-05")?.displayValue).toBe("05/03/2024");
  });

  it("the payload sent to the backend is never reformatted", () => {
    const iso = resolveFormats({ date: "DD MMM YYYY" });
    expect(buildActiveFilter(dateFilter, "2024-03-05", iso)?.apiPayload).toEqual({ day: "2024-03-05" });
  });

  it("FilterDrawer builds chips in the configured format", async () => {
    const user = userEvent.setup();
    const onApply = vi.fn();
    render(
      <NoviqUIConfigProvider config={{ formats: { date: "MM/DD/YYYY" } }}>
        <FilterDrawer
          filters={[dateFilter]}
          activeFilters={[]}
          onApplyFilter={onApply}
          onRemoveFilter={() => {}}
          onClearAll={() => {}}
        />
      </NoviqUIConfigProvider>
    );
    await user.click(screen.getByRole("button", { name: /Filters/ }));
    const input = document.querySelector<HTMLInputElement>('input[type="date"]')!;
    await user.type(input, "2024-03-05");
    await user.click(screen.getByRole("button", { name: "Apply" }));

    expect(onApply).toHaveBeenCalled();
    expect(onApply.mock.calls[0][0][0].displayValue).toBe("03/05/2024");
  });

  it("FilterChips shows whatever display value it was handed", () => {
    render(
      <FilterChips
        filters={[{ id: "d", label: "Day", displayValue: "03/05/2024", apiPayload: {} }]}
        onRemove={() => {}}
        onClearAll={() => {}}
      />
    );
    expect(screen.getByText("03/05/2024")).toBeInTheDocument();
  });
});
