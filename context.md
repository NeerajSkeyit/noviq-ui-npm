# noviq-ui — Context

## What it is
A standalone, lightweight **React component library** for the Noviq product suite. Published to
the public npm registry as [`noviq-ui`](https://www.npmjs.com/package/noviq-ui), currently at
**v4.4.0** on npm, with **`4.5.0` staged** (`1.1.0` shipped
Button/ScrollArea/Drawer/Modal; `2.0.0` shipped an Input rewrite plus Label/Switch/FormFooter/Form;
`2.1.0`–`2.5.0` shipped `Table` in sub-phases 3a–3d — core, column management, row/bulk actions,
filters, Excel/CSV export; `2.5.1` fixed `Drawer`'s missing responsive breakpoint; `2.5.2` fixed a
second, related overflow bug found in Edge on a full-width window; `3.0.0` is the breaking
`NoviqUIConfigProvider` release plus the `types` export-condition fix — see "Config provider"
below; `4.0.0` adds `TimePicker` (24/12-hour), drops the `formik`/`react-hot-toast` dependencies,
adds `config.notify`, and fixes a spurious dev warning; `4.1.0` adds `DatePicker`/`MonthPicker`,
the `datePicker`/`timePicker`/`monthPicker` `Input` types, and the `src/constants.ts` consolidation
(which was **not** in the published 4.0.0 even though the tree said 4.0.0 for a while: verify what
is on the registry with `npm view` / a bundle hash before assuming); `4.2.0` adds `FullPageSection`;
`4.3.0` adds configurable date/time formats and carries the Escape-layering, phone-pagination and
dead-field-type fixes — see "Date and time formats" and "Overlays and Escape" below; `4.3.1` was
published on 2026-10-15 after one failed attempt; `4.4.0` adds regional settings — see "Regional
settings" below; `4.5.0` adds `config.text` — see "Text and translation"). The `2.5.x`
fixes were found via
`noviq-ui-demo`, a standalone sibling project that installs the real published package against a
real backend. See `progress.md` for the
phase-by-phase history. Intended to be installed as a dependency
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
filters and 3d-ii export (published as `2.4.0`/`2.5.0` — see `progress.md`). Table's own
`ViewModeToggle`/`ViewComponent` alternate-view escape hatch was deliberately left out of 3d
entirely (confirmed near-dead in HRMS — 1 real working call site out of 97).

**Git**: this is a git repo (`main`, remote `NeerajSkeyit/noviq-ui-npm` — a personal-account
remote, unlike the suite's `itsatellitekey/<repo>` remotes documented in the suite-level
`CLAUDE.md`, where it also isn't listed). `*.tgz` is gitignored; note an early `noviq-ui-2.5.2.tgz`
was committed and pushed before that rule existed, so it remains in history.

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
  animation), `react-select` (Input's select/multiSelect, Table's page-size dropdown),
  `react-hotkeys-hook` (ActionBar's `/`-to-focus-search shortcut, also
  reused by `RejectAction`'s Escape-to-close — needs `{ enableOnFormTags: true }` since its reason
  textarea auto-focuses on open), `@tanstack/react-query` (Table's `apiFunction`
  data-fetching/caching/retry), `xlsx-js-style` (Table's export — chosen over plain `xlsx` for its
  cell-styling support, used to bold+color the exported Excel header row) — all bundled so
  consumers get them for free rather than needing to install/version them themselves.
  **Deliberately not dependencies (as of `4.0.0`): `formik` and `react-hot-toast`.** Both are the
  consuming app's choice; `Form` is typed structurally (`FormController`) and Table export
  feedback goes through `config.notify`. `formik` stays a *devDependency* — the `Form` tests and
  the playground use a real `useFormik()` to keep the structural type honest — and
  `src/packaging.test.ts` fails if either is re-added to `dependencies` or imported by shipped
  source. `Table`
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
│   ├── index.ts                     # public API — all components + their prop types + constants
│   ├── constants.ts                 # EVERY fixed vocabulary (variants, sizes, keys, ids, defaults)
│   ├── constants.test.ts            # guard: fails on a bare literal for a value that has a constant
│   ├── styles/tokens.css            # shared :root design tokens, single source of truth
│   ├── config/                      # NoviqUIConfigProvider + types + response-format extraction
│   ├── hooks/useFloatingPanel.ts    # picker dropdown mechanics: outside click, flip, follow scroll
│   ├── packaging.test.ts            # guards the package.json exports `types` condition
│   ├── test/setup.ts                # jest-dom matchers for Vitest
│   ├── test/sourceFiles.ts          # shippedSourceFiles()/stripComments() for the guard tests
│   └── components/
│       ├── Input/                   # Input.tsx + .css + .test.tsx (18 field types)
│       ├── Button/                  # Button.tsx + .css + .test.tsx
│       ├── ScrollArea/              # ScrollArea.tsx + .css + .test.tsx
│       ├── Drawer/                  # Drawer.tsx + .css + .test.tsx (portal slide-over)
│       ├── Modal/                   # Modal.tsx + .css + .test.tsx (portal, framer-motion)
│       ├── Label/                   # Label.tsx + .css + .test.tsx
│       ├── Switch/                  # Switch.tsx + .css + .test.tsx
│       ├── FormFooter/              # FormFooter.tsx + .test.tsx (built on Button)
│       ├── Form/                    # Form.tsx + .css + .test.tsx (config-driven; Formik-compatible)
│       ├── Badge/                   # Badge.tsx + .css + .test.tsx
│       ├── Dropdown/                # Dropdown.tsx + .css (DropdownMenu, DropdownMenuItem)
│       ├── Checkbox/                # Checkbox.tsx + .css + .test.tsx
│       ├── TimePicker/              # TimePicker.tsx + .css + .test.tsx (portal; 24h / 12h)
│       ├── DatePicker/              # DatePicker.tsx + .css + .test.tsx + dateParts.ts (pure date math)
│       ├── MonthPicker/             # MonthPicker.tsx + .css + .test.tsx
│       ├── PickerField/             # internal trigger shell shared by DatePicker/MonthPicker
│       ├── FullPageSection/         # FullPageSection.tsx + .css + .test.tsx (page-level form layout)
│       └── Table/                   # Table.tsx + ActionBar/TableCell/TablePagination/
│                                     #   ColumnSelector/EmptyState/LoadingOverlay/
│                                     #   RowActionsMenu/RejectAction/BulkActionsBar/
│                                     #   FilterDrawer/FilterChips/Export +
│                                     #   useTableColumnSettings.ts + buildActiveFilter.ts +
│                                     #   useTableExport.ts + cellValue.ts +
│                                     #   dateFormat.ts + textTransforms.ts + .test.tsx per piece
├── dev/playground.tsx               # manual visual-testing harness, not published
├── index.html                       # dev-server entry point, not published
├── public/                          # favicon.svg, icons.svg
├── vite.config.ts                   # library build config + dev server port (5176)
├── vitest.config.ts                 # test runner config
├── tsconfig.json / tsconfig.node.json
└── package.json                     # deps: lucide-react, framer-motion, react-select,
                                      #   react-hotkeys-hook, @tanstack/react-query, xlsx-js-style
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
Fallback: an unrecognized `type` renders `Unsupported input type: <type>` (it used to be the
literal `"Worng input type provided"`), and logs one `console.error` per type in development.

**`INPUT_TYPE` lists only types `Input` actually renders** — `Input.test.tsx` renders every value.
Until `4.2.1` it also declared `dateRange`, `rowsPerPage`, `multiText`, `custom` and `reactQuill`,
inherited from HRMS where none of them had a render branch in the `Input` that was ported
(`rowsPerPage`/`reactQuill` existed only in a legacy `common/Input.js`, `multiText` only in the
legacy `BasicForm`, `custom` and `dateRange` nowhere). They were removed rather than implemented:
`select` covers rows-per-page, and rich text would need the heavy `react-quill`. This is the one
place a public export was removed in a patch — justified because they never worked, and called
out in the release notes.

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

### `TimePicker`
Ported from `noviq-hrms-ui/src/components/common/TimeInput.jsx` (hand-rolled, no picker library).
Standalone — **`Input type="time"` still renders the native `<input type="time">`**; wiring it in
is a pending product decision (native is better on mobile, the custom one is consistent across
browsers/locales). `"HH:mm"` 24-hour strings in, `onChange(value)` out, `""` on clear. Differences
from the source, all deliberate: the empty state shows a placeholder instead of `00:00`; opens on
click / ArrowDown / Enter, **not on bare focus** (tabbing through a form no longer pops pickers);
the scroll-to-selected lookup is scoped to its own dropdown instead of a global
`document.querySelector` (two pickers on a page scrolled the wrong one); the dropdown repositions
on scroll/resize and flips above near the viewport bottom; ARIA combobox/listbox roles with
`aria-activedescendant`; uses the library's own `ScrollArea` instead of `simplebar-react`. The
source's `minDate`/`maxDate` props were accepted but ignored, so they aren't ported.

**Since `4.4.0` the default clock is 12-hour** (`hh:mm A`, conventional `12, 01 … 11`) — it follows
the library default `formats.time`, i.e. the pattern Table cells use; before it was 24-hour. An
explicit `hourCycle` still wins and a configured `formats.time` still decides the clock.

`hourCycle={12}` (not in the source) with **no configured format** shows hours as `00 … 11` plus an
AM/PM column — the zero-based 12-hour clock (Intl's `h11`), chosen explicitly by the user over the conventional
`12, 01 … 11`: `00 AM` is midnight, `00 PM` is noon (shown `00:30 PM` for 12:30). The minute column
lists every minute 00–59 by default in both clocks (`DEFAULT_MINUTE_STEP = 1`; it was 5 before
`4.2.1`; `minuteStep` still coarsens it). **`value`/
`onChange` are 24-hour `"HH:mm"` in both modes** — the cycle is presentation only, so what a form
stores doesn't depend on the display. Hours are ordered 12-first so the list index equals
`hour24 % 12`; `00 AM` is `00`, `00 PM` is `12`. Enter walks hour → minute → (12h) AM/PM and closes
after the last column.

### `DatePicker` / `MonthPicker`
Ported from `noviq-hrms-ui/src/components/common/DateInput.js` + `DatePickerHeader.jsx` (and the
`MONTH` branch of `design/form/Input.jsx`). The source sat on `react-datepicker` + `moment` +
`react-i18next`; these are **hand-built, no new dependency** (the user had just asked to remove
`formik`/`react-hot-toast`, so fewer dependencies was the clear direction).
- **Dates are `{year, month, day}`, never `new Date("YYYY-MM-DD")`** (which reads as UTC and shifts
  the day for users west of UTC). All the math is in `DatePicker/dateParts.ts` — pure, 38 tests:
  leap years, month-end clamping (31 Jan + 1 month → 29 Feb), DST-safe day arithmetic, invalid
  dates (`2023-02-30` → empty rather than rolling over).
- Values are `"YYYY-MM-DD"` / `"YYYY-MM"`; displayed `DD/MM/YYYY` / `MM/YYYY`. A trailing time on a
  date is ignored, like the HRMS input did. Bounds are inclusive.
- Focus stays on the trigger and `aria-activedescendant` names the active day (same model as
  `TimePicker`); month/year header uses native `<select>`s (the source used styled react-select).
- Not ported: `react-datepicker`'s `dateFormat` was the buggy `"dd/MM/YYYY"` (`YYYY` is a
  week-year token), and the source's `isCalenderOpen`/`setIsCalenderOpen` prop-drilling.
- **Wired into `Input` as new opt-in types** (`datePicker`, `timePicker`, `monthPicker`), so they
  work in `Form` configs. The native `date`/`time`/`month` types are deliberately unchanged
  (native is better on mobile). `INPUT_TYPE.DATE_PICKER`/`TIME_PICKER`/`MONTH_PICKER`.
- Shared plumbing: `hooks/useFloatingPanel` (also now used by `TimePicker`) and the internal
  `PickerField` trigger shell (used by Date/MonthPicker; `TimePicker` keeps its own markup).

### `FullPageSection`
Ported from `noviq-hrms-ui/src/components/design/form/FullPageSection.jsx` (8 real call sites).
Back arrow + title/subtitle header, children in a card, sticky footer. **What was decided:**
- **The router coupling is gone**: the source called react-router's `useNavigate` for its default
  back; all 8 callers pass their own `onBack`, so the port defaults to `window.history.back()`
  (equivalent for browser history) and the library stays router-agnostic.
- The default footer reuses the existing `FormFooter` rather than duplicating Cancel/Submit.
- Source had a no-op `marinLeft` style typo (dropped) and CSS from `design.module.css` that
  referenced HRMS-only tokens (`--background`, `--color-text-muted`) — mapped to noviq-ui tokens.
- **Not ported, on purpose**: HRMS's `FullPageForm` / `SingleStepForm` / `FormSidebar` (the
  multi-step wizard). `FullPageForm` has **zero importers** in HRMS (dead code) — same call as
  `ViewModeToggle`. `FullPageFormFooter` and `ProgressBar` only serve that wizard.

### `FormFooter`
Ported from `noviq-hrms-ui/src/components/design/form/FormFooter.jsx`. Cancel/Save/extra-buttons
row, built entirely on `Button`.

### `Form`
Ported from `noviq-hrms-ui/src/components/design/Form.jsx`. Config-driven: an `inputList` array
of field configs + a Formik instance renders a grid of `Input`s, auto-wiring
`formik.setFieldValue`/`touched`/`errors`. Supports `colSpan` (1/2/3) grid placement and an
`"info"` pseudo-type for section headers. Originally ported with `formik` as a runtime
dependency; as of `4.0.0` it isn't one — the `formik` prop is typed as the structural
`FormController` (`values`, `errors?`, `touched?`, `setFieldValue`), which a `useFormik()` instance
satisfies as-is. The prop kept its `formik` name to avoid a rename for existing callers.

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
- **Export feedback goes through `config.notify`** (`4.0.0`; it used to be hardcoded
  `react-hot-toast` calls needing a consumer-mounted `<Toaster/>`). `notify(message, kind)` is
  called once per export with `"success"`/`"error"`; there is no `"loading"` kind (a loading toast
  with no id can never be dismissed through a plain callback — the Export button's own
  "Exporting…" state covers it). No `notify` → silent, except a failed export is still
  `console.error`ed. `useTableExport` takes an explicit `notify` arg and otherwise reads the
  provider's.
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
- **Data-fetching contract simplified to just `apiFunction`**: `(params) => Promise<unknown>`
  (as of `3.0.0` — it resolved to a fixed `{result: T[], totalCount: number}` before; see
  "Config provider" below for how rows/total are read out of the raw response). The source's
  second path (`apiEndPoint` + `useGetData` + a shared `axiosInstance` + its own independent Redux
  permissions check) is dropped entirely — it was only used in 6 of 97 real call sites,
  `apiFunction` dominates. `preFetchedData` remains as the fully client-controlled alternative.
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
- `preFetchedData` mode searches and pages client-side since `4.4.0` (it used to ignore the search
  box and render every row under a pager that claimed one page). The term matches the text of the
  *visible* columns via `getExportCellValue` (dates as displayed, status labels, `exportValue`
  columns; the `-` placeholder never matches). One page of the searched, sorted rows renders when
  the pager is shown; `isPaginationHidden` renders all. Select-all = the page's rows; export =
  all searched rows; row-action `sn` counts from the list start. `apiFunction` tables are
  untouched: the term goes to the server.
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
  one viewport width and more than one real browser. (A second reported issue, `Form`'s field
  layout looking wrong, turned out *not* to be a `Form.css` bug on investigation — see the `2.5.1`
  notes in `progress.md` for the full story of how a misleading JSDoc comment led to a wrong first
  diagnosis, caught before it shipped.)
- **`2.5.1`'s `Drawer` fix only covered narrow *viewports* — a real, related bug still got through
  to `2.5.2`.** The user hit a case in Edge, on a full-width/maximized window, where a form field
  (a native date input) rendered with a wider intrinsic minimum width than this session's own
  Chromium-based testing tool ever produced, causing content to visually spill past the drawer's
  fixed boundary even though the *viewport* was plenty wide. `Drawer.css`'s `.drawer-content` had
  no `overflow: hidden` of its own (only its inner `ScrollArea` did), and `Form.css`'s
  `.col-span-*` had no `min-width: 0` (flex items default to refusing to shrink below their
  content's intrinsic minimum). Neither gap depends on viewport width at all, which is exactly why
  `2.5.1`'s `@media (max-width: 640px)` breakpoint didn't help. Lesson: a "make it responsive at
  narrow widths" fix and a "make it robust to an oversized child, at any width, in any browser"
  fix are different problems — this one needed the latter. Verified the `2.5.2` fix by forcibly
  setting a real input's `min-width` to 900px via JS and confirming (via screenshot) the drawer
  still renders with clean edges — a check that doesn't depend on reproducing Edge's exact
  rendering.

## `noviq-ui-demo` — a standalone integration-test sibling project
`/Users/neerajyadav/Documents/sk/noviq/noviq-ui-demo/` (own README) is a small, separate project —
`server/` (Express + TS, in-memory sample data) + `web/` (Vite + React + TS) — that installs
`noviq-ui` from the **real npm registry** (not a local link) and exercises most of the library
against real HTTP calls: `Table` (search/sort/pagination/filters/row+bulk actions/export),
`Drawer` + `Form`/Formik. It exists specifically to answer "does `npm install noviq-ui` actually
work for a real consumer," a question neither `noviq-ui`'s own Vitest suite nor its local-source
dev playground can answer. Not itself a git repo yet (`noviq-ui` is). When debugging a `noviq-ui`
release, installing a fresh `npm pack` tarball into `noviq-ui-demo/web` (or `npm link`, then
clearing `node_modules/.vite` in the demo, since Vite's dependency pre-bundle cache goes stale
across a link swap) is a fast way to verify a fix against a real consumer before publishing —
this is how the `2.5.x`/`3.0.0` changes were verified.

**Checking the demo's console — read warnings, not just errors.** `read_console_messages` with
`onlyErrors` hid a spurious dev-only `[noviq-ui] responseFormat.rowsPath … did not resolve`
warning that 3.0.0 emitted on every initial load (the response format ran against the still-
`undefined` query result). Look at the full console on a **fresh tab** (a reused tab keeps stale
messages from earlier server lifetimes, e.g. Vite HMR errors from before a dependency swap).

**Typechecking the demo — a trap**: the Vite template's root `tsconfig.json` has `files: []`, so
`npx tsc --noEmit` there checks nothing and always "passes." Use `npx tsc -p tsconfig.app.json
--noEmit` or `npm run build` (which runs `tsc -b`). That vacuous check is why the missing `types`
export condition (fixed in `3.0.0`) went unnoticed through five published releases.

## Date and time formats (`config.formats`, `4.3.0`)
`NoviqUIConfig.formats = { date?, time?, dateTime? }`: display patterns, moment-style tokens
(`YYYY MM DD dddd HH hh KK mm ss A a [literal]`). **Display only** — pickers still emit
`"YYYY-MM-DD"`/`"HH:mm"`/`"YYYY-MM"` and filter payloads stay ISO.
- **Engine**: `utils/dateTimeFormat.ts` — a small hand-written tokenizer (no moment/date-fns;
  that stays a dependency-free library). `resolveFormats()` applies defaults (`DATE_FORMAT`,
  `TIME_FORMAT`) and derives `dateTime = "<date> <time>"` unless set. `hooks/useDateTimeFormats.ts`
  resolves from context (memoised on the three strings — apps pass inline `config={{...}}`) and
  exposes the public `useDateTimeFormatters()`.
- **Applied in**: `formatTableCellValues(type, options, formats?)` (cells, via `TableCell`, and
  export via `getExportCellValue`), `buildActiveFilter(config, raw, formats?)` (chips), and
  `DatePicker`/`MonthPicker`/`TimePicker` (+ `displayFormat` props). Defaults are unchanged.
- **MonthPicker** derives its pattern from `formats.date` with the day token (and the adjacent
  separator) removed (`deriveMonthPattern`); there is deliberately no `formats.month`.
- **TimePicker is the subtle one.** Its *clock* and hour list follow `formats.time`: `HH` →
  24-hour, `hh`/`h` → 12-hour listing `12, 01…11`, `KK`/`K` → 12-hour listing `00…11`. Precedence:
  explicit `hourCycle` prop > configured `formats.time` > the library default `hh:mm A`
  (**12-hour since `4.4.0`**; it was 24-hour until then, which is why a Table cell said
  `02:30 PM` next to a picker saying `14:30`). A pattern that contradicts the clock is ignored for
  that clock's default (`HH:mm` / `KK:mm A`) so the field never disagrees with its columns.
  `hourCycle={12}` with *no* configured format keeps the zero-based `KK:mm A` (`00 … 11`) — the
  default text only applies when the clock itself is unset (`TimePicker.tsx`: `followedPattern`).
- **Date-only strings are calendar days.** `"2024-03-05"` is read as that day in every zone. The old
  formatter ran it through `new Date()` (UTC midnight) and showed `04/03/2024` west of Greenwich —
  a real bug in Table cells and filter chips, fixed by the same change. A bare `"HH:mm[:ss]"` is
  also accepted now (what a TimePicker produces).
- Unreadable values are returned as they were (was `NaN/NaN/NaN`).
- **Nested providers replace** the parent's config; they do not merge.
- Not covered: native `<input type=date|time|month>` render in the browser's locale.

### Regional settings (`formats.locale` / `currency` / `weekStart`, `4.4.0`)
- `locale` (BCP-47, default `DEFAULT_LOCALE = "en-IN"`), `currency` (ISO 4217, default
  `DEFAULT_CURRENCY = "INR"`), `weekStart` (0–6, 0 = Sunday). `resolveFormats()` fills them in;
  `weekStart` falls back to the locale's own first day (`Intl.Locale#getWeekInfo()`/`weekInfo`,
  Monday = 1 … Sunday = 7, `% 7`) only when a locale was *configured*, else `WEEK_START`.
- **Names**: `getDateNames(locale)` in `dateTimeFormat.ts` — English (and unreadable tags) use the
  built-in `MONTH_NAMES`/`WEEKDAY_NAMES` tables because ICU spells September "Sept" in en-GB/en-AU
  (probed); other languages are read from `Intl.DateTimeFormat` (UTC, a fixed Sunday-first sample
  week), cached per locale. `weekdaysMin` is `weekday: "short"` minus a trailing dot (calendar
  headings). `formatParts`/`formatValue` take an optional `locale`; `formatYMD`/`formatYM` too.
- **Currency**: `utils/numberFormat.ts#formatCurrency` — cached `Intl.NumberFormat`, locale
  validated with `Intl.getCanonicalLocales`, and a currency Intl rejects renders `"CODE 1,234.5"`
  instead of throwing (the code may come from row data). The column's own `currency` beats
  `formats.currency`.
- **Types**: `ResolvedFormats` has the three new required fields; `FormatsInput` (the three
  patterns + `Partial<ResolvedFormats>`) is what `formatTableCellValues` / `buildActiveFilter`
  accept, so callers that built `{ date, time, dateTime }` by hand keep compiling.
- **Not translated**: digits (always Latin), the AM/PM marker, UI copy (4.5.0), genitive month
  forms. The provider validates the three settings and throws on mount.

## Text and translation (`config.text`, `4.5.0`)
`NoviqUIConfig.text` = a per-key replacement of the library's English copy. **`DEFAULT_TEXT` in
`constants.ts` is the single list** (96 keys, grouped by component prefix; public, with `TextKey`,
`NoviqUIText`, `TextValue`, `TextParams`). A value is a string with `{placeholders}` or a function
`(params) => string`.
- **Resolution**: `utils/text.ts` — `formatText` (fills `{name}`; a missing param is left as written;
  the replacer is a function so `$&` in a param is inert) and `resolveText(defaults, overrides, key,
  params)` (string override → function override, which falls back to the default if it throws or
  returns a non-string, with a dev warning). `hooks/useText.ts` returns `t(key, params)`, memoised on
  `config.text` identity. Components never read `config.text` directly except where a plain function
  needs it (`buildActiveFilter(…, text)`, `formatStatusLabel(status, text)`, `getExportCellValue`),
  which take an optional `NoviqUIText`.
- **Styled words inside a sentence** (the pager's highlighted numbers, the bold "browse"):
  `utils/richText.tsx` asks `t` for the text with a marker (`\u0001name\u0001`) in each placeholder's
  place and splits on the markers, so it works for templates and for functions and lets a translation
  reorder placeholders.
- **Precedence**: a component prop (`placeholder`, `emptyMessage`, `searchPlaceholder`, `title`,
  `submitLabel`/`cancelLabel`/`loadingLabel`, `rejectText`, `noOptionsMessage`) > `config.text` >
  default. Those props used to carry the English default in the destructuring (`title = "Drawer"`);
  now they are `undefined` by default and the fallback is `?? t(...)`.
- **Singular/plural** pairs are separate keys (`bulkSelectedOne`/`bulkSelected`,
  `inputFilesSelectedOne`/`inputFilesSelected`) chosen by count; anything subtler is a function.
- **Provider validation**: `text` must be an object; each value a string or function (else throws);
  an unknown key only `devWarn`s — a key removed in a later release must not crash an app.
- **Guards**: `constants.test.ts` fails if any `DEFAULT_TEXT` value of ≥4 chars appears as a quoted
  literal or JSX text outside `constants.ts` (a `className="browse"` is exempt). `components/
  localisedText.test.tsx` is the pseudo-localisation test — every default wrapped in `«»`, each
  component rendered, and any bare default left in the DOM text/aria-label/title/placeholder fails it.
- **Not in the dictionary** (deliberately): app data (headings, filter/row-action labels, status
  values other than `true`/`false`), developer errors and warnings, the "Unsupported input type"
  and "Invalid cell type" fallbacks, AM/PM markers. New accessible names this release: the pager's
  four arrows and the Drawer's close button. `EXPORT_MESSAGE` no longer exists; the export strings are
  `exportSuccess`/`exportFailure`.
- The reject action's `rejectReasonRequired` is unreachable by clicking (Confirm is disabled while
  the box is empty) but kept: the validation function is the same path as the others.

## Overlays and Escape
`Modal` and `Drawer` register on a module-level **layer stack** (`hooks/useEscapeLayer.ts`): one
window `keydown` listener, and only the topmost open overlay reacts to Escape. A `Drawer` that is
open but not Escape-dismissable (no `closeOnOutside`) still occupies a layer, so it shields a
`Modal` beneath it. Things that own an Escape *inside* an overlay consume it themselves with
`stopPropagation()` so they close first: the three pickers (trigger and, for DatePicker/MonthPicker,
the panel, because focus moves into the header `<select>`s after a mouse interaction), react-select
menus (`hooks/useSelectEscapeGuard.ts`, used by `Input` and `TablePagination`), and `RejectAction`'s
popover. The stack is ordered by *open* order, so a callback's identity is kept in a ref — registering
again on each render would move the layer to the top.
**Body scroll lock is reference-counted** (`hooks/useBodyScrollLock.ts`, `4.3.1`). `Modal` and
`Drawer` each used to write `document.body.style.overflow = isOpen ? "hidden" : ""` from their own
effect, so closing a nested Drawer unlocked the page under an open Modal, and a *closed* Drawer
(every `Table` mounts two) could cancel a Modal's lock. Now only an *open* overlay takes a lock,
the page is locked until the last one closes, and the page's own previous `overflow` is restored
(not blindly `""`). `DropdownMenu` also joins the Escape layer stack, so a menu opened inside a
Modal closes before the Modal does.

## Constants — the standing convention
**Every fixed value goes in `src/constants.ts`; component code never repeats it as a bare
literal.** That covers variants/sizes/sides/types (`BUTTON_VARIANT`, `DRAWER_SIDE`, `MODAL_SIZE`,
`SORT_DIRECTION`, `ROW_ACTION_TYPE`…), keyboard keys (`KEY`), hotkey specs (`HOTKEY`), the special
column ids (`TABLE_COLUMN_ID`), defaults (`DEFAULT_PAGE_SIZE_OPTIONS`, `DEFAULT_COLUMN_WIDTH`,
`SEARCH_DEBOUNCE_MS`), storage-key prefix, export file/MIME/sheet strings and notify messages.
- One file, not per-component, so there is exactly one place to look (and to grep). It has no
  imports, so nothing can form a cycle through it.
- **Public vs `@internal`**: public groups are re-exported from `src/index.ts` (consumers write
  `variant={BUTTON_VARIANT.OUTLINE}`); `@internal` ones aren't. Types are derived from the
  constants (`type ButtonVariant = ValueOf<typeof BUTTON_VARIANT>`) so a value can't exist in the
  type and not in the object. Values are the exact strings the props always took, so plain
  literals from consumers keep working — adding a constant is never a breaking change.
- **Enforced** by `src/constants.test.ts`, which scans shipped source and fails on a bare literal
  for a covered value (`variant="outline"`, `e.key === "Enter"`, `case "Escape"`,
  `direction === "asc"`, a hand-written `"a" | "b"` union, `useHotkeys("esc")`, the storage
  prefix…). The probe-file check proving each guard can fail is in the 4.0.0 "Done" notes.
  **When you add a new fixed value or a new variant/kind/type, add it to `constants.ts` first.**
- **Deliberately stays inline**: web-platform vocabulary the browser owns — native `<input
  type="date">`, `role=`/`aria-*`, CSS class names, third-party props like react-select's
  `menuPlacement="auto"` — and **user-facing copy** ("Cancel", "Select time", "Export as CSV"…).
  Copy is a separate concern (localisation, the spec roadmap's `config.i18n`) and was not moved.
- `INPUT_TYPE`, `CELL_TYPE` and `FILTER_TYPE` used to live in `Input.tsx`, `Table/constants.ts`
  and `Table/buildActiveFilter.ts`; they moved here and are still exported from the package root.

## Config provider (`NoviqUIConfigProvider`, `3.0.0`; `notify` added in `4.0.0`)
Spec: `docs/superpowers/specs/2026-09-04-config-provider-design.md`; plan:
`docs/superpowers/plans/2026-09-04-config-provider-implementation.md`. Code in `src/config/`.
- `Table`'s `apiFunction` resolves to the backend's **raw** response. The app declares once, via
  `<NoviqUIConfigProvider config={{ table: { responseFormat } }}>`, how to read rows/total:
  `{ rowsPath, totalPath }` (dot-paths) **or** `{ getRows, getTotal }` (functions) — exactly one;
  `config.table.requestParams` renames the `search`/`page_no`/`rows_per_page` keys sent; a
  `<Table responseFormat>` prop overrides per instance. `useTableExport` resolves the same config.
- **Mandatory**: `Table` + `apiFunction` with no provider ancestor and no `responseFormat` prop
  throws on render; a malformed provider config throws at mount. `preFetchedData` tables are
  exempt. `useNoviqUIConfig()` returns `undefined` outside a provider.
- **Fails soft on a mismatched *response***: a path that doesn't resolve yields an empty table
  and a `console.warn` (dev only), never a throw — deliberate, since one bad response shouldn't
  crash a page, but it makes a wrong path in production look like "No data found."
- **`notify`** (`4.0.0`): `config.notify?: (message, kind: "success" | "error") => void` receives
  Table export outcomes — see the Table export notes. `config.table` is **optional** (an app may
  configure only `notify`); if present it's still validated at mount. A notify-only provider does
  *not* satisfy an `apiFunction` Table — that still throws, since there's no response format.
- `NoviqUIConfig` is `{ table?, notify? }` so further sections (theme/locale — the spec's Roadmap)
  can be added without another breaking change. Those are not built.
- `TableQueryResult` was removed; `TableQueryParams` is `Record<string, unknown>` since its keys
  are now configurable.

## How this fits the suite
Suite-wide, HRMS/LMS/AMS each hand-roll their own form-input, table, and drawer/modal components
today. `noviq-ui` is being built up as the shared alternative, one extraction phase at a time,
closest in spirit to how `asset-management-system` already shares a `packages/shared` package
between its own frontend and backend. **Table's full 3a-3d feature set (core, column management,
row/bulk actions, filters, export) is now done** — the next real milestone is getting one of the
four consumer frontends to actually add `noviq-ui` as a dependency and swap in its components for
their local equivalents — see `progress.md` for the phased roadmap.
