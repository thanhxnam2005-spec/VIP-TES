/** Voice descriptor returned by a TTS provider. */
export interface Voice {
  id: number | string;
  name: string;
  fullName: string;
  serverId?: string;
}

/** Options passed to fetchAudio / fluency adjuster. */
export interface TTSOptions {
  voice?: number | string;
  rate?: number;
  pitch?: number;
}

/** Playback-time options applied to the <audio> element. */
export interface PlaybackOptions {
  playbackRate?: number;
  preservesPitch?: boolean;
}

/** A single sentence produced by the tokenizer. */
export interface Sentence {
  text: string;
  originalText: string;
  index: number;
}

/**
 * Contract every TTS provider must satisfy.
 *
 * Providers that use the Web Speech API (or any other API that plays audio
 * directly without returning a Blob) should set `isDirectOnly = true`.
 */
export interface TTSProvider {
  id: string;
  name: string;
  friendlyName: string;

  /**
   * When `true` the provider plays audio itself (e.g. Web Speech API)
   * instead of returning a fetchable Blob.
   */
  isDirectOnly?: boolean;

  /** One-time async setup (lazy, called before first use). */
  initialize(): Promise<void>;

  /** List available voices for this provider. */
  getVoices(): Promise<Voice[]>;

  /** Fetch audio for `text`. Returns a Blob (audio/*). */
  fetchAudio(text: string, options?: TTSOptions): Promise<Blob>;

  /** Select the active voice by id. */
  setVoice(voice: number | string): void;

  /** Set speech rate (provider-side, before audio generation). */
  setRate(rate: number): void;

  /** Set speech pitch (provider-side, before audio generation). */
  setPitch(pitch: number): void;

  /**
   * Optional: seconds to trim from the end of the generated audio
   * to remove trailing silence / artifacts.
   */
  getCutTime?(text: string): number;

  /**
   * Optional: provider-specific playback options applied to the
   * `<audio>` element (e.g. adjusted playbackRate).
   */
  getPlaybackOptions?(): PlaybackOptions;

  /**
   * When `true`, the provider requires a user-supplied API key
   * (e.g. Gemini). The UI should show a key input for these.
   */
  requiresApiKey?: boolean;

  /** Set the API key for providers that require one. */
  setApiKey?(apiKey: string): void;
}

/**
 * Constructor signature for provider classes.
 * Used by the registry to instantiate providers on demand.
 */
export interface TTSProviderClass {
  new (): TTSProvider;
  friendlyName?: string;
}
