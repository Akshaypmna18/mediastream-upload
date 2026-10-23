import { useEffect, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { DocsCodeBlock } from "../docs/CodeBlock";

const sections = [
  { id: "overview", label: "Overview" },
  { id: "requirements", prefix: "1.", label: "Requirements" },
  { id: "install", prefix: "2.", label: "Install" },
  { id: "camera-backend", prefix: "3.", label: "Camera → backend" },
  { id: "main-pip", prefix: "4.", label: "Main + PiP" },
  { id: "lifecycle", prefix: "5.", label: "Lifecycle" },
  { id: "try-it", prefix: "6.", label: "Try it" },
] as const;

export function GuidePage() {
  const [active, setActive] = useState("overview");
  const [navOpen, setNavOpen] = useState(false);

  useEffect(() => {
    const hash = window.location.hash.replace("#", "");
    if (sections.some((section) => section.id === hash)) setActive(hash);
  }, []);

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
  }, []);

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
        aria-controls="guide-nav"
        onClick={() => setNavOpen((open) => !open)}
      >
        {navOpen ? "Close" : "Guide sections"}
      </button>

      {navOpen && (
        <button
          type="button"
          className="docs-nav-backdrop"
          aria-label="Close guide navigation"
          onClick={() => setNavOpen(false)}
        />
      )}

      <aside className="docs-nav">
        <h2 className="docs-nav-title">Guide</h2>
        <nav id="guide-nav" aria-label="Guide sections">
          {sections.map((section) => (
            <a
              key={section.id}
              href={`#${section.id}`}
              className={[
                "prefix" in section ? "has-n" : undefined,
                active === section.id ? "is-active" : undefined,
              ]
                .filter(Boolean)
                .join(" ") || undefined}
              aria-current={active === section.id ? "location" : undefined}
              onClick={() => setNavOpen(false)}
            >
              {"prefix" in section && <span className="docs-nav-n">{section.prefix}</span>}
              <span>{section.label}</span>
            </a>
          ))}
        </nav>
      </aside>

      <div className="docs-body">
        <article className="docs-article">
          <div className="docs-start">
            <section id="overview" className="docs-section">
              <header className="docs-intro">
                <h1>Guide</h1>
                <p>From install to a working recording session.</p>
                <ul className="hero-badges">
                  <li>TypeScript</li>
                  <li>Browser</li>
                  <li>0 dependencies</li>
                </ul>
              </header>
            </section>

            <section id="requirements" className="docs-req-panel">
              <header>
                <h2>Before you start</h2>
                <p>Make sure your environment meets the following requirements.</p>
              </header>
              <ul className="docs-req">
                <li>
                  <span className="docs-req-ico" aria-hidden="true">
                    <RectangleHorizontalIcon />
                  </span>
                  <h3>Modern browser</h3>
                  <p>With WebM MediaRecorder support (Chrome, Firefox, Edge, Safari).</p>
                </li>
                <li>
                  <span className="docs-req-ico" aria-hidden="true">
                    <Code2Icon />
                  </span>
                  <h3>Required APIs</h3>
                  <p>
                    canvas.captureStream, Web Audio, crypto.subtle (available in
                    modern browsers).
                  </p>
                </li>
                <li>
                  <span className="docs-req-ico" aria-hidden="true">
                    <LockKeyholeIcon />
                  </span>
                  <h3>HTTPS or localhost</h3>
                  <p>Required for camera/microphone access (getUserMedia).</p>
                </li>
              </ul>
            </section>
          </div>

          <div className="docs-steps">
            <section id="install" className="docs-step">
              <h2>1. Install</h2>
              <p>Add the package to your project using your preferred package manager.</p>
              <DocsCodeBlock
                code={INSTALL_CODE}
                language="shell"
                label="Shell"
              />
            </section>

            <section id="camera-backend" className="docs-step">
              <h2>2. Camera → backend</h2>
              <p>
                Record from the camera and upload to your backend (Cloudflare R2
                in this example).
              </p>
              <DocsCodeBlock
                code={CAMERA_BACKEND_CODE}
                language="typescript"
                label="TypeScript"
              />
            </section>

            <section id="main-pip" className="docs-step">
              <h2>3. Main + PiP</h2>
              <p>
                Record a main source (e.g. screen) with an optional camera PiP and
                upload during recording.
              </p>
              <DocsCodeBlock
                code={MAIN_PIP_CODE}
                language="typescript"
                label="TypeScript"
                copyLabel="Copy Main + PiP TypeScript example"
              />
            </section>
          </div>

          <div className="docs-end">
            <section id="lifecycle" className="docs-step">
              <h2>4. Lifecycle</h2>
              <p>Understand the recording session lifecycle and how to handle different scenarios.</p>
              <ol className="docs-life">
                <li>
                  <span className="docs-life-n" aria-hidden="true">1</span>
                  <div>
                    <h3>Start</h3>
                    <p>Begin recording and uploading chunks.</p>
                  </div>
                  <span className="docs-life-arrow" aria-hidden="true">
                    <ArrowRightIcon />
                  </span>
                </li>
                <li>
                  <span className="docs-life-n" aria-hidden="true">2</span>
                  <div>
                    <h3>Recording + Uploading</h3>
                    <p>Capturing, encoding and sending 5 MiB chunks continuously.</p>
                  </div>
                  <span className="docs-life-arrow" aria-hidden="true">
                    <ArrowRightIcon />
                  </span>
                </li>
                <li>
                  <span className="docs-life-n" aria-hidden="true">3</span>
                  <div>
                    <h3>Stop</h3>
                    <p>Call stop() at the end of the session.</p>
                  </div>
                  <span className="docs-life-arrow" aria-hidden="true">
                    <ArrowRightIcon />
                  </span>
                </li>
                <li>
                  <span className="docs-life-n" aria-hidden="true">4</span>
                  <div>
                    <h3>Finalize</h3>
                    <p>Patches metadata (SeekHead, Cues, Duration).</p>
                  </div>
                </li>
              </ol>
              <ul className="docs-advice">
                <li>
                  <span className="docs-advice-ico docs-advice-ok" aria-hidden="true">
                    <CircleCheckIcon />
                  </span>
                  <div>
                    <h3>Explicit stop</h3>
                    <p>Prefer calling stop() at natural session end.</p>
                  </div>
                </li>
                <li>
                  <span className="docs-advice-ico docs-advice-warn" aria-hidden="true">
                    <XIcon />
                  </span>
                  <div>
                    <h3>Destroy on unmount</h3>
                    <p>Call destroy() on unexpected unmount (aborts staged upload).</p>
                  </div>
                </li>
                <li>
                  <span className="docs-advice-ico docs-advice-ok" aria-hidden="true">
                    <WifiIcon />
                  </span>
                  <div>
                    <h3>Handle backpressure</h3>
                    <p>If silent gaps are not acceptable, pause your product session.</p>
                  </div>
                </li>
              </ul>
            </section>

            <section id="try-it" className="docs-step">
              <h2>5. Try it</h2>
              <p>See it in action or implement your own backend.</p>
              <div className="docs-try">
                <div className="docs-try-item">
                  <Link className="btn btn-primary" to="/examples/react">
                    <PlayIcon />
                    Live React demo
                    <ArrowRightIcon />
                  </Link>
                  <p>Try a full working example in the browser.</p>
                </div>
                <div className="docs-try-item">
                  <Link className="btn" to="/backend">
                    <Code2Icon />
                    Implement a backend
                    <ArrowRightIcon />
                  </Link>
                  <p>Use your own storage (R2, S3 or custom).</p>
                </div>
              </div>
            </section>
          </div>
        </article>

        <aside className="docs-aside" aria-label="Guide summary">
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
      </div>
    </div>
  );
}

