# noviq-ui: mandatory config provider for backend response shape

**Status:** approved design, not yet implemented
**Author:** brainstormed with the user, 2026-09-04
**Breaking change:** yes — ships as `3.0.0` (current published version: `2.5.2`)

## Problem

`noviq-ui`'s `Table` component takes a consumer-supplied `apiFunction` with a fixed contract:

```ts
apiFunction?: (params: TableQueryParams) => Promise<TableQueryResult<T>>;

interface TableQueryParams {
  search: string;
  page_no: number;
  rows_per_page: number;
}

interface TableQueryResult<T> {
  result: T[];
  totalCount: number;
}
```

`page_no`, `rows_per_page`, `result`, and `totalCount` are not neutral names — they're a direct
mirror of `noviq-hrms-ui`'s own backend envelope (confirmed against
`noviq-hrms-ui/src/utils/UseTableApi.js`, which reads `res.data.result.result` /
`res.data.result.totalCount`). `Table` was extracted from HRMS's hand-rolled `DataTable.jsx`
(see `context.md`) and inherited its conventions as if they were the package's own contract.

`noviq-ui` is a published, public npm package intended for every Noviq frontend
(`noviq-hrms-ui`, `noviq-lms-admin-ui`, `noviq-lms-learner-ui`,
`asset-management-system/apps/web`) plus external users — none of whose backends are
guaranteed to share HRMS's response envelope. Today, a consumer with a differently-shaped
backend can only cope by hand-writing an `apiFunction` that manually reshapes its raw response
into `{result, totalCount}` on every call site. That per-consumer translation code is the actual
problem this design removes.

**Note:** as of this design, no frontend actually depends on `noviq-ui` yet (none list it in
`package.json` — see `context.md`), so this breaking change has zero live-consumer migration
cost. This is the cheapest point at which to fix the contract.

## Goals

- A consuming app declares its backend's response/request shape **once**, in one place.
- `Table` (and any future data-fetching component) reads that declaration automatically —
  no per-call-site translation code required.
- The declaration is **mandatory**: a `Table` that needs it and doesn't have one fails loudly
  and immediately, not silently defaulting to HRMS's shape.
- The mechanism is extensible: this pass only populates `table` config, but the type is shaped
  so future config sections (see Roadmap) don't require another breaking change.

## Non-goals

- The package does not take over making the actual HTTP request. `apiFunction` stays
  consumer-authored and keeps full ownership of the network call (base URL, auth headers,
  retries, interceptors) — that's app-specific and out of scope for a UI library.
- No attempt to support arbitrary/exotic response shapes beyond "nested object, array of rows
  somewhere in it, count somewhere in it" out of the box — the `getRows`/`getTotal` function
  escape hatch covers the long tail instead of over-engineering the declarative path syntax
  (e.g. no array-wildcard path syntax, no JSONPath).

## Architecture

### `NoviqUIConfig` and the Provider

```ts
// src/config/types.ts
export interface ResponseFormatPaths {
  rowsPath: string;
  totalPath: string;
}

export interface ResponseFormatFns<T = any> {
  getRows: (raw: unknown) => T[];
  getTotal: (raw: unknown) => number;
}

/** Exactly one of the two variants — never both, never neither. */
export type TableResponseFormat<T = any> = ResponseFormatPaths | ResponseFormatFns<T>;

export interface TableRequestParamNames {
  search?: string;
  page?: string;
  pageSize?: string;
}

export interface NoviqUITableConfig {
  responseFormat: TableResponseFormat;
  /** Defaults to { search: "search", page: "page_no", pageSize: "rows_per_page" } — today's names. */
  requestParams?: TableRequestParamNames;
}

export interface NoviqUIConfig {
  table: NoviqUITableConfig;
  // Future sections slot in here without another breaking change — see Roadmap:
  // theme?: NoviqUIThemeConfig;
  // locale?: NoviqUILocaleConfig;
  // notify?: (message: string, kind: "loading" | "success" | "error") => void;
}
```

```tsx
// src/config/NoviqUIConfigProvider.tsx
const NoviqUIConfigContext = React.createContext<NoviqUIConfig | undefined>(undefined);

export function NoviqUIConfigProvider({
  config,
  children,
}: {
  config: NoviqUIConfig;
  children: React.ReactNode;
}) {
  validateTableConfig(config.table); // throws synchronously on a malformed responseFormat
  return <NoviqUIConfigContext.Provider value={config}>{children}</NoviqUIConfigContext.Provider>;
}

export function useNoviqUIConfig(): NoviqUIConfig | undefined {
  return useContext(NoviqUIConfigContext);
}
```

Usage:

```tsx
<NoviqUIConfigProvider
  config={{
    table: {
      responseFormat: { rowsPath: "result.result", totalPath: "result.totalCount" },
      // requestParams omitted -> defaults match today's HRMS-shaped names
    },
  }}
>
  <App />
</NoviqUIConfigProvider>
```

