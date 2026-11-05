import { Fragment } from 'react';

/**
 * Renders the tiny Markdown subset used in rule text and findings:
 * `inline code` and **bold**. Everything else is plain text (never HTML).
 */
export function Md({ children }: { children: string }) {
  const parts = children.split(/(`[^`]+`|\*\*[^*]+\*\*)/g);
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith('`') && part.endsWith('`') && part.length > 2) {
          return (
            <code key={i} className="rounded-sm bg-surface-2 px-1 py-0.5 font-mono text-code-inline">
              {part.slice(1, -1)}
            </code>
          );
        }
        if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
          return <strong key={i}>{part.slice(2, -2)}</strong>;
        }
        return <Fragment key={i}>{part}</Fragment>;
      })}
    </>
  );
}

/** Plain text for meta tags and JSON-LD. */
export function stripMd(text: string): string {
  return text.replace(/`([^`]+)`/g, '$1').replace(/\*\*([^*]+)\*\*/g, '$1');
}
