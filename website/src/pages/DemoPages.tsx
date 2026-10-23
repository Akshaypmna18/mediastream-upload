import { useEffect, useRef, type ReactNode } from "react";
import { Link } from "react-router-dom";
import type { ChunkRecorderState } from "mediastream-upload";
import { useDemoRecorder } from "../demo/useDemoRecorder";

const START_STATES = new Set<ChunkRecorderState>([
  "idle",
  "completed",
  "failed",
  "cancelled",
]);
const STOP_STATES = new Set<ChunkRecorderState>([
  "recording",
  "degraded",
  "backpressured",
]);
const DESTROY_STATES = new Set<ChunkRecorderState>([
  "idle",
  "initializing",
  "recording",
  "degraded",
  "backpressured",
  "completed",
  "failed",
]);

type DemoPageProps = {
  title: string;
  blurb: string;
};

function DemoShell({ title, blurb }: DemoPageProps) {
  const {
    state,
    error,
    videoUrl,
    stream,
    backendLabel,
    busy,
    start,
    stop,
    destroy,
  } = useDemoRecorder();

  const previewRef = useRef<HTMLVideoElement>(null);
  const live = Boolean(stream);
  const playback = Boolean(videoUrl) && !stream;

  useEffect(() => {
    const el = previewRef.current;
    if (!el) return;
    el.srcObject = stream;
    if (stream) void el.play().catch(() => undefined);
  }, [stream]);

  return (
    <article className="demo-page">
      <header className="demo-intro">
        <h1>{title}</h1>
        <p>{blurb}</p>
      </header>

      <aside className="demo-banner">
        Default backend is in-memory (mock). Open DevTools → Network, click
        Start, and watch chunk uploads. For a real API:{" "}
        <code>?backend=http://127.0.0.1:8787</code> after{" "}
        <code>pnpm example:backend</code>.
      </aside>

      <div className="demo-controls">
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => void start()}
          disabled={busy || !START_STATES.has(state)}
        >
          <PlayIcon />
          Start
        </button>
        <button
          type="button"
          className="btn"
          onClick={() => void stop()}
          disabled={!STOP_STATES.has(state)}
        >
          <StopIcon />
          Stop
        </button>
        <button
          type="button"
          className="btn"
          onClick={destroy}
          disabled={!DESTROY_STATES.has(state)}
        >
          <TrashIcon />
          Destroy
        </button>
      </div>

      <div
        className="demo-status"
        role="status"
        aria-live="polite"
        data-state={state}
      >
        <p>
          state: <span className="demo-state">{state}</span>
          {" · "}
          backend: {backendLabel}
          {error ? ` · ${error}` : ""}
        </p>
      </div>

      <section className="demo-preview" aria-label="Recording preview">
        {live ? (
          <video ref={previewRef} playsInline muted />
        ) : playback ? (
          <video src={videoUrl ?? undefined} controls playsInline />
        ) : (
          <div className="demo-preview-empty">
            {busy && state === "idle" ? (
              <p>Initializing…</p>
            ) : state === "initializing" ? (
              <p>Initializing…</p>
            ) : state === "finalizing" ? (
              <p>Finalizing…</p>
            ) : state === "failed" ? (
              <p>{error ?? "Recording failed"}</p>
            ) : state === "cancelled" ? (
              <p>Session cancelled</p>
            ) : (
              <>
                <VideoIcon />
                <p>Click Start to begin recording</p>
              </>
            )}
          </div>
        )}
      </section>

      <p className="demo-foot">
        Also see <Link to="/guide">Guide</Link> and{" "}
        <Link to="/backend">Backend</Link>.
      </p>
    </article>
  );
}

export function ReactDemoPage() {
  return (
    <DemoShell
      title="Live demo"
      blurb="Interactive recorder in the browser. Same headless ChunkRecorder API — thin React wiring only."
    />
  );
}

export function VanillaWalkthroughPage() {
  return (
    <article className="prose">
      <h1>Vanilla example</h1>
      <p className="lead">
        Same behavior without a framework — plain HTML + ES modules in the
        repo.
      </p>

      <h2>What it shows</h2>
      <ul>
        <li>Camera → mock or live backend via <code>?backend=</code></li>
        <li>Start / Stop / Destroy controls</li>
        <li>State line + preview + result playback</li>
      </ul>

      <h2>Run locally</h2>
      <pre>{`pnpm install
pnpm build
pnpm dlx serve .
# → /examples/vanilla-js/
# optional: ?backend=http://127.0.0.1:8787`}</pre>

      <div className="cta-row">
        <Link className="btn btn-primary" to="/examples/react">
          Open live demo instead
        </Link>
        <a
          className="btn"
          href="https://github.com/akshaypmna18/mediastream-upload/tree/main/examples/vanilla-js"
          target="_blank"
          rel="noreferrer"
        >
          View vanilla-js on GitHub
        </a>
      </div>

      <p className="note">
        The hosted interactive demo uses the same library API as vanilla; use
        that page to validate Network-tab chunking without cloning.
      </p>
    </article>
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
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

function PlayIcon() {
  return (
    <Glyph>
      <polygon points="6 3 20 12 6 21 6 3" fill="currentColor" />
    </Glyph>
  );
}

function StopIcon() {
  return (
    <Glyph>
      <rect width="14" height="14" x="5" y="5" rx="1" fill="currentColor" />
    </Glyph>
  );
}

function TrashIcon() {
  return (
    <Glyph>
      <path d="M3 6h18" />
      <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
      <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
      <line x1="10" x2="10" y1="11" y2="17" />
      <line x1="14" x2="14" y1="11" y2="17" />
    </Glyph>
  );
}

function VideoIcon() {
  return (
    <svg
      className="demo-preview-ico"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m16 13 5.223 3.482a.5.5 0 0 0 .777-.416V7.87a.5.5 0 0 0-.752-.432L16 10.5" />
      <rect x="2" y="6" width="14" height="12" rx="2" />
    </svg>
  );
}