### Response shape resolution

```ts
// src/config/responseFormat.ts
function resolvePath(obj: unknown, path: string): unknown {
  return path
    .split(".")
    .reduce<unknown>((acc, key) => (acc && typeof acc === "object" ? (acc as Record<string, unknown>)[key] : undefined), obj);
}

function isPathsFormat(f: TableResponseFormat): f is ResponseFormatPaths {
  return "rowsPath" in f;
}

export function extractRows<T>(raw: unknown, format: TableResponseFormat<T>): T[] {
  if (!isPathsFormat(format)) {
    try {
      return format.getRows(raw) ?? [];
    } catch (err) {
      devWarn("getRows threw", err, raw);
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
  if (!isPathsFormat(format)) {
    try {
      return format.getTotal(raw) ?? 0;
    } catch (err) {
      devWarn("getTotal threw", err, raw);
      return 0;
    }
  }
  const value = resolvePath(raw, format.totalPath);
  return typeof value === "number" ? value : 0;
}
```

`devWarn` logs via `console.warn` only outside production builds (mirrors how other libraries
gate dev-only warnings) — a per-request shape mismatch degrades to an empty table rather than
throwing, since a transient bad/error response is expected traffic, not a setup mistake.

### `Table` integration

```ts
export interface TableProps<T = any> {
  // ...existing props...
  apiFunction?: (params: TableQueryParams) => Promise<unknown>; // was Promise<TableQueryResult<T>>
  /** Overrides the NoviqUIConfigProvider's table.responseFormat for this instance only. */
  responseFormat?: TableResponseFormat<T>;
}

export type TableQueryParams = Record<string, unknown>;
```

Inside `TableInner`:

```ts
const DEFAULT_REQUEST_PARAMS: Required<TableRequestParamNames> = {
  search: "search",
  page: "page_no",
  pageSize: "rows_per_page",
};

const noviqConfig = useNoviqUIConfig();
const responseFormat = props.responseFormat ?? noviqConfig?.table?.responseFormat;
const requestParams = { ...DEFAULT_REQUEST_PARAMS, ...noviqConfig?.table?.requestParams };

const isUsingApiFunction = !!apiFunction && preFetchedData.length === 0 && !hidden;

if (isUsingApiFunction && !responseFormat) {
  throw new Error(
    'noviq-ui: <Table> needs a response format. Wrap your app in ' +
    '<NoviqUIConfigProvider config={{ table: { responseFormat: {...} } }}> or pass a ' +
    '"responseFormat" prop directly to this <Table>.'
  );
}

const { data: queryResult, isLoading: isQueryLoading } = useQuery({
  queryKey,
  queryFn: () =>
    apiFunction!({
      ...(apiParams as Record<string, unknown>),
      ...getFilterParams(),
      [requestParams.search]: debouncedSearch,
      [requestParams.page]: pagination.page,
      [requestParams.pageSize]: pagination.pageSize,
    }),
  enabled: isUsingApiFunction,
  retry: 3,
});

// responseFormat may still be undefined here even after the throw above: the throw only
// fires when isUsingApiFunction is true, but `hidden` (which defers fetching, see
// isUsingApiFunction) can be true with an apiFunction set and no responseFormat configured
// yet — that's not an error, just "not fetching right now". Guard the extraction calls
// rather than asserting non-null, so that combination degrades to an empty table instead
// of throwing a TypeError from inside extractRows/extractTotal.
const data: T[] = usingPreFetched
  ? preFetchedData
  : responseFormat
    ? extractRows(queryResult, responseFormat)
    : [];
const totalItems = usingPreFetched
  ? preFetchedData.length
  : responseFormat
    ? extractTotal(queryResult, responseFormat)
    : 0;
```

**The mandatory check only fires in fetch mode** (`isUsingApiFunction`). A `Table` used purely
with `preFetchedData` never touches `apiFunction` or response shape, so it never needs a
Provider — forcing one on fully-controlled usage would be pointless friction unrelated to the
problem being solved. A `hidden` table with `apiFunction` set skips the throw too (it isn't
fetching yet), so `responseFormat` is treated as optional-but-not-yet-required in that state
rather than crashing — the throw will still fire the moment it becomes un-hidden without a
configured format.

`useTableExport.ts`'s `fetchRows` gets the same treatment: build the request object with
`requestParams`, then `extractRows(await apiFunction(...), responseFormat)`.

### Removed / changed public exports

- `TableQueryResult<T>` — **removed**. No longer part of the contract; `apiFunction` returns
  `unknown`.
- `TableQueryParams` — narrows to `Record<string, unknown>` (field names are no longer fixed;
  they come from `requestParams` config, so static typing on specific key names isn't
  achievable — documented as an accepted tradeoff).
