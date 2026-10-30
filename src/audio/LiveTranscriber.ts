import { audioEngine } from './AudioEngine';

export interface CaptionOptions {
  language: 'tamil' | 'english';
  model: 'tiny' | 'base';
  translate: boolean;
  acceleration: boolean;
}
export type CaptionEvent =
  | { type: 'status'; text: string }
  | { type: 'line'; text: string }
  | { type: 'draft'; text: string }
  | { type: 'error'; text: string };

/** Bounded PCM window → worker inference. No microphone request, server, or audio upload. */
export class LiveTranscriber {
  private worker: Worker | null = null;
  private tap: AudioWorkletNode | null = null;
  private sink: GainNode | null = null;
  private input: AnalyserNode | null = null;
  private revision = 0;
  private stopped = false;
  private busy = false;
  private ready = false;
  private pending: Float32Array | null = null;
  private lastLine = '';
  private loadTimeout: ReturnType<typeof setTimeout> | null = null;
  private silenceTimer: ReturnType<typeof setTimeout> | null = null;
  private inferenceTimeout: ReturnType<typeof setTimeout> | null = null;
  constructor(
    private options: CaptionOptions,
    private notify: (event: CaptionEvent) => void,
  ) {}

  async start() {
    try {
      if (!audioEngine.isLive && !audioEngine.element.currentSrc)
        throw new Error('Connect your music tab or choose a song before starting lyrics.');
      await audioEngine.activate();
      if (this.stopped) return;
      const ctx = audioEngine.context!;
      if (!ctx.audioWorklet)
        throw new Error(
          'On-device lyrics need AudioWorklet support. Open Music Galaxy in a recent desktop Chrome or Edge.',
        );
      this.notify({ type: 'status', text: 'Loading the on-device voice model…' });
      this.worker = new Worker(new URL('../workers/lyrics.worker.ts', import.meta.url), {
        type: 'module',
      });
      this.worker.onerror = (event) =>
        this.fail(
          `Caption worker could not start: ${event.message || 'browser initialization failed'}. Retry in desktop Chrome or Edge.`,
        );
      this.worker.onmessage = (event) => this.message(event.data);
      this.loadTimeout = setTimeout(
        () =>
          this.fail(
            'Model download timed out. Check your connection and retry; completed files are cached.',
          ),
        300000,
      );
      this.worker.postMessage({
        type: 'load',
        model: this.options.model,
        acceleration: this.options.acceleration,
      });
      await ctx.audioWorklet.addModule(`${import.meta.env.BASE_URL}audio/lyric-tap.js`);
      if (this.stopped) return;
      this.input = audioEngine.analyser!;
      this.tap = new AudioWorkletNode(ctx, 'lyric-tap', {
        numberOfInputs: 1,
        numberOfOutputs: 1,
        outputChannelCount: [1],
      });
      this.tap.onprocessorerror = () =>
        this.fail(
          'The browser stopped the caption audio tap. Reconnect your music source, then restart lyrics.',
        );
      this.sink = ctx.createGain();
      this.sink.gain.value = 0;
      this.input.connect(this.tap);
      this.tap.connect(this.sink);
      this.sink.connect(ctx.destination);
      this.tap.port.onmessage = (
        event: MessageEvent<{
          type: 'audio' | 'buffer';
          audio?: Float32Array;
          seconds?: number;
          rms?: number;
          revision: number;
        }>,
      ) => {
        if (event.data.revision !== this.revision) return;
        if (event.data.type === 'buffer' && this.ready && !this.busy)
          this.notify({
            type: 'status',
            text:
              (event.data.rms ?? 0) < 0.0008
                ? 'The selected source is silent. Play your song; for sharing, enable Share tab audio.'
                : `Receiving audio · ${Math.round(event.data.seconds ?? 0)} seconds buffered`,
          });
        if (event.data.audio) this.enqueue(event.data.audio);
      };
      audioEngine.events.addEventListener('reset', this.reset);
    } catch (error) {
      this.fail(error instanceof Error ? error.message : String(error));
    }
  }
  private reset = () => {
    this.revision++;
    this.pending = null;
    this.lastLine = '';
    this.tap?.port.postMessage(this.revision);
    this.notify({ type: 'line', text: '' });
    this.notify({ type: 'draft', text: '' });
    if (this.ready) this.notify({ type: 'status', text: 'Listening for the next vocal phrase…' });
  };
  private enqueue(audio: Float32Array) {
    if (this.stopped || !this.ready) return;
    let squares = 0,
      peak = 0;
    for (let i = 0; i < audio.length; i++) {
      squares += audio[i] * audio[i];
      peak = Math.max(peak, Math.abs(audio[i]));
    }
    const rms = Math.sqrt(squares / audio.length);
    if (rms < 0.0008) {
      this.notify({ type: 'status', text: 'Waiting for audible vocals…' });
      return;
    }
    if (this.busy) {
      this.pending = audio;
      return;
    } // At most one waiting window, never an unbounded queue.
    this.busy = true;
    const gain = Math.min(6, 0.12 / Math.max(rms, 0.0008), 0.9 / Math.max(peak, 0.001));
    for (let i = 0; i < audio.length; i++) audio[i] *= gain;
    this.notify({ type: 'status', text: 'Transcribing live · words appear as they are decoded…' });
    this.inferenceTimeout = setTimeout(
      () =>
        this.fail(
          'This device is taking too long to transcribe. Retry with the lighter Tiny model.',
        ),
      120000,
    );
    this.worker?.postMessage(
      { type: 'transcribe', audio, revision: this.revision, ...this.options },
      [audio.buffer],
    );
  }
  private message(data: {
    type: string;
    progress?: number;
    file?: string;
    revision?: number;
    text?: string;
    message?: string;
    device?: string;
    stage?: string;
    local?: boolean;
  }) {
    if (this.stopped) return;
    if (data.type === 'progress')
      this.notify({
        type: 'status',
        text:
          (data.progress ?? 0) >= 100
            ? 'Preparing the speech model; the download is complete…'
            : `${data.local ? 'Reading local' : 'Downloading'} ${data.file?.includes('encoder') ? 'voice encoder' : data.file?.includes('decoder') ? 'voice decoder' : 'model files'} · ${Math.round(data.progress ?? 0)}%`,
      });
    if (data.type === 'ready') {
      if (this.loadTimeout) clearTimeout(this.loadTimeout);
      this.loadTimeout = null;
      this.ready = true;
      this.tap?.port.postMessage(this.revision);
      this.notify({
        type: 'status',
        text: `Listening live · ${data.device === 'webgpu' ? 'GPU accelerated' : 'on-device CPU'} · collecting the first 4 seconds`,
      });
    }
    if (data.type === 'backend')
      this.notify({ type: 'status', text: data.text ?? 'Preparing captions…' });
    if (data.type === 'partial' && data.revision === this.revision)
      this.notify({ type: 'draft', text: removeOverlap(this.lastLine, data.text ?? '').trim() });
    if (data.type === 'error')
      this.fail(
        `${data.stage === 'model' ? 'The voice model could not start' : 'Speech decoding failed'}: ${data.message ?? 'unknown model error'}. ${this.options.acceleration ? 'Turn off GPU acceleration and retry.' : 'Try Tiny with Tamil or English selected. If model files are missing, run npm run setup:lyrics.'}`,
      );
    if (data.type === 'result') {
      if (this.inferenceTimeout) clearTimeout(this.inferenceTimeout);
      this.inferenceTimeout = null;
      this.busy = false;
      if (data.revision === this.revision) this.notify({ type: 'draft', text: '' });
      if (data.revision === this.revision) {
        const raw = (data.text ?? '')
          .replace(/\[(?:music|silence|applause)\]|\((?:music|silence|applause)\)/gi, '')
          .trim();
        const text = removeOverlap(this.lastLine, raw);
        if (text && raw !== this.lastLine) {
          this.lastLine = raw;
          this.notify({ type: 'line', text });
          if (this.silenceTimer) clearTimeout(this.silenceTimer);
          this.silenceTimer = setTimeout(() => {
            this.lastLine = '';
            this.notify({ type: 'line', text: '' });
          }, 24000);
        }
        this.notify({ type: 'status', text: 'Listening · captions follow the audio with a delay' });
      }
      const pending = this.pending;
      this.pending = null;
      if (pending) this.enqueue(pending);
    }
  }
  private fail(text: string) {
    if (this.stopped) return;
    this.notify({ type: 'error', text });
    this.stop();
  }
  stop() {
    this.stopped = true;
    this.revision++;
    this.pending = null;
    audioEngine.events.removeEventListener('reset', this.reset);
    if (this.loadTimeout) clearTimeout(this.loadTimeout);
    if (this.silenceTimer) clearTimeout(this.silenceTimer);
    if (this.inferenceTimeout) clearTimeout(this.inferenceTimeout);
    this.worker?.terminate();
    this.worker = null;
    if (this.tap) {
      this.tap.port.onmessage = null;
      try {
        this.input?.disconnect(this.tap);
      } catch {
        /* Source may already be disposed. */
      }
      this.tap.disconnect();
      this.tap.port.close();
    }
    this.sink?.disconnect();
    this.tap = null;
    this.sink = null;
    this.input = null;
  }
}

/** Overlapping PCM windows provide context; avoid showing those same words twice. */
function removeOverlap(previous: string, next: string) {
  const before = previous.split(/\s+/),
    after = next.split(/\s+/);
  for (let n = Math.min(16, before.length, after.length); n >= 2; n--) {
    if (
      before.slice(-n).join(' ').toLocaleLowerCase() ===
      after.slice(0, n).join(' ').toLocaleLowerCase()
    )
      return after.slice(n).join(' ');
  }
  return next;
}
