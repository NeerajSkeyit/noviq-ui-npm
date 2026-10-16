# noviq-ui

A lightweight React UI component library built with React and bundled using Vite.
It provides reusable UI components that can be shared across multiple projects.

**Keywords:** react components, ui library, component library, design system, typescript,
form components, data table, react table, drawer, modal, dropdown, admin dashboard, date picker,
time picker, month picker, i18n, locale, translation, localization, currency formatting,
client-side search.

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

## What changed in 4.5.0

- **`config.text`: every label, placeholder and message the library shows can be replaced** — one
  key at a time, in `NoviqUIConfigProvider`. 96 keys, all defaulting to the English you see today,
  so nothing changes until an app sets one. See "Text and translation" below.
- **Two accessible names that were missing** (they read as unnamed buttons to a screen reader):
  the pager's four arrows ("First page" … "Last page") and the `Drawer`'s close button ("Close").
  Both are text keys.
- No default changed in this release. An unconfigured app renders exactly what 4.4.0 did, apart
  from the two new `aria-label`s.

## What changed in 4.4.0

New, and one default that changed:

- **Default change — `TimePicker` is a 12-hour clock when the app sets no `formats.time`.** It used
  to be 24-hour while every Table cell showed `hh:mm A`; now both follow the library default
  `hh:mm A`, so a picker and a cell show a time the same way. `value` / `onChange` are still
  24-hour `"HH:mm"`. To keep the old 24-hour picker: set `formats.time: "HH:mm"` (the Table
  follows too) or pass `hourCycle={24}` to that picker. An explicit `hourCycle` always wins, and
  `hourCycle={12}` with no configured format still lists `00 … 11`.
- **`Table` with `preFetchedData` now searches and pages client-side.** The search box used to do
  nothing and the pager said "Showing 1 to 10 of 25" over all 25 rows. Now the term filters the
  rows by the text the visible columns show, and one page renders when the pager is shown;
  `isPaginationHidden` still shows every row. Select-all picks the rows on the page; export writes
  every searched row. If you fed the table one already-paged slice and kept the pager visible, pass
  `isPaginationHidden` — otherwise it pages your slice again.
- **`formats.locale`, `formats.currency`, `formats.weekStart`** — see "Regional settings" below.
- **`column.cell(row, text, rawRow, rawValue)`** — a 4th argument: the accessor's untouched value
  (number, boolean, `null`, array), next to the trimmed text.
- **`<Input type="search" />`** renders `label`, `required`, `helper`, `error`, `disabled` and
  `maxLength`; it ignored all of them. A bare search field is unchanged.

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
| `INPUT_TYPE`, `FORM_FIELD_TYPE`, `COL_SPAN` | `Input` / `Form` field `type`s (incl. `DATE_PICKER`, `TIME_PICKER`, `MONTH_PICKER`) and `colSpan` |
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

**Escape closes only the topmost layer.** With a date/time/month picker, a select's menu or a
`DropdownMenu` open inside a `Modal` or `Drawer`, the first Escape closes that picker or menu and the second closes
the overlay. A `Drawer` opened from a `Modal` closes before the `Modal` does, and an open `Drawer`
without `closeOnOutside` ignores Escape but still shields the `Modal` beneath it. (A `Modal`
always closes on Escape; a `Drawer` only with `closeOnOutside`.)

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
Works as a 12-hour clock with an AM/PM column (the default, `hh:mm A`, as in Table cells) or a
24-hour clock — set `formats.time: "HH:mm"` once, or `hourCycle={24}` per picker.

```javascript
import { useState } from "react";
import { TimePicker } from "noviq-ui";

function Example() {
  const [start, setStart] = useState("14:30");
  return (
    <>
      <TimePicker value={start} onChange={setStart} />                              {/* 02:30 PM */}
      <TimePicker value={start} onChange={setStart} hourCycle={24} minuteStep={15} /> {/* 14:30 */}
    </>
  );
}
```

- `value` / `onChange` are **always 24-hour `"HH:mm"` strings** — `hourCycle={12}` only changes how
  the time is shown and picked, so the value you store and send to a backend doesn't depend on
  the display mode. Clearing calls `onChange("")`. An empty (or unparseable) value shows the
  placeholder — never a misleading `00:00`. A value with seconds (`"09:30:45"`) is accepted and
  displayed without them; the picker emits `HH:mm` only.
