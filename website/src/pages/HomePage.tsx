import { useState, type ReactNode } from "react";
import { Link } from "react-router-dom";

const github = "https://github.com/akshaypmna18/mediastream-upload";
const npm = "https://www.npmjs.com/package/mediastream-upload";

/* Star count is paused. Restore useStarCount and the chip below when ready.
function useStarCount() {
  const [stars, setStars] = useState<number | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetch("https://api.github.com/repos/akshaypmna18/mediastream-upload", {
      signal: controller.signal,
    })
      .then((response) => (response.ok ? response.json() : null))
      .then((data: { stargazers_count?: number } | null) => {
        if (typeof data?.stargazers_count === "number") setStars(data.stargazers_count);
      })
      .catch(() => {
        // hide the chip when the count is unavailable
      });
    return () => controller.abort();
  }, []);

  return stars;
}
*/

export function HomePage() {

  return (
    <>
    <article className="shell home">
      <section className="hero" aria-labelledby="hero-title">
        <div className="hero-copy">
          <ul className="hero-badges">
            <li>TypeScript</li>
            <li>Browser</li>
            <li>0 dependencies</li>
          </ul>
          <h1 id="hero-title">
            Upload while
            <br />
            you <span>record.</span>
          </h1>
          <p>
            Record MediaStreams in the browser and upload them as seekable WebM
            chunks in real time — no large upload at the end.
          </p>
          <div className="hero-actions">
            <Link className="btn btn-primary" to="/examples/react">
              <PlayIcon />
              Try live demo
              <ArrowIcon />
            </Link>
            <Link className="btn" to="/guide">
              Get started
              <ArrowIcon />
            </Link>
          </div>
          <div className="hero-links">
            <a href={github}>
              <GitHubIcon />
              GitHub
            </a>
            <span className="hero-link-sep" aria-hidden="true" />
            <a href={npm}>
              <NpmIcon />
              npm
            </a>
            {/*
            {stars !== null && (
              <>
                <span className="hero-link-sep" aria-hidden="true" />
                <a className="star-chip" href={github}>
                  <StarIcon />
                  {stars.toLocaleString("en-US")}
                </a>
              </>
            )}
            */}
          </div>
        </div>

        <div className="hero-panel">
          <ol className="flow" aria-label="How it works">
            <li className="step">
              <p className="step-title">
                MediaStream
                <span>main source</span>
              </p>
              <ul className="step-list">
                <li>
                  <CameraIcon /> Camera
                </li>
                <li>
                  <ScreenIcon /> Screen
                </li>
                <li>
                  <VideoIcon /> Video element
                </li>
              </ul>
            </li>
            <li className="flow-arrow" aria-hidden="true">
              <ArrowIcon />
            </li>
            <li className="step">
              <p className="step-title">
                Compose
                <span>optional PiP</span>
              </p>
              <div className="pip">
                <FrameIcon />
                <span className="pip-badge" aria-hidden="true">
                  <VideoIcon />
                </span>
              </div>
              <p className="step-caption">Main + PiP</p>
            </li>
            <li className="flow-arrow" aria-hidden="true">
              <ArrowIcon />
            </li>
            <li className="step">
              <p className="step-title">WebM Recorder</p>
              <div className="step-glyph">
                <FileIcon />
              </div>
              <p className="step-caption">VP9 / VP8 / Opus</p>
            </li>
            <li className="flow-arrow" aria-hidden="true">
              <ArrowIcon />
            </li>
            <li className="step">
              <p className="step-title">5 MiB chunks</p>
              <div className="step-glyph chunks" aria-hidden="true">
                <span />
                <span />
                <span />
              </div>
              <p className="step-caption">Upload while recording</p>
            </li>
            <li className="flow-arrow" aria-hidden="true">
              <ArrowIcon />
            </li>
            <li className="step">
              <p className="step-title">
                Backend
                <span>your storage</span>
              </p>
              <div className="step-glyph">
                <CloudIcon />
              </div>
              <p className="step-caption">
                R2 / S3
                <span>or custom</span>
              </p>
            </li>
          </ol>

          <div className="compare">
            <p className="compare-label">Traditional recording flow</p>
            <div className="compare-row">
              <p className="bar bar-record">Record (10 min)</p>
              <p className="bar bar-wait">Upload (~50 sec)</p>
              <p className="compare-note">User waits for the upload to complete</p>
            </div>
            <p className="compare-label">With mediastream-upload</p>
            <div className="compare-row">
              <p className="bar bar-live">Record + Upload simultaneously (10 min)</p>
              <p className="bar bar-done">Finalize (~1–2 sec)</p>
              <p className="compare-note">Minimal wait after recording</p>
            </div>
            <p className="compare-disclaimer">
              Upload duration varies with encoded bitrate, network throughput, and
              backend performance. The ~50 sec value is an illustrative example,
              not a guaranteed benchmark.
            </p>
          </div>

          <ul className="legend">
            <li>
              <span className="dot dot-record" aria-hidden="true" />
              <span>
                Recording
                <small>Capturing and encoding</small>
              </span>
            </li>
            <li>
              <span className="dot dot-upload" aria-hidden="true" />
              <span>
                Uploading
                <small>Sending chunks (5 MiB)</small>
              </span>
            </li>
            <li>
              <span className="dot dot-final" aria-hidden="true" />
              <span>
                Finalizing
                <small>Patching metadata (SeekHead, Cues, Duration)</small>
              </span>
            </li>
          </ul>
        </div>
      </section>

      <section className="features" aria-labelledby="features-title">
        <header className="features-head">
          <h2 id="features-title">Why choose mediastream-upload?</h2>
          <p>
            A production-ready approach to browser media recording and incremental
            upload.
          </p>
        </header>
        <ul className="feature-grid">
          <li>
            <article className="feature-card">
              <span className="feature-icon" aria-hidden="true">
                <ZapIcon />
              </span>
              <div>
                <h3>Incremental upload</h3>
                <p>Upload 5 MiB chunks while recording. No large upload at the end.</p>
              </div>
            </article>
          </li>
          <li>
            <article className="feature-card">
              <span className="feature-icon" aria-hidden="true">
                <CirclePlayIcon />
              </span>
              <div>
                <h3>Seekable WebM</h3>
                <p>Generates proper Duration, SeekHead and Cues for a seekable file.</p>
              </div>
            </article>
          </li>
          <li>
            <article className="feature-card">
              <span className="feature-icon" aria-hidden="true">
                <VideoCamIcon />
              </span>
              <div>
                <h3>PiP composition</h3>
                <p>
                  Combine the main source with optional camera or screen PiP in
                  real time.
                </p>
              </div>
            </article>
          </li>
          <li>
            <article className="feature-card">
              <span className="feature-icon" aria-hidden="true">
                <ShieldCheckIcon />
              </span>
              <div>
                <h3>Retry &amp; backpressure</h3>
                <p>
                  Automatic retries, exponential backoff and network backpressure
                  handling.
                </p>
              </div>
            </article>
          </li>
          <li>
            <article className="feature-card">
              <span className="feature-icon" aria-hidden="true">
                <BoxIcon />
              </span>
              <div>
                <h3>R2 / S3 adapters</h3>
                <p>
                  HTTP clients for your R2- or S3-shaped API — not the cloud SDKs
                  themselves.
                </p>
              </div>
            </article>
          </li>
          <li>
            <article className="feature-card">
              <span className="feature-icon" aria-hidden="true">
                <SettingsIcon />
              </span>
              <div>
                <h3>Backend-agnostic</h3>
                <p>Implement your own backend with a simple four-method contract.</p>
              </div>
            </article>
          </li>
        </ul>
      </section>

      <QuickStartSection />
    </article>
    <footer className="home-footer">
      <div className="shell">
        <ul className="stats">
          <li>
            <CodeStatIcon />
            <span>
              <strong>0</strong>
              Runtime dependencies
            </span>
          </li>
          <li>
            <BoxIcon />
            <span>
              <strong>5 MiB</strong>
              Chunk size (default)
            </span>
          </li>
          <li>
            <WifiIcon />
            <span>
              <strong>3</strong>
              Retry attempts
            </span>
          </li>
          <li>
            <FileStatIcon />
            <span>
              <strong>WebM</strong>
              VP9 / VP8 + Opus
            </span>
          </li>
          <li>
            <GlobeIcon />
            <span>
              <strong>Modern browsers</strong>
              Chrome, Firefox, Edge, Safari
            </span>
          </li>
          <li>
            <LockIcon />
            <span>
              <strong>MIT</strong>
              Open source
            </span>
          </li>
        </ul>
      </div>
    </footer>
    </>
  );
}

