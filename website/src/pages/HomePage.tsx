import { Link } from "react-router-dom";

const github = "https://github.com/akshaypmna18/mediastream-upload";
const npm = "https://www.npmjs.com/package/mediastream-upload";

/* Star count is paused. Restore useStarCount and the chip below when ready.
function useStarCount() {
  const [stars, setStars] = useState<number | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetch("https://api.github.com/repos/akshaypmna18/mediastream-upload", {
      signal: controller.signal,
    })
      .then((response) => (response.ok ? response.json() : null))
      .then((data: { stargazers_count?: number } | null) => {
        if (typeof data?.stargazers_count === "number") setStars(data.stargazers_count);
      })
      .catch(() => {
        // hide the chip when the count is unavailable
      });
    return () => controller.abort();
  }, []);

  return stars;
}
*/

export function HomePage() {

  return (
    <article>
      <section className="hero" aria-labelledby="hero-title">
        <div className="hero-copy">
          <ul className="hero-badges">
            <li>TypeScript</li>
            <li>Browser</li>
            <li>0 dependencies</li>
          </ul>
          <h1 id="hero-title">
            Upload while
            <br />
            you <span>record.</span>
          </h1>
          <p>
            Record MediaStreams in the browser and upload them as seekable WebM
            chunks in real time — no large upload at the end.
          </p>
          <div className="hero-actions">
            <Link className="btn btn-primary" to="/examples/react">
              <PlayIcon />
              Try live demo
              <ArrowIcon />
            </Link>
            <Link className="btn" to="/guide">
              Get started
              <ArrowIcon />
            </Link>
          </div>
          <div className="hero-links">
            <a href={github}>
              <GitHubIcon />
              GitHub
            </a>
            <span className="hero-link-sep" aria-hidden="true" />
            <a href={npm}>
              <NpmIcon />
              npm
            </a>
            {/*
            {stars !== null && (
              <>
                <span className="hero-link-sep" aria-hidden="true" />
                <a className="star-chip" href={github}>
                  <StarIcon />
                  {stars.toLocaleString("en-US")}
                </a>
              </>
            )}
            */}
          </div>
        </div>

        <div className="hero-panel">
          <ol className="flow" aria-label="How it works">
            <li className="step">
              <p className="step-title">
                MediaStream
                <span>main source</span>
              </p>
              <ul className="step-list">
                <li>
                  <CameraIcon /> Camera
                </li>
                <li>
                  <ScreenIcon /> Screen
                </li>
                <li>
                  <VideoIcon /> Video element
                </li>
              </ul>
            </li>
            <li className="flow-arrow" aria-hidden="true">
              <ArrowIcon />
            </li>
            <li className="step">
              <p className="step-title">
                Compose
                <span>optional PiP</span>
              </p>
              <div className="pip">
                <FrameIcon />
                <span className="pip-badge" aria-hidden="true">
                  <VideoIcon />
                </span>
              </div>
              <p className="step-caption">Main + PiP</p>
            </li>
            <li className="flow-arrow" aria-hidden="true">
              <ArrowIcon />
            </li>
            <li className="step">
              <p className="step-title">WebM Recorder</p>
              <div className="step-glyph">
                <FileIcon />
              </div>
              <p className="step-caption">VP9 / VP8 / Opus</p>
            </li>
            <li className="flow-arrow" aria-hidden="true">
              <ArrowIcon />
            </li>
            <li className="step">
              <p className="step-title">5 MiB chunks</p>
              <div className="step-glyph chunks" aria-hidden="true">
                <span />
                <span />
                <span />
              </div>
              <p className="step-caption">Upload while recording</p>
            </li>
            <li className="flow-arrow" aria-hidden="true">
              <ArrowIcon />
            </li>
            <li className="step">
              <p className="step-title">
                Backend
                <span>your storage</span>
              </p>
              <div className="step-glyph">
                <CloudIcon />
              </div>
              <p className="step-caption">
                R2 / S3
                <span>or custom</span>
              </p>
            </li>
          </ol>

          <div className="compare">
            <p className="compare-label">Traditional recording flow</p>
            <div className="compare-row">
              <p className="bar bar-record">Record (10 min)</p>
              <p className="bar bar-wait">Upload (~50 sec)</p>
              <p className="compare-note">User waits for the upload to complete</p>
            </div>
            <p className="compare-label">With mediastream-upload</p>
            <div className="compare-row">
              <p className="bar bar-live">Record + Upload simultaneously (10 min)</p>
              <p className="bar bar-done">Finalize (~1–2 sec)</p>
              <p className="compare-note">Minimal wait after recording</p>
            </div>
            <p className="compare-disclaimer">
              Upload duration varies with encoded bitrate, network throughput, and
              backend performance. The ~50 sec value is an illustrative example,
              not a guaranteed benchmark.
            </p>
          </div>

          <ul className="legend">
            <li>
              <span className="dot dot-record" aria-hidden="true" />
              <span>
                Recording
                <small>Capturing and encoding</small>
              </span>
            </li>
            <li>
              <span className="dot dot-upload" aria-hidden="true" />
              <span>
                Uploading
                <small>Sending chunks (5 MiB)</small>
              </span>
            </li>
            <li>
              <span className="dot dot-final" aria-hidden="true" />
              <span>
                Finalizing
                <small>Patching metadata (SeekHead, Cues, Duration)</small>
              </span>
            </li>
          </ul>
        </div>
      </section>

      <div className="prose">
        <h2>Why it exists</h2>
        <p>
          Typical recorders wait until stop, then upload tens of megabytes.
          This library composites main + optional PiP, seals multipart chunks at
          5&nbsp;MiB while you are still live, and patches Duration / SeekHead /
          Cues so remote scrub works when upload completes.
        </p>

        <h2>Install</h2>
        <pre>{`pnpm add mediastream-upload`}</pre>

        <h2>Quick start</h2>
        <pre>{`import { ChunkRecorder } from "mediastream-upload";
import { createR2Backend } from "mediastream-upload/adapters/r2";

const stream = await navigator.mediaDevices.getUserMedia({
  video: true,
  audio: true,
});

const recorder = new ChunkRecorder({ onStateChange: console.log });

await recorder.start({
  sources: { main: stream },
  backend: createR2Backend("https://your-api.example.com"),
});

const { videoUrl, localBlob } = await recorder.stop();`}</pre>

        <p className="note">
          Call <code>start()</code> from a user gesture so{" "}
          <code>AudioContext</code> can resume. Use HTTPS or localhost for{" "}
          <code>getUserMedia</code>.
        </p>

        <h2>Where to go next</h2>
        <ul>
          <li>
            <Link to="/guide">Guide</Link> — camera, PiP, errors
          </li>
          <li>
            <Link to="/api">API</Link> — public surface &amp; state machine
          </li>
          <li>
            <Link to="/backend">Backend</Link> — four methods + sample server
          </li>
          <li>
            <Link to="/examples/react">Live demo</Link> — Network-tab friendly
          </li>
          <li>
            <Link to="/examples/vanilla">Vanilla walkthrough</Link> — same flow
            without React
          </li>
        </ul>
      </div>
    </article>
  );
}

