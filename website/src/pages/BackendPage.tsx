import { type ReactNode } from "react";
import { Link } from "react-router-dom";
import { DocsCodeBlock } from "../docs/CodeBlock";
import { DocsLayout } from "../docs/DocsLayout";

const sections = [
  { id: "overview", label: "Overview" },
  { id: "contract", prefix: "1.", label: "Contract" },
  { id: "http-wire", prefix: "2.", label: "Suggested HTTP wire" },
  { id: "must-get-right", prefix: "3.", label: "Must get right" },
  { id: "adapters", prefix: "4.", label: "Adapters" },
  { id: "sample-server", prefix: "5.", label: "Local sample server" },
  { id: "seek-repair", prefix: "6.", label: "Production: abrupt seek repair" },
] as const;

export function BackendPage() {
  return (
    <DocsLayout title="Backend" navId="backend-nav" navLabel="Backend sections" sections={sections}>
      <article className="docs-article docs-backend-article">
        <div className="docs-api-tables">
          <section id="overview">
            <header className="docs-intro">
              <h1>Backend</h1>
              <p>
                The library never talks to object storage. You implement four methods
                (or use the shipped HTTP adapters against your API).
              </p>
            </header>
          </section>

          <section id="contract" className="docs-api-sec">
            <h2>1. Contract</h2>
            <p>Implement these methods (or use the provided HTTP adapters).</p>
            <DocsCodeBlock
              code={BACKEND_CONTRACT}
              language="typescript"
              label="TypeScript"
              copyLabel="Copy backend contract"
            />
          </section>

          <section id="http-wire" className="docs-api-sec">
            <h2>2. Suggested HTTP wire</h2>
            <p>Example endpoints for a typical REST API.</p>
            <div className="docs-api-table-wrap">
              <table className="docs-api-table docs-api-table-wire">
                <thead>
                  <tr>
                    <th scope="col">Method</th>
                    <th scope="col">Path</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>POST</td>
                    <td>/uploads</td>
                  </tr>
                  <tr>
                    <td>PUT</td>
                    <td>/uploads/:id/chunks/:seq</td>
                  </tr>
                  <tr>
                    <td>POST</td>
                    <td>/uploads/:id/finalize</td>
                  </tr>
                  <tr>
                    <td>POST</td>
                    <td>/uploads/:id/abort</td>
                  </tr>
                  <tr>
                    <td>GET</td>
                    <td>/uploads/:id (Range / 206)</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section id="must-get-right" className="docs-api-sec">
            <h2>3. Must get right</h2>
            <p>Important constraints for compatibility and reliability.</p>
            <ul className="docs-backend-checks">
              {CONSTRAINTS.map((item) => (
                <li key={item}>
                  <span className="docs-backend-checks-ico" aria-hidden="true">
                    <CircleCheckIcon />
                  </span>
                  <p>{item}</p>
                </li>
              ))}
            </ul>
          </section>

          <section id="adapters" className="docs-api-sec">
            <h2>4. Adapters</h2>
            <p>Use the shipped HTTP adapters or implement your own backend.</p>
            <DocsCodeBlock
              code={BACKEND_ADAPTERS}
              language="typescript"
              label="TypeScript"
              copyLabel="Copy adapter imports"
            />
          </section>

          <section id="sample-server" className="docs-api-sec">
            <h2>5. Local sample server</h2>
            <p>
              The repo ships a Tier A Express sample under examples/backend/ —
              disk storage, CORS, Range, no cloud account.
            </p>
            <DocsCodeBlock
              code={BACKEND_SAMPLE_SHELL}
              language="shell"
              label="Shell"
              copyLabel="Copy sample server commands"
            />
          </section>

          <section id="seek-repair" className="docs-api-sec">
            <h2>6. Production: abrupt seek repair</h2>
            <p>
              Normal End seekability is mostly client-side (patched Part 0 + Cues).
              On abrupt finalize, return quickly with{" "}
              <code>seekRepairStatus: &quot;pending&quot;</code> (or{" "}
              <code>&quot;skipped&quot;</code>), then async-run{" "}
              <code>repairAbruptWebmSeekability</code> from the package and prefer
              the repaired object for playback.
            </p>
            <div className="docs-backend-actions">
              <Link className="btn btn-primary" to="/examples/react">
                <PlayIcon />
                Try demo (mock backend)
                <ArrowRightIcon />
              </Link>
              <a
                className="btn"
                href="https://github.com/akshaypmna18/mediastream-upload/tree/main/examples/backend"
                target="_blank"
                rel="noreferrer"
              >
                <GitHubIcon />
                Sample backend on GitHub
                <ArrowRightIcon />
              </a>
            </div>
          </section>
        </div>
      </article>
    </DocsLayout>
  );
}

