import React, { createRef } from "react";
import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import * as Icons from "./Icon";
import { ICON_NODES } from "./icons";

const svgOf = (ui: React.ReactElement) => render(ui).container.querySelector("svg") as SVGSVGElement;

describe("Icon", () => {
  it("exports a component for every icon it has the shapes of", () => {
    for (const name of Object.keys(ICON_NODES)) {
      expect(typeof (Icons as Record<string, unknown>)[name], name).toBe("object"); // forwardRef component
    }
  });

  it("draws every one of them: at least one shape, no stray attributes", () => {
    for (const name of Object.keys(ICON_NODES) as (keyof typeof ICON_NODES)[]) {
      const Icon = Icons[name];
      const svg = svgOf(<Icon />);
      expect(svg.children.length, name).toBeGreaterThan(0);
      expect([...svg.children].every((c) => ["path", "rect", "circle", "line", "polyline", "polygon", "ellipse"].includes(c.tagName)), name).toBe(true);
    }
  });

  it("is a 24×24, 2px, round-capped, currentColor outline by default", () => {
    const svg = svgOf(<Icons.Search />);
    expect(svg.getAttribute("width")).toBe("24");
    expect(svg.getAttribute("height")).toBe("24");
    expect(svg.getAttribute("viewBox")).toBe("0 0 24 24");
    expect(svg.getAttribute("fill")).toBe("none");
    expect(svg.getAttribute("stroke")).toBe("currentColor");
    expect(svg.getAttribute("stroke-width")).toBe("2");
    expect(svg.getAttribute("stroke-linecap")).toBe("round");
    expect(svg.getAttribute("stroke-linejoin")).toBe("round");
  });

  it("takes a size and a stroke width", () => {
    const svg = svgOf(<Icons.Calendar size={14} strokeWidth={2.5} />);
    expect(svg.getAttribute("width")).toBe("14");
    expect(svg.getAttribute("height")).toBe("14");
    expect(svg.getAttribute("stroke-width")).toBe("2.5");
  });

  it("carries no class of its own — nothing generic for a host's CSS to match", () => {
    expect(svgOf(<Icons.X />).getAttribute("class")).toBeNull();
    expect(svgOf(<Icons.X className="nq-mine" />).getAttribute("class")).toBe("nq-mine");
  });

  it("is hidden from assistive technology unless it is given a name", () => {
    expect(svgOf(<Icons.X />).getAttribute("aria-hidden")).toBe("true");
    expect(svgOf(<Icons.X aria-label="Close" />).hasAttribute("aria-hidden")).toBe(false);
    expect(svgOf(<Icons.X role="img" />).hasAttribute("aria-hidden")).toBe(false);
    expect(svgOf(<Icons.X aria-hidden={false} />).getAttribute("aria-hidden")).toBe("false");
  });

  it("forwards a ref to the <svg>", () => {
    const ref = createRef<SVGSVGElement>();
    render(<Icons.Eye ref={ref} />);
    expect(ref.current?.tagName.toLowerCase()).toBe("svg");
  });
});