const QUICK_START = `import { ChunkRecorder } from "mediastream-upload";
import { createR2Backend } from "mediastream-upload/adapters/r2";

const stream = await navigator.mediaDevices.getUserMedia({
  video: true,
  audio: true,
});

const recorder = new ChunkRecorder({ onStateChange: console.log });

await recorder.start({
  sources: { main: stream },
  backend: createR2Backend("https://your-api.example.com"),
});

const { videoUrl, localBlob } = await recorder.stop();`;

const QUICK_START_LINES = QUICK_START.split("\n");

function QuickStartSection() {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(QUICK_START);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      /* leave the button as Copy if clipboard is blocked */
    }
  }

  return (
    <section className="start" aria-labelledby="quick-start-title">
      <div className="start-grid">
        <div className="start-code">
          <header>
            <h2 id="quick-start-title">Quick start</h2>
            <p>Start recording and uploading in a few lines of code.</p>
          </header>
          <div className="code-card">
            <div className="code-toolbar">
              <span className="code-badge">TypeScript</span>
              <button
                type="button"
                className="code-copy"
                onClick={copy}
                aria-label="Copy quick-start TypeScript example"
              >
                {copied ? <CheckIcon /> : <CopyIcon />}
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
            <pre className="code-body">
              {QUICK_START_LINES.map((line, index) => (
                <span className="code-line" key={index}>
                  <span className="code-n">{index + 1}</span>
                  <span>{highlightLine(line)}</span>
                </span>
              ))}
            </pre>
          </div>
        </div>

        <div className="start-caps">
          <header>
            <h2>What you get</h2>
            <p>A lightweight, TypeScript-first library with a simple API.</p>
          </header>
          <ul className="cap-list">
            <li>
              <span className="cap-icon" aria-hidden="true">
                <LayersIcon />
              </span>
              <div>
                <h3>ChunkRecorder</h3>
                <p>start(), stop(), destroy(), getState(), getEmergencyBlob()</p>
              </div>
            </li>
            <li>
              <span className="cap-icon" aria-hidden="true">
                <ShieldCheckIcon />
              </span>
              <div>
                <h3>Zero dependencies</h3>
                <p>Works in modern browsers. No runtime dependencies.</p>
              </div>
            </li>
            <li>
              <span className="cap-icon" aria-hidden="true">
                <TsMark />
              </span>
              <div>
                <h3>TypeScript</h3>
                <p>Full TypeScript support and types.</p>
              </div>
            </li>
            <li>
              <span className="cap-icon" aria-hidden="true">
                <MonitorIcon />
              </span>
              <div>
                <h3>Flexible sources</h3>
                <p>MediaStream, camera, screen or compatible video element.</p>
              </div>
            </li>
            <li>
              <span className="cap-icon" aria-hidden="true">
                <SettingsIcon />
              </span>
              <div>
                <h3>Configurable recording</h3>
                <p>Resolution, frame rate, MIME type, chunk size and more.</p>
              </div>
            </li>
            <li>
              <span className="cap-icon" aria-hidden="true">
                <LockKeyIcon />
              </span>
              <div>
                <h3>Seekable output</h3>
                <p>Seekable WebM with proper metadata for smooth playback.</p>
              </div>
            </li>
          </ul>
        </div>
      </div>
    </section>
  );
}

