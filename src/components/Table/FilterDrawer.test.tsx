import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import FilterDrawer from "./FilterDrawer";
import type { FilterConfig, ActiveFilter } from "./buildActiveFilter";
import { FILTER_TYPE } from "../../constants";

const filters: FilterConfig[] = [
  {
    id: "department",
    label: "Department",
    type: FILTER_TYPE.SELECT,
    options: [
      { value: "eng", label: "Engineering" },
      { value: "sales", label: "Sales" },
    ],
  },
  { id: "joinDate", label: "Join date", type: FILTER_TYPE.DATE_RANGE },
];

function renderDrawer(overrides: Partial<React.ComponentProps<typeof FilterDrawer>> = {}) {
  const props = {
    filters,
    activeFilters: [] as ActiveFilter[],
    onApplyFilter: vi.fn(),
    onRemoveFilter: vi.fn(),
    onClearAll: vi.fn(),
    ...overrides,
  };
  render(<FilterDrawer {...props} />);
  return props;
}

describe("FilterDrawer", () => {
  it("opens the drawer and renders a section per filter config", async () => {
    const user = userEvent.setup();
    renderDrawer();
    await user.click(screen.getByRole("button", { name: /Filters/ }));
    expect(screen.getByText("Department")).toBeInTheDocument();
    expect(screen.getByText("Join date")).toBeInTheDocument();
    expect(screen.getByText("Engineering")).toBeInTheDocument();
    expect(screen.getByText("Sales")).toBeInTheDocument();
  });

  it("shows a badge with the active filter count", () => {
    renderDrawer({
      activeFilters: [
        { id: "department", label: "Department", displayValue: "Engineering", apiPayload: {} },
      ],
    });
    expect(screen.getByText("1")).toBeInTheDocument();
  });

  it("allows selecting more than one SELECT option (true multi-select)", async () => {
    const user = userEvent.setup();
    renderDrawer();
    await user.click(screen.getByRole("button", { name: /Filters/ }));

    const checkboxes = screen.getAllByRole("checkbox");
    await user.click(checkboxes[0]);
    await user.click(checkboxes[1]);
    expect(checkboxes[0]).toHaveAttribute("aria-checked", "true");
    expect(checkboxes[1]).toHaveAttribute("aria-checked", "true");
  });

  it("applies a SELECT filter with both options checked", async () => {
    const user = userEvent.setup();
    const props = renderDrawer();
    await user.click(screen.getByRole("button", { name: /Filters/ }));

    const checkboxes = screen.getAllByRole("checkbox");
    await user.click(checkboxes[0]);
    await user.click(checkboxes[1]);
    await user.click(screen.getByRole("button", { name: "Apply" }));

    expect(props.onApplyFilter).toHaveBeenCalledWith([
      expect.objectContaining({ id: "department", apiPayload: { department: "eng,sales" } }),
    ]);
  });

  it("applies a DATE_RANGE filter from the From/To inputs", async () => {
    const user = userEvent.setup();
    const props = renderDrawer();
    await user.click(screen.getByRole("button", { name: /Filters/ }));

    const fromInput = screen.getByLabelText("From") as HTMLInputElement;
    const toInput = screen.getByLabelText("To") as HTMLInputElement;
    await user.type(fromInput, "2026-01-01");
    await user.type(toInput, "2026-01-31");
    await user.click(screen.getByRole("button", { name: "Apply" }));

    expect(props.onApplyFilter).toHaveBeenCalledWith([
      expect.objectContaining({
        id: "joinDate",
        apiPayload: { joinDateFrom: "2026-01-01", joinDateTo: "2026-01-31" },
      }),
    ]);
  });

  it("fires onClearAll when the drawer's Clear all is clicked", async () => {
    const user = userEvent.setup();
    const props = renderDrawer();
    await user.click(screen.getByRole("button", { name: /Filters/ }));
    await user.click(screen.getByRole("button", { name: "Clear all" }));
    expect(props.onClearAll).toHaveBeenCalledTimes(1);
  });
});
