import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import TableCell, { formatTableCellValues } from "./TableCell";
import { NoviqUIConfigProvider } from "../../config/NoviqUIConfigProvider";
import { CELL_TYPE, NO_TEXT_PLACEHOLDER, STATUS_CLASS } from "../../constants";
import type { NoviqUIStatusConfig } from "../../config/types";

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

describe("TableCell — configurable status", () => {
  const pill = (container: HTMLElement) => container.querySelector(".nq-badge") as HTMLElement;
  const cell = (status: string | null, props: Partial<React.ComponentProps<typeof TableCell>> = {}) =>
    render(<TableCell type={CELL_TYPE.STATUS} options={{ status }} {...props} />);

  it("a built-in status carries its tone class on a plain pill, with no variant to compete with", () => {
    const { container } = cell("approved");
    expect(pill(container)).toHaveClass("nq-badge", STATUS_CLASS.SUCCESS);
    expect(pill(container)).not.toHaveClass("nq-badge-outline");
    expect(pill(container).className).not.toMatch(/nq-badge-(default|secondary|destructive)/);
  });

  it("an unknown status gets the grey tone", () => {
    expect(pill(cell("archived").container)).toHaveClass(STATUS_CLASS.DEFAULT);
  });

  it("your class replaces the tone: the default tone class is not there beside it", () => {
    const { container } = cell("approved", { statuses: { styles: { approved: "my-ok" } } });
    expect(pill(container)).toHaveClass("nq-badge", "my-ok");
    // no built-in tone of any kind beside it: it would compete with your class at equal specificity
    for (const tone of Object.values(STATUS_CLASS)) expect(pill(container)).not.toHaveClass(tone);
    expect(pill(container).className).toBe("nq-badge my-ok");
  });

  it("the same for a status that fell back to your own fallback class", () => {
    const { container } = cell("mystery", { statuses: { fallback: "my-neutral" } });
    expect(pill(container).className).toBe("nq-badge my-neutral");
  });

  it("your own status, label and fallback", () => {
    const statuses: NoviqUIStatusConfig = {
      styles: { shipped: { className: "my-ship", label: "On its way" } },
      fallback: "my-neutral",
    };
    const shipped = cell("shipped", { statuses });
    expect(screen.getByText("On its way")).toBe(pill(shipped.container));
    expect(pill(shipped.container)).toHaveClass("my-ship");
    expect(pill(cell("mystery", { statuses }).container)).toHaveClass("my-neutral");
  });

  it("takes the provider's statuses", () => {
    const { container } = render(
      <NoviqUIConfigProvider config={{ statuses: { styles: { draft: "p-draft" } } }}>
        <TableCell type={CELL_TYPE.STATUS} options={{ status: "draft" }} />
      </NoviqUIConfigProvider>
    );
    expect(pill(container)).toHaveClass("p-draft");
  });

  it("the cell's own statuses win over the provider's, status by status", () => {
    const { container } = render(
      <NoviqUIConfigProvider config={{ statuses: { styles: { draft: "p-draft", shipped: "p-ship" } } }}>
        <TableCell type={CELL_TYPE.STATUS} options={{ status: "draft" }} statuses={{ styles: { draft: "t-draft" } }} />
        <TableCell type={CELL_TYPE.STATUS} options={{ status: "shipped" }} statuses={{ styles: { draft: "t-draft" } }} />
      </NoviqUIConfigProvider>
    );
    const [draft, shipped] = Array.from(container.querySelectorAll(".nq-badge"));
    expect(draft).toHaveClass("t-draft");
    expect(shipped).toHaveClass("p-ship");
  });

  it("render draws the whole pill, and gets the status, label, resolved class and row", () => {
    const seen: unknown[] = [];
    const statuses: NoviqUIStatusConfig = {
      styles: { shipped: { className: "my-ship", label: "On its way" } },
      render: (props) => {
        seen.push(props);
        return <b data-testid="mine">{`${props.status}|${props.label}|${props.className}`}</b>;
      },
    };
    const { container } = cell("shipped", { statuses, row: { id: 7 } });
    expect(screen.getByTestId("mine")).toHaveTextContent("shipped|On its way|my-ship");
    expect(container.querySelector(".nq-badge")).toBeNull(); // not wrapped in the default pill
    expect(seen).toEqual([{ status: "shipped", label: "On its way", className: "my-ship", row: { id: 7 } }]);
  });

  it("render can come from the provider, and the cell's own render replaces it", () => {
    render(
      <NoviqUIConfigProvider config={{ statuses: { render: ({ label }) => <i data-testid="p">{label}</i> } }}>
        <TableCell type={CELL_TYPE.STATUS} options={{ status: "approved" }} />
        <TableCell
          type={CELL_TYPE.STATUS}
          options={{ status: "approved" }}
          statuses={{ render: ({ label }) => <u data-testid="t">{label}</u> }}
        />
      </NoviqUIConfigProvider>
    );
    expect(screen.getByTestId("p")).toHaveTextContent("approved");
    expect(screen.getByTestId("t")).toHaveTextContent("approved");
  });

  it("render is not called for an empty status: the placeholder shows", () => {
    let called = false;
    cell(null, { statuses: { render: () => ((called = true), "x") } });
    expect(screen.getByText(NO_TEXT_PLACEHOLDER)).toBeInTheDocument();
    expect(called).toBe(false);
  });

  it("the old statusVariantMap still works, and statuses.styles beats it", () => {
    const old = cell("custom_status", { statusVariantMap: { custom_status: "status-info" } });
    expect(pill(old.container)).toHaveClass("status-info");
    const both = cell("custom_status", {
      statusVariantMap: { custom_status: "status-info" },
      statuses: { styles: { custom_status: "newer" } },
    });
    expect(pill(both.container)).toHaveClass("newer");
    expect(pill(both.container)).not.toHaveClass("status-info");
  });

  it("true and false still read Active and Inactive, in the configured text", () => {
    render(
      <NoviqUIConfigProvider config={{ text: { statusActive: "Activo" } }}>
        <TableCell type={CELL_TYPE.STATUS} options={{ status: "true" }} />
      </NoviqUIConfigProvider>
    );
    expect(screen.getByText("Activo")).toHaveClass(STATUS_CLASS.SUCCESS);
  });
});
