import { useEffect, useRef } from "react";
import { useChunkRecorderDemo } from "./useChunkRecorderDemo";

export function App() {
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
  } = useChunkRecorderDemo();

  const previewRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const el = previewRef.current;
    if (!el) return;
    el.srcObject = stream;
    if (stream) {
      void el.play().catch(() => undefined);
    }
  }, [stream]);

  const statusExtra = error ? ` · ${error}` : "";

  return (
    <main>
      <h1>mediastream-upload</h1>
      <p className="lead">
        React demo: thin local hook around the headless <code>ChunkRecorder</code>{" "}
        API (not a published React package).
      </p>

      <div className="row">
        <button
          type="button"
          className="primary"
          onClick={() => void start()}
          disabled={busy}
        >
          Start
        </button>
        <button type="button" onClick={() => void stop()} disabled={!busy}>
          Stop
        </button>
        <button type="button" onClick={destroy} disabled={!busy}>
          Destroy
        </button>
      </div>

      <div className="status">
        state: {state} · backend: {backendLabel}
        {statusExtra}
      </div>

      <video ref={previewRef} playsInline muted />
      {videoUrl ? <video src={videoUrl} controls playsInline /> : null}

      <p className="meta">
        Default uses an in-memory mock backend (playback via <code>blob:</code>{" "}
        URL). For a real API:{" "}
        <code>?backend=https://your-worker.example.com</code>. Use localhost or
        HTTPS for <code>getUserMedia</code>. Official{" "}
        <code>useChunkRecorder</code> package = future phase.
      </p>
    </main>
  );
}
