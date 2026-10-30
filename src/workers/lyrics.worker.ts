import {
  env,
  pipeline,
  TextStreamer,
  type AutomaticSpeechRecognitionPipeline,
} from '@huggingface/transformers';
import wasmURL from '../../node_modules/onnxruntime-web/dist/ort-wasm-simd-threaded.asyncify.wasm?url';

const localURL = (path: string) =>
  new URL(`${import.meta.env.BASE_URL}${path}`, self.location.origin).href;
env.allowLocalModels = true;
// Keep this root-relative: the library's metadata probe treats absolute HTTP paths as remote Hub models.
env.localModelPath = `${import.meta.env.BASE_URL}models/`;
env.useBrowserCache = true;
// Runtime files are served by the application; no third-party script/CDN is needed.
env.useWasmCache = false;
if (env.backends.onnx.wasm) {
  env.backends.onnx.wasm.numThreads = 1;
  env.backends.onnx.wasm.proxy = false;
  env.backends.onnx.wasm.wasmPaths = {
    mjs: localURL('lyrics-runtime/ort-wasm-simd-threaded.asyncify.mjs'),
    wasm: new URL(wasmURL, self.location.origin).href,
  };
}
let transcriber: AutomaticSpeechRecognitionPipeline | null = null;
let busy = false,
  model = '',
  localOnly = false,
  device: 'wasm' | 'webgpu' = 'wasm';
const load = (backend: 'wasm' | 'webgpu') =>
  pipeline('automatic-speech-recognition', model, {
    device: backend,
    dtype: 'q8',
    local_files_only: localOnly,
    progress_callback: (progress) => {
      if (progress.status === 'progress')
        self.postMessage({
          type: 'progress',
          file: progress.file,
          progress: progress.progress,
          local: localOnly,
        });
      if (progress.status === 'done')
        self.postMessage({ type: 'backend', text: 'Preparing the speech model for decoding…' });
    },
  });
self.onmessage = async (event: MessageEvent) => {
  const data = event.data;
  try {
    if (data.type === 'load') {
      let bundled = false;
      if (data.model === 'tiny') {
        try {
          const response = await fetch(localURL('models/whisper-tiny/config.json'));
          bundled =
            response.ok &&
            response.headers.get('content-type')?.includes('json') === true &&
            (await response.json()).model_type === 'whisper';
        } catch {
          /* Remote fallback reports an explicit download error if unavailable. */
        }
      }
      localOnly = bundled;
      env.allowRemoteModels = !bundled;
      model = bundled
        ? 'whisper-tiny'
        : data.model === 'base'
          ? 'onnx-community/whisper-base'
          : 'onnx-community/whisper-tiny';
      self.postMessage({
        type: 'backend',
        text: bundled
          ? 'Loading the bundled local speech model…'
          : 'Downloading the selected speech model…',
      });
      device = data.acceleration && 'gpu' in navigator ? 'webgpu' : 'wasm';
      try {
        transcriber = await load(device);
      } catch (error) {
        if (device === 'wasm') throw error;
        self.postMessage({
          type: 'backend',
          text: 'GPU speech engine unavailable; preparing the compatible CPU engine…',
        });
        device = 'wasm';
        transcriber = await load(device);
      }
      self.postMessage({ type: 'ready', device, local: bundled });
    } else if (data.type === 'transcribe' && transcriber && !busy) {
      busy = true;
      const decode = async () => {
        let draft = '',
          lastEmit = 0;
        const current = transcriber!;
        const streamer = new TextStreamer(current.tokenizer, {
          skip_prompt: true,
          skip_special_tokens: true,
          callback_function: (piece) => {
            draft += piece;
            if (performance.now() - lastEmit > 100) {
              lastEmit = performance.now();
              self.postMessage({ type: 'partial', revision: data.revision, text: draft });
            }
          },
        });
        // Require an explicit language; this library's Whisper implementation defaults to English without it.
        return current(data.audio as Float32Array, {
          language: data.language === 'tamil' ? 'tamil' : 'english',
          task: data.translate ? 'translate' : 'transcribe',
          return_timestamps: false,
          max_new_tokens: 112,
          num_beams: 1,
          do_sample: false,
          streamer,
        });
      };
      let result;
      try {
        result = await decode();
      } catch (error) {
        if (device === 'wasm') throw error;
        self.postMessage({ type: 'partial', revision: data.revision, text: '' });
        self.postMessage({
          type: 'backend',
          text: 'Retrying speech decoding with the compatible CPU engine…',
        });
        await transcriber.dispose().catch(() => {});
        device = 'wasm';
        transcriber = await load(device);
        result = await decode();
      }
      const output = Array.isArray(result) ? result[0] : result;
      self.postMessage({ type: 'result', revision: data.revision, text: output.text });
    }
  } catch (error) {
    self.postMessage({
      type: 'error',
      stage: data.type === 'load' ? 'model' : 'decode',
      message: error instanceof Error ? error.message : String(error),
    });
  } finally {
    busy = false;
  }
};
