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

  describe("formats", () => {
    const mount = (config: any) =>
      render(
        <NoviqUIConfigProvider config={config}>
          <Consumer />
        </NoviqUIConfigProvider>
      );

    it("accepts a config that sets only formats", () => {
      mount({ formats: { date: "YYYY-MM-DD", time: "HH:mm", dateTime: "YYYY-MM-DD HH:mm" } });
      expect(screen.getByText("has-config")).toBeInTheDocument();
    });

    it("accepts any subset of the three patterns", () => {
      mount({ formats: { time: "HH:mm" } });
      expect(screen.getByText("has-config")).toBeInTheDocument();
    });

    it.each(["date", "time", "dateTime"])("throws when %s is not a string", (key) => {
      expect(() => mount({ formats: { [key]: 42 } })).toThrow(new RegExp(`config\\.formats\\.${key}`));
    });

    it.each(["date", "time", "dateTime"])("throws when %s is empty", (key) => {
      expect(() => mount({ formats: { [key]: "   " } })).toThrow(/non-empty format string/);
    });

    describe("regional settings", () => {
      it("accepts a locale, currency and weekStart", () => {
        mount({ formats: { locale: "de-DE", currency: "EUR", weekStart: 1 } });
        expect(screen.getByText("has-config")).toBeInTheDocument();
      });

      it.each([42, "", "   ", "not a locale!", "en_US"])("throws for locale %j", (locale) => {
        expect(() => mount({ formats: { locale } })).toThrow(/config\.formats\.locale/);
      });

      it.each([42, "", "RUPEE", "in", "R$"])("throws for currency %j", (currency) => {
        expect(() => mount({ formats: { currency } })).toThrow(/config\.formats\.currency/);
      });

      it("accepts a lower-case currency code", () => {
        mount({ formats: { currency: "usd" } });
        expect(screen.getByText("has-config")).toBeInTheDocument();
      });

      it.each([-1, 7, 1.5, "1", NaN])("throws for weekStart %j", (weekStart) => {
        expect(() => mount({ formats: { weekStart } })).toThrow(/config\.formats\.weekStart/);
      });

      it.each([0, 1, 6])("accepts weekStart %i", (weekStart) => {
        mount({ formats: { weekStart } });
        expect(screen.getByText("has-config")).toBeInTheDocument();
      });
    });
  });
});
