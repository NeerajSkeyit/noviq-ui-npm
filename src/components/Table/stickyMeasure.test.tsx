import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Table, { type TableColumn } from "./Table";

interface Row {
  id: number;
  a: string;
  b: string;
  c: string;
  d: string;
}
const rows: Row[] = [{ id: 1, a: "a1", b: "b1", c: "c1", d: "d1" }];

/** What the browser would lay out, by header text. jsdom has no layout, so it is stubbed. */
let widths: Record<string, number> = {};

function stubLayout() {
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (this: HTMLElement) {
    const width = this.tagName === "TH" ? (widths[this.textContent?.trim() ?? ""] ?? 0) : 0;
    return { width, height: 0, top: 0, left: 0, right: width, bottom: 0, x: 0, y: 0, toJSON: () => ({}) } as DOMRect;
  });
}

let observers: { callback: () => void; observed: Element[] }[] = [];
class FakeResizeObserver {
  entry = { callback: () => {}, observed: [] as Element[] };
  constructor(callback: () => void) {
    this.entry.callback = callback;
    observers.push(this.entry);
  }
  observe(el: Element) {
    this.entry.observed.push(el);
  }
  unobserve() {}
  disconnect() {
    observers = observers.filter((o) => o !== this.entry);
  }
}

beforeEach(() => {
  widths = {};
  observers = [];
  stubLayout();
  vi.stubGlobal("ResizeObserver", FakeResizeObserver);
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  window.localStorage.clear();
});

const col = (id: keyof Row, extra: Partial<TableColumn<Row>> = {}): TableColumn<Row> => ({
  id,
  heading: id.toUpperCase(),
  accessorKey: id,
  ...extra,
});
const th = (text: string) => screen.getAllByRole("columnheader").find((h) => h.textContent?.trim() === text)!;
const cell = (text: string) => screen.getAllByRole("cell").find((c) => c.textContent === text)!;

describe("sticky offsets are measured, not guessed from `width`", () => {
  it("offsets a pinned column by the real width of the one before it", () => {
    widths = { A: 96, B: 210 };
    render(
      <Table
        columns={[col("a", { sticky: "left" }), col("b", { sticky: "left", width: 200 }), col("c")]}
        preFetchedData={rows}
        isPaginationHidden
        isColumnSettingHidden
      />
    );
    expect(th("A").style.left).toBe("0px");
    expect(th("B").style.left).toBe("96px"); // A is 96 wide, not the 140 it would be assumed to be
    expect(cell("b1").style.left).toBe("96px"); // body cells follow the header
  });

  it("measures from the right edge too", () => {
    widths = { C: 80, D: 130 };
    render(
      <Table
        columns={[col("a"), col("c", { sticky: "right" }), col("d", { sticky: "right" })]}
        preFetchedData={rows}
        isPaginationHidden
        isColumnSettingHidden
      />
    );
    expect(th("D").style.right).toBe("0px");
    expect(th("C").style.right).toBe("130px");
  });

  it("falls back to the declared width, then the default, for a column it could not measure", () => {
    widths = {}; // nothing measurable, as in a hidden container
    render(
      <Table
        columns={[col("a", { sticky: "left", width: 120 }), col("b", { sticky: "left" }), col("c")]}
        preFetchedData={rows}
        isPaginationHidden
        isColumnSettingHidden
      />
    );
    expect(th("B").style.left).toBe("120px");
    // C is not pinned: its width never matters
    expect(th("C").style.left).toBe("");
  });

  it("uses a measured width for one column and the declared one for another", () => {
    widths = { A: 77 };
    render(
      <Table
        columns={[col("a", { sticky: "left" }), col("b", { sticky: "left", width: 150 }), col("c", { sticky: "left" })]}
        preFetchedData={rows}
        isPaginationHidden
        isColumnSettingHidden
      />
    );
    expect(th("B").style.left).toBe("77px");
    expect(th("C").style.left).toBe("227px"); // 77 measured + 150 declared (B was not measured)
  });

  it("measures again when the table is resized", () => {
    widths = { A: 100 };
    render(
      <Table
        columns={[col("a", { sticky: "left" }), col("b", { sticky: "left" })]}
        preFetchedData={rows}
        isPaginationHidden
        isColumnSettingHidden
      />
    );
    expect(th("B").style.left).toBe("100px");

    widths = { A: 160 };
    expect(observers.length).toBeGreaterThan(0);
    act(() => observers.forEach((o) => o.callback()));
    expect(th("B").style.left).toBe("160px");
  });

  it("measures again when a column is pinned from the Columns chooser", async () => {
    const user = userEvent.setup();
    widths = { A: 90, B: 60 };
    render(
      <Table columns={[col("a", { sticky: "left" }), col("b"), col("c")]} preFetchedData={rows} isPaginationHidden />
    );
    expect(th("A").style.left).toBe("0px");
    expect(th("B").style.left).toBe(""); // not pinned yet

    await user.click(screen.getByRole("button", { name: /Columns/ }));
    await user.click(screen.getAllByTitle("Pin column")[0]); // the first unpinned column in the list: B
    expect(th("B").style.left).toBe("90px"); // right after A's measured width
  });

  it("does nothing, and observes nothing, when no column is pinned", () => {
    widths = { A: 100, B: 100 };
    render(<Table columns={[col("a"), col("b")]} preFetchedData={rows} isPaginationHidden isColumnSettingHidden />);
    expect(th("A").style.position).toBe("");
    expect(observers.every((o) => o.observed.length === 0)).toBe(true);
  });

  it("works without ResizeObserver (older environments)", () => {
    vi.unstubAllGlobals();
    delete (globalThis as { ResizeObserver?: unknown }).ResizeObserver;
    widths = { A: 100 };
    render(
      <Table columns={[col("a", { sticky: "left" }), col("b", { sticky: "left" })]} preFetchedData={rows} isPaginationHidden isColumnSettingHidden />
    );
    expect(th("B").style.left).toBe("100px");
  });

  it("stops observing when the table unmounts", () => {
    widths = { A: 100 };
    const { unmount } = render(
      <Table columns={[col("a", { sticky: "left" }), col("b")]} preFetchedData={rows} isPaginationHidden isColumnSettingHidden />
    );
    expect(observers.length).toBeGreaterThan(0);
    unmount();
    expect(observers).toHaveLength(0);
  });
});
