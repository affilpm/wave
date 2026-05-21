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
        '/api/v1': {
          target: API_URL || 'http://localhost',
          changeOrigin: true,
        },
        '/media': {
          target: API_URL || 'http://localhost',
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
            http://localhost:*
            http://127.0.0.1:*
            ws://localhost:*
            ws://127.0.0.1:*
            https://api-wave.affilpm.com
            https://assets-wave.affilpm.com
            wss://api-wave.affilpm.com
            https://*.cloudfront.net
            https://*.razorpay.com;
          img-src 'self' https: data: blob: http://localhost:* http://127.0.0.1:* https://api-wave.affilpm.com https://*.s3.amazonaws.com https://*.cloudfront.net;
          media-src 'self' blob: data: http://localhost:* http://127.0.0.1:* https://api-wave.affilpm.com https://*.s3.amazonaws.com https://*.cloudfront.net;
          font-src 'self' data:;
          worker-src 'self' blob:;
        `.replace(/\s+/g, ' ').trim(),
      },
    },
    optimizeDeps: {
      include: ['jwt-decode'],
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: [
              'react',
              'react-dom',
              'react-router-dom',
              '@reduxjs/toolkit',
              'react-redux',
              'axios'
            ],
            ui: [
              '@chakra-ui/react',
              '@mui/material',
              'antd',
              'shadcn-ui',
              'framer-motion'
            ],
            media: [
              'hls.js',
              'howler',
            ]
          }
        }
      }
    }
  };
});