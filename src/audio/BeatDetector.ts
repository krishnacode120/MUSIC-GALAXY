import { clamp } from '../utils/random';
/** Positive spectral flux + trailing adaptive threshold. A tempo estimate is not ground-truth beat tracking. */
export class BeatDetector {
  private history: number[] = [];
  private times: number[] = [];
  private last = -10;
  private beatAt = -10;
  reset() {
    this.history = [];
    this.times = [];
    this.last = -10;
    this.beatAt = -10;
  }
  update(flux: number, time: number, energy: number) {
    const mean = this.history.reduce((a, b) => a + b, 0) / Math.max(1, this.history.length);
    const deviation = Math.sqrt(
      this.history.reduce((s, v) => s + (v - mean) ** 2, 0) / Math.max(1, this.history.length),
    );
    const threshold = Math.max(0.006, mean + 1.35 * deviation);
    const onset =
      this.history.length > 12 && flux > threshold && energy > 0.005 && time - this.last > 0.24;
    this.history.push(flux);
    if (this.history.length > 60) this.history.shift();
    if (onset) {
      this.last = time;
      this.times.push(time);
      if (this.times.length > 18) this.times.shift();
    }
    this.times = this.times.filter((t) => time - t < 12);
    const intervals = this.times
      .slice(1)
      .map((t, i) => t - this.times[i])
      .filter((x) => x > 0.27 && x < 1.35);
    let bpm: number | null = null,
      confidence = 0;
    if (intervals.length >= 4) {
      const ordered = [...intervals].sort((a, b) => a - b),
        median = ordered[Math.floor(ordered.length / 2)];
      const agrees = intervals.filter((x) => Math.abs(x - median) < median * 0.13);
      confidence = agrees.length / intervals.length;
      if (confidence >= 0.6) bpm = Math.round(60 / median);
    }
    let beat = 0;
    if (
      bpm &&
      time - this.beatAt >= (60 / bpm) * 0.85 &&
      (onset || time - this.beatAt >= 60 / bpm)
    ) {
      this.beatAt = time;
      beat = confidence;
    }
    return { onset: onset ? clamp(flux / threshold / 2) : 0, bpm, confidence, beat };
  }
}
