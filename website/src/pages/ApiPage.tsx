import { DocsCodeBlock } from "../docs/CodeBlock";
import { DocsLayout } from "../docs/DocsLayout";

const sections = [
  { id: "overview", label: "Overview" },
  { id: "imports", prefix: "1.", label: "Imports" },
  { id: "chunk-recorder", prefix: "2.", label: "ChunkRecorder" },
  { id: "start-options", prefix: "3.", label: "Start options" },
  { id: "state-machine", prefix: "4.", label: "State machine" },
  { id: "typed-errors", prefix: "5.", label: "Typed errors" },
  { id: "also-exported", prefix: "6.", label: "Also exported" },
] as const;

export function ApiPage() {
  return (
    <DocsLayout title="API" navId="api-nav" navLabel="API sections" sections={sections}>
      <article className="docs-article docs-api-article">
        <div className="docs-api-start">
          <section id="overview">
            <header className="docs-intro">
              <h1>API</h1>
              <p>Public surface of mediastream-upload. Adapters are separate entry points.</p>
              <ul className="hero-badges">
                <li>TypeScript</li>
                <li>Browser</li>
                <li>0 dependencies</li>
              </ul>
            </header>
          </section>

          <section id="imports" className="docs-panel">
            <h2>Imports</h2>
            <p>Import the core recorder and one backend adapter (R2 or S3).</p>
            <DocsCodeBlock
              code={API_IMPORTS}
              language="typescript"
              label="TypeScript"
              copyLabel="Copy TypeScript imports"
            />
          </section>
        </div>

        <div className="docs-api-tables">
          <section id="chunk-recorder" className="docs-api-sec">
            <h2>ChunkRecorder</h2>
            <p>Main class for recording and uploading media streams in the browser.</p>
            <div className="docs-api-table-wrap">
              <table className="docs-api-table docs-api-table-methods">
                <thead>
                  <tr>
                    <th scope="col">Method</th>
                    <th scope="col">Description</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td><code>start(args)</code></td>
                    <td>Init backend + media; enter recording</td>
                  </tr>
                  <tr>
                    <td><code>stop()</code></td>
                    <td>
                      Flush, seek-patch, finalize →{" "}
                      <code>{`{ videoUrl, localBlob }`}</code>
                    </td>
                  </tr>
                  <tr>
                    <td><code>destroy()</code></td>
                    <td>Tear down; abort if needed</td>
                  </tr>
                  <tr>
                    <td><code>getState()</code></td>
                    <td>Current state string</td>
                  </tr>
                  <tr>
                    <td><code>getEmergencyBlob()</code></td>
                    <td>Local bytes after mid-session failure</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section id="start-options" className="docs-api-sec">
            <h2>Start options (common)</h2>
            <p>Common options accepted by start() across use cases.</p>
            <div className="docs-api-table-wrap">
              <table className="docs-api-table docs-api-table-options">
                <thead>
                  <tr>
                    <th scope="col">Field</th>
                    <th scope="col">Type</th>
                    <th scope="col">Default</th>
                    <th scope="col">Description</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td><code>canvasWidth / canvasHeight</code></td>
                    <td>number</td>
                    <td>1280 × 720</td>
                    <td>Output video resolution</td>
                  </tr>
                  <tr>
                    <td><code>fps</code></td>
                    <td>number</td>
                    <td>30</td>
                    <td>Target frame rate</td>
                  </tr>
                  <tr>
                    <td><code>pipWidth / pipHeight / pipMargin</code></td>
                    <td>number</td>
                    <td>320 / 180 / 12</td>
                    <td>PiP size and margin (px)</td>
                  </tr>
                  <tr>
                    <td><code>pipPosition</code></td>
                    <td>
                      {"'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'"}
                    </td>
                    <td>top-left</td>
                    <td>Camera PiP position</td>
                  </tr>
                  <tr>
                    <td><code>videoBitsPerSecond</code></td>
                    <td>number</td>
                    <td>2,500,000</td>
                    <td>Target video bitrate (bps)</td>
                  </tr>
                  <tr>
                    <td><code>audioBitsPerSecond</code></td>
                    <td>number</td>
                    <td>128,000</td>
                    <td>Target audio bitrate (bps)</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section id="state-machine" className="docs-api-sec">
            <h2>State machine</h2>
            <p>High-level recorder state transitions.</p>
            <DocsCodeBlock
              code={STATE_MACHINE}
              language="text"
              label="Text"
              copyLabel="Copy state machine diagram"
              lineNumbers={false}
              align="center"
            />
            <p className="docs-api-note">
              Degraded and backpressured are optional. ≥15 MiB → degraded; ≥50 MiB →
              backpressured (capture pauses).
            </p>
          </section>

          <section id="typed-errors" className="docs-api-sec">
            <h2>Typed errors</h2>
            <p>Prefer instanceof checks for specific error handling.</p>
            <div className="docs-api-table-wrap">
              <table className="docs-api-table docs-api-table-errors">
                <thead>
                  <tr>
                    <th scope="col">Error</th>
                    <th scope="col">Description</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td><code>UnsupportedBrowserError</code></td>
                    <td>
                      Browser doesn&apos;t support required APIs (MediaRecorder, WebM,
                      etc.).
                    </td>
                  </tr>
                  <tr>
                    <td><code>SourceInitializationError</code></td>
                    <td>
                      Failed to initialize media sources (camera, screen, etc.).
                    </td>
                  </tr>
                  <tr>
                    <td><code>Chunk0FatalError</code></td>
                    <td>Sequence 0 exhausted retries; upload cannot continue.</td>
                  </tr>
                  <tr>
                    <td><code>ChunkUploadError</code></td>
                    <td>Failed to upload a chunk.</td>
                  </tr>
                  <tr>
                    <td><code>FinalizeError</code></td>
                    <td>Failed to finalize the recording (seek-patch).</td>
                  </tr>
                  <tr>
                    <td><code>BackpressureOverflowError</code></td>
                    <td>Upload queue exceeded backpressure limits.</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section id="also-exported" className="docs-api-sec">
            <h2>Also exported</h2>
            <p>Additional helpers for utility use cases.</p>
            <div className="docs-api-export">
              <code>PART_SIZE</code>
              <p>5 MiB non-final part size.</p>
              <code>DEGRADED_BYTES / BACKPRESSURE_BYTES</code>
              <p>15 MiB degraded; 50 MiB backpressured (capture pauses).</p>
              <code>ChunkRecorderError</code>
              <p>Base class for the typed errors above.</p>
              <code>repairAbruptWebmSeekability</code>
              <p>Fixes WebM metadata for backend parity on abrupt finalize.</p>
              <div className="docs-api-export-names">
                <code>scanWebmForSeekMetadata</code>
                <code>scanBlobsForSeekMetadata</code>
                <code>patchDurationSameSize</code>
                <code>patchSeekHeadCuesSameSize</code>
                <code>ensureDurationPatchable</code>
                <code>ensureSeekHeadReservable</code>
                <code>buildCuesElement</code>
                <code>SEEKHEAD_RESERVE_BYTES</code>
              </div>
              <p>Other WebM seek helpers for Duration, SeekHead, and Cues.</p>
            </div>
          </section>
        </div>
      </article>
    </DocsLayout>
  );
}

const API_IMPORTS = `import {
  ChunkRecorder,
  UnsupportedBrowserError,
  SourceInitializationError,
} from "mediastream-upload";

import { createR2Backend } from "mediastream-upload/adapters/r2";
// or: import { createS3Backend } from "mediastream-upload/adapters/s3";`;

const STATE_MACHINE = `idle → initializing → recording → finalizing → completed | failed | cancelled

optional: recording → degraded → backpressured`;