- `hourCycle`: left unset, the clock follows `formats.time` — `hh:mm A` by default, a 12-hour
  clock listing `12, 01 … 11` with an AM/PM column. `24` lists hours 00–23. `12` is the same
  AM/PM clock; with no configured `formats.time` it lists hours **00 … 11** — the zero-based
  12-hour clock (Intl's `h11`), where `00 AM` is midnight and `00 PM` is noon (stored as `00:xx`
  and `12:xx`) — and with an `hh` pattern configured it lists `12, 01 … 11`. Picking an hour keeps
  the current AM/PM; picking AM/PM keeps the hour and minute.
- The minute column lists **every minute, 00–59**, in both clocks. `minuteStep` makes it coarser
  (`minuteStep={15}` → 00, 15, 30, 45). A value that isn't on the grid (`"09:32"` with a step of 5)
  is still displayed as-is.
- Opens on click, or `ArrowDown`/`ArrowUp`/`Enter`/`Space` from the keyboard — not on bare focus, so
  tabbing through a form doesn't pop pickers open. Inside: `ArrowUp`/`ArrowDown` move within a
  column, `ArrowLeft`/`ArrowRight` switch column, and `Enter` commits the highlighted option and
  moves on to the next column — hour, then minute, then (12-hour only) AM/PM, closing after the
  last. `Escape`/`Tab` close without changing the value.
- Props: `value`, `onChange`, `hourCycle`, `minuteStep`, `placeholder`, `disabled`, `error`,
  `clearable` (default `true`), `id`, `name`, `className`, `aria-label`.
- Selecting an hour on an empty field starts the minute at `00` (a minute first starts the hour at
  `00`; AM/PM first on an empty field gives `00:00` for AM and `12:00` — noon, shown `00:00 PM` —
  for PM).
