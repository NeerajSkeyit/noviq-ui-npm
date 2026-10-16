import React from "react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Table, { type TableColumn } from "./Table";
import { NoviqUIConfigProvider } from "../../config/NoviqUIConfigProvider";
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

const FORMAT: ResponseFormatPaths = { rowsPath: "result", totalPath: "totalCount" };

interface Person {
  id: number;
  name: string;
  joined: string;
}
// Deliberately NOT in alphabetical order: a client-side sort would visibly reorder them.
const served: Person[] = [
  { id: 1, name: "Charlie", joined: "2024-03-01" },
  { id: 2, name: "Alice", joined: "2024-01-01" },
  { id: 3, name: "Bob", joined: "2024-02-01" },
];

const columns: TableColumn<Person>[] = [
  { id: "fullName", heading: "Name", accessorKey: "name", sortable: true }, // id ≠ accessorKey
  { id: "joined", heading: "Joined", accessorKey: "joined", sortable: true, sortKey: "joined_at" },
  { id: "who", heading: "Who", sortable: true }, // no accessorKey, no sortKey → the id
  { id: "plain", heading: "Plain", accessorKey: "id" }, // not sortable
];

const apiFunction = vi.fn();
const header = (name: string) => screen.getAllByRole("columnheader").find((h) => h.textContent === name)!;
const names = () =>
  screen
    .getAllByRole("row")
    .slice(1)
    .map((r) => within(r).getAllByRole("cell")[0].textContent);
const lastParams = () => apiFunction.mock.lastCall?.[0] as Record<string, unknown>;

afterEach(() => {
  apiFunction.mockReset();
  aoaToSheet.mockClear();
  window.localStorage.clear();
});

function renderTable(props: Partial<React.ComponentProps<typeof Table<Person>>> = {}, config = {}) {
  apiFunction.mockResolvedValue({ result: served, totalCount: 25 });
  return render(
    <NoviqUIConfigProvider config={{ table: { responseFormat: FORMAT, ...config } }}>
      <Table columns={columns} apiFunction={apiFunction} {...props} />
    </NoviqUIConfigProvider>
  );
}
const loaded = () => waitFor(() => expect(names()).toEqual(["Charlie", "Alice", "Bob"]));

