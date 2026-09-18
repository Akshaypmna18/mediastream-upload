/**
 * OPTIONAL production sketch — NOT wired into the happy-path Express server.
 *
 * Abrupt / Track B seek repair (pagehide with ≥1 ACKed chunk):
 * the client may call finalize({ abrupt: true }) without rewriting Part 0.
 * Production backends should repair asynchronously so Range scrub works.
 *
 * Steps (after abrupt finalize returns quickly):
 * 1. Persist the concatenated object (or multiparts) under a temp key.
 * 2. Set seekRepairStatus to "pending" (or return "skipped" if too large).
 * 3. In a worker / queue job:
 *      import { repairAbruptWebmSeekability } from "mediastream-upload";
 *      const input = await readObject(uploadId); // Uint8Array / Buffer
 *      const repaired = repairAbruptWebmSeekability(input);
 *      if (!repaired.ok) { mark failed; return; }
 *      await writeObject(`${uploadId}.seekable.webm`, repaired.bytes);
 *      mark seekRepairStatus = "done";
 * 4. GET playback prefers the repaired object when status === "done".
 *
 * This sample returns seekRepairStatus: "skipped" on abrupt finalize so
 * friends can finish the normal Stop path without EBML complexity.
 *
 * See:
 * - docs/backend-contract.md §5
 * - examples/backend/README.md → "Production: abrupt seek repair"
 */

export const ABRUPT_REPAIR_SKETCH = `
after abrupt finalize → read object → repairAbruptWebmSeekability(bytes)
  → write *.seekable.webm → set seekRepairStatus "done"
` as const;
