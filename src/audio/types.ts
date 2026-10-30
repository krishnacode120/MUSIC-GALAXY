export interface AudioFeatures {
  bass: number;
  mid: number;
  treble: number;
  rms: number;
  energy: number;
  centroid: number;
  flux: number;
  onset: number;
  bassTransient: number;
  beat: number;
  bpm: number | null;
  confidence: number;
  spectrum: Float32Array;
}
export const emptyFeatures = (): AudioFeatures => ({
  bass: 0,
  mid: 0,
  treble: 0,
  rms: 0,
  energy: 0,
  centroid: 0,
  flux: 0,
  onset: 0,
  bassTransient: 0,
  beat: 0,
  bpm: null,
  confidence: 0,
  spectrum: new Float32Array(64),
});
export interface DNA {
  hash: string;
  seed: number;
  version: 1;
  energy: number;
  variation: number;
  brightness: number;
  tempo: number | null;
  analyzed: boolean;
  name: string;
}
export interface Track {
  id: string;
  title: string;
  artist: string;
  url: string;
  file?: File;
  dna?: DNA;
}
