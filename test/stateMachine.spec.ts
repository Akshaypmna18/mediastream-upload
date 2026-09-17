import { afterEach, describe, expect, it, vi } from "vitest";
import { ChunkRecorder } from "../src/ChunkRecorder";
import { ChunkRecorderError } from "../src/errors";
import type { ChunkRecorderBackend } from "../src/types";

function mockBackend(): ChunkRecorderBackend {
  return {
    init: vi.fn().mockResolvedValue({ uploadId: "u1" }),
    sendChunk: vi.fn().mockResolvedValue(undefined),
    finalize: vi.fn().mockResolvedValue({ videoUrl: "https://example/v" }),
    abort: vi.fn().mockResolvedValue(undefined),
  };
}

function stubRecordingApis(): MediaStream {
  class FakeMediaRecorder {
    state = "inactive";
    ondataavailable: ((ev: { data: Blob }) => void) | null = null;
    onstart: (() => void) | null = null;
    onstop: (() => void) | null = null;
    onerror: ((ev: Event) => void) | null = null;
    private stopListeners: Array<() => void> = [];
    start() {
      this.state = "recording";
      this.onstart?.();
    }
    stop() {
      this.state = "inactive";
      this.onstop?.();
      for (const listener of this.stopListeners) listener();
      this.stopListeners = [];
    }
    pause() {
      this.state = "paused";
    }
    resume() {
      this.state = "recording";
    }
    requestData() {
      this.ondataavailable?.({ data: new Blob([new Uint8Array(64)]) });
    }
    addEventListener(type: string, listener: () => void) {
      if (type === "stop") this.stopListeners.push(listener);
    }
    removeEventListener(type: string, listener: () => void) {
      if (type === "stop") {
        this.stopListeners = this.stopListeners.filter((l) => l !== listener);
      }
    }
    static isTypeSupported() {
      return true;
    }
  }

  vi.stubGlobal("MediaRecorder", FakeMediaRecorder);

  class FakeAudioContext {
    state = "running";
    destination = {};
    createMediaStreamDestination() {
      const track = {
        stop: vi.fn(),
        kind: "audio",
      } as unknown as MediaStreamTrack;
      return {
        stream: {
          getAudioTracks: () => [track],
        },
        connect: vi.fn(),
      };
    }
    createMediaStreamSource() {
      return { connect: vi.fn() };
    }
    resume = vi.fn().mockResolvedValue(undefined);
    close = vi.fn().mockResolvedValue(undefined);
  }
  vi.stubGlobal("AudioContext", FakeAudioContext);

  const audioTrack = {
    stop: vi.fn(),
    kind: "audio",
    id: "a1",
    enabled: true,
  } as unknown as MediaStreamTrack;

  const stream = new MediaStream();
  Object.defineProperty(stream, "getAudioTracks", {
    value: () => [audioTrack],
  });
  Object.defineProperty(stream, "getTracks", {
    value: () => [audioTrack],
  });

  const videoTrack = {
    stop: vi.fn(),
    kind: "video",
    id: "v1",
  } as unknown as MediaStreamTrack;
  const canvasStream = new MediaStream();
  Object.defineProperty(canvasStream, "getVideoTracks", {
    value: () => [videoTrack],
  });
  Object.defineProperty(canvasStream, "getTracks", {
    value: () => [videoTrack],
  });
  vi.spyOn(HTMLCanvasElement.prototype, "captureStream").mockReturnValue(
    canvasStream,
  );

  class FakeWorker {
    onmessage: ((ev: MessageEvent) => void) | null = null;
    onerror: ((ev: ErrorEvent) => void) | null = null;
    postMessage() {
      /* no ticks in unit tests */
    }
    terminate() {
      /* noop */
    }
  }
  vi.stubGlobal("Worker", FakeWorker);
  vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:fake");
  vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => undefined);

  return stream;
}

describe("ChunkRecorder state machine", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("starts in idle and rejects stop()", async () => {
    const recorder = new ChunkRecorder();
    expect(recorder.getState()).toBe("idle");
    await expect(recorder.stop()).rejects.toBeInstanceOf(ChunkRecorderError);
  });

  it("destroy() from idle is a no-op for state", () => {
    const recorder = new ChunkRecorder();
    recorder.destroy();
    expect(recorder.getState()).toBe("idle");
  });

  it("transitions idle → initializing → recording → cancelled via destroy", async () => {
    const stream = stubRecordingApis();
    const states: string[] = [];
    const backend = mockBackend();
    const recorder = new ChunkRecorder({
      onStateChange: (s) => states.push(s),
    });

    await recorder.start({
      sources: { main: stream },
      backend,
    });

    expect(recorder.getState()).toBe("recording");
    expect(backend.init).toHaveBeenCalled();
    expect(states).toEqual(["initializing", "recording"]);

    recorder.destroy();
    expect(recorder.getState()).toBe("cancelled");
    expect(backend.abort).toHaveBeenCalledWith("u1", "destroy");
  });

  it("stop() finalizes and reaches completed", async () => {
    const stream = stubRecordingApis();
    const backend = mockBackend();
    const recorder = new ChunkRecorder();

    await recorder.start({ sources: { main: stream }, backend });
    const result = await recorder.stop();

    expect(result.videoUrl).toBe("https://example/v");
    expect(backend.finalize).toHaveBeenCalled();
    expect(recorder.getState()).toBe("completed");
  });

  it("resolveLogger silence vs boolean debug", () => {
    const silent = new ChunkRecorder();
    expect(silent.getState()).toBe("idle");
    const noisy = new ChunkRecorder({ debug: true });
    expect(noisy.getState()).toBe("idle");
  });
});
