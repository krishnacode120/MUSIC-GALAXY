import * as THREE from 'three';
import { audioEngine } from '../audio/AudioEngine';
import { useUniverse } from '../stores/universe';
import { useExperience } from '../stores/experience';
import { VisualRhythm } from './VisualRhythm';

/** Shared mutable render signal: no React state, no simulated beats, no frame allocations. */
export class ReactiveSignal {
  time = 0;
  travel = 0;
  bass = 0;
  mid = 0;
  treble = 0;
  energy = 0;
  hit = 0;
  spectrum = new Float32Array(64);
  waveform = new Float32Array(64);
  rhythm = new VisualRhythm();
  private bandPeaks = new Float32Array([0.35, 0.18, 0.12]);
  private flowVelocity = 0;
  private travelVelocity = 0;
  update(delta: number) {
    const f = audioEngine.features,
      s = useUniverse.getState().settings,
      e = useExperience.getState(),
      dt = Math.min(delta, 0.1);
    const sensitivity = s.sensitivity * e.impact * (s.reducedMotion ? 0.22 : 1);
    const gate = THREE.MathUtils.smoothstep(f.rms, 0.0004, 0.003);
    // Track useful band peaks independently: a loud bass line must not bury the mids/highs.
    this.bandPeaks[0] = Math.max(f.bass, this.bandPeaks[0] * Math.exp(-dt * 0.22), 0.22);
    this.bandPeaks[1] = Math.max(f.mid, this.bandPeaks[1] * Math.exp(-dt * 0.22), 0.1);
    this.bandPeaks[2] = Math.max(f.treble, this.bandPeaks[2] * Math.exp(-dt * 0.22), 0.07);
    const bass = response(
      f.bass * Math.min(3, 0.55 / this.bandPeaks[0]) * sensitivity * s.bass * gate,
    );
    const mid = response(
      f.mid * Math.min(3, 0.35 / this.bandPeaks[1]) * sensitivity * s.mid * gate,
    );
    const treble = response(
      f.treble * Math.min(3, 0.26 / this.bandPeaks[2]) * sensitivity * s.treble * gate,
    );
    this.bass = THREE.MathUtils.damp(this.bass, bass, bass > this.bass ? 8 : 2.5, dt);
    this.mid = THREE.MathUtils.damp(this.mid, mid, mid > this.mid ? 6 : 2, dt);
    this.treble = THREE.MathUtils.damp(this.treble, treble, treble > this.treble ? 10 : 3, dt);
    this.energy = THREE.MathUtils.damp(
      this.energy,
      response(f.energy * sensitivity * gate),
      2.5,
      dt,
    );
    this.rhythm.advance(f, dt, s.reducedMotion || s.relax);
    this.hit = THREE.MathUtils.damp(this.hit, Math.min(0.5, this.rhythm.hit * 0.45), 5, dt);
    const motion = s.reducedMotion ? 0 : Math.max(0.1, e.movement) * (s.relax ? 0.35 : 1);
    // Velocity follows a slow envelope; individual beats deform the field without accelerating the camera tunnel.
    this.flowVelocity = THREE.MathUtils.damp(
      this.flowVelocity,
      motion * (0.35 + this.energy * 0.55),
      2,
      dt,
    );
    this.travelVelocity = THREE.MathUtils.damp(
      this.travelVelocity,
      motion * (0.8 + this.energy * 3.5),
      1.4,
      dt,
    );
    this.time += dt * this.flowVelocity;
    this.travel += dt * this.travelVelocity;
    const wave = audioEngine.timeDomain;
    for (let i = 0; i < 64; i++) {
      this.spectrum[i] = THREE.MathUtils.damp(
        this.spectrum[i],
        response(f.spectrum[i] * sensitivity * gate * 1.65),
        9,
        dt,
      );
      const waveformGain = Math.min(6, 0.5 / Math.max(0.04, f.rms * 2.8));
      this.waveform[i] = THREE.MathUtils.damp(
        this.waveform[i],
        THREE.MathUtils.clamp(wave[i * 16] * waveformGain * sensitivity * gate, -0.9, 0.9),
        12,
        dt,
      );
    }
  }
}
function response(value: number) {
  return 1.15 * (1 - Math.exp(-Math.max(0, value) * 1.3));
}
