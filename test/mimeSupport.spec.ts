import { afterEach, describe, expect, it, vi } from "vitest";
import {
  getPreferredMimeType,
  isFeatureSupported,
} from "../src/internal/mimeSupport";

describe("mimeSupport", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("prefers vp9 then vp8 then plain webm", () => {
    const supported = new Set(["video/webm;codecs=vp8,opus", "video/webm"]);
    vi.stubGlobal("MediaRecorder", {
      isTypeSupported: (type: string) => supported.has(type),
    });
    expect(getPreferredMimeType()).toBe("video/webm;codecs=vp8,opus");
  });

  it("returns empty string when nothing is supported", () => {
    vi.stubGlobal("MediaRecorder", {
      isTypeSupported: () => false,
    });
    expect(getPreferredMimeType()).toBe("");
  });

  it("reports unsupported when MediaRecorder is missing", () => {
    vi.stubGlobal("MediaRecorder", undefined);
    expect(isFeatureSupported()).toBe(false);
  });
});
