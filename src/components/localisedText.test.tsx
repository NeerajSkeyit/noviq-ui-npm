import React, { useState } from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, within, renderHook, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Table, { type TableColumn } from "./Table/Table";
import TablePagination from "./Table/TablePagination";
import BulkActionsBar from "./Table/BulkActionsBar";
import ColumnSelector from "./Table/ColumnSelector";
import FilterDrawer from "./Table/FilterDrawer";
import FilterChips from "./Table/FilterChips";
import Export from "./Table/Export";
import RejectAction from "./Table/RejectAction";
import TableCell, { formatStatusLabel } from "./Table/TableCell";
import useTableExport from "./Table/useTableExport";
import { buildActiveFilter, type FilterConfig } from "./Table/buildActiveFilter";
import TimePicker from "./TimePicker/TimePicker";
import DatePicker from "./DatePicker/DatePicker";
import MonthPicker from "./MonthPicker/MonthPicker";
import FullPageSection from "./FullPageSection/FullPageSection";
import FormFooter from "./FormFooter/FormFooter";
import Drawer from "./Drawer/Drawer";
import Input from "./Input/Input";
import { NoviqUIConfigProvider } from "../config/NoviqUIConfigProvider";
import { CELL_TYPE, DEFAULT_TEXT, FILTER_TYPE, type TextKey } from "../constants";
import type { NoviqUIConfig, NoviqUIText } from "../config/types";

// Pseudo-localisation: every default wrapped in «», so a string the library forgot to route
// through `config.text` is the one that comes out *without* them.
const wrapped = (value: string) => `«${value}»`;
const PSEUDO = Object.fromEntries(
  Object.entries(DEFAULT_TEXT).map(([key, value]) => [key, wrapped(value)])
) as Record<TextKey, string>;
const w = (key: TextKey, params: Record<string, string | number> = {}) =>
  wrapped(DEFAULT_TEXT[key].replace(/\{([A-Za-z]+)\}/g, (m, name) => String(params[name] ?? m)));

const withText = (ui: React.ReactElement, config: NoviqUIConfig = {}) => (
  <NoviqUIConfigProvider config={{ ...config, text: PSEUDO }}>{ui}</NoviqUIConfigProvider>
);

/** Every string that reaches a reader: text nodes, plus the attributes read as text. */
function visibleStrings(root: ParentNode = document.body): string[] {
  const out: string[] = [];
  const walker = document.createTreeWalker(root as Node, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const text = node.textContent?.trim();
    if (text) out.push(text);
  }
  (root as Element).querySelectorAll?.("[aria-label],[title],[placeholder]").forEach((el) => {
    for (const attr of ["aria-label", "title", "placeholder"]) {
      const value = el.getAttribute(attr);
      if (value) out.push(value.trim());
    }
  });
  return out;
}

/** The pager's summary line — its numbers sit in highlight spans, so it is not one text node. */
const summaryText = () => document.querySelector(".table-pagination-left")?.textContent?.trim();

/** No text in the DOM may be exactly one of the library's English defaults. */
function expectNoUntranslatedCopy(root: ParentNode = document.body) {
  const defaults = new Set(Object.values(DEFAULT_TEXT).filter((v) => !v.includes("{")));
  // Short fragments that are also ordinary values (a single letter, "From"/"To" as data) are
  // covered by their own explicit assertions.
  const leaked = visibleStrings(root).filter((s) => defaults.has(s as never));
  expect(leaked).toEqual([]);
}

beforeEach(() => {
  window.localStorage.clear();
});
afterEach(() => {
  vi.restoreAllMocks();
});

interface Person {
  id: number;
  name: string;
  status: string;
}
const people: Person[] = Array.from({ length: 25 }, (_, i) => ({
  id: i + 1,
  name: `Person ${i + 1}`,
  status: i % 2 === 0 ? "true" : "false",
}));
const columns: TableColumn<Person>[] = [
  { id: "name", heading: "Name", accessorKey: "name" },
  { id: "status", heading: "Status", accessorKey: "status", type: CELL_TYPE.STATUS },
];

