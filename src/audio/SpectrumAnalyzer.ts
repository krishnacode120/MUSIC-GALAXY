import { BeatDetector } from './BeatDetector';
import { emptyFeatures } from './types';
import { clamp } from '../utils/random';
export const smooth = (previous: number, next: number, dt: number, attack = 0.035, release = 0.3) =>
  previous + (next - previous) * (1 - Math.exp(-dt / (next > previous ? attack : release)));
export function bandEnergy(
  spectrum: Float32Array,
  sampleRate: number,
  fftSize: number,
  low: number,
  high: number,
) {
  const from = Math.max(1, Math.floor((low * fftSize) / sampleRate)),
    to = Math.min(spectrum.length, Math.ceil((high * fftSize) / sampleRate));
  let sum = 0;
  for (let i = from; i < to; i++) sum += spectrum[i] ** 2;
  return Math.sqrt(sum / Math.max(1, to - from));
}
export class SpectrumAnalyzer {
  features = emptyFeatures();
  private detector = new BeatDetector();
  private previous: Float32Array;
  private linear: Float32Array;
  private rolling = 0.02;
  private oldBass = 0;
  constructor(
    public sampleRate = 48000,
    public fftSize = 2048,
  ) {
    this.previous = new Float32Array(fftSize / 2);
    this.linear = new Float32Array(fftSize / 2);
  }
  reset() {
    this.features = emptyFeatures();
    this.previous.fill(0);
    this.detector.reset();
    this.rolling = 0.02;
    this.oldBass = 0;
  }
  update(db: Float32Array, wave: Float32Array, time: number, dt: number) {
    let squared = 0,
      flux = 0,
      weighted = 0,
      total = 0;
    for (let i = 0; i < wave.length; i++) squared += wave[i] ** 2;
    const rms = Math.sqrt(squared / wave.length);
    for (let i = 0; i < db.length; i++) {
      const v = Number.isFinite(db[i]) ? 10 ** (db[i] / 20) : 0;
      this.linear[i] = v;
      flux += Math.max(0, v - this.previous[i]);
      weighted += (v * i * this.sampleRate) / this.fftSize;
      total += v;
      this.previous[i] = v;
    }
    flux /= db.length;
    flux *= 20;
    this.rolling = smooth(this.rolling, rms, dt, 0.3, 5);
    const gain = Math.min(12, 1 / Math.max(0.045, this.rolling * 2.2));
    const bands = [
      bandEnergy(this.linear, this.sampleRate, this.fftSize, 30, 250),
      bandEnergy(this.linear, this.sampleRate, this.fftSize, 250, 4000),
      bandEnergy(this.linear, this.sampleRate, this.fftSize, 4000, 16000),
    ];
    const f = this.features;
    const normalized = bands.map((x, i) => clamp(x * gain * [3, 5, 8][i]));
    f.bassTransient =
      normalized[0] - this.oldBass > 0.16 && rms > 0.005 ? 1 : f.bassTransient * Math.exp(-dt * 8);
    this.oldBass = normalized[0];
    [f.bass, f.mid, f.treble] = normalized.map((x, i) =>
      smooth([f.bass, f.mid, f.treble][i], x, dt),
    );
    f.rms = rms;
    f.energy = smooth(f.energy, clamp(rms * gain), dt);
    f.centroid = total > 1e-6 ? weighted / total : 0;
    f.flux = flux;
    const beat = this.detector.update(flux, time, rms);
    f.onset = Math.max(beat.onset, f.onset * Math.exp(-dt * 9));
    f.beat = Math.max(beat.beat, f.beat * Math.exp(-dt * 10));
    f.bpm = beat.bpm;
    f.confidence = beat.confidence;
    for (let i = 0; i < 64; i++) {
      const start = Math.floor(Math.exp((i / 64) * Math.log(db.length)) - 1);
      const end = Math.max(
        start + 1,
        Math.floor(Math.exp(((i + 1) / 64) * Math.log(db.length)) - 1),
      );
      let v = 0;
      for (let j = start; j < end; j++) v += this.linear[j];
      f.spectrum[i] = smooth(f.spectrum[i], clamp((v / (end - start)) * gain * 4), dt);
    }
    return f;
  }
  decay(dt: number) {
    const f = this.features;
    for (const key of [
      'bass',
      'mid',
      'treble',
      'energy',
      'onset',
      'bassTransient',
      'beat',
      'rms',
    ] as const)
      f[key] *= Math.exp(-dt * 6);
    for (let i = 0; i < 64; i++) f.spectrum[i] *= Math.exp(-dt * 6);
    return f;
  }
}
