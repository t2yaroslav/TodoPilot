import ReactMarkdown from 'react-markdown';
import { TypographyStylesProvider } from '@mantine/core';

interface Props {
  content: string;
  lineClamp?: number;
  size?: 'xs' | 'sm' | 'md';
}

export function DescriptionRenderer({ content, lineClamp, size = 'sm' }: Props) {
  const fontSize = size === 'xs' ? 12 : size === 'sm' ? 14 : 16;

  return (
    <TypographyStylesProvider
      style={{
        ...(lineClamp ? {
          display: '-webkit-box',
          WebkitLineClamp: lineClamp,
          WebkitBoxOrient: 'vertical' as const,
          overflow: 'hidden',
        } : {}),
      }}
      styles={{
        root: {
          fontSize,
          '& p': { margin: 0 },
          '& p + p': { marginTop: 4 },
          '& a': { color: 'var(--mantine-color-blue-6)', textDecoration: 'underline' },
          '& ul, & ol': { margin: '4px 0', paddingLeft: 20 },
          '& li': { margin: 0 },
        },
      }}
    >
      <ReactMarkdown
        components={{
          a: ({ href, children, ...props }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              {...props}
            >
              {children}
            </a>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </TypographyStylesProvider>
  );
}
