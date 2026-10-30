import { mkdir, stat, writeFile, rename } from 'node:fs/promises';
import { createWriteStream } from 'node:fs';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import path from 'node:path';
const revision = 'ff4177021cc41f7db950912b73ea4fdf7d01d8e7';
const root = path.resolve('public/models/whisper-tiny');
const files = [
  'config.json',
  'generation_config.json',
  'preprocessor_config.json',
  'tokenizer.json',
  'tokenizer_config.json',
  'normalizer.json',
  'special_tokens_map.json',
  'added_tokens.json',
  'vocab.json',
  'merges.txt',
  'README.md',
  'onnx/encoder_model_quantized.onnx',
  'onnx/decoder_model_merged_quantized.onnx',
];
await mkdir(root, { recursive: true });
for (const file of files) {
  const target = path.resolve(root, file);
  if (!target.startsWith(root + path.sep)) throw new Error('Invalid asset path');
  if (
    await stat(target)
      .then((s) => s.size > 0)
      .catch(() => false)
  ) {
    console.log(`Already available: ${file}`);
    continue;
  }
  await mkdir(path.dirname(target), { recursive: true });
  const response = await fetch(
    `https://huggingface.co/onnx-community/whisper-tiny/resolve/${revision}/${file}`,
  );
  if (!response.ok) throw new Error(`Model asset ${file}: HTTP ${response.status}`);
  await pipeline(Readable.fromWeb(response.body), createWriteStream(target + '.part'));
  await rename(target + '.part', target);
  console.log(`Prepared: ${file}`);
}
await writeFile(
  path.join(root, 'source.json'),
  JSON.stringify(
    {
      model: 'onnx-community/whisper-tiny',
      revision,
      source: 'https://huggingface.co/onnx-community/whisper-tiny',
      files,
    },
    null,
    2,
  ),
);
const licenseResponse = await fetch(
  'https://raw.githubusercontent.com/openai/whisper/main/LICENSE',
);
if (licenseResponse.ok)
  await writeFile(path.join(root, 'LICENSE.whisper'), await licenseResponse.text());
console.log('Default multilingual caption model is now available locally.');
