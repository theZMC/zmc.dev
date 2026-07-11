export type Theme = "dark" | "light";

const STORAGE_KEY = "theme";

export function storedTheme(): Theme {
  let stored: string | null = null;
  try {
    stored = localStorage.getItem(STORAGE_KEY);
  } catch {
    // localStorage unavailable; fall through to the media query
  }
  if (stored === "dark" || stored === "light") return stored;
  return window.matchMedia("(prefers-color-scheme: light)").matches
    ? "light"
    : "dark";
}

export function syncToggleLabel(): void {
  const btn = document.getElementById("themeToggle");
  if (!btn) return;
  const dark = document.documentElement.getAttribute("data-theme") === "dark";
  btn.setAttribute(
    "aria-label",
    dark ? "Switch to light mode" : "Switch to dark mode",
  );
}

/** Applies the persisted (or preferred) theme and syncs the toggle label. */
export function applyStoredTheme(): void {
  document.documentElement.setAttribute("data-theme", storedTheme());
  syncToggleLabel();
}

function setTheme(next: Theme): void {
  document.documentElement.setAttribute("data-theme", next);
  try {
    localStorage.setItem(STORAGE_KEY, next);
  } catch {
    // persistence is best-effort
  }
  syncToggleLabel();
}

/**
 * The eclipse: theme switch behind a View Transition, revealed by a clipPath
 * circle expanding from the toggle's center. Falls back to an instant swap
 * when the API is unavailable or the user prefers reduced motion.
 */
export function toggleTheme(btn: HTMLElement): void {
  const root = document.documentElement;
  const next: Theme =
    root.getAttribute("data-theme") === "dark" ? "light" : "dark";
  const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)");

  if (!document.startViewTransition || prefersReduced.matches) {
    setTheme(next);
    return;
  }

  const rect = btn.getBoundingClientRect();
  const x = rect.left + rect.width / 2;
  const y = rect.top + rect.height / 2;
  const endRadius = Math.hypot(
    Math.max(x, window.innerWidth - x),
    Math.max(y, window.innerHeight - y),
  );
  const transition = document.startViewTransition(() => setTheme(next));
  transition.ready.then(() => {
    root.animate(
      {
        clipPath: [
          `circle(0px at ${x}px ${y}px)`,
          `circle(${endRadius}px at ${x}px ${y}px)`,
        ],
      },
      {
        duration: 750,
        easing: "cubic-bezier(.4, 0, .2, 1)",
        pseudoElement: "::view-transition-new(root)",
      },
    );
  });
}