const BACKEND_CONTRACT = `init(metadata) → { uploadId }

sendChunk(uploadId, sequenceNumber, checksum, bytes, options?) → void
  options.replace?: boolean   # Part 0 same-size rewrite

finalize(uploadId, totalChunks, options?) → { videoUrl, abrupt?, seekRepairStatus? }
  options.abrupt?: boolean

abort(uploadId, reason) → void`;

const BACKEND_ADAPTERS = `import { createR2Backend } from "mediastream-upload/adapters/r2";
import { createS3Backend } from "mediastream-upload/adapters/s3";

createR2Backend("https://your-worker.example.com");
createS3Backend("https://api.example.com/api/v1");`;

const BACKEND_SAMPLE_SHELL = `pnpm example:backend
# → http://127.0.0.1:8787

# then open the demo with:
# ?backend=http://127.0.0.1:8787`;

const CONSTRAINTS = [
  "Checksum + idempotent PUT: Part 0 replace",
  "Finalize gap-check 0 … totalChunks - 1",
  "Non-final parts ≥ 5 MiB (S3/R2 rule)",
  "Playback with HTTP Range",
  "Reject totalChunks < 1",
] as const;

function Glyph({ children }: { children: ReactNode }) {
  return (
    <svg
      className="docs-glyph"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

function CircleCheckIcon() {
  return (
    <Glyph>
      <circle cx="12" cy="12" r="10" />
      <path d="m9 12 2 2 4-4" />
    </Glyph>
  );
}

function PlayIcon() {
  return (
    <Glyph>
      <polygon points="6 3 20 12 6 21 6 3" fill="currentColor" />
    </Glyph>
  );
}

function ArrowRightIcon() {
  return (
    <Glyph>
      <path d="M5 12h14" />
      <path d="m12 5 7 7-7 7" />
    </Glyph>
  );
}

function GitHubIcon() {
  return (
    <svg className="docs-glyph" viewBox="0 0 16 16" aria-hidden="true">
      <path
        fill="currentColor"
        d="M8 1.2a6.8 6.8 0 0 0-2.15 13.25c.34.06.46-.15.46-.33v-1.16c-1.88.41-2.28-.9-2.28-.9-.3-.78-.75-1-.75-1-.62-.42.05-.41.05-.41.68.05 1.04.7 1.04.7.6 1.04 1.58.74 1.97.56.06-.44.24-.74.43-.91-1.5-.17-3.08-.75-3.08-3.34 0-.74.26-1.34.7-1.81-.07-.17-.3-.87.06-1.81 0 0 .56-.18 1.85.69a6.4 6.4 0 0 1 3.36 0c1.29-.87 1.85-.69 1.85-.69.36.94.13 1.64.06 1.81.44.47.7 1.07.7 1.81 0 2.6-1.58 3.17-3.09 3.34.25.21.46.63.46 1.28v1.9c0 .18.12.4.47.33A6.8 6.8 0 0 0 8 1.2Z"
      />
    </svg>
  );
}