const INSTALL_CODE = "pnpm add mediastream-upload";

const CAMERA_BACKEND_CODE = `import { ChunkRecorder, UnsupportedBrowserError } from "mediastream-upload";
import { createR2Backend } from "mediastream-upload/adapters/r2";

const stream = await navigator.mediaDevices.getUserMedia({
  video: true,
  audio: true,
});

const recorder = new ChunkRecorder({
  onStateChange: (s) => {
    /* update UI */
  },
  // debug: true, // or custom LogHandler
});

try {
  await recorder.start({
    sources: { main: stream },
    backend: createR2Backend("https://your-worker.example.com"),
    // Optional overrides:
    // canvasWidth: 1280,
    // canvasHeight: 720,
    // fps: 30,
  });
} catch (err) {
  if (err instanceof UnsupportedBrowserError) {
    // Fall back to your legacy end-of-session upload
  }
  throw err;
}

// … later, from a user gesture / session end button:
const { videoUrl, localBlob } = await recorder.stop();`;

const MAIN_PIP_CODE = `await recorder.start({
  sources: {
    main: screenStream,
    pip: cameraStream,
  },
  backend,
  pipPosition: "bottom-right", // default: top-left
  playbackToSpeakers: false,
});`;

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

function RectangleHorizontalIcon() {
  return (
    <Glyph>
      <rect width="20" height="12" x="2" y="6" rx="2" />
    </Glyph>
  );
}

function Code2Icon() {
  return (
    <Glyph>
      <path d="m18 16 4-4-4-4" />
      <path d="m6 8-4 4 4 4" />
      <path d="m14.5 4-5 16" />
    </Glyph>
  );
}

function LockKeyholeIcon() {
  return (
    <Glyph>
      <circle cx="12" cy="16" r="1" />
      <rect width="18" height="12" x="3" y="10" rx="2" />
      <path d="M7 10V7a5 5 0 0 1 10 0v3" />
    </Glyph>
  );
}

function ArrowRightIcon() {
  return (
    <Glyph>
      <path d="M5 12h14" />
      <path d="m12 5 7 7-7 7" />
    </Glyph>
  );
}

function CircleCheckIcon() {
  return (
    <Glyph>
      <circle cx="12" cy="12" r="10" />
      <path d="m9 12 2 2 4-4" />
    </Glyph>
  );
}

function XIcon() {
  return (
    <Glyph>
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </Glyph>
  );
}

function WifiIcon() {
  return (
    <Glyph>
      <path d="M12 20h.01" />
      <path d="M2 8.82a15 15 0 0 1 20 0" />
      <path d="M5 12.86a10 10 0 0 1 14 0" />
      <path d="M8.5 16.43a5 5 0 0 1 7 0" />
    </Glyph>
  );
}

function PlayIcon() {
  return (
    <Glyph>
      <polygon points="6 3 20 12 6 21 6 3" fill="currentColor" />
    </Glyph>
  );
}