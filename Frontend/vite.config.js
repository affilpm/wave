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
      'Content-Security-Policy': `
        default-src 'self' https://accounts.google.com https://*.gstatic.com blob:;
        script-src 'self' 'unsafe-inline' 'unsafe-eval' https://accounts.google.com https://*.gstatic.com;
        style-src 'self' 'unsafe-inline' https://accounts.google.com https://*.gstatic.com;
        frame-src 'self' https://accounts.google.com https://*.gstatic.com;
        connect-src 'self' http://localhost:8000 https://accounts.google.com https://*.gstatic.com;
        img-src 'self' http://localhost:8000 https: data: blob:;
        media-src 'self' blob: http://localhost:8000;
        font-src 'self' data:;
      `.replace(/\s+/g, ' ').trim(),
      // Keep other headers as they are
    },
  },
  optimizeDeps: {
    include: ['jwt-decode'],
  },
});