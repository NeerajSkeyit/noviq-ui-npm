import React from "react";
import { describe, it, expect, afterEach } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { shippedSourceFiles, stripComments } from "./test/sourceFiles";
import Table, { type TableColumn } from "./components/Table/Table";
import Modal from "./components/Modal/Modal";
import Drawer from "./components/Drawer/Drawer";
import Input from "./components/Input/Input";
import Form from "./components/Form/Form";
import Badge from "./components/Badge/Badge";
import Button from "./components/Button/Button";
import Switch from "./components/Switch/Switch";
import Label from "./components/Label/Label";
import Checkbox from "./components/Checkbox/Checkbox";
import ScrollArea from "./components/ScrollArea/ScrollArea";
import TimePicker from "./components/TimePicker/TimePicker";
import DatePicker from "./components/DatePicker/DatePicker";
import MonthPicker from "./components/MonthPicker/MonthPicker";
import FullPageSection from "./components/FullPageSection/FullPageSection";
import RejectAction from "./components/Table/RejectAction";
import { DropdownMenu, DropdownMenuItem } from "./components/Dropdown/Dropdown";
import { CELL_TYPE, FILTER_TYPE } from "./constants";

/**
 * noviq-ui ships one global stylesheet, so every name it puts in the page's CSS namespace — class,
 * custom property, keyframes — has to be one nobody else will pick. They all start with `nq-`
 * (`--nq-` for custom properties), and nothing in the stylesheet may select a bare element or
 * `:root` except to declare its own `--nq-` tokens.
 */
const SRC = resolve(process.cwd(), "src");
const PREFIX = "nq-";
const VAR_PREFIX = "--nq-";

function cssFiles(dir = SRC): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) return cssFiles(path);
    return path.endsWith(".css") ? [path] : [];
  });
}

