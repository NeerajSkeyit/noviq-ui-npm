import React from "react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, waitFor, within, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Table, { type TableColumn } from "./Table";
import { NoviqUIConfigProvider } from "../../config/NoviqUIConfigProvider";
import { FILTER_TYPE } from "../../constants";
import type { FilterConfig } from "./buildActiveFilter";

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
  dept: string;
  joined: string;
}
const people: Person[] = [
  { id: 1, name: "Alice", dept: "eng", joined: "2024-01-10" },
  { id: 2, name: "Bob", dept: "sales", joined: "2024-02-20" },
  { id: 3, name: "Carol", dept: "eng", joined: "2024-03-05" },
  { id: 4, name: "Dan", dept: "ops", joined: "2024-03-31T18:00:00" },
  { id: 5, name: "Erin", dept: "sales", joined: "2024-04-02" },
];
const columns: TableColumn<Person>[] = [
  { id: "name", heading: "Name", accessorKey: "name" },
  { id: "dept", heading: "Dept", accessorKey: "dept" },
  { id: "joined", heading: "Joined", accessorKey: "joined" },
];
const deptFilter: FilterConfig = {
  id: "dept",
  label: "Department",
  type: FILTER_TYPE.SELECT,
  options: [
    { value: "eng", label: "Engineering" },
    { value: "sales", label: "Sales" },
    { value: "ops", label: "Operations" },
  ],
};
const joinedFilter: FilterConfig = { id: "joined", label: "Joined", type: FILTER_TYPE.DATE_RANGE };

const names = () =>
  screen
    .getAllByRole("row")
    .slice(1)
    .map((r) => within(r).getAllByRole("cell")[0].textContent)
    .filter((n) => n && n !== "No data found");
const drawer = () => within(document.querySelector(".nq-drawer-content.nq-drawer-open") as HTMLElement);
const pager = () => document.querySelector(".nq-table-pagination-left")?.textContent?.trim() ?? "";

afterEach(() => {
  window.localStorage.clear();
  aoaToSheet.mockClear();
});

function renderTable(filters: FilterConfig[], extra: Partial<React.ComponentProps<typeof Table<Person>>> = {}) {
  return render(
    <Table
      columns={columns}
      preFetchedData={people}
      filterConfigs={filters}
      isPaginationHidden
      isColumnSettingHidden
      {...extra}
    />
  );
}

async function openFilters(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("button", { name: /^Filters/ }));
}
const apply = (user: ReturnType<typeof userEvent.setup>) => user.click(drawer().getByRole("button", { name: "Apply" }));
/** Ticks a select option: its checkbox, not the label beside it. */
const choose = (user: ReturnType<typeof userEvent.setup>, label: string) => {
  const row = drawer().getByText(label).closest(".nq-filter-drawer-option") as HTMLElement;
  return user.click(within(row).getByRole("checkbox"));
};

