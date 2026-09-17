import { SourceInitializationError } from "../errors";
import type { ChunkRecorderSource, LogHandler, PipPosition } from "../types";

/** Default canvas / PiP geometry and frame rate. */
export const DEFAULT_COMPOSITOR_OPTIONS = {
  canvasWidth: 1280,
  canvasHeight: 720,
  pipWidth: 320,
  pipHeight: 180,
  pipMargin: 12,
  pipPosition: "top-left" as PipPosition,
  fps: 30,
} as const;

export type CompositorOptions = {
  canvasWidth?: number;
  canvasHeight?: number;
  pipWidth?: number;
  pipHeight?: number;
  pipMargin?: number;
  pipPosition?: PipPosition;
  fps?: number;
  log?: LogHandler;
  /** Called when an unexpected draw/worker error occurs. */
  onError?: (error: Error) => void;
};

export type PipRect = { x: number; y: number; width: number; height: number };

/**
 * Compute PiP draw rect for a given canvas size and corner.
 * Pure helper — unit-tested without a real canvas.
 */
export function resolvePipRect(input: {
  canvasWidth: number;
  canvasHeight: number;
  pipWidth: number;
  pipHeight: number;
  pipMargin: number;
  pipPosition: PipPosition;
}): PipRect {
  const {
    canvasWidth,
    canvasHeight,
    pipWidth,
    pipHeight,
    pipMargin,
    pipPosition,
  } = input;
  const right = canvasWidth - pipWidth - pipMargin;
  const bottom = canvasHeight - pipHeight - pipMargin;

  switch (pipPosition) {
    case "top-right":
      return { x: right, y: pipMargin, width: pipWidth, height: pipHeight };
    case "bottom-left":
      return { x: pipMargin, y: bottom, width: pipWidth, height: pipHeight };
    case "bottom-right":
      return { x: right, y: bottom, width: pipWidth, height: pipHeight };
    default:
      // "top-left" and any unexpected value
      return {
        x: pipMargin,
        y: pipMargin,
        width: pipWidth,
        height: pipHeight,
      };
  }
}

export type CompositorHandles = {
  canvas: HTMLCanvasElement;
  canvasStream: MediaStream;
  mainVideo: HTMLVideoElement;
  pipVideo: HTMLVideoElement | null;
  ownsMainVideo: boolean;
  ownsPipVideo: boolean;
};

function ensureDrawVideo(source: ChunkRecorderSource): {
  video: HTMLVideoElement;
  owned: boolean;
} {
  if (source instanceof HTMLVideoElement) {
    if (source.srcObject instanceof MediaStream) {
      source.muted = true;
    }
    source.playsInline = true;
    return { video: source, owned: false };
  }

  const video = document.createElement("video");
  video.autoplay = true;
  video.muted = true;
  video.playsInline = true;
  video.srcObject = source;
  void video.play().catch(() => {
    // Frames may still arrive once the track is live.
  });
  return { video, owned: true };
}

function createTickWorker(tickMs: number): { worker: Worker; url: string } {
  const body = `
    let timer = null;
    self.onmessage = (event) => {
      if (event.data === "start") {
        if (timer != null) return;
        timer = setInterval(() => self.postMessage("tick"), ${tickMs});
      } else if (event.data === "stop") {
        if (timer != null) {
          clearInterval(timer);
          timer = null;
        }
      }
    };
  `;
  const blob = new Blob([body], { type: "application/javascript" });
  const url = URL.createObjectURL(blob);
  return { worker: new Worker(url), url };
}

/**
 * Canvas compositor driven by a Worker `setInterval` tick (not rAF),
 * so background tabs keep redrawing while audio continues.
 */
export class Compositor {
  private readonly opts: Required<
    Pick<
      CompositorOptions,
      | "canvasWidth"
      | "canvasHeight"
      | "pipWidth"
      | "pipHeight"
      | "pipMargin"
      | "pipPosition"
      | "fps"
    >
  > & { log: LogHandler; onError?: (error: Error) => void };

  private canvas: HTMLCanvasElement | null = null;
  private mainVideo: HTMLVideoElement | null = null;
  private pipVideo: HTMLVideoElement | null = null;
  private ownsMainVideo = false;
  private ownsPipVideo = false;
  private tickWorker: Worker | null = null;
  private tickWorkerUrl: string | null = null;
  private captureStopped = false;
  private canvasStream: MediaStream | null = null;

  constructor(options: CompositorOptions = {}) {
    this.opts = {
      canvasWidth:
        options.canvasWidth ?? DEFAULT_COMPOSITOR_OPTIONS.canvasWidth,
      canvasHeight:
        options.canvasHeight ?? DEFAULT_COMPOSITOR_OPTIONS.canvasHeight,
      pipWidth: options.pipWidth ?? DEFAULT_COMPOSITOR_OPTIONS.pipWidth,
      pipHeight: options.pipHeight ?? DEFAULT_COMPOSITOR_OPTIONS.pipHeight,
      pipMargin: options.pipMargin ?? DEFAULT_COMPOSITOR_OPTIONS.pipMargin,
      pipPosition:
        options.pipPosition ?? DEFAULT_COMPOSITOR_OPTIONS.pipPosition,
      fps: options.fps ?? DEFAULT_COMPOSITOR_OPTIONS.fps,
      log: options.log ?? (() => undefined),
      onError: options.onError,
    };
  }

