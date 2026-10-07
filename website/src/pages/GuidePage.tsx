import { Link } from "react-router-dom";

export function GuidePage() {
  return (
    <article className="prose">
      <h1>Guide</h1>
      <p className="lead">
        Get from install to a recording session without reading every file in
        the repo.
      </p>

      <h2>Requirements</h2>
      <ul>
        <li>Modern browser with WebM <code>MediaRecorder</code></li>
        <li>
          <code>canvas.captureStream</code>, Web Audio,{" "}
          <code>crypto.subtle</code>
        </li>
        <li>HTTPS or localhost for camera/mic</li>
      </ul>

      <h2>1. Install</h2>
      <pre>{`pnpm add mediastream-upload`}</pre>

      <h2>2. Camera → backend</h2>
      <pre>{`import { ChunkRecorder, UnsupportedBrowserError } from "mediastream-upload";
import { createR2Backend } from "mediastream-upload/adapters/r2";

const stream = await navigator.mediaDevices.getUserMedia({
  video: true,
  audio: true,
});

const recorder = new ChunkRecorder({
  onStateChange: (s) => {
    /* update UI */
  },
});

try {
  await recorder.start({
    sources: { main: stream },
    backend: createR2Backend("https://your-api.example.com"),
  });
} catch (err) {
  if (err instanceof UnsupportedBrowserError) {
    // fall back to end-of-session single-blob upload
  }
  throw err;
}

const { videoUrl, localBlob } = await recorder.stop();`}</pre>

      <h2>3. Main + PiP</h2>
      <pre>{`await recorder.start({
  sources: {
    main: screenStream,
    pip: cameraStream,
  },
  backend,
  pipPosition: "bottom-right", // default top-left
  playbackToSpeakers: false,
});`}</pre>

      <h2>4. Lifecycle</h2>
      <ul>
        <li>
          Prefer explicit <code>stop()</code> at natural session end
        </li>
        <li>
          <code>destroy()</code> on unexpected unmount (aborts staged upload)
        </li>
        <li>
          On <code>backpressured</code>, pause your product session if silent
          gaps are unacceptable
        </li>
      </ul>

      <h2>Try it</h2>
      <div className="cta-row">
        <Link className="btn btn-primary" to="/examples/react">
          Live React demo
        </Link>
        <Link className="btn" to="/backend">
          Implement a backend
        </Link>
      </div>
    </article>
  );
}
