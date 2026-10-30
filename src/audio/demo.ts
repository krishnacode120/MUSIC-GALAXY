import { seeded } from '../utils/random';
/** Original 64-second synthesized composition, generated locally; CC0. */
export function makeDemo(): File {
  const rate = 22050,
    seconds = 64,
    length = rate * seconds,
    buffer = new ArrayBuffer(44 + length * 2),
    view = new DataView(buffer),
    rand = seeded(52041);
  const text = (at: number, s: string) => {
    for (let i = 0; i < s.length; i++) view.setUint8(at + i, s.charCodeAt(i));
  };
  text(0, 'RIFF');
  view.setUint32(4, 36 + length * 2, true);
  text(8, 'WAVE');
  text(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, rate, true);
  view.setUint32(28, rate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  text(36, 'data');
  view.setUint32(40, length * 2, true);
  const roots = [110, 130.8128, 87.3071, 97.9989];
  for (let i = 0; i < length; i++) {
    const t = i / rate,
      beat = t % 0.5,
      step = t % 0.25,
      root = roots[Math.floor(t / 8) % 4],
      note = [1, 1.5, 2, 2.3784, 3, 2, 1.5, 1.1892][Math.floor(t / 0.25) % 8];
    const kick =
      Math.sin(2 * Math.PI * (45 * beat + 8 * (1 - Math.exp(-beat * 30)))) *
      Math.exp(-beat * 17) *
      0.45;
    const hat = (rand() * 2 - 1) * Math.exp(-step * 100) * 0.055;
    const pad =
      (Math.sin(t * root * 2 * Math.PI) +
        Math.sin(t * root * 1.1892 * 2 * Math.PI) +
        Math.sin(t * root * 1.5 * 2 * Math.PI)) *
      0.06 *
      (0.7 + 0.3 * Math.sin(t * 0.5));
    const arp = Math.sin(t * root * note * 4 * Math.PI) * Math.exp(-step * 9) * 0.095;
    const fade = Math.min(1, t / 3, (seconds - t) / 4);
    view.setInt16(
      44 + i * 2,
      Math.max(-1, Math.min(1, (kick + hat + pad + arp) * fade)) * 32767,
      true,
    );
  }
  return new File([buffer], 'Aether Drift.wav', { type: 'audio/wav' });
}
