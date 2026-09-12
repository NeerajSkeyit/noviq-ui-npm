# noviq-ui Config Provider Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace Table's hardcoded HRMS-shaped `apiFunction` contract with a mandatory,
app-wide `NoviqUIConfigProvider` so any consumer can declare its own backend response shape
once instead of hand-writing per-call-site translation code.

**Architecture:** A new `src/config/` module holds the config types, a path-resolution/extraction
utility (`extractRows`/`extractTotal`), and a React Context Provider (`NoviqUIConfigProvider`) +
hook (`useNoviqUIConfig`). `Table`'s `apiFunction` return type changes from a fixed shape to
`Promise<unknown>`; `Table` (and `useTableExport`) resolve the response shape from a
`responseFormat` prop or the Provider, and throw a clear error if neither is present while
actively fetching.

**Tech Stack:** React 18/19, TypeScript (strict), Vitest + React Testing Library + jsdom,
`@tanstack/react-query` (already a Table dependency).

**Spec:** `docs/superpowers/specs/2026-09-04-config-provider-design.md`

## Global Constraints

- Breaking change → package version bumps `2.5.2` → `3.0.0` (semver major).
- `apiFunction`'s return type becomes `Promise<unknown>`; `TableQueryResult<T>` is removed from
  the public API.
- The mandatory-config check only fires when a `Table` is actively trying to fetch
  (`isUsingApiFunction` — i.e. `apiFunction` set, no `preFetchedData`, not `hidden`). Controlled
  (`preFetchedData`) and `hidden` tables never require a `responseFormat`.
- Resolution order for a given `Table` instance: its own `responseFormat` prop → the ancestor
  `NoviqUIConfigProvider`'s `config.table.responseFormat` → throw.
- `useTableExport` gets the *already-merged* `responseFormat`/`requestParams` from `Table` — it
  does not read the Provider itself and does not merge defaults; `Table` is the single place
  that does both.
- ESM only, `react`/`react-dom` stay Rollup externals — nothing here changes that.
- No CI in this repo; every task's "run the tests" step is `npm test` (Vitest, run once, not
  watch mode) run from `/Users/neerajyadav/Documents/sk/noviq/noviq-ui`.

---

## Task 1: Config types + response-format extraction utilities

**Files:**
- Create: `src/config/types.ts`
- Create: `src/config/responseFormat.ts`
- Test: `src/config/responseFormat.test.ts`

**Interfaces:**
- Produces: `ResponseFormatPaths { rowsPath: string; totalPath: string }`,
  `ResponseFormatFns<T = any> { getRows: (raw: unknown) => T[]; getTotal: (raw: unknown) => number }`,
  `TableResponseFormat<T = any> = ResponseFormatPaths | ResponseFormatFns<T>`,
  `TableRequestParamNames { search?: string; page?: string; pageSize?: string }`,
  `DEFAULT_REQUEST_PARAMS: Required<TableRequestParamNames>` (value:
  `{ search: "search", page: "page_no", pageSize: "rows_per_page" }`),
  `NoviqUITableConfig { responseFormat: TableResponseFormat; requestParams?: TableRequestParamNames }`,
  `NoviqUIConfig { table: NoviqUITableConfig }` — all from `types.ts`.
  `isPathsFormat(f): f is ResponseFormatPaths`, `isFnsFormat(f): f is ResponseFormatFns`,
  `extractRows<T>(raw: unknown, format: TableResponseFormat<T>): T[]`,
  `extractTotal(raw: unknown, format: TableResponseFormat): number` — all from
  `responseFormat.ts`.

- [ ] **Step 1: Write the failing tests**

Create `src/config/responseFormat.test.ts`:

```ts
import { describe, it, expect, vi } from "vitest";
import { extractRows, extractTotal } from "./responseFormat";
import type { ResponseFormatPaths, ResponseFormatFns } from "./types";

describe("extractRows", () => {
  it("resolves a nested rowsPath", () => {
    const format: ResponseFormatPaths = { rowsPath: "result.result", totalPath: "result.totalCount" };
    const raw = { result: { result: [{ id: 1 }], totalCount: 1 } };
    expect(extractRows(raw, format)).toEqual([{ id: 1 }]);
  });

  it("resolves a top-level rowsPath", () => {
    const format: ResponseFormatPaths = { rowsPath: "items", totalPath: "total" };
    const raw = { items: [{ id: 1 }, { id: 2 }], total: 2 };
    expect(extractRows(raw, format)).toEqual([{ id: 1 }, { id: 2 }]);
  });

  it("returns [] and warns when rowsPath does not resolve to an array", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const format: ResponseFormatPaths = { rowsPath: "missing.path", totalPath: "total" };
    expect(extractRows({ total: 0 }, format)).toEqual([]);
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it("uses getRows when a function-format is given", () => {
    const format: ResponseFormatFns = {
      getRows: (raw: any) => raw.data.items,
      getTotal: (raw: any) => raw.data.meta.total,
    };
    const raw = { data: { items: [{ id: 9 }], meta: { total: 1 } } };
    expect(extractRows(raw, format)).toEqual([{ id: 9 }]);
  });

  it("returns [] and warns when getRows throws", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const format: ResponseFormatFns = {
      getRows: () => {
        throw new Error("boom");
      },
      getTotal: () => 0,
    };
    expect(extractRows({}, format)).toEqual([]);
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });
});

describe("extractTotal", () => {
  it("resolves a nested totalPath", () => {
    const format: ResponseFormatPaths = { rowsPath: "result", totalPath: "meta.total" };
    expect(extractTotal({ meta: { total: 42 } }, format)).toBe(42);
  });

  it("returns 0 when totalPath does not resolve to a number", () => {
    const format: ResponseFormatPaths = { rowsPath: "result", totalPath: "meta.total" };
    expect(extractTotal({ meta: {} }, format)).toBe(0);
  });

  it("uses getTotal when a function-format is given", () => {
    const format: ResponseFormatFns = { getRows: () => [], getTotal: (raw: any) => raw.count };
    expect(extractTotal({ count: 7 }, format)).toBe(7);
  });

  it("returns 0 and warns when getTotal throws", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const format: ResponseFormatFns = {
      getRows: () => [],
      getTotal: () => {
        throw new Error("boom");
      },
    };
    expect(extractTotal({}, format)).toBe(0);
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- src/config/responseFormat.test.ts`
Expected: FAIL — `Cannot find module './responseFormat'` (neither `types.ts` nor
`responseFormat.ts` exist yet).

