import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import RejectAction from "./RejectAction";

describe("RejectAction", () => {
  it("opens the popover on click", async () => {
    const user = userEvent.setup();
    render(<RejectAction onConfirm={vi.fn()} />);
    await user.click(screen.getByRole("button", { name: "Reject" }));
    expect(screen.getByText("Add Reason")).toBeInTheDocument();
  });

  it("uses a custom reject label", () => {
    render(<RejectAction rejectText="Decline" onConfirm={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Decline" })).toBeInTheDocument();
  });

  it("disables Confirm until a reason is entered", async () => {
    const user = userEvent.setup();
    render(<RejectAction onConfirm={vi.fn()} />);
    await user.click(screen.getByRole("button", { name: "Reject" }));
    expect(screen.getByRole("button", { name: "Confirm" })).toBeDisabled();
  });

  it("shows a validation error for a too-short reason", async () => {
    const user = userEvent.setup();
    render(<RejectAction onConfirm={vi.fn()} />);
    await user.click(screen.getByRole("button", { name: "Reject" }));
    await user.type(screen.getByPlaceholderText("Reason..."), "ab");
    await user.click(screen.getByRole("button", { name: "Confirm" }));
    expect(screen.getByText("Minimum 4 characters required")).toBeInTheDocument();
  });

  it("shows a validation error for digits-only reasons", async () => {
    const user = userEvent.setup();
    render(<RejectAction onConfirm={vi.fn()} />);
    await user.click(screen.getByRole("button", { name: "Reject" }));
    await user.type(screen.getByPlaceholderText("Reason..."), "1234");
    await user.click(screen.getByRole("button", { name: "Confirm" }));
    expect(screen.getByText("Cannot contain only numbers")).toBeInTheDocument();
  });

  it("shows a validation error for repeating characters", async () => {
    const user = userEvent.setup();
    render(<RejectAction onConfirm={vi.fn()} />);
    await user.click(screen.getByRole("button", { name: "Reject" }));
    await user.type(screen.getByPlaceholderText("Reason..."), "aaaabc");
    await user.click(screen.getByRole("button", { name: "Confirm" }));
    expect(screen.getByText("Reason cannot contain repeating characters")).toBeInTheDocument();
  });

  it("calls onConfirm with the reason and closes on success", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn().mockResolvedValue(undefined);
    render(<RejectAction onConfirm={onConfirm} />);
    await user.click(screen.getByRole("button", { name: "Reject" }));
    await user.type(screen.getByPlaceholderText("Reason..."), "Not eligible");
    await user.click(screen.getByRole("button", { name: "Confirm" }));

    expect(onConfirm).toHaveBeenCalledWith("Not eligible");
    expect(screen.queryByText("Add Reason")).not.toBeInTheDocument();
  });

  it("closes on Escape", async () => {
    const user = userEvent.setup();
    render(<RejectAction onConfirm={vi.fn()} />);
    await user.click(screen.getByRole("button", { name: "Reject" }));
    expect(screen.getByText("Add Reason")).toBeInTheDocument();
    await user.keyboard("{Escape}");
    expect(screen.queryByText("Add Reason")).not.toBeInTheDocument();
  });
});
