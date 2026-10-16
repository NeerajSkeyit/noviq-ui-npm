import React, { useState } from "react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Modal from "./Modal/Modal";
import Drawer from "./Drawer/Drawer";
import { OVERLAY_Z_STEP } from "../constants";

afterEach(() => {
  document.body.style.overflow = "";
});

const z = (el: Element | null) => (el as HTMLElement | null)?.style.zIndex ?? "";
const depthOf = (value: string) => {
  const match = /\+\s*(\d+)\)$/.exec(value);
  return match ? Number(match[1]) / OVERLAY_Z_STEP : NaN;
};

describe("<Modal> is portaled to <body>", () => {
  it("is not inside the element it was rendered in, so a host's transform / z-index can't trap it", () => {
    const { container } = render(
      <div style={{ transform: "translateX(0)", position: "relative", zIndex: 1 }}>
        <Modal isOpen onClose={() => {}} title="m">
          body
        </Modal>
      </div>
    );
    expect(container.querySelector(".nq-modal-overlay")).toBeNull();
    expect(document.body.querySelector(":scope > .nq-modal-overlay")).not.toBeNull();
    expect(screen.getByText("body")).toBeInTheDocument(); // still reachable
  });

  it("keeps React context working through the portal", () => {
    const Context = React.createContext("outside");
    function Reader() {
      return <span data-testid="read">{React.useContext(Context)}</span>;
    }
    render(
      <Context.Provider value="provided by the app">
        <Modal isOpen onClose={() => {}} title="m">
          <Reader />
        </Modal>
      </Context.Provider>
    );
    expect(screen.getByTestId("read").textContent).toBe("provided by the app");
  });

  it("is gone from <body> once closed", async () => {
    function Harness() {
      const [open, setOpen] = useState(true);
      return (
        <>
          <button onClick={() => setOpen(false)}>close</button>
          <Modal isOpen={open} onClose={() => setOpen(false)} title="m">
            body
          </Modal>
        </>
      );
    }
    const user = userEvent.setup();
    render(<Harness />);
    expect(document.querySelector(".nq-modal-overlay")).not.toBeNull();
    await user.click(screen.getByRole("button", { name: "close" }));
    await vi.waitFor(() => expect(document.querySelector(".nq-modal-overlay")).toBeNull(), { timeout: 2000 });
  });

  it("renders nothing without a document (server rendering)", async () => {
    const { renderToString } = await import("react-dom/server");
    const error = vi.spyOn(console, "error").mockImplementation(() => {}); // React's layout-effect-on-server notice
    vi.stubGlobal("document", undefined);
    try {
      expect(renderToString(<Modal isOpen onClose={() => {}} title="m" />)).toBe("");
    } finally {
      vi.unstubAllGlobals();
      error.mockRestore();
    }
  });
});

describe("overlays stack by the order they opened", () => {
  const overlay = () => document.querySelector(".nq-modal-overlay");
  const drawerPanel = () => document.querySelector(".nq-drawer-content.nq-drawer-open");
  const drawerBackdrop = () => document.querySelector(".nq-drawer-overlay");

  function Both({ order }: { order: ("modal" | "drawer")[] }) {
    const [open, setOpen] = useState<string[]>([]);
    return (
      <>
        <button onClick={() => setOpen(order)}>open</button>
        <Modal isOpen={open.includes("modal")} onClose={() => {}} title="m" />
        <Drawer isOpen={open.includes("drawer")} onClose={() => {}} />
      </>
    );
  }

  it("a lone modal and a lone drawer sit at the base of the scale", () => {
    const { unmount } = render(<Modal isOpen onClose={() => {}} title="m" />);
    expect(depthOf(z(overlay()))).toBe(0);
    unmount();
    render(<Drawer isOpen onClose={() => {}} />);
    expect(depthOf(z(drawerBackdrop()))).toBe(0);
  });

  it("a drawer's panel is above its own backdrop", () => {
    render(<Drawer isOpen onClose={() => {}} />);
    const backdrop = z(drawerBackdrop());
    const panel = z(drawerPanel());
    expect(panel).toBe(`calc(${backdrop} + 1)`);
  });

  it("a modal opened after a drawer is above it (the drawer was mounted first)", () => {
    function App() {
      const [modal, setModal] = useState(false);
      return (
        <>
          <button onClick={() => setModal(true)}>open modal</button>
          <Drawer isOpen onClose={() => {}} />
          <Modal isOpen={modal} onClose={() => {}} title="m" />
        </>
      );
    }
    render(<App />);
    act(() => screen.getByRole("button", { name: "open modal" }).click());
    expect(depthOf(z(overlay()))).toBeGreaterThan(depthOf(z(drawerBackdrop())));
  });

  it("a drawer opened after a modal is above it", () => {
    function App() {
      const [drawer, setDrawer] = useState(false);
      return (
        <>
          <button onClick={() => setDrawer(true)}>open drawer</button>
          <Modal isOpen onClose={() => {}} title="m" />
          <Drawer isOpen={drawer} onClose={() => {}} />
        </>
      );
    }
    render(<App />);
    act(() => screen.getByRole("button", { name: "open drawer" }).click());
    expect(depthOf(z(drawerBackdrop()))).toBeGreaterThan(depthOf(z(overlay())));
  });

  it("three deep: modal → drawer → modal, each above the last", () => {
    function App() {
      const [n, setN] = useState(0);
      return (
        <>
          <button onClick={() => setN((v) => v + 1)}>next</button>
          <Modal isOpen={n >= 1} onClose={() => {}} title="first" />
          <Drawer isOpen={n >= 2} onClose={() => {}} />
          <Modal isOpen={n >= 3} onClose={() => {}} title="second" />
        </>
      );
    }
    render(<App />);
    for (let i = 0; i < 3; i++) act(() => screen.getByRole("button", { name: "next" }).click());
    const modals = [...document.querySelectorAll(".nq-modal-overlay")].map((m) => depthOf(z(m)));
    const drawer = depthOf(z(drawerBackdrop()));
    expect(modals).toHaveLength(2);
    expect(modals[0]).toBeLessThan(drawer);
    expect(drawer).toBeLessThan(modals[1]);
  });

  it("order given to <Both> doesn't matter", () => {
    render(<Both order={["modal", "drawer"]} />);
    act(() => screen.getByRole("button", { name: "open" }).click());
    expect(document.querySelectorAll(".nq-modal-overlay, .nq-drawer-overlay").length).toBe(2);
  });
});