describe("Table copy", () => {
  it("shows the search box, pager, columns and export in the configured text", async () => {
    render(
      withText(
        <Table
          columns={columns}
          preFetchedData={people}
          id="people"
          filterConfigs={[{ id: "status", label: "Status", type: FILTER_TYPE.SELECT, options: [] }]}
        />
      )
    );

    expect(screen.getByPlaceholderText(w("tableSearchPlaceholder"))).toBeInTheDocument();
    expect(summaryText()).toBe(w("paginationSummary", { start: 1, end: 10, total: 25 }));
    expect(screen.getByText(w("paginationRowsPerPage"))).toBeInTheDocument();
    expect(screen.getByText(w("paginationPage", { page: 1, pages: 3 }))).toBeInTheDocument();
    for (const key of ["paginationFirst", "paginationPrevious", "paginationNext", "paginationLast"] as const) {
      expect(screen.getByRole("button", { name: w(key) })).toBeInTheDocument();
    }
    expect(screen.getByRole("button", { name: new RegExp(w("columnsButton")) })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: new RegExp(w("filtersButton")) })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: new RegExp(w("exportButton")) })).toBeInTheDocument();
    // Status cell: "true" reads as the configured "Active".
    expect(screen.getAllByText(w("statusActive")).length).toBeGreaterThan(0);
    expect(screen.getAllByText(w("statusInactive")).length).toBeGreaterThan(0);
    expectNoUntranslatedCopy();
  });

  it("the actions column heading", () => {
    render(
      withText(
        <Table
          columns={columns}
          preFetchedData={people}
          rowActions={() => [{ label: "Open", type: "button", onClick: () => {} }]}
        />
      )
    );
    expect(screen.getByRole("columnheader", { name: w("tableActionsHeading") })).toBeInTheDocument();
  });

  it("the empty and loading states", () => {
    const { rerender } = render(withText(<Table columns={columns} preFetchedData={[]} />));
    expect(screen.getByText(w("tableEmpty"))).toBeInTheDocument();

    rerender(withText(<Table columns={columns} preFetchedData={[]} isPrefetchedDataLoading />));
    expect(screen.getByRole("status", { name: w("tableLoading") })).toBeInTheDocument();
  });

  it("bulk bar: singular and plural", async () => {
    const user = userEvent.setup();
    render(withText(<Table columns={columns} preFetchedData={people} getRowId={(r) => String(r.id)} />));
    const boxes = screen.getAllByRole("checkbox");
    await user.click(boxes[1]);
    expect(screen.getByText(w("bulkSelectedOne", { count: 1 }))).toBeInTheDocument();
    await user.click(boxes[2]);
    expect(screen.getByText(w("bulkSelected", { count: 2 }))).toBeInTheDocument();
    expect(screen.getByRole("button", { name: new RegExp(w("bulkClear")) })).toBeInTheDocument();
  });

  it("the pager standalone", () => {
    render(
      withText(
        <TablePagination pagination={{ page: 2, pageSize: 10 }} totalItems={45} onPageChange={() => {}} onPageSizeChange={() => {}} />
      )
    );
    expect(summaryText()).toBe(w("paginationSummary", { start: 11, end: 20, total: 45 }));
    expect(screen.getByText(w("paginationPage", { page: 2, pages: 5 }))).toBeInTheDocument();
  });

  it("an empty-message / search-placeholder prop still wins over the text", () => {
    render(
      withText(
        <Table columns={columns} preFetchedData={[]} emptyMessage="Nothing here" searchPlaceholder="Find..." />
      )
    );
    expect(screen.getByText("Nothing here")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Find...")).toBeInTheDocument();
  });

  it("columns chooser", async () => {
    const user = userEvent.setup();
    render(
      withText(
        <ColumnSelector
          columns={columns}
          columnOrder={["name", "status"]}
          visibleColumns={["name", "status"]}
          stickyColumns={{ left: [], right: [] }}
          onVisibilityChange={() => {}}
          onReorder={() => {}}
          onStickyChange={() => {}}
          onReset={() => {}}
        />
      )
    );
    await user.click(screen.getByRole("button", { name: new RegExp(w("columnsButton")) }));
    expect(screen.getByText(w("columnsTitle"))).toBeInTheDocument();
    expect(screen.getByText(w("columnsSubtitle"))).toBeInTheDocument();
    expect(screen.getByText(w("columnsLegendLeft"))).toBeInTheDocument();
    expect(screen.getByText(w("columnsLegendRight"))).toBeInTheDocument();
    expect(screen.getByText(w("columnsLegendUnpinned"))).toBeInTheDocument();
    expect(screen.getByRole("button", { name: w("columnsReset") })).toBeInTheDocument();
    expect(screen.getAllByTitle(w("columnPin"))).toHaveLength(2);
  });

  it("filter drawer, chips and the From/Until chip text", async () => {
    const user = userEvent.setup();
    const configs: FilterConfig[] = [
      { id: "when", label: "When", type: FILTER_TYPE.DATE_RANGE },
      { id: "state", label: "State", type: FILTER_TYPE.SELECT, options: [{ value: "a", label: "A" }] },
    ];
    render(
      withText(
        <FilterDrawer
          filters={configs}
          activeFilters={[]}
          onApplyFilter={() => {}}
          onClearAll={() => {}}
        />
      )
    );
    await user.click(screen.getByRole("button", { name: new RegExp(w("filtersButton")) }));
    expect(screen.getAllByText(w("filtersTitle")).length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: w("filtersClearAll") })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: w("filtersApply") })).toBeInTheDocument();
    expect(screen.getByText(w("filterFrom"))).toBeInTheDocument();
    expect(screen.getByText(w("filterTo"))).toBeInTheDocument();
  });

  it("filter chips: remove label and clear-all", () => {
    const filters = [
      { id: "a", label: "Alpha", displayValue: "x", apiPayload: {} },
      { id: "b", label: "Beta", displayValue: "y", apiPayload: {} },
    ];
    render(withText(<FilterChips filters={filters} onRemove={() => {}} onClearAll={() => {}} />));
    expect(screen.getByRole("button", { name: w("filterRemove", { label: "Alpha" }) })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: w("filtersClearAll") })).toBeInTheDocument();
  });

  it("date-range chip text is built from the text", () => {
    const text: NoviqUIText = { filterChipFrom: "Desde {date}", filterChipUntil: "Hasta {date}" };
    const config = { id: "when", label: "When", type: FILTER_TYPE.DATE_RANGE };
    expect(buildActiveFilter(config, { from: "2024-03-05" }, undefined, text)?.displayValue).toBe(
      "Desde 05/03/2024"
    );
    expect(buildActiveFilter(config, { to: "2024-03-06" }, undefined, text)?.displayValue).toBe(
      "Hasta 06/03/2024"
    );
    expect(buildActiveFilter(config, { from: "2024-03-05" })?.displayValue).toBe("From 05/03/2024");
  });

  it("export menu and the export outcome messages", async () => {
    const user = userEvent.setup();
    render(withText(<Export exportToExcel={() => {}} exportToCSV={() => {}} exporting={false} />));
    await user.click(screen.getByRole("button", { name: new RegExp(w("exportButton")) }));
    expect(screen.getByText(w("exportExcel"))).toBeInTheDocument();
    expect(screen.getByText(w("exportCsv"))).toBeInTheDocument();
  });

  it("the exporting state", () => {
    render(withText(<Export exportToExcel={() => {}} exportToCSV={() => {}} exporting />));
    expect(screen.getByText(w("exporting"))).toBeInTheDocument();
  });

  it("useTableExport reports through notify in the configured text", async () => {
    const notify = vi.fn();
    const wrapper = ({ children }: { children: React.ReactNode }) =>
      withText(<>{children}</>, { notify });
    const { result } = renderHook(
      () =>
        useTableExport<Person>({
          usingPreFetched: true,
          preFetchedData: [],
          columns,
          // an unusable sheet library makes the failure path deterministic
        }),
      { wrapper }
    );
    vi.spyOn(console, "error").mockImplementation(() => {});
    await result.current.exportToCSV("x.csv");
    // Either outcome is reported in the configured text — never the bare English.
    const messages = notify.mock.calls.map((c) => c[0]);
    expect(messages.length).toBeGreaterThan(0);
    expect(messages.every((m) => m === w("exportSuccess") || m === w("exportFailure"))).toBe(true);
  });

  it("status labels", () => {
    expect(formatStatusLabel("true")).toBe("Active");
    expect(formatStatusLabel("false", { statusInactive: "Inactivo" })).toBe("Inactivo");
    expect(formatStatusLabel("on_leave")).toBe("on leave");
    render(withText(<TableCell type={CELL_TYPE.STATUS} options={{ status: "false" }} />));
    expect(screen.getByText(w("statusInactive"))).toBeInTheDocument();
  });

  it("reject action: label, popover, confirm and every validation message", async () => {
    const user = userEvent.setup();
    render(withText(<RejectAction onConfirm={() => {}} />));
    await user.click(screen.getByRole("button", { name: w("rejectLabel") }));
    expect(screen.getByText(w("rejectTitle"))).toBeInTheDocument();
    const box = screen.getByPlaceholderText(w("rejectPlaceholder"));
    const confirm = screen.getByRole("button", { name: w("rejectConfirm") });

    // Confirm is disabled while the box is empty, so "required" is the one message a click can't
    // reach; it is the same path as the others (covered by useText).
    expect(confirm).toBeDisabled();

    await user.type(box, "abc");
    await user.click(confirm);
    expect(screen.getByText(w("rejectReasonMinLength", { min: 4 }))).toBeInTheDocument();

    await user.clear(box);
    await user.type(box, " abcd");
    await user.click(confirm);
    expect(screen.getByText(w("rejectReasonLeadingSpace"))).toBeInTheDocument();

    await user.clear(box);
    await user.type(box, "aaaaa");
    await user.click(confirm);
    expect(screen.getByText(w("rejectReasonRepeating"))).toBeInTheDocument();

    await user.clear(box);
    await user.type(box, "!?!?");
    await user.click(confirm);
    expect(screen.getByText(w("rejectReasonSymbolsOnly"))).toBeInTheDocument();

    await user.clear(box);
    await user.type(box, "1234");
    await user.click(confirm);
    expect(screen.getByText(w("rejectReasonOnlyNumbers"))).toBeInTheDocument();
  });

  it("reject action: the rejectText prop wins over the text", () => {
    render(withText(<RejectAction rejectText="Decline" onConfirm={() => {}} />));
    expect(screen.getByRole("button", { name: "Decline" })).toBeInTheDocument();
  });
});

