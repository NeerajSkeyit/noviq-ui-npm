import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ActionBar from "./ActionBar";

describe("ActionBar", () => {
  it("renders the search input and fires onSearchChange", async () => {
    const user = userEvent.setup();
    const onSearchChange = vi.fn();
    render(<ActionBar searchValue="" onSearchChange={onSearchChange} />);
    await user.type(screen.getByPlaceholderText("Search..."), "hi");
    expect(onSearchChange).toHaveBeenLastCalledWith("i");
  });

  it("hides the search input when isSearchHidden", () => {
    render(<ActionBar isSearchHidden searchValue="" onSearchChange={vi.fn()} />);
    expect(screen.queryByPlaceholderText("Search...")).not.toBeInTheDocument();
  });

  it("uses a custom search placeholder", () => {
    render(<ActionBar searchValue="" onSearchChange={vi.fn()} searchPlaceholder="Find employees" />);
    expect(screen.getByPlaceholderText("Find employees")).toBeInTheDocument();
  });

  it("renders a plain action button and fires its onClick", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<ActionBar actions={[{ label: "Create", onClick }]} />);
    await user.click(screen.getByRole("button", { name: "Create" }));
    expect(onClick).toHaveBeenCalledWith({ action: { label: "Create", onClick } });
  });

  it("renders a dropdown for a multi-option action with no top-level onClick", async () => {
    const user = userEvent.setup();
    const onOptionClick = vi.fn();
    render(
      <ActionBar
        actions={[
          {
            label: "Export",
            options: [
              { label: "As Excel", onClick: onOptionClick },
              { label: "As CSV", onClick: vi.fn() },
            ],
          },
        ]}
      />
    );
    await user.click(screen.getByRole("button", { name: /Export/ }));
    await user.click(await screen.findByText("As Excel"));
    expect(onOptionClick).toHaveBeenCalled();
  });
});
