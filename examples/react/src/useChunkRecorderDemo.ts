import {
  ChunkRecorder,
  SourceInitializationError,
  UnsupportedBrowserError,
  type ChunkRecorderState,
} from "mediastream-upload";
import { createR2Backend } from "mediastream-upload/adapters/r2";
import { useCallback, useEffect, useRef, useState } from "react";
import { createMockBackend } from "./mockBackend";

function backendFromSearch(): {
  backend: ReturnType<typeof createMockBackend>;
  label: string;
} {
  const backendBase = new URLSearchParams(window.location.search).get("backend");
  if (backendBase) {
    return {
      backend: createR2Backend(backendBase),
      label: `live (${backendBase})`,
    };
  }
  return { backend: createMockBackend(), label: "mock" };
}

/**
 * Local demo hook — owns ChunkRecorder lifecycle for the React example only.
 * Not a published export from mediastream-upload.
 */
export function useChunkRecorderDemo() {
  const recorderRef = useRef<ChunkRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const videoUrlRef = useRef<string | null>(null);

  const [state, setState] = useState<ChunkRecorderState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [busy, setBusy] = useState(false);
  const [backendLabel] = useState(() => backendFromSearch().label);

  const revokeResultUrl = useCallback(() => {
    if (videoUrlRef.current?.startsWith("blob:")) {
      URL.revokeObjectURL(videoUrlRef.current);
    }
    videoUrlRef.current = null;
    setVideoUrl(null);
  }, []);

  const stopTracks = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setStream(null);
  }, []);

  const destroy = useCallback(() => {
    recorderRef.current?.destroy();
    recorderRef.current = null;
    stopTracks();
    setBusy(false);
    setState((s) => (s === "completed" ? s : "cancelled"));
    setError(null);
  }, [stopTracks]);

  useEffect(() => {
    return () => {
      recorderRef.current?.destroy();
      recorderRef.current = null;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      if (videoUrlRef.current?.startsWith("blob:")) {
        URL.revokeObjectURL(videoUrlRef.current);
      }
    };
  }, []);

  const start = useCallback(async () => {
    setError(null);
    revokeResultUrl();

    try {
      const camera = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      streamRef.current = camera;
      setStream(camera);

      const { backend } = backendFromSearch();
      const recorder = new ChunkRecorder({
        onStateChange: (next) => setState(next),
        debug: true,
      });
      recorderRef.current = recorder;

      await recorder.start({
        sources: { main: camera },
        backend,
        playbackToSpeakers: false,
      });

      setBusy(true);
    } catch (err) {
      stopTracks();
      recorderRef.current = null;
      setBusy(false);

      if (err instanceof UnsupportedBrowserError) {
        setError("unsupported browser (need WebM MediaRecorder)");
      } else if (err instanceof SourceInitializationError) {
        setError("source init failed (camera/mic?)");
      } else {
        setError(err instanceof Error ? err.message : "start failed");
      }
    }
  }, [revokeResultUrl, stopTracks]);

  const stop = useCallback(async () => {
    const recorder = recorderRef.current;
    if (!recorder) return;

    try {
      const { videoUrl: nextUrl } = await recorder.stop();
      revokeResultUrl();
      videoUrlRef.current = nextUrl;
      setVideoUrl(nextUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "stop failed");
    } finally {
      stopTracks();
      recorderRef.current = null;
      setBusy(false);
    }
  }, [revokeResultUrl, stopTracks]);

  return {
    state,
    error,
    videoUrl,
    stream,
    backendLabel,
    busy,
    start,
    stop,
    destroy,
  };
}
