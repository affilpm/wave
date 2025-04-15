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
    proxy: {
      '/ws/webrtc': {
        target: 'wss://api.affils.site',
        ws: true,
        changeOrigin: true,
      },
    },
    headers: {
      'Content-Security-Policy': `
        default-src 'self' https://accounts.google.com https://*.gstatic.com blob: https://*.razorpay.com 'unsafe-eval' 'unsafe-inline' data:;
        script-src 'self' 'unsafe-inline' 'unsafe-eval' https://accounts.google.com https://*.gstatic.com https://*.razorpay.com;
        script-src-elem 'self' 'unsafe-inline' 'unsafe-eval' https://accounts.google.com https://*.gstatic.com https://*.razorpay.com;
        style-src 'self' 'unsafe-inline' https://accounts.google.com https://*.gstatic.com;
        frame-src 'self' https://accounts.google.com https://*.gstatic.com https://*.razorpay.com;
        frame-ancestors 'self' https://accounts.google.com https://*.gstatic.com;
        connect-src 'self'
          ws://localhost:8000 ws://localhost:* wss://localhost:* http://localhost:* https://localhost:*
          https://api.affils.site wss://api.affils.site
          wss://*.razorpay.com
          wss://*.agora.io wss://*.sd-rtn.com
          wss://*.edge.agora.io wss://*.edge.sd-rtn.com
          https://*.agora.io https://*.sd-rtn.com
          https://web-2.statscollector.sd-rtn.com 
          https://statscollector-1.agora.io
          wss://107-155-41-35.edge.agora.io:* wss://107-155-41-35.edge.sd-rtn.com:*
          wss://*.edge.agora.io:* wss://*.edge.sd-rtn.com:*;
        img-src 'self' https: data: https://api.affils.site blob:;
        media-src 'self' blob: data: https://api.affils.site;
        font-src 'self' data:;
        worker-src 'self' blob:;
      `.replace(/\s+/g, ' ').trim(),
    },
  },
  optimizeDeps: {
    include: ['jwt-decode'],
  },
});