# noviq-ui

A lightweight React UI component library built with React and bundled using Vite.
It provides reusable UI components that can be shared across multiple projects.

**Keywords:** react components, ui library, component library, design system, typescript,
form components, data table, react table, drawer, modal, dropdown, admin dashboard.

## Installation

Install noviq-ui with npm

```bash
  npm install noviq-ui
```

Import the stylesheet once, near the root of your app:

```javascript
import "noviq-ui/style.css";
```

## Breaking change in 2.0.0

`Input`'s `onChange` now receives the **raw value**, not the DOM event:

```diff
- <Input type="text" value={name} onChange={(e) => setName(e.target.value)} />
+ <Input type="text" value={name} onChange={setName} />
```

This applies to every field type — `onChange(value: any) => void`. The value's shape depends on
the field (`string` for text-like fields, `boolean` for checkbox/radio/switch, `File` for `file`,
`File[]` for `multipleFile`, an option object for `select`, an array of option objects for
`multiSelect`).

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

## Breaking change in 4.0.0

`noviq-ui` no longer depends on `formik` or `react-hot-toast`. Which form-state and notification
libraries an app uses is the app's call, but both were being installed into every app that
depended on `noviq-ui`.

- **`formik` is no longer installed with noviq-ui.** `<Form />` never needed it at runtime — it is
  typed against a small `FormController` shape (`values`, `errors`, `touched`,
  `setFieldValue`), which a `useFormik()` instance satisfies as-is. If your app imports from
  `"formik"`, add it to *your* `package.json`; nothing else changes.
- **`react-hot-toast` is no longer installed, and `<Table />` no longer shows its own
  toasts.** Export outcome is reported through the new `notify` option on
  `NoviqUIConfigProvider` — see "Export" below. Without it the table stays silent (the
  "Exporting…" button state still shows, and a failure is still `console.error`ed), and you
  no longer need to mount a `<Toaster />` for noviq-ui's sake.

```diff
  <NoviqUIConfigProvider
    config={{
      table: { responseFormat: { rowsPath: "result", totalPath: "totalCount" } },
+     notify: (message, kind) => (kind === "error" ? toast.error(message) : toast.success(message)),
    }}
  >
```

## Constants

Every fixed value the components accept has a named constant, so your code doesn't repeat
stringly-typed literals:

```javascript
import { Button, Drawer, BUTTON_VARIANT, BUTTON_SIZE, BUTTON_TYPE, DRAWER_SIDE } from "noviq-ui";

<Button variant={BUTTON_VARIANT.OUTLINE} size={BUTTON_SIZE.SM} type={BUTTON_TYPE.SUBMIT}>Save</Button>
<Drawer isOpen={open} onClose={close} side={DRAWER_SIDE.LEFT} />
```

The constants hold the same strings the props have always accepted, so plain literals
(`variant="outline"`) keep working and nothing needs migrating. Each group also has a derived
type (`ButtonVariant`, `DrawerSide`, …).

| Constant | Used by |
| --- | --- |
| `INPUT_TYPE`, `FORM_FIELD_TYPE`, `COL_SPAN` | `Input` / `Form` field `type`s and `colSpan` |
| `BUTTON_VARIANT`, `BUTTON_SIZE`, `BUTTON_TYPE` | `Button` (`BUTTON_TYPE` is the native `type` attribute) |
| `BADGE_VARIANT` | `Badge` |
| `DRAWER_SIDE`, `DRAWER_SIZE`, `MODAL_SIZE` | `Drawer`, `Modal` |
| `HOUR_CYCLE`, `TIME_PERIOD` | `TimePicker` |
| `CELL_TYPE`, `FILTER_TYPE` | `Table` column `type`, `filterConfigs` |
| `SORT_DIRECTION`, `STICKY_POSITION`, `COLUMN_ALIGN` | `Table` columns |
| `TABLE_COLUMN_ID` | ids of the auto-injected `select` / `actions` columns |
| `ACTION_ID` | `Table` toolbar `actions` (`ACTION_ID.ADD` is the primary action) |
| `ROW_ACTION_TYPE`, `ROW_ACTION_VARIANT`, `BULK_ACTION_VARIANT` | `rowActions`, `bulkActions` |
| `NOTIFY_KIND` | the `kind` passed to `config.notify` |
| `NO_TEXT_PLACEHOLDER` | what an empty table cell shows |

