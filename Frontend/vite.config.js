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
        target: 'ws://13.49.227.70:8000',
        ws: true,
        changeOrigin: true,
      },
    },
    headers: {
      'Content-Security-Policy': `
        default-src 'self' https://accounts.google.com https://*.gstatic.com blob: https://*.razorpay.com 'unsafe-eval' 'unsafe-inline' data:;
        script-src 'self' 'unsafe-inline' 'unsafe-eval' https://accounts.google.com https://*.gstatic.com https://*.razorpay.com;
        style-src 'self' 'unsafe-inline' https://accounts.google.com https://*.gstatic.com;
        frame-src 'self' https://accounts.google.com https://*.gstatic.com https://*.razorpay.com;
        frame-ancestors 'self' https://accounts.google.com https://*.gstatic.com;
        connect-src 'self' 
          ws://13.49.227.70:8000 ws://13.49.227.70:* wss://13.49.227.70:* http://13.49.227.70:* https://13.49.227.70:* wss://*.razorpay.com
          wss://*.agora.io wss://*.sd-rtn.com
          wss://*.edge.agora.io wss://*.edge.sd-rtn.com
          https://*.agora.io https://*.sd-rtn.com
          https://web-2.statscollector.sd-rtn.com 
          https://statscollector-1.agora.io
          wss://107-155-41-35.edge.agora.io:* 
          wss://107-155-41-35.edge.sd-rtn.com:*
          wss://*.edge.agora.io:* 
          wss://*.edge.sd-rtn.com:*;
        img-src 'self' http://13.49.227.70:* https: data: blob:;
        media-src 'self' blob: data: http://13.49.227.70:* https://13.49.227.70:*;
        font-src 'self' data:;
        worker-src 'self' blob:;
      `.replace(/\s+/g, ' ').trim(),
    },
  },
  optimizeDeps: {
    include: ['jwt-decode'],
  },
});