const loc = (file: string) => relative(process.cwd(), file);
const readCss = (file: string) => readFileSync(file, "utf8").replace(/\/\*[\s\S]*?\*\//g, "");

/** `[selector, body]` for every style rule, including those inside `@media` / `@supports`. */
function styleRules(css: string): { selector: string; body: string }[] {
  const out: { selector: string; body: string }[] = [];
  const walk = (text: string) => {
    let i = 0;
    while (i < text.length) {
      const open = text.indexOf("{", i);
      if (open === -1) break;
      const head = text.slice(i, open).trim();
      let depth = 1;
      let j = open + 1;
      while (j < text.length && depth > 0) {
        if (text[j] === "{") depth++;
        else if (text[j] === "}") depth--;
        j++;
      }
      const body = text.slice(open + 1, j - 1);
      if (/^@keyframes/i.test(head)) {
        // a keyframes block: its "selectors" are 0%/from/to, not ours to check
      } else if (head.startsWith("@")) {
        walk(body);
      } else if (head) {
        out.push({ selector: head, body });
      }
      i = j;
    }
  };
  walk(css);
  return out;
}

describe("stylesheet names are all namespaced", () => {
  const files = cssFiles();

  it("finds the stylesheets", () => {
    expect(files.length).toBeGreaterThan(20);
  });

  it("every class selector starts with nq-", () => {
    const offenders: string[] = [];
    for (const file of files) {
      for (const { selector } of styleRules(readCss(file))) {
        for (const m of selector.matchAll(/\.(-?[_a-zA-Z][\w-]*)/g)) {
          if (!m[1].startsWith(PREFIX)) offenders.push(`${loc(file)}  .${m[1]}`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  it("every custom property, declared or used, starts with --nq-", () => {
    const offenders: string[] = [];
    for (const file of files) {
      const css = readCss(file);
      for (const m of css.matchAll(/(--[\w-]+)/g)) {
        if (!m[1].startsWith(VAR_PREFIX)) offenders.push(`${loc(file)}  ${m[1]}`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it("every @keyframes name, and every animation that uses one, starts with nq-", () => {
    const offenders: string[] = [];
    for (const file of files) {
      const css = readCss(file);
      for (const m of css.matchAll(/@keyframes\s+([\w-]+)/g)) {
        if (!m[1].startsWith(PREFIX)) offenders.push(`${loc(file)}  @keyframes ${m[1]}`);
      }
      for (const m of css.matchAll(/animation(?:-name)?\s*:\s*([^;}]+)/g)) {
        const name = m[1].trim().split(/\s+/).find((word) => /^[a-z][\w-]*$/i.test(word) && !/^(ease|linear|infinite|forwards|backwards|both|none|alternate|reverse|paused|running|normal|ease-in|ease-out|ease-in-out)$/.test(word));
        if (name && !name.startsWith(PREFIX)) offenders.push(`${loc(file)}  animation: ${name}`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it("no rule can match something that isn't ours: each selector names an nq- class", () => {
    const offenders: string[] = [];
    for (const file of files) {
      for (const { selector } of styleRules(readCss(file))) {
        for (const single of selector.split(",").map((s) => s.trim()).filter(Boolean)) {
          if (!/\.nq-/.test(single)) offenders.push(`${loc(file)}  ${single}`);
        }
      }
    }
    // The one global rule is the token block, which may only declare --nq- properties.
    expect(offenders.filter((o) => !o.endsWith(":root"))).toEqual([]);
    const root = styleRules(readCss(resolve(SRC, "styles/tokens.css"))).filter((r) => /^:root$/.test(r.selector));
    expect(root).toHaveLength(1);
    const declared = [...root[0].body.matchAll(/(?:^|;)\s*([\w-]+)\s*:/g)].map((m) => m[1]);
    expect(declared.every((name) => name.startsWith(VAR_PREFIX))).toBe(true);
  });

  it("no id selectors", () => {
    const offenders: string[] = [];
    for (const file of files) {
      const css = readCss(file).replace(/#[0-9a-fA-F]{3,8}\b/g, ""); // hex colours are not ids
      if (/#[_a-zA-Z][\w-]*\s*[{,:.\s[]/.test(css)) offenders.push(`${loc(file)}  #id selector`);
    }
    expect(offenders).toEqual([]);
  });
});

describe("legacy-tokens.css, the opt-in bridge for the old custom-property names", () => {
  const OLD_NAMES = ["font-size", "text-color", "primary", "primary-hover", "light", "danger", "danger-hover", "heading", "secondary-background", "muted", "muted-hover", "surface-hover", "border-color", "radius", "radius-sm", "shadow", "overlay-bg", "z-overlay"];
  const norm = (value: string) => value.replace(/\s+/g, " ").trim();
  const tokens = readFileSync(resolve(SRC, "styles/tokens.css"), "utf8");
  const legacy = readFileSync(resolve(process.cwd(), "legacy-tokens.css"), "utf8");
  const defaultOf = (name: string) => norm(new RegExp(`--nq-${name}:\\s*([^;]+);`).exec(tokens)?.[1] ?? "");

  it.each(OLD_NAMES)("--nq-%s follows the old --%s name and falls back to the same default", (name) => {
    const line = new RegExp(`--nq-${name}:\\s*var\\(--${name},\\s*([^;]+)\\);`).exec(legacy);
    expect(line, `legacy-tokens.css has no mapping for ${name}`).not.toBeNull();
    expect(norm(line![1]) + ")").toBe(defaultOf(name) + ")");
  });

  it("maps nothing that isn't a token", () => {
    const mapped = [...legacy.matchAll(/(--nq-[\w-]+):\s*var\(--/g)].map((m) => m[1]);
    for (const name of mapped) expect(tokens).toContain(`${name}:`);
  });

  it("is published: a file of the package and an export", () => {
    const pkg = JSON.parse(readFileSync(resolve(process.cwd(), "package.json"), "utf8"));
    expect(pkg.files).toContain("legacy-tokens.css");
    expect(pkg.exports["./legacy-tokens.css"]).toBe("./legacy-tokens.css");
  });
});

describe("class names written in components are all namespaced", () => {
  const sources = shippedSourceFiles();

  /**
   * Every class token written as a literal inside a `className=…` / `className:` expression:
   * quoted strings, the static parts of template literals, and — recursively — whatever sits in
   * a template's `${…}` (a ternary choosing between two class names, say).
   */
  function classNameStrings(text: string): string[] {
    const out: string[] = [];
    const push = (chunk: string) => out.push(...chunk.split(/\s+/).filter(Boolean));

    /** Reads a quoted string starting at `i`; returns the index after it. */
    function readString(from: number): number {
      const quote = text[from];
      let i = from + 1;
      let chunk = "";
      while (i < text.length && text[i] !== quote) {
        if (text[i] === "\\") i++;
        else if (quote === "`" && text[i] === "$" && text[i + 1] === "{") {
          push(chunk);
          chunk = "";
          i = readExpression(i + 2);
          continue;
        } else chunk += text[i];
        i++;
      }
      push(chunk);
      return i + 1;
    }

    /** Reads code up to its closing `}`; collects every string literal on the way. */
    function readExpression(from: number): number {
      let i = from;
      let depth = 1;
      while (i < text.length && depth > 0) {
        const c = text[i];
        if (c === '"' || c === "'" || c === "`") i = readString(i);
        else {
          if (c === "{") depth++;
          else if (c === "}") depth--;
          i++;
        }
      }
      return i;
    }

    for (const m of text.matchAll(/className\s*[=:]\s*/g)) {
      const i = m.index! + m[0].length;
      if (text[i] === "{") readExpression(i + 1);
      else if (text[i] === '"' || text[i] === "'" || text[i] === "`") readString(i);
      // className={someVariable}: nothing literal to check
    }
    return out;
  }

  it("every class token in a className is nq-…", () => {
    const offenders: string[] = [];
    for (const file of sources) {
      const text = stripComments(readFileSync(file, "utf8"));
      for (const token of classNameStrings(text)) {
        if (!token.startsWith(PREFIX)) offenders.push(`${loc(file)}  ${token}`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it("react-select's classNamePrefix is nq-…", () => {
    const offenders: string[] = [];
    for (const file of sources) {
      const text = stripComments(readFileSync(file, "utf8"));
      for (const m of text.matchAll(/classNamePrefix\s*=\s*"([^"]*)"/g)) {
        if (!m[1].startsWith(PREFIX)) offenders.push(`${loc(file)}  ${m[1]}`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it("no document-level style is injected under a generic name (no <style> created by the library)", () => {
    const offenders: string[] = [];
    for (const file of sources) {
      const text = stripComments(readFileSync(file, "utf8"));
      if (/createElement\(\s*["']style["']\s*\)|insertRule|adoptedStyleSheets/.test(text)) offenders.push(loc(file));
    }
    expect(offenders).toEqual([]);
  });
});

describe("what actually renders", () => {
  afterEach(() => {
    document.body.style.overflow = "";
  });

  /** Every class token on every element in the document (the container and every portal). */
  const rendered = () => {
    const tokens = new Set<string>();
    document.querySelectorAll("*").forEach((el) => el.classList.forEach((c) => tokens.add(c)));
    return [...tokens];
  };
  // emotion (react-select's styling engine) adds hashed `css-…` classes next to ours; those are
  // content hashes, not names anyone would write a rule for. Nothing else is allowed — in
  // particular no `lucide…` (icons), no `rs__…` (react-select).
  const notOurs = (tokens: string[]) => tokens.filter((t) => !t.startsWith(PREFIX) && !/^css-[\w]+(-[\w-]+)?$/.test(t));

  interface Row {
    id: number;
    name: string;
    amount: number;
    status: string;
  }
  const rows: Row[] = Array.from({ length: 15 }, (_, i) => ({ id: i + 1, name: `Row ${i + 1}`, amount: i * 10, status: i % 2 ? "true" : "false" }));
  const columns: TableColumn<Row>[] = [
    { id: "name", heading: "Name", accessorKey: "name", sortable: true, sticky: "left" },
    { id: "amount", heading: "Amount", accessorKey: "amount", type: CELL_TYPE.CURRENCY, align: "right" },
    { id: "status", heading: "Status", accessorKey: "status", type: CELL_TYPE.STATUS },
  ];

  it("a Table with everything switched on, its drawers and menus open", async () => {
    const user = userEvent.setup();
    render(
      <Table
        id="ns"
        columns={columns}
        preFetchedData={rows}
        getRowId={(r) => String(r.id)}
        rowActions={() => [{ label: "Edit", type: "button", onClick: () => {} }, { label: "Reject", variant: "reject", onConfirm: () => {} }]}
        isRowActionsWithoutDropdown
        bulkActions={[{ id: "x", label: "Do", onClick: () => {} }]}
        filterConfigs={[
          { id: "state", label: "State", type: FILTER_TYPE.SELECT, options: [{ value: "a", label: "A" }], defaultValue: ["a"] },
          { id: "when", label: "When", type: FILTER_TYPE.DATE_RANGE },
        ]}
      />
    );
    await user.click(screen.getAllByRole("checkbox")[1]); // bulk bar
    await user.click(screen.getByRole("button", { name: /Columns/ }));
    await user.click(document.querySelector(".nq-drawer-close") as HTMLElement);
    await user.click(screen.getByRole("button", { name: /^Filters/ }));
    await user.click(screen.getByRole("button", { name: /Export/ }));
    await user.click(screen.getAllByRole("button", { name: "Reject" })[0]);
    expect(notOurs(rendered())).toEqual([]);
  });

  it("the page-size select's menu (react-select) is namespaced too", async () => {
    const user = userEvent.setup();
    render(<Table columns={columns} preFetchedData={rows} />);
    const control = document.querySelector("[class*='-control']") as HTMLElement;
    await user.click(control);
    const tokens = rendered();
    expect(tokens.some((t) => t.startsWith("nq-rs__"))).toBe(true);
    expect(tokens.filter((t) => t.startsWith("rs__"))).toEqual([]);
    expect(notOurs(tokens)).toEqual([]);
  });

  it("empty, loading and sorted states", () => {
    render(<Table columns={columns} preFetchedData={[]} isPrefetchedDataLoading />);
    expect(notOurs(rendered())).toEqual([]);
  });

  it("pickers, open", async () => {
    const user = userEvent.setup();
    render(
      <>
        <TimePicker value="09:30" />
        <DatePicker value="2024-03-05" />
        <MonthPicker value="2024-03" />
      </>
    );
    for (const trigger of screen.getAllByRole("combobox").filter((el) => el.tagName === "BUTTON")) {
      await user.click(trigger);
      await user.keyboard("{Escape}");
      await user.click(trigger);
    }
    expect(notOurs(rendered())).toEqual([]);
  });

  it("overlays and menus", async () => {
    const user = userEvent.setup();
    function Menu() {
      const [open, setOpen] = React.useState(true);
      return (
        <DropdownMenu isOpen={open} setIsOpen={setOpen} trigger={<Button onClick={() => setOpen((o) => !o)}>menu</Button>}>
          <DropdownMenuItem onClick={() => {}} destructive>
            One
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => {}} disabled>
            Two
          </DropdownMenuItem>
        </DropdownMenu>
      );
    }
    render(
      <>
        <Modal isOpen onClose={() => {}} title="m" size="md">
          body
        </Modal>
        <Drawer isOpen onClose={() => {}} side="left" size="lg" footer={<span>f</span>}>
          body
        </Drawer>
        <Menu />
        <RejectAction onConfirm={() => {}} />
      </>
    );
    await user.click(screen.getByRole("button", { name: "Reject" }));
    expect(notOurs(rendered())).toEqual([]);
  });

  it("every Input type, a Form, FullPageSection and the small parts", () => {
    const types = ["text", "email", "password", "number", "textArea", "search", "select", "multiSelect", "checkbox", "radio", "switch", "date", "time", "month", "datePicker", "timePicker", "monthPicker", "color", "file", "multipleFile", "excelUpload"] as const;
    render(
      <>
        {types.map((type) => (
          <Input key={type} type={type} label={type} helper="h" error={type === "text" ? "e" : undefined} options={[{ label: "A", value: "a" }]} value={type === "multipleFile" ? ([] as never) : type === "multiSelect" ? ([] as never) : type === "checkbox" || type === "switch" ? (false as never) : ""} onChange={() => {}} />
        ))}
        <Form inputList={[{ type: "text", name: "n", label: "N" } as never]} formik={{ values: { n: "" }, errors: {}, touched: {}, setFieldValue: () => {} } as never} />
        <FullPageSection title="t" subtitle="s" onSubmit={() => {}}>
          x
        </FullPageSection>
        <Badge>b</Badge>
        <Badge variant="destructive">b</Badge>
        <Switch checked onChange={() => {}} />
        <Label htmlFor="x">l</Label>
        <Checkbox checked onChange={() => {}} />
        <ScrollArea>s</ScrollArea>
      </>
    );
    expect(notOurs(rendered())).toEqual([]);
  });
});
