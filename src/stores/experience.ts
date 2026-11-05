import { create } from 'zustand';
import { persist } from 'zustand/middleware';
export const forms = [
  'Star Dust Voyage',
  'Wave Spectre',
  'Nebula Dust',
  'Spectrum',
  'Ocean',
  'Boxy',
  'Particle Shadow',
  'Flip Flop',
  'ElectroSphere',
  'Matrix Trails',
] as const;
export const inks = [
  { name: 'Andromeda', colors: ['#6f9cff', '#a66af3', '#dceeff'] },
  { name: 'Blue hour', colors: ['#487dff', '#a9e3e9', '#f4e9c4'] },
  { name: 'Afterglow', colors: ['#f14d6a', '#ffb881', '#9d89ed'] },
  { name: 'Chlorophyll', colors: ['#c4e896', '#41c49d', '#ebf0d5'] },
  { name: 'Ultraviolet', colors: ['#b96ce9', '#62a7fa', '#fcaada'] },
  { name: 'Silver', colors: ['#b3b8c5', '#d6e7ef', '#fff6db'] },
];
interface Experience {
  form: number;
  ink: number;
  evolve: boolean;
  density: number;
  spread: number;
  movement: number;
  impact: number;
  brightness: number;
  low: number;
  body: number;
  detail: number;
  colorDrift: boolean;
  running: boolean;
  frozen: boolean;
  change: (patch: Partial<Omit<Experience, 'change'>>) => void;
}
export const useExperience = create<Experience>()(
  persist(
    (set) => ({
      form: 0,
      ink: 0,
      evolve: false,
      density: 1.35,
      spread: 1.15,
      movement: 0.45,
      impact: 1.05,
      brightness: 0.95,
      low: 1,
      body: 1,
      detail: 1,
      colorDrift: true,
      running: false,
      frozen: false,
      change: (patch) => set(patch),
    }),
    {
      name: 'music-galaxy-experience-v5',
      version: 3,
      migrate: (persisted) => {
        const saved = persisted as Partial<Experience>;
        return {
          form: saved.form ?? 0,
          ink: saved.ink ?? 0,
          evolve: saved.evolve ?? false,
          low: saved.low ?? 1,
          body: saved.body ?? 1,
          detail: saved.detail ?? 1,
          colorDrift: saved.colorDrift ?? true,
          density: Math.max(1.35, saved.density ?? 1.35),
          spread: Math.max(1.15, saved.spread ?? 1.15),
          movement: Math.min(0.45, saved.movement ?? 0.45),
          impact: Math.min(1.05, saved.impact ?? 1.05),
          brightness: 0.95,
        };
      },
      partialize: ({ frozen: _frozen, running: _running, change: _change, ...state }) => state,
      merge: (persisted, current) => {
        const saved = persisted as Partial<Experience>;
        return {
          ...current,
          ...saved,
          frozen: false,
          running: false,
          form:
            Number.isInteger(saved?.form) && saved.form! >= 0 && saved.form! < forms.length
              ? saved.form!
              : 0,
          ink:
            Number.isInteger(saved?.ink) && saved.ink! >= 0 && saved.ink! < inks.length
              ? saved.ink!
              : 0,
          movement: Math.max(0.1, Math.min(1.5, saved?.movement ?? 0.45)),
          impact: Math.max(0.5, Math.min(2.5, saved?.impact ?? 1.05)),
          brightness: Math.max(0.25, Math.min(1.2, saved?.brightness ?? 0.95)),
        };
      },
    },
  ),
);
