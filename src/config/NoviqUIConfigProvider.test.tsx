import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { NoviqUIConfigProvider, useNoviqUIConfig } from "./NoviqUIConfigProvider";

function Consumer() {
  const config = useNoviqUIConfig();
  return <div>{config ? "has-config" : "no-config"}</div>;
}

const VALID_CONFIG = { table: { responseFormat: { rowsPath: "result", totalPath: "totalCount" } } };

describe("NoviqUIConfigProvider", () => {
  it("makes the config available to descendants via useNoviqUIConfig", () => {
    render(
      <NoviqUIConfigProvider config={VALID_CONFIG}>
        <Consumer />
      </NoviqUIConfigProvider>
    );
    expect(screen.getByText("has-config")).toBeInTheDocument();
  });

  it("useNoviqUIConfig returns undefined outside a Provider", () => {
    render(<Consumer />);
    expect(screen.getByText("no-config")).toBeInTheDocument();
  });

  it("accepts a config that sets only notify (no table section)", () => {
    render(
      <NoviqUIConfigProvider config={{ notify: () => {} }}>
        <Consumer />
      </NoviqUIConfigProvider>
    );
    expect(screen.getByText("has-config")).toBeInTheDocument();
  });

  it("exposes notify to descendants", () => {
    const notify = () => {};
    function NotifyConsumer() {
      return <div>{useNoviqUIConfig()?.notify === notify ? "same-notify" : "other"}</div>;
    }
    render(
      <NoviqUIConfigProvider config={{ ...VALID_CONFIG, notify }}>
        <NotifyConsumer />
      </NoviqUIConfigProvider>
    );
    expect(screen.getByText("same-notify")).toBeInTheDocument();
  });

  it("throws when table.responseFormat is missing", () => {
    const badConfig = { table: {} } as any;
    expect(() =>
      render(
        <NoviqUIConfigProvider config={badConfig}>
          <Consumer />
        </NoviqUIConfigProvider>
      )
    ).toThrow(/requires config\.table\.responseFormat/);
  });

  it("throws when responseFormat has neither variant", () => {
    const badConfig = { table: { responseFormat: {} } } as any;
    expect(() =>
      render(
        <NoviqUIConfigProvider config={badConfig}>
          <Consumer />
        </NoviqUIConfigProvider>
      )
    ).toThrow(/exactly one of/);
  });

  it("throws when responseFormat mixes both variants", () => {
    const badConfig = {
      table: {
        responseFormat: { rowsPath: "a", totalPath: "b", getRows: () => [], getTotal: () => 0 },
      },
    } as any;
    expect(() =>
      render(
        <NoviqUIConfigProvider config={badConfig}>
          <Consumer />
        </NoviqUIConfigProvider>
      )
    ).toThrow(/exactly one of/);
  });
});
