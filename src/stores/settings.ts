import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { DNA } from '../audio/types';
export type Quality = 'Low' | 'Medium' | 'High' | 'Ultra';
export interface Settings {
  quality: Quality;
  bloom: number;
  sensitivity: number;
  bass: number;
  mid: number;
  treble: number;
  relax: boolean;
  gentle: boolean;
  reducedMotion: boolean;
  autoQuality: boolean;
  showFps: boolean;
  watermark: boolean;
}
const reduced =
  typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
export const defaults: Settings = {
  quality: 'High',
  bloom: 0.55,
  sensitivity: 1,
  bass: 1,
  mid: 1,
  treble: 1,
  relax: false,
  gentle: true,
  reducedMotion: reduced,
  autoQuality: true,
  showFps: false,
  watermark: false,
};
interface UniverseState {
  settings: Settings;
  songPreferences: Record<string, Settings>;
  dna: DNA | null;
  cinematic: boolean;
  resetCamera: number;
  fps: number;
  notice: string | null;
  set: (patch: Partial<Settings>) => void;
  applyDNA: (dna: DNA) => void;
  reset: () => void;
}
export const useUniverse = create<UniverseState>()(
  persist(
    (set, get) => ({
      settings: defaults,
      songPreferences: {},
      dna: null,
      cinematic: false,
      resetCamera: 0,
      fps: 60,
      notice: null,
      set: (patch) =>
        set((state) => {
          const settings = { ...state.settings, ...patch },
            songPreferences = { ...state.songPreferences };
          if (state.dna) {
            songPreferences[state.dna.hash] = settings;
            const keys = Object.keys(songPreferences);
            if (keys.length > 100) delete songPreferences[keys[0]];
          }
          return { settings, songPreferences };
        }),
      applyDNA: (dna) =>
        set((state) => ({ dna, settings: state.songPreferences[dna.hash] ?? state.settings })),
      reset: () => {
        get().set({ ...defaults });
        set((state) => ({ cinematic: false, resetCamera: state.resetCamera + 1 }));
      },
    }),
    {
      name: 'music-galaxy-settings-v2',
      version: 4,
      migrate: (persisted) => {
        const saved = persisted as Partial<UniverseState>;
        return {
          settings: {
            ...defaults,
            ...saved.settings,
            bloom: Math.max(0.45, saved.settings?.bloom ?? 0.5),
          },
          songPreferences: Object.fromEntries(
            Object.entries(saved.songPreferences ?? {}).map(([hash, settings]) => [
              hash,
              { ...settings, bloom: Math.max(0.45, settings.bloom) },
            ]),
          ),
        };
      },
      partialize: (state) => ({ settings: state.settings, songPreferences: state.songPreferences }),
      merge: (persisted, current) => {
        const saved = persisted as Partial<UniverseState>;
        return {
          ...current,
          ...saved,
          settings: {
            ...defaults,
            ...saved?.settings,
            reducedMotion: reduced || saved?.settings?.reducedMotion || false,
          },
        };
      },
    },
  ),
);