  get fps(): number {
    return this.opts.fps;
  }

  /**
   * Create canvas + draw videos and start the Worker tick loop.
   */
  start(
    main: ChunkRecorderSource,
    pip?: ChunkRecorderSource,
  ): CompositorHandles {
    const canvas = document.createElement("canvas");
    canvas.width = this.opts.canvasWidth;
    canvas.height = this.opts.canvasHeight;
    this.canvas = canvas;

    const mainHandle = ensureDrawVideo(main);
    this.mainVideo = mainHandle.video;
    this.ownsMainVideo = mainHandle.owned;

    if (pip) {
      const pipHandle = ensureDrawVideo(pip);
      this.pipVideo = pipHandle.video;
      this.ownsPipVideo = pipHandle.owned;
    }

    const canvasStream = canvas.captureStream(this.opts.fps);
    this.canvasStream = canvasStream;
    if (canvasStream.getVideoTracks().length === 0) {
      throw new SourceInitializationError(
        "canvas.captureStream produced no video tracks",
      );
    }

    const tickMs = Math.round(1000 / this.opts.fps);
    const { worker, url } = createTickWorker(tickMs);
    this.tickWorker = worker;
    this.tickWorkerUrl = url;
    this.captureStopped = false;

    worker.onmessage = (event: MessageEvent<string>) => {
      try {
        if (event.data === "tick") this.drawFrame();
      } catch (err) {
        this.handleError(err, "worker.onmessage");
      }
    };
    worker.onerror = (event) => {
      this.handleError(
        new Error(event.message || "Tick worker error"),
        "worker.onerror",
      );
    };
    worker.postMessage("start");

    return {
      canvas,
      canvasStream,
      mainVideo: this.mainVideo,
      pipVideo: this.pipVideo,
      ownsMainVideo: this.ownsMainVideo,
      ownsPipVideo: this.ownsPipVideo,
    };
  }

  /** Pause drawing (used under backpressure). */
  stopCapture(): void {
    this.captureStopped = true;
  }

  /** Resume drawing after buffer drains. */
  resumeCapture(): void {
    this.captureStopped = false;
  }

  /** Tear down worker, owned videos, and canvas stream tracks. */
  destroy(): void {
    this.captureStopped = true;
    if (this.tickWorker) {
      this.tickWorker.postMessage("stop");
      this.tickWorker.terminate();
      this.tickWorker = null;
    }
    if (this.tickWorkerUrl) {
      URL.revokeObjectURL(this.tickWorkerUrl);
      this.tickWorkerUrl = null;
    }

    if (this.ownsMainVideo && this.mainVideo) {
      this.mainVideo.srcObject = null;
    }
    if (this.ownsPipVideo && this.pipVideo) {
      this.pipVideo.srcObject = null;
    }
    this.mainVideo = null;
    this.pipVideo = null;
    this.ownsMainVideo = false;
    this.ownsPipVideo = false;
    this.canvas = null;

    this.canvasStream?.getTracks().forEach((track) => {
      track.stop();
    });
    this.canvasStream = null;
  }

  private drawFrame(): void {
    if (this.captureStopped) return;

    try {
      const canvas = this.canvas;
      const mainVideo = this.mainVideo;
      if (!canvas || !mainVideo) return;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const {
        canvasWidth,
        canvasHeight,
        pipWidth,
        pipHeight,
        pipMargin,
        pipPosition,
      } = this.opts;

      if (mainVideo.readyState >= 2) {
        ctx.drawImage(mainVideo, 0, 0, canvasWidth, canvasHeight);
      }

      const pipVideo = this.pipVideo;
      if (
        pipVideo &&
        pipVideo.readyState >= 2 &&
        pipVideo.videoWidth > 0 &&
        pipVideo.videoHeight > 0
      ) {
        const {
          x,
          y,
          width: w,
          height: h,
        } = resolvePipRect({
          canvasWidth,
          canvasHeight,
          pipWidth,
          pipHeight,
          pipMargin,
          pipPosition,
        });
        ctx.beginPath();
        ctx.roundRect(x, y, w, h, 8);
        ctx.closePath();
        ctx.save();
        ctx.clip();
        ctx.drawImage(pipVideo, x, y, w, h);
        ctx.restore();
        ctx.strokeStyle = "rgba(255,255,255,0.5)";
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    } catch (err) {
      this.handleError(err, "drawFrame");
    }
  }

  private handleError(err: unknown, context: string): void {
    const error =
      err instanceof Error ? err : new Error(`Compositor: ${context} error`);
    this.opts.log("error", context, error);
    this.opts.onError?.(error);
  }
}
