/// <reference types="vitest/config" />
/// <reference types="vite-react-ssg" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    // CSP forbids inline scripts; never inline assets as data: scripts.
    assetsInlineLimit: 0,
  },
  ssgOptions: {
    dirStyle: 'nested',
  },
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
  },
});
