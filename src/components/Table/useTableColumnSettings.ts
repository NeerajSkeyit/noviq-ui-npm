import { useCallback, useMemo, useState } from "react";
import type { TableColumn } from "./Table";

export interface StickyColumnsState {
  left: string[];
  right: string[];
}

export interface TableColumnSettings {
  visibleColumns: string[];
  columnOrder: string[];
  stickyColumns: StickyColumnsState;
  setVisibility: (columnId: string, visible: boolean) => void;
  setStickyState: (columnId: string, sticky: "left" | "right" | null) => void;
  setOrder: (order: string[]) => void;
  reset: () => void;
}

interface PersistedSettings {
  visibleColumns?: string[];
  columnOrder?: string[];
  stickyColumns?: StickyColumnsState;
}

function storageKeyFor(id: string): string {
  return `noviq-ui-table-columns:${id}`;
}

function readPersisted(id: string | undefined): PersistedSettings | null {
  if (!id || typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(storageKeyFor(id));
    return raw ? (JSON.parse(raw) as PersistedSettings) : null;
  } catch {
    return null;
  }
}

function writePersisted(id: string, settings: PersistedSettings): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(storageKeyFor(id), JSON.stringify(settings));
  } catch {
    // localStorage unavailable/full — settings just won't persist this session
  }
}

function removePersisted(id: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(storageKeyFor(id));
  } catch {
    // ignore
  }
}

function computeDefaults<T>(columns: TableColumn<T>[]) {
  return {
    visibleColumns: columns.filter((c) => c.visible !== false).map((c) => c.id),
    columnOrder: columns.map((c) => c.id),
    stickyColumns: {
      left: columns.filter((c) => c.sticky === "left").map((c) => c.id),
      right: columns.filter((c) => c.sticky === "right").map((c) => c.id),
    } as StickyColumnsState,
  };
}

/**
 * Column visibility/order/sticky state, optionally persisted to localStorage.
 * Persistence is opt-in via `id` — without it, settings are in-memory only and
 * reset on remount. Read/derived once on mount, not reactive to later
 * `columns`/`id` changes (matches how Table is used in practice — mounted once
 * with a stable id and column set).
 */
export function useTableColumnSettings<T>(
  id: string | undefined,
  columns: TableColumn<T>[]
): TableColumnSettings {
  const defaults = useMemo(() => computeDefaults(columns), [columns]);

  const [visibleColumns, setVisibleColumns] = useState<string[]>(() => {
    const persisted = readPersisted(id);
    return persisted?.visibleColumns?.length ? persisted.visibleColumns : defaults.visibleColumns;
  });
  const [columnOrder, setColumnOrder] = useState<string[]>(() => {
    const persisted = readPersisted(id);
    return persisted?.columnOrder?.length ? persisted.columnOrder : defaults.columnOrder;
  });
  const [stickyColumns, setStickyColumnsState] = useState<StickyColumnsState>(() => {
    const persisted = readPersisted(id);
    const hasPersistedSticky =
      (persisted?.stickyColumns?.left?.length ?? 0) > 0 ||
      (persisted?.stickyColumns?.right?.length ?? 0) > 0;
    return hasPersistedSticky ? persisted!.stickyColumns! : defaults.stickyColumns;
  });

  const persist = useCallback(
    (next: PersistedSettings) => {
      if (!id) return;
      writePersisted(id, {
        visibleColumns: next.visibleColumns ?? visibleColumns,
        columnOrder: next.columnOrder ?? columnOrder,
        stickyColumns: next.stickyColumns ?? stickyColumns,
      });
    },
    [id, visibleColumns, columnOrder, stickyColumns]
  );

  const setVisibility = useCallback(
    (columnId: string, visible: boolean) => {
      setVisibleColumns((prev) => {
        const next = visible ? [...prev, columnId] : prev.filter((c) => c !== columnId);
        persist({ visibleColumns: next });
        return next;
      });
    },
    [persist]
  );

  const setStickyState = useCallback(
    (columnId: string, sticky: "left" | "right" | null) => {
      setStickyColumnsState((prev) => {
        const left = prev.left.filter((c) => c !== columnId);
        const right = prev.right.filter((c) => c !== columnId);
        if (sticky === "left") left.push(columnId);
        if (sticky === "right") right.push(columnId);
        const next = { left, right };
        persist({ stickyColumns: next });
        return next;
      });
    },
    [persist]
  );

  const setOrder = useCallback(
    (order: string[]) => {
      setColumnOrder(order);
      persist({ columnOrder: order });
    },
    [persist]
  );

  const reset = useCallback(() => {
    setVisibleColumns(defaults.visibleColumns);
    setColumnOrder(defaults.columnOrder);
    setStickyColumnsState(defaults.stickyColumns);
    if (id) removePersisted(id);
  }, [defaults, id]);

  return { visibleColumns, columnOrder, stickyColumns, setVisibility, setStickyState, setOrder, reset };
}
