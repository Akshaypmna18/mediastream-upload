import { useEffect, useState, type ReactNode } from "react";

export type DocsNavSection = {
  id: string;
  label: string;
  prefix?: string;
};

export function DocsLayout({
  title,
  navId,
  navLabel,
  sections,
  children,
}: {
  title: string;
  navId: string;
  navLabel: string;
  sections: readonly DocsNavSection[];
  children: ReactNode;
}) {
  const [active, setActive] = useState(sections[0]?.id ?? "");
  const [navOpen, setNavOpen] = useState(false);

  useEffect(() => {
    const hash = window.location.hash.replace("#", "");
    if (sections.some((section) => section.id === hash)) setActive(hash);
  }, [sections]);

  useEffect(() => {
    const nodes = sections
      .map((section) => document.getElementById(section.id))
      .filter((node): node is HTMLElement => node !== null);
    if (nodes.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]?.target.id) setActive(visible[0].target.id);
      },
      { rootMargin: "-15% 0px -70% 0px", threshold: [0, 0.1] },
    );

    nodes.forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, [sections]);

  useEffect(() => {
    if (!navOpen) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setNavOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [navOpen]);

  return (
    <div className={navOpen ? "docs is-nav-open" : "docs"}>
      <button
        type="button"
        className="docs-nav-toggle"
        aria-expanded={navOpen}
        aria-controls={navId}
        onClick={() => setNavOpen((open) => !open)}
      >
        {navOpen ? "Close" : navLabel}
      </button>

      {navOpen && (
        <button
          type="button"
          className="docs-nav-backdrop"
          aria-label={`Close ${title} navigation`}
          onClick={() => setNavOpen(false)}
        />
      )}

      <aside className="docs-nav">
        <h2 className="docs-nav-title">{title}</h2>
        <nav id={navId} aria-label={navLabel}>
          {sections.map((section) => (
            <a
              key={section.id}
              href={`#${section.id}`}
              className={[
                section.prefix ? "has-n" : undefined,
                active === section.id ? "is-active" : undefined,
              ]
                .filter(Boolean)
                .join(" ") || undefined}
              aria-current={active === section.id ? "location" : undefined}
              onClick={() => setNavOpen(false)}
            >
              {section.prefix && <span className="docs-nav-n">{section.prefix}</span>}
              <span>{section.label}</span>
            </a>
          ))}
        </nav>
      </aside>

      <div className="docs-body">
        {children}
        <DocsSummaryAside />
      </div>
    </div>
  );
}

function DocsSummaryAside() {
  return (
    <aside className="docs-aside" aria-label="Summary">
      <section className="docs-card">
        <h3>Key concepts</h3>
        <ul>
          <li>
            <span className="docs-ico docs-ico-green" aria-hidden="true">
              <ZapIcon />
            </span>
            <div>
              <h4>Incremental upload</h4>
              <p>Upload 5 MiB chunks while recording.</p>
            </div>
          </li>
          <li>
            <span className="docs-ico docs-ico-green" aria-hidden="true">
              <CirclePlayIcon />
            </span>
            <div>
              <h4>Seekable WebM</h4>
              <p>Generates Duration, SeekHead and Cues.</p>
            </div>
          </li>
          <li>
            <span className="docs-ico docs-ico-green" aria-hidden="true">
              <SettingsIcon />
            </span>
            <div>
              <h4>Backend-agnostic</h4>
              <p>Implement your own backend with a simple four-method contract.</p>
            </div>
          </li>
          <li>
            <span className="docs-ico docs-ico-green" aria-hidden="true">
              <ShieldIcon />
            </span>
            <div>
              <h4>Retry &amp; backpressure</h4>
              <p>Automatic retries and handles network backpressure.</p>
            </div>
          </li>
        </ul>
      </section>
      <section className="docs-card">
        <h3>At a glance</h3>
        <ul>
          <li>
            <span className="docs-ico" aria-hidden="true">
              <BoxIcon />
            </span>
            <div>
              <h4>5 MiB</h4>
              <p>Chunk size (default)</p>
            </div>
          </li>
          <li>
            <span className="docs-ico" aria-hidden="true">
              <FileIcon />
            </span>
            <div>
              <h4>WebM</h4>
              <p>VP9 / VP8 + Opus</p>
            </div>
          </li>
          <li>
            <span className="docs-ico" aria-hidden="true">
              <GlobeIcon />
            </span>
            <div>
              <h4>Modern browsers</h4>
              <p>Chrome, Firefox, Edge, Safari</p>
            </div>
          </li>
          <li>
            <span className="docs-ico" aria-hidden="true">
              <CodeIcon />
            </span>
            <div>
              <h4>TypeScript</h4>
              <p>Full types included</p>
            </div>
          </li>
        </ul>
      </section>
    </aside>
  );
}

function Glyph({ children }: { children: ReactNode }) {
  return (
    <svg
      className="docs-glyph"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {children}
    </svg>
  );
}

function ZapIcon() {
  return (
    <Glyph>
      <path d="M4 14 14 3v7h6L10 21v-7z" />
    </Glyph>
  );
}

function CirclePlayIcon() {
  return (
    <Glyph>
      <circle cx="12" cy="12" r="10" />
      <polygon points="10 8 16 12 10 16 10 8" />
    </Glyph>
  );
}

function SettingsIcon() {
  return (
    <Glyph>
      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
      <circle cx="12" cy="12" r="3" />
    </Glyph>
  );
}

function ShieldIcon() {
  return (
    <Glyph>
      <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
    </Glyph>
  );
}

function BoxIcon() {
  return (
    <Glyph>
      <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
      <path d="m3.3 7 8.7 5 8.7-5" />
      <path d="M12 22V12" />
    </Glyph>
  );
}

function FileIcon() {
  return (
    <Glyph>
      <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
      <path d="M14 2v4a2 2 0 0 0 2 2h4" />
    </Glyph>
  );
}

function GlobeIcon() {
  return (
    <Glyph>
      <circle cx="12" cy="12" r="10" />
      <path d="M2 12h20" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </Glyph>
  );
}

function CodeIcon() {
  return (
    <Glyph>
      <path d="m16 18 6-6-6-6" />
      <path d="m8 6-6 6 6 6" />
    </Glyph>
  );
}
