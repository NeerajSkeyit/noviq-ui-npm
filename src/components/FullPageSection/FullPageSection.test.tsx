import React from "react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import FullPageSection from "./FullPageSection";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("FullPageSection", () => {
  it("renders the title as the page heading, the subtitle and the children", () => {
    render(
      <FullPageSection title="Add location" subtitle="Where people work">
        <p>form goes here</p>
      </FullPageSection>
    );
    expect(screen.getByRole("heading", { level: 1, name: "Add location" })).toBeInTheDocument();
    expect(screen.getByText("Where people work")).toBeInTheDocument();
    expect(screen.getByText("form goes here")).toBeInTheDocument();
  });

  it("omits the subtitle when none is given", () => {
    render(<FullPageSection title="T" />);
    expect(document.querySelector(".full-page-section-subtitle")).toBeNull();
  });

  describe("back", () => {
    it("calls onBack from the back arrow", async () => {
      const user = userEvent.setup();
      const onBack = vi.fn();
      render(<FullPageSection title="T" onBack={onBack} />);
      await user.click(screen.getByRole("button", { name: "Back" }));
      expect(onBack).toHaveBeenCalledTimes(1);
    });

    it("falls back to history.back() when no onBack is given (no router needed)", async () => {
      const user = userEvent.setup();
      const back = vi.spyOn(window.history, "back").mockImplementation(() => {});
      render(<FullPageSection title="T" />);
      await user.click(screen.getByRole("button", { name: "Back" }));
      expect(back).toHaveBeenCalledTimes(1);
    });
  });

  describe("default footer", () => {
    it("has Cancel and Submit buttons, with overridable labels", () => {
      const { rerender } = render(<FullPageSection title="T" />);
      expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Submit" })).toBeInTheDocument();

      rerender(<FullPageSection title="T" cancelLabel="Discard" submitLabel="Update" />);
      expect(screen.getByRole("button", { name: "Discard" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Update" })).toBeInTheDocument();
    });

    it("Submit calls onSubmit; Cancel calls onCancel", async () => {
      const user = userEvent.setup();
      const onSubmit = vi.fn();
      const onCancel = vi.fn();
      render(<FullPageSection title="T" onSubmit={onSubmit} onCancel={onCancel} />);
      await user.click(screen.getByRole("button", { name: "Submit" }));
      await user.click(screen.getByRole("button", { name: "Cancel" }));
      expect(onSubmit).toHaveBeenCalledTimes(1);
      expect(onCancel).toHaveBeenCalledTimes(1);
    });

    it("Cancel falls back to onBack when there is no onCancel", async () => {
      const user = userEvent.setup();
      const onBack = vi.fn();
      render(<FullPageSection title="T" onBack={onBack} />);
      await user.click(screen.getByRole("button", { name: "Cancel" }));
      expect(onBack).toHaveBeenCalledTimes(1);
    });

    it("while loading: disables both buttons and shows the loading label", async () => {
      const user = userEvent.setup();
      const onSubmit = vi.fn();
      render(<FullPageSection title="T" loading onSubmit={onSubmit} />);
      expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled();
      const submit = screen.getByRole("button", { name: "Saving..." });
      expect(submit).toBeDisabled();
      await user.click(submit);
      expect(onSubmit).not.toHaveBeenCalled();
    });

    it("lets the loading label be overridden", () => {
      render(<FullPageSection title="T" loading loadingLabel="Please wait" />);
      expect(screen.getByRole("button", { name: "Please wait" })).toBeInTheDocument();
    });
  });

  it("a custom footer replaces the default one entirely", () => {
    render(<FullPageSection title="T" footer={<button>Save draft</button>} />);
    expect(screen.getByRole("button", { name: "Save draft" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Cancel" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Submit" })).not.toBeInTheDocument();
  });
});
