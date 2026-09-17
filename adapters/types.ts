/**
 * Shared adapter types. Re-exported so consumers can import the backend
 * contract from an adapter entry without pulling the full core surface.
 */
export type { ChunkRecorderBackend, SeekRepairStatus } from "../src/types";
export type { CreateHttpBackendOptions } from "./http-base";
export { createHttpBackend, HttpBackendError } from "./http-base";
