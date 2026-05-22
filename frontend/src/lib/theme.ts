import { createTheme } from '@mantine/core';

export const theme = createTheme({
  primaryColor: 'indigo',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  defaultRadius: 'md',
  components: {
    Button: { defaultProps: { size: 'sm' } },
    TextInput: { defaultProps: { size: 'sm' } },
    Modal: { defaultProps: { centered: true } },
    Input: {
      styles: {
        input: {
          '@media (max-width: 768px)': {
            fontSize: '16px',
          },
        },
      },
    },
  },
});