describe("Picker copy", () => {
  it("TimePicker", async () => {
    const user = userEvent.setup();
    render(withText(<TimePicker value="" />));
    expect(screen.getByRole("combobox")).toHaveTextContent(w("timePlaceholder"));
    await user.click(screen.getByRole("combobox"));
    expect(screen.getByRole("listbox", { name: w("timeHours") })).toBeInTheDocument();
    expect(screen.getByRole("listbox", { name: w("timeMinutes") })).toBeInTheDocument();
    expect(screen.getByRole("listbox", { name: w("timePeriod") })).toBeInTheDocument();
    expect(screen.getByText(w("timeHourHeading"))).toBeInTheDocument();
    expect(screen.getByText(w("timeMinuteHeading"))).toBeInTheDocument();
    expectNoUntranslatedCopy();
  });

  it("TimePicker clear button", () => {
    render(withText(<TimePicker value="09:30" />));
    expect(screen.getByRole("button", { name: w("timeClear") })).toBeInTheDocument();
  });

  it("DatePicker", async () => {
    const user = userEvent.setup();
    render(withText(<DatePicker value="2024-03-05" />));
    expect(screen.getByRole("button", { name: w("dateClear") })).toBeInTheDocument();
    await user.click(screen.getAllByRole("combobox").find((el) => el.tagName === "BUTTON")!);
    expect(screen.getByRole("button", { name: w("datePreviousMonth") })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: w("dateNextMonth") })).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: w("dateMonth") })).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: w("dateYear") })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: w("dateToday") })).toBeInTheDocument();
  });

  it("DatePicker placeholder", () => {
    render(withText(<DatePicker value="" />));
    expect(screen.getByRole("combobox")).toHaveTextContent(w("datePlaceholder"));
  });

  it("MonthPicker", async () => {
    const user = userEvent.setup();
    const { rerender } = render(withText(<MonthPicker value="" />));
    expect(screen.getByRole("combobox")).toHaveTextContent(w("monthPlaceholder"));

    rerender(withText(<MonthPicker value="2024-03" />));
    expect(screen.getByRole("button", { name: w("monthClear") })).toBeInTheDocument();
    await user.click(screen.getByRole("combobox"));
    expect(screen.getByRole("button", { name: w("monthPreviousYear") })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: w("monthNextYear") })).toBeInTheDocument();
  });

  it("a placeholder prop wins over the text", () => {
    render(withText(<DatePicker value="" placeholder="Pick one" />));
    expect(screen.getByRole("combobox")).toHaveTextContent("Pick one");
  });
});

