# Validation record

## Current revision — 30 October 2026

The application now has ten visual modes, gentler music-following motion, independent brightness, and on-device transcription. Test suites were deliberately skipped at the user's request. Targeted browser troubleshooting used a public English speech fixture; this is not validation of lyric accuracy on actual Tamil/English songs. The previous browser/unit results below refer only to the earlier six-mode application. An intermediate revision passed the production TypeScript/Vite build. The final local model-path correction and fullscreen button changes have not been rebuilt: automatic approval review could not execute the build because of a usage limit.

The development server's logs revealed that discovering the lazy speech dependency triggered optimization and a full page reload during caption startup. The speech library is now explicitly included in startup dependency optimization. Documentation/generated-artifact edits no longer trigger playback-disrupting reloads. Default Tiny weights and the inference runtime are served locally, CPU decoding is the default, and optional GPU failures retry CPU.

The speech library's metadata probe skipped local files when its model directory was configured as an absolute HTTP URL, causing an unauthorized remote lookup for the bundled Tiny model. The model directory now uses the application's root-relative base path, and remote model requests are disabled when bundled Tiny files are available. This final correction has not been verified in a subsequent browser run. Fullscreen hides the app's fullscreen exit and cinematic return buttons; Escape and the F shortcut remain available. Further testing was skipped as requested.

## Historical six-mode revision — 29 October 2026

Validated locally on Windows with installed Google Chrome via Playwright.

- Production TypeScript/Vite build: passed; `dist/` and offline service worker generated.
- Vitest: 24 passing unit/integration tests across 7 files, including silence-gated visual rhythm events and multilingual LRC parsing/seeking.
- Playwright development run: 6 passing workflows, with the production-only offline check skipped as intended.
- Playwright production run: all 7 workflows passed, including offline reload/demo playback and a pixel check that the black hole center stays black after bloom. Low-quality black hole rendering was also visually inspected.
- Dependency installation audit: 0 known vulnerabilities at validation time.

Browser coverage includes rendered WebGL, demo playback, seeking, all six modes without losing playback, camera controls, quality changes, saved-look creation/rename/load/delete, PNG export with signature validation, WebM export with EBML signature validation, local-file content identity after renaming, quiet/silent audio, playlist removal, invalid codec errors, mobile sizing, optional Tamil/English lyrics, lyric seek synchronization, track-change clearing, immersive escape, fullscreen transitions, and offline reload/demo playback.

Live-input testing provides a real oscillator-backed MediaStream through an isolated mocked sharing picker. It verifies the actual Web Audio stream graph and visible signal response. Separate tests cover missing audio tracks, denied sharing, track cleanup, and never routing captured audio to speaker output. This does not verify a real Spotify/YouTube session, protected media, every operating-system picker, or universal desktop-system capture. Those remain browser/platform-dependent.

Screenshots and small sample exports are in the ignored `artifacts/` directory. Full test reports are regenerated under ignored `playwright-report/` and `test-results/` directories.

The renderer targets smooth interactive playback, but 60 FPS is not guaranteed or claimed across hardware. Automatic quality reduction is available. The production build reports a non-fatal size advisory for the approximately 1.21 MB Three.js renderer chunk (approximately 337 KB gzip); it is cached for repeat/offline use.

Vercel configuration is included. No production deployment was performed.
