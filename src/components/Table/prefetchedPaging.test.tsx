import React from "react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Table, { type TableColumn } from "./Table";
import { CELL_TYPE, NO_TEXT_PLACEHOLDER } from "../../constants";
import type { ResponseFormatPaths } from "../../config/types";

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

interface Person {
  id: number;
  name: string;
  joined: string;
  status: string;
}

// 25 rows. Even ids are "Alpha NN" (12 of them), odd ids are "Beta NN" (13).
const people: Person[] = Array.from({ length: 25 }, (_, i) => {
  const id = i + 1;
  const nn = String(id).padStart(2, "0");
  return {
    id,
    name: id % 2 === 0 ? `Alpha ${nn}` : `Beta ${nn}`,
    joined: id === 1 ? "2024-03-05" : "2024-04-10",
    status: id === 3 ? "in_progress" : "active",
  };
});

const columns: TableColumn<Person>[] = [
  { id: "name", heading: "Name", accessorKey: "name", sortable: true },
  { id: "joined", heading: "Joined", accessorKey: "joined", type: CELL_TYPE.DATE },
  { id: "status", heading: "Status", accessorKey: "status", type: CELL_TYPE.STATUS },
];

const names = () =>
  screen
    .getAllByRole("row")
    .slice(1)
    .map((row) => within(row).getAllByRole("cell")[0].textContent);
const pager = () => document.querySelector(".nq-table-pagination")?.textContent ?? "";
const pagerButtons = () => Array.from(document.querySelectorAll<HTMLButtonElement>(".nq-table-pagination-controls button"));
const [FIRST, PREVIOUS, NEXT, LAST] = [0, 1, 2, 3];
const searchBox = () => screen.getByPlaceholderText("Search...");
const settled = { timeout: 2500 };

afterEach(() => {
  window.localStorage.clear();
  aoaToSheet.mockClear();
});

describe("<Table preFetchedData> — paging", () => {
  it("shows one page of rows, as the pager says", () => {
    render(<Table columns={columns} preFetchedData={people} />);
    expect(names()).toHaveLength(10);
    expect(names()[0]).toBe("Beta 01");
    expect(pager()).toContain("Showing 1 to 10 of 25 results");
  });

  it("moves through the pages", async () => {
    const user = userEvent.setup();
    render(<Table columns={columns} preFetchedData={people} />);

    await user.click(pagerButtons()[NEXT]);
    expect(names()[0]).toBe("Beta 11");
    expect(names()).toHaveLength(10);
    expect(pager()).toContain("Showing 11 to 20 of 25 results");

    await user.click(pagerButtons()[LAST]);
    expect(names()).toEqual(["Beta 21", "Alpha 22", "Beta 23", "Alpha 24", "Beta 25"]);
    expect(pager()).toContain("Page 3 of 3");

    await user.click(pagerButtons()[FIRST]);
    expect(names()[0]).toBe("Beta 01");
    await user.click(pagerButtons()[NEXT]);
    await user.click(pagerButtons()[PREVIOUS]);
    expect(names()[0]).toBe("Beta 01");
  });

  it("shows every row when the pager is hidden", () => {
    render(<Table columns={columns} preFetchedData={people} isPaginationHidden />);
    expect(names()).toHaveLength(25);
  });

  it("starts at the first of pageSizeOptions", () => {
    render(<Table columns={columns} preFetchedData={people} pageSizeOptions={[5, 10]} />);
    expect(names()).toHaveLength(5);
  });

  it("sorts all the rows, then pages them", async () => {
    const user = userEvent.setup();
    render(<Table columns={columns} preFetchedData={people} />);
    const nameHeader = screen.getAllByRole("columnheader").find((h) => h.textContent === "Name")!;

    await user.click(nameHeader); // ascending: Alpha 02 … Alpha 24, then Beta
    expect(names()[0]).toBe("Alpha 02");
    await user.click(nameHeader); // descending: Beta 25 first
    expect(names()[0]).toBe("Beta 25");
    expect(names()).toHaveLength(10);
  });

  it("falls back to the last page when the rows shrink under it", async () => {
    const user = userEvent.setup();
    const { rerender } = render(<Table columns={columns} preFetchedData={people} />);
    await user.click(pagerButtons()[LAST]); // page 3

    rerender(<Table columns={columns} preFetchedData={people.slice(0, 12)} />);
    expect(names()).toEqual(["Beta 11", "Alpha 12"]);
    expect(pager()).toContain("Page 2 of 2");
  });

  it("numbers row actions from the start of the list, not of the page", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(
      <Table
        columns={columns}
        preFetchedData={people}
        rowActions={() => [{ label: "Open", type: "button", onClick }]}
      />
    );
    await user.click(pagerButtons()[NEXT]);
    await user.click(screen.getAllByRole("button", { name: "Open" })[0]);
    expect(onClick).toHaveBeenCalledWith(
      expect.objectContaining({ row: people[10], rowIndex: 0, sn: 11 })
    );
  });

  it("numbers row actions by the page that is actually shown when the rows shrank", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    const rowActions = () => [{ label: "Open", type: "button" as const, onClick }];
    const { rerender } = render(<Table columns={columns} preFetchedData={people} rowActions={rowActions} />);
    await user.click(pagerButtons()[LAST]); // page 3

    rerender(<Table columns={columns} preFetchedData={people.slice(0, 12)} rowActions={rowActions} />);
    await user.click(screen.getAllByRole("button", { name: "Open" })[0]); // first row of page 2
    expect(onClick).toHaveBeenCalledWith(expect.objectContaining({ row: people[10], sn: 11 }));
  });

  it("select-all picks the rows on the page, like a server-paged table", async () => {
    const user = userEvent.setup();
    const onRowSelectionChange = vi.fn();
    render(
      <Table
        columns={columns}
        preFetchedData={people}
        getRowId={(row) => String(row.id)}
        onRowSelectionChange={onRowSelectionChange}
      />
    );
    await user.click(screen.getAllByRole("checkbox")[0]);
    expect(screen.getByText("10 rows selected")).toBeInTheDocument();
    expect(onRowSelectionChange).toHaveBeenLastCalledWith(["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"]);
  });
});

