import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

const hotReload = process.env.HOT_RELOAD !== 'false';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000,
    hmr: hotReload,
    watch: hotReload
      ? { usePolling: true, interval: Number(process.env.HOT_RELOAD_INTERVAL) || 1000 }
      : { usePolling: false, ignored: ['**/*'] },
    proxy: {
      '/api': {
        target: process.env.API_PROXY_TARGET || 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
});
