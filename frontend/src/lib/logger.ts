/**
 * Frontend logger — buffers entries and sends them to POST /api/logs.
 * Errors are flushed immediately; other levels batch every 5s or 10 entries.
 */

import axios from 'axios';

interface LogEntry {
  level: string;
  message: string;
  source: string;
  url?: string;
  stack?: string;
  user_agent?: string;
  extra?: Record<string, unknown>;
  timestamp?: string;
}

const FLUSH_INTERVAL = 5000;
const FLUSH_SIZE = 10;
let buffer: LogEntry[] = [];
let timer: ReturnType<typeof setTimeout> | null = null;

function getToken(): string | null {
  return localStorage.getItem('token');
}

function flush() {
  if (buffer.length === 0) return;
  const batch = buffer;
  buffer = [];
  if (timer) {
    clearTimeout(timer);
    timer = null;
  }

  const token = getToken();
  if (!token) return; // not authenticated, drop logs

  // Use sendBeacon if page is unloading, otherwise axios
  const body = JSON.stringify(batch);
  if (document.visibilityState === 'hidden') {
    const blob = new Blob([body], { type: 'application/json' });
    navigator.sendBeacon('/api/logs', blob);
    return;
  }

  axios.post('/api/logs', batch, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  }).catch(() => {
    // Silently drop — avoid infinite loops if the log endpoint fails
  });
}

function scheduleFlush() {
  if (!timer) {
    timer = setTimeout(flush, FLUSH_INTERVAL);
  }
}

function log(level: string, message: string, extra?: Record<string, unknown>) {
  const entry: LogEntry = {
    level,
    message,
    source: 'frontend',
    url: window.location.pathname,
    user_agent: navigator.userAgent,
    timestamp: new Date().toISOString(),
    ...(extra && { extra }),
  };

  // Dev mode: also output to console
  if (import.meta.env.DEV) {
    const consoleFn = level === 'error' ? console.error
      : level === 'warn' ? console.warn
      : level === 'debug' ? console.debug
      : console.info;
    consoleFn(`[${level.toUpperCase()}]`, message, extra || '');
  }

  buffer.push(entry);

  if (level === 'error' || buffer.length >= FLUSH_SIZE) {
    flush();
  } else {
    scheduleFlush();
  }
}

// Flush remaining logs on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flush();
  });
}

export const logger = {
  debug: (msg: string, extra?: Record<string, unknown>) => log('debug', msg, extra),
  info: (msg: string, extra?: Record<string, unknown>) => log('info', msg, extra),
  warn: (msg: string, extra?: Record<string, unknown>) => log('warn', msg, extra),
  error: (msg: string, extra?: Record<string, unknown>) => log('error', msg, extra),
};
