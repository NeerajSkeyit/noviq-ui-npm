import React from "react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { NoviqUIConfigProvider } from "../config/NoviqUIConfigProvider";
import { useText } from "./useText";
import { DEFAULT_TEXT } from "../constants";
import type { NoviqUIText } from "../config/types";

const wrap = (text?: Partial<NoviqUIText>) =>
  function Wrapper({ children }: { children: React.ReactNode }) {
    return <NoviqUIConfigProvider config={{ text }}>{children}</NoviqUIConfigProvider>;
  };

afterEach(() => vi.restoreAllMocks());

describe("useText", () => {
  it("returns the English defaults outside any provider", () => {
    const { result } = renderHook(() => useText());
    expect(result.current("tableEmpty")).toBe("No data found");
    expect(result.current("paginationSummary", { start: 1, end: 10, total: 25 })).toBe(
      "Showing 1 to 10 of 25 results"
    );
  });

  it("returns the defaults under a provider that sets no text", () => {
    const { result } = renderHook(() => useText(), { wrapper: wrap(undefined) });
    expect(result.current("bulkClear")).toBe(DEFAULT_TEXT.bulkClear);
  });

  it("overrides only the keys the provider sets", () => {
    const { result } = renderHook(() => useText(), {
      wrapper: wrap({ tableEmpty: "Sin datos", paginationPage: "Página {page} de {pages}" }),
    });
    expect(result.current("tableEmpty")).toBe("Sin datos");
    expect(result.current("paginationPage", { page: 2, pages: 5 })).toBe("Página 2 de 5");
    expect(result.current("bulkClear")).toBe("Clear");
  });

  it("accepts a function for a key", () => {
    const { result } = renderHook(() => useText(), {
      wrapper: wrap({
        bulkSelected: ({ count }) => `${count} filas`,
      }),
    });
    expect(result.current("bulkSelected", { count: 3 })).toBe("3 filas");
  });

  it("is referentially stable across re-renders while the text is unchanged", () => {
    const text = { tableEmpty: "Sin datos" };
    const { result, rerender } = renderHook(() => useText(), { wrapper: wrap(text) });
    const first = result.current;
    rerender();
    expect(result.current).toBe(first);
  });

  it("follows a change of text", () => {
    let text: Partial<NoviqUIText> = { tableEmpty: "Uno" };
    const Wrapper = ({ children }: { children: React.ReactNode }) => (
      <NoviqUIConfigProvider config={{ text }}>{children}</NoviqUIConfigProvider>
    );
    const { result, rerender } = renderHook(() => useText(), { wrapper: Wrapper });
    expect(result.current("tableEmpty")).toBe("Uno");
    text = { tableEmpty: "Dos" };
    rerender();
    expect(result.current("tableEmpty")).toBe("Dos");
  });
});

describe("DEFAULT_TEXT", () => {
  it("has a non-empty string for every key", () => {
    for (const [key, value] of Object.entries(DEFAULT_TEXT)) {
      expect(typeof value, key).toBe("string");
      expect(value.length, key).toBeGreaterThan(0);
    }
  });

  it("only uses placeholders made of letters", () => {
    for (const [key, value] of Object.entries(DEFAULT_TEXT)) {
      for (const [, name] of value.matchAll(/\{([^}]*)\}/g)) {
        expect(name, key).toMatch(/^[A-Za-z]+$/);
      }
    }
  });
});
