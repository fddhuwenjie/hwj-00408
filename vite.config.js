import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 3408,
    host: true
  },
  build: {
    sourcemap: true
  }
});
