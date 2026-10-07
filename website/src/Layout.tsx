import { NavLink, Outlet } from "react-router-dom";

const links = [
  { to: "/", label: "Home", end: true },
  { to: "/guide", label: "Guide" },
  { to: "/api", label: "API" },
  { to: "/backend", label: "Backend" },
  { to: "/examples/react", label: "Demo" },
] as const;

export function Layout() {
  return (
    <>
      <header className="site-header">
        <div className="site-header-inner">
          <NavLink to="/" className="brand" end>
            mediastream-upload
          </NavLink>
          <nav className="nav" aria-label="Primary">
            {links.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={"end" in link ? link.end : false}
                className={({ isActive }) => (isActive ? "active" : undefined)}
              >
                {link.label}
              </NavLink>
            ))}
            <a
              href="https://www.npmjs.com/package/mediastream-upload"
              target="_blank"
              rel="noreferrer"
            >
              npm
            </a>
            <a
              href="https://github.com/akshaypmna18/mediastream-upload"
              target="_blank"
              rel="noreferrer"
            >
              GitHub
            </a>
          </nav>
        </div>
      </header>
      <main className="site-main">
        <Outlet />
      </main>
      <footer className="site-footer">
        MIT ·{" "}
        <a href="https://github.com/akshaypmna18/mediastream-upload">
          akshaypmna18/mediastream-upload
        </a>
      </footer>
    </>
  );
}
