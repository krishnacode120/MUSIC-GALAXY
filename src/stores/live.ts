import { create } from 'zustand';
import { audioEngine } from '../audio/AudioEngine';
export type LiveKind = 'tab' | 'system' | 'microphone';
interface LiveState {
  status: 'idle' | 'connecting' | 'connected';
  kind: LiveKind | null;
  label: string;
  error: string | null;
  connect: (kind: LiveKind) => Promise<boolean>;
  disconnect: () => void;
}
export const useLive = create<LiveState>((set, get) => ({
  status: 'idle',
  kind: null,
  label: '',
  error: null,
  connect: async (kind) => {
    if (get().status === 'connecting') return false;
    const wasConnected = audioEngine.isLive;
    set({ status: 'connecting', error: null });
    let stream: MediaStream | undefined;
    try {
      if (kind === 'microphone') {
        if (!navigator.mediaDevices?.getUserMedia)
          throw new Error('Microphone input requires HTTPS or localhost in a supported browser.');
        stream = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
          video: false,
        });
      } else {
        if (!navigator.mediaDevices?.getDisplayMedia)
          throw new Error(
            'Live sharing is unavailable here. Open this address in desktop Chrome or Edge.',
          );
        const options = {
          video: {
            displaySurface: kind === 'tab' ? 'browser' : 'monitor',
            frameRate: 1,
            width: 320,
            height: 180,
          },
          audio: {
            suppressLocalAudioPlayback: false,
            echoCancellation: false,
            noiseSuppression: false,
            autoGainControl: false,
          },
          systemAudio: 'include',
          selfBrowserSurface: 'exclude',
          surfaceSwitching: 'include',
          monitorTypeSurfaces: 'include',
          preferCurrentTab: false,
        };
        // The native picker owns permission; this call originates in a user gesture.
        stream = await navigator.mediaDevices.getDisplayMedia(options as DisplayMediaStreamOptions);
      }
      await audioEngine.connectLive(stream, () => set({ status: 'idle', kind: null, label: '' }));
      const label =
        stream.getAudioTracks()[0]?.label ||
        (kind === 'tab' ? 'Browser tab' : kind === 'system' ? 'System audio' : 'Microphone');
      set({ status: 'connected', kind, label, error: null });
      return true;
    } catch (error) {
      stream?.getTracks().forEach((track) => track.stop());
      const e = error as DOMException;
      const message =
        e.name === 'NotAllowedError'
          ? 'Sharing was cancelled or not permitted. Nothing new is being captured.'
          : e.name === 'NotReadableError'
            ? 'The source could not be captured. Try a browser tab, or check browser and operating-system permissions.'
            : e.message || 'Could not connect to this audio source.';
      set({ status: wasConnected && audioEngine.isLive ? 'connected' : 'idle', error: message });
      return false;
    }
  },
  disconnect: () => {
    audioEngine.disconnectLive();
    set({ status: 'idle', kind: null, label: '', error: null });
  },
}));
