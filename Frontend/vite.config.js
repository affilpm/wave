import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig(({ mode }) => {
  // Load env variables for current mode (development/production)
  const env = loadEnv(mode, process.cwd(), '');

  const API_URL = env.VITE_API_URL;
  const API_W = env.VITE_API_W;

  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      proxy: {
        '/ws/webrtc': {
          target: API_W || 'ws://localhost:8000',
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
            ${API_URL}
            ${API_W}
            ws://localhost:* wss://localhost:* http://localhost:* https://localhost:*
            https://*.cloudfront.net
            wss://*.razorpay.com
            wss://*.agora.io wss://*.sd-rtn.com
            wss://*.edge.agora.io wss://*.edge.sd-rtn.com
            https://*.agora.io https://*.sd-rtn.com
            https://web-2.statscollector.sd-rtn.com 
            https://statscollector-1.agora.io;
          img-src 'self' https: data: blob: https://wavebuckt12.s3.amazonaws.com https://*.cloudfront.net;
          media-src 'self' blob: data: ${API_URL} https://wavebuckt12.s3.amazonaws.com https://*.cloudfront.net;
          font-src 'self' data:;
          worker-src 'self' blob:;
        `.replace(/\s+/g, ' ').trim(),
      },
    },
    optimizeDeps: {
      include: ['jwt-decode'],
    },
  };
});