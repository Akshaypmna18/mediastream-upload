import { describe, expect, it } from "vitest";
import {
  buildCuesElement,
  ensureDurationPatchable,
  ensureSeekHeadReservable,
  patchDurationSameSize,
  patchSeekHeadCuesSameSize,
  repairAbruptWebmSeekability,
  SEEKHEAD_RESERVE_BYTES,
  scanWebmForSeekMetadata,
} from "../src/internal/webmSeekRepair";
import { buildMinimalWebm } from "./fixtures/minimalWebm";

describe("scanWebmForSeekMetadata", () => {
  it("finds multiple cues when unknown-size Clusters are bounded (Track C)", () => {
    const bytes = buildMinimalWebm({
      clusterTimes: [0, 1000, 2000, 3000],
      unknownSizeClusters: true,
    });
    const scan = scanWebmForSeekMetadata(bytes);
    expect(scan.timecodeScale).toBe(1_000_000);
    expect(scan.segmentPayloadOffset).toBeGreaterThan(0);
    expect(scan.cues.length).toBe(4);
    expect(scan.cues.map((c) => c.time)).toEqual([0, 1000, 2000, 3000]);
  });

  it("still scans known-size Clusters", () => {
    const bytes = buildMinimalWebm({
      clusterTimes: [0, 500],
      unknownSizeClusters: false,
    });
    const scan = scanWebmForSeekMetadata(bytes);
    expect(scan.cues.length).toBe(2);
  });
});

describe("ensureDurationPatchable / patchDurationSameSize", () => {
  it("inserts a Void when Duration is missing, then patches same-size", () => {
    const original = buildMinimalWebm();
    const reserved = ensureDurationPatchable(original);
    expect(reserved.ok).toBe(true);
    if (!reserved.ok) return;

    expect(reserved.reason).toBe("inserted_void");
    expect(reserved.bytes.byteLength).toBeGreaterThan(original.byteLength);

    const again = ensureDurationPatchable(reserved.bytes);
    expect(again.ok).toBe(true);
    if (!again.ok) return;
    expect(again.reason).toBe("already_ready");

    const durationMs = 12_345;
    const patched = patchDurationSameSize(
      reserved.bytes,
      durationMs,
      1_000_000,
    );
    expect(patched).not.toBeNull();
    expect(patched!.byteLength).toBe(reserved.bytes.byteLength);
  });
});

describe("ensureSeekHeadReservable / patchSeekHeadCuesSameSize", () => {
  it("reserves SeekHead Void and patches without changing length", () => {
    const original = buildMinimalWebm();
    const durationReady = ensureDurationPatchable(original);
    expect(durationReady.ok).toBe(true);
    if (!durationReady.ok) return;

    const seekReady = ensureSeekHeadReservable(durationReady.bytes);
    expect(seekReady.ok).toBe(true);
    if (!seekReady.ok) return;
    expect(seekReady.reason).toBe("inserted_void");
    expect(seekReady.bytes.byteLength).toBe(
      durationReady.bytes.byteLength + SEEKHEAD_RESERVE_BYTES,
    );

    const scan = scanWebmForSeekMetadata(seekReady.bytes);
    const cuesPosition = Math.max(
      0,
      seekReady.bytes.byteLength - scan.segmentPayloadOffset,
    );
    const patched = patchSeekHeadCuesSameSize(seekReady.bytes, cuesPosition);
    expect(patched).not.toBeNull();
    expect(patched!.byteLength).toBe(seekReady.bytes.byteLength);
  });
});

describe("buildCuesElement", () => {
  it("emits a non-empty Cues element for cue points", () => {
    const cues = buildCuesElement([
      { time: 0, clusterPosition: 10 },
      { time: 2000, clusterPosition: 100 },
    ]);
    expect(cues.byteLength).toBeGreaterThan(8);
    // Cues id wire: 1C 53 BB 6B
    expect([...cues.slice(0, 4)]).toEqual([0x1c, 0x53, 0xbb, 0x6b]);
  });
});

describe("repairAbruptWebmSeekability", () => {
  it("repairs a reserved media buffer and appends Cues", () => {
    let bytes = buildMinimalWebm({
      clusterTimes: [0, 2000, 4000],
      unknownSizeClusters: true,
    });
    const d = ensureDurationPatchable(bytes);
    expect(d.ok).toBe(true);
    if (!d.ok) return;
    bytes = d.bytes;
    const s = ensureSeekHeadReservable(bytes);
    expect(s.ok).toBe(true);
    if (!s.ok) return;
    bytes = s.bytes;

    const before = bytes.byteLength;
    const repaired = repairAbruptWebmSeekability(bytes, { durationMs: 5000 });
    expect(repaired.ok).toBe(true);
    if (!repaired.ok) return;

    expect(repaired.cueCount).toBe(3);
    expect(repaired.mediaBytes).toBe(before);
    expect(repaired.bytes.byteLength).toBeGreaterThan(before);
    expect(repaired.cuesBytes).toBeGreaterThan(0);
    expect(repaired.durationMs).toBeGreaterThanOrEqual(5000);
  });

  it("fails when there are no clusters", () => {
    const empty = new Uint8Array([0x1a, 0x45, 0xdf, 0xa3, 0x80]);
    const repaired = repairAbruptWebmSeekability(empty);
    expect(repaired.ok).toBe(false);
  });
});
