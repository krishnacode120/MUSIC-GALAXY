import { describe, expect, it } from 'vitest';
import { VisualRhythm } from '../galaxy/VisualRhythm';
import { emptyFeatures } from '../audio/types';
describe('cosmic rhythm events', () => {
  it('does not invent ripples from silence or a steady envelope', () => {
    const rhythm = new VisualRhythm(),
      f = emptyFeatures();
    for (let i = 0; i < 300; i++) rhythm.advance(f, 1 / 60);
    expect([...rhythm.powers].every((x) => x === 0)).toBe(true);
    f.rms = 0.2;
    f.energy = 0.4;
    for (let i = 0; i < 300; i++) rhythm.advance(f, 1 / 60);
    expect(rhythm.hit).toBe(0);
  });
  it('creates one expanding ripple from an audible onset and releases it', () => {
    const rhythm = new VisualRhythm(),
      f = emptyFeatures();
    f.rms = 0.2;
    f.onset = 0.9;
    rhythm.advance(f, 1 / 60);
    expect(rhythm.powers[0]).toBeGreaterThan(0.8);
    const radius = rhythm.radii[0];
    f.onset = 0;
    for (let i = 0; i < 120; i++) rhythm.advance(f, 1 / 60);
    expect(rhythm.radii[0]).toBeGreaterThan(radius + 10);
    expect(rhythm.powers[0]).toBeLessThan(0.15);
    expect(rhythm.powers.filter((x) => x > 0)).toHaveLength(1);
  });
  it('suppresses transient movement in reduced motion', () => {
    const rhythm = new VisualRhythm(),
      f = emptyFeatures();
    f.rms = 0.2;
    f.onset = 1;
    f.bassTransient = 1;
    rhythm.advance(f, 1 / 60, true);
    expect(rhythm.hit).toBe(0);
    expect([...rhythm.powers].every((x) => x === 0)).toBe(true);
  });
});
