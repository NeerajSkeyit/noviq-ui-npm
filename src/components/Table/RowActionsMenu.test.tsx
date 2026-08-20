import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import RowActionsMenu, { type RowAction } from "./RowActionsMenu";

const pagination = { page: 1, pageSize: 10 };
const row = { id: "row-1", name: "Alice" };

describe("RowActionsMenu", () => {
  it("renders nothing when there are no actions", () => {
    const { container } = render(
      <RowActionsMenu actions={[]} row={row} rowIndex={0} pagination={pagination} />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("isWithoutDropdown: renders a button action and fires onClick with row context", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    const actions: RowAction[] = [{ label: "Approve", type: "button", onClick }];
    render(
      <RowActionsMenu actions={actions} row={row} rowIndex={2} pagination={pagination} isWithoutDropdown />
    );
    await user.click(screen.getByRole("button", { name: "Approve" }));
    expect(onClick).toHaveBeenCalledWith(
      expect.objectContaining({ row, rowIndex: 2, sn: 3, action: actions[0] })
    );
  });

  it("isWithoutDropdown: renders a checkbox action as a Switch", () => {
    const onChange = vi.fn();
    const actions: RowAction[] = [{ label: "Active", type: "checkbox", checked: true, onChange }];
    render(
      <RowActionsMenu actions={actions} row={row} rowIndex={0} pagination={pagination} isWithoutDropdown />
    );
    expect(screen.getByRole("switch")).toHaveAttribute("aria-checked", "true");
  });

  it("isWithoutDropdown: a reject-variant action delegates to RejectAction and forwards the reason", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn().mockResolvedValue(undefined);
    const onClick = vi.fn();
    const actions: RowAction[] = [{ label: "Reject", variant: "reject", onConfirm, onClick }];
    render(
      <RowActionsMenu actions={actions} row={row} rowIndex={0} pagination={pagination} isWithoutDropdown />
    );

    await user.click(screen.getByRole("button", { name: "Reject" }));
    await user.type(screen.getByPlaceholderText("Reason..."), "Not eligible");
    await user.click(screen.getByRole("button", { name: "Confirm" }));

    expect(onConfirm).toHaveBeenCalledWith(expect.objectContaining({ reason: "Not eligible", row }));
    expect(onClick).toHaveBeenCalledWith(expect.objectContaining({ reason: "Not eligible" }));
  });

  it("dropdown mode: groups non-button/checkbox actions into the '...' menu", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    const actions: RowAction[] = [{ label: "View details", onClick }];
    render(<RowActionsMenu actions={actions} row={row} rowIndex={0} pagination={pagination} />);

    expect(screen.queryByText("View details")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "" }));
    await user.click(await screen.findByText("View details"));
    expect(onClick).toHaveBeenCalledWith(expect.objectContaining({ row }));
  });

  it("dropdown mode: renders button/checkbox actions outside the dropdown", () => {
    const actions: RowAction[] = [{ label: "Edit", type: "button", onClick: vi.fn() }];
    render(<RowActionsMenu actions={actions} row={row} rowIndex={0} pagination={pagination} />);
    expect(screen.getByRole("button", { name: "Edit" })).toBeInTheDocument();
  });
});
