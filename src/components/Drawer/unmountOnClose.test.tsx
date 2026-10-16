import React, { useState } from "react";
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import Drawer from "./Drawer";
import Table from "../Table/Table";
import { DRAWER_EXIT_MS, FILTER_TYPE } from "../../constants";

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
  document.body.style.overflow = "";
});

const body = () => screen.queryByTestId("body");
const settle = (ms = DRAWER_EXIT_MS) => act(() => void vi.advanceTimersByTime(ms));

function Harness({ initial = false, ...props }: { initial?: boolean } & Partial<React.ComponentProps<typeof Drawer>>) {
  const [open, setOpen] = useState(initial);
  return (
    <>
      <button onClick={() => setOpen((o) => !o)}>toggle</button>
      <Drawer isOpen={open} onClose={() => setOpen(false)} footer={<span data-testid="footer">f</span>} {...props}>
        <input data-testid="body" defaultValue="" />
      </Drawer>
    </>
  );
}
const toggle = () => act(() => screen.getByRole("button", { name: "toggle" }).click());

describe("<Drawer unmountOnClose>", () => {
  it("by default a closed drawer keeps its children mounted, hidden — as before", () => {
    render(<Harness />);
    expect(body()).toBeInTheDocument();
    expect(document.querySelector(".drawer-content")).toHaveAttribute("aria-hidden", "true");
  });

  it("does not mount its children while it has never been open", () => {
    render(<Harness unmountOnClose />);
    expect(body()).not.toBeInTheDocument();
    expect(screen.queryByTestId("footer")).not.toBeInTheDocument();
  });

  it("mounts them the moment it opens", () => {
    render(<Harness unmountOnClose />);
    toggle();
    expect(body()).toBeInTheDocument();
    expect(screen.getByTestId("footer")).toBeInTheDocument();
  });

  it("keeps them through the slide-out, then removes them", () => {
    render(<Harness unmountOnClose initial />);
    expect(body()).toBeInTheDocument();
    toggle(); // close
    expect(body()).toBeInTheDocument(); // still there while the panel slides away
    settle(DRAWER_EXIT_MS - 10);
    expect(body()).toBeInTheDocument();
    settle(20);
    expect(body()).not.toBeInTheDocument();
    expect(screen.queryByTestId("footer")).not.toBeInTheDocument();
  });

  it("reopening during the slide-out keeps the same children, and the pending removal is cancelled", () => {
    render(<Harness unmountOnClose initial />);
    const before = body();
    toggle(); // close
    settle(100);
    toggle(); // reopen
    expect(body()).toBe(before);
    settle(DRAWER_EXIT_MS * 2);
    expect(body()).toBe(before);
  });

  it("keeps the children through the slide-out of a drawer that was closed when it mounted", () => {
    render(<Harness unmountOnClose />);
    toggle(); // open
    toggle(); // close
    expect(body()).toBeInTheDocument(); // not removed the instant it closes
    settle();
    expect(body()).not.toBeInTheDocument();
  });

  it("a cancelled removal stays cancelled: closing again later still waits out the slide", () => {
    render(<Harness unmountOnClose initial />);
    toggle(); // close — schedules a removal
    settle(100);
    toggle(); // reopen — cancels it
    settle(DRAWER_EXIT_MS * 2); // the old timer's moment passes
    toggle(); // close again
    expect(body()).toBeInTheDocument();
    settle();
    expect(body()).not.toBeInTheDocument();
  });

  it("a reopened drawer starts fresh: state inside it did not survive", () => {
    render(<Harness unmountOnClose initial />);
    (body() as HTMLInputElement).value = "typed";
    toggle();
    settle();
    toggle();
    expect((body() as HTMLInputElement).value).toBe("");
  });

  it("clears its timer when it unmounts", () => {
    const { unmount } = render(<Harness unmountOnClose initial />);
    toggle();
    unmount();
    expect(() => settle()).not.toThrow();
    expect(vi.getTimerCount()).toBe(0);
  });
});

describe("<Table>'s own drawers", () => {
  it("do not mount their contents until opened", () => {
    render(
      <Table
        columns={[{ id: "a", heading: "A", accessorKey: "a" }]}
        preFetchedData={[{ a: "x" }]}
        filterConfigs={[{ id: "s", label: "S", type: FILTER_TYPE.SELECT, options: [{ value: "1", label: "One" }] }]}
        isPaginationHidden
      />
    );
    expect(document.querySelector(".column-selector-list")).toBeNull();
    expect(document.querySelector(".filter-drawer-sections")).toBeNull();
  });
});

describe("DRAWER_EXIT_MS", () => {
  it("matches the slide-out transition in Drawer.css", async () => {
    vi.useRealTimers();
    const { readFileSync } = await import("node:fs");
    const { resolve } = await import("node:path");
    const css = readFileSync(resolve(process.cwd(), "src/components/Drawer/Drawer.css"), "utf8");
    const seconds = /\.drawer-content\s*\{[^}]*transition:\s*transform\s+([\d.]+)s/.exec(css)?.[1];
    expect(Number(seconds) * 1000).toBe(DRAWER_EXIT_MS);
  });
});
