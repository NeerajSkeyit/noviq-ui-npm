import React from "react";
import { describe, it, expect } from "vitest";
import { renderHook } from "@testing-library/react";
import { NoviqUIConfigProvider } from "../config/NoviqUIConfigProvider";
import { useDateTimeFormatters, useDateTimeFormats, useConfiguredTimePattern } from "./useDateTimeFormats";
import type { NoviqUIFormats } from "../config/types";

const wrap = (formats?: NoviqUIFormats) =>
  function Wrapper({ children }: { children: React.ReactNode }) {
    return <NoviqUIConfigProvider config={{ formats }}>{children}</NoviqUIConfigProvider>;
  };

describe("useDateTimeFormats", () => {
  it("returns the defaults outside any provider", () => {
    const { result } = renderHook(() => useDateTimeFormats());
    expect(result.current).toEqual({ date: "DD/MM/YYYY", time: "hh:mm A", dateTime: "DD/MM/YYYY hh:mm A" });
  });

  it("returns the provider's patterns, deriving date-time from them", () => {
    const { result } = renderHook(() => useDateTimeFormats(), {
      wrapper: wrap({ date: "YYYY-MM-DD", time: "HH:mm" }),
    });
    expect(result.current.dateTime).toBe("YYYY-MM-DD HH:mm");
  });

  it("is referentially stable when an inline config is re-created with the same strings", () => {
    const formats = { date: "YYYY-MM-DD" };
    const { result, rerender } = renderHook(() => useDateTimeFormats(), { wrapper: wrap(formats) });
    const first = result.current;
    rerender();
    expect(result.current).toBe(first);
  });
});

describe("useConfiguredTimePattern", () => {
  it("is undefined unless the app set a time format", () => {
    expect(renderHook(() => useConfiguredTimePattern()).result.current).toBeUndefined();
    expect(
      renderHook(() => useConfiguredTimePattern(), { wrapper: wrap({ date: "YYYY-MM-DD" }) }).result.current
    ).toBeUndefined();
    expect(
      renderHook(() => useConfiguredTimePattern(), { wrapper: wrap({ time: "HH:mm" }) }).result.current
    ).toBe("HH:mm");
  });
});

describe("useDateTimeFormatters (for the app's own UI)", () => {
  it("formats with the configured patterns", () => {
    const { result } = renderHook(() => useDateTimeFormatters(), {
      wrapper: wrap({ date: "DD MMM YYYY", time: "HH:mm", dateTime: "DD MMM YYYY, HH:mm" }),
    });
    expect(result.current.formatDate("2024-03-05")).toBe("05 Mar 2024");
    expect(result.current.formatTime("2024-03-05T14:30:00")).toBe("14:30");
    expect(result.current.formatDateTime("2024-03-05T14:30:00")).toBe("05 Mar 2024, 14:30");
  });

  it("honours isUtc and returns unreadable values as they were", () => {
    const { result } = renderHook(() => useDateTimeFormatters());
    expect(result.current.formatDateTime("2024-03-05T23:30:00", { isUtc: true })).toBe("05/03/2024 11:30 PM");
    expect(result.current.formatDate("whenever")).toBe("whenever");
  });
});
