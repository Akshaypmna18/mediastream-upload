import { describe, expect, it } from "vitest";
import { sha256Hex } from "../src/internal/checksum";

describe("sha256Hex", () => {
  it("returns lowercase hex for known input", async () => {
    const blob = new Blob([new Uint8Array([0x61, 0x62, 0x63])]); // "abc"
    const digest = await sha256Hex(blob);
    expect(digest).toBe(
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
    );
    expect(digest).toMatch(/^[0-9a-f]{64}$/);
  });
});