function highlightLine(line: string): ReactNode {
  if (line.trim().startsWith("//")) {
    return <span className="tok-c">{line}</span>;
  }

  const tokens = line.split(/("(?:[^"\\]|\\.)*"|[A-Za-z_][\w]*|\s+|.)/g).filter(Boolean);
  return tokens.map((token, index) => {
    if (token.startsWith('"')) return <span className="tok-s" key={index}>{token}</span>;
    if (/^(import|from|const|await|new|true)$/.test(token)) {
      return <span className="tok-k" key={index}>{token}</span>;
    }
    if (token === "ChunkRecorder") return <span className="tok-t" key={index}>{token}</span>;
    if (/^(createR2Backend|getUserMedia|start|stop)$/.test(token)) {
      return <span className="tok-f" key={index}>{token}</span>;
    }
    return token;
  });
}

function ArrowIcon() {
  return (
    <svg className="icon" viewBox="0 0 16 16" aria-hidden="true">
      <path
        d="M3 8h10M9 4l4 4-4 4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function PlayIcon() {
  return (
    <svg className="icon" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M5.5 3.8v8.4L12.4 8 5.5 3.8Z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/* function StarIcon() {
  return (
    <svg className="icon" viewBox="0 0 16 16" aria-hidden="true">
      <path
        fill="currentColor"
        d="m8 1.8 1.7 3.6 4 .5-2.9 2.7.8 3.9L8 10.6 4.4 12.5l.8-3.9L2.3 5.9l4-.5L8 1.8Z"
      />
    </svg>
  );
} */

function CameraIcon() {
  return (
    <svg className="icon" viewBox="0 0 16 16" aria-hidden="true">
      <path
        d="M2 5.5h7.2v6H2v-6Zm7.2 1.6 4.8-2v7l-4.8-2v-3Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ScreenIcon() {
  return (
    <svg className="icon" viewBox="0 0 16 16" aria-hidden="true">
      <rect
        x="2"
        y="3"
        width="12"
        height="8"
        rx="1"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
      />
      <path d="M6 13h4M8 11v2" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}

function VideoIcon() {
  return (
    <svg className="icon" viewBox="0 0 16 16" aria-hidden="true">
      <rect
        x="2"
        y="3.5"
        width="12"
        height="9"
        rx="1.2"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
      />
      <path d="M7 6.2v3.6L10.2 8 7 6.2Z" fill="currentColor" />
    </svg>
  );
}

function FrameIcon() {
  return (
    <svg viewBox="0 0 48 36" aria-hidden="true">
      <rect x="1" y="1" width="46" height="34" rx="4" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M6 28 16 16l8 8 6-5 12 9"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <circle cx="14" cy="11" r="2.2" fill="currentColor" />
    </svg>
  );
}

function FileIcon() {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true">
      <path
        d="M8 4h11l6 6v18H8V4Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path d="M19 4v6h6" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M12 20h2.2l1.2-3 1.5 5 1.4-2H22"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CloudIcon() {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true">
      <path
        d="M10 22h12.2a4.2 4.2 0 0 0 .4-8.4 6 6 0 0 0-11.5-1.5A4 4 0 0 0 10 22Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M16 15v7M13.5 17.2 16 14.8l2.5 2.4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function FeatureGlyph({ children }: { children: ReactNode }) {
  return (
    <svg
      className="feature-glyph"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

function ZapIcon() {
  return (
    <FeatureGlyph>
      <path d="M4 14 14 3v7h6L10 21v-7z" />
    </FeatureGlyph>
  );
}

function CirclePlayIcon() {
  return (
    <FeatureGlyph>
      <circle cx="12" cy="12" r="10" />
      <polygon points="10 8 16 12 10 16 10 8" />
    </FeatureGlyph>
  );
}

function VideoCamIcon() {
  return (
    <FeatureGlyph>
      <path d="m16 13 5.223 3.482a.5.5 0 0 0 .777-.416V7.87a.5.5 0 0 0-.752-.432L16 10.5" />
      <rect x="2" y="6" width="14" height="12" rx="2" />
    </FeatureGlyph>
  );
}

function ShieldCheckIcon() {
  return (
    <FeatureGlyph>
      <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
      <path d="m9 12 2 2 4-4" />
    </FeatureGlyph>
  );
}

function BoxIcon() {
  return (
    <FeatureGlyph>
      <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
      <path d="m3.3 7 8.7 5 8.7-5" />
      <path d="M12 22V12" />
    </FeatureGlyph>
  );
}

function SettingsIcon() {
  return (
    <FeatureGlyph>
      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
      <circle cx="12" cy="12" r="3" />
    </FeatureGlyph>
  );
}

function LayersIcon() {
  return (
    <FeatureGlyph>
      <path d="M12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.09a1 1 0 0 0 0 1.82l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z" />
      <path d="M2 12.03 8.59 15a2 2 0 0 0 1.66 0L17 12" />
      <path d="M2 17.03 8.59 20a2 2 0 0 0 1.66 0L17 17" />
    </FeatureGlyph>
  );
}

function MonitorIcon() {
  return (
    <FeatureGlyph>
      <rect width="20" height="14" x="2" y="3" rx="2" />
      <path d="M8 21h8" />
      <path d="M12 17v4" />
    </FeatureGlyph>
  );
}

function LockKeyIcon() {
  return (
    <FeatureGlyph>
      <rect width="18" height="11" x="3" y="11" rx="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
      <circle cx="12" cy="16" r="1" />
    </FeatureGlyph>
  );
}

function TsMark() {
  return (
    <svg className="ts-mark" viewBox="0 0 24 24" aria-hidden="true">
      <rect width="24" height="24" rx="4" fill="currentColor" />
      <text
        x="12"
        y="16.5"
        textAnchor="middle"
        fill="#fff"
        fontSize="9"
        fontWeight="700"
        fontFamily="Inter, sans-serif"
      >
        TS
      </text>
    </svg>
  );
}

function CopyIcon() {
  return (
    <FeatureGlyph>
      <rect width="14" height="14" x="8" y="8" rx="2" />
      <path d="M4 16V6a2 2 0 0 1 2-2h10" />
    </FeatureGlyph>
  );
}

function CheckIcon() {
  return (
    <FeatureGlyph>
      <path d="M20 6 9 17l-5-5" />
    </FeatureGlyph>
  );
}

function CodeStatIcon() {
  return (
    <FeatureGlyph>
      <path d="m16 18 6-6-6-6" />
      <path d="m8 6-6 6 6 6" />
    </FeatureGlyph>
  );
}

function WifiIcon() {
  return (
    <FeatureGlyph>
      <path d="M12 20h.01" />
      <path d="M2 8.82a15 15 0 0 1 20 0" />
      <path d="M5 12.86a10 10 0 0 1 14 0" />
      <path d="M8.5 16.43a5 5 0 0 1 7 0" />
    </FeatureGlyph>
  );
}

function FileStatIcon() {
  return (
    <FeatureGlyph>
      <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
      <path d="M14 2v4a2 2 0 0 0 2 2h4" />
    </FeatureGlyph>
  );
}

function GlobeIcon() {
  return (
    <FeatureGlyph>
      <circle cx="12" cy="12" r="10" />
      <path d="M2 12h20" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </FeatureGlyph>
  );
}

function LockIcon() {
  return (
    <FeatureGlyph>
      <rect width="18" height="11" x="3" y="11" rx="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </FeatureGlyph>
  );
}

function GitHubIcon() {
  return (
    <svg className="icon" viewBox="0 0 16 16" aria-hidden="true">
      <path
        fill="currentColor"
        d="M8 1.2a6.8 6.8 0 0 0-2.15 13.25c.34.06.46-.15.46-.33v-1.16c-1.88.41-2.28-.9-2.28-.9-.3-.78-.75-1-.75-1-.62-.42.05-.41.05-.41.68.05 1.04.7 1.04.7.6 1.04 1.58.74 1.97.56.06-.44.24-.74.43-.91-1.5-.17-3.08-.75-3.08-3.34 0-.74.26-1.34.7-1.81-.07-.17-.3-.87.06-1.81 0 0 .56-.18 1.85.69a6.4 6.4 0 0 1 3.36 0c1.29-.87 1.85-.69 1.85-.69.36.94.13 1.64.06 1.81.44.47.7 1.07.7 1.81 0 2.6-1.58 3.17-3.09 3.34.25.21.46.63.46 1.28v1.9c0 .18.12.4.47.33A6.8 6.8 0 0 0 8 1.2Z"
      />
    </svg>
  );
}

function NpmIcon() {
  return (
    <svg className="icon" viewBox="0 0 16 16" aria-hidden="true">
      <rect x="1.5" y="1.5" width="13" height="13" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.3" />
      <path d="M4 11V5h2.2v4.2h1.1V5H11v6H4Z" fill="currentColor" />
    </svg>
  );
}
