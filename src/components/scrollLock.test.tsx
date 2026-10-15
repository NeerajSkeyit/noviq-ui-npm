import React, { StrictMode, useState } from "react";
import { describe, it, expect, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Modal from "./Modal/Modal";
import Drawer from "./Drawer/Drawer";

// Both overlays lock page scroll while open. The lock is shared, so one overlay closing must not
// unlock the page under another that is still open, and a *closed* overlay must never unlock it.

const lock = () => document.body.style.overflow;

afterEach(() => {
  document.body.style.overflow = "";
});

describe("body scroll lock", () => {
  it("a Modal locks while open and releases on close", () => {
    const { rerender } = render(<Modal isOpen onClose={() => {}} title="M" />);
    expect(lock()).toBe("hidden");
    rerender(<Modal isOpen={false} onClose={() => {}} title="M" />);
    expect(lock()).toBe("");
  });

  it("a Drawer locks while open and releases on close", () => {
    const { rerender } = render(<Drawer isOpen onClose={() => {}} title="D" />);
    expect(lock()).toBe("hidden");
    rerender(<Drawer isOpen={false} onClose={() => {}} title="D" />);
    expect(lock()).toBe("");
  });

  it("restores whatever overflow the page had before, not just the empty string", () => {
    document.body.style.overflow = "scroll";
    const { rerender } = render(<Modal isOpen onClose={() => {}} title="M" />);
    expect(lock()).toBe("hidden");
    rerender(<Modal isOpen={false} onClose={() => {}} title="M" />);
    expect(lock()).toBe("scroll");
  });

  it("closing a nested Drawer keeps the page locked under the open Modal", async () => {
    const user = userEvent.setup();
    function Both() {
      const [drawer, setDrawer] = useState(false);
      return (
        <>
          <Modal isOpen onClose={() => {}} title="M">
            <button onClick={() => setDrawer(true)}>open drawer</button>
          </Modal>
          <Drawer
            isOpen={drawer}
            onClose={() => setDrawer(false)}
            title="D"
            footer={<button onClick={() => setDrawer(false)}>close drawer</button>}
          />
        </>
      );
    }
    render(<Both />);
    await user.click(screen.getByText("open drawer"));
    expect(lock()).toBe("hidden");

    await user.click(screen.getByText("close drawer"));
    expect(lock()).toBe("hidden"); // the Modal is still open
  });

  it("a closed Drawer mounted after an open Modal does not cancel the Modal's lock", () => {
    // Every Table mounts hidden drawers; they must not undo a lock they didn't take.
    render(
      <>
        <Modal isOpen onClose={() => {}} title="M" />
        <Drawer isOpen={false} onClose={() => {}} title="D" />
        <Drawer isOpen={false} onClose={() => {}} title="D2" />
      </>
    );
    expect(lock()).toBe("hidden");
  });

  it("stays locked until the last of several open overlays closes", () => {
    const { rerender } = render(
      <>
        <Modal isOpen onClose={() => {}} title="A" />
        <Drawer isOpen onClose={() => {}} title="B" />
      </>
    );
    expect(lock()).toBe("hidden");

    rerender(
      <>
        <Modal isOpen={false} onClose={() => {}} title="A" />
        <Drawer isOpen onClose={() => {}} title="B" />
      </>
    );
    expect(lock()).toBe("hidden");

    rerender(
      <>
        <Modal isOpen={false} onClose={() => {}} title="A" />
        <Drawer isOpen={false} onClose={() => {}} title="B" />
      </>
    );
    expect(lock()).toBe("");
  });

  it("releases on unmount, including under StrictMode's double effects", () => {
    const { unmount } = render(
      <StrictMode>
        <Modal isOpen onClose={() => {}} title="M" />
      </StrictMode>
    );
    expect(lock()).toBe("hidden");
    unmount();
    expect(lock()).toBe("");
  });
});
