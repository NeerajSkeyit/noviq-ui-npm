import React, { useState } from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Modal from "./Modal/Modal";
import Drawer from "./Drawer/Drawer";
import DatePicker from "./DatePicker/DatePicker";
import TimePicker from "./TimePicker/TimePicker";
import MonthPicker from "./MonthPicker/MonthPicker";
import Input from "./Input/Input";

// Escape should dismiss only the topmost layer: a picker or select menu open inside a Modal closes
// first, and a Drawer opened from a Modal closes before the Modal does.

const pickerTrigger = () => screen.getAllByRole("combobox").find((el) => el.tagName === "BUTTON")!;

function ModalWith({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <Modal isOpen onClose={onClose} title="Layered">
      {children}
    </Modal>
  );
}

describe("Escape inside a Modal dismisses only the topmost layer", () => {
  const PICKERS: [string, () => React.ReactElement, () => HTMLElement][] = [
    ["DatePicker", () => <DatePicker value="" />, () => screen.getByRole("grid")],
    ["MonthPicker", () => <MonthPicker value="" />, () => screen.getByRole("grid")],
    ["TimePicker", () => <TimePicker value="" />, () => screen.getByRole("listbox", { name: "Hours" })],
  ];

  it.each(PICKERS)("%s: first Escape closes the picker, the second closes the modal", async (_name, make, panel) => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<ModalWith onClose={onClose}>{make()}</ModalWith>);

    await user.click(pickerTrigger());
    expect(panel()).toBeInTheDocument();

    await user.keyboard("{Escape}");
    expect(onClose).not.toHaveBeenCalled();
    expect(pickerTrigger()).toHaveAttribute("aria-expanded", "false");

    await user.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it.each(PICKERS)("%s: with the picker closed, Escape closes the modal straight away", async (_name, make) => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<ModalWith onClose={onClose}>{make()}</ModalWith>);
    pickerTrigger().focus();
    await user.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("a DatePicker's Escape still works when focus moved into its panel (month select)", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(
      <ModalWith onClose={onClose}>
        <DatePicker value="2024-03-05" />
      </ModalWith>
    );
    await user.click(pickerTrigger());
    await user.selectOptions(screen.getByRole("combobox", { name: "Month" }), "June");
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("grid")).not.toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
  });

  it("a select's open menu closes first, then the modal", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(
      <ModalWith onClose={onClose}>
        <Input
          type="select"
          label="Team"
          value=""
          onChange={() => {}}
          options={[
            { label: "Design", value: "design" },
            { label: "Sales", value: "sales" },
          ]}
        />
      </ModalWith>
    );
    const select = screen.getByRole("combobox");
    await user.click(select);
    await user.keyboard("{ArrowDown}");
    expect(screen.getByText("Design")).toBeInTheDocument(); // menu is open

    await user.keyboard("{Escape}");
    expect(screen.queryByText("Design")).not.toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();

    await user.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("a select with its menu closed lets Escape through to the modal", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(
      <ModalWith onClose={onClose}>
        <Input type="select" label="Team" value="" onChange={() => {}} options={[{ label: "Design", value: "design" }]} />
      </ModalWith>
    );
    screen.getByRole("combobox").focus();
    await user.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

describe("Escape with stacked Drawer / Modal", () => {
  function DrawerFromModal({ drawerDismissible, onModalClose }: { drawerDismissible: boolean; onModalClose: () => void }) {
    const [drawerOpen, setDrawerOpen] = useState(false);
    return (
      <>
        <Modal isOpen onClose={onModalClose} title="Parent modal">
          <button onClick={() => setDrawerOpen(true)}>Open drawer</button>
        </Modal>
        <Drawer
          isOpen={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          title="Child drawer"
          closeOnOutside={drawerDismissible}
        />
      </>
    );
  }
  const drawerOpen = () => document.querySelector(".drawer-content")?.classList.contains("drawer-open");

  it("closes the drawer opened from a modal first, then the modal", async () => {
    const user = userEvent.setup();
    const onModalClose = vi.fn();
    render(<DrawerFromModal drawerDismissible onModalClose={onModalClose} />);
    await user.click(screen.getByRole("button", { name: "Open drawer" }));
    expect(drawerOpen()).toBe(true);

    await user.keyboard("{Escape}");
    expect(drawerOpen()).toBe(false);
    expect(onModalClose).not.toHaveBeenCalled();

    await user.keyboard("{Escape}");
    expect(onModalClose).toHaveBeenCalledTimes(1);
  });

  it("a drawer that ignores Escape still shields the modal beneath it", async () => {
    const user = userEvent.setup();
    const onModalClose = vi.fn();
    render(<DrawerFromModal drawerDismissible={false} onModalClose={onModalClose} />);
    await user.click(screen.getByRole("button", { name: "Open drawer" }));

    await user.keyboard("{Escape}");
    expect(drawerOpen()).toBe(true);
    expect(onModalClose).not.toHaveBeenCalled();
  });

  it("after the topmost layer closes, the one beneath is topmost again", async () => {
    const user = userEvent.setup();
    const onModalClose = vi.fn();
    render(<DrawerFromModal drawerDismissible onModalClose={onModalClose} />);
    await user.click(screen.getByRole("button", { name: "Open drawer" }));
    await user.keyboard("{Escape}");
    // re-open the drawer: it must be topmost again, not the modal
    await user.click(within(document.body).getByRole("button", { name: "Open drawer" }));
    await user.keyboard("{Escape}");
    expect(drawerOpen()).toBe(false);
    expect(onModalClose).not.toHaveBeenCalled();
  });
});
