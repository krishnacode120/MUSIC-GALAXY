import { readdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';

const root = path.resolve('dist');
const files = [
  '/index.html',
  '/favicon.svg',
  '/audio/lyric-tap.js',
  '/galaxy-reference/planetary-nebula.webp',
  '/galaxy-reference/black-hole-flow.webp',
  '/galaxy-reference/blue-nebula.webp',
  '/galaxy-reference/spiral-vortex.webp',
  '/galaxy-reference/event-horizon.webp',
  '/galaxy-reference/dust-galaxy.webp',
];
const optional = ['/lyrics-runtime/ort-wasm-simd-threaded.asyncify.mjs'];
for (const name of await readdir(path.join(root, 'assets'))) {
  const list = name.startsWith('lyrics.worker-') || name.endsWith('.wasm') ? optional : files;
  list.push(`/assets/${name}`);
}
const digest = createHash('sha256');
for (const file of files) digest.update(await readFile(path.join(root, file.slice(1))));
const cache = `music-galaxy-${digest.digest('hex').slice(0, 12)}`;
await writeFile(
  path.join(root, 'sw.js'),
  `
const CACHE = ${JSON.stringify(cache)};
const FILES = ${JSON.stringify(files)};
const OPTIONAL = ${JSON.stringify(optional)};
self.addEventListener('install', event => event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(FILES)).then(() => self.skipWaiting())));
self.addEventListener('activate', event => event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('music-galaxy-') && key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim())));
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== self.location.origin) return;
  if (event.request.mode === 'navigate') {
    event.respondWith(fetch(event.request).catch(() => caches.open(CACHE).then(cache => cache.match('/index.html', { ignoreVary: true }))));
  } else if (FILES.includes(url.pathname)) {
    event.respondWith(caches.open(CACHE).then(cache => cache.match(url.pathname, { ignoreVary: true })).then(cached => cached || fetch(event.request)));
  } else if (OPTIONAL.includes(url.pathname)) {
    event.respondWith(caches.open(CACHE).then(async cache => {
      const cached = await cache.match(url.pathname, { ignoreVary: true });
      if (cached) return cached;
      const response = await fetch(event.request);
      if (response.ok) { try { await cache.put(url.pathname, response.clone()); } catch {} }
      return response;
    }));
  }
});
`,
);
console.log(`Offline cache prepared: ${files.length} local assets.`);
