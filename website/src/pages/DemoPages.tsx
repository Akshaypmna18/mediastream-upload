import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { useDemoRecorder } from "../demo/useDemoRecorder";

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

  useEffect(() => {
    const el = previewRef.current;
    if (!el) return;
    el.srcObject = stream;
    if (stream) void el.play().catch(() => undefined);
  }, [stream]);

  return (
    <article className="demo-panel">
      <div className="prose">
        <h1>{title}</h1>
        <p className="lead">{blurb}</p>
        <p className="note">
          Default backend is in-memory (mock). Open DevTools → Network, click
          Start, and watch chunk uploads. For a real API:{" "}
          <code>?backend=http://127.0.0.1:8787</code> after{" "}
          <code>pnpm example:backend</code>.
        </p>
      </div>

      <div className="cta-row">
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => void start()}
          disabled={busy}
        >
          Start
        </button>
        <button
          type="button"
          className="btn"
          onClick={() => void stop()}
          disabled={!busy}
        >
          Stop
        </button>
        <button type="button" className="btn" onClick={destroy} disabled={!busy}>
          Destroy
        </button>
      </div>

      <div className="demo-status">
        state: {state} · backend: {backendLabel}
        {error ? ` · ${error}` : ""}
      </div>

      <video ref={previewRef} playsInline muted />
      {videoUrl ? <video src={videoUrl} controls playsInline /> : null}

      <p className="note">
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
