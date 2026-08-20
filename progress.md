# noviq-ui — Progress

_Last updated 2026-08-19, mid-way through the HRMS-component-extraction project (see
`context.md` for the "how this fits the suite" background)._

## Extraction roadmap
1. **Phase 1 — Drawer + Modal + primitives** ✅ done, **published as `1.1.0`**.
2. **Phase 2 — Form/Input system** ✅ done, **published as `2.0.0`** (breaking: `Input`'s
   `onChange` signature changed).
3. **Phase 2b — rich Date/Time/Month pickers** (future, not scheduled). `common/DateInput.js` +
   `common/DatePickerHeader.jsx` (188 lines, `react-datepicker`-based) and `common/TimeInput.jsx`
   (239 lines, fully hand-rolled hour/minute scrollable dropdown, currently uses
   `simplebar-react` — could be replaced with noviq-ui's own `ScrollArea` instead of adding a
   fourth CSS/scroll dependency). `design/form/FormSidebar.jsx`/`ProgressBar.jsx`/
   `SingleStepForm.jsx` (multi-step wizard shell) also deferred here.
4. **Phase 3 — Table**, split into sub-phases:
   - **3a — Core table** ✅ done, **published as `2.1.0`**. Sortable/searchable/paginated table,
     `apiFunction`/`preFetchedData` data sources, `date`/`dateRange`/`dateTime`/`time`/`duration`/
     `currency`/`status` cell types.
   - **3b — Column management** ✅ done, **published as `2.2.0`**. Visibility/reorder/sticky-pin +
     optional `localStorage` persistence.
   - **3c — Row actions, bulk actions** ✅ done, **published as `2.3.0`**. `RowActionsMenu`,
     `RejectAction` (confirm-with-reason popover, built on `Button`), `BulkActionsBar`,
     `Checkbox`. No permission-gating (dropped from the library entirely — matches the 3a
     decision).
   - **3d, further split into 3d-i/3d-ii per your instruction to keep phases small:**
     - **3d-i — Filters** ✅ done, **published as `2.4.0`**. `FilterChips`, `FilterDrawer` (native
       date/month inputs, not `react-datepicker`), `buildActiveFilter`.
     - **3d-ii — Export** ✅ done, **published as `2.5.0`**. `Export` + Excel/CSV export
       (`xlsx-js-style`, `react-hot-toast`), `useTableExport`. **This completes Table (3a–3d) in
       full.**
   - `ViewModeToggle`/`ViewComponent` (the alternate "card view" escape hatch) — confirmed
     near-dead in HRMS (1 real working call site out of 97, plus a separately-broken
     `CardViewComponent` prop-name mismatch in `EmployeeDirectory.js`). Deferred indefinitely,
     not part of 3d at all.
5. **Phase 4 — redefined as a standalone integration demo, per your direction** — rather than
   swapping components into an existing consumer frontend, a new sibling project,
   `noviq-ui-demo` (`server/` + `web/`), installs the real published `noviq-ui` package and
   exercises it against a real backend over HTTP. ✅ done — see its own README for details. This
   is also what surfaced the `2.5.1` fix (see below): it was never visible
   through `noviq-ui`'s own local-source dev playground.

## Done
- [x] Package scaffolded (Vite + React + TS library mode); 5 versions live on npm, 1.0.1 → 1.0.5.
- [x] **Phase 1** — `Button`, `ScrollArea`, `Drawer`, `Modal`. Published as `1.1.0`.
- [x] **Phase 2** — `Input` rewritten (18 field types, `onChange(value)` breaking change),
      `Label`, `Switch`, `FormFooter`, `Form`. Published as `2.0.0`.
- [x] **Sub-phase 3a** — `Table` core (search/sort/pagination/cell formatting), `TableCell`,
      `TablePagination`, `ActionBar` (search + actions), `Badge`, `DropdownMenu`. Published as
      `2.1.0`.