## Usage/Examples

```javascript
import { useState } from "react";
import { Input, Button, Drawer, Modal } from "noviq-ui";

function App() {
  const [name, setName] = useState("");

  return (
    <div>
      <Input type="text" label="Name" value={name} onChange={setName} />
      <Button variant="default">Save</Button>
    </div>
  );
}

export default App;
```

### Drawer

```javascript
import { useState } from "react";
import { Drawer, Button } from "noviq-ui";

function Example() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setOpen(true)}>Open Drawer</Button>
      <Drawer
        isOpen={open}
        onClose={() => setOpen(false)}
        title="Edit item"
        side="right"
        size="md"
        closeOnOutside
        footer={<Button onClick={() => setOpen(false)}>Save</Button>}
      >
        Drawer content goes here.
      </Drawer>
    </>
  );
}
```

### Modal

```javascript
import { useState } from "react";
import { Modal, Button } from "noviq-ui";

function Example() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setOpen(true)}>Open Modal</Button>
      <Modal
        isOpen={open}
        onClose={() => setOpen(false)}
        title="Confirm"
        closeOnOutside
        footer={<Button onClick={() => setOpen(false)}>Confirm</Button>}
      >
        Modal content goes here.
      </Modal>
    </>
  );
}
```

### Form + Formik

