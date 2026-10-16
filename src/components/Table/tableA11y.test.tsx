import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Table, { type TableColumn } from "./Table";
import Checkbox from "../Checkbox/Checkbox";
import { NoviqUIConfigProvider } from "../../config/NoviqUIConfigProvider";

interface Row {
  id: number;
  name: string;
}
const rows: Row[] = [
  { id: 1, name: "Charlie" },
  { id: 2, name: "Alice" },
  { id: 3, name: "Bob" },
];
const columns: TableColumn<Row>[] = [
  { id: "name", heading: "Name", accessorKey: "name", sortable: true },
  { id: "id", heading: "Id", accessorKey: "id", sortable: true },
  { id: "plain", heading: "Plain", accessorKey: "name" },
];
const header = (name: string) => screen.getAllByRole("columnheader").find((h) => h.textContent === name)!;
const names = () =>
  screen
    .getAllByRole("row")
    .slice(1)
    .map((r) => within(r).getAllByRole("cell")[0].textContent);

describe("sortable headers", () => {
  it("say how they are sorted", async () => {
    const user = userEvent.setup();
    render(<Table columns={columns} preFetchedData={rows} isPaginationHidden />);
    expect(header("Name")).toHaveAttribute("aria-sort", "none");
    expect(header("Id")).toHaveAttribute("aria-sort", "none");

    await user.click(header("Name"));
    expect(header("Name")).toHaveAttribute("aria-sort", "ascending");
    expect(header("Id")).toHaveAttribute("aria-sort", "none");
    await user.click(header("Name"));
    expect(header("Name")).toHaveAttribute("aria-sort", "descending");
    await user.click(header("Name"));
    expect(header("Name")).toHaveAttribute("aria-sort", "none");
  });

  it("are reachable by keyboard and sort on Enter and Space", async () => {
    const user = userEvent.setup();
    render(<Table columns={columns} preFetchedData={rows} isPaginationHidden />);
    expect(header("Name")).toHaveAttribute("tabindex", "0");

    header("Name").focus();
    await user.keyboard("{Enter}");
    expect(names()).toEqual(["Alice", "Bob", "Charlie"]);
    await user.keyboard(" ");
    expect(names()).toEqual(["Charlie", "Bob", "Alice"]);
    expect(header("Name")).toHaveAttribute("aria-sort", "descending");
  });

  it("other keys do nothing", async () => {
    const user = userEvent.setup();
    render(<Table columns={columns} preFetchedData={rows} isPaginationHidden />);
    header("Name").focus();
    await user.keyboard("a{Tab}{Escape}");
    expect(names()).toEqual(["Charlie", "Alice", "Bob"]);
  });

  it("a column that is not sortable is plain: no sort state, not a tab stop, no key handling", async () => {
    const user = userEvent.setup();
    render(<Table columns={columns} preFetchedData={rows} isPaginationHidden />);
    expect(header("Plain")).not.toHaveAttribute("aria-sort");
    expect(header("Plain")).not.toHaveAttribute("tabindex");
    header("Plain").focus();
    await user.keyboard("{Enter}");
    expect(names()).toEqual(["Charlie", "Alice", "Bob"]);
  });

  it("Space does not scroll the page", async () => {
    render(<Table columns={columns} preFetchedData={rows} isPaginationHidden />);
    const event = new KeyboardEvent("keydown", { key: " ", bubbles: true, cancelable: true });
    header("Name").dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
  });
});

describe("selection checkboxes have names", () => {
  it("the header box selects all rows and each row box selects its row", () => {
    render(<Table columns={columns} preFetchedData={rows} isPaginationHidden getRowId={(r) => String(r.id)} />);
    expect(screen.getByRole("checkbox", { name: "Select all rows" })).toBeInTheDocument();
    expect(screen.getAllByRole("checkbox", { name: "Select row" })).toHaveLength(3);
  });

  it("in the configured text", () => {
    render(
      <NoviqUIConfigProvider config={{ text: { tableSelectAll: "Seleccionar todo", tableSelectRow: "Seleccionar fila" } }}>
        <Table columns={columns} preFetchedData={rows} isPaginationHidden getRowId={(r) => String(r.id)} />
      </NoviqUIConfigProvider>
    );
    expect(screen.getByRole("checkbox", { name: "Seleccionar todo" })).toBeInTheDocument();
    expect(screen.getAllByRole("checkbox", { name: "Seleccionar fila" })).toHaveLength(3);
  });

  it("naming them did not change how they work", async () => {
    const user = userEvent.setup();
    const onRowSelectionChange = vi.fn();
    render(
      <Table columns={columns} preFetchedData={rows} isPaginationHidden getRowId={(r) => String(r.id)} onRowSelectionChange={onRowSelectionChange} />
    );
    await user.click(screen.getByRole("checkbox", { name: "Select all rows" }));
    expect(onRowSelectionChange).toHaveBeenLastCalledWith(["1", "2", "3"]);
  });
});

describe("<Checkbox aria-label>", () => {
  it("names the visible checkbox, not the hidden native input", () => {
    render(<Checkbox checked={false} onChange={() => {}} aria-label="Accept terms" />);
    expect(screen.getByRole("checkbox", { name: "Accept terms" })).toBeInTheDocument();
    expect(screen.getAllByRole("checkbox")).toHaveLength(1); // the native one is hidden
  });

  it("is unchanged without it", () => {
    render(<Checkbox checked onChange={() => {}} />);
    expect(screen.getByRole("checkbox")).not.toHaveAttribute("aria-label");
  });
});
