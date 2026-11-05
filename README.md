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

Drag to orbit, scroll to zoom, use Reset camera to restore the mode's framing. The bottom mode strip scrolls horizontally, including on touch screens. Switching modes keeps music running and leaves the selected scene in place until you choose another. The main Star Dust Voyage now forms a four arm galaxy with a warm core, foreground ringed worlds, and a soft nebula field. Nebula Dust and Particle Shadow have their own slow cloud and accretion ring treatments. Cinematic hides the interface; Escape returns immediately. Local looks, quality presets, density, colors, sensitivity, and bloom remain available. PNG captures exclude the interface and stay local. Quality presets cap pixel ratio and particle counts; automatic quality reduction can be disabled. Rendering stops in hidden tabs while audio continues.

## Lyrics from the song

The dense defaults use 129,600 particles on High (96,000 × 1.35 density), with closer framing and soft illumination. Flow speed defaults to 0.45, brightness to 0.65, and bloom to 0.3. Slowly eased velocity follows the overall musical envelope; individual onsets deform the field without suddenly accelerating travel. Band response uses gentler attack/release envelopes. **Visual impact**, **Scene brightness**, and density are independently adjustable. Settings migrate once to the calmer defaults, retaining density and selected mode.

Open **Live lyrics**, select **Tamil** or **English**, choose a model, and click **Start live transcription**. Connect an audio source first. No lyric file or extra microphone permission is needed. Tamil and the lighter Tiny model are the defaults. Explicit language selection is required because this library version defaults to English when language is omitted. Optional **Translate to English** asks the model to translate the heard words into English. Large on-scene subtitles show provisional words during decoding and remain visible in cinematic mode; disable the overlay to keep words in the panel.

Transcription uses quantized multilingual [Whisper Tiny](https://huggingface.co/onnx-community/whisper-tiny) or [Whisper Base](https://huggingface.co/onnx-community/whisper-base) through [Transformers.js](https://huggingface.co/docs/transformers.js/index). Tiny weights are bundled under `public/models/whisper-tiny/`, pinned to the revision in `source.json`; the approximately 41 MB weights and WASM runtime load from the application rather than an external CDN. If these assets are excluded when copying the project, run `npm run setup:lyrics` once to restore them. Base remains an optional larger model download. CPU/WASM is the compatibility default; opt into GPU acceleration if desired. GPU initialization or decoding failures retry with CPU. All audio processing stays in a local worker; no music is posted to a transcription service.

This is **experimental transcription, not a licensed or verified lyric database**. Singing, reverb, Tamil pronunciation, mixed languages, and loud accompaniment can cause incorrect or missing words. Silence gating reduces empty-input hallucinations but does not separate vocals from instruments. The first window is collected after four seconds; subsequent windows use six seconds of context with three seconds of overlap. Partial words stream during decoding and are marked Updating, then replaced by the completed phrase. Buffering and inference still create delay; this is not exact karaoke synchronization. Models can lag on slower devices; only the latest waiting window is retained, so slow inference can skip phrases. Short audible phrases flush after a quiet gap. Seeking or changing source clears buffered captions; external seeks in another app are not observable. Closing the panel stops capture and terminates its worker.

Ordinary visualization and the original demo work offline after the production service worker caches them. Lyrics additionally need their model/runtime to have been downloaded and retained by browser storage. Streaming services still need their own internet connection. Private browsing, storage quotas, device memory, or restricted network access can prevent model downloads/caching; music and visuals remain usable.

## Keyboard

| Key          | Action                            |
| ------------ | --------------------------------- |
| Space        | Local playback play/pause         |
| Left / Right | Seek local audio five seconds     |
| M            | Mute local playback               |
| L            | Open/close lyrics                 |
| H            | Hide/show interface               |
| C            | Cinematic viewing                 |
| F            | Fullscreen                        |
| R            | Reset camera                      |
| Escape       | Return to controls / close panels |

Control live playback and volume in its original source app.

## Structure and revision notes

`src/audio/` manages the audio graph, analysis, identity, and optional caption tap; `src/workers/lyrics.worker.ts` performs local inference; `public/audio/lyric-tap.js` downmixes/resamples selected audio to 16 kHz mono; `src/galaxy/ReactiveSignal.ts` distributes smoothed audio to GPU/instanced renderers; `src/shaders/reactiveParticles.ts` contains the particle fields; `src/components/` contains player, source picker, lyrics, and settings.

This revision was compiled for production. **Unit and browser test suites were skipped as requested.** Existing tests and historical results describe the earlier six-mode/LRC revision and do not validate the ten-mode transcription update. See [validation history](docs/validation.md).