- [x] **Sub-phase 3b extraction complete** (staged as `2.2.0`, see "Ready to publish"):
  - [x] `useTableColumnSettings(id, columns)` hook built — replaces `tableDetailsSlice` with a
        direct `localStorage`-backed hook. Reads once on mount, writes on every change, derives
        defaults from each column's `visible`/`sticky` fields when nothing is persisted.
  - [x] Persistence made **opt-in via a stable `id` prop** on `Table` (not automatic like the
        source, whose `exportFileName` fallback silently never persisted anything unless the
        consumer happened to pass a stable label).
  - [x] `ColumnSelector` ported from `dataTable/ColumnSelector.jsx`, built on the already-ported
        `Drawer` instead of porting HRMS's near-duplicate `ui/Sheet.jsx` separately. Drag-to-
        reorder (native HTML5 DnD), 3-state sticky-pin toggle (left/right/off), visibility
        switches, "Reset Columns".
  - [x] **Fixed a real dead-code bug from the source while rebuilding it**: HRMS's "Reset
        Columns" called `removeItemFromStorage(storageKey)`, which didn't actually clear
        anything (redux-persist's storage envelope isn't a literally-named key) — confirmed via
        research as very likely a no-op in production. The rebuilt version calls a real
        `localStorage.removeItem` on the actual key, so Reset now genuinely resets.
  - [x] `Table.tsx` wired up: `displayColumns` (visibility-filtered, order-applied), JS-computed
        sticky `left`/`right` offsets (summing column `width`s, 140px default fallback) applied
        via `position: sticky`, boundary-column shadow. `ActionBar` gained a generic
        `columnSelector?: ReactNode` slot rather than threading column-visibility props through
        it directly.
  - [x] `src/index.ts` exports `ColumnSelector`, `useTableColumnSettings` + their types.
  - [x] Test suite extended to 115 tests (up from 96): `useTableColumnSettings` (defaults
        derivation, in-memory-vs-persisted behavior, cross-remount persistence, reset),
        `ColumnSelector` (list rendering, system-column exclusion, visibility toggle, sticky
        cycling, reorder-via-drag, reset), `Table` (chooser visibility toggle, hiding a column
        removes it end-to-end, settings persist across remount with `id` / don't without).
  - [x] Found and fixed an environment issue while writing the persistence tests: this
        jsdom/Vitest/Node combination doesn't expose a working `window.localStorage` (resolves to
        a plain object, not a `Storage` instance — likely Node's own experimental `localStorage`
        global interfering, per a `--localstorage-file` warning in the test output). Added a
        small in-memory polyfill to `src/test/setup.ts` so persistence tests are deterministic
        regardless of the host environment's quirks.
  - [x] Dev playground: the `apiFunction` Table example got a stable `id`, a `sticky: "left"`
        default on its "Name" column, and an explanatory note. Visually verified in-browser:
        opened the chooser, hid a column (disappeared from the table), pinned a column left,
        closed and reloaded the page to confirm the hidden column stayed hidden (persistence
        works) while the other Table (no `id`) was unaffected, then verified "Reset Columns"
        restored both back to their configured defaults.
  - [x] `npm run build` and `npm pack --dry-run` verified clean (29 files, only `dist/` +
        metadata ship).