function ArrowIcon() {
  return (
    <svg className="icon" viewBox="0 0 16 16" aria-hidden="true">
      <path
        d="M3 8h10M9 4l4 4-4 4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function PlayIcon() {
  return (
    <svg className="icon" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M5.5 3.8v8.4L12.4 8 5.5 3.8Z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/* function StarIcon() {
  return (
    <svg className="icon" viewBox="0 0 16 16" aria-hidden="true">
      <path
        fill="currentColor"
        d="m8 1.8 1.7 3.6 4 .5-2.9 2.7.8 3.9L8 10.6 4.4 12.5l.8-3.9L2.3 5.9l4-.5L8 1.8Z"
      />
    </svg>
  );
} */

function CameraIcon() {
  return (
    <svg className="icon" viewBox="0 0 16 16" aria-hidden="true">
      <path
        d="M2 5.5h7.2v6H2v-6Zm7.2 1.6 4.8-2v7l-4.8-2v-3Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ScreenIcon() {
  return (
    <svg className="icon" viewBox="0 0 16 16" aria-hidden="true">
      <rect
        x="2"
        y="3"
        width="12"
        height="8"
        rx="1"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
      />
      <path d="M6 13h4M8 11v2" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}

function VideoIcon() {
  return (
    <svg className="icon" viewBox="0 0 16 16" aria-hidden="true">
      <rect
        x="2"
        y="3.5"
        width="12"
        height="9"
        rx="1.2"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
      />
      <path d="M7 6.2v3.6L10.2 8 7 6.2Z" fill="currentColor" />
    </svg>
  );
}

function FrameIcon() {
  return (
    <svg viewBox="0 0 48 36" aria-hidden="true">
      <rect x="1" y="1" width="46" height="34" rx="4" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M6 28 16 16l8 8 6-5 12 9"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <circle cx="14" cy="11" r="2.2" fill="currentColor" />
    </svg>
  );
}

function FileIcon() {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true">
      <path
        d="M8 4h11l6 6v18H8V4Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path d="M19 4v6h6" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M12 20h2.2l1.2-3 1.5 5 1.4-2H22"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CloudIcon() {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true">
      <path
        d="M10 22h12.2a4.2 4.2 0 0 0 .4-8.4 6 6 0 0 0-11.5-1.5A4 4 0 0 0 10 22Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M16 15v7M13.5 17.2 16 14.8l2.5 2.4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function GitHubIcon() {
  return (
    <svg className="icon" viewBox="0 0 16 16" aria-hidden="true">
      <path
        fill="currentColor"
        d="M8 1.2a6.8 6.8 0 0 0-2.15 13.25c.34.06.46-.15.46-.33v-1.16c-1.88.41-2.28-.9-2.28-.9-.3-.78-.75-1-.75-1-.62-.42.05-.41.05-.41.68.05 1.04.7 1.04.7.6 1.04 1.58.74 1.97.56.06-.44.24-.74.43-.91-1.5-.17-3.08-.75-3.08-3.34 0-.74.26-1.34.7-1.81-.07-.17-.3-.87.06-1.81 0 0 .56-.18 1.85.69a6.4 6.4 0 0 1 3.36 0c1.29-.87 1.85-.69 1.85-.69.36.94.13 1.64.06 1.81.44.47.7 1.07.7 1.81 0 2.6-1.58 3.17-3.09 3.34.25.21.46.63.46 1.28v1.9c0 .18.12.4.47.33A6.8 6.8 0 0 0 8 1.2Z"
      />
    </svg>
  );
}

function NpmIcon() {
  return (
    <svg className="icon" viewBox="0 0 16 16" aria-hidden="true">
      <rect x="1.5" y="1.5" width="13" height="13" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.3" />
      <path d="M4 11V5h2.2v4.2h1.1V5H11v6H4Z" fill="currentColor" />
    </svg>
  );
}
