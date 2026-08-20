import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ColumnSelector from "./ColumnSelector";
import type { TableColumn } from "./Table";

const columns: TableColumn[] = [
  { id: "name", heading: "Name" },
  { id: "email", heading: "Email" },
];

function renderSelector(overrides: Partial<React.ComponentProps<typeof ColumnSelector>> = {}) {
  const props = {
    columns,
    visibleColumns: ["name", "email"],
    columnOrder: ["name", "email"],
    stickyColumns: { left: [], right: [] },
    onVisibilityChange: vi.fn(),
    onReorder: vi.fn(),
    onStickyChange: vi.fn(),
    onReset: vi.fn(),
    ...overrides,
  };
  render(<ColumnSelector {...props} />);
  return props;
}

describe("ColumnSelector", () => {
  it("opens the drawer and lists configurable columns", async () => {
    const user = userEvent.setup();
    renderSelector();
    await user.click(screen.getByRole("button", { name: /Columns/ }));
    expect(screen.getByText("Manage columns")).toBeInTheDocument();
    expect(screen.getByText("Name")).toBeInTheDocument();
    expect(screen.getByText("Email")).toBeInTheDocument();
  });

  it("excludes select/actions system columns from the list", async () => {
    const user = userEvent.setup();
    const withSystemCols: TableColumn[] = [
      ...columns,
      { id: "select", heading: "Select" },
      { id: "actions", heading: "Actions" },
    ];
    renderSelector({
      columns: withSystemCols,
      columnOrder: ["name", "email", "select", "actions"],
    });
    await user.click(screen.getByRole("button", { name: /Columns/ }));
    expect(screen.queryByText("Select")).not.toBeInTheDocument();
    expect(screen.queryByText("Actions")).not.toBeInTheDocument();
  });

  it("fires onVisibilityChange when a switch is toggled", async () => {
    const user = userEvent.setup();
    const props = renderSelector();
    await user.click(screen.getByRole("button", { name: /Columns/ }));
    const switches = screen.getAllByRole("switch");
    await user.click(switches[0]);
    expect(props.onVisibilityChange).toHaveBeenCalledWith("name", false);
  });

  it("cycles sticky state via the pin button", async () => {
    const user = userEvent.setup();
    const props = renderSelector();
    await user.click(screen.getByRole("button", { name: /Columns/ }));
    const nameRow = screen.getByText("Name", { selector: ".column-selector-label" });
    const pinButton = nameRow.closest(".column-selector-row")!.querySelector(
      ".column-selector-sticky-btn"
    )!;
    await user.click(pinButton);
    expect(props.onStickyChange).toHaveBeenCalledWith("name", "left");
  });

  it("shows the current sticky letter when a column is pinned", async () => {
    const user = userEvent.setup();
    renderSelector({ stickyColumns: { left: ["name"], right: [] } });
    await user.click(screen.getByRole("button", { name: /Columns/ }));
    expect(screen.getByText("L")).toBeInTheDocument();
  });

  it("fires onReset when Reset Columns is clicked", async () => {
    const user = userEvent.setup();
    const props = renderSelector();
    await user.click(screen.getByRole("button", { name: /Columns/ }));
    await user.click(screen.getByRole("button", { name: "Reset Columns" }));
    expect(props.onReset).toHaveBeenCalledTimes(1);
  });

  it("fires onReorder with the new order when dragging a row over another", async () => {
    const user = userEvent.setup();
    const props = renderSelector();
    await user.click(screen.getByRole("button", { name: /Columns/ }));

    const nameRow = screen.getByText("Name").closest("div")!;
    const emailRow = screen.getByText("Email").closest("div")!;

    fireEvent.dragStart(nameRow);
    fireEvent.dragOver(emailRow);

    expect(props.onReorder).toHaveBeenCalledWith(["email", "name"]);
  });
});
