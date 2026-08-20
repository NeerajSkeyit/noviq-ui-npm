import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import FormFooter from "./FormFooter";

describe("FormFooter", () => {
  it("renders default Cancel/Save labels", () => {
    render(<FormFooter />);
    expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save" })).toBeInTheDocument();
  });

  it("renders custom labels", () => {
    render(<FormFooter cancelLabel="Discard" submitLabel="Confirm" />);
    expect(screen.getByRole("button", { name: "Discard" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Confirm" })).toBeInTheDocument();
  });

  it("fires onCancel and onSubmit", async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();
    const onSubmit = vi.fn();
    render(<FormFooter onCancel={onCancel} onSubmit={onSubmit} />);
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it("renders extra buttons and fires their onClick", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<FormFooter buttons={[{ label: "Delete", variant: "destructive", onClick }]} />);
    const btn = screen.getByRole("button", { name: "Delete" });
    expect(btn.className).toContain("btn-destructive");
    await user.click(btn);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("disables all buttons while isSubmitting", () => {
    render(<FormFooter isSubmitting />);
    expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Save" })).toBeDisabled();
  });
});
