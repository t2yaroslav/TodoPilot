import '@mantine/core/styles.css';
import '@mantine/dates/styles.css';
import '@mantine/notifications/styles.css';
import '@mantine/tiptap/styles.css';

import { createRoot } from 'react-dom/client';
import { MantineProvider } from '@mantine/core';
import { DatesProvider } from '@mantine/dates';
import { Notifications } from '@mantine/notifications';
import { GoogleOAuthProvider } from '@react-oauth/google';
import App from './App';
import { theme } from './lib/theme';
import { logger } from './lib/logger';
import 'dayjs/locale/ru';

const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

// Global browser error handlers — send uncaught errors to backend
window.onerror = (message, source, lineno, colno, error) => {
  logger.error(String(message), {
    source: 'browser',
    file: source,
    line: lineno,
    col: colno,
    stack: error?.stack,
  });
};

window.onunhandledrejection = (event) => {
  const reason = event.reason;
  logger.error(`Unhandled rejection: ${reason?.message || reason}`, {
    source: 'browser',
    stack: reason?.stack,
  });
};

createRoot(document.getElementById('root')!).render(
  <GoogleOAuthProvider clientId={googleClientId}>
    <MantineProvider theme={theme} defaultColorScheme="light">
      <DatesProvider settings={{ locale: 'ru' }}>
        <Notifications position="top-right" />
        <App />
      </DatesProvider>
    </MantineProvider>
  </GoogleOAuthProvider>
);
