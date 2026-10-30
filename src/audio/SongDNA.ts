import type { DNA } from './types';
function request(worker: Worker, data: object, transfer: Transferable[] = []): Promise<DNA> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Song analysis timed out.')), 45000);
    worker.onmessage = (e) => {
      clearTimeout(timeout);
      e.data.error ? reject(new Error(e.data.error)) : resolve(e.data.dna);
    };
    worker.onerror = () => {
      clearTimeout(timeout);
      reject(new Error('Background analysis is unavailable.'));
    };
    worker.postMessage(data, transfer);
  });
}
export async function analyzeSong(file: File, onIdentity: (dna: DNA) => void): Promise<DNA> {
  if (file.size > 200 * 1024 * 1024)
    throw new Error('Song DNA is limited to 200 MB. Playback is still available.');
  const worker = new Worker(new URL('../workers/dna.worker.ts', import.meta.url), {
    type: 'module',
  });
  try {
    const bytes = await file.arrayBuffer();
    const provisional = await request(worker, { buffer: bytes }, [bytes]);
    onIdentity(provisional);
    if (file.size > 40 * 1024 * 1024) return provisional;
    try {
      const ctx = new OfflineAudioContext(1, 1, 12000);
      const decoded = await ctx.decodeAudioData(await file.arrayBuffer());
      const length = Math.min(Math.floor(decoded.sampleRate * 8), Math.floor(decoded.length / 3));
      const pcm = new Float32Array(length * 3);
      for (let w = 0; w < 3; w++) {
        const start = Math.floor(((decoded.length - length) * w) / 2);
        for (let ch = 0; ch < decoded.numberOfChannels; ch++) {
          const channel = decoded.getChannelData(ch);
          for (let i = 0; i < length; i++)
            pcm[w * length + i] += channel[start + i] / decoded.numberOfChannels;
        }
      }
      return await request(
        worker,
        { hash: provisional.hash, samples: pcm, sampleRate: decoded.sampleRate },
        [pcm.buffer],
      );
    } catch {
      return provisional;
    }
  } finally {
    worker.terminate();
  }
}