- [ ] **Step 3: Write `src/config/types.ts`**

```ts
export interface ResponseFormatPaths {
  rowsPath: string;
  totalPath: string;
}

export interface ResponseFormatFns<T = any> {
  getRows: (raw: unknown) => T[];
  getTotal: (raw: unknown) => number;
}

/** Exactly one of the two variants — never both, never neither (enforced by NoviqUIConfigProvider). */
export type TableResponseFormat<T = any> = ResponseFormatPaths | ResponseFormatFns<T>;

export interface TableRequestParamNames {
  search?: string;
  page?: string;
  pageSize?: string;
}

/** Matches today's fixed names, so an app that never sets requestParams sees no change. */
export const DEFAULT_REQUEST_PARAMS: Required<TableRequestParamNames> = {
  search: "search",
  page: "page_no",
  pageSize: "rows_per_page",
};

export interface NoviqUITableConfig {
  responseFormat: TableResponseFormat;
  requestParams?: TableRequestParamNames;
}

export interface NoviqUIConfig {
  table: NoviqUITableConfig;
}
```

- [ ] **Step 4: Write `src/config/responseFormat.ts`**

```ts
import type { ResponseFormatFns, ResponseFormatPaths, TableResponseFormat } from "./types";

/**
 * Only warns when NODE_ENV isn't "production" (checked defensively — `process` isn't guaranteed
 * to exist in every consumer's bundle target). A missing/malformed response for a single request
 * is expected traffic (an error envelope, a flaky backend), not a setup mistake — see
 * NoviqUIConfigProvider for the setup-mistake case, which throws instead of warning.
 */
function devWarn(...args: unknown[]): void {
  if (typeof process === "undefined" || process.env?.NODE_ENV !== "production") {
    console.warn("[noviq-ui]", ...args);
  }
}

function resolvePath(obj: unknown, path: string): unknown {
  return path
    .split(".")
    .reduce<unknown>(
      (acc, key) => (acc && typeof acc === "object" ? (acc as Record<string, unknown>)[key] : undefined),
      obj
    );
}

export function isPathsFormat(f: TableResponseFormat): f is ResponseFormatPaths {
  return "rowsPath" in f;
}

export function isFnsFormat(f: TableResponseFormat): f is ResponseFormatFns {
  return "getRows" in f;
}

export function extractRows<T>(raw: unknown, format: TableResponseFormat<T>): T[] {
  if (isFnsFormat(format)) {
    try {
      return format.getRows(raw) ?? [];
    } catch (err) {
      devWarn("responseFormat.getRows threw", err, raw);
      return [];
    }
  }
  const value = resolvePath(raw, format.rowsPath);
  if (!Array.isArray(value)) {
    devWarn(`responseFormat.rowsPath "${format.rowsPath}" did not resolve to an array`, raw);
    return [];
  }
  return value as T[];
}

export function extractTotal(raw: unknown, format: TableResponseFormat): number {
  if (isFnsFormat(format)) {
    try {
      return format.getTotal(raw) ?? 0;
    } catch (err) {
      devWarn("responseFormat.getTotal threw", err, raw);
      return 0;
    }
  }
  const value = resolvePath(raw, format.totalPath);
  if (typeof value !== "number") {
    devWarn(`responseFormat.totalPath "${format.totalPath}" did not resolve to a number`, raw);
    return 0;
  }
  return value;
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm test -- src/config/responseFormat.test.ts`
Expected: PASS (11 tests)

- [ ] **Step 6: Commit**

```bash
git add src/config/types.ts src/config/responseFormat.ts src/config/responseFormat.test.ts
git commit -m "feat(config): add response-format types and extraction utilities"
```

---

## Task 2: `NoviqUIConfigProvider` + `useNoviqUIConfig`

**Files:**
- Create: `src/config/NoviqUIConfigProvider.tsx`
- Test: `src/config/NoviqUIConfigProvider.test.tsx`

**Interfaces:**
- Consumes: `NoviqUIConfig`, `NoviqUITableConfig` from `./types` (Task 1);
  `isPathsFormat`, `isFnsFormat` from `./responseFormat` (Task 1).
- Produces: `NoviqUIConfigProvider({ config, children }: { config: NoviqUIConfig; children: React.ReactNode })`
  (React component), `useNoviqUIConfig(): NoviqUIConfig | undefined` (hook) — both from
  `NoviqUIConfigProvider.tsx`.

- [ ] **Step 1: Write the failing tests**

Create `src/config/NoviqUIConfigProvider.test.tsx`:

