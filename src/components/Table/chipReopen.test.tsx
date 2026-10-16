import React, { useState } from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import FilterChips from "./FilterChips";
import FilterDrawer from "./FilterDrawer";
import Table, { type TableColumn } from "./Table";
import { FILTER_TYPE } from "../../constants";
import type { ActiveFilter, FilterConfig } from "./buildActiveFilter";

const chips: ActiveFilter[] = [
  { id: "state", label: "State", displayValue: "Open", apiPayload: {} },
  { id: "owner", label: "Owner", displayValue: "Me", mandatory: true, apiPayload: {} },
];

describe("<FilterChips onChipClick>", () => {
  it("makes each chip's text a button that reports which filter was clicked", async () => {
    const user = userEvent.setup();
    const onChipClick = vi.fn();
    render(<FilterChips filters={chips} onRemove={() => {}} onClearAll={() => {}} onChipClick={onChipClick} />);

    await user.click(screen.getByRole("button", { name: /State: Open/ }));
    expect(onChipClick).toHaveBeenCalledWith("state");
    await user.click(screen.getByRole("button", { name: /Owner: Me/ })); // mandatory chips too
    expect(onChipClick).toHaveBeenLastCalledWith("owner");
  });

  it("the remove button still removes, and does not count as a chip click", async () => {
    const user = userEvent.setup();
    const onChipClick = vi.fn();
    const onRemove = vi.fn();
    render(<FilterChips filters={chips} onRemove={onRemove} onClearAll={() => {}} onChipClick={onChipClick} />);

    await user.click(screen.getByRole("button", { name: "Remove State filter" }));
    expect(onRemove).toHaveBeenCalledWith("state");
    expect(onChipClick).not.toHaveBeenCalled();
  });

  it("without the prop the chips are plain text, as before", () => {
    render(<FilterChips filters={chips} onRemove={() => {}} onClearAll={() => {}} />);
    expect(screen.queryByRole("button", { name: /State: Open/ })).not.toBeInTheDocument();
    expect(screen.getByText("State:")).toBeInTheDocument();
  });
});

describe("<FilterDrawer open onOpenChange>", () => {
  const filters: FilterConfig[] = [{ id: "state", label: "State", type: FILTER_TYPE.SELECT, options: [{ value: "a", label: "A" }] }];
  const base = { filters, activeFilters: [], onApplyFilter: () => {}, onClearAll: () => {} };
  const drawer = () => document.querySelector(".nq-drawer-content") as HTMLElement;

  it("is open when told to be, without a click on its button", () => {
    render(<FilterDrawer {...base} open onOpenChange={() => {}} />);
    expect(drawer()).toHaveClass("nq-drawer-open");
  });

  it("asks to open when its button is clicked, and does not open by itself while controlled", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    render(<FilterDrawer {...base} open={false} onOpenChange={onOpenChange} />);
    await user.click(screen.getByRole("button", { name: /Filters/ }));
    expect(onOpenChange).toHaveBeenCalledWith(true);
    expect(drawer()).not.toHaveClass("nq-drawer-open"); // the parent owns the state
  });

  it("asks to close from the close button and after Apply", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    render(<FilterDrawer {...base} open onOpenChange={onOpenChange} />);
    await user.click(within(drawer()).getByRole("button", { name: "Close" }));
    expect(onOpenChange).toHaveBeenLastCalledWith(false);

    await user.click(within(drawer()).getByRole("button", { name: "Apply" }));
    expect(onOpenChange).toHaveBeenLastCalledWith(false);
  });

  it("works as a controlled pair in a parent", async () => {
    const user = userEvent.setup();
    function Parent() {
      const [open, setOpen] = useState(false);
      return (
        <>
          <button onClick={() => setOpen(true)}>external</button>
          <FilterDrawer {...base} open={open} onOpenChange={setOpen} />
        </>
      );
    }
    render(<Parent />);
    expect(drawer()).not.toHaveClass("nq-drawer-open");
    await user.click(screen.getByRole("button", { name: "external" }));
    expect(drawer()).toHaveClass("nq-drawer-open");
    await user.click(within(drawer()).getByRole("button", { name: "Close" }));
    expect(drawer()).not.toHaveClass("nq-drawer-open");
  });

  it("uncontrolled (no `open`) still opens and closes itself", async () => {
    const user = userEvent.setup();
    render(<FilterDrawer {...base} />);
    await user.click(screen.getByRole("button", { name: /Filters/ }));
    expect(drawer()).toHaveClass("nq-drawer-open");
    await user.click(within(drawer()).getByRole("button", { name: "Close" }));
    expect(drawer()).not.toHaveClass("nq-drawer-open");
  });
});

describe("<Table> filter chips", () => {
  interface Row {
    id: number;
    name: string;
  }
  const columns: TableColumn<Row>[] = [{ id: "name", heading: "Name", accessorKey: "name" }];
  const filterConfigs: FilterConfig[] = [
    { id: "state", label: "State", type: FILTER_TYPE.SELECT, options: [{ value: "a", label: "Alpha" }], defaultValue: ["a"] },
  ];
  const openDrawers = () => document.querySelectorAll(".nq-drawer-content.nq-drawer-open");

  it("clicking an active-filter chip opens the filters drawer", async () => {
    const user = userEvent.setup();
    render(<Table columns={columns} preFetchedData={[{ id: 1, name: "x" }]} filterConfigs={filterConfigs} isPaginationHidden />);
    expect(openDrawers()).toHaveLength(0);

    await user.click(screen.getByRole("button", { name: /State: Alpha/ }));
    expect(openDrawers()).toHaveLength(1);
    expect(within(openDrawers()[0] as HTMLElement).getByRole("heading", { name: "Filters" })).toBeInTheDocument();
  });

  it("the drawer still opens from its own button and closes again", async () => {
    const user = userEvent.setup();
    render(<Table columns={columns} preFetchedData={[{ id: 1, name: "x" }]} filterConfigs={filterConfigs} isPaginationHidden />);
    await user.click(screen.getByRole("button", { name: /^Filters/ }));
    expect(openDrawers()).toHaveLength(1);
    await user.click(within(openDrawers()[0] as HTMLElement).getByRole("button", { name: "Close" }));
    expect(openDrawers()).toHaveLength(0);
  });
});
