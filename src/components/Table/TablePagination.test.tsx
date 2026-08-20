import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import TablePagination from "./TablePagination";

describe("TablePagination", () => {
  it("hides itself when totalItems is below the smallest page size option", () => {
    const { container } = render(
      <TablePagination
        pagination={{ page: 1, pageSize: 10 }}
        totalItems={5}
        onPageChange={vi.fn()}
        onPageSizeChange={vi.fn()}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it("shows the results summary", () => {
    render(
      <TablePagination
        pagination={{ page: 1, pageSize: 10 }}
        totalItems={25}
        onPageChange={vi.fn()}
        onPageSizeChange={vi.fn()}
      />
    );
    expect(screen.getByText(/Showing/)).toHaveTextContent("Showing 1 to 10 of 25 results");
  });

  it("does not render page controls when there is only one page", () => {
    render(
      <TablePagination
        pagination={{ page: 1, pageSize: 20 }}
        totalItems={15}
        onPageChange={vi.fn()}
        onPageSizeChange={vi.fn()}
      />
    );
    expect(screen.queryByText(/Page \d+ of \d+/)).not.toBeInTheDocument();
  });

  it("navigates to the next page", async () => {
    const user = userEvent.setup();
    const onPageChange = vi.fn();
    render(
      <TablePagination
        pagination={{ page: 1, pageSize: 10 }}
        totalItems={35}
        onPageChange={onPageChange}
        onPageSizeChange={vi.fn()}
      />
    );
    const buttons = screen.getAllByRole("button");
    await user.click(buttons[2]); // first, prev, next, last -> next is index 2
    expect(onPageChange).toHaveBeenCalledWith(2);
  });

  it("disables previous/first controls on the first page", () => {
    render(
      <TablePagination
        pagination={{ page: 1, pageSize: 10 }}
        totalItems={35}
        onPageChange={vi.fn()}
        onPageSizeChange={vi.fn()}
      />
    );
    const buttons = screen.getAllByRole("button");
    expect(buttons[0]).toBeDisabled(); // first
    expect(buttons[1]).toBeDisabled(); // prev
    expect(buttons[2]).not.toBeDisabled(); // next
    expect(buttons[3]).not.toBeDisabled(); // last
  });
});
