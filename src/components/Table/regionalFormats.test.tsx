import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen, within } from "@testing-library/react";
import Table, { type TableColumn } from "./Table";
import TableCell, { formatTableCellValues } from "./TableCell";
import { buildActiveFilter } from "./buildActiveFilter";
import { resolveFormats } from "../../utils/dateTimeFormat";
import { NoviqUIConfigProvider } from "../../config/NoviqUIConfigProvider";
import { CELL_TYPE, FILTER_TYPE } from "../../constants";
import type { NoviqUIFormats } from "../../config/types";

const plain = (s: string | null | undefined) => (s ?? "").replace(/[  ]/g, " ").trim();

interface Invoice {
  id: number;
  issued: string;
  amount: number;
  inEuro: number;
}
const invoice: Invoice = { id: 1, issued: "2024-03-05", amount: 1234567.5, inEuro: 9876543.21 };

const columns: TableColumn<Invoice>[] = [
  { id: "issued", heading: "Issued", accessorKey: "issued", type: CELL_TYPE.DATE },
  { id: "amount", heading: "Amount", accessorKey: "amount", type: CELL_TYPE.CURRENCY },
  { id: "inEuro", heading: "Euro", accessorKey: "inEuro", type: CELL_TYPE.CURRENCY, currency: "EUR" },
];

const renderTable = (formats?: NoviqUIFormats) =>
  render(
    <NoviqUIConfigProvider config={{ formats }}>
      <Table columns={columns} preFetchedData={[invoice]} isPaginationHidden />
    </NoviqUIConfigProvider>
  );

const cells = () =>
  within(screen.getAllByRole("row")[1])
    .getAllByRole("cell")
    .map((c) => plain(c.textContent));

describe("<Table> — currency and names under a provider", () => {
  it("keeps the rupee, lakh/crore default when nothing is configured", () => {
    renderTable();
    expect(cells()).toEqual(["05/03/2024", "₹12,34,567.50", "€98,76,543.21"]);
  });

  it("formats an unconfigured currency column in formats.currency", () => {
    renderTable({ currency: "USD", locale: "en-US" });
    expect(cells()[1]).toBe("$1,234,567.50");
  });

  it("a column's own currency still wins", () => {
    renderTable({ currency: "USD", locale: "en-US" });
    expect(cells()[2]).toBe("€9,876,543.21");
  });

  it("groups and places the symbol the way the locale does", () => {
    renderTable({ locale: "de-DE", currency: "EUR", date: "D. MMMM YYYY" });
    expect(cells()).toEqual(["5. März 2024", "1.234.567,50 €", "9.876.543,21 €"]);
  });

  it("a locale alone leaves the default currency", () => {
    renderTable({ locale: "en-US" });
    expect(cells()[1]).toMatch(/INR\s?1,234,567\.50$|₹1,234,567\.50$/);
  });
});

describe("formatTableCellValues — regional settings", () => {
  it("takes them from the resolved formats", () => {
    const formats = resolveFormats({ locale: "en-US", currency: "USD" });
    expect(formatTableCellValues(CELL_TYPE.CURRENCY, { value: 1234567.5 }, formats)).toBe("$1,234,567.50");
  });

  it("still accepts a hand-built { date, time, dateTime } object", () => {
    const formats = { date: "YYYY-MM-DD", time: "HH:mm", dateTime: "YYYY-MM-DD HH:mm" };
    expect(plain(formatTableCellValues(CELL_TYPE.CURRENCY, { value: 1234567.5 }, formats))).toBe("₹12,34,567.50");
    expect(formatTableCellValues(CELL_TYPE.DATE, { date: "2024-03-05" }, formats)).toBe("2024-03-05");
  });

  it("does not crash a row whose currency code is bad", () => {
    expect(() =>
      formatTableCellValues(CELL_TYPE.CURRENCY, { value: 5, currency: "rupees" })
    ).not.toThrow();
  });
});

describe("<TableCell> — regional settings", () => {
  it("reads locale and currency from the provider", () => {
    render(
      <NoviqUIConfigProvider config={{ formats: { locale: "en-US", currency: "USD" } }}>
        <TableCell type={CELL_TYPE.CURRENCY} options={{ value: 1234567.5 }} />
      </NoviqUIConfigProvider>
    );
    expect(screen.getByText("$1,234,567.50")).toBeInTheDocument();
  });
});

describe("buildActiveFilter — month chip", () => {
  const month = { id: "period", label: "Period", type: FILTER_TYPE.MONTH };

  it("is English by default", () => {
    expect(buildActiveFilter(month, "2024-03")?.displayValue).toBe("March 2024");
  });

  it("is written in the configured language", () => {
    const formats = resolveFormats({ locale: "de-DE" });
    expect(buildActiveFilter(month, "2024-03", formats)?.displayValue).toBe("März 2024");
  });

  it("writes date-range chips with the language's names too", () => {
    const formats = resolveFormats({ locale: "fr-FR", date: "D MMMM YYYY" });
    const range = { id: "when", label: "When", type: FILTER_TYPE.DATE_RANGE };
    expect(buildActiveFilter(range, { from: "2024-03-05", to: "2024-04-01" }, formats)?.displayValue).toBe(
      "5 mars 2024 → 1 avril 2024"
    );
  });
});