describe("<Table preFetchedData> — search", () => {
  it("filters the rows by what the columns show, ignoring case", async () => {
    const user = userEvent.setup();
    render(<Table columns={columns} preFetchedData={people} />);

    await user.type(searchBox(), "ALPHA");
    await waitFor(() => expect(pager()).toContain("of 12 results"), settled);
    expect(names().every((n) => n?.startsWith("Alpha"))).toBe(true);
    expect(pager()).toContain("Showing 1 to 10 of 12 results");

    await user.click(pagerButtons()[NEXT]);
    expect(names()).toEqual(["Alpha 22", "Alpha 24"]);
  });

  it("matches a date as it is displayed", async () => {
    const user = userEvent.setup();
    render(<Table columns={columns} preFetchedData={people} isPaginationHidden />);
    await user.type(searchBox(), "05/03");
    await waitFor(() => expect(names()).toEqual(["Beta 01"]), settled);
  });

  it("matches a status as its label reads", async () => {
    const user = userEvent.setup();
    render(<Table columns={columns} preFetchedData={people} isPaginationHidden />);
    await user.type(searchBox(), "in progress");
    await waitFor(() => expect(names()).toEqual(["Beta 03"]), settled);
  });

  it("says so when nothing matches, and restores the rows when cleared", async () => {
    const user = userEvent.setup();
    render(<Table columns={columns} preFetchedData={people} isPaginationHidden />);

    await user.type(searchBox(), "zzz");
    await waitFor(() => expect(screen.getByText("No data found")).toBeInTheDocument(), settled);

    await user.clear(searchBox());
    await waitFor(() => expect(names()).toHaveLength(25), settled);
  });

  it("does not match a column that is hidden", async () => {
    const user = userEvent.setup();
    const withHiddenStatus = columns.map((c) => (c.id === "status" ? { ...c, visible: false } : c));
    render(<Table columns={withHiddenStatus} preFetchedData={people} isPaginationHidden />);
    await user.type(searchBox(), "in progress");
    await waitFor(() => expect(screen.getByText("No data found")).toBeInTheDocument(), settled);
  });

  it("does not match the placeholder shown for an empty cell", async () => {
    const user = userEvent.setup();
    const gaps = people.slice(0, 4).map((p) => (p.id === 2 ? { ...p, joined: "" } : p));
    render(<Table columns={columns} preFetchedData={gaps} isPaginationHidden />);
    expect(within(screen.getAllByRole("row")[2]).getAllByRole("cell")[1]).toHaveTextContent(
      NO_TEXT_PLACEHOLDER
    );

    await user.type(searchBox(), NO_TEXT_PLACEHOLDER);
    await waitFor(() => expect(screen.getByText("No data found")).toBeInTheDocument(), settled);
  });

  it("goes back to the first page", async () => {
    const user = userEvent.setup();
    render(<Table columns={columns} preFetchedData={people} />);
    await user.click(pagerButtons()[NEXT]);
    expect(names()[0]).toBe("Beta 11");

    await user.type(searchBox(), "beta");
    await waitFor(() => expect(pager()).toContain("Showing 1 to 10 of 13 results"), settled);
    expect(names()[0]).toBe("Beta 01");
  });

  it("is not applied to an apiFunction table — the server did the searching", async () => {
    const user = userEvent.setup();
    const format: ResponseFormatPaths = { rowsPath: "result", totalPath: "totalCount" };
    const served = people.slice(0, 2);
    const apiFunction = vi.fn().mockResolvedValue({ result: served, totalCount: 2 });
    render(<Table columns={columns} apiFunction={apiFunction} responseFormat={format} />);
    await waitFor(() => expect(names()).toHaveLength(2));

    await user.type(searchBox(), "zzz");
    await waitFor(
      () => expect(apiFunction).toHaveBeenLastCalledWith(expect.objectContaining({ search: "zzz" })),
      settled
    );
    // Whatever the server sent back is what shows — nothing is filtered a second time here.
    await waitFor(() => expect(names()).toEqual(["Beta 01", "Alpha 02"]));
  });

  it("exports every searched row, not just the page on screen", async () => {
    const user = userEvent.setup();
    render(<Table columns={columns} preFetchedData={people} />);
    await user.type(searchBox(), "alpha");
    await waitFor(() => expect(pager()).toContain("of 12 results"), settled);
    expect(names()).toHaveLength(10);

    await user.click(screen.getByRole("button", { name: /Export/ }));
    await user.click(screen.getByText("Export as Excel"));

    await waitFor(() => expect(aoaToSheet).toHaveBeenCalled());
    const aoa = aoaToSheet.mock.calls[0][0];
    expect(aoa).toHaveLength(1 + 12); // header + every Alpha row
    expect(aoa.slice(1).every((row) => String(row[0]).startsWith("Alpha"))).toBe(true);
  });
});
