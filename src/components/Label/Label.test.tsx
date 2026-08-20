import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import Label from "./Label";

describe("Label", () => {
  it("renders children", () => {
    render(<Label htmlFor="field">Name</Label>);
    expect(screen.getByText("Name")).toBeInTheDocument();
  });

  it("associates with a field via htmlFor", () => {
    render(<Label htmlFor="field">Name</Label>);
    expect(screen.getByText("Name")).toHaveAttribute("for", "field");
  });

  it("applies the disabled class when disabled", () => {
    render(<Label disabled>Name</Label>);
    expect(screen.getByText("Name").className).toContain("label-disabled");
  });

  it("applies a custom className", () => {
    render(<Label className="custom">Name</Label>);
    expect(screen.getByText("Name").className).toContain("custom");
  });
});
