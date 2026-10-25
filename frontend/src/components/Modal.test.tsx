import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { Modal } from "./Modal";

describe("Modal focus trap", () => {
  it("wraps Shift+Tab from the panel itself to the last control", () => {
    render(
      <Modal title="Trap" onClose={vi.fn()}>
        <button type="button">One</button>
        <button type="button">Two</button>
      </Modal>,
    );
    const panel = screen.getByRole("dialog", { name: "Trap" });
    panel.focus();
    expect(document.activeElement).toBe(panel);

    const notPrevented = fireEvent.keyDown(panel, { key: "Tab", shiftKey: true });

    expect(notPrevented).toBe(false);
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Two" }));
  });

  it("still wraps Shift+Tab from the first control and Tab from the last", () => {
    render(
      <Modal title="Trap" onClose={vi.fn()}>
        <button type="button">One</button>
        <button type="button">Two</button>
      </Modal>,
    );
    const close = screen.getByRole("button", { name: "Close" });
    const two = screen.getByRole("button", { name: "Two" });

    close.focus();
    fireEvent.keyDown(close, { key: "Tab", shiftKey: true });
    expect(document.activeElement).toBe(two);

    fireEvent.keyDown(two, { key: "Tab" });
    expect(document.activeElement).toBe(close);
  });
});

describe("Modal focus restore", () => {
  function Host() {
    const [open, setOpen] = useState(false);
    return (
      <>
        <button type="button" onClick={() => setOpen(true)}>
          Open
        </button>
        {open && (
          <Modal title="Form" onClose={() => setOpen(false)}>
            <input aria-label="Name" autoFocus />
          </Modal>
        )}
      </>
    );
  }

  it("returns focus to the opener even when a field inside autofocuses", () => {
    render(<Host />);
    const opener = screen.getByRole("button", { name: "Open" });
    opener.focus();
    fireEvent.click(opener);

    expect(document.activeElement).toBe(screen.getByLabelText("Name"));

    fireEvent.click(screen.getByRole("button", { name: "Close" }));

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.activeElement).toBe(opener);
  });
});
