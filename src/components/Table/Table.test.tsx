import React from "react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Table, { type TableColumn } from "./Table";
import { FILTER_TYPE, type FilterConfig } from "./buildActiveFilter";

interface Row {
  id: number;
  name: string;
  status: string;
}

const rows: Row[] = [
  { id: 1, name: "Charlie", status: "approved" },
  { id: 2, name: "Alice", status: "pending" },
  { id: 3, name: "Bob", status: "rejected" },
];

const columns: TableColumn<Row>[] = [
  { id: "name", heading: "Name", accessorKey: "name", sortable: true },
  { id: "status", heading: "Status", accessorKey: "status", type: "status" as any },
];

afterEach(() => {
  vi.useRealTimers();
  window.localStorage.clear();
});

describe("Table", () => {
  it("renders rows from preFetchedData", () => {
    render(<Table columns={columns} preFetchedData={rows} isPaginationHidden />);
    expect(screen.getByText("Charlie")).toBeInTheDocument();
    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(screen.getByText("Bob")).toBeInTheDocument();
  });

  it("shows the empty state when there are no rows", () => {
    render(<Table columns={columns} preFetchedData={[]} />);
    expect(screen.getByText("No data found")).toBeInTheDocument();
  });

  it("uses a custom empty message", () => {
    render(<Table columns={columns} preFetchedData={[]} emptyMessage="Nothing to see here" />);
    expect(screen.getByText("Nothing to see here")).toBeInTheDocument();
  });

  it("calls apiFunction with the expected params shape and renders the response", async () => {
    const apiFunction = vi.fn().mockResolvedValue({ result: rows, totalCount: rows.length });
    render(
      <Table columns={columns} apiFunction={apiFunction} apiParams={{ department: "eng" }} />
    );

    await waitFor(() => expect(screen.getByText("Charlie")).toBeInTheDocument());

    expect(apiFunction).toHaveBeenCalledWith(
      expect.objectContaining({
        department: "eng",
        search: "",
        page_no: 1,
        rows_per_page: 10,
      })
    );
  });

  it("shows a loading overlay while apiFunction is pending", async () => {
    let resolvePromise: (value: any) => void = () => {};
    const apiFunction = vi.fn(
      () =>
        new Promise((resolve) => {
          resolvePromise = resolve;
        })
    );
    render(<Table columns={columns} apiFunction={apiFunction} />);

    expect(screen.getByRole("status", { name: "Loading" })).toBeInTheDocument();

    resolvePromise({ result: rows, totalCount: rows.length });
    await waitFor(() => expect(screen.getByText("Charlie")).toBeInTheDocument());
  });

  it("sorts ascending, then descending, then back to unsorted on repeated header clicks", () => {
    render(<Table columns={columns} preFetchedData={rows} isPaginationHidden />);

    const getNameCells = () =>
      screen.getAllByRole("row").slice(1).map((row) => row.children[0].textContent);
    const nameHeader = () =>
      screen.getAllByRole("columnheader").find((h) => h.textContent === "Name")!;

    expect(getNameCells()).toEqual(["Charlie", "Alice", "Bob"]);

    fireEvent.click(nameHeader());
    expect(getNameCells()).toEqual(["Alice", "Bob", "Charlie"]);

    fireEvent.click(nameHeader());
    expect(getNameCells()).toEqual(["Charlie", "Bob", "Alice"]);

    fireEvent.click(nameHeader());
    expect(getNameCells()).toEqual(["Charlie", "Alice", "Bob"]);
  });

  it("debounces search before triggering a refetch", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const user = userEvent.setup({ delay: null });
    const apiFunction = vi.fn().mockResolvedValue({ result: rows, totalCount: rows.length });
    render(<Table columns={columns} apiFunction={apiFunction} />);

    await vi.waitFor(() => expect(apiFunction).toHaveBeenCalledTimes(1));

    await user.type(screen.getByPlaceholderText("Search..."), "ali");
    expect(apiFunction).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(500);
    await vi.waitFor(() =>
      expect(apiFunction).toHaveBeenLastCalledWith(expect.objectContaining({ search: "ali" }))
    );
  });

  it("does not render column sort icons for non-sortable columns", () => {
    render(<Table columns={columns} preFetchedData={rows} isPaginationHidden />);
    const statusHeader = screen.getAllByRole("columnheader").find((h) => h.textContent === "Status");
    expect(statusHeader?.className).not.toContain("table-th-sortable");
  });

  it("renders the Columns chooser by default", () => {
    render(<Table columns={columns} preFetchedData={rows} isPaginationHidden />);
    expect(screen.getByRole("button", { name: /Columns/ })).toBeInTheDocument();
  });

  it("hides the Columns chooser when isColumnSettingHidden", () => {
    render(
      <Table columns={columns} preFetchedData={rows} isPaginationHidden isColumnSettingHidden />
    );
    expect(screen.queryByRole("button", { name: /Columns/ })).not.toBeInTheDocument();
  });

  it("hiding a column via the chooser removes it from the table", async () => {
    const user = userEvent.setup();
    render(<Table columns={columns} preFetchedData={rows} isPaginationHidden />);

    expect(screen.getAllByRole("columnheader").map((h) => h.textContent)).toContain("Status");

    await user.click(screen.getByRole("button", { name: /Columns/ }));
    const statusRow = screen.getByText("Status", { selector: ".column-selector-label" });
    const switchInRow = statusRow.closest(".column-selector-row")!.querySelector('[role="switch"]')!;
    await user.click(switchInRow);

    expect(screen.getAllByRole("columnheader").map((h) => h.textContent)).not.toContain("Status");
  });

  it("persists column settings across a remount when id is set", async () => {
    const user = userEvent.setup();
    const { unmount } = render(
      <Table id="employees-table" columns={columns} preFetchedData={rows} isPaginationHidden />
    );

    await user.click(screen.getByRole("button", { name: /Columns/ }));
    const nameRow = screen.getByText("Name", { selector: ".column-selector-label" });
    const nameSwitch = nameRow.closest(".column-selector-row")!.querySelector('[role="switch"]')!;
    await user.click(nameSwitch);
    unmount();

    render(<Table id="employees-table" columns={columns} preFetchedData={rows} isPaginationHidden />);
    const headers = screen.getAllByRole("columnheader").map((h) => h.textContent);
    expect(headers).not.toContain("Name");
  });

  it("does not persist column settings across a remount without an id", async () => {
    const user = userEvent.setup();
    const { unmount } = render(<Table columns={columns} preFetchedData={rows} isPaginationHidden />);

    await user.click(screen.getByRole("button", { name: /Columns/ }));
    const nameRow = screen.getByText("Name", { selector: ".column-selector-label" });
    const nameSwitch = nameRow.closest(".column-selector-row")!.querySelector('[role="switch"]')!;
    await user.click(nameSwitch);
    unmount();

    render(<Table columns={columns} preFetchedData={rows} isPaginationHidden />);
    const headers = screen.getAllByRole("columnheader").map((h) => h.textContent);
    expect(headers).toContain("Name");
  });

  it("does not render selection checkboxes or a bulk bar without getRowId", () => {
    render(<Table columns={columns} preFetchedData={rows} isPaginationHidden />);
    expect(screen.queryAllByRole("checkbox")).toHaveLength(0);
  });

  it("selecting a row updates state and shows the bulk actions bar", async () => {
    const user = userEvent.setup();
    const onRowSelectionChange = vi.fn();
    render(
      <Table
        columns={columns}
        preFetchedData={rows}
        isPaginationHidden
        getRowId={(row) => String(row.id)}
        bulkActions={[{ id: "delete", label: "Delete", onClick: vi.fn() }]}
        onRowSelectionChange={onRowSelectionChange}
      />
    );

    expect(screen.queryByText(/selected/)).not.toBeInTheDocument();

    const checkboxes = screen.getAllByRole("checkbox");
    // First checkbox is the header "select all"; row checkboxes follow.
    await user.click(checkboxes[1]);

    expect(screen.getByText("1 row selected")).toBeInTheDocument();
    expect(onRowSelectionChange).toHaveBeenLastCalledWith(["1"]);
  });

  it("select-all header checkbox selects every loaded row", async () => {
    const user = userEvent.setup();
    render(
      <Table
        columns={columns}
        preFetchedData={rows}
        isPaginationHidden
        getRowId={(row) => String(row.id)}
      />
    );

    const [selectAll] = screen.getAllByRole("checkbox");
    await user.click(selectAll);
    expect(screen.getByText("3 rows selected")).toBeInTheDocument();
  });

  it("clearing the bulk bar deselects all rows", async () => {
    const user = userEvent.setup();
    render(
      <Table columns={columns} preFetchedData={rows} isPaginationHidden getRowId={(row) => String(row.id)} />
    );

    const [selectAll] = screen.getAllByRole("checkbox");
    await user.click(selectAll);
    expect(screen.getByText("3 rows selected")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Clear/ }));
    expect(screen.queryByText(/selected/)).not.toBeInTheDocument();
  });

  it("rowActions renders an Actions column and fires with row context", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(
      <Table
        columns={columns}
        preFetchedData={rows}
        isPaginationHidden
        rowActions={() => [{ label: "Edit", type: "button", onClick }]}
      />
    );

    expect(screen.getAllByRole("columnheader").map((h) => h.textContent)).toContain("Actions");

    const editButtons = screen.getAllByRole("button", { name: "Edit" });
    await user.click(editButtons[0]);
    expect(onClick).toHaveBeenCalledWith(expect.objectContaining({ row: rows[0] }));
  });

  it("getRowId alone (no rowActions) enables selection without an actions column", () => {
    render(
      <Table columns={columns} preFetchedData={rows} isPaginationHidden getRowId={(row) => String(row.id)} />
    );
    expect(screen.getAllByRole("columnheader").map((h) => h.textContent)).not.toContain("Actions");
    expect(screen.getAllByRole("checkbox").length).toBeGreaterThan(0);
  });

  it("isRowActionsWithoutDropdown renders a reject-variant action's popover inline", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn().mockResolvedValue(undefined);
    render(
      <Table
        columns={columns}
        preFetchedData={rows}
        isPaginationHidden
        isRowActionsWithoutDropdown
        rowActions={() => [{ label: "Reject", variant: "reject", onConfirm }]}
      />
    );

    const rejectButtons = screen.getAllByRole("button", { name: "Reject" });
    await user.click(rejectButtons[0]);
    await user.type(screen.getByPlaceholderText("Reason..."), "Not eligible");
    await user.click(screen.getByRole("button", { name: "Confirm" }));

    expect(onConfirm).toHaveBeenCalledWith(expect.objectContaining({ reason: "Not eligible" }));
  });

  it("without isRowActionsWithoutDropdown, a reject-variant action is just a plain dropdown item", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    render(
      <Table
        columns={columns}
        preFetchedData={rows}
        isPaginationHidden
        rowActions={() => [{ label: "Reject", variant: "reject", onConfirm }]}
      />
    );

    // Dropdown-mode trigger buttons have no accessible name (icon-only).
    const triggers = screen.getAllByRole("button", { name: "" });
    await user.click(triggers[0]);
    await user.click(await screen.findByText("Reject"));

    // No reason popover — clicking calls onConfirm directly with no `reason`, unlike inline mode.
    expect(screen.queryByPlaceholderText("Reason...")).not.toBeInTheDocument();
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("does not render a Filters button or chip row without filterConfigs", () => {
    render(<Table columns={columns} preFetchedData={rows} isPaginationHidden />);
    expect(screen.queryByRole("button", { name: /Filters/ })).not.toBeInTheDocument();
  });

  it("applying a filter merges its apiPayload into the apiFunction params and shows a chip", async () => {
    const user = userEvent.setup();
    const apiFunction = vi.fn().mockResolvedValue({ result: rows, totalCount: rows.length });
    const filterConfigs: FilterConfig[] = [
      {
        id: "department",
        label: "Department",
        type: FILTER_TYPE.SELECT,
        options: [{ value: "eng", label: "Engineering" }],
      },
    ];
    render(<Table columns={columns} apiFunction={apiFunction} filterConfigs={filterConfigs} />);
    await waitFor(() => expect(apiFunction).toHaveBeenCalled());

    await user.click(screen.getByRole("button", { name: /Filters/ }));
    await user.click(screen.getByRole("checkbox"));
    await user.click(screen.getByRole("button", { name: "Apply" }));

    expect(screen.getByText("Department:")).toBeInTheDocument();
    expect(screen.getByText("Engineering", { selector: ".filter-chip-value" })).toBeInTheDocument();
    await waitFor(() =>
      expect(apiFunction).toHaveBeenLastCalledWith(expect.objectContaining({ department: "eng" }))
    );
  });

  it("removing a filter chip clears it from apiFunction params", async () => {
    const user = userEvent.setup();
    const apiFunction = vi.fn().mockResolvedValue({ result: rows, totalCount: rows.length });
    const filterConfigs: FilterConfig[] = [
      { id: "q", label: "Query", type: FILTER_TYPE.SEARCH, defaultValue: "engineering" },
    ];
    render(<Table columns={columns} apiFunction={apiFunction} filterConfigs={filterConfigs} />);
    await waitFor(() =>
      expect(apiFunction).toHaveBeenLastCalledWith(expect.objectContaining({ q: "engineering" }))
    );

    expect(screen.getByText("Query:")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Remove Query filter" }));

    expect(screen.queryByText("Query:")).not.toBeInTheDocument();
    await waitFor(() =>
      expect(apiFunction).toHaveBeenLastCalledWith(expect.not.objectContaining({ q: "engineering" }))
    );
  });

  it("renders an Export button by default", () => {
    render(<Table columns={columns} preFetchedData={rows} isPaginationHidden />);
    expect(screen.getByRole("button", { name: /Export/ })).toBeInTheDocument();
  });

  it("hides the Export button when isExportHidden", () => {
    render(<Table columns={columns} preFetchedData={rows} isPaginationHidden isExportHidden />);
    expect(screen.queryByRole("button", { name: /Export/ })).not.toBeInTheDocument();
  });
});
