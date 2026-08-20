import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Checkbox from "./Checkbox";

describe("Checkbox", () => {
  it("reflects the checked state", () => {
    render(<Checkbox checked onChange={vi.fn()} />);
    expect(screen.getByRole("checkbox")).toBeChecked();
  });

  it("shows a checkmark when checked", () => {
    render(<Checkbox checked onChange={vi.fn()} />);
    expect(screen.getByText("✓")).toBeInTheDocument();
  });

  it("fires onChange with the new checked value", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Checkbox checked={false} onChange={onChange} />);
    await user.click(screen.getByRole("checkbox"));
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it("is disabled when disabled is set", () => {
    render(<Checkbox checked={false} onChange={vi.fn()} disabled />);
    const box = screen.getByRole("checkbox");
    expect(box).toHaveAttribute("aria-disabled", "true");
    expect(box).toHaveAttribute("tabindex", "-1");
  });

  it("does not fire onChange when disabled", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Checkbox checked={false} onChange={onChange} disabled />);
    await user.click(screen.getByRole("checkbox"));
    expect(onChange).not.toHaveBeenCalled();
  });
});
