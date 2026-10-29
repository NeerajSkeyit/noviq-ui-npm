import React from "react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Table, { type TableColumn } from "./Table";
import { NoviqUIConfigProvider } from "../../config/NoviqUIConfigProvider";
import { CELL_TYPE, STATUS_CLASS } from "../../constants";
import type { NoviqUIStatusConfig } from "../../config/types";

const aoaToSheet = vi.fn((aoa: unknown[][]) => ({ __aoa: aoa }) as any);
vi.mock("xlsx-js-style", () => ({
  utils: {
    aoa_to_sheet: (aoa: unknown[][]) => aoaToSheet(aoa),
    encode_cell: ({ r, c }: { r: number; c: number }) => `cell-${r}-${c}`,
    book_new: () => ({}),
    book_append_sheet: () => undefined,
    sheet_to_csv: () => "",
  },
  writeFile: () => undefined,
}));

interface Order {
  id: number;
  name: string;
  approval: string;
  payment: string;
}
const orders: Order[] = [
  { id: 1, name: "Alpha", approval: "pending", payment: "pending" },
  { id: 2, name: "Bravo", approval: "approved", payment: "shipped" },
  { id: 3, name: "Charlie", approval: "draft", payment: "paid" },
];
const columns: TableColumn<Order>[] = [
  { id: "name", heading: "Name", accessorKey: "name" },
  { id: "approval", heading: "Approval", accessorKey: "approval", type: CELL_TYPE.STATUS },
];

afterEach(() => {
  window.localStorage.clear();
  aoaToSheet.mockClear();
});

/** The pill in a row's column, by the row's name. */
const pillIn = (name: string, heading: string) => {
  const row = screen.getByText(name).closest("tr") as HTMLElement;
  const index = screen.getAllByRole("columnheader").findIndex((h) => h.textContent === heading);
  return within(row).getAllByRole("cell")[index].querySelector(".nq-badge") as HTMLElement;
};

function renderTable(props: Partial<React.ComponentProps<typeof Table<Order>>> = {}, config?: { statuses?: NoviqUIStatusConfig }) {
  const table = <Table columns={columns} preFetchedData={orders} isPaginationHidden isColumnSettingHidden {...props} />;
  return render(config ? <NoviqUIConfigProvider config={config}>{table}</NoviqUIConfigProvider> : table);
}

