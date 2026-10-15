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

  it("exposes exactly one checkbox to assistive tech, even without the stylesheet", () => {
    // This suite loads the package CSS (`css: true`), where `.checkbox-input { display: none }`
    // would hide the native input anyway. A consumer who forgets `import "noviq-ui/style.css"`
    // doesn't get that — so take the injected styles away and look again.
    const styles = Array.from(document.querySelectorAll("style"));
    styles.forEach((node) => node.remove());
    try {
      const { container } = render(<Checkbox checked onChange={() => {}} />);
      expect(screen.getAllByRole("checkbox")).toHaveLength(1);
      expect(screen.getByRole("checkbox")).toHaveAttribute("aria-checked", "true");

      // And it must not show up as a second, visible native checkbox beside ours.
      const native = container.querySelector<HTMLInputElement>("input[type=checkbox]")!;
      expect(native.hidden).toBe(true);
      expect(getComputedStyle(native).display).toBe("none");
    } finally {
      styles.forEach((node) => document.head.appendChild(node));
    }
  });
});
