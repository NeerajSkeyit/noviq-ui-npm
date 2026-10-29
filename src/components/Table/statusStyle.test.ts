import { describe, it, expect } from "vitest";
import { DEFAULT_STATUS_STYLES, STATUS_CLASS } from "../../constants";
import type { NoviqUIStatusConfig } from "../../config/types";
import { formatStatusLabel, mergeStatusConfigs, resolveStatus } from "./statusStyle";

const resolve = (status: string, ...layers: (NoviqUIStatusConfig | undefined)[]) =>
  resolveStatus(status, mergeStatusConfigs(...layers));

describe("the built-in statuses", () => {
  it.each(Object.entries(DEFAULT_STATUS_STYLES))("%s → %s", (status, className) => {
    expect(resolve(status).className).toBe(className);
  });

  it("an unknown status gets the grey fallback tone", () => {
    expect(resolve("archived").className).toBe(STATUS_CLASS.DEFAULT);
  });

  it("matches on the trimmed, lower-case text, as it always did", () => {
    expect(resolve("  APPROVED ").className).toBe(STATUS_CLASS.SUCCESS);
    expect(resolve("In Progress").className).toBe(STATUS_CLASS.INFO);
  });

  it("does not treat an underscore as a space: in_progress stays on the fallback", () => {
    // Kept deliberately (so an unconfigured app looks exactly as before): write the key as the data spells it.
    expect(resolve("in_progress").className).toBe(STATUS_CLASS.DEFAULT);
    expect(resolve("in_progress", { styles: { in_progress: STATUS_CLASS.INFO } }).className).toBe(STATUS_CLASS.INFO);
  });

  it("is safe for a status named like an Object property", () => {
    for (const status of ["constructor", "toString", "__proto__", "hasOwnProperty"]) {
      expect(resolve(status).className).toBe(STATUS_CLASS.DEFAULT);
      expect(resolve(status).label).toBe(status.replace(/_/g, " ")); // the usual label, nothing inherited
    }
    // and they can be styled like any other status
    expect(resolve("constructor", { styles: { constructor: "my-ctor" } }).className).toBe("my-ctor");
    // `__proto__` as an own key (what parsed JSON gives you; an object literal would set the prototype instead)
    const parsed = JSON.parse('{"styles":{"__proto__":"my-proto"}}') as NoviqUIStatusConfig;
    expect(resolve("__proto__", parsed).className).toBe("my-proto");
    expect(resolve("approved", parsed).className).toBe(STATUS_CLASS.SUCCESS);
  });
});

describe("labels", () => {
  it("shows the status with underscores as spaces", () => {
    expect(resolve("in_progress").label).toBe("in progress");
  });

  it("reads true / false as Active / Inactive, in the configured text", () => {
    expect(resolve("true").label).toBe("Active");
    expect(resolveStatus("true", mergeStatusConfigs(), { statusActive: "Activo" }).label).toBe("Activo");
    expect(resolveStatus("false", mergeStatusConfigs(), { statusInactive: "Inactivo" }).label).toBe("Inactivo");
  });

  it("formatStatusLabel is unchanged", () => {
    expect(formatStatusLabel("true")).toBe("Active");
    expect(formatStatusLabel("a_b_c")).toBe("a b c");
  });
});

describe("your own statuses", () => {
  it("a string is a class name", () => {
    expect(resolve("draft", { styles: { draft: "my-draft" } }).className).toBe("my-draft");
  });

  it("an object can set the class and the label", () => {
    const r = resolve("shipped", { styles: { shipped: { className: "my-ok", label: "On its way" } } });
    expect(r).toMatchObject({ className: "my-ok", label: "On its way" });
  });

  it("keys match case-insensitively, ignoring surrounding spaces", () => {
    const config = { styles: { "  Draft ": "my-draft" } };
    expect(resolve("DRAFT", config).className).toBe("my-draft");
    expect(resolve(" draft", config).className).toBe("my-draft");
  });

  it("can replace a built-in status's class", () => {
    expect(resolve("pending", { styles: { pending: "my-wait" } }).className).toBe("my-wait");
    expect(resolve("approved", { styles: { pending: "my-wait" } }).className).toBe(STATUS_CLASS.SUCCESS); // others untouched
  });

  it("a label alone keeps the status's built-in class", () => {
    expect(resolve("pending", { styles: { pending: { label: "Awaiting" } } })).toMatchObject({
      className: STATUS_CLASS.WARNING,
      label: "Awaiting",
    });
  });

  it("a label alone on an unknown status uses the fallback class", () => {
    expect(resolve("odd", { styles: { odd: { label: "Odd one" } }, fallback: "my-neutral" })).toMatchObject({
      className: "my-neutral",
      label: "Odd one",
    });
  });

  it("a fallback class is for statuses with no entry, not for the built-in ones", () => {
    const config = { fallback: "my-neutral" };
    expect(resolve("archived", config).className).toBe("my-neutral");
    expect(resolve("approved", config).className).toBe(STATUS_CLASS.SUCCESS);
  });

  it("class strings may carry several classes", () => {
    expect(resolve("x", { styles: { x: "a b" } }).className).toBe("a b");
  });
});

describe("layers: column over table over provider over the built-ins", () => {
  const provider: NoviqUIStatusConfig = {
    styles: { draft: { className: "p-draft", label: "Provider draft" }, shipped: "p-ok" },
    fallback: "p-neutral",
  };
  const table: NoviqUIStatusConfig = { styles: { draft: "t-draft" }, fallback: "t-neutral" };
  const column: NoviqUIStatusConfig = { styles: { shipped: "c-ok" } };

  it("the most specific level wins", () => {
    expect(resolve("shipped", provider, table, column).className).toBe("c-ok");
    expect(resolve("draft", provider, table, column).className).toBe("t-draft");
    expect(resolve("pending", provider, table, column).className).toBe(STATUS_CLASS.WARNING);
  });

  it("styles merge key by key, and within a status field by field", () => {
    // the table changed the class of `draft`; the provider's label for it stays
    expect(resolve("draft", provider, table)).toMatchObject({ className: "t-draft", label: "Provider draft" });
    expect(resolve("shipped", provider, table).className).toBe("p-ok");
  });

  it("fallback and render are replaced by the most specific level that sets them", () => {
    expect(resolve("zzz", provider, table).className).toBe("t-neutral");
    expect(resolve("zzz", provider, undefined, column).className).toBe("p-neutral");
    const renderA = () => "a";
    const renderB = () => "b";
    expect(mergeStatusConfigs({ render: renderA }, {}).render).toBe(renderA);
    expect(mergeStatusConfigs({ render: renderA }, { render: renderB }).render).toBe(renderB);
    expect(mergeStatusConfigs().render).toBeUndefined();
  });

  it("an undefined layer or an undefined field changes nothing", () => {
    expect(resolve("draft", provider, undefined, { styles: undefined, fallback: undefined }).className).toBe("p-draft");
  });

  it("does not modify what it is given", () => {
    const before = JSON.stringify([provider, table, column]);
    mergeStatusConfigs(provider, table, column);
    expect(JSON.stringify([provider, table, column])).toBe(before);
  });
});

describe("the legacy statusVariantMap, handed in as class-only styles", () => {
  it("still maps a status to a class", () => {
    expect(resolve("custom_status", { styles: { custom_status: "status-info" } }).className).toBe("status-info");
  });
});
