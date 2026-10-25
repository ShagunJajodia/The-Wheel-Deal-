import { useEffect, useState } from "react";

import { applyTheme, readStoredTheme, storeTheme, systemTheme, watchSystemTheme } from "../lib/theme";
import type { Theme } from "../lib/theme";

/** Sun/moon button for the dark header. Starts from the saved choice, else the system preference. */
export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(() => readStoredTheme() ?? systemTheme());
  const dark = theme === "dark";

  useEffect(() => applyTheme(theme), [theme]);

  // Until the user picks a theme, follow the operating system.
  useEffect(
    () =>
      watchSystemTheme((next) => {
        if (readStoredTheme() === null) setTheme(next);
      }),
    [],
  );

  function toggle() {
    const next: Theme = dark ? "light" : "dark";
    storeTheme(next);
    setTheme(next);
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
      aria-pressed={dark}
      className="btn btn-dark h-10 w-10 rounded-xl p-0"
    >
      {dark ? (
        <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" aria-hidden="true">
          <circle cx="10" cy="10" r="3.5" />
          <path d="M10 2.5v2M10 15.5v2M2.5 10h2M15.5 10h2M4.7 4.7l1.4 1.4M13.9 13.9l1.4 1.4M15.3 4.7l-1.4 1.4M6.1 13.9l-1.4 1.4" />
        </svg>
      ) : (
        <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M16.5 11.5A6.5 6.5 0 0 1 8.5 3.5a6.5 6.5 0 1 0 8 8Z" />
        </svg>
      )}
    </button>
  );
}
