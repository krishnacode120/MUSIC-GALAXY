import { SpectrumAnalyzer } from './SpectrumAnalyzer';

/** One context and one media-element source for the lifetime of the app. */
export class AudioEngine {
  readonly element = new Audio();
  readonly events = new EventTarget();
  context: AudioContext | null = null;
  analyser: AnalyserNode | null = null;
  processor = new SpectrumAnalyzer();
  private source: MediaElementAudioSourceNode | null = null;
  private liveSource: MediaStreamAudioSourceNode | null = null;
  private liveStream: MediaStream | null = null;
  private liveEnded: (() => void) | null = null;
  private destination: MediaStreamAudioDestinationNode | null = null;
  private frequency = new Float32Array(1024);
  private waveform = new Float32Array(2048);
  private last = 0;
  private timer: ReturnType<typeof setInterval> | null = null;
  constructor() {
    this.element.preload = 'metadata';
    this.element.addEventListener('seeking', () => this.reset());
    this.element.addEventListener('emptied', () => this.reset());
  }
  get features() {
    return this.processor.features;
  }
  get isLive() {
    return this.liveSource !== null;
  }
  get running() {
    return this.context?.state === 'running';
  }
  /** Read-only view of the latest real waveform; renderers never synthesize a signal. */
  get timeDomain() {
    return this.waveform;
  }
  async activate() {
    if (!this.context) {
      this.context = new AudioContext();
      this.source = this.context.createMediaElementSource(this.element);
      this.analyser = this.context.createAnalyser();
      this.analyser.fftSize = 2048;
      this.analyser.smoothingTimeConstant = 0.15;
      this.source.connect(this.analyser);
      // Only local-file playback is routed to speakers. Never monitor live capture.
      this.source.connect(this.context.destination);
      this.processor = new SpectrumAnalyzer(this.context.sampleRate);
    }
    if (this.context.state === 'suspended') await this.context.resume();
    if (!this.timer) {
      this.last = performance.now() / 1000;
      this.timer = setInterval(() => this.sample(), 1000 / 60);
    }
  }
  private sample() {
    const now = performance.now() / 1000,
      dt = Math.min(0.1, now - this.last);
    this.last = now;
    const active = this.isLive || (!this.element.paused && !this.element.seeking);
    if (this.analyser && active && this.running) {
      this.analyser.getFloatFrequencyData(this.frequency);
      this.analyser.getFloatTimeDomainData(this.waveform);
      this.processor.update(this.frequency, this.waveform, now, dt);
    } else {
      this.processor.decay(dt);
      const release = Math.exp(-dt * 6);
      for (let i = 0; i < this.waveform.length; i++) this.waveform[i] *= release;
    }
  }
  async connectLive(stream: MediaStream, onEnded: () => void) {
    const audioTracks = stream.getAudioTracks();
    if (!audioTracks.length) {
      stream.getTracks().forEach((track) => track.stop());
      throw new Error(
        'No audio was shared. Choose the music tab and turn on “Share tab audio”, or choose Entire Screen with “Share system audio”.',
      );
    }
    try {
      await this.activate();
    } catch (error) {
      stream.getTracks().forEach((track) => track.stop());
      throw error;
    }
    this.disconnectLive();
    this.pause();
    this.source!.disconnect(this.analyser!);
    this.liveStream = stream;
    this.liveEnded = onEnded;
    try {
      // Screen video is required by the picker but is never read or stored.
      this.liveSource = this.context!.createMediaStreamSource(new MediaStream(audioTracks));
      this.liveSource.connect(this.analyser!);
      stream.getVideoTracks().forEach((track) => {
        track.enabled = false;
      });
      stream.getTracks().forEach((track) =>
        track.addEventListener(
          'ended',
          () => {
            if (this.liveStream === stream) this.disconnectLive();
          },
          { once: true },
        ),
      );
      this.reset();
    } catch (error) {
      this.disconnectLive();
      throw error;
    }
  }
  disconnectLive() {
    if (!this.liveStream) return;
    const stream = this.liveStream,
      ended = this.liveEnded;
    this.liveStream = null;
    this.liveEnded = null;
    this.liveSource?.disconnect();
    this.liveSource = null;
    stream.getTracks().forEach((track) => track.stop());
    if (this.source && this.analyser) this.source.connect(this.analyser);
    this.reset();
    ended?.();
  }
  async play() {
    this.disconnectLive();
    await this.activate();
    await this.element.play();
  }
  pause() {
    this.element.pause();
  }
  load(url: string) {
    this.disconnectLive();
    this.pause();
    this.reset();
    this.element.src = url;
    this.element.load();
  }
  seek(time: number) {
    if (Number.isFinite(this.element.duration))
      this.element.currentTime = Math.max(0, Math.min(this.element.duration, time));
    this.reset();
  }
  reset() {
    this.processor.reset();
    this.waveform.fill(0);
    this.events.dispatchEvent(new Event('reset'));
  }
  async recordingAudio() {
    await this.activate();
    if (!this.destination) {
      this.destination = this.context!.createMediaStreamDestination();
      this.analyser!.connect(this.destination);
    }
    return this.destination.stream.getAudioTracks().map((track) => track.clone());
  }
  dispose() {
    this.disconnectLive();
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    this.pause();
    this.element.removeAttribute('src');
    this.element.load();
    this.source?.disconnect();
    this.analyser?.disconnect();
    void this.context?.close();
  }
}
export const audioEngine = new AudioEngine();
