import { describe, expect, it } from "vitest";
import {
  DEFAULT_COMPOSITOR_OPTIONS,
  resolvePipRect,
} from "../src/internal/compositor";

const base = {
  canvasWidth: DEFAULT_COMPOSITOR_OPTIONS.canvasWidth,
  canvasHeight: DEFAULT_COMPOSITOR_OPTIONS.canvasHeight,
  pipWidth: DEFAULT_COMPOSITOR_OPTIONS.pipWidth,
  pipHeight: DEFAULT_COMPOSITOR_OPTIONS.pipHeight,
  pipMargin: DEFAULT_COMPOSITOR_OPTIONS.pipMargin,
};

describe("resolvePipRect", () => {
  it("defaults top-left to margin, margin", () => {
    expect(resolvePipRect({ ...base, pipPosition: "top-left" })).toEqual({
      x: 12,
      y: 12,
      width: 320,
      height: 180,
    });
  });

  it("places top-right flush to the right edge minus margin", () => {
    expect(resolvePipRect({ ...base, pipPosition: "top-right" })).toEqual({
      x: 1280 - 320 - 12,
      y: 12,
      width: 320,
      height: 180,
    });
  });

  it("places bottom-left flush to the bottom edge minus margin", () => {
    expect(resolvePipRect({ ...base, pipPosition: "bottom-left" })).toEqual({
      x: 12,
      y: 720 - 180 - 12,
      width: 320,
      height: 180,
    });
  });

  it("places bottom-right in the opposite corner", () => {
    expect(resolvePipRect({ ...base, pipPosition: "bottom-right" })).toEqual({
      x: 1280 - 320 - 12,
      y: 720 - 180 - 12,
      width: 320,
      height: 180,
    });
  });
});