`Form` renders a config-driven list of `Input`s wired to a [Formik](https://formik.org/) instance
(or anything with the same small shape — see below). Formik is not a dependency of `noviq-ui`;
install it yourself if you use it.

```javascript
import { useFormik } from "formik";
import { Form, FormFooter } from "noviq-ui";

function Example() {
  const formik = useFormik({
    initialValues: { firstName: "", lastName: "" },
    validate: (values) => {
      const errors = {};
      if (!values.firstName) errors.firstName = "Required";
      return errors;
    },
    onSubmit: (values) => console.log(values),
  });

  const fields = [
    { inputKey: "firstName", type: "text", label: "First name", required: true, colSpan: 2 },
    { inputKey: "lastName", type: "text", label: "Last name", colSpan: 2 },
  ];

  return (
    <form onSubmit={formik.handleSubmit}>
      <Form inputList={fields} formik={formik} />
      <FormFooter onCancel={formik.resetForm} onSubmit={formik.submitForm} />
    </form>
  );
}
```

The `formik` prop only needs `{ values, errors?, touched?, setFieldValue(key, value) }` (exported
as the `FormController` type), so `Form` works just as well with any other form state — an error
is shown for a field only once its key is also truthy in `touched`.

`colSpan` is **how many fields share a row**, not "columns spanned out of 3" — `1` = alone
(100% width), `2` = one of two side by side (50% each), `3` = one of three side by side (~33%
each). Fields meant to sit on the same row need the *same* `colSpan` value (as `firstName`/
`lastName` do above); a `2` next to a `1` won't fill the row evenly, they'll just wrap.

### TimePicker

A time field with scrollable hour/minute columns — a consistent alternative to the browser's
native `<input type="time">`, whose look and 12/24-hour behavior vary by browser and OS locale.
Works as a 24-hour clock (default) or a 12-hour clock with an AM/PM column.

```javascript
import { useState } from "react";
import { TimePicker } from "noviq-ui";

function Example() {
  const [start, setStart] = useState("14:30");
  return (
    <>
      <TimePicker value={start} onChange={setStart} minuteStep={15} />              {/* 14:30 */}
      <TimePicker value={start} onChange={setStart} hourCycle={12} />               {/* 02:30 PM */}
    </>
  );
}
```

- `value` / `onChange` are **always 24-hour `"HH:mm"` strings** — `hourCycle={12}` only changes how
  the time is shown and picked, so the value you store and send to a backend doesn't depend on
  the display mode. Clearing calls `onChange("")`. An empty (or unparseable) value shows the
  placeholder — never a misleading `00:00`. A value with seconds (`"09:30:45"`) is accepted and
  displayed without them; the picker emits `HH:mm` only.
- `hourCycle`: `24` (default) lists hours 00–23. `12` lists 12, 01 … 11 and adds an AM/PM
  column. Picking an hour keeps the current AM/PM; picking AM/PM keeps the hour and minute.
  `12:xx AM` is `00:xx`, and `12:xx PM` is `12:xx`.
- `minuteStep` sets the minute column's granularity (default `5`). A value that isn't on the grid
  (`"09:32"` with a step of 5) is still displayed as-is.
- Opens on click, or `ArrowDown`/`ArrowUp`/`Enter`/`Space` from the keyboard — not on bare focus, so
  tabbing through a form doesn't pop pickers open. Inside: `ArrowUp`/`ArrowDown` move within a
  column, `ArrowLeft`/`ArrowRight` switch column, and `Enter` commits the highlighted option and
  moves on to the next column — hour, then minute, then (12-hour only) AM/PM, closing after the
  last. `Escape`/`Tab` close without changing the value.
- Props: `value`, `onChange`, `hourCycle`, `minuteStep`, `placeholder`, `disabled`, `error`,
  `clearable` (default `true`), `id`, `name`, `className`, `aria-label`.
- Selecting an hour on an empty field starts the minute at `00` (a minute first starts the hour at
  `00`, i.e. 12 AM; AM/PM first on an empty field gives `12:00`, noon, for PM).
- It is a standalone component. `<Input type="time" />` still renders the native input.

### Table

`Table` needs to know your backend's response shape once, via `NoviqUIConfigProvider` wrapped
around your app root (or wrapped more locally, if different screens hit different backends):

```javascript
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
```

`NoviqUIConfigProvider` is mandatory for any `Table` using `apiFunction` — rendering one without
either a `Provider` ancestor or a per-instance `responseFormat` prop throws immediately with an
actionable error message. For a response shape a dot-path can't express, use a `getRows`/
`getTotal` function pair instead of `rowsPath`/`totalPath` — they're only ever called with a
response that has actually arrived (never `undefined` while loading), so they don't need to
null-guard. A specific `<Table>` can override the app-wide format with its own `responseFormat`
prop — e.g. one screen calling a third-party API with a different shape than the rest of the app.

Pass `preFetchedData` instead of `apiFunction` for a fully client-controlled table (no fetching,
no `@tanstack/react-query`, and no `NoviqUIConfigProvider` requirement — you own the array).

#### Column management

Pass a stable `id` to enable the "Columns" chooser (hide/show, drag-to-reorder, pin left/right)
and persist those settings to `localStorage`:

```javascript
<Table id="employees-table" columns={columns} apiFunction={fetchEmployees} />
```

Without `id`, column customization still works but is in-memory only (resets on remount).
`localStorage` key: `noviq-ui-table-columns:${id}` — plain string, so a multi-tenant or
multi-user app that wants isolated settings per tenant/user should build that into `id` itself,
e.g. `id={`employees-${tenantId}`}`. Set `isColumnSettingHidden` to hide the chooser entirely.
Column-level `visible`/`sticky` in a column definition set the *default* before any user
customization (or persisted settings) apply.

#### Row selection, row actions, bulk actions

Pass `getRowId` to enable a checkbox column (auto-injected, sticky-left) and pass `rowActions` to
enable an actions column (auto-injected, sticky-right) — you never declare these in `columns`
yourself:

```javascript
<Table
  columns={columns}
  apiFunction={fetchEmployees}
  getRowId={(row) => row.id}
  onRowSelectionChange={(selectedIds) => console.log(selectedIds)}
  rowActions={(row) => [
    { label: "View", type: "button", onClick: ({ row }) => openDetails(row) },
    {
      label: "Reject",
      variant: "reject",
      onConfirm: ({ row, reason }) => rejectEmployee(row.id, reason),
    },
  ]}
  bulkActions={[
    {
      id: "delete",
      label: "Delete selected",
      variant: "destructive",
      onClick: (selectedIds) => deleteEmployees(selectedIds),
    },
  ]}
/>
```

- `getRowId` alone (no `rowActions`) is enough to turn on row selection and the bulk-actions bar
  — an actions column only appears when `rowActions` is also supplied.
- By default, `rowActions` group into a "..." dropdown per row (except `type: "button"` /
  `type: "checkbox"` actions, which always render inline). Set `isRowActionsWithoutDropdown` to
  render every action inline instead — this is required for a `variant: "reject"` action's
  confirm-with-reason popover to be reachable, since the reject-popover special-casing only
  applies to inline actions (in dropdown mode a `reject`-variant action is just a plain menu item
  that calls `onConfirm` immediately, with no reason prompt).
- `onConfirm`/`onClick` receive `{ action, row, rowIndex, sn, reason? }` — `reason` is only set
  for a `reject`-variant action, populated from what the user typed in the popover.

#### Filters

Pass `filterConfigs` to enable a "Filters" drawer (button badge shows the active filter count)
and an active-filter chip row. Each filter's `apiPayload` merges into the params object passed to
`apiFunction`, alongside `search`/`page_no`/`rows_per_page`:

```javascript
import { FILTER_TYPE } from "noviq-ui";

<Table
  columns={columns}
  apiFunction={fetchEmployees}
  filterConfigs={[
    {
      id: "department",
      label: "Department",
      type: FILTER_TYPE.SELECT,
      options: [
        { value: "eng", label: "Engineering" },
        { value: "sales", label: "Sales" },
      ],
    },
    { id: "joinDate", label: "Join date", type: FILTER_TYPE.DATE_RANGE },
  ]}
/>
```

- Types: `search` (text), `date` (single native date input), `select` (checkboxes, true
  multi-select — `apiPayload` is a comma-joined string, e.g. `{department: "eng,sales"}`),
  `dateRange` (two native date inputs, "From"/"To" — apiPayload keys default to
  `${id}From`/`${id}To`, override with `startDateKey`/`endDateKey`), `month` (native month input —
  defaults to `{[id]: "YYYY-MM"}`, or split via `monthKey`/`yearKey`).
- Filters are applied all-at-once via an "Apply" button in the drawer, not incrementally as each
  field changes.
- `mandatory: true` on a filter config makes it non-removable (no "X" on its chip, survives
  "Clear all").
- Filters are **session-only** — they reset on remount/reload, unlike column settings which persist
  via the opt-in `id` prop. This is deliberate: filters carry more "why is this still filtered?"
  surprise-risk than column layout preferences.
- `FilterDrawer` and `FilterChips` are also exported standalone if you're building a custom table
  shell, along with the `buildActiveFilter(config, rawValue)` helper they're both built on.

#### Export

An "Export" button is shown by default (set `isExportHidden` to hide it). It fetches **all rows
matching the current search/filters** — not just the currently-loaded page — in one request, then
downloads an Excel (`.xlsx`, styled header row) or CSV file:

```javascript
<Table
  columns={columns}
  apiFunction={fetchEmployees}
  exportFileName="employees"
/>
```

- While an export runs, the Export button shows "Exporting…" and is disabled. The outcome is
  reported through `notify` on `NoviqUIConfigProvider` — `noviq-ui` has no toast system of its
  own, so route it into whatever your app already uses:
  ```javascript
  import toast from "react-hot-toast"; // or any snackbar/notification library
  import { NoviqUIConfigProvider } from "noviq-ui";

  <NoviqUIConfigProvider
    config={{
      table: { responseFormat: { rowsPath: "result", totalPath: "totalCount" } },
      notify: (message, kind) => (kind === "error" ? toast.error(message) : toast.success(message)),
    }}
  >
    <App />
  </NoviqUIConfigProvider>
  ```
  `notify(message, kind)` is called once per export with `kind` `"success"` (`"Export complete"`)
  or `"error"` (`"Export failed"`). With no `notify` configured nothing is announced; a failed
  export is still logged with `console.error`. `config.table` is optional when you only want
  `notify` (e.g. an app whose tables all use `preFetchedData`).
- Per-column control: set `export: false` on a column to exclude it, or `exportValue={(row) =>
  ...}` for a custom cell value. Only currently-visible columns (per the "Columns" chooser, if
  enabled) are exported — hidden columns are skipped, matching what's on screen.
- `preFetchedData` mode exports the currently-sorted in-memory array directly — no extra fetch.
- `responseSheetUrl` skips the whole export flow and just opens a pre-generated report link
  instead (and hides the CSV option) — useful if your backend already produces the file.
- `Export` and the `useTableExport` hook it's built on are also exported standalone.

## Currently available components

- `<Input />` — type-switching input field. Supported `type`s: `text`, `email`, `password`,
  `textArea`, `search`, `number`, `checkbox`, `radio`, `switch`, `select`, `multiSelect`, `date`,
  `time`, `month`, `color`, `file`, `multipleFile`, `excelUpload`. Supports `label`, `required`,
  `helper`, `error`.
- `<Button />` — variants (`default`, `outline`, `destructive`, `secondary`, `ghost`, `link`) and
  sizes (`sm`, `md`, `lg`, `icon`)
- `<ScrollArea />` — styled scroll viewport wrapper
- `<Drawer />` — portal-based slide-over panel (`right`/`left`/`top`/`bottom`, sizes `sm`/`md`/`lg`)
- `<Modal />` — portal-based centered modal with enter/exit animation (sizes `sm`/`md`/`lg`/`xl`/`auto`)
- `<Label />` — styled `<label>` wrapper
- `<Switch />` — toggle switch, keyboard accessible
- `<TimePicker />` — time field with scrollable hour/minute columns; 24-hour or 12-hour with an
  AM/PM column (see above)
- `<FormFooter />` — Cancel/Save button row for a form
- `<Form />` — config-driven form renderer (`inputList` + a Formik instance, or any object with
  the `FormController` shape)
- `<Badge />` — small status/label pill (variants: `default`, `secondary`, `destructive`, `outline`)
- `<DropdownMenu />` / `<DropdownMenuItem />` — portal-positioned dropdown menu
- `<Table />` — sortable, searchable, paginated data table with column management (show/hide/
  reorder/pin, optionally persisted to `localStorage`), optional row selection/row actions/bulk
  actions, optional filters, and Excel/CSV export (see above). `apiFunction` (server-driven) or
  `preFetchedData` (client-controlled) data sources; `type`-driven cell formatting (`date`,
  `dateRange`, `dateTime`, `time`, `duration`, `currency`, `status`, plus a custom `cell` render
  function).
- `<NoviqUIConfigProvider />` / `useNoviqUIConfig()` — declares your backend's response shape
  (and, optionally, the request param names) once for every `Table` below it; required for any
  `Table` using `apiFunction` (see "Breaking change in 3.0.0" above).
- `<ColumnSelector />` — the "Columns" chooser panel `Table` uses internally; also exported
  standalone if you're building a custom table shell.
- `<Checkbox />` — small styled checkbox with full keyboard/ARIA support, used internally by
  `Table`'s row-selection column; also exported standalone.
- `<RowActionsMenu />` — per-row action renderer (inline buttons/checkbox/reject-popover, or
  grouped into a dropdown); used internally by `Table`'s auto-injected actions column, also
  exported standalone for a custom table shell.
- `<RejectAction />` — confirm-with-reason popover button (validates the reason: required, min 4
  chars, no leading space, no repeating characters, not digits-only); used by `RowActionsMenu` for
  `variant: "reject"` actions, also exported standalone.
- `<BulkActionsBar />` — "N selected" bar with bulk-action buttons and a "Clear" control; used
  internally by `Table` when `getRowId` is set, also exported standalone.
- `<FilterDrawer />` — self-contained "Filters" trigger button + drawer (5 filter types, see
  above); used internally by `Table` when `filterConfigs` is set, also exported standalone.
- `<FilterChips />` — active-filter chip row with per-chip remove and "Clear all"; used internally
  by `Table`, also exported standalone.
- `<Export />` — "Export" dropdown (Excel/CSV, or a plain link when `responseSheetUrl` is set);
  used internally by `Table`, also exported standalone alongside the `useTableExport` hook.

More components will be added in future releases (a rich date picker and month picker).

## Theming

Components are styled with plain CSS driven by `:root` custom properties (see
`src/styles/tokens.css`), not a CSS framework. Override any of `--primary`, `--danger`,
`--heading`, `--border-color`, `--radius`, etc. in your own app's CSS to re-theme.