- [x] **Sub-phase 3c extraction complete** (staged as `2.3.0`, see "Ready to publish"):
  - [x] `Checkbox` ported from `ui/Checkbox.jsx` — small styled checkbox used by the row-selection
        column. **Accessibility fix vs. source**: the native `<input>` is visually hidden
        (`display: none`), which also removes it from the accessibility tree in the source; the
        port moves `role="checkbox"`/`aria-checked`/`aria-disabled`/keyboard support onto the
        visible box itself (same pattern as the `Switch` a11y fix from Phase 2).
  - [x] `RejectAction` ported from `dataTable/RejectAction.jsx` — confirm-with-reason popover
        built on `Button`, portal-rendered, 4 validation rules ported verbatim from
        `utils/regex.js` (required, min 4 chars, no leading space, no repeating characters, not
        digits-only). **Bug fixed vs. source**: `react-hotkeys-hook` disables hotkeys by default
        when focus is inside a form field (`enableOnFormTags` defaults to `false`), and the reason
        textarea auto-focuses on open — so Escape silently did nothing in the source. Fixed by
        passing `{ enableOnFormTags: true }`.
  - [x] `RowActionsMenu` ported from `dataTable/RowActionsMenu.jsx` — `button`/`checkbox`-typed
        actions render inline, everything else groups into the existing `DropdownMenu`,
        `variant: "reject"` actions render via `RejectAction` (inline mode only, matching source
        fidelity — a dropdown-grouped reject action is just a plain menu item with no reason
        prompt, same as HRMS). **Bug fixed vs. source**: HRMS wired `RejectAction`'s `onConfirm` as
        `async () => {...}`, discarding the `reason` argument `RejectAction` actually passes.
        Fixed by adding `reason?: string` to the action-context object and forwarding it from the
        real callback parameter.
  - [x] `BulkActionsBar` ported from `dataTable/BulkActionsBar.jsx` — near 1:1 port, fully
        controlled, renders `null` at zero selected.
  - [x] `Table.tsx` wired up: `getRowId` (presence enables row selection) and `rowActions` each
        auto-inject a pseudo-column (`select`, sticky-left / `actions`, sticky-right) into the
        rendered column set — the consumer never manually declares these in `columns`.
        **Deliberate API improvement vs. source**: HRMS requires consumers to hand-add
        `{id: "select"}` / `{id: "actions"}` entries to their own `columns` array (a footgun if
        forgotten — silently means "no checkboxes"); confirmed via research that zero real HRMS
        call sites actually use `getRowId`/`bulkActions` today, so no real-world contract was
        broken by changing this. New `isRowActionsWithoutDropdown?: boolean` prop threads through
        to `RowActionsMenu` so a consumer can opt into all-actions-inline (required to reach the
        reject-with-reason popover).
  - [x] `src/index.ts` exports `Checkbox`, `RowActionsMenu`, `BulkActionsBar`, `RejectAction` +
        their types.
  - [x] Test suite extended to 147 tests (up from 115): `Checkbox`, `RejectAction` (popover open,
        each validation rule, confirm+close, Escape-closes), `RowActionsMenu` (inline vs. dropdown
        grouping, reject delegation + reason forwarding, click context shape), `BulkActionsBar`
        (hidden at zero, count text, Clear, bulk action fires with selected ids), `Table` (row
        selection, select-all, bulk-bar clear, `rowActions` column + firing,
        `isRowActionsWithoutDropdown` behavior difference).
  - [x] Found and fixed a real integration gap via visual testing (not caught by unit tests, since
        those tested `RowActionsMenu` directly with the prop passed explicitly): `Table.tsx`'s
        auto-injected actions column never threaded `isRowActionsWithoutDropdown` through to
        `RowActionsMenu`, so the prop had no effect from the public `Table` API and the reject
        popover was unreachable. Fixed, and added 2 integration tests to `Table.test.tsx` to close
        the coverage gap.
  - [x] Dev playground: added a "row selection, row actions, bulk actions" `Table` section — a
        "View" plain button, a "Reject" reason popover, and a "Delete selected" bulk action.
        Visually verified in-browser: selecting a row shows "1 row selected" + the bulk bar with a
        working "Clear" (bar disappears on clear), "View"/"Reject" render as separate inline
        buttons per row (confirms the `isRowActionsWithoutDropdown` fix).
  - [x] `npm run build` and `npm pack --dry-run` verified clean (33 files, only `dist/` + metadata
        ship; `Checkbox`/`RowActionsMenu`/`BulkActionsBar`/`RejectAction` all present in the
        emitted type declarations).
