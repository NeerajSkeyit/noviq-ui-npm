import React, { useState } from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DropdownMenu, DropdownMenuItem } from "./Dropdown";
import Modal from "../Modal/Modal";

function Menu({
  onPick = () => {},
  startOpen = false,
}: {
  onPick?: (what: string) => void;
  startOpen?: boolean;
}) {
  const [open, setOpen] = useState(startOpen);
  return (
    <>
      <DropdownMenu
        isOpen={open}
        setIsOpen={setOpen}
        trigger={<button onClick={() => setOpen((o) => !o)}>Actions</button>}
      >
        <DropdownMenuItem onClick={() => onPick("edit")}>Edit</DropdownMenuItem>
        <DropdownMenuItem destructive onClick={() => onPick("delete")}>
          Delete
        </DropdownMenuItem>
        <DropdownMenuItem disabled onClick={() => onPick("archive")}>
          Archive
        </DropdownMenuItem>
      </DropdownMenu>
      <button>elsewhere</button>
    </>
  );
}

const menuIsOpen = () => screen.queryByText("Edit") !== null;

describe("DropdownMenu", () => {
  it("renders its items only while open", async () => {
    const user = userEvent.setup();
    render(<Menu />);
    expect(menuIsOpen()).toBe(false);
    await user.click(screen.getByRole("button", { name: "Actions" }));
    expect(menuIsOpen()).toBe(true);
  });

  it("runs an item's onClick and closes the menu", async () => {
    const user = userEvent.setup();
    const onPick = vi.fn();
    render(<Menu onPick={onPick} />);
    await user.click(screen.getByRole("button", { name: "Actions" }));
    await user.click(screen.getByText("Edit"));
    expect(onPick).toHaveBeenCalledWith("edit");
    expect(menuIsOpen()).toBe(false);
  });

  it("marks destructive items and ignores clicks on disabled ones", async () => {
    const user = userEvent.setup();
    const onPick = vi.fn();
    render(<Menu onPick={onPick} />);
    await user.click(screen.getByRole("button", { name: "Actions" }));
    expect(screen.getByText("Delete")).toHaveClass("nq-dropdown-item-destructive");

    await user.click(screen.getByText("Archive"));
    expect(onPick).not.toHaveBeenCalled();
  });

  it("closes on a mousedown outside it", async () => {
    const user = userEvent.setup();
    render(<Menu startOpen />);
    expect(menuIsOpen()).toBe(true);
    await user.click(screen.getByRole("button", { name: "elsewhere" }));
    expect(menuIsOpen()).toBe(false);
  });

  describe("Escape", () => {
    it("closes an open menu", async () => {
      const user = userEvent.setup();
      render(<Menu startOpen />);
      await user.keyboard("{Escape}");
      expect(menuIsOpen()).toBe(false);
    });

    it("does nothing when the menu is closed", async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();
      render(
        <>
          <Menu />
          <Modal isOpen onClose={onClose} title="Parent" />
        </>
      );
      await user.keyboard("{Escape}");
      expect(onClose).toHaveBeenCalledTimes(1); // went to the modal, not swallowed
    });

    it("closes a menu inside a Modal first; the Modal needs a second Escape", async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();
      render(
        <Modal isOpen onClose={onClose} title="Parent">
          <Menu />
        </Modal>
      );
      await user.click(screen.getByRole("button", { name: "Actions" }));
      expect(menuIsOpen()).toBe(true);

      await user.keyboard("{Escape}");
      expect(menuIsOpen()).toBe(false);
      expect(onClose).not.toHaveBeenCalled();

      await user.keyboard("{Escape}");
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });
});
