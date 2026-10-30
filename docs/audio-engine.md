# Audio and rendering design

## Graph ownership

One `AudioEngine` owns one HTMLAudioElement and one lazy AudioContext. Its MediaElementAudioSourceNode is created exactly once. The element source connects to the analyzer and separately to the speaker destination. During live input, the paused file source is disconnected from the analyzer and a MediaStreamAudioSourceNode takes its place. The live source is never connected to speakers. The optional MediaStreamAudioDestinationNode taps the analyzer only for explicit video recording. Disconnect, browser-ended sharing, file switching, and unload clean up live tracks.

The analyzer samples on a 60 Hz timer independently of R3F rendering. Hidden tabs stop GPU rendering; browser timer throttling may reduce analysis frequency. Audio continues under browser policy. Context suspension causes features to decay; selecting a source or playing local audio resumes the context. FFT size 2048 provides a practical latency/resolution compromise. Use headphones for microphone input; capture cannot remove acoustic sounds from the room.

## Features

Float dB FFT bins are converted to amplitudes. RMS comes from the time-domain waveform. Bass is 30–250 Hz, midrange 250–4,000 Hz, and treble 4,000–16,000 Hz, clipped to Nyquist. Attack/release smoothing is time-based. Rolling RMS controls bounded normalization gain to make quiet tracks visible while keeping digital silence at zero. Spectral centroid is amplitude-weighted frequency. Positive spectral differences produce spectral flux.

Detected onsets exceed a trailing mean + 1.35 standard deviations, with a minimum flux threshold, audible RMS gate, warm-up, and 240 ms refractory interval. BPM is a median inter-onset interval estimate after at least four usable intervals. A confidence threshold rejects inconsistent intervals. Estimated beat pulses are a separate extrapolation from a confident tempo. These are heuristics: syncopation, rubato, double/half-time and ambient material are inherently ambiguous. The renderer primarily follows continuous band energy and detected onsets; absent tempo never disables visuals. No invented BPM fallback.

Reset on seeking, changing source, and file replacement clears onset and normalization history. Paused audio decays through release envelopes. App UI meters run slower than analysis; no per-frame React state updates are used for particle motion.

## Particle populations

`ReactiveSignal` supplies bass, midrange, treble, onset strength, overall energy, a smoothed 64-bin logarithmic spectrum, and 64 samples of the actual time-domain waveform. Its mutable values are read directly by renderers without per-frame React state. Ten forms share this signal: Star Dust Voyage, Wave Spectre, Nebula Dust, Spectrum, Ocean, Boxy, Particle Shadow, Flip Flop, ElectroSphere, and Matrix Trails. The particle fields use one draw call; Spectrum, Boxy, and Flip Flop use instanced geometry. Ocean uses matching mesh/particle displacement, ElectroSphere adds a displaced wire mesh, and Matrix uses a locally generated glyph atlas. R3F disposes replaced geometries/materials; count and seed changes key the particle geometry. The glyph texture is explicitly disposed on unmount. Quality and mode changes never touch the audio graph.

`VisualRhythm` requires an audible rising onset/bass transient and enforces a refractory period. Measured hits influence impact response; continuous band/FFT energy drives displacement, intensity, and motion. Time and travel are integrated using the current energy, with a small quiet ambient baseline. Pausing decays the real waveform and frequency features instead of leaving the last signal frozen. Reduced motion stops spatial travel and attenuates the response; gentle motion reduces travel speed. The old freeze UI and zero flow-speed minimum were removed to prevent accidental motion stalls.

The old black-hole, planet, comet, and spectrum-crown renderers were removed. Low quality disables bloom; there are no custom high-priority frame passes that can suppress the normal scene render.

Evolve advances to another experience after at least 42 seconds of audible input and a strong transient, with a 65-second fallback for sustained music. It is off by default. The audio connection and playback remain continuous. Users can switch directly at any time.

Layer labels are descriptive: low end / body and melody / percussive detail. They are not claims of instrument isolation. True individual-instrument control would require a source-separation model or pre-separated stems. It would add latency, memory, compute costs and licensing considerations and is deliberately not simulated.

## Optional audio-to-text

`LiveTranscriber` taps the existing analyzer using a dedicated AudioWorklet branch connected to a zero-gain sink. It does not create another media-element source, request another input, or monitor live audio through speakers. The worklet downmixes/resamples to 16 kHz mono, emits a first four-second window, then rolling six-second windows with three seconds of overlap. Short phrases flush after a quiet gap. One-second buffer messages make listening progress visible. A lightweight energy gate skips near-silent windows; it is not vocal source separation or a speech activity classifier.

A lazy worker runs quantized multilingual Whisper Tiny (default) or Base with Transformers.js. The default Tiny model is bundled locally at a pinned revision; the runtime factory and WASM are served by the application. CPU/WASM is the compatibility default; optional GPU acceleration falls back to CPU on initialization or inference failure. Explicit Tamil/English selection avoids this library version's unsupported automatic language detection. A TextStreamer emits provisional words during generation, tagged with the source revision. Quiet audible PCM is normalized with bounded gain before decoding, and real PCM levels distinguish a silent source from active buffering. The controller retains at most one waiting window, deduplicates overlap, and clears stale text. Download, worker, audio-tap, and inference errors are reported with their stage and actual message. Source resets tag windows/requests so old results are discarded. Closing the panel terminates its worker and detaches the tap without disrupting music. Optional subtitles use a portal outside the hideable interface and remain visible during cinematic viewing.

Model/runtime assets are fetched only after enabling lyrics. Tiny loads from the application; Base requires an optional remote download. The service worker caches ordinary visualization assets on installation and caption runtime assets on demand; Transformers.js manages its model cache. No music/PCM/recognized text is uploaded. Transcriptions may be delayed, wrong, or missing with singing and accompaniment. They are not verified lyrics or exact karaoke timing. External source timeline/seek metadata is unavailable to ordinary browser capture.

## Limits and future work

- Chrome/Edge tab capture and supported Windows system-audio sharing are browser-mediated, not native WASAPI loopback.
- No login, service API integration, streaming-service track metadata, DRM handling or protected-audio workaround.
- Representative file analysis decodes the full small file before sampling windows. The 40 MB cutoff bounds compressed input, but decoded memory can still be significant for very long files.
- Brightness in offline DNA is a zero-crossing proxy, not a full spectral centroid. Live centroid is FFT-based.
- Capture uses `preserveDrawingBuffer` for reliable PNG export, which has a performance cost; low quality disables bloom and caps pixel ratio.
- Automatic quality requires sustained low frame rate after warm-up; users can disable it.
- Native Windows loopback could be a future Tauri/Rust module with explicit source and permission UX. It is not implemented here.
