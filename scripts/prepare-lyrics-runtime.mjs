import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
const root = path.resolve('public/lyrics-runtime');
await mkdir(root, { recursive: true });
const target = path.join(root, 'ort-wasm-simd-threaded.asyncify.mjs');
const source = await readFile(
  path.resolve('node_modules/onnxruntime-web/dist/ort-wasm-simd-threaded.asyncify.mjs'),
);
const existing = await readFile(target).catch(() => null);
if (!existing?.equals(source)) await writeFile(target, source);
