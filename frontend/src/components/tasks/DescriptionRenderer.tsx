import { TypographyStylesProvider } from '@mantine/core';

interface Props {
  content: string;
  lineClamp?: number;
  size?: 'xs' | 'sm' | 'md';
}

const URL_REGEX = /((?:[a-zA-Z][a-zA-Z0-9+.-]*):\/\/[^\s<]+)/g;

function prepareHtml(content: string): string {
  if (/<[a-z][\s\S]*>/i.test(content)) {
    return content;
  }
  // Plain text fallback: escape HTML, auto-linkify URLs, preserve newlines
  const escaped = content
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  const linkified = escaped.replace(
    URL_REGEX,
    '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>',
  );
  return linkified
    .split('\n')
    .map((line) => `<p>${line || '<br>'}</p>`)
    .join('');
}

export function DescriptionRenderer({ content, lineClamp, size = 'sm' }: Props) {
  const fontSize = size === 'xs' ? 12 : size === 'sm' ? 14 : 16;
  const html = prepareHtml(content);

  const handleClick = (e: React.MouseEvent) => {
    const link = (e.target as HTMLElement).closest('a');
    if (link && link.href) {
      e.preventDefault();
      e.stopPropagation();
      if (/^https?:\/\//i.test(link.href)) {
        window.open(link.href, '_blank', 'noopener,noreferrer');
      } else {
        // Custom protocol links (obsidian://, tg://, etc.)
        window.location.href = link.href;
      }
    }
  };

  return (
    <TypographyStylesProvider
      style={
        lineClamp
          ? {
              display: '-webkit-box',
              WebkitLineClamp: lineClamp,
              WebkitBoxOrient: 'vertical' as const,
              overflow: 'hidden',
            }
          : undefined
      }
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
      <div onClick={handleClick} dangerouslySetInnerHTML={{ __html: html }} />
    </TypographyStylesProvider>
  );
}
