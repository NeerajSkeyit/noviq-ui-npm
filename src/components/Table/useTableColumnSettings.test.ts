import { describe, it, expect, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useTableColumnSettings } from "./useTableColumnSettings";
import type { TableColumn } from "./Table";

const columns: TableColumn[] = [
  { id: "name", heading: "Name" },
  { id: "email", heading: "Email" },
  { id: "status", heading: "Status", visible: false },
  { id: "region", heading: "Region", sticky: "left" },
];

afterEach(() => {
  window.localStorage.clear();
});

describe("useTableColumnSettings", () => {
  it("derives defaults from the columns prop", () => {
    const { result } = renderHook(() => useTableColumnSettings(undefined, columns));
    expect(result.current.visibleColumns).toEqual(["name", "email", "region"]);
    expect(result.current.columnOrder).toEqual(["name", "email", "status", "region"]);
    expect(result.current.stickyColumns).toEqual({ left: ["region"], right: [] });
  });

  it("stays in-memory only when no id is given", () => {
    const { result } = renderHook(() => useTableColumnSettings(undefined, columns));
    act(() => result.current.setVisibility("status", true));
    expect(result.current.visibleColumns).toContain("status");
    expect(window.localStorage.getItem("noviq-ui-table-columns:undefined")).toBeNull();
  });

  it("persists to localStorage when an id is given", () => {
    const { result } = renderHook(() => useTableColumnSettings("employees", columns));
    act(() => result.current.setVisibility("status", true));

    const raw = window.localStorage.getItem("noviq-ui-table-columns:employees");
    expect(raw).not.toBeNull();
    expect(JSON.parse(raw!).visibleColumns).toContain("status");
  });

  it("a fresh hook instance with the same id picks up the persisted settings", () => {
    const first = renderHook(() => useTableColumnSettings("employees", columns));
    act(() => first.result.current.setVisibility("status", true));

    const second = renderHook(() => useTableColumnSettings("employees", columns));
    expect(second.result.current.visibleColumns).toContain("status");
  });

  it("cycles sticky state left -> right -> off", () => {
    const { result } = renderHook(() => useTableColumnSettings(undefined, columns));

    act(() => result.current.setStickyState("name", "left"));
    expect(result.current.stickyColumns.left).toContain("name");

    act(() => result.current.setStickyState("name", "right"));
    expect(result.current.stickyColumns.left).not.toContain("name");
    expect(result.current.stickyColumns.right).toContain("name");

    act(() => result.current.setStickyState("name", null));
    expect(result.current.stickyColumns.right).not.toContain("name");
  });

  it("reset restores computed defaults and clears the persisted key", () => {
    const { result } = renderHook(() => useTableColumnSettings("employees", columns));
    act(() => result.current.setVisibility("status", true));
    act(() => result.current.setOrder(["email", "name", "status", "region"]));

    act(() => result.current.reset());

    expect(result.current.visibleColumns).toEqual(["name", "email", "region"]);
    expect(result.current.columnOrder).toEqual(["name", "email", "status", "region"]);
    expect(window.localStorage.getItem("noviq-ui-table-columns:employees")).toBeNull();
  });

  it("setOrder updates and persists the column order", () => {
    const { result } = renderHook(() => useTableColumnSettings("employees", columns));
    act(() => result.current.setOrder(["region", "name", "email", "status"]));
    expect(result.current.columnOrder).toEqual(["region", "name", "email", "status"]);

    const raw = window.localStorage.getItem("noviq-ui-table-columns:employees");
    expect(JSON.parse(raw!).columnOrder).toEqual(["region", "name", "email", "status"]);
  });
});