describe("<Table> status cells", () => {
  it("unconfigured: the built-in tones", () => {
    renderTable();
    expect(pillIn("Alpha", "Approval")).toHaveClass(STATUS_CLASS.WARNING);
    expect(pillIn("Bravo", "Approval")).toHaveClass(STATUS_CLASS.SUCCESS);
    expect(pillIn("Charlie", "Approval")).toHaveClass(STATUS_CLASS.DEFAULT);
  });

  it("the provider's statuses apply, and add to the built-in ones", () => {
    renderTable({}, { statuses: { styles: { draft: "p-draft" } } });
    expect(pillIn("Charlie", "Approval")).toHaveClass("p-draft");
    expect(pillIn("Alpha", "Approval")).toHaveClass(STATUS_CLASS.WARNING); // untouched
  });

  it("the table's own statuses win over the provider's", () => {
    renderTable(
      { statuses: { styles: { draft: "t-draft" } } },
      { statuses: { styles: { draft: "p-draft", pending: "p-wait" } } }
    );
    expect(pillIn("Charlie", "Approval")).toHaveClass("t-draft");
    expect(pillIn("Alpha", "Approval")).toHaveClass("p-wait"); // the provider's still applies where the table is silent
  });

  it("a column's statuses win over the table's: two status columns, two vocabularies", () => {
    const two: TableColumn<Order>[] = [
      { id: "name", heading: "Name", accessorKey: "name" },
      { id: "approval", heading: "Approval", accessorKey: "approval", type: CELL_TYPE.STATUS, statuses: { styles: { pending: "approval-wait" } } },
      { id: "payment", heading: "Payment", accessorKey: "payment", type: CELL_TYPE.STATUS, statuses: { styles: { pending: "payment-wait", paid: "payment-ok" } } },
    ];
    renderTable({ columns: two, statuses: { styles: { pending: "table-wait" } } });
    expect(pillIn("Alpha", "Approval")).toHaveClass("approval-wait");
    expect(pillIn("Alpha", "Payment")).toHaveClass("payment-wait");
    expect(pillIn("Charlie", "Payment")).toHaveClass("payment-ok");
  });

  it("follows a change of statuses on a later render", () => {
    const table = (statuses: NoviqUIStatusConfig) => (
      <Table columns={columns} preFetchedData={orders} isPaginationHidden isColumnSettingHidden statuses={statuses} />
    );
    const { rerender } = render(table({ styles: { draft: "first" } }));
    expect(pillIn("Charlie", "Approval")).toHaveClass("first");
    rerender(table({ styles: { draft: "second" } }));
    expect(pillIn("Charlie", "Approval")).toHaveClass("second");
    rerender(table({ render: ({ label }) => <b data-testid="late">{label}</b> }));
    expect(screen.getAllByTestId("late")).toHaveLength(3);
  });

  it("follows a change of the provider's statuses", () => {
    const tree = (statuses: NoviqUIStatusConfig) => (
      <NoviqUIConfigProvider config={{ statuses }}>
        <Table columns={columns} preFetchedData={orders} isPaginationHidden isColumnSettingHidden />
      </NoviqUIConfigProvider>
    );
    const { rerender } = render(tree({ styles: { draft: "one" } }));
    expect(pillIn("Charlie", "Approval")).toHaveClass("one");
    rerender(tree({ styles: { draft: "two" } }));
    expect(pillIn("Charlie", "Approval")).toHaveClass("two");
  });

  it("the old statusVariantMap prop still works, and statuses beats it", () => {
    renderTable({ statusVariantMap: { draft: "old-draft", pending: "old-wait" }, statuses: { styles: { pending: "new-wait" } } });
    expect(pillIn("Charlie", "Approval")).toHaveClass("old-draft");
    expect(pillIn("Alpha", "Approval")).toHaveClass("new-wait");
  });

  it("a render draws the pill and gets the row", () => {
    renderTable({
      statuses: { render: ({ label, row }) => <b data-testid="mine">{`${label}@${(row as Order).name}`}</b> },
    });
    expect(screen.getAllByTestId("mine").map((n) => n.textContent)).toEqual([
      "pending@Alpha",
      "approved@Bravo",
      "draft@Charlie",
    ]);
  });

  it("a render on the provider reaches a table, and a column's own render replaces it", () => {
    const two: TableColumn<Order>[] = [
      { id: "name", heading: "Name", accessorKey: "name" },
      { id: "approval", heading: "Approval", accessorKey: "approval", type: CELL_TYPE.STATUS },
      { id: "payment", heading: "Payment", accessorKey: "payment", type: CELL_TYPE.STATUS, statuses: { render: ({ label }) => <u data-testid="col">{label}</u> } },
    ];
    renderTable({ columns: two }, { statuses: { render: ({ label }) => <i data-testid="prov">{label}</i> } });
    expect(screen.getAllByTestId("prov")).toHaveLength(3);
    expect(screen.getAllByTestId("col")).toHaveLength(3);
  });

  it("a nested provider replaces the statuses; with `inherit` it adds to them", () => {
    const table = <Table columns={columns} preFetchedData={orders} isPaginationHidden isColumnSettingHidden />;
    const { unmount } = render(
      <NoviqUIConfigProvider config={{ statuses: { styles: { draft: "outer", pending: "outer-wait" } } }}>
        <NoviqUIConfigProvider config={{ statuses: { styles: { draft: "inner" } } }}>{table}</NoviqUIConfigProvider>
      </NoviqUIConfigProvider>
    );
    expect(pillIn("Charlie", "Approval")).toHaveClass("inner");
    expect(pillIn("Alpha", "Approval")).toHaveClass(STATUS_CLASS.WARNING); // `outer-wait` was replaced, not inherited
    unmount();

    render(
      <NoviqUIConfigProvider config={{ statuses: { styles: { draft: "outer", pending: "outer-wait" } } }}>
        <NoviqUIConfigProvider inherit config={{ statuses: { styles: { draft: "inner" } } }}>
          {table}
        </NoviqUIConfigProvider>
      </NoviqUIConfigProvider>
    );
    expect(pillIn("Charlie", "Approval")).toHaveClass("inner");
    expect(pillIn("Alpha", "Approval")).toHaveClass("outer-wait");
  });
});

describe("a status label you set is what is exported and searched", () => {
  const statuses: NoviqUIStatusConfig = { styles: { pending: { label: "Awaiting review" } } };

  it("shows it", () => {
    renderTable({ statuses });
    expect(pillIn("Alpha", "Approval")).toHaveTextContent("Awaiting review");
    expect(pillIn("Alpha", "Approval")).toHaveClass(STATUS_CLASS.WARNING); // a label alone keeps the tone
  });

  it("exports it, from the provider, the table or the column", async () => {
    const user = userEvent.setup();
    const viaColumn: TableColumn<Order>[] = [
      columns[0],
      { ...columns[1], statuses: { styles: { approved: { label: "OK'd" } } } },
    ];
    renderTable({ columns: viaColumn, statuses }, { statuses: { styles: { draft: { label: "Not sent" } } } });
    await user.click(screen.getByRole("button", { name: /Export/ }));
    await user.click(screen.getByText("Export as Excel"));
    await waitFor(() => expect(aoaToSheet).toHaveBeenCalled());
    expect(aoaToSheet.mock.calls[0][0].slice(1).map((r: unknown[]) => r[1])).toEqual(["Awaiting review", "OK'd", "Not sent"]);
  });

  it("searches it: typing the label finds the row", async () => {
    const user = userEvent.setup();
    renderTable({ statuses });
    await user.type(screen.getByPlaceholderText("Search..."), "awaiting");
    await waitFor(() => expect(screen.queryByText("Bravo")).not.toBeInTheDocument(), { timeout: 2500 });
    expect(screen.getByText("Alpha")).toBeInTheDocument();
  });

  it("an unconfigured table still searches the built-in label", async () => {
    const user = userEvent.setup();
    renderTable();
    await user.type(screen.getByPlaceholderText("Search..."), "approved");
    await waitFor(() => expect(screen.queryByText("Alpha")).not.toBeInTheDocument(), { timeout: 2500 });
    expect(screen.getByText("Bravo")).toBeInTheDocument();
  });
});
