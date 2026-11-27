import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

const hotReload = process.env.HOT_RELOAD !== 'false';

function getAppVersion(): string {
  const buildDate = new Date();
  const day = String(buildDate.getUTCDate()).padStart(2, '0');
  const month = String(buildDate.getUTCMonth() + 1).padStart(2, '0');
  return `${day}${month}${buildDate.getUTCFullYear()}`;
}

export default defineConfig({
  plugins: [react()],
  define: {
    __APP_VERSION__: JSON.stringify(getAppVersion()),
  },
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
