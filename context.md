# noviq-ui — Context

## What it is
A standalone, lightweight **React component library** for the Noviq product suite. Published to
the public npm registry as [`noviq-ui`](https://www.npmjs.com/package/noviq-ui), currently at
**v2.5.0** on npm, with **v2.5.1 built/tested/staged but not yet published** (`1.1.0` shipped
Button/ScrollArea/Drawer/Modal; `2.0.0` shipped an Input rewrite plus Label/Switch/FormFooter/Form;
`2.1.0` shipped `Table` sub-phase 3a core table; `2.2.0` shipped sub-phase 3b column show/hide/
reorder/pin + optional `localStorage` persistence; `2.3.0` shipped sub-phase 3c row
selection/actions/bulk actions; `2.4.0` shipped sub-phase 3d-i filters; `2.5.0` shipped sub-phase
3d-ii Excel/CSV export, completing Table's full 3a-3d feature set; `2.5.1` fixes a real `Drawer`
responsive-breakpoint bug and clarifies `Form`'s `colSpan` docs — see below — found via
`noviq-ui-demo`, a standalone sibling project that installs the real published package against a
real backend) — see `progress.md` for the phase-by-phase extraction
history. Intended to be installed as a dependency
(`npm install noviq-ui`) by the other frontends in the suite
(`noviq-hrms-ui`, `noviq-lms-admin-ui`, `noviq-lms-learner-ui`, `asset-management-system/apps/web`)
so they can share UI components instead of each re-implementing them.

The extraction source is **`noviq-hrms-ui`**, which has two overlapping "design system" folders
(`src/components/ui/` and `src/components/design/`) plus a hand-rolled `DataTable`. `noviq-ui` is
being built up by porting the best/least-coupled version of each piece out of there, re-themed
onto `noviq-ui`'s own plain-CSS + `:root`-custom-property convention rather than HRMS's CSS
Modules + CoreUI/Bootstrap classes. Order of extraction (decided with the user): Drawer + Modal +
supporting primitives first (done, `1.1.0`), Form/Input system next (done, `2.0.0`), Table last —
the hardest, since the source `DataTable.jsx` is deeply coupled to Redux + react-query + the app's
axios instance + a permission-gating singleton. Table itself is split into sub-phases, **all now
done**: 3a core table, 3b column management, 3c row/bulk actions, 3d further split into 3d-i
filters and 3d-ii export (staged as `2.4.0`/`2.5.0` — see `progress.md`). Table's own
`ViewModeToggle`/`ViewComponent` alternate-view escape hatch was deliberately left out of 3d
entirely (confirmed near-dead in HRMS — 1 real working call site out of 97).

**Not currently a git repo** — there is no `.git` directory in this checkout, unlike the other
six repos documented in the suite-level `CLAUDE.md`. It also isn't listed in that file's repo
table. Treat it as a newly-added, ungitted package until it's initialized/cloned properly.

**Not yet consumed anywhere**: none of the other repos in this directory (`noviq-hrms-ui`,
`noviq-lms-admin-ui`, `noviq-lms-learner-ui`, `asset-management-system`) list `noviq-ui` as a
dependency in their `package.json` yet, despite it being published. It's built but not adopted —
swapping a consumer frontend over to it is explicitly deferred to a later phase.

## Tech stack
- React 18/19 (peer dependency, `>=18`) + TypeScript (`strict: true`)
- Bundled with **Vite** (`vite build`) using library mode, output format ESM only
  (`dist/noviq-ui.mjs` + `dist/noviq-ui.css`), type declarations emitted via `vite-plugin-dts` /
  `tsc --emitDeclarationOnly`
- **Vite emits component CSS as a separate file, not auto-injected** — consumers must
  `import "noviq-ui/style.css"` once (documented in README). Exposed via a `"./style.css"` entry
  in `package.json`'s `exports` map alongside the default `"."` entry.
- No CSS-in-JS / Tailwind — plain CSS files per component, themed via CSS custom properties
  centralized in `src/styles/tokens.css` (imported once from `src/index.ts`) — `--primary`,
  `--danger`, `--heading`, `--border-color`, `--radius`, `--shadow`, `--overlay-bg`, `--muted`,
  `--surface-hover`, etc.
- Regular (non-peer) `dependencies`: `lucide-react` (icons), `framer-motion` (Modal's enter/exit
  animation), `react-select` (Input's select/multiSelect, Table's page-size dropdown), `formik`
  (Form's state management), `react-hotkeys-hook` (ActionBar's `/`-to-focus-search shortcut, also
  reused by `RejectAction`'s Escape-to-close — needs `{ enableOnFormTags: true }` since its reason
  textarea auto-focuses on open), `@tanstack/react-query` (Table's `apiFunction`
  data-fetching/caching/retry), `xlsx-js-style` (Table's export — chosen over plain `xlsx` for its
  cell-styling support, used to bold+color the exported Excel header row), `react-hot-toast`
  (Table's export loading/success/error feedback — **the one dependency here that needs a
  consumer-side mount**: `Table` doesn't render its own `<Toaster/>`, since `toast()` calls
  broadcast to every mounted `<Toaster/>` and auto-mounting one per `<Table>` would double up with
  an app's own instance — documented in README) — all bundled so
  consumers get them for free rather than needing to install/version them themselves. `Table`
  creates and owns its own internal `QueryClient` (one per `<Table>` instance) so consumers never
  need to set up `@tanstack/react-query` themselves or wrap their app in a `QueryClientProvider` —
  it's an implementation detail, not part of the public contract.
- **Build output is code-split, not fully inlined**: `vite.config.ts`'s Rollup output originally
  set `inlineDynamicImports: true` (from Phase 1, to keep the library as one clean
  `dist/noviq-ui.mjs` file). Adding `xlsx-js-style` (1MB+ unminified) behind a dynamic
  `await import("xlsx-js-style")` in `useTableExport.ts` exposed a real problem with that setting:
  it forced the entire library into the single inlined file regardless of the dynamic import,
  ballooning every consumer's bundle by ~340KB gzip whether or not they use export. Fixed by
  switching to Vite 8's `codeSplitting: true` output option, which correctly emits
  `xlsx-js-style` as its own lazy-loaded chunk (`dist/xlsx.min-*.js`) — only fetched at runtime
  when a consumer actually calls `exportToExcel`/`exportToCSV`. `dist/noviq-ui.mjs`'s own dynamic
  `import()` resolves the chunk via a relative path automatically; no `package.json` `exports`
  changes were needed since the chunk is never imported directly by consumers.
- Package is ESM-only (`"type": "module"`), two export subpaths: `"."` (JS) and `"./style.css"`.
- `react` / `react-dom` / JSX runtimes are Rollup externals — consumers must supply their own React
- Testing: Vitest + React Testing Library + jsdom (`npm test`), `globals: true` so
  testing-library's automatic unmount-cleanup works without per-file `afterEach` boilerplate.
  `environmentOptions.jsdom.url` set explicitly in `vitest.config.ts`. **This jsdom/Vitest/Node
  combination doesn't reliably expose a working `window.localStorage`** (it resolves to a plain
  object with no `Storage` prototype — a Node warning about a `--localstorage-file` flag suggests
  Node's own experimental `localStorage` global is interfering) — `src/test/setup.ts` installs a
  small in-memory polyfill whenever `window.localStorage.setItem` isn't actually a function, so
  `localStorage`-backed tests (column-settings persistence) are deterministic regardless.
- Local-only dev playground (`index.html` + `dev/playground.tsx`, served via `npm run dev`) for
  visually exercising components — excluded from the npm tarball by `package.json`'s
  `"files": ["dist"]`, so it never ships.

## Structure
```
noviq-ui/
├── src/
│   ├── index.ts                     # public API — all components + their prop types
│   ├── styles/tokens.css            # shared :root design tokens, single source of truth
│   ├── test/setup.ts                # jest-dom matchers for Vitest
│   └── components/
│       ├── Input/                   # Input.tsx + .css + .test.tsx (18 field types)
│       ├── Button/                  # Button.tsx + .css + .test.tsx
│       ├── ScrollArea/              # ScrollArea.tsx + .css + .test.tsx
│       ├── Drawer/                  # Drawer.tsx + .css + .test.tsx (portal slide-over)
│       ├── Modal/                   # Modal.tsx + .css + .test.tsx (portal, framer-motion)
│       ├── Label/                   # Label.tsx + .css + .test.tsx
│       ├── Switch/                  # Switch.tsx + .css + .test.tsx
│       ├── FormFooter/              # FormFooter.tsx + .test.tsx (built on Button)
│       ├── Form/                    # Form.tsx + .css + .test.tsx (config-driven, Formik)
│       ├── Badge/                   # Badge.tsx + .css + .test.tsx
│       ├── Dropdown/                # Dropdown.tsx + .css (DropdownMenu, DropdownMenuItem)
│       ├── Checkbox/                # Checkbox.tsx + .css + .test.tsx
│       └── Table/                   # Table.tsx + ActionBar/TableCell/TablePagination/
│                                     #   ColumnSelector/EmptyState/LoadingOverlay/
│                                     #   RowActionsMenu/RejectAction/BulkActionsBar/
│                                     #   FilterDrawer/FilterChips/Export +
│                                     #   useTableColumnSettings.ts + buildActiveFilter.ts +
│                                     #   useTableExport.ts + cellValue.ts + constants.ts +
│                                     #   dateFormat.ts + textTransforms.ts + .test.tsx per piece
├── dev/playground.tsx               # manual visual-testing harness, not published
├── index.html                       # dev-server entry point, not published
├── public/                          # favicon.svg, icons.svg
├── vite.config.ts                   # library build config + dev server port (5176)
├── vitest.config.ts                 # test runner config
├── tsconfig.json / tsconfig.node.json
└── package.json                     # deps: lucide-react, framer-motion, react-select, formik,
                                      #   react-hotkeys-hook, @tanstack/react-query
```

## Components

### `Input`
One component, `type`-switched (à la a spreadsheet of input variants). **Rewritten in full for
2.0.0** — was previously a thin 11-type scaffold with an event-based `onChange(e)`; now ported
from the real HRMS `design/form/Input.jsx` (881 lines, 92 call sites in HRMS). 18 field types now
implemented: `text, email, password, textArea, search, number, checkbox, radio, switch, select,
multiSelect, date, time, month, color, file, multipleFile, excelUpload`. `date`/`time`/`month`
stayed as noviq-ui's existing native `<input>` implementations rather than HRMS's custom
`react-datepicker`-based pickers (deferred — see Phase 2b in `progress.md`).

**Breaking change**: `onChange` now receives the raw **value**, not the event
(`onChange(value: any) => void`), matching all 92 HRMS call sites so future page-level porting is
closer to copy-paste. New `required`/`helper` props and an internal `InputContainer` layout
(label + required-asterisk + helper/error text) that HRMS's original had but noviq-ui's scaffold
didn't. Icons consolidated onto `lucide-react` only (source mixed in `react-icons/fa` for 3
icons — dropped). No i18n dependency (`react-i18next` dropped; 2 strings hardcoded, matching the
rest of the component's existing convention). `excelUpload` re-themed onto the same dropzone
visual language as `file`/`multipleFile` instead of porting raw Bootstrap utility classes.
Fallback: an unrecognized `type` renders literal text `"Worng input type provided"` (typo,
pre-existing, intentionally not fixed).

Explicitly out of scope, reserved in the `INPUT_TYPE` constant but unimplemented: `dateRange`,
`rowsPerPage`, `multiText`, `custom`, `reactQuill`.

### `Button`
Ported from `noviq-hrms-ui/src/components/ui/Button.jsx`. Variants: `default, outline,
destructive, secondary, ghost, link`. Sizes: `sm, md, lg, icon`.

### `ScrollArea`
Ported from `noviq-hrms-ui/src/components/ui/ScrollArea.jsx` — trivial styled scroll viewport,
used internally by `Drawer` and exported standalone too.

### `Drawer`
Ported from `noviq-hrms-ui/src/components/design/Drawer.jsx`. Portal-based slide-over panel,
sides `right/left/top/bottom`, sizes `sm/md/lg`. `onClose` is consistently `() => void` (cleanup
vs. source's inconsistent `onClose(false)`/`onClose()` calls).

### `Modal`
Ported from `noviq-hrms-ui/src/components/design/Modal.jsx`. Portal-based centered modal
animated with `framer-motion`, sizes `sm/md/lg/xl/auto`.

### `Label`
Ported from `noviq-hrms-ui/src/components/ui/Label.jsx`. Styled `<label>` wrapper, used
internally by `Input`'s `InputContainer` and exported standalone.

### `Switch`
Ported from `noviq-hrms-ui/src/components/design/ui/Switch.jsx`. Toggle switch, used internally
for `Input`'s `switch` type and exported standalone. Accessibility improvement vs. source: added
`role="switch"`, `aria-checked`, keyboard support (Enter/Space) — source was mouse-only with no
ARIA at all.

### `FormFooter`
Ported from `noviq-hrms-ui/src/components/design/form/FormFooter.jsx`. Cancel/Save/extra-buttons
row, built entirely on `Button`.

### `Form`
Ported from `noviq-hrms-ui/src/components/design/Form.jsx`. Config-driven: an `inputList` array
of field configs + a Formik instance renders a grid of `Input`s, auto-wiring
`formik.setFieldValue`/`touched`/`errors`. Supports `colSpan` (1/2/3) grid placement and an
`"info"` pseudo-type for section headers. Ported as-is with `formik` as a new dependency (not
generalized away from Formik) — the explicit decision on this component.

### `Badge`
Ported from `noviq-hrms-ui/src/components/ui/Badge.jsx`. Small pill, variants `default,
secondary, destructive, outline`. Used internally by `Table`'s `status` cell type.

### `DropdownMenu` / `DropdownMenuItem`
Ported from `noviq-hrms-ui/src/components/ui/Dropdown.jsx`. Portal-positioned menu with
auto-flip/clamp against viewport edges, closes on outside click. Used internally by `Table`'s
`ActionBar` for multi-option toolbar actions.

### `Checkbox`
Ported from `noviq-hrms-ui/src/components/ui/Checkbox.jsx`. Used internally by `Table`'s
auto-injected row-selection column, also exported standalone. **Accessibility fix vs. source**:
the source's native `<input type="checkbox">` is visually hidden (`display: none`), which also
removes it from the accessibility tree — the port moves `role="checkbox"`/`aria-checked`/
`aria-disabled`/keyboard support (Enter/Space) onto the visible box `<div>` instead, same fix
pattern as `Switch` in Phase 2.

### `RejectAction`
Ported from `noviq-hrms-ui/src/components/dataTable/RejectAction.jsx`. Confirm-with-reason
popover built on `Button`, portal-rendered, positioned from the trigger button's bounding rect.
Validates the typed reason with 4 rules ported verbatim from `utils/regex.js`: required, minimum
4 characters, no leading space, no repeating characters (4+ of the same char in a row), must
contain at least one alphanumeric character, not digits-only. **Bug fixed vs. source**: the reason
textarea has `autoFocus`, and `react-hotkeys-hook` disables hotkeys by default when focus is
inside a form field (`enableOnFormTags` defaults to `false`) — so Escape silently did nothing in
the source. Fixed by passing `{ enableOnFormTags: true }` to the `useHotkeys("esc", ...)` call.

### `RowActionsMenu`
Ported from `noviq-hrms-ui/src/components/dataTable/RowActionsMenu.jsx`. Renders a row's
`RowAction[]`: `button`/`checkbox`-typed actions render inline, everything else (including
untyped/`icon`-typed actions) groups into the existing `DropdownMenu`. `variant: "reject"` actions
render via `RejectAction` — but **only in inline mode** (`isWithoutDropdown`), matching the
source's own behavior exactly: a reject-variant action grouped into the dropdown is just a plain
menu item that calls `onConfirm` immediately with no reason prompt at all. **Bug fixed vs.
source**: HRMS wired `RejectAction`'s `onConfirm` as `async () => {...}`, discarding the `reason`
argument `RejectAction` actually passes to its callback. Fixed by adding `reason?: string` to the
`RowActionContext` object and populating it from the real callback parameter, so a consumer's
`onConfirm`/`onClick` now actually receives what the user typed.

### `BulkActionsBar`
Ported from `noviq-hrms-ui/src/components/dataTable/BulkActionsBar.jsx`. Near 1:1 port, fully
controlled (`selectedCount`, `actions`, `selectedIds`, `onClearSelection`), renders `null` at zero
selected.

### `buildActiveFilter`
New (no direct source equivalent) — `src/components/Table/buildActiveFilter.ts`. Consolidates two
independently-duplicated pieces of logic from `noviq-hrms-ui/src/components/dataTable/DataTable.jsx`
(`buildInitialFilters`) and `dataTable/FilterDrawer.jsx` (`handleApply`), both of which
reimplemented "filter config + raw value → `{id, label, displayValue, mandatory, apiPayload}`"
separately. Exports `FILTER_TYPE` (`search | date | select | dateRange | month`), `FilterConfig`,
`ActiveFilter` types.

### `FilterDrawer`
Ported/rebuilt from `noviq-hrms-ui/src/components/dataTable/FilterDrawer.jsx` (464 lines).
Self-contained trigger `Button` ("Filters", with an active-count badge) + `Drawer` — same
self-contained pattern as `ColumnSelector` (3b), so `Table` doesn't need to manage the drawer's
open/close state. Built on `Drawer`/`ScrollArea`/`Checkbox`. Draft state is local, only committed
via `onApplyFilter` on "Apply" (matches source's all-at-once, not incremental, apply behavior).
Two deliberate fixes vs. source:
- **`date` type**: source's `FilterDrawer.jsx` falls `date` through to the same generic branch as
  `search`, rendering a bare, undecorated text input — no date picker at all, despite the type
  name (confirmed via source read: nothing else in the file treats `date` as "just text", strongly
  suggesting an oversight). The port gives `date` its own native `<input type="date">` branch.
- **`select` type**: the source UI is a checkbox list (implying multi-select), but
  `handleToggleOption` always replaced the selection array with a single value — true multi-select
  was never actually reachable despite the comma-joined `apiPayload` format suggesting otherwise.
  The port makes `select` a genuine multi-select, matching what the checkbox UI already implies.
- `dateRange`/`month` use native `<input type="date"/"month">` (two date inputs for a range)
  instead of source's `react-datepicker` widgets — same native-input precedent established for
  `Input`'s own date/time/month types in Phase 2, reconfirmed for this sub-phase.

### `FilterChips`
Ported/rebuilt from `noviq-hrms-ui/src/components/dataTable/FilterChips.jsx` (54 lines). **Bug
fixed vs. source**: HRMS's "Clear all" handler also called `onSearchChange("")` alongside removing
every filter — meaning clearing filters in the source silently wiped the *unrelated* main search
box too. The port's `FilterChips` has no `onSearchChange` prop at all; "Clear all" only clears
filters, matching the already-established precedent of `BulkActionsBar`'s `onClearSelection` only
touching selection state.

### `cellValue.ts` (`getCellValue`, `buildCellFormatOptions`)
New (no direct source equivalent) — `src/components/Table/cellValue.ts`. Extracted from
`Table.tsx` during 3d-ii so both the render path (`Table`'s `getRenderValue`, via `TableCell`) and
the export path (`useTableExport`, via `formatTableCellValues` directly) share the same per-column
value/options logic instead of duplicating the range-type field lookups
(`fromDate`/`toDate`/`fromDateTime`/etc.) in two places. Purely a refactor — behavior-neutral,
confirmed via the full test suite passing unchanged before any export code was added on top of it.

### `Export` / `useTableExport`
Ported/rebuilt from `noviq-hrms-ui/src/hooks/useTableExport.jsx` (256 lines) + `Export.jsx` (59
lines, the dropdown UI). Excel export uses `xlsx-js-style` (matching source's choice — chosen over
plain `xlsx` for its cell-styling support, used to bold+color the exported header row `#02699B`),
CSV via `sheet_to_csv` + a UTF-8-BOM `Blob` + `<a download>` click, both ported near-verbatim from
source. Decoupling/fix decisions:
- **Fixed a real bug**: source's export always requested `rows_per_page: 10` and no real HRMS call
  site ever overrode it — every export in production HRMS today is silently truncated to 10 rows.
  The port fetches all rows matching the current search/filters in one call
  (`rows_per_page: totalItems`, current known count, falling back to a large sentinel if `0`).
- **`preFetchedData` mode, unhandled in source, exports directly**: no fetch, exports the
  already-client-sorted `sortedData` array as-is.
- **Deliberately does not call a column's `cell` render function for export** (source does, via
  `col.cell(row, cellValue, row)`): `TableColumn.cell` returns `React.ReactNode`, unsafe/meaningless
  to write into an XLSX cell. A column with `cell` but no `exportValue` falls back to the plain
  accessor value instead — a documented safety-motivated deviation, not a silent gap.
- **`react-hot-toast`** provides loading/success/error feedback (matches source's UX) — `Table`
  does not auto-mount its own `<Toaster/>` (see Tech stack above).
- `responseSheetUrl` escape hatch ported as-is: skips the whole export flow, just
  `window.open()`s a pre-generated report link, hides the CSV option — matches source.
- Column-level `export?: boolean` (default `true`) and `exportValue?: (row) => string | number` —
  new optional `TableColumn` fields, cheap ports of source's equivalent config.
- Exports the currently-*visible* column set (`displayColumns`, the 3b visibility/order-filtered
  list), not the full `columns` prop — matches source ("what you see is what you export").

### `Table` (sub-phases 3a-3d, now complete — core, column management, row/bulk actions, filters, export)
Ported/rebuilt from `noviq-hrms-ui/src/components/dataTable/DataTable.jsx` (1360 lines) +
`TableCell.jsx` + `TablePagination.jsx` + `ActionBar.jsx` + `ColumnSelector.jsx`. This is the
biggest and most architecturally different extraction so far — research found the source's Redux
usage (`tableDetailsSlice`) was pure persistence with zero real cross-component reads, its
permission-gating imported the app's Redux **store singleton directly**, and `moment` handled all
date/duration formatting. Decoupling decisions (confirmed with the user):
- **Data-fetching contract simplified to just `apiFunction`**: `(params) =>
  Promise<{result: T[], totalCount: number}>`. The source's second path (`apiEndPoint` +
  `useGetData` + a shared `axiosInstance` + its own independent Redux permissions check) is
  dropped entirely — it was only used in 6 of 97 real call sites, `apiFunction` dominates.
  `preFetchedData` remains as the fully client-controlled alternative.
- **No permission-gating** — the library doesn't know about permissions at all; consumers
  pre-filter whatever `actions`/columns/export config they pass in. (HRMS's own gating imported
  its Redux store singleton directly — not portable, and not something a generic library should
  bake in.)
- **No `moment`** — date/time/duration formatting rewritten onto hand-rolled
  `Intl`-adjacent formatting (`src/components/Table/dateFormat.ts`), matching the same
  `DD/MM/YYYY` / `hh:mm A` output HRMS produces, but only accepting ISO-8601 input (source's
  arbitrary `currentFormat` string parsing is not supported).
- **Sorting is client-side only** (ported faithfully — confirmed by reading the actual comparator,
  not just relying on a summary) — it sorts whatever page of data is currently loaded, exactly
  like the source. It's a real, if easy-to-miss, limitation worth knowing: sorting a
  server-paginated table only reorders the current page, not the full dataset.
- **`Table` owns its own `QueryClient`** internally (see Tech stack) rather than requiring the
  host app to set one up.
- **`AVATAR` cell type dropped** (needs `ui/UserInfo`, which is Redux/router-coupled — not
  ported). **`STATUS` cell type kept**, but its color mapping is now a consumer-overridable
  `statusVariantMap` prop instead of a hardcoded HRMS-specific status list.
- **Column management (3b)**: `useTableColumnSettings(id, columns)` hook replaces
  `tableDetailsSlice` — reads `localStorage.getItem('noviq-ui-table-columns:${id}')` once on
  mount, writes on every change, falls back to deriving defaults from each column's `visible`/
  `sticky` fields when nothing is persisted (same fallback logic as the source). Persistence is
  **opt-in via a stable `id` prop** on `Table`, not automatic like the source — the source always
  computed a storage key from `tableId || exportFileName`, but `exportFileName` defaulted to a
  timestamp generated fresh on every mount when neither was passed, meaning persistence silently
  never "stuck" unless the consumer happened to pass a stable label (which real call sites always
  did in practice, so this was latent, not actually hit). Multi-tenant/multi-user isolation needs
  no library feature — `id` is a plain string, so `id={`employees-${tenantId}`}` is all a
  multi-tenant app needs; documented in the README rather than built as a separate prop.
- **`ColumnSelector`** ported from `dataTable/ColumnSelector.jsx`, but built on `noviq-ui`'s own
  `Drawer` (Phase 1) instead of porting HRMS's `ui/Sheet.jsx` — the two are near-identical
  Context-based portal panels, so porting `Sheet` too would have been pure duplication. Drag-to-
  reorder ported as-is via native HTML5 `draggable` (no drag-and-drop library) — known limitation
  carried over: no touch/mobile support.
- **"Reset Columns" actually resets now**, unlike the source: its `removeItemFromStorage`
  call didn't clear anything meaningful in practice (redux-persist's storage envelope isn't a
  literally-named key), confirmed as very likely dead code. The rebuilt version calls a real
  `localStorage.removeItem` on the actual key.
- **Sticky-column positioning is computed in JS**, not measured — `Table` sums each sticky
  column's `width` prop (falling back to a 140px default when unset) to compute cumulative
  `left`/`right` offsets for `position: sticky`. Accurate when columns declare explicit widths,
  approximate otherwise (no `ResizeObserver`/DOM-measurement pass) — a deliberate scope trade-off
  for this sub-phase, not a bug.
- `ActionBar` in 3a only wired up search + toolbar `actions`; 3b added a `columnSelector?:
  ReactNode` slot prop rather than threading column-visibility props through `ActionBar` itself —
  the filter/export/view-toggle slots for 3c/3d will likely follow the same pattern. Confirms the
  earlier note that `ActionBar` grows incrementally across sub-phases, not "ported once, done."
- Known rough edge, not fixed yet: the built-in search box has no effect in `preFetchedData`
  mode (matches the source's own behavior — search was always a server-side-only feature there
  too, never client-side filtering).
- **Row selection, row actions, bulk actions (3c)**: `getRowId?: (row: T) => string` (presence
  enables row selection) and `rowActions?: (row: T) => RowAction<T>[]` each auto-inject a
  pseudo-column into the rendered column set — `select` (sticky-left, width 48) and/or `actions`
  (sticky-right, width 90). **Deliberate API improvement vs. source**: `DataTable.jsx` requires
  consumers to hand-add `{id: "select"}` / `{id: "actions", actionsList: fn}` entries to their own
  `columns` array and special-cases those reserved ids during render — a footgun if forgotten
  (silently means "no checkboxes"). Confirmed via research (3a/3c prep) that `getRowId`/
  `bulkActions` are dead code in HRMS today — zero real call sites use them — so no real-world
  contract was broken by auto-injecting instead. `bulkActions?: BulkAction[]` renders
  `BulkActionsBar` between `ActionBar` and the table body once `selectedRows.size > 0`.
  `onRowSelectionChange?: (selectedIds: string[]) => void` fires on every selection change.
  `isRowActionsWithoutDropdown?: boolean` threads through to `RowActionsMenu` to opt into
  all-actions-inline (required to reach the reject-with-reason popover — see `RowActionsMenu`
  above). Sticky-offset computation (see the JS-computed offsets note above) treats `select`/
  `actions` as always-sticky, alongside whatever `columnSettings.stickyColumns` the 3b column
  chooser has configured.
- No permission-gating on `rowActions`/`bulkActions` either — same standing decision as columns
  and export: the consumer pre-filters whatever it passes in.
- **Filters (3d-i)**: `filterConfigs?: FilterConfig[]` prop enables a `FilterDrawer` (rendered via
  `ActionBar`'s new `filters?: ReactNode` slot, same pattern as 3b's `columnSelector` slot) and a
  `FilterChips` row (rendered by `Table` itself, same convention as `BulkActionsBar`). `Table` owns
  `activeFilters` state and `getFilterParams()`, merged into the `apiFunction` query params
  alongside `search`/pagination — the same integration point `apiParams` already uses. **Filters
  are session-only** (plain `useState`, no `localStorage`) — a deliberate departure from column
  settings' opt-in `id`-based persistence, since a stale filter surviving a reload is a more
  common source of user confusion than a stale column layout. `mandatory: true` on a filter config
  makes it non-removable and survives "Clear all", matching the source's `mandatory` flag exactly.
  `FilterDrawer` doesn't expose `isOpen`/`onOpenChange` (fully self-contained, like
  `ColumnSelector`), so the source's "click a chip to reopen the drawer" convenience wiring
  (shared open-state between `ActionBar` and the drawer) is dropped — same trade-off already
  accepted for `ColumnSelector` in 3b.
- **Export (3d-ii)**: `exportFileName?`/`isExportHidden?`/`responseSheetUrl?` props, plus
  `TableColumn.export?`/`exportValue?`. `useTableExport` instantiated with `displayColumns`
  (already visibility/order-filtered), `debouncedSearch`, `getFilterParams()`, `sortedData` (used
  only in `preFetchedData` mode), and `totalItems` (drives the "fetch all matching rows" fix — see
  `Export`/`useTableExport` above). `ActionBar` gained an `exportControl?: ReactNode` slot, same
  self-contained-slot pattern as `filters`/`columnSelector`. No permission-gating on export
  either — same standing decision as every other Table feature.

## Gaps worth knowing about
- **`lint` script still has no config** — ESLint 9 needs flat config, none exists. Confirmed
  still broken; intentionally out of scope across both phases so far.
- **No CI/CD** — no GitHub Actions/Azure Pipelines config found, unlike `asset-management-system`.
- Not a git repo in this checkout — nothing here is version-controlled locally yet, now a bigger
  risk than ever with Table's entire 3a-3d feature set sitting uncommitted.
- Two duplicate primitive sets still exist in `noviq-hrms-ui` (`ui/` vs `design/ui/` for Button,
  Switch, ScrollArea) that were **not** reconciled there — only resolved on the `noviq-ui` side by
  picking one canonical source per component during extraction.
- The rich, custom-built Date/Time/Month pickers in HRMS (`react-datepicker` + a 188-line custom
  header, plus an entirely hand-rolled `TimeInput`) were deliberately deferred — noviq-ui's
  `date`/`time`/`month` are still plain native inputs.
- **`noviq-ui`'s own `dev/playground.tsx` never caught `Drawer`'s missing responsive breakpoint**
  (fixed in `2.5.1`) because it imports straight from local pre-build source and was never tested
  at a narrow viewport — only found via `noviq-ui-demo` (see below), which consumes the real
  published npm package. Worth remembering: the local playground is good for fast iteration, but
  isn't a substitute for testing against the actual built/published artifact, ideally at more than
  one viewport width. (A second reported issue, `Form`'s field layout looking wrong, turned out
  *not* to be a `Form.css` bug on investigation — see the `2.5.1` notes in `progress.md` for the
  full story of how a misleading JSDoc comment led to a wrong first diagnosis, caught before it
  shipped.)

## `noviq-ui-demo` — a standalone integration-test sibling project
`/Users/neerajyadav/Documents/sk/noviq/noviq-ui-demo/` (own README) is a small, separate project —
`server/` (Express + TS, in-memory sample data) + `web/` (Vite + React + TS) — that installs
`noviq-ui` from the **real npm registry** (not a local link) and exercises most of the library
against real HTTP calls: `Table` (search/sort/pagination/filters/row+bulk actions/export),
`Drawer` + `Form`/Formik. It exists specifically to answer "does `npm install noviq-ui` actually
work for a real consumer," a question neither `noviq-ui`'s own Vitest suite nor its local-source
dev playground can answer. Not itself a git repo yet, same gap as `noviq-ui` (see above). When
debugging a `noviq-ui` release, `npm link`ing a fresh local build into `noviq-ui-demo/web` (then
clearing `node_modules/.vite` in the demo, since Vite's dependency pre-bundle cache goes stale
across a `npm link` swap) is a fast way to verify a fix against a real consumer before publishing —
this is exactly how the `2.5.1` fixes were verified.

## How this fits the suite
Suite-wide, HRMS/LMS/AMS each hand-roll their own form-input, table, and drawer/modal components
today. `noviq-ui` is being built up as the shared alternative, one extraction phase at a time,
closest in spirit to how `asset-management-system` already shares a `packages/shared` package
between its own frontend and backend. **Table's full 3a-3d feature set (core, column management,
row/bulk actions, filters, export) is now done** — the next real milestone is getting one of the
four consumer frontends to actually add `noviq-ui` as a dependency and swap in its components for
their local equivalents — see `progress.md` for the phased roadmap.
