import { create } from 'zustand';
import { audioEngine } from '../audio/AudioEngine';
import { analyzeSong } from '../audio/SongDNA';
import { makeDemo } from '../audio/demo';
import type { Track } from '../audio/types';
import { useUniverse } from './universe';
export type Repeat = 'off' | 'all' | 'one';
interface PlayerState {
  tracks: Track[];
  index: number;
  playing: boolean;
  current: number;
  duration: number;
  volume: number;
  muted: boolean;
  shuffle: boolean;
  repeat: Repeat;
  error: string | null;
  analyzing: boolean;
  addFiles: (files: File[], demo?: boolean) => Promise<void>;
  loadDemo: () => Promise<void>;
  select: (index: number, autoplay?: boolean) => Promise<void>;
  toggle: () => Promise<void>;
  next: (direction?: number, ended?: boolean) => Promise<void>;
  remove: (id: string) => void;
  seek: (value: number) => void;
  setVolume: (value: number) => void;
  toggleMute: () => void;
}
let selection = 0;
export const usePlayer = create<PlayerState>((set, get) => ({
  tracks: [],
  index: -1,
  playing: false,
  current: 0,
  duration: 0,
  volume: 0.7,
  muted: false,
  shuffle: false,
  repeat: 'off',
  error: null,
  analyzing: false,
  addFiles: async (files, demo = false) => {
    const valid = files.filter(
      (f) => f.type.startsWith('audio/') || /\.(mp3|wav|ogg|m4a|aac|flac|opus|webm)$/i.test(f.name),
    );
    if (valid.length !== files.length)
      set({
        error:
          'Some files are not recognized audio. Try MP3, WAV, OGG, or a browser-supported M4A.',
      });
    if (!valid.length) return;
    const tracks = valid.map((file) => ({
      id: crypto.randomUUID(),
      title: file.name.replace(/\.[^.]+$/, ''),
      artist: demo ? 'Music Galaxy Originals' : 'Local audio · stays on your device',
      url: URL.createObjectURL(file),
      file,
    }));
    const first = get().tracks.length;
    set((s) => ({ tracks: [...s.tracks, ...tracks] }));
    if (get().index < 0) await get().select(first, false);
  },
  loadDemo: async () => {
    const existing = get().tracks.findIndex((t) => t.artist === 'Music Galaxy Originals');
    if (existing >= 0) {
      await get().select(existing, true);
      return;
    }
    await get().addFiles([makeDemo()], true);
    await get().select(get().tracks.length - 1, true);
  },
  select: async (index, autoplay = true) => {
    const track = get().tracks[index];
    if (!track) return;
    const token = ++selection;
    audioEngine.load(track.url);
    set({ index, current: 0, duration: 0, error: null, playing: false, analyzing: !track.dna });
    if (track.dna) useUniverse.getState().applyDNA(track.dna);
    else if (track.file) {
      void analyzeSong(track.file, (dna) => {
        if (token === selection) useUniverse.getState().applyDNA(dna);
      })
        .then((dna) => {
          set((s) => ({ tracks: s.tracks.map((t) => (t.id === track.id ? { ...t, dna } : t)) }));
          if (token === selection) {
            useUniverse.getState().applyDNA(dna);
            set({ analyzing: false });
          }
        })
        .catch((error) => {
          if (token === selection) {
            set({ analyzing: false });
            useUniverse.setState({ notice: error.message });
          }
        });
    }
    if (autoplay)
      try {
        await audioEngine.play();
      } catch (error) {
        if (token === selection)
          set({
            error: `Unable to play this audio. ${error instanceof Error ? error.message : 'Try another format.'}`,
          });
      }
  },
  toggle: async () => {
    if (get().index < 0) {
      await get().loadDemo();
      return;
    }
    if (!audioEngine.element.paused) audioEngine.pause();
    else
      try {
        await audioEngine.play();
        set({ error: null });
      } catch {
        set({ error: 'Playback could not start. This codec may be unsupported; try MP3 or WAV.' });
      }
  },
  next: async (direction = 1, ended = false) => {
    const { tracks, index, shuffle, repeat } = get();
    if (!tracks.length) return;
    if (ended && repeat === 'one') {
      audioEngine.seek(0);
      await get().toggle();
      return;
    }
    if (direction < 0 && audioEngine.element.currentTime > 3) {
      audioEngine.seek(0);
      return;
    }
    if (ended && index === tracks.length - 1 && repeat === 'off' && !shuffle) {
      set({ playing: false });
      return;
    }
    const offset =
      shuffle && tracks.length > 1
        ? 1 + (crypto.getRandomValues(new Uint32Array(1))[0] % (tracks.length - 1))
        : direction;
    await get().select((index + offset + tracks.length) % tracks.length, true);
  },
  remove: (id) => {
    const state = get(),
      removed = state.tracks.find((t) => t.id === id);
    if (!removed) return;
    const active = state.tracks[state.index]?.id === id;
    const tracks = state.tracks.filter((t) => t.id !== id);
    if (active) {
      ++selection;
      audioEngine.pause();
      audioEngine.element.removeAttribute('src');
      audioEngine.element.load();
      set({ tracks, index: -1, playing: false, current: 0, duration: 0, analyzing: false });
      if (tracks.length) void get().select(Math.min(state.index, tracks.length - 1), false);
    } else set({ tracks, index: tracks.findIndex((t) => t.id === state.tracks[state.index]?.id) });
    URL.revokeObjectURL(removed.url);
  },
  seek: (value) => {
    audioEngine.seek(value);
    set({ current: value });
  },
  setVolume: (volume) => {
    audioEngine.element.volume = volume;
    set({ volume });
  },
  toggleMute: () => {
    audioEngine.element.muted = !get().muted;
    set({ muted: audioEngine.element.muted });
  },
}));
const media = audioEngine.element;
media.volume = 0.7;
media.addEventListener('play', () => usePlayer.setState({ playing: true }));
media.addEventListener('pause', () => usePlayer.setState({ playing: false }));
media.addEventListener('timeupdate', () => usePlayer.setState({ current: media.currentTime }));
media.addEventListener('loadedmetadata', () =>
  usePlayer.setState({ duration: Number.isFinite(media.duration) ? media.duration : 0 }),
);
media.addEventListener('ended', () => void usePlayer.getState().next(1, true));
media.addEventListener('error', () =>
  usePlayer.setState({
    playing: false,
    error:
      'This audio could not be decoded. Try an MP3, PCM WAV, or OGG file supported by your browser.',
  }),
);
window.addEventListener('beforeunload', () => {
  for (const t of usePlayer.getState().tracks) URL.revokeObjectURL(t.url);
  audioEngine.dispose();
});