- Also available as a form field: `<Input type="timePicker" hourCycle={12} minuteStep={15} />` (and
  in `Form`'s `inputList`). `<Input type="time" />` is unchanged and still the native input.

### DatePicker

A calendar dropdown for a single date — month/year selects, a Today button, min/max limits and full
keyboard support, with no extra dependency.

```javascript
import { useState } from "react";
import { DatePicker } from "noviq-ui";

function Example() {
  const [joined, setJoined] = useState("2024-03-05");
  return <DatePicker value={joined} onChange={setJoined} minDate="2020-01-01" maxDate="2030-12-31" />;
}
```

- `value` / `onChange` / `minDate` / `maxDate` are `"YYYY-MM-DD"` strings (a trailing time such as
  `"2024-03-05 09:30"` is accepted and ignored). Clearing calls `onChange("")`. The field *displays*
  `DD/MM/YYYY`. A value that isn't a real calendar date (`"2023-02-30"`) shows the placeholder.
- Dates are handled as plain year/month/day — never through `new Date("YYYY-MM-DD")`, which reads
  as UTC and shifts the day in some time zones.
- `minDate` / `maxDate` are inclusive. Days outside them are disabled and can't be picked, month
  arrows stop at the bounds, and the month/year selects only offer what's allowed. With no bounds
  the year select spans 1900 to 100 years from now.
- Days from the neighbouring months are shown (always six weeks, so the height never jumps) and can
  be picked.
- Keyboard: opens on click or `ArrowDown`/`ArrowUp`/`Enter`/`Space` (not on bare focus). Inside:
  arrows move by day/week, `PageUp`/`PageDown` by month (`Shift` for year, clamping 31 Jan → 29
  Feb), `Home`/`End` to the week's start/end, `Enter`/`Space` chooses, `Escape`/`Tab` close.
- Props: `value`, `onChange`, `minDate`, `maxDate`, `placeholder`, `disabled`, `error`, `clearable`
  (default `true`), `id`, `name`, `className`, `aria-label`.
- Form field: `<Input type="datePicker" minDate=... maxDate=... />`. `<Input type="date" />` is
  unchanged and still the native input.

### MonthPicker

A month-and-year grid, for fields like a billing period.

```javascript
import { MonthPicker } from "noviq-ui";

<MonthPicker value="2024-03" onChange={setPeriod} minMonth="2023-01" maxMonth="2024-12" />;
```

- `value` / `onChange` are `"YYYY-MM"`; `minMonth` / `maxMonth` take `"YYYY-MM"` (or a full
  `"YYYY-MM-DD"`, whose day is ignored). The field displays `MM/YYYY`.
- Year arrows step the shown year; months outside the bounds are disabled. Keyboard: arrows move by
  month (`Up`/`Down` by row of three), `PageUp`/`PageDown` by year, `Home`/`End` to January/December.
- Props: `value`, `onChange`, `minMonth`, `maxMonth`, `placeholder`, `disabled`, `error`,
  `clearable`, `id`, `name`, `className`, `aria-label`.
- Form field: `<Input type="monthPicker" minDate=... maxDate=... />` (the same `minDate`/`maxDate`
  props as the other date fields). `<Input type="month" />` is unchanged.

### FullPageSection

A full-page layout for a single-step form that has too many fields for a `Drawer` or `Modal`: a
back arrow with the title (and optional subtitle), the form inside a card, and a sticky footer.

```javascript
import { FullPageSection, Form } from "noviq-ui";

function AddLocationPage() {
  return (
    <FullPageSection
      title="Add location"
      subtitle="Where your people work"
      onBack={() => navigate("/locations")}
      onSubmit={formik.submitForm}
      loading={formik.isSubmitting}
    >
      <Form inputList={fields} formik={formik} />
    </FullPageSection>
  );
}
```

- **No router dependency.** `onBack` does the navigating; without one the back arrow calls
  `window.history.back()`. Cancel calls `onCancel`, falling back to `onBack`.
- The default footer is Cancel + Submit (`cancelLabel`, `submitLabel`). `loading` disables both and
  shows `loadingLabel` ("Saving...") on the submit button. Pass `footer` to replace it entirely.
- It's a single-step layout, not a multi-step wizard.

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
While your own request is still in flight, pass `isPrefetchedDataLoading` — the table shows its
loading state (not "No data found") even though the array is still empty.

With `preFetchedData` the table does the searching and paging itself: the search box filters the
rows by the text the visible columns show (a date as it is displayed, a status as its label; the
`-` placeholder for an empty cell never matches), and the pager renders one page of the searched,
sorted rows. Pass `isPaginationHidden` to show every row — do that if you pass one already-paged
slice. With an `apiFunction` the term is sent to your backend instead and the rows that come back
are shown as they are.

A custom `cell` render function is `cell(row, cellValue, rawRow, rawValue)`: `cellValue` is the
accessor's value as trimmed text (`"-"` when empty), `rawValue` the same value untouched — a number,
boolean, `null` or array. It is `undefined` for a column with no `accessorKey`.

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

## Date and time formats

Declare how dates and times read **once**, on `NoviqUIConfigProvider`, and every place the UI shows
one follows it:

```javascript
<NoviqUIConfigProvider
  config={{
    formats: {
      date: "DD MMM YYYY",          // 05 Mar 2024        (default "DD/MM/YYYY")
      time: "HH:mm",                // 14:30              (default "hh:mm A")
      dateTime: "DD MMM YYYY, HH:mm", // 05 Mar 2024, 14:30 (default: date + " " + time)
    },
  }}
>
```

All three are optional. `dateTime` follows a customised `date` and `time` unless you set it.

**Where it applies:** `Table` date / date-range / date-time / date-time-range / time / time-range
cells; the Excel and CSV export (so a file matches the screen); filter chips; and `DatePicker`,
`MonthPicker` and `TimePicker`. In your own components use the same patterns with the hook:

```javascript
const { formatDate, formatTime, formatDateTime } = useDateTimeFormatters();
formatDate("2024-03-05");                       // "05 Mar 2024"
formatDateTime("2024-03-05T14:30:00");          // "05 Mar 2024, 14:30"
formatDateTime(isoFromApi, { isUtc: true });    // treat a zone-less value as UTC
```

**Display only.** Values never change shape: pickers still emit `"YYYY-MM-DD"`, `"HH:mm"` and
`"YYYY-MM"`, and filter payloads sent to your backend stay ISO. A value that can't be read as a
date or time is shown as it was, not as `NaN/NaN/NaN`.

### Tokens

| Token | Output | Token | Output |
| --- | --- | --- | --- |
| `YYYY` / `YY` | `2024` / `24` | `HH` / `H` | `00`–`23` / `0`–`23` |
| `MMMM` / `MMM` | `March` / `Mar` | `hh` / `h` | `01`–`12` / `1`–`12` (12 = midnight/noon) |
| `MM` / `M` | `03` / `3` | `KK` / `K` | `00`–`11` / `0`–`11` (zero-based) |
| `DD` / `D` | `05` / `5` | `mm` / `m` | `07` / `7` |
| `dddd` / `ddd` | `Tuesday` / `Tue` | `ss` / `s` | `09` / `9` |
| `A` / `a` | `PM` / `pm` | `[text]` | `text`, literally |

Anything else is printed as written. Escape words that contain a token letter — `"DD MMM [at]
HH:mm"` — exactly as you would in moment. `KK` is the one token moment doesn't have; it's the
zero-based 12-hour clock where midnight and noon read `00`.

### How the pickers use it
- **`DatePicker`** shows `formats.date`; the calendar days are labelled the same way.
  `displayFormat="…"` overrides it for one picker.
- **`MonthPicker`** shows `formats.date` with the day removed (`DD/MM/YYYY` → `MM/YYYY`,
  `YYYY-MM-DD` → `YYYY-MM`, `dddd, DD MMMM YYYY` → `MMMM YYYY`). `displayFormat` overrides it.
- **`TimePicker`** takes both its **clock** and its text from `formats.time`: `HH:mm` is a
  24-hour picker, `hh:mm A` a 12-hour one listing `12, 01 … 11`, `KK:mm A` a 12-hour one listing
  `00 … 11`. An explicit `hourCycle` prop always wins, and a pattern that contradicts the clock is
  ignored. With no `formats.time` configured it is the library default `hh:mm A` — the same
  12-hour pattern the Table uses (and `hourCycle={12}` alone uses the zero-based `KK:mm A`).

### Regional settings

Three more options on `formats` set the language and conventions of what the UI shows:

```javascript
<NoviqUIConfigProvider
  config={{
    formats: {
      locale: "de-DE",      // BCP-47 tag            (default "en-IN")
      currency: "EUR",      // ISO 4217 code         (default "INR")
      weekStart: 1,         // 0 = Sunday … 6 = Saturday (default: the locale's, else Sunday)
      date: "dddd, D. MMMM YYYY",
    },
  }}
>
```

- **`locale`** sets the language of month and weekday names (`MMMM`, `MMM`, `dddd`, `ddd`, the
  calendar's month list and weekday headings, a month filter's chip), how `currency` cells group
  digits and place the symbol (`1.234.567,50 €`), and — unless `weekStart` is set — which day the
  calendar week starts on. English locales keep the built-in names, so a date reads the same on
  every browser. Digits and the AM/PM marker are not translated.
- **`currency`** is what a `currency` column uses when it sets no `currency` of its own.
- **`weekStart`** overrides the locale's first day of the week.

Unset, everything stays as it was: English names, lakh/crore grouping (`₹12,34,567.50`), INR,
Sunday first. A locale Intl can't read, a currency that isn't three letters, or a `weekStart` that
isn't a whole number 0–6 throws a clear error from the provider; a bad currency code inside row
data shows the code before the number instead of breaking the table. `useDateTimeFormatters()`
returns the resolved values as `formats.locale`, `formats.currency` and `formats.weekStart`.

### Nested providers replace, they don't merge
A `NoviqUIConfigProvider` inside another one *replaces* the outer config for its subtree. To change
only the formats for one screen, repeat `table` (and `notify`) if anything beneath it needs them —
a `<Table apiFunction>` there without a `responseFormat` would throw.

### Not covered
The browser's own `<input type="date|time|month">` (`Input type="date"`, the date fields inside the
filter drawer) is rendered by the browser in the user's locale and can't be reformatted. Use
`datePicker` / `timePicker` / `monthPicker` where the format has to match.