- [x] **Sub-phase 3d-i extraction complete** (staged as `2.4.0`, see "Ready to publish"):
  - [x] `buildActiveFilter(config, rawValue)` built — a single shared helper (config + raw value →
        `{id, label, displayValue, mandatory, apiPayload}`) consolidating source's two independent
        (and duplicated) implementations of this logic (`DataTable.jsx`'s `buildInitialFilters` and
        `FilterDrawer.jsx`'s `handleApply`).
  - [x] **Fixed a real oversight in the source**: a `date`-type filter fell through to the same
        bare-text-input branch as `search` in HRMS — no date picker at all despite the type name.
        The port gives `date` its own native `<input type="date">` branch.
  - [x] **Fixed a real bug in the source's `select` type**: the UI is a checkbox list (implying
        multi-select), but `handleToggleOption` always replaced the array with a single value —
        so only one option could ever actually be selected despite the comma-joined `apiPayload`
        format suggesting multi-value support. The port makes `select` a genuine multi-select.
  - [x] **Fixed a real coupling bug in `FilterChips.jsx`**: its "Clear all" handler in HRMS also
        called `onSearchChange("")`, silently wiping the unrelated main search box whenever
        filters were cleared. The port's `FilterChips` has no `onSearchChange` prop at all —
        "Clear all" only touches filters.
  - [x] `FilterDrawer` built as a self-contained trigger `Button` + `Drawer` (same pattern as
        `ColumnSelector` from 3b) — no `isOpen`/`onOpenChange` props needed from `Table`. Built on
        the already-ported `Drawer`/`ScrollArea`/`Checkbox`. 5 filter types: `search`, `date`,
        `select` (true multi-select), `dateRange` (two native date inputs), `month` (native month
        input).
  - [x] `Table.tsx` wired up: new `filterConfigs?` prop, `activeFilters` state (session-only, not
        persisted — a deliberate choice, unlike column settings), `getFilterParams()` merged into
        the `apiFunction` query params alongside `search`/pagination. `ActionBar` gained a
        `filters?: ReactNode` slot (same pattern as 3b's `columnSelector` slot) — no filter logic
        added to `ActionBar` itself. `FilterChips` rendered by `Table` as its own row (same
        convention as `BulkActionsBar`), between `ActionBar` and the table body.
  - [x] `src/index.ts` exports `FilterDrawer`, `FilterChips`, `FILTER_TYPE`, `buildActiveFilter` +
        their types.
  - [x] Test suite extended to 178 tests (up from 147): `buildActiveFilter` (all 5 types'
        `displayValue`/`apiPayload` shape, `null` on empty value), `FilterChips` (hidden at 0,
        remove/clear behavior, mandatory has no remove button), `FilterDrawer` (per-type
        rendering, true multi-select, `dateRange` apiPayload, Apply/Clear-all), `Table` (applying
        a filter merges into `apiFunction` params + shows a chip, removing a chip clears it).
  - [x] Dev playground: added `filterConfigs` (a `select` "Department" filter + a `dateRange`
        "Join date" filter) to the `apiFunction`/mock-server Table example; the mock `apiFunction`
        now applies both filters server-side. Visually verified end-to-end (via direct DOM
        interaction, since the Browser preview's screenshot tool was returning stale/cached images
        this session — accessibility-tree and `get_page_text` inspection were used instead and are
        reliable): opening the drawer, applying a multi-select filter, applying a date-range
        filter, removing an individual chip, and "Clear all" all correctly update the chip row and
        drive the mock server's filtered results.
  - [x] `npm run build` and `npm pack --dry-run` verified clean (36 files, only `dist/` + metadata
        ship; `FilterChips.d.ts`/`FilterDrawer.d.ts`/`buildActiveFilter.d.ts` all present).
- [x] **Sub-phase 3d-ii extraction complete** (staged as `2.5.0`, see "Ready to publish") — Table
      3a-3d is now fully done:
  - [x] Extracted `src/components/Table/cellValue.ts` (`getCellValue` + new
        `buildCellFormatOptions`) out of `Table.tsx`, consolidating the per-cell-type
        options-building logic (date/time range field lookups, currency, status, etc.) that both
        `Table`'s render path and the new export path need — same "dedup while porting" precedent
        as `buildActiveFilter` in 3d-i. Behavior-neutral refactor, confirmed via the full existing
        test suite passing unchanged before any export code was added.
  - [x] Extracted `formatStatusLabel(status)` from `TableCell.tsx`'s inline STATUS ternary, shared
        by both the `<Badge>` render path and the plain-text export path.
  - [x] **Fixed a real bug from the source**: `useTableExport.jsx`'s base export params hardcode
        `rows_per_page: 10`, and every real HRMS call site invokes the export functions with an
        empty `extraParams` — nothing ever overrides it, so every real export in HRMS today
        silently truncates to 10 rows. The port fetches **all rows matching the current
        search/filters** in one call (`rows_per_page: totalItems`, falling back to a large
        sentinel if `totalItems` is `0`).
  - [x] **`preFetchedData` mode, unhandled in the source, now exports directly**: no fetch at all —
        exports the already-client-sorted `sortedData` array directly, reflecting whatever order
        is currently on screen.
  - [x] **Deliberately did not replicate source's `col.cell(...)` export fallback**: HRMS falls
        back to calling a column's custom render function and using its return value as the
        export cell value; `noviq-ui`'s `TableColumn.cell` is typed to return `React.ReactNode`
        (potentially JSX), and writing a React element into an XLSX cell is unsafe/meaningless.
        A column with a custom `cell` but no `exportValue` falls back to the plain accessor value
        instead — documented as a deliberate safety-motivated deviation, not a silent gap.
  - [x] `useTableExport.ts` built: one-shot fetch (or `preFetchedData` passthrough), per-column
        value resolution (`exportValue` override → `STATUS` via `formatStatusLabel` → other typed
        columns via the already-existing `formatTableCellValues` + `buildCellFormatOptions` → raw
        accessor value), styled Excel export (bold white header text on `#02699B` fill, matching
        source) via dynamically-imported `xlsx-js-style`, CSV via `sheet_to_csv` + UTF-8-BOM
        `Blob` + `<a download>`, `react-hot-toast` loading/success/error feedback around both.
  - [x] `Export.tsx` built: Download-icon dropdown (Excel/CSV, disabled while exporting) on the
        already-ported `DropdownMenu`; `responseSheetUrl` set → a plain button that
        `window.open()`s it instead (matching source, CSV option hidden in that mode).
  - [x] `Table.tsx` wired up: new `exportFileName`/`isExportHidden`/`responseSheetUrl` props, new
        `TableColumn.export`/`exportValue` fields. `ActionBar` gained an `exportControl?:
        ReactNode` slot (same pattern as the `filters`/`columnSelector` slots from 3d-i/3b).
  - [x] **Found and fixed a real bundle-size regression during the build-sanity-check step, not
        anticipated in planning**: `vite.config.ts`'s Rollup output had `inlineDynamicImports:
        true` (set in Phase 1, to keep the library as one clean output file) — this forced the
        new `await import("xlsx-js-style")` to be inlined into the single `noviq-ui.mjs` output
        too, ballooning the main bundle from ~124KB to ~467KB gzipped for *every* consumer,
        whether or not they use export. Switched to Vite 8's `codeSplitting: true` output option,
        which correctly splits `xlsx-js-style` into its own lazy-loaded chunk (confirmed via a
        clean rebuild: main bundle back to ~129KB gzip, `xlsx-js-style` isolated into a separate
        ~336KB gzip chunk only fetched when a consumer actually calls `exportToExcel`/
        `exportToCSV`) — verified the built `noviq-ui.mjs`'s dynamic `import()` correctly
        resolves the chunk file via a relative path, and that `npm pack --dry-run` ships both
        files.
  - [x] `src/index.ts` exports `Export`, `useTableExport`, `formatStatusLabel`, `getCellValue`,
        `buildCellFormatOptions` + their types.
  - [x] Test suite extended to 202 tests (up from 178): `cellValue.ts` (`getCellValue` formatting
        flags, `buildCellFormatOptions` per type), `useTableExport` (mocked `xlsx-js-style` via
        `vi.mock` — `rows_per_page` equals `totalItems`/merged params, `preFetchedData` mode
        skips the fetch, `export: false` columns excluded, `exportValue` override, typed-column
        formatting matches the table's own render formatting, `exporting` state transitions),
        `Export` (dropdown rendering, fires the right callback with the built filename, disabled
        while exporting, `responseSheetUrl` renders a plain button instead), `Table` (Export
        button renders by default, hidden via `isExportHidden`). Added a
        `URL.createObjectURL`/`revokeObjectURL` polyfill to `src/test/setup.ts` (jsdom doesn't
        implement the Blob URL registry) — same "polyfill an environment gap" precedent as the
        existing `localStorage` polyfill there.
  - [x] Dev playground: added `exportFileName="employees"` to the `apiFunction`/mock-server Table
        example (already has `filterConfigs`), plus a `<Toaster />` mounted once at the
        playground's root (documenting the real requirement for consumers). Visually verified via
        direct DOM/JS interaction in the Browser preview tool (screenshot tool was unreliable
        this session, same as during 3d-i): clicking "Export as Excel"/"Export as CSV" shows a
        "Preparing export..." toast and an "Exporting..." disabled button state, both clear
        cleanly once the mock server's fetch resolves, with zero console errors — confirming the
        real `xlsx-js-style` import, sheet-building, and `react-hot-toast` wiring all work
        end-to-end in a real browser, not just under mocks.
  - [x] `npm run build` and `npm pack --dry-run` verified clean (41 files; `Export.d.ts`/
        `useTableExport.d.ts`/`cellValue.d.ts` all present; confirmed the `xlsx-js-style` code-split
        chunk ships alongside the main bundle).
- [x] **`2.5.1` — one real `Drawer` bug fixed, one `Form` misunderstanding caught and corrected
      before shipping** — both found via `noviq-ui-demo` (staged, see "Ready to publish"):
  - [x] **`Drawer` had no responsive breakpoint at all — real bug, fixed.**
        `drawer-content-sm/md/lg` are fixed pixel/rem widths (420/512/620px) with no `@media`
        query anywhere in `Drawer.css` to adapt to a narrower viewport — unlike `Form.css`, which
        already collapses its grid at `max-width: 640px`. On a narrower browser window, a
        fixed-width right-side drawer genuinely overflows past the screen edge, clipping its own
        trailing content (in `ColumnSelector`'s case, the pin/visibility controls on the right of
        each row — this is what the "checkboxes going out of screen" report was). Fixed by adding
        a `@media (max-width: 640px)` rule capping all three drawer sizes to `100vw`, so the
        drawer never exceeds the viewport.
  - [x] **`Form`'s `colSpan` — investigated as a possible CSS bug, turned out to be a
        misunderstanding of the (correctly-implemented) contract, caught before publishing.**
        `colSpan` means "how many fields share this row" (`1` = alone/100%, `2` = one of two
        side-by-side/50% each, `3` = one of three/~33% each) — **not** "spans N of 3 grid
        columns." The demo's own `employeeFormFields` was written assuming the latter (`name:
        colSpan 3` intending "full width," `status: colSpan 1` intending "narrow"), producing the
        exact odd layout reported (fields in unexpected positions, uneven empty space). A first
        pass at fixing this *changed `Form.css` itself* to match the "spans N of 3" reading — but
        that would have broken the library's own published `README.md` Form example (two fields
        both set to `colSpan: 2`, relying on `2` meaning "50% each, side by side" to sit correctly
        next to each other), which only works under the original, "fields-per-row" semantics. That
        change was reverted before it was ever published. The actual, correct fix: (1) reworded
        `FormFieldConfig.colSpan`'s JSDoc in `Form.tsx` to accurately describe "how many fields
        share this row" instead of the misleading "spans N of 3 columns" phrasing that caused the
        confusion in the first place, and (2) corrected `noviq-ui-demo`'s own `employeeFormFields`
        to use matching `colSpan` pairs (`department`/`status`/`joinDate`/`salary` all `colSpan:
        2`, `name` alone at `colSpan: 1`) to get the intended layout. `Form.css` itself is
        unchanged from `2.5.0`.
  - [x] Verified both, live, against the real `noviq-ui-demo/web` app (via a temporary `npm
        link` — built noviq-ui locally, linked it into the demo, cleared Vite's stale
        dependency-pre-bundle cache, then unlinked and restored the demo to the real registry
        dependency once verified): at a normal desktop width, "Add Employee" lays out as intended
        (Name alone, Department+Status paired, Join date+Salary paired); at a 480px narrow
        viewport, both the Add Employee form and the Manage Columns drawer correctly expand to
        full width with no clipped content.
  - [x] `npm test` (202/202), `npm run build`, `npm pack --dry-run` all verified clean —
        `Drawer.css` changed (additive `@media` rule), `Form.css` unchanged, no behavior/API
        change beyond the JSDoc wording, so no new tests were needed.

## Published
- `1.1.0` — live on npm.
- `2.0.0` — live on npm. Breaking release (`Input`'s `onChange` signature changed); README
  documents the migration.
- `2.1.0` — live on npm. Sub-phase 3a `Table`. Additive only, no breaking changes.
- `2.2.0` — live on npm (confirmed via the registry API). Sub-phase 3b column management.
  Additive only, no breaking changes.
- `2.3.0` — live on npm (confirmed via the registry API). Sub-phase 3c row actions, bulk actions.
  Additive only, no breaking changes.
- `2.4.0` — live on npm (confirmed via the registry API). Sub-phase 3d-i filters. Additive only,
  no breaking changes.
- `2.5.0` — live on npm (confirmed via the registry API). Sub-phase 3d-ii export. **Completes
  Table's full 3a-3d feature set.** Additive only, no breaking changes.

## Ready to publish
- `2.5.1` — fixes a real `Drawer` bug (no responsive breakpoint, causing overflow/clipping on
  narrow viewports) found via `noviq-ui-demo`, plus a `FormFieldConfig.colSpan` JSDoc clarification
  (the CSS itself was already correct — see the `2.5.1` "Done" notes above for the full story).
  Patch release: `Drawer.css` gains an additive `@media` rule, `Form.tsx`'s doc comment is
  reworded, `Form.css` is unchanged. No API/behavior change. Build + test + pack sanity checks all
  pass; awaiting explicit go-ahead to run `npm publish`.

## Not started
- [ ] Phase 2b (rich Date/Time/Month pickers).
- [ ] `ViewModeToggle`/`ViewComponent` (the alternate "card view" escape hatch) — deferred
      indefinitely, confirmed near-dead in HRMS (1 real working call site out of 97). Not part of
      Table 3a-3d at all; revisit only if a real consumer needs it.
- [ ] No `eslint.config.js` — `npm run lint` still fails (ESLint 9 needs flat config). Confirmed
      still broken after four phases; intentionally left out of scope each time.
- [ ] No CI/CD pipeline.
- [ ] No consumer integration — not a dependency of any of the four frontend repos yet.
- [ ] Not a git repository in this checkout (no `.git`) — the risk compounds with every phase
      that lands; now four phases' / 15 components' worth of uncommitted local work.

## Known bugs / limitations
- `Input`: unrecognized `type` prop renders the literal text `"Worng input type provided"` (typo,
  pre-existing, intentionally not fixed).
- `Table`: the built-in search box has no effect when using `preFetchedData` (client-controlled
  mode) — matches the source's own behavior (search was always server-side-only in HRMS too), but
  worth fixing at some point since it's a slightly confusing rough edge for a "fully controlled"
  mode.
- `Table`: sorting is client-side and only reorders the currently-loaded page — for a
  server-paginated table, this means sorting doesn't span the full dataset. This is faithful to
  the HRMS source's actual behavior (confirmed by reading the sort comparator directly), not a
  regression, but worth documenting clearly for consumers who might expect otherwise.
- `Table`: sticky-column left/right offsets are computed from each column's declared `width`
  (140px fallback when unset), not measured from the actual rendered DOM — accurate when widths
  are set, approximate otherwise. No `ResizeObserver`/measurement pass; a deliberate scope
  trade-off for 3b, could be revisited later if it causes real visual misalignment.
- `useTableColumnSettings` reads `localStorage`/derives defaults once on mount only — it does not
  reactively respond to the `id` or `columns` prop changing after the initial render. Matches how
  `Table` is used in practice (mounted once with a stable id/columns), but worth knowing if a
  consumer does something more dynamic.
- Test environment note (not a library bug): this jsdom/Vitest/Node setup doesn't provide a real
  `window.localStorage` — worked around with a polyfill in `src/test/setup.ts` (see `context.md`).
  Doesn't affect the built library at all, only the local test run.
- `RowActionsMenu`: a `variant: "reject"` action only gets its confirm-with-reason popover when
  `isRowActionsWithoutDropdown` is set (inline mode). In the default dropdown-grouped mode, a
  reject-variant action is just a plain menu item that calls `onConfirm` immediately with no
  reason prompt — faithful to the HRMS source's own behavior, not a regression, but easy to trip
  over if a consumer expects the popover without opting into inline mode.
- `FilterDrawer`: no "click a filter chip to reopen the drawer" convenience wiring (present in the
  HRMS source, which shared open/close state between `ActionBar` and the drawer). A deliberate
  trade-off to keep `FilterDrawer` fully self-contained, same trade-off already accepted for
  `ColumnSelector` in 3b.
- Filters are session-only (reset on remount/reload) — see the "Filters" section of `README.md`
  for the reasoning. Not a bug, a considered decision.
- Export always fetches a **fresh** copy of all matching rows via `apiFunction` (or exports
  `preFetchedData` directly) — it does not reuse whatever page of rows the table currently has
  loaded/rendered for `apiFunction` mode. This is intentional (the currently-loaded page is often
  only 10-50 rows, not everything matching the current search/filters), but worth knowing: a
  slow/expensive `apiFunction` will be called again on every export click.
- Export's Excel/CSV row values for a `cell`-rendering column (no `exportValue` set) fall back to
  the plain accessor value, not the JSX the `cell` function would render — see the 3d-ii "Done"
  notes above for why. Set `exportValue` explicitly on such a column if you need something other
  than the raw value in the exported file.
- `react-hot-toast`'s `<Toaster />` must be mounted by the consumer for export's loading/success/
  error feedback to be visible — `Table` intentionally doesn't auto-mount one (would duplicate
  toasts in apps that already use `react-hot-toast` elsewhere). Documented in `README.md`.

## Suggested next steps
1. Initialize git for this repo — still nothing version-controlled locally, and the risk compounds
   with every phase that lands; now the biggest it's been (Table's full 3a-3d feature set, ~20
   components' worth of uncommitted local work).
2. Add `eslint.config.js` so `npm run lint` actually runs — still not done, still cheap.
3. Table (3a-3d) is now fully done and published (`2.5.0` live). Pick one consumer frontend
   (`noviq-hrms-ui`, `noviq-lms-admin-ui`, `noviq-lms-learner-ui`, or
   `asset-management-system/apps/web`) and start swapping in `noviq-ui` components — this is
   **Phase 4**, the next real milestone per the original task framing.
5. Phase 2b (rich Date/Time/Month pickers) remains fully unstarted, whenever it's picked up.