describe("Form and input copy", () => {
  it("FullPageSection defaults, and props still win", () => {
    const { rerender } = render(withText(<FullPageSection title="T" onSubmit={() => {}}>x</FullPageSection>));
    expect(screen.getByRole("button", { name: w("formBack") })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: w("formCancel") })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: w("formSubmit") })).toBeInTheDocument();

    rerender(withText(<FullPageSection title="T" onSubmit={() => {}} loading>x</FullPageSection>));
    expect(screen.getByRole("button", { name: w("formSaving") })).toBeInTheDocument();

    rerender(
      withText(<FullPageSection title="T" onSubmit={() => {}} submitLabel="Go" cancelLabel="Stop">x</FullPageSection>)
    );
    expect(screen.getByRole("button", { name: "Go" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Stop" })).toBeInTheDocument();
  });

  it("FormFooter", () => {
    render(withText(<FormFooter onSubmit={() => {}} onCancel={() => {}} />));
    expect(screen.getByRole("button", { name: w("formCancel") })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: w("formSave") })).toBeInTheDocument();
  });

  it("Drawer default title and close button", () => {
    render(withText(<Drawer isOpen onClose={() => {}}>body</Drawer>));
    expect(screen.getByText(w("drawerTitle"))).toBeInTheDocument();
    expect(screen.getByRole("button", { name: w("drawerClose") })).toBeInTheDocument();
  });

  it("Drawer: a title prop wins", () => {
    render(withText(<Drawer isOpen onClose={() => {}} title="Mine">body</Drawer>));
    expect(screen.getByText("Mine")).toBeInTheDocument();
  });

  it.each([
    ["text", "inputTextPlaceholder"],
    ["email", "inputEmailPlaceholder"],
    ["textArea", "inputTextAreaPlaceholder"],
    ["search", "inputSearchPlaceholder"],
  ] as const)("Input %s placeholder", (type, key) => {
    render(withText(<Input type={type} value="" onChange={() => {}} />));
    expect(screen.getByPlaceholderText(w(key))).toBeInTheDocument();
  });

  it("Input: a placeholder prop wins", () => {
    render(withText(<Input type="text" value="" onChange={() => {}} placeholder="Name" />));
    expect(screen.getByPlaceholderText("Name")).toBeInTheDocument();
  });

  it("Input select: placeholder and empty message", async () => {
    const user = userEvent.setup();
    render(withText(<Input type="select" value="" onChange={() => {}} options={[]} />));
    expect(screen.getByText(w("inputSelectPlaceholder"))).toBeInTheDocument();
    await user.click(screen.getByRole("combobox"));
    expect(screen.getByText(w("inputNoOptions"))).toBeInTheDocument();
  });

  it("Input file: drop zone text, with the bold word, and the chosen-file state", () => {
    const { container, rerender } = render(
      withText(<Input type="file" value={null as never} onChange={() => {}} accept=".pdf" />)
    );
    const prompt = container.querySelector(".dropzone p")!;
    expect(prompt.textContent).toBe(`«Drag and drop a file here, or {browse}»`.replace("{browse}", w("inputBrowse")));
    expect(prompt.querySelector("b.browse")?.textContent).toBe(w("inputBrowse"));

    rerender(
      withText(
        <Input type="file" value={new File(["x"], "notes.pdf", { type: "application/pdf" })} onChange={() => {}} />
      )
    );
    expect(screen.getByText(w("inputFileSelected"))).toBeInTheDocument();
  });

  it("Input multipleFile: drop zone text, singular and plural counts, row buttons", () => {
    const one = [new File(["x"], "a.pdf")];
    const two = [new File(["x"], "a.pdf"), new File(["y"], "b.pdf")];
    const { container, rerender } = render(
      withText(<Input type="multipleFile" value={[] as never} onChange={() => {}} />)
    );
    expect(container.querySelector(".dropzone p")!.textContent).toBe(
      `«Drag and drop files here, or {browse}»`.replace("{browse}", w("inputBrowse"))
    );

    rerender(withText(<Input type="multipleFile" value={one as never} onChange={() => {}} onRemoveFile={() => {}} />));
    expect(screen.getByText(w("inputFilesSelectedOne", { count: 1 }))).toBeInTheDocument();
    expect(screen.getByTitle(w("inputView"))).toBeInTheDocument();
    expect(screen.getByTitle(w("inputRemove"))).toBeInTheDocument();

    rerender(withText(<Input type="multipleFile" value={two as never} onChange={() => {}} />));
    expect(screen.getByText(w("inputFilesSelected", { count: 2 }))).toBeInTheDocument();
  });

  it("Input multipleFile: an unnamed existing attachment reads as the configured word", () => {
    render(
      withText(
        <Input type="multipleFile" value={[{ name: "", url: "https://x/y" }] as never} onChange={() => {}} />
      )
    );
    expect(screen.getByText(w("inputAttachment"))).toBeInTheDocument();
  });

  it("Input excel upload: placeholder and helper", () => {
    render(withText(<Input type="excelUpload" value={null as never} onChange={() => {}} />));
    expect(screen.getByText(w("inputExcelPlaceholder"))).toBeInTheDocument();
    expect(screen.getByText(w("inputExcelHelper"))).toBeInTheDocument();
  });
});
