# Music Galaxy

A full-screen music visualizer for the audio you select: a browser music tab, permitted computer audio, or local playback. React, TypeScript, Three.js / React Three Fiber, Web Audio, GLSL, Zustand, Motion, Tailwind, Vite. No account, paid API, server, database, or music upload.

## Run on Windows

Use Node.js 22.14+ and npm 10.5.1+ in PowerShell:

```powershell
cd "C:\Users\krishna\Documents\ChatGPT\Music Galaxy"
npm install
npm run dev
```

Open the printed localhost URL in desktop Chrome or Edge. Embedded browsers can restrict sharing; use the same URL in a regular browser when needed.

```powershell
npm run build
npm run preview
```

The static production build goes into `dist/`. `vercel.json` configures Vite static hosting. No environment secrets are required. HTTPS is required outside localhost for capture APIs.

## Connect music

1. Play YouTube, Spotify web, or another source in a separate tab of the same browser.
2. Choose **Connect audio → A browser tab**, select that tab, enable **Share tab audio**, then Share.
3. Return to Music Galaxy. “Following your sound” indicates actual measurable input.

For desktop Spotify or another app, choose **Your computer**, select **Entire Screen**, and enable **Share system audio** when offered. Available audio sources depend on browser and operating system. A website cannot silently listen to all computer audio or force an audio-sharing checkbox. Missing audio and denied permission produce useful errors. Protected media may not be capturable.

Only the existing selected input reaches analysis and optional transcription. Captured audio is never monitored through this app's speakers, preventing echo. Screen video required by the sharing picker is disabled and never read or saved. Stop sharing in the source panel or browser controls.

Local MP3/WAV and browser-supported OGG, M4A/AAC, FLAC, and Opus remain available through file selection or drag and drop. Unsupported codecs produce an error. Playlist, seek, volume, shuffle, repeat, and removal remain available. Object URLs are revoked when tracks are removed; files are reselected after reload. **Aether Drift**, an original CC0 synthesized demo, plays only after a click and contains no sung lyrics.

## Ten visual forms

| Form             | Audio mapping                                                                                           |
| ---------------- | ------------------------------------------------------------------------------------------------------- |
| Star Dust Voyage | Immersive flowing star tunnel; energy drives travel, bass opens its radius, treble illuminates streaks. |
| Wave Spectre     | Layered luminous ribbons displaced by the actual time-domain waveform and FFT.                          |
| Nebula Dust      | Flowing dust, colored clouds, bass expansion, midrange curl, spectral detail.                           |
| Spectrum         | 128 instanced bars following the measured frequency spectrum.                                           |
| Ocean            | Procedural luminous grid and particles; matching bass/mid/FFT displacement.                             |
| Boxy             | 400 cube columns responding to distributed frequency bands.                                             |
| Particle Shadow  | Three curling arms with a dark central void and bass-driven expansion.                                  |
| Flip Flop        | 247 tiles; frequency bins and measured onsets drive rotation and depth.                                 |
| ElectroSphere    | Reactive wire sphere with particle nodes, spectral deformation, and treble detail.                      |
| Matrix Trails    | Procedural green glyph rain; energy drives fall speed and highs drive glyph activity.                   |

All renderers read one shared mutable audio signal. Attack/release smoothing prevents jitter; silence/pause releases the response to quiet ambient motion. No random or hard-coded beat events. Bands overlap between instruments: these are frequency responses, not isolated instrument stems. Reduced-motion settings attenuate the response and stop spatial travel. The removed freeze button and positive flow-speed minimum prevent accidental stalled animation.

Drag to orbit, scroll to zoom, use Reset camera to restore the mode's framing. The bottom mode strip scrolls horizontally, including on touch screens. Switching modes keeps music running and leaves the selected scene in place until you choose another. Six bundled references are sampled into dense point clouds; the photographs are not drawn as backgrounds. Those particles keep the source planets, nebulae, and spirals recognizable while flowing through layered depth: bass expands the warm dust, mids curl the colored cloud arms, and treble brightens the fine star particles. Cinematic hides the interface; Escape returns immediately. Local looks, quality presets, density, colors, sensitivity, and bloom remain available. PNG captures exclude the interface and stay local. Quality presets cap pixel ratio and particle counts; automatic quality reduction can be disabled. Rendering stops in hidden tabs while audio continues.

## Visualizer controls

On desktop, press **Start visualizer** to enter fullscreen. If a local song is loaded it starts playing; otherwise choose a browser tab, computer audio, or a local song. The same button becomes **Stop**. Stopping pauses local playback, disconnects live capture, and leaves fullscreen. Drag to orbit through the particles, scroll to zoom, and use the fullscreen Start action whenever you want the controls back.

The included reference art is sampled into visible colored particles. It is never shown as a flat background. The particle cloud has broad depth for true orbit parallax, and its bass, midrange, and treble layers react independently. Scene brightness and bloom start higher so the planets, nebulae, and star dust stay vivid.
## Keyboard

| Key          | Action                            |
| ------------ | --------------------------------- |
| Space        | Local playback play/pause         |
| Left / Right | Seek local audio five seconds     |
| M            | Mute local playback               |
| H            | Hide/show interface               |
| C            | Cinematic viewing                 |
| F            | Fullscreen                        |
| R            | Reset camera                      |
| Escape       | Return to controls / close panels |

Control live playback and volume in its original source app.

## Structure and revision notes

`src/audio/` manages the audio graph, analysis, and identity; `src/galaxy/ReactiveSignal.ts` distributes smoothed audio to GPU/instanced renderers; `src/shaders/reactiveParticles.ts` contains the particle fields; `src/components/` contains the player, source picker, and settings.
