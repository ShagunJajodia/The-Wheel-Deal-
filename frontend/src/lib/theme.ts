export type Theme = "light" | "dark";

export const THEME_KEY = "wheel-deal-theme";
const DARK_QUERY = "(prefers-color-scheme: dark)";

/** The saved choice, or null when there is none (or storage is blocked). */
export function readStoredTheme(): Theme | null {
  try {
    const value = localStorage.getItem(THEME_KEY);
    return value === "light" || value === "dark" ? value : null;
  } catch {
    return null;
  }
}

export function storeTheme(theme: Theme): void {
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch {
    // Private mode or blocked storage: the choice just lasts for this visit.
  }
}

function darkQuery(): MediaQueryList | null {
  return typeof window.matchMedia === "function" ? window.matchMedia(DARK_QUERY) : null;
}

export function systemTheme(): Theme {
  return darkQuery()?.matches ? "dark" : "light";
}

export function applyTheme(theme: Theme): void {
  document.documentElement.classList.toggle("dark", theme === "dark");
}

/** Subscribes to OS theme changes; returns the unsubscribe function. */
export function watchSystemTheme(onChange: (theme: Theme) => void): () => void {
  const query = darkQuery();
  if (!query || typeof query.addEventListener !== "function") return () => undefined;
  const listener = (event: MediaQueryListEvent) => onChange(event.matches ? "dark" : "light");
  query.addEventListener("change", listener);
  return () => query.removeEventListener("change", listener);
}
