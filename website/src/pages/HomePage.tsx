import { Link } from "react-router-dom";

export function HomePage() {
  return (
    <article className="prose">
      <h1>mediastream-upload</h1>
      <p className="lead">
        Composite live browser <code>MediaStream</code>s and upload them as{" "}
        <strong>seekable WebM chunks during the session</strong> — not one giant
        blob at the end.
      </p>

      <pre className="timeline">{`Traditional:  [==== 10m Recording ====] ---> [== 45s Upload ==] ---> Done
With Library: [==== 10m Rec + Live Chunks ====] -> [0.5s Finalize] -> Done`}</pre>

      <div className="meta-row">
        <span>v1.0.0</span>
        <span>0 runtime dependencies</span>
        <span>Backend-agnostic</span>
        <a href="https://www.npmjs.com/package/mediastream-upload">npm</a>
      </div>

      <div className="cta-row">
        <Link className="btn btn-primary" to="/examples/react">
          Try the live demo
        </Link>
        <Link className="btn" to="/guide">
          Get started
        </Link>
        <Link className="btn" to="/backend">
          Backend contract
        </Link>
      </div>

      <h2>Why it exists</h2>
      <p>
        Typical recorders wait until stop, then upload tens of megabytes.
        This library composites main + optional PiP, seals multipart chunks at
        5&nbsp;MiB while you are still live, and patches Duration / SeekHead /
        Cues so remote scrub works when upload completes.
      </p>

      <h2>Install</h2>
      <pre>{`pnpm add mediastream-upload`}</pre>

      <h2>Quick start</h2>
      <pre>{`import { ChunkRecorder } from "mediastream-upload";
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

const { videoUrl, localBlob } = await recorder.stop();`}</pre>

      <p className="note">
        Call <code>start()</code> from a user gesture so{" "}
        <code>AudioContext</code> can resume. Use HTTPS or localhost for{" "}
        <code>getUserMedia</code>.
      </p>

      <h2>Where to go next</h2>
      <ul>
        <li>
          <Link to="/guide">Guide</Link> — camera, PiP, errors
        </li>
        <li>
          <Link to="/api">API</Link> — public surface &amp; state machine
        </li>
        <li>
          <Link to="/backend">Backend</Link> — four methods + sample server
        </li>
        <li>
          <Link to="/examples/react">Live demo</Link> — Network-tab friendly
        </li>
        <li>
          <Link to="/examples/vanilla">Vanilla walkthrough</Link> — same flow
          without React
        </li>
      </ul>
    </article>
  );
}
