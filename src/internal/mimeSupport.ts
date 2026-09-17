/**
 * MediaRecorder MIME feature detection and fallback order.
 */

const PREFERRED_TYPES = [
  "video/webm;codecs=vp9,opus",
  "video/webm;codecs=vp8,opus",
  "video/webm",
] as const;

/**
 * Pick the best WebM MIME type supported by this browser.
 *
 * @returns Preferred MIME string, or `""` if none are supported
 */
export function getPreferredMimeType(): string {
  for (const type of PREFERRED_TYPES) {
    try {
      if (MediaRecorder.isTypeSupported(type)) return type;
    } catch {
      // Older browsers may throw for unknown MIME strings.
    }
  }
  return "";
}

/**
 * Whether the environment can run canvas-composite WebM chunk recording.
 */
export function isFeatureSupported(): boolean {
  return (
    typeof MediaRecorder !== "undefined" &&
    typeof HTMLCanvasElement !== "undefined" &&
    typeof HTMLCanvasElement.prototype.captureStream === "function" &&
    MediaRecorder.isTypeSupported("video/webm")
  );
}