describe("<Table preFetchedData filterConfigs> filters the rows it was handed", () => {
  it("a select filter narrows the rows, and a chip says so", async () => {
    const user = userEvent.setup();
    renderTable([deptFilter]);
    expect(names()).toHaveLength(5);

    await openFilters(user);
    await choose(user, "Engineering");
    await apply(user);

    expect(names()).toEqual(["Alice", "Carol"]);
    expect(screen.getByRole("button", { name: /Department: Engineering/ })).toBeInTheDocument();
  });

  it("several options widen it (any of them)", async () => {
    const user = userEvent.setup();
    renderTable([deptFilter]);
    await openFilters(user);
    await choose(user, "Engineering");
    await choose(user, "Operations");
    await apply(user);
    expect(names()).toEqual(["Alice", "Carol", "Dan"]);
  });

  it("removing the chip brings the rows back", async () => {
    const user = userEvent.setup();
    renderTable([deptFilter]);
    await openFilters(user);
    await choose(user, "Sales");
    await apply(user);
    expect(names()).toEqual(["Bob", "Erin"]);

    await user.click(screen.getByRole("button", { name: "Remove Department filter" }));
    expect(names()).toHaveLength(5);
  });

  it("a date range keeps both ends, down to a time on the last day", async () => {
    const user = userEvent.setup();
    renderTable([joinedFilter]);
    await openFilters(user);
    const [from, to] = Array.from(document.querySelectorAll<HTMLInputElement>('.nq-drawer-open input[type="date"]'));
    fireEvent.change(from, { target: { value: "2024-03-05" } });
    fireEvent.change(to, { target: { value: "2024-03-31" } });
    await apply(user);
    expect(names()).toEqual(["Carol", "Dan"]);
  });

  it("a default value filters from the first render", () => {
    renderTable([{ ...deptFilter, defaultValue: ["ops"] }]);
    expect(names()).toEqual(["Dan"]);
  });

  it("a filter reads the field named by accessorKey", async () => {
    const user = userEvent.setup();
    renderTable([{ ...deptFilter, id: "department", accessorKey: "dept", defaultValue: ["eng"] }]);
    expect(names()).toEqual(["Alice", "Carol"]);
    await openFilters(user); // the drawer is still built from the config
    expect(drawer().getByText("Engineering")).toBeInTheDocument();
  });

  it("filters combine with each other (all must match)", async () => {
    const user = userEvent.setup();
    renderTable([deptFilter, joinedFilter]);
    await openFilters(user);
    await choose(user, "Engineering");
    const [from] = Array.from(document.querySelectorAll<HTMLInputElement>('.nq-drawer-open input[type="date"]'));
    fireEvent.change(from, { target: { value: "2024-03-01" } });
    await apply(user);
    expect(names()).toEqual(["Carol"]);
  });

  it("and with the search box", async () => {
    const user = userEvent.setup();
    renderTable([{ ...deptFilter, defaultValue: ["eng", "sales"] }]);
    expect(names()).toEqual(["Alice", "Bob", "Carol", "Erin"]);
    await user.type(screen.getByPlaceholderText("Search..."), "ar");
    await waitFor(() => expect(names()).toEqual(["Carol"]), { timeout: 2500 });
  });

  it("says so when nothing matches", async () => {
    const user = userEvent.setup();
    renderTable([{ ...joinedFilter, defaultValue: { from: "2030-01-01" } }]);
    expect(screen.getByText("No data found")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Remove Joined filter" }));
    expect(names()).toHaveLength(5);
  });

  it("Clear all drops every filter", async () => {
    const user = userEvent.setup();
    renderTable([
      { ...deptFilter, defaultValue: ["eng"] },
      { ...joinedFilter, defaultValue: { from: "2024-03-01" } },
    ]);
    expect(names()).toEqual(["Carol"]);
    await user.click(screen.getByRole("button", { name: "Clear all" }));
    expect(names()).toHaveLength(5);
  });

  it("a mandatory filter still applies and cannot be removed", () => {
    renderTable([{ ...deptFilter, mandatory: true, defaultValue: ["ops"] }]);
    expect(names()).toEqual(["Dan"]);
    expect(screen.queryByRole("button", { name: "Remove Department filter" })).not.toBeInTheDocument();
  });

  it("the pager counts the filtered rows, and starts again at page 1", async () => {
    const user = userEvent.setup();
    const many: Person[] = Array.from({ length: 25 }, (_, i) => ({ id: i, name: `P${i}`, dept: i % 5 === 0 ? "ops" : "eng", joined: "2024-01-01" }));
    render(<Table columns={columns} preFetchedData={many} filterConfigs={[deptFilter]} isColumnSettingHidden />);
    await user.click(document.querySelectorAll(".nq-table-pagination-controls button")[2]); // page 2
    expect(pager()).toContain("11 to 20 of 25");

    await openFilters(user);
    await choose(user, "Operations");
    await apply(user);
    expect(names()).toHaveLength(5); // 0,5,10,15,20 — all on one page now
  });

  it("export writes the filtered rows", async () => {
    const user = userEvent.setup();
    renderTable([{ ...deptFilter, defaultValue: ["sales"] }]);
    await user.click(screen.getByRole("button", { name: /Export/ }));
    await user.click(screen.getByText("Export as Excel"));
    await waitFor(() => expect(aoaToSheet).toHaveBeenCalled());
    const aoa = aoaToSheet.mock.calls[0][0];
    expect(aoa.slice(1).map((r) => r[0])).toEqual(["Bob", "Erin"]);
  });

  it("with no filterConfigs, nothing changes", () => {
    render(<Table columns={columns} preFetchedData={people} isPaginationHidden isColumnSettingHidden />);
    expect(names()).toHaveLength(5);
  });
});

describe("an apiFunction table leaves filtering to the server", () => {
  it("does not filter the rows it gets back, and still sends the filter", async () => {
    const apiFunction = vi.fn().mockResolvedValue({ result: people, totalCount: 5 });
    render(
      <NoviqUIConfigProvider config={{ table: { responseFormat: { rowsPath: "result", totalPath: "totalCount" } } }}>
        <Table
          columns={columns}
          apiFunction={apiFunction}
          filterConfigs={[{ ...deptFilter, defaultValue: ["ops"] }]}
          isPaginationHidden
          isColumnSettingHidden
        />
      </NoviqUIConfigProvider>
    );
    await waitFor(() => expect(names()).toHaveLength(5)); // the server's answer, shown as it is
    expect(apiFunction).toHaveBeenLastCalledWith(expect.objectContaining({ dept: "ops" }));
  });
});
