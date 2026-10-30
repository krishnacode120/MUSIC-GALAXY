import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwind from '@tailwindcss/vite';
export default defineConfig({
  plugins: [react(), tailwind()],
  worker: { format: 'es' },
  // Discover the lazy speech dependency before playback, avoiding an optimizer-triggered page reload.
  optimizeDeps: { include: ['@huggingface/transformers'] },
  server: {
    watch: {
      ignored: [
        '**/artifacts/**',
        '**/docs/**',
        '**/scripts/**',
        '**/README.md',
        '**/public/models/**',
      ],
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: './src/tests/setup.ts',
    include: ['src/**/*.test.{ts,tsx}'],
  },
  build: {
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      output: {
        manualChunks: {
          three: [
            'three',
            '@react-three/fiber',
            '@react-three/drei',
            '@react-three/postprocessing',
          ],
        },
      },
    },
  },
});
