import { describe, it, expect } from 'vitest';
import { BeatDetector } from '../audio/BeatDetector';
import { SpectrumAnalyzer, bandEnergy, smooth } from '../audio/SpectrumAnalyzer';
describe('adaptive onset detection', () => {
  it('finds onsets and a stable 120 BPM estimate from periodic synthetic flux', () => {
    const b = new BeatDetector();
    let onsets = 0,
      bpm: number | null = null;
    for (let i = 0; i < 600; i++) {
      const beat = b.update(i % 30 === 0 ? 0.15 : 0.001, i / 60, 0.15);
      onsets += Number(beat.onset > 0);
      if (beat.bpm) bpm = beat.bpm;
    }
    expect(onsets).toBeGreaterThan(15);
    expect(onsets).toBeLessThan(21);
    expect(bpm).toBe(120);
  });
  it('rejects silent and constant input without inventing tempo', () => {
    const b = new BeatDetector();
    for (let i = 0; i < 400; i++) {
      const v = b.update(0.002, i / 60, 0);
      expect(v.onset).toBe(0);
      expect(v.bpm).toBeNull();
    }
  });
  it('uses a refractory period and clears history on seeks', () => {
    const b = new BeatDetector();
    for (let i = 0; i < 60; i++) b.update(0.001, i / 60, 0.1);
    expect(b.update(0.2, 1, 0.2).onset).toBeGreaterThan(0);
    expect(b.update(0.3, 1.1, 0.2).onset).toBe(0);
    b.reset();
    expect(b.update(0.3, 1.2, 0.2).bpm).toBeNull();
  });
});
describe('audio feature transformations', () => {
  it('maps a low-frequency signal to bass rather than treble', () => {
    const a = new SpectrumAnalyzer(48000, 2048),
      db = new Float32Array(1024).fill(-Infinity),
      wave = new Float32Array(2048);
    db[4] = -12;
    for (let i = 0; i < wave.length; i++) wave[i] = Math.sin((i * 2 * Math.PI * 100) / 48000) * 0.2;
    for (let i = 0; i < 120; i++) a.update(db, wave, i / 60, 1 / 60);
    expect(a.features.bass).toBeGreaterThan(0.15);
    expect(a.features.treble).toBeLessThan(0.001);
    expect(a.features.rms).toBeCloseTo(0.14, 1);
    expect(a.features.centroid).toBeGreaterThan(80);
    expect(a.features.centroid).toBeLessThan(120);
  });
  it('normalizes quiet audio and decays after pause', () => {
    const a = new SpectrumAnalyzer(),
      db = new Float32Array(1024).fill(-Infinity),
      wave = new Float32Array(2048).fill(0.01);
    db[4] = -40;
    for (let i = 0; i < 300; i++) a.update(db, wave, i / 60, 1 / 60);
    const before = a.features.bass;
    expect(before).toBeGreaterThan(0.08);
    for (let i = 0; i < 60; i++) a.decay(1 / 60);
    expect(a.features.bass).toBeLessThan(before * 0.01);
  });
  it('keeps silence finite and smoothing independent of frame size', () => {
    const a = new SpectrumAnalyzer();
    a.update(new Float32Array(1024).fill(-Infinity), new Float32Array(2048), 0, 1 / 60);
    expect(a.features.rms).toBe(0);
    expect(a.features.centroid).toBe(0);
    expect(a.features.bpm).toBeNull();
    const once = smooth(0, 1, 0.1),
      twice = smooth(smooth(0, 1, 0.05), 1, 0.05);
    expect(once).toBeCloseTo(twice, 8);
    expect(bandEnergy(new Float32Array(1024), 48000, 2048, 30, 250)).toBe(0);
  });
});
