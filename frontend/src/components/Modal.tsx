import { useEffect, useId, useRef, useState } from "react";
import type { KeyboardEvent, ReactNode } from "react";
import { createPortal } from "react-dom";

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

interface ModalProps {
  title: string;
  onClose: () => void;
  children: ReactNode;
  /** Use "alertdialog" for confirmations that interrupt the user. */
  role?: "dialog" | "alertdialog";
  /** "sheet" is a full-height panel on phones and a wide dialog from sm up; it brings its own header. */
  variant?: "dialog" | "sheet";
}

/** Accessible modal: portal, Escape to close, Tab trap, scroll lock, focus restore. */
export function Modal({ title, onClose, children, role = "dialog", variant = "dialog" }: ModalProps) {
  const titleId = useId();
  const panel = useRef<HTMLDivElement>(null);
  // Read while rendering, before any child with autoFocus has stolen focus from the opener.
  const [opener] = useState(() => document.activeElement as HTMLElement | null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const element = panel.current;
    if (element && !element.contains(document.activeElement)) {
      (element.querySelector<HTMLElement>(FOCUSABLE) ?? element).focus();
    }

    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") onCloseRef.current();
    };
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      opener?.focus?.();
    };
  }, [opener]);

  function trapTab(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== "Tab" || !panel.current) return;
    const items = Array.from(panel.current.querySelectorAll<HTMLElement>(FOCUSABLE));
    if (items.length === 0) {
      event.preventDefault();
      return;
    }
    const first = items[0];
    const last = items[items.length - 1];
    // Shift+Tab from the panel itself (tabIndex -1) must wrap just like it does from the first control.
    if (event.shiftKey && (document.activeElement === first || document.activeElement === panel.current)) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  const sheet = variant === "sheet";
  const closeIcon = (
    <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <path d="M5 5l10 10M15 5L5 15" />
    </svg>
  );

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-stone-950/60 sm:items-center sm:p-4 dark:bg-black/70"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={panel}
        role={role}
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onKeyDown={trapTab}
        className={
          sheet
            ? "h-full w-full max-w-3xl overflow-y-auto bg-white shadow-2xl outline-none sm:h-auto sm:max-h-[92vh] sm:rounded-2xl dark:bg-stone-900 dark:sm:border dark:sm:border-stone-800"
            : "max-h-full w-full max-w-lg overflow-y-auto rounded-t-3xl bg-white p-6 shadow-2xl outline-none sm:rounded-2xl dark:border dark:border-stone-800 dark:bg-stone-900"
        }
      >
        {sheet ? (
          <>
            <h2 id={titleId} className="sr-only">
              {title}
            </h2>
            <div className="sticky top-0 z-10 flex h-0 justify-end">
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="m-3 grid h-10 w-10 place-items-center rounded-full bg-white/90 text-stone-800 shadow-md hover:bg-white dark:bg-stone-900/90 dark:text-stone-100 dark:hover:bg-stone-900"
              >
                {closeIcon}
              </button>
            </div>
          </>
        ) : (
          <div className="flex items-start justify-between gap-4">
            <h2 id={titleId} className="text-xl font-bold text-stone-950 dark:text-stone-50">
              {title}
            </h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="-mr-2 -mt-2 rounded-lg p-2 text-stone-500 hover:bg-stone-100 hover:text-stone-900 dark:text-stone-400 dark:hover:bg-stone-800 dark:hover:text-stone-100"
            >
              {closeIcon}
            </button>
          </div>
        )}
        {children}
      </div>
    </div>,
    document.body,
  );
}
