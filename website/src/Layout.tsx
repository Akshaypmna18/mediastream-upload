import { useEffect, useId, useRef, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";

const THEME_KEY = "msu-theme";

type ThemeChoice = "system" | "light" | "dark";

const links = [
  {
    href: "https://github.com/akshaypmna18/mediastream-upload/tree/main/docs",
    label: "Docs",
    external: true,
  },
  { to: "/guide", label: "Guide" },
  { to: "/api", label: "API" },
  { to: "/backend", label: "Backend" },
  { to: "/examples/react", label: "Demo" },
  {
    href: "https://www.npmjs.com/package/mediastream-upload",
    label: "npm",
    external: true,
  },
  {
    href: "https://github.com/akshaypmna18/mediastream-upload",
    label: "GitHub",
    external: true,
  },
] as const;

function readTheme(): ThemeChoice {
  try {
    const stored = localStorage.getItem(THEME_KEY);
    if (stored === "light" || stored === "dark" || stored === "system") {
      return stored;
    }
  } catch {
    /* private mode */
  }
  return "system";
}

function applyTheme(theme: ThemeChoice) {
  const root = document.documentElement;
  if (theme === "system") root.removeAttribute("data-theme");
  else root.setAttribute("data-theme", theme);
}

const themeLabels: Record<ThemeChoice, string> = {
  system: "System",
  light: "Light",
  dark: "Dark",
};

export function Layout() {
  const location = useLocation();
  const themeMenuId = useId();
  const themeRef = useRef<HTMLDivElement>(null);
  const [theme, setTheme] = useState<ThemeChoice>(readTheme);
  const [menuOpen, setMenuOpen] = useState(false);
  const [themeOpen, setThemeOpen] = useState(false);

  useEffect(() => {
    applyTheme(theme);
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch {
      /* private mode */
    }
  }, [theme]);

  useEffect(() => {
    setMenuOpen(false);
    setThemeOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!menuOpen && !themeOpen) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMenuOpen(false);
        setThemeOpen(false);
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [menuOpen, themeOpen]);

  useEffect(() => {
    if (!themeOpen) return;
    function onPointer(event: PointerEvent) {
      if (!themeRef.current?.contains(event.target as Node)) setThemeOpen(false);
    }
    document.addEventListener("pointerdown", onPointer);
    return () => document.removeEventListener("pointerdown", onPointer);
  }, [themeOpen]);

  return (
    <div className="site">
      <header className="site-header">
        <div className="shell header-bar">
          <NavLink to="/" className="brand" end>
            <Mark />
            <span>mediastream-upload</span>
          </NavLink>

          <div className="header-tools">
            <div className="theme" ref={themeRef}>
              <button
                type="button"
                className="theme-trigger"
                aria-haspopup="menu"
                aria-expanded={themeOpen}
                aria-controls={themeMenuId}
                onClick={() => setThemeOpen((open) => !open)}
              >
                <SunIcon />
                <span>{themeLabels[theme]}</span>
                <ChevronIcon />
              </button>
              <div
                id={themeMenuId}
                className={themeOpen ? "theme-menu is-open" : "theme-menu"}
                role="menu"
                aria-label="Color theme"
              >
                {(Object.keys(themeLabels) as ThemeChoice[]).map((choice) => (
                  <button
                    key={choice}
                    type="button"
                    role="menuitemradio"
                    aria-checked={theme === choice}
                    className={theme === choice ? "is-current" : undefined}
                    onClick={() => {
                      setTheme(choice);
                      setThemeOpen(false);
                    }}
                  >
                    {themeLabels[choice]}
                  </button>
                ))}
              </div>
            </div>
            <button
              type="button"
              className="nav-toggle"
              aria-expanded={menuOpen}
              aria-controls="site-nav"
              onClick={() => setMenuOpen((open) => !open)}
            >
              <span className="visually-hidden">{menuOpen ? "Close menu" : "Open menu"}</span>
              <MenuIcon open={menuOpen} />
            </button>
          </div>

          <nav
            id="site-nav"
            className={menuOpen ? "nav is-open" : "nav"}
            aria-label="Primary"
          >
            {links.map((link) =>
              "to" in link ? (
                <NavLink
                  key={link.to}
                  to={link.to}
                  className={({ isActive }) => (isActive ? "active" : undefined)}
                >
                  {link.label}
                </NavLink>
              ) : (
                <a key={link.href} href={link.href} target="_blank" rel="noreferrer">
                  {link.label}
                </a>
              ),
            )}
          </nav>
        </div>
      </header>
      <main className="shell site-main">
        <Outlet />
      </main>
      <footer className="site-footer">
        <div className="shell">
          MIT ·{" "}
          <a href="https://github.com/akshaypmna18/mediastream-upload">
            akshaypmna18/mediastream-upload
          </a>
        </div>
      </footer>
    </div>
  );
}

function Mark() {
  return (
    <svg className="brand-mark" viewBox="0 0 18 18" fill="currentColor" aria-hidden="true">
      <rect x="1" y="6.5" width="2.4" height="5" rx="1.2" />
      <rect x="5.2" y="3" width="2.4" height="12" rx="1.2" />
      <rect x="9.4" y="5" width="2.4" height="8" rx="1.2" />
      <rect x="13.6" y="2.2" width="2.4" height="13.6" rx="1.2" />
    </svg>
  );
}

function SunIcon() {
  return (
    <svg className="theme-icon" viewBox="0 0 16 16" aria-hidden="true">
      <circle cx="8" cy="8" r="2.4" fill="none" stroke="currentColor" strokeWidth="1.4" />
      <path
        d="M8 1.6v1.5M8 12.9v1.5M1.6 8h1.5M12.9 8h1.5M3.4 3.4l1.1 1.1M11.5 11.5l1.1 1.1M12.6 3.4l-1.1 1.1M4.5 11.5l-1.1 1.1"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

function ChevronIcon() {
  return (
    <svg className="theme-chevron" viewBox="0 0 12 12" aria-hidden="true">
      <path
        d="M2.5 4.5 6 8l3.5-3.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function MenuIcon({ open }: { open: boolean }) {
  return (
    <svg className="nav-toggle-icon" viewBox="0 0 16 16" aria-hidden="true">
      {open ? (
        <path
          d="M3.5 3.5 12.5 12.5M12.5 3.5 3.5 12.5"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinecap="round"
        />
      ) : (
        <path
          d="M2.5 4.5h11M2.5 8h11M2.5 11.5h11"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinecap="round"
        />
      )}
    </svg>
  );
}
