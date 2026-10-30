import { deriveDNA, summarizePCM } from '../audio/dnaMath';
self.onmessage = async (
  event: MessageEvent<{
    buffer?: ArrayBuffer;
    hash?: string;
    samples?: Float32Array;
    sampleRate?: number;
  }>,
) => {
  try {
    const { buffer, samples, sampleRate } = event.data;
    const hash =
      event.data.hash ??
      Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', buffer!)))
        .map((n) => n.toString(16).padStart(2, '0'))
        .join('');
    self.postMessage({
      dna: deriveDNA(hash, samples ? summarizePCM(samples, sampleRate!) : undefined),
    });
  } catch (error) {
    self.postMessage({ error: String(error) });
  }
};
