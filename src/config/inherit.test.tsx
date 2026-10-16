import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { NoviqUIConfigProvider, useNoviqUIConfig } from "./NoviqUIConfigProvider";
import Table from "../components/Table/Table";
import type { NoviqUIConfig } from "./types";

/** Shows the config a component under the provider receives, with functions named. */
function Probe() {
  const config = useNoviqUIConfig();
  return (
    <pre data-testid="config">
      {JSON.stringify(config, (_k, v) => (typeof v === "function" ? "[fn]" : v))}
    </pre>
  );
}
const seen = () => JSON.parse(screen.getByTestId("config").textContent ?? "null");

const PATHS = { rowsPath: "result", totalPath: "totalCount" };
const notifyA = () => {};

describe("NoviqUIConfigProvider inherit", () => {
  const parent: NoviqUIConfig = {
    table: { responseFormat: PATHS, requestParams: { search: "q", page: "p" } },
    notify: notifyA,
    formats: { date: "YYYY-MM-DD", locale: "de-DE" },
    text: { tableEmpty: "Leer", bulkClear: "Löschen" },
  };

  it("without it, a nested provider replaces the parent's config (unchanged)", () => {
    render(
      <NoviqUIConfigProvider config={parent}>
        <NoviqUIConfigProvider config={{ formats: { time: "HH:mm" } }}>
          <Probe />
        </NoviqUIConfigProvider>
      </NoviqUIConfigProvider>
    );
    expect(seen()).toEqual({ formats: { time: "HH:mm" } });
  });

  it("with it, formats and text merge key by key, the child's keys winning", () => {
    render(
      <NoviqUIConfigProvider config={parent}>
        <NoviqUIConfigProvider inherit config={{ formats: { time: "HH:mm", date: "DD.MM.YYYY" }, text: { tableEmpty: "Nichts" } }}>
          <Probe />
        </NoviqUIConfigProvider>
      </NoviqUIConfigProvider>
    );
    expect(seen().formats).toEqual({ date: "DD.MM.YYYY", locale: "de-DE", time: "HH:mm" });
    expect(seen().text).toEqual({ tableEmpty: "Nichts", bulkClear: "Löschen" });
  });

  it("inherits what the child leaves out: table and notify", () => {
    render(
      <NoviqUIConfigProvider config={parent}>
        <NoviqUIConfigProvider inherit config={{ text: { tableEmpty: "x" } }}>
          <Probe />
        </NoviqUIConfigProvider>
      </NoviqUIConfigProvider>
    );
    expect(seen().table).toEqual(parent.table);
    expect(seen().notify).toBe("[fn]");
  });

  it("a child's notify replaces the parent's", () => {
    let which = "";
    function Reader() {
      which = String(useNoviqUIConfig()?.notify === notifyB);
      return null;
    }
    const notifyB = () => {};
    render(
      <NoviqUIConfigProvider config={parent}>
        <NoviqUIConfigProvider inherit config={{ notify: notifyB }}>
          <Reader />
        </NoviqUIConfigProvider>
      </NoviqUIConfigProvider>
    );
    expect(which).toBe("true");
  });

  it("merges the table's request params, but a child responseFormat replaces the whole format", () => {
    render(
      <NoviqUIConfigProvider config={parent}>
        <NoviqUIConfigProvider
          inherit
          config={{ table: { responseFormat: { getRows: () => [], getTotal: () => 0 }, requestParams: { pageSize: "n" } } }}
        >
          <Probe />
        </NoviqUIConfigProvider>
      </NoviqUIConfigProvider>
    );
    expect(seen().table.requestParams).toEqual({ search: "q", page: "p", pageSize: "n" });
    expect(seen().table.responseFormat).toEqual({ getRows: "[fn]", getTotal: "[fn]" }); // not mixed with rowsPath
  });

  it("a child may give only requestParams: the parent's responseFormat satisfies the requirement", () => {
    render(
      <NoviqUIConfigProvider config={parent}>
        <NoviqUIConfigProvider inherit config={{ table: { requestParams: { page: "page_no" } } as never }}>
          <Probe />
        </NoviqUIConfigProvider>
      </NoviqUIConfigProvider>
    );
    expect(seen().table).toEqual({ responseFormat: PATHS, requestParams: { search: "q", page: "page_no" } });
  });

  it("still requires a responseFormat from somewhere when a table is given", () => {
    expect(() =>
      render(
        <NoviqUIConfigProvider config={{ text: { tableEmpty: "x" } }}>
          <NoviqUIConfigProvider inherit config={{ table: { requestParams: { page: "p" } } as never }}>
            <Probe />
          </NoviqUIConfigProvider>
        </NoviqUIConfigProvider>
      )
    ).toThrow(/responseFormat/);
  });

  it("an `undefined` in the child does not wipe the parent's value", () => {
    render(
      <NoviqUIConfigProvider config={parent}>
        <NoviqUIConfigProvider inherit config={{ formats: { date: undefined }, text: undefined, notify: undefined }}>
          <Probe />
        </NoviqUIConfigProvider>
      </NoviqUIConfigProvider>
    );
    expect(seen().formats.date).toBe("YYYY-MM-DD");
    expect(seen().text).toEqual(parent.text);
    expect(seen().notify).toBe("[fn]");
  });

  it("accumulates through three levels", () => {
    render(
      <NoviqUIConfigProvider config={{ formats: { locale: "fr-FR" }, text: { tableEmpty: "Vide" } }}>
        <NoviqUIConfigProvider inherit config={{ formats: { currency: "EUR" } }}>
          <NoviqUIConfigProvider inherit config={{ text: { bulkClear: "Effacer" } }}>
            <Probe />
          </NoviqUIConfigProvider>
        </NoviqUIConfigProvider>
      </NoviqUIConfigProvider>
    );
    expect(seen()).toEqual({
      formats: { locale: "fr-FR", currency: "EUR" },
      text: { tableEmpty: "Vide", bulkClear: "Effacer" },
    });
  });

  it("with no parent it is simply a provider", () => {
    render(
      <NoviqUIConfigProvider inherit config={{ formats: { date: "DD/MM" } }}>
        <Probe />
      </NoviqUIConfigProvider>
    );
    expect(seen()).toEqual({ formats: { date: "DD/MM" } });
  });

  it("validates the child's own values as usual", () => {
    expect(() =>
      render(
        <NoviqUIConfigProvider config={parent}>
          <NoviqUIConfigProvider inherit config={{ formats: { weekStart: 9 } }}>
            <Probe />
          </NoviqUIConfigProvider>
        </NoviqUIConfigProvider>
      )
    ).toThrow(/weekStart/);
  });

  it("is what a screen needs to keep the app's table format and change only its words", () => {
    render(
      <NoviqUIConfigProvider config={parent}>
        <NoviqUIConfigProvider inherit config={{ text: { tableEmpty: "Nothing here" } }}>
          {/* an apiFunction table: it only renders if the parent's responseFormat came through */}
          <Table columns={[{ id: "a", heading: "A", accessorKey: "a" }]} apiFunction={async () => ({ result: [], totalCount: 0 })} />
        </NoviqUIConfigProvider>
      </NoviqUIConfigProvider>
    );
    expect(screen.queryByText("A")).toBeInTheDocument();
  });
});
