import type { AudioFeatures } from '../audio/types';

/** Fixed-size visual event history. Events only come from measured audio transients. */
export class VisualRhythm {
  readonly radii = new Float32Array(8);
  readonly powers = new Float32Array(8);
  private ages = new Float32Array(8).fill(100);
  private strengths = new Float32Array(8);
  private cursor = 0;
  private previous = 0;
  private sinceHit = 10;
  hit = 0;
  travel = 0;
  advance(features: AudioFeatures, dt: number, reduced = false) {
    const transient = Math.max(features.onset, features.bassTransient * 0.8);
    this.sinceHit += dt;
    this.hit *= Math.exp(-dt * 5);
    if (reduced) this.hit = 0;
    if (
      !reduced &&
      transient > 0.28 &&
      transient > this.previous + 0.1 &&
      this.sinceHit > 0.23 &&
      features.rms > 0.002
    ) {
      this.ages[this.cursor] = 0;
      this.strengths[this.cursor] = transient;
      this.cursor = (this.cursor + 1) % 8;
      this.hit = transient;
      this.sinceHit = 0;
    }
    this.previous = transient;
    this.travel += dt * (1.2 + features.energy * 13 + this.hit * 3);
    for (let i = 0; i < 8; i++) {
      this.ages[i] += dt;
      this.radii[i] = this.ages[i] * 8;
      this.powers[i] = reduced ? 0 : this.strengths[i] * Math.exp(-this.ages[i] * 1.1);
    }
  }
}