```tsx
import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { NoviqUIConfigProvider, useNoviqUIConfig } from "./NoviqUIConfigProvider";

function Consumer() {
  const config = useNoviqUIConfig();
  return <div>{config ? "has-config" : "no-config"}</div>;
}

const VALID_CONFIG = { table: { responseFormat: { rowsPath: "result", totalPath: "totalCount" } } };

describe("NoviqUIConfigProvider", () => {
  it("makes the config available to descendants via useNoviqUIConfig", () => {
    render(
      <NoviqUIConfigProvider config={VALID_CONFIG}>
        <Consumer />
      </NoviqUIConfigProvider>
    );
    expect(screen.getByText("has-config")).toBeInTheDocument();
  });

  it("useNoviqUIConfig returns undefined outside a Provider", () => {
    render(<Consumer />);
    expect(screen.getByText("no-config")).toBeInTheDocument();
  });

  it("throws when table.responseFormat is missing", () => {
    const badConfig = { table: {} } as any;
    expect(() =>
      render(
        <NoviqUIConfigProvider config={badConfig}>
          <Consumer />
        </NoviqUIConfigProvider>
      )
    ).toThrow(/requires config\.table\.responseFormat/);
  });

  it("throws when responseFormat has neither variant", () => {
    const badConfig = { table: { responseFormat: {} } } as any;
    expect(() =>
      render(
        <NoviqUIConfigProvider config={badConfig}>
          <Consumer />
        </NoviqUIConfigProvider>
      )
    ).toThrow(/exactly one of/);
  });

  it("throws when responseFormat mixes both variants", () => {
    const badConfig = {
      table: {
        responseFormat: { rowsPath: "a", totalPath: "b", getRows: () => [], getTotal: () => 0 },
      },
    } as any;
    expect(() =>
      render(
        <NoviqUIConfigProvider config={badConfig}>
          <Consumer />
        </NoviqUIConfigProvider>
      )
    ).toThrow(/exactly one of/);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- src/config/NoviqUIConfigProvider.test.tsx`
Expected: FAIL — `Cannot find module './NoviqUIConfigProvider'`

- [ ] **Step 3: Write `src/config/NoviqUIConfigProvider.tsx`**

```tsx
import React, { createContext, useContext } from "react";
import type { NoviqUIConfig, NoviqUITableConfig } from "./types";
import { isFnsFormat, isPathsFormat } from "./responseFormat";

const NoviqUIConfigContext = createContext<NoviqUIConfig | undefined>(undefined);

function validateTableConfig(table: NoviqUITableConfig | undefined): void {
  if (!table || !table.responseFormat) {
    throw new Error(
      "noviq-ui: NoviqUIConfigProvider requires config.table.responseFormat — provide either " +
        "{ rowsPath, totalPath } or { getRows, getTotal }."
    );
  }
  const paths = isPathsFormat(table.responseFormat);
  const fns = isFnsFormat(table.responseFormat);
  if (paths === fns) {
    throw new Error(
      "noviq-ui: config.table.responseFormat must be exactly one of { rowsPath, totalPath } or " +
        `{ getRows, getTotal } — got a value matching ${paths ? "both" : "neither"}.`
    );
  }
}

export function NoviqUIConfigProvider({
  config,
  children,
}: {
  config: NoviqUIConfig;
  children: React.ReactNode;
}) {
  validateTableConfig(config.table);
  return <NoviqUIConfigContext.Provider value={config}>{children}</NoviqUIConfigContext.Provider>;
}

export function useNoviqUIConfig(): NoviqUIConfig | undefined {
  return useContext(NoviqUIConfigContext);
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- src/config/NoviqUIConfigProvider.test.tsx`
Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
git add src/config/NoviqUIConfigProvider.tsx src/config/NoviqUIConfigProvider.test.tsx
git commit -m "feat(config): add NoviqUIConfigProvider and useNoviqUIConfig"
```

---

## Task 3: `Table` + `useTableExport` integration

**Files:**
- Modify: `src/components/Table/Table.tsx:66-120` (types), `:122-149` (props destructure),
  `:273` (isUsingApiFunction + new throw), `:280-297` (query + data/totalItems),
  `:329-338` (useTableExport call)
- Modify: `src/components/Table/useTableExport.ts:11-22` (args interface), `:41-66` (fetchRows)
- Modify: `src/components/Table/Table.test.tsx` (5 existing tests + 4 new tests)
- Modify: `src/components/Table/useTableExport.test.ts` (3 existing tests)

**Interfaces:**
- Consumes: `TableResponseFormat`, `TableRequestParamNames`, `DEFAULT_REQUEST_PARAMS` from
  `../../config/types` (Task 1); `extractRows`, `extractTotal` from `../../config/responseFormat`
  (Task 1); `useNoviqUIConfig`, `NoviqUIConfigProvider` from `../../config/NoviqUIConfigProvider`
  (Task 2).
- Produces: `Table`'s `apiFunction?: (params: TableQueryParams) => Promise<unknown>` and new
  `responseFormat?: TableResponseFormat<T>` prop; `useTableExport`'s new
  `responseFormat?: TableResponseFormat<T>` and `requestParams?: Required<TableRequestParamNames>`
  args — both consumed by Task 4 (public exports) and Task 5 (playground).

### Part A — `Table.tsx`

- [ ] **Step 1: Update the failing/changed tests in `Table.test.tsx` first**

Add this import near the top of `src/components/Table/Table.test.tsx` (after the existing
`FILTER_TYPE` import on line 6):

```tsx
import { NoviqUIConfigProvider } from "../../config/NoviqUIConfigProvider";
import type { ResponseFormatPaths } from "../../config/types";