describe("<Table serverSort>", () => {
  it("sends no sort on the first load", async () => {
    renderTable({ serverSort: true });
    await loaded();
    expect(lastParams()).not.toHaveProperty("sort_by");
    expect(lastParams()).not.toHaveProperty("sort_order");
  });

  it("asks the server to sort — asc, then desc, then not at all — and shows the rows as served", async () => {
    const user = userEvent.setup();
    renderTable({ serverSort: true });
    await loaded();
    const calls = apiFunction.mock.calls.length;

    await user.click(header("Name"));
    await waitFor(() => expect(lastParams()).toMatchObject({ sort_by: "name", sort_order: "asc" }));
    expect(apiFunction.mock.calls.length).toBe(calls + 1);
    await loaded(); // not re-sorted here: the server decides the order

    await user.click(header("Name"));
    await waitFor(() => expect(lastParams()).toMatchObject({ sort_by: "name", sort_order: "desc" }));

    await user.click(header("Name"));
    await waitFor(() => expect(lastParams()).not.toHaveProperty("sort_by"));
    expect(lastParams()).not.toHaveProperty("sort_order");
  });

  it("starts a newly clicked column at ascending", async () => {
    const user = userEvent.setup();
    renderTable({ serverSort: true });
    await loaded();
    await user.click(header("Name"));
    await user.click(header("Name")); // desc
    await user.click(header("Joined"));
    await waitFor(() => expect(lastParams()).toMatchObject({ sort_by: "joined_at", sort_order: "asc" }));
  });

  it("names the sort field with sortKey, else accessorKey, else the column id", async () => {
    const user = userEvent.setup();
    renderTable({ serverSort: true });
    await loaded();

    await user.click(header("Joined"));
    await waitFor(() => expect(lastParams()).toMatchObject({ sort_by: "joined_at" }));
    await user.click(header("Who"));
    await waitFor(() => expect(lastParams()).toMatchObject({ sort_by: "who" }));
    await user.click(header("Name"));
    await waitFor(() => expect(lastParams()).toMatchObject({ sort_by: "name" }));
  });

  it("does not sort a column that is not sortable", async () => {
    const user = userEvent.setup();
    renderTable({ serverSort: true });
    await loaded();
    const calls = apiFunction.mock.calls.length;
    await user.click(header("Plain"));
    expect(apiFunction.mock.calls.length).toBe(calls);
  });

  it("uses the parameter names the app configured", async () => {
    const user = userEvent.setup();
    renderTable({ serverSort: true }, { requestParams: { sortBy: "orderBy", sortDirection: "dir" } });
    await loaded();
    await user.click(header("Name"));
    await waitFor(() => expect(lastParams()).toMatchObject({ orderBy: "name", dir: "asc" }));
    expect(lastParams()).not.toHaveProperty("sort_by");
  });

  it("a table sorted before anything is typed does not bounce a user who has paged on", async () => {
    // Regression: the search debounce used to reset to page 1 half a second after mount.
    const user = userEvent.setup();
    renderTable({ serverSort: true });
    await loaded();
    await user.click(document.querySelectorAll(".nq-table-pagination-controls button")[2]);
    await waitFor(() => expect(lastParams()).toMatchObject({ page_no: 2 }));
    await new Promise((resolve) => setTimeout(resolve, 700)); // past the debounce
    expect(lastParams()).toMatchObject({ page_no: 2 });
  });

  it("goes back to page 1 when the sort changes", async () => {
    const user = userEvent.setup();
    renderTable({ serverSort: true });
    await loaded();
    await user.click(document.querySelectorAll(".nq-table-pagination-controls button")[2]); // next page
    await waitFor(() => expect(lastParams()).toMatchObject({ page_no: 2 }));

    await user.click(header("Name"));
    await waitFor(() => expect(lastParams()).toMatchObject({ page_no: 1, sort_by: "name" }));
  });

  it("keeps the search, filters and page size on the sorted request", async () => {
    const user = userEvent.setup();
    renderTable({ serverSort: true, apiParams: { tenant: "acme" } });
    await loaded();
    await user.click(header("Name"));
    await waitFor(() => expect(lastParams()).toMatchObject({ tenant: "acme", sort_by: "name", rows_per_page: 10 }));
  });

  it("export asks for the same order the screen shows", async () => {
    const user = userEvent.setup();
    renderTable({ serverSort: true });
    await loaded();
    await user.click(header("Name"));
    await waitFor(() => expect(lastParams()).toMatchObject({ sort_by: "name" }));

    apiFunction.mockClear();
    await user.click(screen.getByRole("button", { name: /Export/ }));
    await user.click(screen.getByText("Export as Excel"));
    await waitFor(() => expect(aoaToSheet).toHaveBeenCalled());
    expect(lastParams()).toMatchObject({ sort_by: "name", sort_order: "asc", page_no: 1 });
  });
});

describe("<Table> without serverSort, and with preFetchedData", () => {
  it("still sorts the loaded page on the client and does not call the server", async () => {
    const user = userEvent.setup();
    renderTable();
    await loaded();
    const calls = apiFunction.mock.calls.length;

    await user.click(header("Name"));
    expect(names()).toEqual(["Alice", "Bob", "Charlie"]);
    expect(apiFunction.mock.calls.length).toBe(calls);
  });

  it("serverSort is ignored for preFetchedData: the rows are sorted here", async () => {
    const user = userEvent.setup();
    render(<Table columns={columns} preFetchedData={served} isPaginationHidden serverSort />);
    await user.click(header("Name"));
    expect(names()).toEqual(["Alice", "Bob", "Charlie"]);
  });
});
