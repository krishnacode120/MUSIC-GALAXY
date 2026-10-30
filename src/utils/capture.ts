import { sceneCanvas } from '../galaxy/GalaxyScene';
import { useUniverse } from '../stores/universe';
import { audioEngine } from '../audio/AudioEngine';
import { forms, useExperience } from '../stores/experience';
export function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob),
    a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
const name = () =>
  `Music-Galaxy-${forms[useExperience.getState().form]}-${audioEngine.isLive ? 'live' : (useUniverse.getState().dna?.hash.slice(0, 8) ?? 'ambient')}-${Date.now()}`;
export async function screenshot() {
  if (!sceneCanvas) throw new Error('The scene is still loading.');
  const canvas = document.createElement('canvas');
  canvas.width = sceneCanvas.width;
  canvas.height = sceneCanvas.height;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(sceneCanvas, 0, 0);
  if (useUniverse.getState().settings.watermark) {
    ctx.fillStyle = '#ffffffaa';
    ctx.font = `${Math.max(14, canvas.width / 80)}px sans-serif`;
    ctx.fillText('MUSIC GALAXY', 30, canvas.height - 30);
  }
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
  if (!blob) throw new Error('PNG export failed.');
  download(blob, `${name()}.png`);
}
let recorder: MediaRecorder | null = null;
export async function startRecording(onStop: () => void) {
  if (!sceneCanvas || typeof MediaRecorder === 'undefined' || !sceneCanvas.captureStream)
    throw new Error('Canvas recording is not available in this browser.');
  const mime = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm'].find(
    (type) => MediaRecorder.isTypeSupported(type),
  );
  if (!mime)
    throw new Error(
      'This browser cannot record WebM. Use Chrome, Edge, or Firefox, or export a PNG.',
    );
  const stream = sceneCanvas.captureStream(30);
  try {
    const tracks = await audioEngine.recordingAudio();
    tracks.forEach((t) => stream.addTrack(t));
    const chunks: Blob[] = [];
    let bytes = 0;
    recorder = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 8_000_000 });
    const local = recorder;
    const timer = setTimeout(() => {
      if (local.state === 'recording') local.stop();
    }, 120000);
    local.ondataavailable = (e) => {
      if (e.data.size) {
        chunks.push(e.data);
        bytes += e.data.size;
        if (bytes > 120 * 1024 * 1024 && local.state === 'recording') local.stop();
      }
    };
    local.onstop = () => {
      clearTimeout(timer);
      stream.getTracks().forEach((t) => t.stop());
      download(new Blob(chunks, { type: mime }), `${name()}.webm`);
      recorder = null;
      onStop();
    };
    local.start(1000);
  } catch (error) {
    stream.getTracks().forEach((t) => t.stop());
    throw error;
  }
}
export function stopRecording() {
  if (recorder?.state === 'recording') recorder.stop();
}
