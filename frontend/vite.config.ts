import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { execSync } from 'child_process';

const hotReload = process.env.HOT_RELOAD !== 'false';

function getAppVersion(): string {
  if (process.env.APP_VERSION) {
    return process.env.APP_VERSION;
  }
  try {
    return execSync('git log -1 --format=%cd --date=format:%d.%m.%Y', { encoding: 'utf-8' }).trim();
  } catch {
    const now = new Date();
    const d = now.getDate().toString().padStart(2, '0');
    const m = (now.getMonth() + 1).toString().padStart(2, '0');
    return `${d}.${m}.${now.getFullYear()}`;
  }
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
