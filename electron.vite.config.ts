import { defineConfig } from 'electron-vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  main: {
    build: {
      outDir: 'out/main'
    }
  },
  preload: {
    build: {
      outDir: 'out/preload'
    }
  },
  renderer: {
    plugins: [react()],
    server: {
      host: '127.0.0.1',
      port: 5173
    },
    build: {
      outDir: 'out/renderer'
    }
  }
});
