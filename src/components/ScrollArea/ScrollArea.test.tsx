import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import ScrollArea from "./ScrollArea";

describe("ScrollArea", () => {
  it("renders children inside the scroll viewport", () => {
    render(
      <ScrollArea>
        <p>Scrollable content</p>
      </ScrollArea>
    );
    const content = screen.getByText("Scrollable content");
    expect(content).toBeInTheDocument();
    expect(content.parentElement?.className).toContain("scrollAreaViewport");
  });

  it("applies a custom className to the root element", () => {
    const { container } = render(
      <ScrollArea className="custom-scroll">content</ScrollArea>
    );
    expect(container.firstElementChild?.className).toContain("custom-scroll");
    expect(container.firstElementChild?.className).toContain("scrollAreaRoot");
  });

  it("applies inline styles to the root element", () => {
    const { container } = render(
      <ScrollArea style={{ maxHeight: 200 }}>content</ScrollArea>
    );
    expect((container.firstElementChild as HTMLElement).style.maxHeight).toBe("200px");
  });
});
