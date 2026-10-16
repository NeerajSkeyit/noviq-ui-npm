import React from "react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Modal from "./Modal";

afterEach(() => {
  cleanup();
  document.body.style.overflow = "";
});

describe("Modal", () => {
  it("renders nothing when closed", () => {
    render(
      <Modal isOpen={false} onClose={vi.fn()} title="My Modal">
        Body content
      </Modal>
    );
    expect(screen.queryByText("My Modal")).not.toBeInTheDocument();
    expect(document.querySelector(".nq-modal-overlay")).not.toBeInTheDocument();
  });

  it("renders title, subtitle, children and footer when open", () => {
    render(
      <Modal
        isOpen
        onClose={vi.fn()}
        title="My Modal"
        subtitle="Subtitle text"
        footer={<button>Save</button>}
      >
        Body content
      </Modal>
    );
    expect(screen.getByText("My Modal")).toBeInTheDocument();
    expect(screen.getByText("Subtitle text")).toBeInTheDocument();
    expect(screen.getByText("Body content")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save" })).toBeInTheDocument();
  });

  it("calls onClose on ESC regardless of closeOnOutside", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(
      <Modal isOpen onClose={onClose} closeOnOutside={false}>
        content
      </Modal>
    );
    await user.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("calls onClose when clicking the backdrop and closeOnOutside is true", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(
      <Modal isOpen onClose={onClose} closeOnOutside>
        content
      </Modal>
    );
    const backdrop = document.querySelector(".nq-modal-backdrop") as HTMLElement;
    await user.click(backdrop);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("does not call onClose when clicking the backdrop and closeOnOutside is false", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(
      <Modal isOpen onClose={onClose} closeOnOutside={false}>
        content
      </Modal>
    );
    const backdrop = document.querySelector(".nq-modal-backdrop") as HTMLElement;
    await user.click(backdrop);
    expect(onClose).not.toHaveBeenCalled();
  });

  it("calls onClose when the close button is clicked", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(
      <Modal isOpen onClose={onClose}>
        content
      </Modal>
    );
    const closeBtn = document.querySelector(".nq-modal-close") as HTMLElement;
    await user.click(closeBtn);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("does not close when clicking inside the modal content", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(
      <Modal isOpen onClose={onClose}>
        <p>content</p>
      </Modal>
    );
    await user.click(screen.getByText("content"));
    expect(onClose).not.toHaveBeenCalled();
  });

  it("locks body scroll while open and restores it on close", () => {
    const { rerender } = render(
      <Modal isOpen onClose={vi.fn()}>
        content
      </Modal>
    );
    expect(document.body.style.overflow).toBe("hidden");

    rerender(
      <Modal isOpen={false} onClose={vi.fn()}>
        content
      </Modal>
    );
    expect(document.body.style.overflow).toBe("");
  });
});
