export function seeded(seed: number) {
  return () => {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export const clamp = (x: number, min = 0, max = 1) => Math.max(min, Math.min(max, x));
export const clock = (seconds: number) =>
  `${Math.floor((seconds || 0) / 60)}:${Math.floor((seconds || 0) % 60)
    .toString()
    .padStart(2, '0')}`;
