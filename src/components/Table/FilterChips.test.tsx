import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import FilterChips from "./FilterChips";
import type { ActiveFilter } from "./buildActiveFilter";

const filters: ActiveFilter[] = [
  { id: "department", label: "Department", displayValue: "Engineering", apiPayload: { department: "eng" } },
  { id: "status", label: "Status", displayValue: "Active", apiPayload: { status: "active" } },
];

describe("FilterChips", () => {
  it("renders nothing when there are no filters", () => {
    const { container } = render(<FilterChips filters={[]} onRemove={vi.fn()} onClearAll={vi.fn()} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders a chip per active filter", () => {
    render(<FilterChips filters={filters} onRemove={vi.fn()} onClearAll={vi.fn()} />);
    expect(screen.getByText("Department:")).toBeInTheDocument();
    expect(screen.getByText("Engineering")).toBeInTheDocument();
    expect(screen.getByText("Status:")).toBeInTheDocument();
    expect(screen.getByText("Active")).toBeInTheDocument();
  });

  it("fires onRemove with the filter id when a chip's remove button is clicked", async () => {
    const user = userEvent.setup();
    const onRemove = vi.fn();
    render(<FilterChips filters={filters} onRemove={onRemove} onClearAll={vi.fn()} />);
    await user.click(screen.getByRole("button", { name: "Remove Department filter" }));
    expect(onRemove).toHaveBeenCalledWith("department");
  });

  it("hides the remove button for a mandatory filter", () => {
    const mandatory: ActiveFilter[] = [
      { id: "tenant", label: "Tenant", displayValue: "Acme", mandatory: true, apiPayload: {} },
      filters[0],
    ];
    render(<FilterChips filters={mandatory} onRemove={vi.fn()} onClearAll={vi.fn()} />);
    expect(screen.queryByRole("button", { name: "Remove Tenant filter" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Remove Department filter" })).toBeInTheDocument();
  });

  it("only shows Clear all when there is more than one filter", () => {
    const { rerender } = render(
      <FilterChips filters={[filters[0]]} onRemove={vi.fn()} onClearAll={vi.fn()} />
    );
    expect(screen.queryByText("Clear all")).not.toBeInTheDocument();

    rerender(<FilterChips filters={filters} onRemove={vi.fn()} onClearAll={vi.fn()} />);
    expect(screen.getByText("Clear all")).toBeInTheDocument();
  });

  it("fires onClearAll (and nothing else) when Clear all is clicked", async () => {
    const user = userEvent.setup();
    const onClearAll = vi.fn();
    const onRemove = vi.fn();
    render(<FilterChips filters={filters} onRemove={onRemove} onClearAll={onClearAll} />);
    await user.click(screen.getByText("Clear all"));
    expect(onClearAll).toHaveBeenCalledTimes(1);
    expect(onRemove).not.toHaveBeenCalled();
  });
});
