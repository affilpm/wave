import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    headers: {
      // Remove COOP and COEP headers that are blocking postMessage
      'Content-Security-Policy': `
        default-src 'self' https://accounts.google.com https://*.gstatic.com;
        script-src 'self' 'unsafe-inline' 'unsafe-eval' https://accounts.google.com https://*.gstatic.com;
        style-src 'self' 'unsafe-inline' https://accounts.google.com https://*.gstatic.com;
        frame-src 'self' https://accounts.google.com https://*.gstatic.com;
        connect-src 'self' http://localhost:8000 https://accounts.google.com https://*.gstatic.com;
        img-src 'self' https: data:;
      `.replace(/\s+/g, ' ').trim(),
      // Allow popups for Google Sign-In
      'Cross-Origin-Opener-Policy': 'unsafe-none',
      'Cross-Origin-Embedder-Policy': 'unsafe-none'
    }
  },
  optimizeDeps: {
    include: ['jwt-decode']
  }
});