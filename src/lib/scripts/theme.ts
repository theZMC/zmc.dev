export type Theme = "dark" | "light";

const STORAGE_KEY = "theme";

/** The visitor's explicit choice, or null when they're following the OS. */
export function storedPreference(): Theme | null {
  let stored: string | null = null;
  try {
    stored = localStorage.getItem(STORAGE_KEY);
  } catch {
    // localStorage unavailable; the visitor is effectively in auto
  }
  return stored === "dark" || stored === "light" ? stored : null;
}

function systemTheme(): Theme {
  return window.matchMedia("(prefers-color-scheme: light)").matches
    ? "light"
    : "dark";
}

/** What the page is showing: the pinned choice, else the OS preference. */
export function effectiveTheme(): Theme {
  const pinned = document.documentElement.getAttribute("data-theme");
  if (pinned === "dark" || pinned === "light") return pinned;
  return systemTheme();
}

/**
 * Pins the persisted choice, or clears the attribute so color-scheme
 * follows the OS. Mirrors the pre-paint inline script in BaseLayout.
 */
export function applyStoredTheme(): void {
  const stored = storedPreference();
  if (stored) {
    document.documentElement.setAttribute("data-theme", stored);
  } else {
    document.documentElement.removeAttribute("data-theme");
  }
}

/* Clear-on-match: choosing the theme the OS already prefers is
   re-convergence, not a pin — hand control back to auto so the page
   follows the next OS flip. Only a choice against the OS persists. */
function setTheme(next: Theme): void {
  const root = document.documentElement;
  if (next === systemTheme()) {
    root.removeAttribute("data-theme");
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // persistence is best-effort
    }
    return;
  }
  root.setAttribute("data-theme", next);
  try {
    localStorage.setItem(STORAGE_KEY, next);
  } catch {
    // persistence is best-effort
  }
}

/**
 * The eclipse: theme switch behind a View Transition, revealed by a clipPath
 * circle expanding from the toggle's center. Falls back to an instant swap
 * when the API is unavailable or the user prefers reduced motion.
 */
export function toggleTheme(btn: HTMLElement): void {
  const root = document.documentElement;
  const toggle = (): void =>
    setTheme(effectiveTheme() === "dark" ? "light" : "dark");
  const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)");

  if (!document.startViewTransition || prefersReduced.matches) {
    toggle();
    return;
  }

  const rect = btn.getBoundingClientRect();
  const x = rect.left + rect.width / 2;
  const y = rect.top + rect.height / 2;
  const endRadius = Math.hypot(
    Math.max(x, window.innerWidth - x),
    Math.max(y, window.innerHeight - y),
  );
  const transition = document.startViewTransition(toggle);
  transition.ready
    .then(() => {
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
    })
    .catch(() => {});
}