const FLAT_RESPONSE_FORMAT: ResponseFormatPaths = { rowsPath: "result", totalPath: "totalCount" };
```

Add `responseFormat={FLAT_RESPONSE_FORMAT}` to the `<Table>` element in these 5 existing tests
(the mocked `apiFunction` in each already resolves to the flat `{ result, totalCount }` shape
that format matches). Each entry below shows the exact current render call and its exact
replacement — nothing else in the test body changes.

**Test: `"calls apiFunction with the expected params shape and renders the response"`** (currently line 51)

Find:
```tsx
  render(
    <Table columns={columns} apiFunction={apiFunction} apiParams={{ department: "eng" }} />
  );
```
Replace with:
```tsx
  render(
    <Table
      columns={columns}
      apiFunction={apiFunction}
      apiParams={{ department: "eng" }}
      responseFormat={FLAT_RESPONSE_FORMAT}
    />
  );
```

**Test: `"shows a loading overlay while apiFunction is pending"`** (currently line 74)

Find:
```tsx
    render(<Table columns={columns} apiFunction={apiFunction} />);
```
Replace with:
```tsx
    render(<Table columns={columns} apiFunction={apiFunction} responseFormat={FLAT_RESPONSE_FORMAT} />);
```

**Test: `"debounces search before triggering a refetch"`** (currently line 106)

Find:
```tsx
    render(<Table columns={columns} apiFunction={apiFunction} />);
```
Replace with (identical replacement to the previous test — this is a separate occurrence of the
same current line, in a different `it` block):
```tsx
    render(<Table columns={columns} apiFunction={apiFunction} responseFormat={FLAT_RESPONSE_FORMAT} />);
```

**Test: `"applying a filter merges its apiPayload into the apiFunction params and shows a chip"`** (currently line 328)

Find:
```tsx
    render(<Table columns={columns} apiFunction={apiFunction} filterConfigs={filterConfigs} />);
```
Replace with:
```tsx
    render(
      <Table
        columns={columns}
        apiFunction={apiFunction}
        filterConfigs={filterConfigs}
        responseFormat={FLAT_RESPONSE_FORMAT}
      />
    );
```

**Test: `"removing a filter chip clears it from apiFunction params"`** (currently line 348)

Find:
```tsx
    render(<Table columns={columns} apiFunction={apiFunction} filterConfigs={filterConfigs} />);
```
Replace with (identical replacement to the previous test):
```tsx
    render(
      <Table
        columns={columns}
        apiFunction={apiFunction}
        filterConfigs={filterConfigs}
        responseFormat={FLAT_RESPONSE_FORMAT}
      />
    );
```

Then append these 4 new tests inside the same `describe("Table", ...)` block, after the last
existing test (`"hides the Export button when isExportHidden"`):

```tsx
  it("throws when apiFunction is used without a responseFormat prop or NoviqUIConfigProvider", () => {
    const apiFunction = vi.fn().mockResolvedValue({ result: rows, totalCount: rows.length });
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(<Table columns={columns} apiFunction={apiFunction} />)).toThrow(
      /needs a response format/
    );
    consoleError.mockRestore();
  });

  it("resolves rows via a NoviqUIConfigProvider ancestor when no responseFormat prop is given", async () => {
    const apiFunction = vi.fn().mockResolvedValue({ result: rows, totalCount: rows.length });
    render(
      <NoviqUIConfigProvider config={{ table: { responseFormat: FLAT_RESPONSE_FORMAT } }}>
        <Table columns={columns} apiFunction={apiFunction} />
      </NoviqUIConfigProvider>
    );
    await waitFor(() => expect(screen.getByText("Charlie")).toBeInTheDocument());
  });

  it("a responseFormat prop overrides the NoviqUIConfigProvider's format", async () => {
    const apiFunction = vi.fn().mockResolvedValue({ data: { items: rows, count: rows.length } });
    render(
      <NoviqUIConfigProvider config={{ table: { responseFormat: FLAT_RESPONSE_FORMAT } }}>
        <Table
          columns={columns}
          apiFunction={apiFunction}
          responseFormat={{ rowsPath: "data.items", totalPath: "data.count" }}
        />
      </NoviqUIConfigProvider>
    );
    await waitFor(() => expect(screen.getByText("Charlie")).toBeInTheDocument());
  });

  it("does not throw for a hidden table with apiFunction set but no responseFormat configured", () => {
    const apiFunction = vi.fn();
    expect(() => render(<Table columns={columns} apiFunction={apiFunction} hidden />)).not.toThrow();
  });
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- src/components/Table/Table.test.tsx`
Expected: FAIL — `Cannot find module '../../config/NoviqUIConfigProvider'` (import doesn't
resolve from the test file yet, since `Table.tsx` hasn't been touched — this is expected;
proceed to implementation).

- [ ] **Step 3: Modify `Table.tsx` — types**

Replace lines 66-76 (the `TableQueryParams`/`TableQueryResult` interfaces):

```ts
export type TableQueryParams = Record<string, unknown>;
```

(`TableQueryResult` is deleted entirely — no longer part of the contract.)

Add imports near the top of the file, after the existing `import { getCellValue, ... }` line
(currently line 20):

```ts
import { useNoviqUIConfig } from "../../config/NoviqUIConfigProvider";
import { extractRows, extractTotal } from "../../config/responseFormat";
import { DEFAULT_REQUEST_PARAMS, type TableResponseFormat } from "../../config/types";
```

In the `TableProps<T>` interface, change the `apiFunction` line (currently line 85):

```ts
  apiFunction?: (params: TableQueryParams) => Promise<unknown>;
