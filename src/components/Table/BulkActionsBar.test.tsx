import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import BulkActionsBar from "./BulkActionsBar";

describe("BulkActionsBar", () => {
  it("renders nothing when selectedCount is 0", () => {
    const { container } = render(
      <BulkActionsBar selectedCount={0} actions={[]} selectedIds={[]} onClearSelection={vi.fn()} />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("shows the selected count (singular)", () => {
    render(
      <BulkActionsBar selectedCount={1} actions={[]} selectedIds={["a"]} onClearSelection={vi.fn()} />
    );
    expect(screen.getByText("1 row selected")).toBeInTheDocument();
  });

  it("shows the selected count (plural)", () => {
    render(
      <BulkActionsBar
        selectedCount={3}
        actions={[]}
        selectedIds={["a", "b", "c"]}
        onClearSelection={vi.fn()}
      />
    );
    expect(screen.getByText("3 rows selected")).toBeInTheDocument();
  });

  it("fires onClearSelection when Clear is clicked", async () => {
    const user = userEvent.setup();
    const onClearSelection = vi.fn();
    render(
      <BulkActionsBar selectedCount={2} actions={[]} selectedIds={["a", "b"]} onClearSelection={onClearSelection} />
    );
    await user.click(screen.getByRole("button", { name: /Clear/ }));
    expect(onClearSelection).toHaveBeenCalledTimes(1);
  });

  it("fires a bulk action with the selected ids", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(
      <BulkActionsBar
        selectedCount={2}
        actions={[{ id: "delete", label: "Delete", onClick }]}
        selectedIds={["a", "b"]}
        onClearSelection={vi.fn()}
      />
    );
    await user.click(screen.getByRole("button", { name: "Delete" }));
    expect(onClick).toHaveBeenCalledWith(["a", "b"]);
  });
});