- New exports: `NoviqUIConfigProvider`, `useNoviqUIConfig`, `NoviqUIConfig`,
  `TableResponseFormat`, `ResponseFormatPaths`, `ResponseFormatFns`, `TableRequestParamNames`.

## Error handling summary

| Situation | Behavior |
|---|---|
| `NoviqUIConfigProvider` mounted with a malformed `table.responseFormat` (neither/both variants present) | Throws synchronously at Provider mount, with a message naming the bad field. |
| `<Table apiFunction={...}>` rendered with no Provider ancestor and no `responseFormat` prop | Throws synchronously on render, actionable message (shown above). |
| Same as above, but `hidden={true}` | No throw (not fetching yet) and no crash — renders an empty table. Throws the moment `hidden` becomes `false` if still unconfigured. |
| `<Table preFetchedData={...}>` (no `apiFunction`) rendered with no Provider | No error — response shape is irrelevant in controlled mode. |
| Configured `rowsPath`/`totalPath` doesn't resolve against a specific response (e.g. backend returned an error envelope) | `[]` / `0` for that request, `console.warn` in dev, no throw. |
| `getRows`/`getTotal` function itself throws | Caught, same graceful-degrade + dev warn as above. |

## Testing plan

- New `src/config/responseFormat.test.ts`: path resolution (nested, missing, non-array),
  both format variants, warn-and-degrade behavior.
- New `src/config/NoviqUIConfigProvider.test.tsx`: throws on malformed config; valid config
  reaches `useNoviqUIConfig()` in a child.
- `Table.test.tsx` updates: add cases for (a) throws with neither Provider nor prop in fetch
  mode, (b) works via Provider, (c) prop overrides Provider, (d) `preFetchedData` mode needs
  neither, (e) `hidden={true}` with no config neither throws nor crashes.
- Update every existing `Table.test.tsx` / `useTableExport.test.ts` case that mocks
  `apiFunction` — they currently return `{result, totalCount}` directly and must be updated to
  return a raw shape plus supply a matching `responseFormat` (via a test-only Provider wrapper),
  so they exercise the new path instead of accidentally bypassing it.

## Migration

Breaking change → version bump to `3.0.0`. Since no real consumer exists yet, there is no live
migration to perform — this is scoped to:
1. Implement as designed above.
2. Update `README.md` with the `NoviqUIConfigProvider` setup as a required first step, replacing
   any existing `apiFunction`/`TableQueryResult` documentation.
3. Update `CHANGELOG`/`progress.md` noting the breaking change and rationale.
4. Update `dev/playground.tsx` (the local dev harness) to wrap in a `NoviqUIConfigProvider` so
   `npm run dev` keeps working.

## Roadmap: other config candidates (not built in this pass)

`NoviqUIConfig` is intentionally extensible so these can be added later without another breaking
change. Prioritized:

1. **`config.notify`** (high priority) — **built in `4.0.0`** as `notify?: (message, kind:
   "success" | "error") => void` (no `"loading"` kind), with `react-hot-toast` removed from the
   package entirely and `config.table` made optional. Original rationale: Table's export flow
   hardcoded `react-hot-toast` calls
   and requires the consumer to mount a `<Toaster/>`. Same class of problem as this design just
   solved, for notifications instead of data shape: `config.notify?: (message, kind) => void`
   would let a consumer route export feedback through whatever notification system they already
   use.
2. **`config.table.errorFormat` / `onError`** (medium priority) — `Table` has no error state
   today; a failed `apiFunction` call retries silently 3x via react-query then just renders
   empty. A parallel-shaped `errorFormat` (extract a human message from an error response) plus
   an `onError` callback would close this gap.
3. **`config.theme`** (medium priority) — tokens.css already centralizes theming via CSS custom
   properties; a `config.theme = {primary, radius, ...}` injected as inline vars on the
   Provider's wrapper would let a consumer brand the library without hand-writing a token
   override stylesheet.
4. **`config.locale`** (medium priority) — default date format/currency/timezone, so
   per-column props (`currency`, `isUtc`, etc.) don't need to repeat the same values on every
   column across an app.
5. **`config.table.defaultPageSizeOptions`** (low priority, cheap) — cuts repetition of the
   `pageSizeOptions` prop across every Table in an app.
6. **`config.i18n`** (low priority, no known need yet) — built-in UI strings (empty state,
   search placeholder) are English-only today. Only worth doing when a non-English consumer is
   actually on the roadmap.
7. **RBAC/permission gating for row/bulk/toolbar actions** — investigated and **not a gap**:
   `rowActions`/`bulkActions`/`actions` are already plain consumer-built arrays, filtered by the
   consumer's own permission logic before reaching `Table`. No config needed.
