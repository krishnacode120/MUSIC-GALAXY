import { describe, it, expect } from 'vitest';
import { deriveDNA, summarizePCM } from '../audio/dnaMath';
import { seeded } from '../utils/random';
describe('Song DNA v1', () => {
  it('reproduces the seed and layout from identical content hash and features', () => {
    const features = { energy: 0.12, variation: 0.04, brightness: 0.025, tempo: 120 };
    const a = deriveDNA('8ab4c0f2'.repeat(8), features),
      b = deriveDNA('8ab4c0f2'.repeat(8), features);
    expect(a).toEqual(b);
    const randomA = seeded(a.seed),
      randomB = seeded(b.seed);
    expect(Array.from({ length: 100 }, () => randomA())).toEqual(
      Array.from({ length: 100 }, () => randomB()),
    );
  });
  it('changes with content identity and ignores filename', () => {
    expect(deriveDNA('aa'.repeat(32)).seed).not.toBe(deriveDNA('bb'.repeat(32)).seed);
  });
  it('does not invent tempo for silence or short samples', () => {
    expect(summarizePCM(new Float32Array(12000), 12000).tempo).toBeNull();
    const summary = summarizePCM(new Float32Array(4), 12000);
    expect(summary.energy).toBe(0);
    expect(Number.isFinite(summary.variation)).toBe(true);
  });
  it('summarizes representative RMS and brightness deterministically', () => {
    const pcm = Float32Array.from(
      { length: 24000 },
      (_, i) => Math.sin((i * Math.PI * 2 * 440) / 12000) * 0.1,
    );
    const a = summarizePCM(pcm, 12000);
    expect(a.energy).toBeCloseTo(0.0707, 3);
    expect(a.brightness).toBeGreaterThan(0.06);
    expect(a).toEqual(summarizePCM(pcm, 12000));
  });
});
