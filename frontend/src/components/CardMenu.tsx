import { useEffect, useId, useRef, useState } from "react";
import type { KeyboardEvent } from "react";

export interface CardMenuProps {
  /** Names the car in the trigger's accessible label, e.g. "2024 Tata Nexon". */
  label: string;
  onEdit: () => void;
  onRestock: () => void;
  onDelete: () => void;
}

/** Per-card admin menu: Edit, Restock, Delete. */
export function CardMenu({ label, onEdit, onRestock, onDelete }: CardMenuProps) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    root.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus();
    const onPointerDown = (event: MouseEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  function choose(action: () => void) {
    setOpen(false);
    // Hand focus back to the trigger first so a dialog opened next restores focus here.
    trigger.current?.focus();
    action();
  }

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (!open) return;
    if (event.key === "Escape") {
      event.stopPropagation();
      setOpen(false);
      trigger.current?.focus();
      return;
    }
    const items = Array.from(root.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? []);
    const current = items.indexOf(document.activeElement as HTMLElement);
    let next = -1;
    if (event.key === "ArrowDown") next = (current + 1) % items.length;
    else if (event.key === "ArrowUp") next = (current - 1 + items.length) % items.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = items.length - 1;
    if (next >= 0) {
      event.preventDefault();
      items[next].focus();
    }
  }

  const item =
    "block w-full px-4 py-2.5 text-left text-sm font-semibold hover:bg-stone-100 focus:bg-stone-100";

  return (
    <div ref={root} onKeyDown={onKeyDown} className="relative">
      <button
        ref={trigger}
        type="button"
        aria-label={`Manage ${label}`}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => setOpen((previous) => !previous)}
        className="grid h-9 w-9 place-items-center rounded-full bg-white/90 text-stone-800 shadow-sm hover:bg-white"
      >
        <svg viewBox="0 0 20 20" className="h-5 w-5" fill="currentColor" aria-hidden="true">
          <circle cx="4" cy="10" r="1.75" />
          <circle cx="10" cy="10" r="1.75" />
          <circle cx="16" cy="10" r="1.75" />
        </svg>
      </button>
      {open && (
        <div
          id={menuId}
          role="menu"
          aria-label={`Actions for ${label}`}
          className="absolute right-0 z-20 mt-2 w-40 overflow-hidden rounded-xl border border-stone-200 bg-white py-1 shadow-xl"
        >
          <button type="button" role="menuitem" onClick={() => choose(onEdit)} className={`${item} text-stone-800`}>
            Edit
          </button>
          <button type="button" role="menuitem" onClick={() => choose(onRestock)} className={`${item} text-stone-800`}>
            Restock
          </button>
          <button type="button" role="menuitem" onClick={() => choose(onDelete)} className={`${item} text-red-700`}>
            Delete
          </button>
        </div>
      )}
    </div>
  );
}
