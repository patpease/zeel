// vitest's defineConfig is a superset of vite's — one config file rather than
// two, which keeps the plugin list from being loaded twice.
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: { port: 5184 },
  preview: { port: 4184 },
  build: { outDir: 'dist', sourcemap: true },
  test: {
    // Node by default: most of the suite reads data/dataset.json off disk, and
    // under jsdom `import.meta.url` is an http URL that readFileSync rejects.
    // The shell test opts into jsdom with a docblock.
    environment: 'node',
    setupFiles: ['./test/setup.ts'],
    include: ['test/**/*.test.{ts,tsx,mjs}'],
  },
});
