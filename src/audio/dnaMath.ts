import type { DNA } from './types';
export function deriveDNA(
  hash: string,
  features?: { energy: number; variation: number; brightness: number; tempo: number | null },
): DNA {
  const f = features ?? { energy: 0, variation: 0, brightness: 0, tempo: null };
  const text = `v1:${hash}:${f.energy.toFixed(3)}:${f.variation.toFixed(3)}:${f.brightness.toFixed(3)}:${f.tempo ?? 0}`;
  let seed = 2166136261;
  for (const char of text) seed = Math.imul(seed ^ char.charCodeAt(0), 16777619) >>> 0;
  const names = [
    'Andromeda',
    'Lyra',
    'Cassiopeia',
    'Orion',
    'Vela',
    'Aurelia',
    'Cygnus',
    'Perseus',
  ];
  return {
    hash,
    seed,
    version: 1,
    ...f,
    analyzed: !!features,
    name: `${names[seed % names.length]} ${100 + (seed % 900)}`,
  };
}
/** Representative PCM windows: RMS dynamics, zero-crossing brightness proxy and envelope autocorrelation tempo. */
export function summarizePCM(samples: Float32Array, sampleRate: number) {
  const block = Math.max(1, Math.floor(sampleRate / 50)),
    envelope: number[] = [];
  let crossings = 0,
    total = 0;
  for (let i = 0; i < samples.length; i += block) {
    let sum = 0;
    for (let j = i; j < Math.min(i + block, samples.length); j++) {
      sum += samples[j] ** 2;
      if (j && samples[j] * samples[j - 1] < 0) crossings++;
    }
    const energy = Math.sqrt(sum / block);
    envelope.push(energy);
    total += energy;
  }
  const energy = total / Math.max(1, envelope.length);
  const variation = Math.sqrt(
    envelope.reduce((s, x) => s + (x - energy) ** 2, 0) / Math.max(1, envelope.length),
  );
  let best = 0,
    lagBest = 0;
  const centered = envelope.map((x) => x - energy),
    power = centered.reduce((s, x) => s + x * x, 0);
  for (let lag = 17; lag <= 50; lag++) {
    let score = 0;
    for (let i = lag; i < centered.length; i++) score += centered[i] * centered[i - lag];
    score /= Math.max(1e-8, power);
    if (score > best) {
      best = score;
      lagBest = lag;
    }
  }
  return {
    energy,
    variation,
    brightness: crossings / Math.max(1, samples.length),
    tempo: best > 0.45 && energy > 0.005 ? Math.round(3000 / lagBest) : null,
  };
}
