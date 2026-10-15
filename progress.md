# noviq-ui — Progress

_Last updated 2026-10-14 (see `context.md` for the "how this fits the suite" background)._

## Extraction roadmap
1. **Phase 1 — Drawer + Modal + primitives** ✅ done, **published as `1.1.0`**.
2. **Phase 2 — Form/Input system** ✅ done, **published as `2.0.0`** (breaking: `Input`'s
   `onChange` signature changed).
3. **Phase 2b — rich Date/Time/Month pickers** ✅ done.
   - **2b-i — `TimePicker`** ✅ published as `4.0.0` (24-hour or 12-hour with AM/PM).
   - **2b-ii — `DatePicker` + `MonthPicker`** ✅ done, staged as `4.1.0`. Hand-built, no new
     dependency (the `react-datepicker`/`moment`/`react-i18next` stack HRMS used was not adopted).
   - **2b-iii — wired into `Input`** ✅ done, staged as `4.1.0`, as **new opt-in types**
     (`datePicker`, `timePicker`, `monthPicker`); native `date`/`time`/`month` are unchanged.
   - The multi-step wizard shell (`FullPageForm`/`SingleStepForm`/`FormSidebar`) is **dropped, not
     deferred**: `FullPageForm` has zero importers in HRMS. Its single-step sibling
     `FullPageSection` (8 call sites) was ported instead — see `4.2.0`.
   - Note: `INPUT_TYPE.DATE_RANGE` (and four others) were declared but never rendered; removed in
     `4.2.1`. A date-range *field* is still unbuilt — `DatePicker` ×2 would be the basis.
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
6. **Config provider — `NoviqUIConfigProvider`, `3.0.0` (breaking)** ✅ done, **published as `3.0.0`** — Table's
   response/request shape is declared once per app instead of being hard-wired to HRMS's
   envelope. Also fixes the `types` export condition and `Form`'s `formik` typing. See the
   `3.0.0` "Done" entry below.

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
- [x] **`2.5.2` — a second, real overflow bug found in Edge after `2.5.1` shipped** (published):
      the `2.5.1` responsive-breakpoint fix only covered narrow *viewports*
      (`< 640px`); it didn't cover a **full-width, maximized** window where a single field's
      native rendering is simply wider than expected in that browser. Diagnosed live with the
      user (real screenshots + a `window.innerWidth`/`getBoundingClientRect()` check pasted from
      their own Edge DevTools console) rather than guessed at:
  - [x] **Root cause**: `.drawer-content` had no `overflow: hidden` of its own — only its inner
        `ScrollArea` (`.drawer-body`) did. `.drawer-content` is `position: fixed` with an explicit
        `width`/`max-width`, so *its own box* never grows past 512px regardless of content — but
        with nothing containing overflow at that outer level, a child that refuses to shrink below
        its own intrinsic minimum width (a native `<input type="date">` can render with a
        meaningfully wider intrinsic minimum in Edge than in the Chromium build this session's
        automated Browser pane uses) can still visually spill out past that fixed boundary instead
        of being clipped by it. Separately, `Form.css`'s `.col-span-1/2/3` (the actual flex items
        inside `.form-container`) had no `min-width: 0` — flex items default to `min-width: auto`,
        which refuses to shrink below the content's intrinsic minimum, so an oversized input could
        force its whole `.col-span-N` wrapper (and thus the row) wider than its calculated
        percentage width in the first place.
  - [x] **Fix**: added `overflow: hidden` to `.drawer-content` in `Drawer.css` (a hard guarantee —
        nothing can ever visually escape a box with `overflow: hidden`, regardless of the precise
        cause — confirmed `react-select`'s dropdown menu already uses `menuPosition="fixed"` +
        `menuPortalTarget={document.body}`, i.e. it portals outside `.drawer-content` entirely, so
        this containment can't clip it). Added `min-width: 0` to `.col-span-1/2/3` in `Form.css` so
        fields actually shrink to fit their calculated width instead of relying on clipping alone.
  - [x] **Verified the containment directly**, not just by hoping Edge's exact rendering would
        reproduce in this session's own browser: forced a real `<input type="date">` inside the
        drawer to `min-width: 900px` via JS (simulating "a browser renders this input much wider
        than expected") and confirmed via screenshot that the drawer still renders with clean,
        contained edges — no visible spillover — proving the fix holds regardless of *why* a field
        ends up oversized in some particular browser.
  - [x] `npm test` (202/202), `npm run build`, `npm pack --dry-run` all verified clean — both
        changes are additive CSS properties, no behavior/API change.
- [x] **`3.0.0` — breaking: `NoviqUIConfigProvider`, plus two typing/packaging fixes found while
      verifying it** (published). Design spec and implementation plan live in
      `docs/superpowers/specs/2026-09-04-config-provider-design.md` and
      `docs/superpowers/plans/2026-09-04-config-provider-implementation.md`.
  - [x] **Why**: `Table`'s `apiFunction` had to resolve to exactly `{ result: T[], totalCount:
        number }` — a shape inherited from `noviq-hrms-ui`'s own backend envelope, not a neutral
        contract, forcing every consumer with a differently-shaped backend to hand-write
        reshaping code per call site. No frontend depended on `noviq-ui` yet, so this was the
        cheapest moment to break it.
  - [x] **What**: `apiFunction` now resolves to the backend's raw response. A consuming app
        declares the shape once via `<NoviqUIConfigProvider config={{ table: { responseFormat } }}>`
        — either `{ rowsPath, totalPath }` (dot-paths) or `{ getRows, getTotal }` (functions, for
        shapes a path can't express). `config.table.requestParams` renames the
        `search`/`page_no`/`rows_per_page` keys `Table` sends. A single `<Table responseFormat>`
        prop overrides the app-wide format for one instance. `useTableExport` resolves the same
        config, so export still fetches every matching row. `TableQueryResult` is removed;
        `TableQueryParams` is now `Record<string, unknown>`. `preFetchedData` tables need no
        provider. Implemented in `src/config/` (`types.ts`, `responseFormat.ts`,
        `NoviqUIConfigProvider.tsx`) + `Table.tsx`/`useTableExport.ts`.
  - [x] **Mandatory, by design**: a `Table` using `apiFunction` with neither a provider ancestor
        nor a `responseFormat` prop throws an actionable error on render, rather than silently
        assuming HRMS's shape. A malformed provider config also throws at mount. (A *response*
        that doesn't match the declared shape does not throw — it warns in development and
        renders an empty table; see Known limitations.)
  - [x] **Found while verifying 3.0.0 against the demo — `exports` had no `types` condition.**
        Under `moduleResolution: "bundler"` (the Vite default) TypeScript resolves through
        `exports` and ignores the top-level `types` field, so every typed consumer got the whole
        library as implicit `any` (TS7016) — affecting *every* version published before 3.0.0.
        Invisible until now because `noviq-ui`'s own tests/playground import local source, and
        because the demo's earlier "clean typecheck" was vacuous: the Vite template's root
        `tsconfig.json` has `files: []`, so a bare `tsc --noEmit` checks nothing — the real check
        is `tsc -p tsconfig.app.json` (or the demo's `npm run build`, which uses `tsc -b`). Fixed
        by adding a `types` condition (listed first) to the root export; guarded by
        `src/packaging.test.ts`.
  - [x] **Also found: `<Form formik={useFormik<Values>()} />` didn't typecheck.** The prop was
        typed `FormikProps<Record<string, any>>`; Formik's helpers (`setValues`, …) are
        contravariant in the values type, so a concretely-typed instance wasn't assignable. Typed
        as `FormikProps<any>` now. *No automated guard*: `tsconfig.json` excludes `*.test.tsx` and
        Vitest doesn't typecheck, so the existing `Form` tests (which only ever passed
        `Record<string, any>`) could never have caught it — the demo's `npm run build` is the
        real check.
  - [x] Verified end-to-end in an isolated copy before touching this tree: library `tsc`, 221
        tests, build, pack, tarball contents; then the demo migrated and built against the packed
        3.0.0 tarball (`tsc -b && vite build`), and run in a real browser — rows/total extracted
        through the provider (10 rows, "of 40 results") and Export requesting `rows_per_page=40`.
  - [x] Housekeeping: `noviq-ui-2.5.2.tgz` had been committed along with the 2.5.2 release
        (483 KB binary, now in pushed history); untracked it and added `*.tgz` to `.gitignore`.
        History was not rewritten.

- [x] **`4.0.0` — `TimePicker` (Phase 2b-i) with a 12-hour mode, `formik`/`react-hot-toast` removed
      as dependencies, and a fix for a spurious dev warning shipped in `3.0.0`** (staged, see
      "Ready to publish"; the briefly-staged `3.1.0` was never published and is folded in here):
  - [x] **`TimePicker` built** (`src/components/TimePicker/`), ported from HRMS's hand-rolled
        `common/TimeInput.jsx`. Standalone, additive: `<TimePicker value="09:30" onChange={...}
        minuteStep={15} />`. Fixes vs. the source: placeholder instead of a fake `00:00` when empty;
        opens on click/ArrowDown/Enter rather than on bare focus; scroll-to-selected is scoped to
        its own dropdown (the source's global `document.querySelector` scrolled the wrong picker
        when two were on a page); repositions on scroll/resize and flips above near the viewport
        bottom; ARIA combobox/listbox + `aria-activedescendant`; optional clear button; built on
        the library's `ScrollArea` instead of `simplebar-react`. `Input type="time"` is **not**
        rewired — still the native input (see Phase 2b-iii).
  - [x] **Found while verifying it: `3.0.0` warned on every initial load.** `Table` ran
        `extractRows`/`extractTotal` on every render, including while the query result was still
        `undefined`, so (a) the dev-only "responseFormat.rowsPath … did not resolve" warning fired
        on every initial load of every Table, and (b) a consumer's `getRows`/`getTotal` function
        was called with `undefined` and had to null-guard. Missed in the 3.0.0 verification because
        the demo's console was only read with `onlyErrors`. Fixed: extraction only runs once a
        response exists, and is memoized so a genuine mismatch warns once rather than per render.
        3 regression tests added (verified failing before the fix, 12 warnings vs 6 expected).
  - [x] Original 3.1.0 gate: 257 tests, 30 for `TimePicker` (mutation-checked, 5 deliberate breaks
        each caught), 3 for the Table fix.
  - [x] **`TimePicker` 12-hour mode** (`hourCycle={12}`): hours `12, 01 … 11` + an AM/PM column.
        `value`/`onChange` stay 24-hour `"HH:mm"` regardless, so the stored value doesn't depend on
        the display mode. Picking an hour keeps AM/PM, picking AM/PM keeps hour and minute; `12 AM`
        is `00`, `12 PM` is `12`. Keyboard: Enter walks hour → minute → AM/PM and closes after the
        last. 17 new tests (47 total), mutation-checked (5 deliberate breaks of the 12h logic).
  - [x] **`formik` is no longer a dependency.** It was only ever a *type* import in `Form.tsx`
        (`FormikProps`); `Form` reads/writes just `values`, `errors`, `touched`, `setFieldValue`. The
        prop is now typed as a structural `FormController` (exported), which a real `useFormik()`
        satisfies as-is — verified by the demo's `tsc -b` against the packed tarball. The prop kept
        its `formik` name. `formik` moved to `devDependencies` (tests + playground still use the real
        thing). Side effect: `npm audit --omit=dev` went from 1 high (a transitive `lodash` via
        formik) to 0.
  - [x] **`react-hot-toast` is no longer a dependency; export feedback goes through
        `config.notify`.** `NoviqUIConfig` gained `notify?: (message, kind: "success" | "error") =>
        void` — this is the "`config.notify`" item from the config-provider design spec's roadmap,
        built. `config.table` became optional so an app can configure only `notify`. A `"loading"`
        kind was deliberately not added (a callback can't dismiss it); the Export button's
        "Exporting…" state covers that. Without `notify` the table is silent and a failed export is
        still `console.error`ed. **This is a behavior change** — anyone who relied on the built-in
        toasts must now wire `notify` — which is why this release is `4.0.0`, not `3.1.0`.
  - [x] Guards: `src/packaging.test.ts` now fails if `formik`/`react-hot-toast` reappear under
        `dependencies`/`peerDependencies` or are imported (even as a type) by shipped source.
        Verified the dependency guards fail against the pre-change `package.json`.
  - [x] **Constants consolidated into `src/constants.ts`** (standing convention from the user: *every
        fixed value lives in constants, never as a bare literal*). Before this only `INPUT_TYPE`,
        `CELL_TYPE` and `FILTER_TYPE` existed; variants, sizes, sides, button `type`, sort direction,
        sticky side, row/bulk action kinds, keyboard keys, hotkeys, column ids, defaults, the storage
        prefix and export strings were bare literals scattered through ~25 files. Now ~35 named
        groups (public ones exported from the package root, `@internal` ones not), types derived
        from them, and `src/constants.test.ts` (60 tests) scans shipped source and fails on a bare
        literal for any covered value. Behavior-neutral: the existing 293 tests passed unchanged,
        and the constants hold the exact strings the props always took, so no consumer migration.
        Guards verified to fail: a probe file with 11 kinds of planted violation tripped every
        one, then was removed. The sweep also found a literal the pattern guards can't express
        (`"PM"`/`"AM"` in `Table/dateFormat.ts`), fixed and then added to the guard's value list.
        Deliberately **not** moved: native HTML/ARIA/CSS vocabulary, third-party prop values
        (react-select's `menuPlacement`), and user-facing copy (that's localisation — the spec's
        `config.i18n` roadmap item; offered as a follow-up).
  - [x] Demo now uses the public constants throughout (`ROW_ACTION_VARIANT.REJECT`,
        `COL_SPAN.HALF`, `INPUT_TYPE.*`, `NOTIFY_KIND.ERROR`, …), so the demo's `tsc -b` doubles as a
        typecheck of the constants as consumers see them via the packed types.
  - [x] Test suite 353 (up from 224 at 3.0.0). Main bundle 131.6 → 129.4 kB gzip (net of the
        removed dependencies; the named constant objects cost ~1.2 kB because bundlers can't
        inline object property values).
  - [x] Verified in a real browser: opening centres the selected hour/minute, keyboard flow
        produces the expected value, flips above near the viewport bottom and follows its trigger
        on scroll; inside the demo's Add/Edit drawer it renders above the drawer and a picked time
        round-trips through the real backend (`shiftStart` field added to the demo).

- [x] **`4.1.0` — `DatePicker`, `MonthPicker`, picker types in `Input`, and the constants
      consolidation** (staged, see "Ready to publish"):
  - [x] **Found first: the published `4.0.0` predates the constants refactor.** I had told the user
        the version was "still 4.0.0" without checking the registry; they had already published it.
        Verified by byte-comparing the registry bundle with a build of `05f8c61` (identical) and
        with `main` (different). So the constants ship as 4.1.0 — additive, no behavior change.
  - [x] `DatePicker` — calendar dropdown: month/year selects, six-week grid with neighbouring days,
        Today, inclusive min/max (disabled days, month arrows stop at bounds, month/year options
        limited), full keyboard (arrows, PageUp/Down ±month, Shift ±year, Home/End, Enter, Esc).
        Pure date math in `dateParts.ts` (38 tests); component 42 tests, mutation-checked
        (6 deliberate breaks, all caught).
  - [x] `MonthPicker` — year header + 3×4 month grid, bounds, keyboard. 25 tests, mutation-checked
        (4 breaks, all caught).
  - [x] `Input` gained `datePicker` / `timePicker` / `monthPicker` (+ `hourCycle`, `minuteStep`
        props) so `Form` configs can use them; `hideClearIcon` → `clearable`, `error` → invalid
        state. Native types untouched (a test asserts it).
  - [x] Shared `hooks/useFloatingPanel` extracted from `TimePicker` (its 47 tests unchanged and
        green) and an internal `PickerField` trigger shell for the two new pickers.
  - [x] Constants guard caught a hand-written ARIA union in the new `PickerField` on its first run
        — now `React.AriaAttributes["aria-haspopup"]`. `MONTH_NAMES` was also de-duplicated into
        `constants.ts` (it was a private array in `buildActiveFilter.ts`).
  - [x] **Found while verifying in the demo — a bug in the demo, not the library:** its Add/Edit
        form kept `department`/`status` as `{ label, value }` objects, but `Input`'s select
        compares and emits the option's *string* value, so the selects never showed the current
        value and `values.department?.value` was `undefined` after picking one (Add would have sent
        no department). Latent since Phase 4. Fixed and verified with real clicks: choosing Design
        stores `Design`.
  - [x] Verified in a real browser (demo + playground): calendar opens on the right month in front
        of the drawer and 4px under its trigger, keyboard selection, leap day (29 Feb 2024) via the
        month/year selects, disabled days not selectable, MonthPicker year stepping, round-trip
        through the real backend (`joinDate: "2024-02-29"`).
  - [x] Test suite 473 (up from 353). Main bundle 129.4 → 132.8 kB gzip (+3.4 kB for two pickers,
        the hook and the constants), CSS 4.3 → 4.7 kB.

- [x] **`4.2.0` — `FullPageSection`** (staged, see "Ready to publish"):
  - [x] Surveyed HRMS before porting: the multi-step wizard (`FullPageForm`) has **0 importers**
        — dead code, so not ported (same call as `ViewModeToggle`). The single-step layout
        `FullPageSection` has 8 real pages, all passing their own `onBack`/`onCancel`.
  - [x] `FullPageSection` built router-free (default back is `window.history.back()`), default
        footer reuses `FormFooter`, `loading` disables it and swaps the submit label. 10 tests,
        mutation-checked (5 deliberate breaks; one mutant I wrote turned out to be behaviourally
        equivalent, so I re-ran it as a real one — caught).
  - [x] Demo: an "Add (full page)" toolbar action swaps the table for the same form in
        `FullPageSection`. Verified in a browser: heading, subtitle, six fields, sticky footer,
        Back returns to the table, and a real submit (date via the calendar) created the row.
  - [x] Test suite 483 (up from 473). Main bundle 132.8 → 133.1 kB gzip.

- [x] **Integration test of the published `4.2.0` in `noviq-ui-demo`** (no library change):
  - [x] Method: installed `4.2.0` **from the registry** (after byte-comparing it with the staged
        tarball) and audited which exports the demo used — only 8/28 components, 12/24 constant
        groups and 0/8 helpers, i.e. the Phase 4 demo was not a full consumer test.
  - [x] Added a **Component showcase** view that uses every export through its public API, a second
        differently-shaped backend endpoint (`/api/v2/staff`), and a **consumer-side Vitest suite
        (37 tests)** that runs it against the installed package (with the shipped `style.css`).
        Typechecked including the tests; `npm test` documented in the demo README.
  - [x] Results: 37/37 pass; typecheck + production build pass; real-browser pass with a clean
        console; **also green on React 18.3.1** (single React copy, typecheck, tests, build) and the
        published `.d.ts` files typecheck on **TypeScript 4.9.5** with `skipLibCheck: false`.
        No defect was found in the *behaviour* of any component; the failures along the way were
        my own wrong assumptions in tests/showcase (and one showcase bug: `<Label>`s with no
        `htmlFor`). Findings that ARE about the library are under "Known bugs / limitations".
  - [x] Corrected a stale fact: `noviq-hrms-ui` is on **Vite 6**, not CRA (the suite-level
        `CLAUDE.md` still says CRA). All four target frontends are Vite, three on React 18 and
        hrms-ui on TypeScript 4.9 — both now verified compatible.

- [x] **`4.2.1` — fixes for the first three findings of the 4.2.0 integration test** (staged, see
      "Ready to publish"). Patch release; behavior fixes plus one deliberate removal.
  - [x] **Escape closes only the topmost layer.** `Modal` listened on `window` and `Drawer` on
        `document`, each independently, so any nested layer closed together with its parent: a
        picker inside a modal, a select's open menu, a drawer opened from a modal. Now a module-level
        layer stack (`hooks/useEscapeLayer`) lets only the topmost overlay react; pickers, select
        menus (`hooks/useSelectEscapeGuard`) and `RejectAction` consume the Escape they own. An open
        `Drawer` without `closeOnOutside` ignores Escape but still shields a `Modal` beneath it.
        12 library tests (8 failed before the fix) + 5 mutation checks, each caught.
  - [x] **Table pagination wraps on phones.** The right-hand controls didn't wrap and the table
        wrapper clips overflow, so the last-page button was cut off at ~430px. Now the bar stacks
        under 640px, the controls wrap, and on ≤400px the "Page 1 of N" label takes its own row so
        the four buttons stay together. Measured in a real browser at 375px and 320px on every
        table (page overflow 0). jsdom can't lay out, so a CSS-contract test pins the declarations.
  - [x] **The five dead field types are gone from `INPUT_TYPE`** (`rowsPerPage`, `multiText`,
        `custom`, `dateRange`, `reactQuill`). None had a render branch in the HRMS `Input` that was
        ported; they only existed as inherited constants. Removed rather than implemented
        (`select` covers rows-per-page; rich text would need `react-quill`). This **removes public
        members in a patch** — they never rendered anything but an error string, and it's called
        out. An unknown `type` now renders `Unsupported input type: <type>` (was the typo'd
        "Worng input type provided") and logs one dev `console.error` per type. A test renders
        every remaining `INPUT_TYPE` so the list can't drift from the implementation again.
  - [x] **Consumer-side regression suite** in `noviq-ui-demo` (7 tests, 44 total) asserting the
        three fixes against the *installed package*. Run against the published `4.2.0` all 7 fail;
        against `4.2.1` all pass — my first version of two of them passed on 4.2.0 (vacuous: the
        Modal lingers in the DOM while animating out; the fallback text had changed), so they were
        rewritten to key off `body` scroll lock and the shared `title` attribute.
  - [x] **`TimePicker` display changes, requested from a screenshot of the 12-hour picker** (folded
        into the still-unpublished 4.2.1): the 12-hour clock's first hour now reads **`00`** instead
        of `12` (zero-based, 00–11; `00 PM` is noon, stored `12:xx`), and the minute column lists
        **every minute 00–59** by default in both clocks (`DEFAULT_MINUTE_STEP` 5 → 1; the demo had
        also been forcing `minuteStep: 15`). `value`/`onChange` are unchanged (24-hour `HH:mm`). A
        trade-off worth knowing: noon now displays as `00:30 PM`, which is unconventional in
        English-language UIs (it is how Japan writes it); and arrowing through 60 minutes is slower
        — `minuteStep` is the escape hatch.
  - [x] Found while documenting, **not fixed** (outside the three items): body scroll lock isn't
        reference-counted — closing a nested Drawer unlocks page scroll under an open Modal, and a
        closed Drawer mounted after an open Modal cancels its lock. See "Known bugs".
  - [x] Test suite 525 (up from 483 at 4.2.0); demo suite 44. Bundle 133.1 → 133.3 kB gzip; 54
        files in the tarball (3 new type files).

- [x] **`4.3.0` — configurable date, time and date-time formats** (`NoviqUIConfigProvider`
      `formats`; staged, see "Ready to publish"; absorbs the unpublished `4.2.1`).
  - [x] `config.formats = { date, time, dateTime }` with moment-style tokens (`YYYY MM DD dddd HH
        hh KK mm ss A a [literal]`; `KK` is the zero-based 12-hour hour). Applied to Table
        date/time cells, Excel/CSV export, filter chips, and the Date/Month/Time pickers; plus
        `displayFormat` props and a public `useDateTimeFormatters()` for the app's own UI.
        Display only: emitted/stored values and backend payloads are unchanged.
  - [x] Defaults reproduce the previous output exactly, so nothing changes unless configured.
  - [x] **Found and fixed on the way: date-only strings were shown a day early west of UTC.** The
        old formatter ran `"2024-03-05"` through `new Date()` (UTC midnight) and printed
        `04/03/2024` in e.g. Los Angeles — in Table date cells and date-filter chips. Date-only
        strings are now calendar days in every zone (tested across LA/UTC/Kolkata/Auckland; the
        pre-fix output was reproduced first).
  - [x] TimePicker follows `formats.time` for its clock and hour list (precedence: `hourCycle` prop
        > configured format > 24-hour); not configured ⇒ identical to before. See context.md.
  - [x] Provider validation: a non-string or blank pattern throws at mount, like a malformed
        `table` config.
  - [x] Tests: library 626 (up from 525; 101 new) — engine, resolution, hooks, provider, every
        Table surface, export, chips, all three pickers; 7 mutation checks, all caught. Demo:
        52 (5 new), a "Date and time formats" showcase section with live presets, and the
        Employees page now configured with `DD MMM YYYY`. Verified in a real browser: grid
        cells, export file (`01 Jan 2023`), picker labels and all four presets.
  - [x] Design calls worth knowing: month display is *derived* from the date pattern (no
        `formats.month`); a nested provider *replaces* its parent's config (does not merge);
        native date/time inputs can't be reformatted.

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
- `2.5.1` — live on npm (confirmed via the registry API). Fixes a real `Drawer` bug (no responsive
  breakpoint, causing overflow/clipping on narrow viewports) found via `noviq-ui-demo`, plus a
  `FormFieldConfig.colSpan` JSDoc clarification (the CSS itself was already correct — see the
  `2.5.1` "Done" notes above for the full story). Patch release, no API/behavior change.

- `2.5.2` — live on npm (confirmed via the registry API; published tarball is byte-identical to
  the staged build, no config-provider code in it). Fixes a second, real overflow bug
  (Edge-specific, found by the user with real DevTools evidence): `.drawer-content` gains
  `overflow: hidden` and `Form.css`'s `.col-span-*` gain `min-width: 0`, so an oversized field is
  contained/shrinks instead of spilling past the drawer's boundary on a full-width window.
  Patch release, no API/behavior change.

- `3.0.0` — live on npm (confirmed via `npm view`; `latest` tag). **Breaking change**:
  `Table`'s `apiFunction` now resolves to the raw backend response instead of a fixed
  `{ result, totalCount }` shape; `TableQueryResult` is removed. Every app declares its backend's
  response format once via the new `NoviqUIConfigProvider` (`config.table.responseFormat`), and can
  rename the `search`/`page_no`/`rows_per_page` request keys via `config.table.requestParams`.
  Also fixes the missing `types` export condition (typed consumers previously got implicit `any`
  for the whole library) and `Form`'s `formik` prop typing. See the `3.0.0` "Done" entry above and
  the design spec in `docs/superpowers/`. Migration is a one-time wrap of the app root in
  `NoviqUIConfigProvider` plus returning the raw response from `apiFunction`. `noviq-ui-demo/web`
  now depends on `^3.0.0` from the registry (typecheck, build and a live run all verified).

- `4.0.0` — live on npm (confirmed with `npm view`; bundle byte-identical to a build of commit
  `05f8c61`). Breaking (behavior): `TimePicker` with a 12-hour mode; `formik` and `react-hot-toast`
  no longer dependencies; new `config.notify` (export feedback — the table no longer toasts by
  itself); fix for the spurious dev warning. **Does not include the constants** (see `4.1.0`).

- `4.1.0` — live on npm (confirmed with `npm view`; the registry bundle is byte-identical to the
  staged tarball). Additive: `DatePicker`, `MonthPicker`, the `datePicker`/`timePicker`/
  `monthPicker` `Input` types, and `src/constants.ts` (every fixed value a named, exported
  constant). `noviq-ui-demo/web` now depends on `^4.1.0` from the registry.

- `4.2.0` — live on npm (confirmed with `npm view`; the registry bundle is byte-identical to the
  tarball verified before publishing, 51 files). Additive: `FullPageSection`.

- `4.3.0` — live on npm (confirmed with `npm view`; registry bundle byte-identical to the staged
  tarball, 56 files). Configurable date/time/date-time `formats` on `NoviqUIConfigProvider`;
  absorbs the never-published `4.2.1` (Escape layering, phone pagination, dead field types
  removed) and the zero-based 12-hour / every-minute TimePicker. `noviq-ui-demo/web` is on
  `^4.3.0` from the registry (typecheck, build and 52 consumer tests green).

## Ready to publish
_Nothing staged._

## Not started
- [ ] `ViewModeToggle`/`ViewComponent` (the alternate "card view" escape hatch) — deferred
      indefinitely, confirmed near-dead in HRMS (1 real working call site out of 97). Not part of
      Table 3a-3d at all; revisit only if a real consumer needs it.
- [ ] No `eslint.config.js` — `npm run lint` still fails (ESLint 9 needs flat config). Confirmed
      still broken after four phases; intentionally left out of scope each time.
- [ ] No CI/CD pipeline.
- [ ] No consumer integration — not a dependency of any of the four frontend repos yet.
- [ ] `noviq-ui-demo` is still not a git repository (`noviq-ui` itself now is — remote
      `NeerajSkeyit/noviq-ui-npm`).
- [ ] Other config sections from the provider's roadmap (theme, locale — see the design spec's
      Roadmap; `notify` was built in `4.0.0`) are not built; the `NoviqUIConfig` type is shaped so they can be added
      without another breaking change.

## Known bugs / limitations
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
- Export feedback needs the consumer to wire `config.notify`; without it the table is silent
  (the button's "Exporting…" state and, on failure, `console.error` are all there is). There is no
  built-in inline fallback and no `"loading"` notification kind. Documented in `README.md`.
- `Form`'s prop is still named `formik` even though it now accepts any `FormController`-shaped
  object — kept to avoid a rename for existing callers.
- `Input type="time" | "date" | "month"` still render the browser's native inputs on purpose; the
  custom pickers are the separate `timePicker` / `datePicker` / `monthPicker` types.
- `DatePicker` weeks always start on Sunday, and month/weekday names are English: no `weekStart`
  or locale option yet. (The display *format* is configurable since `4.3.0`.)
- **A response that doesn't match the declared `responseFormat` fails soft.** If `rowsPath`/
  `totalPath` (or `getRows`/`getTotal`) doesn't resolve against what the backend actually
  returned, `Table` renders "No data found" with total `0` and only `console.warn`s — and only
  outside `NODE_ENV=production`. That's deliberate (a single error envelope or flaky response
  shouldn't crash the page; the setup-mistake cases — no provider, malformed config — do throw),
  but it means a wrong path in production looks like an empty table rather than an error. Worth
  knowing when debugging "the table is empty."
- **Tests aren't typechecked.** `tsconfig.json` excludes `*.test.ts(x)` and Vitest doesn't
  typecheck, so type-level regressions (like the `Form` `formik` prop typing fixed in `3.0.0`)
  can only be caught by building a real typed consumer — `noviq-ui-demo`'s `npm run build`.

### Open defects and gotchas (as of `4.3.0`)
(From the 4.2.0 integration test, minus what `4.2.1`/`4.3.0` fixed, plus two verified since.)
- **Currency is always formatted with Indian digit grouping.** `TableCell` hard-codes
  `Intl.NumberFormat("en-IN", …)` for every currency, so USD renders `$12,34,567.50` and EUR
  `€98,76,543.21`; a US/EU app expects `$1,234,567.50` / `9.876.543,21 €`. The default currency is
  also hard-coded to `INR`. (Verified.)
- **`Table` `isPrefetchedDataLoading` does nothing while the array is empty.** Prefetched mode is
  decided by `preFetchedData.length > 0`, so the common `preFetchedData={data ?? []}` +
  `isPrefetchedDataLoading={isFetching}` shows "No data found" instead of the loading state until
  the first rows arrive. (Verified.)
- **Body scroll lock isn't reference-counted** (found while fixing Escape). `Modal`/`Drawer` each
  write `document.body.style.overflow = isOpen ? "hidden" : ""`. Closing a nested Drawer unlocks
  page scroll under an open Modal, and a closed Drawer whose effect runs after an open Modal's
  (every `Table` mounts two hidden drawers) cancels the Modal's lock. Verified in jsdom.
- **A closed `Drawer` keeps its children mounted** (hidden, `aria-hidden`). Each `Table`
  therefore mounts two hidden drawers (columns, filters); a form inside a closed Drawer stays live
  (state, effects, autofocus), and two drawers rendering the same `id` produce duplicate ids.
- `DropdownMenu` has no Escape handling.
- `Input type="search"` ignores `label`, `error` and `helper` (renders no field container).
- `TableColumn.cell(row, cellValue)` receives the library's placeholder `"-"` for an empty value,
  not `""` — easy to get backwards (`value ? … : …` is always truthy).
- `FilterDrawer`'s `onRemoveFilter` prop is required by the type but never used.
- The `Checkbox` renders a hidden native `<input>` *and* a `role="checkbox"` div; it relies on
  `style.css` to hide the input (without the stylesheet a screen reader sees two checkboxes).
- Only Chromium was exercised: no Firefox/Safari run, no screen-reader pass, no RTL.
- The Excel (`.xlsx`) export path was never opened and validated end-to-end (CSV is, in jsdom and
  the browser); only the CSV bytes are asserted.

## Roadmap (as of `4.3.0`)
Each release is one theme, small enough to verify in the demo before publishing. Order is by
user-visible damage first, then by how much later work depends on it.

### `4.3.1` — correctness patch (no API change)
1. Reference-counted body scroll lock (nested overlays stop unlocking page scroll).
2. `Table`: `isPrefetchedDataLoading` honoured while the array is still empty.
3. `Checkbox`: don't rely on `style.css` to hide the native input (a11y without the stylesheet).
4. `DropdownMenu`: close on Escape (join the overlay layer stack).
5. `FilterDrawer`: make the unused `onRemoveFilter` prop optional.

### `4.4.0` — regional formats (builds on `4.3.0`'s `formats`)
1. `formats.locale` (BCP-47) for number/currency grouping, replacing the hard-coded `en-IN`;
   `formats.currency` as the default currency instead of the hard-coded `INR`.
2. `DatePicker` `weekStart`, and month / weekday names from the locale.
3. Table: client-side search for `preFetchedData`; `cell()` gets the raw value option.
4. `Input type="search"` honours `label` / `error` / `helper`.
*Decision needed:* unify the table's default time (`hh:mm A`) with the picker's (24-hour)?

### `4.5.0` — copy and localisation
User-facing strings ("Cancel", "Showing x to y of z results", aria labels…) become constants and
are overridable through `config.text` (the `config.i18n` item from the original spec). Unblocks
any non-English app. Largest remaining sweep in the library.

### `4.6.0` — Table ergonomics
Server-side sort option (today sort only reorders the loaded page); chip click reopens the filter
drawer; measured (not declared-width) sticky offsets; closed `Drawer` children unmounted (option
first); *decision needed:* should a nested `NoviqUIConfigProvider` merge with its parent?

### `5.0.0` — only if a real adopter forces it
Rename `Form`'s `formik` prop (keep an alias), merge nested providers, unify time defaults,
unmount closed drawers by default. Batch all behavioural breaks here, not one at a time.

### Alongside (no release of their own)
- **Quality gates:** `eslint.config.js` (lint is broken), CI running tsc + tests + build + the
  constants guard + the demo's consumer suite against the packed tarball, a typecheck gate for the
  library's own tests, `noviq-ui-demo` under git.
- **Verification gaps:** Firefox/Safari, a screen-reader pass, RTL, and opening a real `.xlsx`.
- **Adoption (needs your go-ahead):** pilot in one Vite app — `noviq-lms-admin-ui` (React 18) —
  because real use should reorder everything above.
