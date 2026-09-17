import { SourceInitializationError } from "../errors";
import type { ChunkRecorderSource, LogHandler } from "../types";

export type AudioMixerOptions = {
  /** Frame rate hint when falling back to `HTMLVideoElement.captureStream`. */
  fps?: number;
  log?: LogHandler;
};

export type AudioMixerResult = {
  audioContext: AudioContext;
  destination: MediaStreamAudioDestinationNode;
  audioTracks: MediaStreamTrack[];
};

/**
 * Default speaker routing: live MediaStream mains → true; file-backed video → false.
 */
export function shouldRouteSourceToSpeakers(
  source: ChunkRecorderSource,
): boolean {
  if (
    source instanceof HTMLVideoElement &&
    !(source.srcObject instanceof MediaStream)
  ) {
    return false;
  }
  return true;
}

/**
 * Resolve a draw source to a MediaStream that can supply audio tracks.
 *
 * @throws {SourceInitializationError} when no MediaStream is available
 */
export function resolveAudioMediaStream(
  source: ChunkRecorderSource,
  fps = 30,
): MediaStream {
  if (source instanceof MediaStream) {
    return source;
  }

  if (source.srcObject instanceof MediaStream) {
    return source.srcObject;
  }

  const captureStream = (
    source as HTMLVideoElement & {
      captureStream?: (frameRate?: number) => MediaStream;
    }
  ).captureStream;

  if (typeof captureStream === "function") {
    return captureStream.call(source, fps);
  }

  throw new SourceInitializationError(
    "Source has no MediaStream audio. Pass a MediaStream or an HTMLVideoElement with srcObject / captureStream support.",
  );
}

/**
 * Mix audio tracks from main (+ optional pip) into a single destination stream.
 *
 * Call from a user-gesture context so `AudioContext` can leave `suspended`.
 */
export async function createAudioMixer(
  main: ChunkRecorderSource,
  pip: ChunkRecorderSource | undefined,
  options: AudioMixerOptions & {
    playbackToSpeakers?: boolean;
  } = {},
): Promise<AudioMixerResult> {
  const fps = options.fps ?? 30;
  const log = options.log ?? (() => undefined);

  const audioContext = new AudioContext();
  if (audioContext.state === "suspended") {
    await audioContext.resume();
  }

  const destination = audioContext.createMediaStreamDestination();
  let connectedAudioTracks = 0;

  const connectAudio = (
    source: ChunkRecorderSource,
    alsoToSpeakers: boolean,
  ) => {
    const stream = resolveAudioMediaStream(source, fps);
    const audioTracks = stream.getAudioTracks();
    if (audioTracks.length === 0) return;
    const node = audioContext.createMediaStreamSource(
      new MediaStream(audioTracks),
    );
    node.connect(destination);
    if (alsoToSpeakers) {
      node.connect(audioContext.destination);
    }
    connectedAudioTracks += audioTracks.length;
  };

  const playMainToSpeakers =
    options.playbackToSpeakers ?? shouldRouteSourceToSpeakers(main);
  connectAudio(main, playMainToSpeakers);
  if (pip) connectAudio(pip, false);

  if (connectedAudioTracks === 0) {
    void audioContext.close();
    throw new SourceInitializationError("No audio tracks available to mix");
  }

  const audioTracks = destination.stream.getAudioTracks();
  if (audioTracks.length === 0) {
    void audioContext.close();
    throw new SourceInitializationError(
      "Failed to build MediaStreamAudioDestinationNode tracks",
    );
  }

  log("info", "audioMixer.ready", {
    connectedAudioTracks,
    playbackToSpeakers: playMainToSpeakers,
  });

  return { audioContext, destination, audioTracks };
}
