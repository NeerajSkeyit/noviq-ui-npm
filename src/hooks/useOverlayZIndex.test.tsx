import React, { useState } from "react";
import { describe, it, expect } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { useOverlayZIndex } from "./useOverlayZIndex";
import { OVERLAY_Z_STEP } from "../constants";

/** A stand-in overlay that shows the z-index it was given. */
function Layer({ name, open }: { name: string; open: boolean }) {
  const zIndex = useOverlayZIndex(open);
  return <output data-testid={name}>{zIndex ?? "none"}</output>;
}
const z = (name: string) => screen.getByTestId(name).textContent;
const at = (depth: number) => `calc(var(--nq-z-overlay) + ${depth * OVERLAY_Z_STEP})`;

describe("useOverlayZIndex", () => {
  it("gives a closed overlay nothing", () => {
    render(<Layer name="a" open={false} />);
    expect(z("a")).toBe("none");
  });

  it("puts the first open overlay at the base of the scale", () => {
    render(<Layer name="a" open />);
    expect(z("a")).toBe(at(0));
  });

  it("stacks overlays in the order they opened, not the order they were mounted", () => {
    const { rerender } = render(
      <>
        <Layer name="first-mounted" open={false} />
        <Layer name="second-mounted" open={false} />
      </>
    );
    // The later-mounted one opens first…
    rerender(
      <>
        <Layer name="first-mounted" open={false} />
        <Layer name="second-mounted" open />
      </>
    );
    // …then the earlier-mounted one opens on top of it.
    rerender(
      <>
        <Layer name="first-mounted" open />
        <Layer name="second-mounted" open />
      </>
    );
    expect(z("second-mounted")).toBe(at(0));
    expect(z("first-mounted")).toBe(at(1));
  });

  it("keeps an overlay where it is when one beneath it closes", () => {
    const { rerender } = render(
      <>
        <Layer name="a" open />
        <Layer name="b" open />
      </>
    );
    expect(z("b")).toBe(at(1));
    rerender(
      <>
        <Layer name="a" open={false} />
        <Layer name="b" open />
      </>
    );
    expect(z("b")).toBe(at(1)); // did not drop to 0: nothing moves under the user's eyes
  });

  it("opens a new overlay above the highest still open, even after a lower one closed", () => {
    const { rerender } = render(
      <>
        <Layer name="a" open />
        <Layer name="b" open />
        <Layer name="c" open={false} />
      </>
    );
    rerender(
      <>
        <Layer name="a" open={false} />
        <Layer name="b" open />
        <Layer name="c" open={false} />
      </>
    );
    rerender(
      <>
        <Layer name="a" open={false} />
        <Layer name="b" open />
        <Layer name="c" open />
      </>
    );
    expect(z("b")).toBe(at(1));
    expect(z("c")).toBe(at(2)); // not 1: that would tie with b and leave the order to the DOM
  });

  it("keeps its last z-index just after closing, so it doesn't drop behind a lower overlay while it animates away", () => {
    const { rerender } = render(
      <>
        <Layer name="a" open />
        <Layer name="b" open />
      </>
    );
    rerender(
      <>
        <Layer name="a" open />
        <Layer name="b" open={false} />
      </>
    );
    expect(z("b")).toBe(at(1)); // still above a while it fades out
  });

  it("starts over from the base once everything has closed", () => {
    const { rerender } = render(<Layer name="a" open />);
    rerender(<Layer name="a" open={false} />);
    rerender(<Layer name="b" open />);
    expect(z("b")).toBe(at(0));
  });

  it("releases its place when it unmounts while open", () => {
    const { unmount } = render(<Layer name="a" open />);
    unmount();
    render(<Layer name="b" open />);
    expect(z("b")).toBe(at(0));
  });

  it("works across separate component trees (a modal and a drawer are not siblings)", () => {
    render(<Layer name="one" open />);
    render(<Layer name="two" open />);
    expect(z("one")).toBe(at(0));
    expect(z("two")).toBe(at(1));
  });

  it("is stable while it stays open", () => {
    function Toggle() {
      const [other, setOther] = useState(false);
      return (
        <>
          <button onClick={() => setOther(true)}>open other</button>
          <Layer name="a" open />
          <Layer name="b" open={other} />
        </>
      );
    }
    render(<Toggle />);
    expect(z("a")).toBe(at(0));
    act(() => screen.getByRole("button", { name: "open other" }).click());
    expect(z("a")).toBe(at(0));
    expect(z("b")).toBe(at(1));
  });

  it("steps by the documented amount", () => {
    expect(OVERLAY_Z_STEP).toBeGreaterThanOrEqual(2); // room for an overlay's backdrop and its panel
  });
});
