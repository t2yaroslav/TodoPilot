import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { execSync } from 'child_process';
import fs from 'fs';

const hotReload = process.env.HOT_RELOAD !== 'false';

function getAppVersion(): string {
  const pkg = JSON.parse(fs.readFileSync(path.resolve(__dirname, 'package.json'), 'utf-8'));
  const base = pkg.version || '1.0.0';
  try {
    const commitCount = execSync('git rev-list --count HEAD', { encoding: 'utf-8' }).trim();
    return `${base}.${commitCount}`;
  } catch {
    return base;
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