```

Add a new prop right after it:

```ts
  /** Overrides the NoviqUIConfigProvider's table.responseFormat for this instance only. */
  responseFormat?: TableResponseFormat<T>;
```

- [ ] **Step 4: Modify `Table.tsx` — destructure the new prop**

In `TableInner`'s destructured props (currently starting at line 122), add `responseFormat`
alongside the other props (order doesn't matter — place it near `apiFunction`):

```ts
function TableInner<T extends Record<string, any> = any>({
  columns,
  id,
  isColumnSettingHidden = false,
  apiFunction,
  responseFormat: responseFormatProp,
  preFetchedData = [],
  // ...rest unchanged
```

- [ ] **Step 5: Modify `Table.tsx` — resolve config and add the mandatory check**

Replace the existing `const isUsingApiFunction = ...` line (currently line 273) with:

```ts
  const noviqConfig = useNoviqUIConfig();
  const responseFormat = responseFormatProp ?? noviqConfig?.table?.responseFormat;
  const requestParamNames = { ...DEFAULT_REQUEST_PARAMS, ...noviqConfig?.table?.requestParams };

  const isUsingApiFunction = !!apiFunction && preFetchedData.length === 0 && !hidden;

  if (isUsingApiFunction && !responseFormat) {
    throw new Error(
      "noviq-ui: <Table> needs a response format. Wrap your app in " +
        '<NoviqUIConfigProvider config={{ table: { responseFormat: {...} } }}> or pass a ' +
        '"responseFormat" prop directly to this <Table>.'
    );
  }
```

- [ ] **Step 6: Modify `Table.tsx` — use `requestParamNames` in the query, and extract via `responseFormat`**

Replace the `useQuery` call's `queryFn` (currently lines 280-292):

```ts
  const { data: queryResult, isLoading: isQueryLoading } = useQuery({
    queryKey,
    queryFn: () =>
      apiFunction!({
        ...(apiParams as Record<string, unknown>),
        ...getFilterParams(),
        [requestParamNames.search]: debouncedSearch,
        [requestParamNames.page]: pagination.page,
        [requestParamNames.pageSize]: pagination.pageSize,
      }),
    enabled: isUsingApiFunction,
    retry: 3,
  });
```

Replace the `data`/`totalItems` derivation (currently lines 294-297; `isLoading`'s line is
unchanged):

```ts
  const usingPreFetched = preFetchedData.length > 0;
  const data: T[] = usingPreFetched
    ? preFetchedData
    : responseFormat
      ? extractRows<T>(queryResult, responseFormat)
      : [];
  const totalItems = usingPreFetched
    ? preFetchedData.length
    : responseFormat
      ? extractTotal(queryResult, responseFormat)
      : 0;
  const isLoading = usingPreFetched ? isPrefetchedDataLoading : isQueryLoading;
```

- [ ] **Step 7: Modify `Table.tsx` — pass the resolved config down to `useTableExport`**

In the `useTableExport` call (currently lines 329-338), add `responseFormat` and
`requestParams`:

```ts
  const { exportToExcel, exportToCSV, exporting } = useTableExport({
    apiFunction,
    responseFormat,
    requestParams: requestParamNames,
    usingPreFetched,
    preFetchedData: sortedData,
    columns: displayColumns,
    search: debouncedSearch,
    filterParams: getFilterParams(),
    apiParams,
    totalItems,
  });
```

### Part B — `useTableExport.ts`

- [ ] **Step 8: Update the failing/changed tests in `useTableExport.test.ts`**

Add this import near the top of `src/components/Table/useTableExport.test.ts` (after the
existing `TableColumn` type import on line 5):

```ts
import { DEFAULT_REQUEST_PARAMS } from "../../config/types";
import type { ResponseFormatPaths } from "../../config/types";

const FLAT_RESPONSE_FORMAT: ResponseFormatPaths = { rowsPath: "result", totalPath: "totalCount" };
```

Add `responseFormat: FLAT_RESPONSE_FORMAT` and `requestParams: DEFAULT_REQUEST_PARAMS` to the
`useTableExport({...})` args object in these 3 existing tests (each currently supplies
`apiFunction`):

- `"fetches with rows_per_page equal to totalItems and merges search/filter/apiParams"`
  (currently starting line 46)
- `"falls back to a large rows_per_page when totalItems is 0"` (currently starting line 74)
- `"sets exporting true during the call and false after it resolves"` (currently starting line 212)

Example for the first one:

```ts
  it("fetches with rows_per_page equal to totalItems and merges search/filter/apiParams", async () => {
    const apiFunction = vi.fn().mockResolvedValue({ result: rows, totalCount: rows.length });
    const { result } = renderHook(() =>
      useTableExport({
        apiFunction,
        responseFormat: FLAT_RESPONSE_FORMAT,
        requestParams: DEFAULT_REQUEST_PARAMS,
        usingPreFetched: false,
        preFetchedData: [],
        columns,
        search: "ali",
        filterParams: { department: "eng" },
        apiParams: { tenant: "acme" },
        totalItems: 42,
      })
    );

    await act(async () => {
      await result.current.exportToExcel();
    });

    expect(apiFunction).toHaveBeenCalledWith({
      tenant: "acme",
      department: "eng",
      search: "ali",
      page_no: 1,
      rows_per_page: 42,
    });
  });
```

Add the same two lines (`responseFormat: FLAT_RESPONSE_FORMAT,` and
`requestParams: DEFAULT_REQUEST_PARAMS,`) right after `apiFunction,` in the other 2 tests below
— their assertions are otherwise unchanged (`DEFAULT_REQUEST_PARAMS` reproduces today's
`page_no`/`rows_per_page` keys exactly, so existing `toHaveBeenCalledWith`/`rows_per_page`
assertions still hold).

**Test: `"falls back to a large rows_per_page when totalItems is 0"`** (currently starting line 74)

Find:
```ts
    const { result } = renderHook(() =>
      useTableExport({
        apiFunction,
        usingPreFetched: false,
        preFetchedData: [],
        columns,
        search: "",
        filterParams: {},
        totalItems: 0,
      })
    );
```
Replace with:
```ts
    const { result } = renderHook(() =>
      useTableExport({
        apiFunction,
        responseFormat: FLAT_RESPONSE_FORMAT,
        requestParams: DEFAULT_REQUEST_PARAMS,
        usingPreFetched: false,
        preFetchedData: [],
        columns,
        search: "",
        filterParams: {},
        totalItems: 0,
      })
    );
```

**Test: `"sets exporting true during the call and false after it resolves"`** (currently starting line 212)

Find:
```ts
    const { result } = renderHook(() =>
      useTableExport({
        apiFunction,
        usingPreFetched: false,
        preFetchedData: [],
        columns,
        search: "",
        filterParams: {},
        totalItems: 10,
      })
    );
```
Replace with:
```ts
    const { result } = renderHook(() =>
      useTableExport({
        apiFunction,
        responseFormat: FLAT_RESPONSE_FORMAT,
        requestParams: DEFAULT_REQUEST_PARAMS,
        usingPreFetched: false,
        preFetchedData: [],
        columns,
        search: "",
        filterParams: {},
        totalItems: 10,
      })
    );
```

The 5 tests that never pass `apiFunction` (`"skips the fetch entirely..."`,
`"excludes columns with export: false"`, `"uses exportValue..."`, `"formats a typed cell
value..."`, `"calls XLSX.writeFile..."`) need no changes — they use `usingPreFetched: true` and
never touch `responseFormat`/`requestParams`.

- [ ] **Step 9: Run tests to verify they fail**

Run: `npm test -- src/components/Table/useTableExport.test.ts`
Expected: FAIL — `TS2353`-style excess/missing property errors from the not-yet-updated
`UseTableExportArgs` type, or `Cannot find module '../../config/types'` reference resolving to
old exports.

- [ ] **Step 10: Modify `useTableExport.ts`**

Add imports after the existing `import type { TableColumn } from "./Table";` (currently line 3):

```ts
import { extractRows } from "../../config/responseFormat";
import type { TableRequestParamNames, TableResponseFormat } from "../../config/types";
```

Replace the `UseTableExportArgs<T>` interface (currently lines 11-22):

```ts
export interface UseTableExportArgs<T> {
  apiFunction?: (params: TableQueryParams) => Promise<unknown>;
  responseFormat?: TableResponseFormat<T>;
  requestParams?: Required<TableRequestParamNames>;
  usingPreFetched: boolean;
  /** The already client-sorted array, used directly (no fetch) when `usingPreFetched`. */
  preFetchedData: T[];
  /** Already visibility-filtered/ordered columns (`export !== false` still applied here). */
  columns: TableColumn<T>[];
  search: string;
  filterParams: Record<string, unknown>;
  apiParams?: Record<string, unknown>;
  totalItems: number;
}
```

Replace the function's destructured args and `fetchRows` (currently lines 41-66):

```ts
function useTableExport<T>({
  apiFunction,
  responseFormat,
  requestParams,
  usingPreFetched,
  preFetchedData,
  columns,
  search,
  filterParams,
  apiParams,
  totalItems,
}: UseTableExportArgs<T>): UseTableExportResult {
  const [exporting, setExporting] = useState(false);

  const exportColumns = columns.filter((c) => c.export !== false);

  const fetchRows = async (): Promise<T[]> => {
    if (usingPreFetched) return preFetchedData;
    if (!apiFunction || !responseFormat || !requestParams) return [];
    const raw = await apiFunction({
      ...(apiParams as Record<string, unknown>),
      ...filterParams,
      [requestParams.search]: search,
      [requestParams.page]: 1,
      [requestParams.pageSize]: totalItems > 0 ? totalItems : FALLBACK_ROWS_PER_PAGE,
    });
    return extractRows(raw, responseFormat);
  };
```

(everything below `fetchRows` in the file — `buildAoa`, `exportToExcel`, `exportToCSV`, the
return statement — is unchanged.)

- [ ] **Step 11: Run both test files to verify everything passes**

Run: `npm test -- src/components/Table/Table.test.tsx src/components/Table/useTableExport.test.ts`
Expected: PASS (Table.test.tsx: 27 tests [23 existing + 4 new]; useTableExport.test.ts: 8 tests,
all unchanged in count)

- [ ] **Step 12: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors (this also catches any other file in the package that still references the
now-deleted `TableQueryResult` — none are expected yet since Task 5/6 haven't touched
`src/index.ts`/`dev/playground.tsx`; if `tsc` reports errors there, that confirms those files
are correctly flagged for Task 4/5 rather than silently broken).

- [ ] **Step 13: Commit**

```bash
git add src/components/Table/Table.tsx src/components/Table/useTableExport.ts \
  src/components/Table/Table.test.tsx src/components/Table/useTableExport.test.ts
git commit -m "feat(table): resolve response shape via NoviqUIConfigProvider instead of a fixed contract"
```

---

## Task 4: Public API exports

**Files:**
- Modify: `src/index.ts:47-52` (Table type exports)

**Interfaces:**
- Consumes: `NoviqUIConfigProvider`, `useNoviqUIConfig` (Task 2); `NoviqUIConfig`,
  `NoviqUITableConfig`, `TableResponseFormat`, `ResponseFormatPaths`, `ResponseFormatFns`,
  `TableRequestParamNames` (Task 1); `TableQueryParams` (now `Record<string, unknown>`, Task 3).
- Produces: the package's full public surface — consumed by Task 5 (`dev/playground.tsx`) and
  every future external consumer.

- [ ] **Step 1: Add the new value export**

In `src/index.ts`, add a new line directly after the existing `export { default as Table } ...`
line (currently line 15):

```ts
export { NoviqUIConfigProvider, useNoviqUIConfig } from "./config/NoviqUIConfigProvider";
```

- [ ] **Step 2: Update the Table type export block**

Replace the existing block (currently lines 47-52):

```ts
export type {
  TableProps,
  TableColumn,
  TableQueryParams,
} from "./components/Table/Table";
```

(`TableQueryResult` removed — it no longer exists in `Table.tsx`.)

- [ ] **Step 3: Add the new config type export**

Add a new block near the other type exports (e.g. right after the block from Step 2):

```ts
export type {
  NoviqUIConfig,
  NoviqUITableConfig,
  TableResponseFormat,
  ResponseFormatPaths,
  ResponseFormatFns,
  TableRequestParamNames,
} from "./config/types";
```

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Run the full test suite**

Run: `npm test`
Expected: PASS (every test file in the package, including the ones touched in Tasks 1-3).

- [ ] **Step 6: Commit**

```bash
git add src/index.ts
git commit -m "feat: export NoviqUIConfigProvider and config types from the package root"
```

---

## Task 5: Update the dev playground

**Files:**
- Modify: `dev/playground.tsx:1-27` (imports), `:58-79` (`mockFetchEmployees`), `:156-403`
  (wrap the render tree)

**Interfaces:**
- Consumes: `NoviqUIConfigProvider` (Task 4's re-export of Task 2).

- [ ] **Step 1: Update imports**

In `dev/playground.tsx`, add `NoviqUIConfigProvider` to the value-import list from `../src/index`
(currently lines 5-17) — insert it after `Table`:

```ts
import {
  Button,
  Drawer,
  Modal,
  ScrollArea,
  Input,
  Label,
  Switch,
  FormFooter,
  Form,
  Table,
  NoviqUIConfigProvider,
  FILTER_TYPE,
} from "../src/index";
```

Remove `TableQueryResult` from the type-import list (currently lines 18-26):

```ts
import type {
  DrawerSide,
  DrawerSize,
  FormFieldConfig,
  TableColumn,
  TableQueryParams,
  FilterConfig,
} from "../src/index";
```

- [ ] **Step 2: Fix `mockFetchEmployees`'s type and param access**

Replace the function (currently lines 58-79):

```ts
function mockFetchEmployees(params: TableQueryParams): Promise<{ result: Employee[]; totalCount: number }> {
  const search = (params.search as string)?.toLowerCase() ?? "";
  const department = params.department as string | undefined;
  const joinDateFrom = params.joinDateFrom as string | undefined;
  const joinDateTo = params.joinDateTo as string | undefined;

  const filtered = mockDatabase.filter((row) => {
    if (search && !row.name.toLowerCase().includes(search) && !row.department.toLowerCase().includes(search)) {
      return false;
    }
    if (department && !department.split(",").includes(row.department)) return false;
    if (joinDateFrom && row.joinDate < joinDateFrom) return false;
    if (joinDateTo && row.joinDate > joinDateTo) return false;
    return true;
  });
  const pageNo = params.page_no as number;
  const rowsPerPage = params.rows_per_page as number;
  const start = (pageNo - 1) * rowsPerPage;
  const page = filtered.slice(start, start + rowsPerPage);

  return new Promise((resolve) => {
    setTimeout(() => resolve({ result: page, totalCount: filtered.length }), 400);
  });
}
```

- [ ] **Step 3: Wrap the rendered tree in `NoviqUIConfigProvider`**

The mock server's response shape is flat (`{ result, totalCount }` — not nested the way real
HRMS's `res.data.result.result` is), so the paths are single-level. In `Playground`'s `return`
(currently starting line 156), wrap the outer `<div>` in the Provider:

```tsx
  return (
    <NoviqUIConfigProvider
      config={{ table: { responseFormat: { rowsPath: "result", totalPath: "totalCount" } } }}
    >
      <div style={{ padding: 32, fontFamily: "sans-serif", maxWidth: 960 }}>
        {/* ...all existing content, unchanged... */}
      </div>
    </NoviqUIConfigProvider>
  );
```

(Only the opening `<div>` gains a wrapping `<NoviqUIConfigProvider>` and its matching closing
tag before `);` — every child section in between is untouched.)

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Manually verify the playground still runs**

Run: `npm run dev`
Expected: dev server starts; open the printed local URL and confirm both Table sections render
without a thrown error (the `preFetchedData` tables need no config; the `apiFunction`
mock-server table under "Table (apiFunction, mock server, ...)" needs the new Provider wrapping
to not throw — this is the manual check that the wrapping in Step 3 actually took effect). Stop
the dev server once confirmed (Ctrl+C).

- [ ] **Step 6: Commit**

```bash
git add dev/playground.tsx
git commit -m "chore(dev): wrap the playground in NoviqUIConfigProvider"
```

---

## Task 6: Docs, changelog, and version bump

**Files:**
- Modify: `README.md` (new "Breaking change in 3.0.0" section + rewritten Table intro, lines
  149-168)
- Modify: `progress.md` (new "Ready to publish" entry for `3.0.0`)
- Modify: `package.json:4` (version bump)

- [ ] **Step 1: Add a "Breaking change in 3.0.0" section to `README.md`**

Insert a new section immediately after the existing `## Breaking change in 2.0.0` section and
before `## Usage/Examples` (currently line 37):

```md
## Breaking change in 3.0.0

`Table`'s `apiFunction` used to have to resolve to exactly `{ result: T[], totalCount: number }`
— that shape mirrored one specific consumer's backend rather than being a neutral contract.

`apiFunction` now resolves to your backend's raw, untouched response instead. Every app using
`apiFunction` must wrap its root (or the relevant subtree) in `NoviqUIConfigProvider`, declaring
once how to read rows/total out of that raw response — see the Table section below.
`TableQueryResult` is removed from the public API; `TableQueryParams` is now
`Record<string, unknown>` since its field names are configurable
(`config.table.requestParams`) rather than fixed.

`preFetchedData`-only tables are unaffected — no `NoviqUIConfigProvider` is required for them.
```

- [ ] **Step 2: Rewrite the Table section's intro example**

Replace the existing intro (currently lines 149-171):

```md
### Table

`Table` needs to know your backend's response shape once, via `NoviqUIConfigProvider` wrapped
around your app root (or wrapped more locally, if different screens hit different backends):

\`\`\`javascript
import { NoviqUIConfigProvider, Table } from "noviq-ui";

// apiFunction receives { ...apiParams, search, page_no, rows_per_page } (the key names are
// customizable via config.table.requestParams) and should resolve to your backend's raw,
// untouched response — Table reads rows/total out of it using config.table.responseFormat.
function App() {
  return (
    <NoviqUIConfigProvider
      config={{
        table: {
          // For a backend returning { result: { result: [...], totalCount: 42 } }:
          responseFormat: { rowsPath: "result.result", totalPath: "result.totalCount" },
        },
      }}
    >
      <Example />
    </NoviqUIConfigProvider>
  );
}

function Example() {
  const columns = [
    { id: "name", heading: "Name", accessorKey: "name", sortable: true },
    { id: "status", heading: "Status", accessorKey: "status", type: "status" },
    { id: "joinDate", heading: "Joined", accessorKey: "joinDate", type: "date" },
  ];

  const fetchEmployees = (params) =>
    fetch(`/api/employees?${new URLSearchParams(params)}`).then((r) => r.json());

  return <Table columns={columns} apiFunction={fetchEmployees} searchPlaceholder="Search..." />;
}
\`\`\`

`NoviqUIConfigProvider` is mandatory for any `Table` using `apiFunction` — rendering one without
either a `Provider` ancestor or a per-instance `responseFormat` prop throws immediately with an
actionable error message. For a response shape a dot-path can't express, use a `getRows`/
`getTotal` function pair instead of `rowsPath`/`totalPath`. A specific `<Table>` can override
the app-wide format with its own `responseFormat` prop — e.g. one screen calling a third-party
API with a different shape than the rest of the app.

Pass `preFetchedData` instead of `apiFunction` for a fully client-controlled table (no fetching,
no `@tanstack/react-query`, and no `NoviqUIConfigProvider` requirement — you own the array).
```

- [ ] **Step 3: Add a `progress.md` entry**

Add a new bullet under the existing `## Ready to publish` heading (above the existing `2.5.2`
entry, so the newest entry reads first):

```md
- `3.0.0` — **breaking change**: `Table`'s `apiFunction` now resolves to the raw backend
  response instead of a fixed `{ result, totalCount }` shape; `TableQueryResult` is removed.
  Every app now declares its backend's response format once via the new
  `NoviqUIConfigProvider` (`config.table.responseFormat`), instead of hand-writing
  shape-translation code per `apiFunction`. Also introduces `config.table.requestParams` to
  rename the `search`/`page_no`/`rows_per_page` query keys `Table` sends. See
  `docs/superpowers/specs/2026-09-04-config-provider-design.md` for the full design. Build +
  test + pack sanity checks all pass; awaiting explicit go-ahead to run `npm publish`.
```

- [ ] **Step 4: Bump the version**

In `package.json`, change line 4:

```json
  "version": "3.0.0",
```

- [ ] **Step 5: Full verification pass**

Run, in order, from `/Users/neerajyadav/Documents/sk/noviq/noviq-ui`:

```bash
npx tsc --noEmit
npm test
npm run build
```

Expected: all three succeed with no errors — this is the final gate before the release is
considered ready (matching how `progress.md`'s existing `2.5.x` entries describe "Build + test
+ pack sanity checks all pass").

- [ ] **Step 6: Commit**

```bash
git add README.md progress.md package.json
git commit -m "docs: document 3.0.0 breaking change, bump version"
```

---

## Post-plan note

This plan does not run `npm publish` — per `progress.md`'s own convention for prior releases
(`2.5.1`/`2.5.2` are staged but "awaiting explicit go-ahead"), publishing is a separate,
explicit action for the user to trigger.
