import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { NoviqUIConfigProvider, useNoviqUIConfig } from "./NoviqUIConfigProvider";
import type { NoviqUIConfig } from "./types";

function Probe() {
  const config = useNoviqUIConfig();
  return (
    <pre data-testid="config">{JSON.stringify(config, (_k, v) => (typeof v === "function" ? "[fn]" : v))}</pre>
  );
}
const seen = () => JSON.parse(screen.getByTestId("config").textContent ?? "null");
const mount = (statuses: unknown) =>
  render(
    <NoviqUIConfigProvider config={{ statuses } as unknown as NoviqUIConfig}>
      <Probe />
    </NoviqUIConfigProvider>
  );

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {}); // React logs a throwing render
});
afterEach(() => vi.restoreAllMocks());

describe("config.statuses — validation", () => {
  it("accepts every documented shape", () => {
    expect(() =>
      mount({
        styles: { a: "my-a", b: { className: "my-b" }, c: { label: "See" }, d: { className: "my-d", label: "Dee" } },
        fallback: "my-neutral",
        render: () => null,
      })
    ).not.toThrow();
  });

  it("accepts an empty object, and no statuses at all", () => {
    expect(() => mount({})).not.toThrow();
    expect(() => render(<NoviqUIConfigProvider config={{}}><Probe /></NoviqUIConfigProvider>)).not.toThrow();
  });

  it.each([[null], ["x"], [3], [[]]])("statuses must be an object — got %j", (value) => {
    expect(() => mount(value)).toThrow(/config\.statuses must be an object/);
  });

  it.each([["x"], [[]], [3]])("styles must be an object of statuses — got %j", (styles) => {
    expect(() => mount({ styles })).toThrow(/config\.statuses\.styles must be an object/);
  });

  it.each([[3], [true], [[]], [null]])("a status's style must be a class name or { className, label } — got %j", (style) => {
    expect(() => mount({ styles: { draft: style } })).toThrow(/config\.statuses\.styles\.draft/);
  });

  it.each([[{ className: 3 }], [{ label: {} }], [{ className: "a", label: false }]])(
    "a style's className and label must be strings — got %j",
    (style) => {
      expect(() => mount({ styles: { draft: style } })).toThrow(/config\.statuses\.styles\.draft/);
    }
  );

  it.each([[3], [{}], [true]])("fallback must be a class name — got %j", (fallback) => {
    expect(() => mount({ fallback })).toThrow(/config\.statuses\.fallback/);
  });

  it.each([["x"], [{}], [3]])("render must be a function — got %j", (renderFn) => {
    expect(() => mount({ render: renderFn })).toThrow(/config\.statuses\.render/);
  });

  it("names the offending status in the message", () => {
    expect(() => mount({ styles: { shipped: 5 } })).toThrow(/styles\.shipped/);
  });
});

describe("config.statuses — nested providers", () => {
  const parent: NoviqUIConfig = {
    statuses: { styles: { draft: "p-draft", shipped: { className: "p-ship", label: "Shipped" } }, fallback: "p-neutral", render: () => null },
  };

  it("without inherit, the child replaces the parent's statuses whole", () => {
    render(
      <NoviqUIConfigProvider config={parent}>
        <NoviqUIConfigProvider config={{ statuses: { styles: { draft: "c-draft" } } }}>
          <Probe />
        </NoviqUIConfigProvider>
      </NoviqUIConfigProvider>
    );
    expect(seen().statuses).toEqual({ styles: { draft: "c-draft" } });
  });

  it("with inherit, styles merge status by status and the child's fallback / render replace", () => {
    render(
      <NoviqUIConfigProvider config={parent}>
        <NoviqUIConfigProvider inherit config={{ statuses: { styles: { draft: "c-draft", odd: "c-odd" }, fallback: "c-neutral" } }}>
          <Probe />
        </NoviqUIConfigProvider>
      </NoviqUIConfigProvider>
    );
    expect(seen().statuses).toEqual({
      styles: { draft: "c-draft", shipped: { className: "p-ship", label: "Shipped" }, odd: "c-odd" },
      fallback: "c-neutral",
      render: "[fn]", // the parent's, kept: the child set none
    });
  });

  it("with inherit, a status merges field by field: a new class keeps the parent's label", () => {
    render(
      <NoviqUIConfigProvider config={parent}>
        <NoviqUIConfigProvider inherit config={{ statuses: { styles: { shipped: "c-ship", draft: { label: "Draft!" } } } }}>
          <Probe />
        </NoviqUIConfigProvider>
      </NoviqUIConfigProvider>
    );
    expect(seen().statuses.styles.shipped).toEqual({ className: "c-ship", label: "Shipped" });
    expect(seen().statuses.styles.draft).toEqual({ className: "p-draft", label: "Draft!" }); // string base + object over
  });

  it("with inherit and no statuses of its own, the parent's come through untouched", () => {
    render(
      <NoviqUIConfigProvider config={parent}>
        <NoviqUIConfigProvider inherit config={{ text: { tableEmpty: "Nothing" } }}>
          <Probe />
        </NoviqUIConfigProvider>
      </NoviqUIConfigProvider>
    );
    expect(seen().statuses.styles.draft).toBe("p-draft");
  });

  it("an inherited child's undefined fields never wipe the parent's", () => {
    render(
      <NoviqUIConfigProvider config={parent}>
        <NoviqUIConfigProvider inherit config={{ statuses: { styles: undefined, fallback: undefined } }}>
          <Probe />
        </NoviqUIConfigProvider>
      </NoviqUIConfigProvider>
    );
    expect(seen().statuses.fallback).toBe("p-neutral");
    expect(seen().statuses.styles.draft).toBe("p-draft");
  });

  it("validates the merged result too", () => {
    expect(() =>
      render(
        <NoviqUIConfigProvider config={parent}>
          <NoviqUIConfigProvider inherit config={{ statuses: { styles: { bad: 5 as unknown as string } } }}>
            <Probe />
          </NoviqUIConfigProvider>
        </NoviqUIConfigProvider>
      )
    ).toThrow(/styles\.bad/);
  });
});
