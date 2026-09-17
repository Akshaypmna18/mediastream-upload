/**
 * Vanilla demo for mediastream-upload.
 * Serve from the package root after `pnpm build`.
 */
import {
  ChunkRecorder,
  UnsupportedBrowserError,
  SourceInitializationError,
} from "../../dist/index.js";
import { createR2Backend } from "../../dist/adapters/r2/index.js";

/**
 * In-memory backend for local demos — concatenates uploaded parts in order.
 * Not for production; does not enforce multipart size rules server-side.
 *
 * @returns {import('../../dist/index.js').ChunkRecorderBackend}
 */
function createMockBackend() {
  /** @type {Map<string, { parts: Map<number, Blob>, maxSeq: number }>} */
  const uploads = new Map();

  return {
    async init() {
      const uploadId = crypto.randomUUID();
      uploads.set(uploadId, { parts: new Map(), maxSeq: -1 });
      return { uploadId };
    },

    async sendChunk(uploadId, sequenceNumber, _checksum, bytes, options) {
      const rec = uploads.get(uploadId);
      if (!rec) throw new Error("unknown uploadId");
      if (options?.replace) {
        rec.parts.set(sequenceNumber, bytes);
        return;
      }
      rec.parts.set(sequenceNumber, bytes);
      rec.maxSeq = Math.max(rec.maxSeq, sequenceNumber);
    },

    async finalize(uploadId, totalChunks) {
      const rec = uploads.get(uploadId);
      if (!rec) throw new Error("unknown uploadId");
      const ordered = [];
      for (let i = 0; i < totalChunks; i += 1) {
        const part = rec.parts.get(i);
        if (!part) {
          throw new Error(`missing sequence ${i}`);
        }
        ordered.push(part);
      }
      const blob = new Blob(ordered, { type: "video/webm" });
      const videoUrl = URL.createObjectURL(blob);
      return { videoUrl, seekRepairStatus: "none" };
    },

    async abort(uploadId) {
      uploads.delete(uploadId);
    },
  };
}

const params = new URLSearchParams(location.search);
const backendBase = params.get("backend");
const backendLabel = backendBase ? `live (${backendBase})` : "mock";

const statusEl = document.getElementById("status");
const preview = document.getElementById("preview");
const result = document.getElementById("result");
const btnStart = document.getElementById("btn-start");
const btnStop = document.getElementById("btn-stop");
const btnDestroy = document.getElementById("btn-destroy");

/** @type {ChunkRecorder | null} */
let recorder = null;
/** @type {MediaStream | null} */
let camera = null;

function setStatus(extra = "") {
  const state = recorder?.getState() ?? "idle";
  statusEl.textContent = `state: ${state} · backend: ${backendLabel}${
    extra ? ` · ${extra}` : ""
  }`;
}

function setBusy(recording) {
  btnStart.disabled = recording;
  btnStop.disabled = !recording;
  btnDestroy.disabled = !recording && !recorder;
}

btnStart.addEventListener("click", async () => {
  result.hidden = true;
  result.removeAttribute("src");

  try {
    camera = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true,
    });
    preview.srcObject = camera;
    await preview.play().catch(() => undefined);

    const backend = backendBase
      ? createR2Backend(backendBase)
      : createMockBackend();

    recorder = new ChunkRecorder({
      onStateChange: () => setStatus(),
      debug: true,
    });

    await recorder.start({
      sources: { main: camera },
      backend,
      playbackToSpeakers: false,
    });

    setBusy(true);
    setStatus("recording…");
  } catch (err) {
    console.error(err);
    if (err instanceof UnsupportedBrowserError) {
      setStatus("unsupported browser (need WebM MediaRecorder)");
    } else if (err instanceof SourceInitializationError) {
      setStatus("source init failed (camera/mic?)");
    } else {
      setStatus(err instanceof Error ? err.message : "start failed");
    }
    setBusy(false);
  }
});

btnStop.addEventListener("click", async () => {
  if (!recorder) return;
  try {
    const { videoUrl } = await recorder.stop();
    result.src = videoUrl;
    result.hidden = false;
    setStatus(`done → ${videoUrl.slice(0, 48)}…`);
  } catch (err) {
    console.error(err);
    setStatus(err instanceof Error ? err.message : "stop failed");
  } finally {
    camera?.getTracks().forEach((t) => t.stop());
    camera = null;
    preview.srcObject = null;
    recorder = null;
    setBusy(false);
  }
});

btnDestroy.addEventListener("click", () => {
  recorder?.destroy();
  camera?.getTracks().forEach((t) => t.stop());
  camera = null;
  preview.srcObject = null;
  recorder = null;
  setBusy(false);
  setStatus("destroyed");
});

setStatus();
