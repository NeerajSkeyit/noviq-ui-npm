import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import TableCell, { formatTableCellValues } from "./TableCell";
import { CELL_TYPE, NO_TEXT_PLACEHOLDER } from "../../constants";

describe("formatTableCellValues", () => {
  it("formats a date as DD/MM/YYYY", () => {
    expect(formatTableCellValues(CELL_TYPE.DATE, { date: "2024-01-05" })).toBe("05/01/2024");
  });

  it("returns the placeholder for a missing date", () => {
    expect(formatTableCellValues(CELL_TYPE.DATE, {})).toBe(NO_TEXT_PLACEHOLDER);
  });

  it("formats a date range", () => {
    expect(
      formatTableCellValues(CELL_TYPE.DATE_RANGE, {
        fromDate: "2024-01-05",
        toDate: "2024-01-10",
      })
    ).toBe("05/01/2024 - 10/01/2024");
  });

  it("formats time as hh:mm A", () => {
    expect(formatTableCellValues(CELL_TYPE.TIME, { time: "2024-01-05T14:30:00Z", isUtc: true })).toBe(
      "02:30 PM"
    );
  });

  it("formats midnight UTC as 12:00 AM", () => {
    expect(formatTableCellValues(CELL_TYPE.TIME, { time: "2024-01-05T00:00:00Z", isUtc: true })).toBe(
      "12:00 AM"
    );
  });

  it("formats date-time combined", () => {
    expect(
      formatTableCellValues(CELL_TYPE.DATE_TIME, { dateTime: "2024-01-05T09:05:00Z", isUtc: true })
    ).toBe("05/01/2024 09:05 AM");
  });

  it("formats duration from minutes", () => {
    expect(formatTableCellValues(CELL_TYPE.DURATION, { duration: 90 })).toBe("01:30:00");
  });

  it("formats duration from an epoch-as-ISO-string value", () => {
    expect(formatTableCellValues(CELL_TYPE.DURATION, { duration: "1970-01-01T02:15:30Z" })).toBe(
      "02:15:30"
    );
  });

  it("returns the placeholder for a missing duration", () => {
    expect(formatTableCellValues(CELL_TYPE.DURATION, {})).toBe(NO_TEXT_PLACEHOLDER);
  });

  it("formats currency using INR by default", () => {
    const result = formatTableCellValues(CELL_TYPE.CURRENCY, { value: 1234.5 });
    expect(result).toContain("1,234.50");
  });

  it("formats currency with a custom currency code", () => {
    const result = formatTableCellValues(CELL_TYPE.CURRENCY, { value: 10, currency: "USD" });
    expect(result).toContain("10.00");
  });
});

describe("TableCell", () => {
  it("renders a status badge with the default success tone", () => {
    render(<TableCell type={CELL_TYPE.STATUS} options={{ status: "approved" }} />);
    expect(screen.getByText("approved")).toBeInTheDocument();
  });

  it("renders 'Active'/'Inactive' for boolean-like statuses", () => {
    render(<TableCell type={CELL_TYPE.STATUS} options={{ status: "true" }} />);
    expect(screen.getByText("Active")).toBeInTheDocument();
  });

  it("respects a custom statusVariantMap", () => {
    const { container } = render(
      <TableCell
        type={CELL_TYPE.STATUS}
        options={{ status: "custom_status" }}
        statusVariantMap={{ custom_status: "status-info" }}
      />
    );
    expect(container.querySelector(".status-info")).toBeInTheDocument();
  });

  it("returns the placeholder for a missing status", () => {
    render(<TableCell type={CELL_TYPE.STATUS} options={{}} />);
    expect(screen.getByText(NO_TEXT_PLACEHOLDER)).toBeInTheDocument();
  });

  it("falls back to formatTableCellValues for non-status types", () => {
    render(<TableCell type={CELL_TYPE.DATE} options={{ date: "2024-01-05" }} />);
    expect(screen.getByText("05/01/2024")).toBeInTheDocument();
  });
});