## Text and translation

Everything the components say in English — the search placeholder, "No data found", the pager,
"3 rows selected", the picker buttons, validation messages, export results — comes from one
dictionary, and `config.text` replaces any of it:

```javascript
<NoviqUIConfigProvider
  config={{
    text: {
      tableSearchPlaceholder: "Buscar...",
      tableEmpty: "No se encontraron datos",
      paginationSummary: "Mostrando {start} a {end} de {total} resultados",
      paginationPage: "Página {page} de {pages}",
      bulkSelectedOne: "{count} fila seleccionada",
      bulkSelected: "{count} filas seleccionadas",
      dateToday: "Hoy",
    },
  }}
>
```

- **Any subset.** A key you leave out keeps its English default, so you can translate screen by
  screen, or only reword one message. `import { DEFAULT_TEXT } from "noviq-ui"` is the full list of
  keys with their defaults; `TextKey` is its key type, and typing your dictionary as
  `Record<TextKey, TextValue>` makes the compiler tell you when a release adds a key.
- **`{placeholders}`** mark where the component puts a value (`{count}`, `{start}`, `{page}`,
  `{label}`, `{date}`, `{min}`, `{browse}`…). Move them wherever your language needs them. A
  placeholder you misspell is left as written, so it shows on screen instead of vanishing.
