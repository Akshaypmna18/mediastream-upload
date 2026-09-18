import cors from "cors";
import express from "express";
import { createUploadsRouter } from "./routes/uploads.js";

const PORT = Number(process.env.PORT ?? 8787);
const HOST = process.env.HOST ?? "127.0.0.1";
const publicBaseUrl =
  process.env.PUBLIC_BASE_URL ?? `http://${HOST}:${PORT}`;

const app = express();

app.use(
  cors({
    origin: true,
    methods: ["GET", "POST", "PUT", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "X-Checksum-SHA256",
      "X-Replace-Part",
      "Range",
    ],
    exposedHeaders: ["Accept-Ranges", "Content-Range", "Content-Length"],
  }),
);

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "mediastream-upload-backend-example" });
});

app.use("/uploads", createUploadsRouter(publicBaseUrl));

app.listen(PORT, HOST, () => {
  console.log(`mediastream-upload sample backend → ${publicBaseUrl}`);
  console.log(`  POST   /uploads`);
  console.log(`  PUT    /uploads/:id/chunks/:seq`);
  console.log(`  POST   /uploads/:id/finalize`);
  console.log(`  POST   /uploads/:id/abort`);
  console.log(`  GET    /uploads/:id  (Range supported)`);
});
