import {
  Router,
  type Request,
  type Response,
  json,
  raw,
} from "express";
import {
  abortUpload,
  createUpload,
  finalizeUpload,
  getUpload,
  putPart,
} from "../store.js";
import { sendFileWithRange } from "../range.js";

export function createUploadsRouter(publicBaseUrl: string): Router {
  const router = Router();

  /** POST /uploads → init */
  router.post("/", json({ limit: "64kb" }), (req: Request, res: Response) => {
    const contentType =
      typeof req.body?.contentType === "string"
        ? req.body.contentType
        : "video/webm";
    const upload = createUpload(contentType);
    res.status(201).json({ uploadId: upload.id });
  });

  /** PUT /uploads/:id/chunks/:seq → sendChunk */
  router.put(
    "/:id/chunks/:seq",
    raw({ type: "*/*", limit: "100mb" }),
    (req: Request, res: Response) => {
      const id = req.params.id as string;
      const seq = Number(req.params.seq);
      if (!Number.isInteger(seq) || seq < 0) {
        res.status(400).json({ error: "invalid sequenceNumber" });
        return;
      }

      const checksumHeader = req.header("X-Checksum-SHA256");
      if (!checksumHeader) {
        res.status(400).json({ error: "missing X-Checksum-SHA256" });
        return;
      }

      const replace =
        req.query.replace === "1" || req.header("X-Replace-Part") === "1";

      const body = req.body;
      if (!Buffer.isBuffer(body)) {
        res.status(400).json({ error: "expected raw binary body" });
        return;
      }

      const result = putPart(id, seq, checksumHeader, body, replace);
      if (!result.ok) {
        res.status(result.status).json({ error: result.error });
        return;
      }
      res.status(204).end();
    },
  );

  /** POST /uploads/:id/finalize */
  router.post(
    "/:id/finalize",
    json({ limit: "64kb" }),
    (req: Request, res: Response) => {
      const id = req.params.id as string;
      const totalChunks = Number(req.body?.totalChunks);
      const abrupt = req.body?.abrupt === true;

      if (!Number.isInteger(totalChunks)) {
        res.status(400).json({ error: "totalChunks must be an integer" });
        return;
      }

      const result = finalizeUpload(id, totalChunks, abrupt);
      if (!result.ok) {
        res.status(result.status).json({
          error: result.error,
          ...(result.missing ? { missing: result.missing } : {}),
        });
        return;
      }

      const videoUrl = `${publicBaseUrl}/uploads/${encodeURIComponent(id)}`;
      res.status(200).json({
        videoUrl,
        abrupt: result.abrupt,
        seekRepairStatus: result.seekRepairStatus,
      });
    },
  );

  /** POST /uploads/:id/abort */
  router.post(
    "/:id/abort",
    json({ limit: "64kb" }),
    (req: Request, res: Response) => {
      const id = req.params.id as string;
      const result = abortUpload(id);
      if (!result.ok) {
        res.status(result.status).json({ error: result.error });
        return;
      }
      res.status(204).end();
    },
  );

  /** GET /uploads/:id → playback + Range */
  router.get("/:id", (req: Request, res: Response) => {
    const id = req.params.id as string;
    const upload = getUpload(id);
    if (!upload || upload.status !== "completed" || !upload.videoPath) {
      res.status(404).json({ error: "upload not found or not completed" });
      return;
    }
    sendFileWithRange(req, res, upload.videoPath, upload.contentType);
  });

  return router;
}