- **A function instead of a string** gets those values and returns the text — for plurals a
  template can't express:
  `bulkSelected: ({ count }) => new Intl.PluralRules("ru").select(Number(count)) === "few" ? … : …`.
  A function that throws or returns a non-string is reported (in development) and the English
  default is used, so a bad translation can't stop a component from rendering.
- **`bulkSelectedOne` / `bulkSelected`** (and `inputFilesSelectedOne` / `inputFilesSelected`) are a
  singular/plural pair; the library picks one by count.
- **Props still win.** `placeholder`, `searchPlaceholder`, `emptyMessage`, `title`, `submitLabel`,
  `cancelLabel`, `loadingLabel`, `rejectText` and `noOptionsMessage` override the text for that one
  component, exactly as before.
- **Where the keys live**, by prefix: `table…`/`pagination…`/`bulk…`/`columns…`/`column…`/
  `filter…`/`export…`/`status…` (Table and its parts), `reject…` (the reject-with-reason popover and
  its validation), `time…`/`date…`/`month…` (the pickers), `form…`/`drawer…` (FormFooter,
  FullPageSection, Drawer), `input…` (placeholders, select, file and Excel upload).
- **Not in the dictionary:** copy that is *your data* — column headings, filter labels, row-action
  labels, status values (other than `true`/`false`, shown as Active/Inactive), the `Form`'s field
  labels — which you already write in your own language; developer-facing errors and warnings
  (they stay English); the AM/PM markers; and the "Unsupported input type" fallback.
- **Nested providers replace**, as with `formats`: a `NoviqUIConfigProvider` inside another one
  does not inherit its `text`. Repeat it, or spread the parent's config.

To find strings you haven't translated, render with every default wrapped and look for any that
come out bare:

```javascript
import { DEFAULT_TEXT } from "noviq-ui";
const pseudo = Object.fromEntries(Object.entries(DEFAULT_TEXT).map(([k, v]) => [k, `«${v}»`]));
// <NoviqUIConfigProvider config={{ text: pseudo }}> … anything shown without « » is still hard-coded
```

Month and weekday names, number and currency formats follow `formats.locale` (see "Regional
settings"); `text` is for the words around them.

## Currently available components

- `<Input />` — type-switching input field. Supported `type`s: `text`, `email`, `password`,
  `textArea`, `search`, `number`, `checkbox`, `radio`, `switch`, `select`, `multiSelect`, `date`,
  `time`, `month`, `datePicker`, `timePicker`, `monthPicker`, `color`, `file`, `multipleFile`,
  `excelUpload`. Supports `label`, `required`,
  `helper`, `error`.
- `<Button />` — variants (`default`, `outline`, `destructive`, `secondary`, `ghost`, `link`) and
  sizes (`sm`, `md`, `lg`, `icon`)
- `<ScrollArea />` — styled scroll viewport wrapper
- `<Drawer />` — portal-based slide-over panel (`right`/`left`/`top`/`bottom`, sizes `sm`/`md`/`lg`)
- `<Modal />` — portal-based centered modal with enter/exit animation (sizes `sm`/`md`/`lg`/`xl`/`auto`)
- `<Label />` — styled `<label>` wrapper
- `<Switch />` — toggle switch, keyboard accessible
- `<TimePicker />` — time field with scrollable hour/minute columns; 12-hour with an AM/PM column
  by default, or 24-hour (see above)
- `<DatePicker />` — calendar dropdown for a date, with min/max and keyboard support (see above)
- `<MonthPicker />` — month/year grid (see above)
- `<FormFooter />` — Cancel/Save button row for a form
- `<FullPageSection />` — full-page form layout: back arrow + title, card, sticky footer (see above)
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

More components will be added in future releases.

## Theming

Components are styled with plain CSS driven by `:root` custom properties (see
`src/styles/tokens.css`), not a CSS framework. Override any of `--primary`, `--danger`,
`--heading`, `--border-color`, `--radius`, etc. in your own app's CSS to re-theme.
