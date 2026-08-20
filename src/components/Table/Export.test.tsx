import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Export from "./Export";

function renderExport(overrides: Partial<React.ComponentProps<typeof Export>> = {}) {
  const props = {
    exportToExcel: vi.fn(),
    exportToCSV: vi.fn(),
    exporting: false,
    ...overrides,
  };
  render(<Export {...props} />);
  return props;
}

describe("Export", () => {
  it("opens the dropdown and shows Excel/CSV options", async () => {
    const user = userEvent.setup();
    renderExport();
    await user.click(screen.getByRole("button", { name: /Export/ }));
    expect(screen.getByText("Export as Excel")).toBeInTheDocument();
    expect(screen.getByText("Export as CSV")).toBeInTheDocument();
  });

  it("fires exportToExcel with the built filename when clicked", async () => {
    const user = userEvent.setup();
    const props = renderExport({ fileNameBase: "employees" });
    await user.click(screen.getByRole("button", { name: /Export/ }));
    await user.click(screen.getByText("Export as Excel"));
    expect(props.exportToExcel).toHaveBeenCalledWith("employees.xlsx");
  });

  it("fires exportToCSV with the built filename when clicked", async () => {
    const user = userEvent.setup();
    const props = renderExport({ fileNameBase: "employees" });
    await user.click(screen.getByRole("button", { name: /Export/ }));
    await user.click(screen.getByText("Export as CSV"));
    expect(props.exportToCSV).toHaveBeenCalledWith("employees.csv");
  });

  it("shows an Exporting state and disables the trigger while exporting", () => {
    renderExport({ exporting: true });
    const trigger = screen.getByRole("button", { name: /Exporting/ });
    expect(trigger).toBeDisabled();
  });

  it("renders a plain button that opens responseSheetUrl instead of a dropdown", async () => {
    const user = userEvent.setup();
    const openSpy = vi.spyOn(window, "open").mockImplementation(() => null);
    renderExport({ responseSheetUrl: "https://example.com/report.xlsx" });

    expect(screen.queryByText("Export as Excel")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /Export/ }));
    expect(openSpy).toHaveBeenCalledWith("https://example.com/report.xlsx", "_blank");

    openSpy.mockRestore();
  });
});
