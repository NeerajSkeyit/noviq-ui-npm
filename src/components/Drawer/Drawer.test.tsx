import React from "react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Drawer from "./Drawer";

afterEach(() => {
  cleanup();
  document.body.style.overflow = "";
});

describe("Drawer", () => {
  it("hides the panel and overlay when closed", () => {
    render(
      <Drawer isOpen={false} onClose={vi.fn()} title="My Drawer">
        Body content
      </Drawer>
    );
    expect(document.querySelector(".nq-drawer-overlay")).not.toBeInTheDocument();
    const panel = document.querySelector(".nq-drawer-content");
    expect(panel).toHaveAttribute("aria-hidden", "true");
  });

  it("casts no shadow while closed: the parked panel would bleed it back onto the page", () => {
    // A closed drawer waits just off-screen (translated by its own width). Its box-shadow reaches
    // ~40px back past that edge, so an always-on shadow draws a dark strip down the side of the page.
    for (const side of ["right", "left", "top", "bottom"] as const) {
      const { unmount } = render(
        <Drawer isOpen={false} onClose={vi.fn()} title="Side" side={side}>
          Body
        </Drawer>
      );
      const panel = document.querySelector(".nq-drawer-content") as HTMLElement;
      expect(getComputedStyle(panel).boxShadow, side).toBe("none");
      unmount();
    }
  });

  it("casts its shadow once open", () => {
    render(
      <Drawer isOpen onClose={vi.fn()} title="Open">
        Body
      </Drawer>
    );
    const panel = document.querySelector(".nq-drawer-content") as HTMLElement;
    expect(getComputedStyle(panel).boxShadow).not.toBe("none");
    expect(getComputedStyle(panel).boxShadow).toBe("var(--nq-shadow)");
  });

  it("fades the shadow with the slide instead of snapping it on or off", () => {
    render(
      <Drawer isOpen={false} onClose={vi.fn()} title="Fade">
        Body
      </Drawer>
    );
    const panel = document.querySelector(".nq-drawer-content") as HTMLElement;
    expect(getComputedStyle(panel).transition).toMatch(/box-shadow/);
    expect(getComputedStyle(panel).transition).toMatch(/transform/);
  });

  it("renders title, subtitle, children and footer when open", () => {
    render(
      <Drawer
        isOpen
        onClose={vi.fn()}
        title="My Drawer"
        subtitle="Subtitle text"
        footer={<button>Save</button>}
      >
        Body content
      </Drawer>
    );
    expect(screen.getByText("My Drawer")).toBeInTheDocument();
    expect(screen.getByText("Subtitle text")).toBeInTheDocument();
    expect(screen.getByText("Body content")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save" })).toBeInTheDocument();
    expect(document.querySelector(".nq-drawer-content")).toHaveAttribute(
      "aria-hidden",
      "false"
    );
  });

  it("calls onClose on ESC when closeOnOutside is true", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(
      <Drawer isOpen onClose={onClose} closeOnOutside>
        content
      </Drawer>
    );
    await user.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("does not call onClose on ESC when closeOnOutside is false", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(
      <Drawer isOpen onClose={onClose} closeOnOutside={false}>
        content
      </Drawer>
    );
    await user.keyboard("{Escape}");
    expect(onClose).not.toHaveBeenCalled();
  });

  it("calls onClose when clicking the overlay and closeOnOutside is true", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(
      <Drawer isOpen onClose={onClose} closeOnOutside>
        content
      </Drawer>
    );
    const overlay = document.querySelector(".nq-drawer-overlay") as HTMLElement;
    await user.click(overlay);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("calls onClose when the close button is clicked", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(
      <Drawer isOpen onClose={onClose}>
        content
      </Drawer>
    );
    const closeBtn = document.querySelector(".nq-drawer-close") as HTMLElement;
    await user.click(closeBtn);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("locks body scroll while open and restores it on close", () => {
    const { rerender } = render(
      <Drawer isOpen onClose={vi.fn()}>
        content
      </Drawer>
    );
    expect(document.body.style.overflow).toBe("hidden");

    rerender(
      <Drawer isOpen={false} onClose={vi.fn()}>
        content
      </Drawer>
    );
    expect(document.body.style.overflow).toBe("");
  });
});
