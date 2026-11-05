import type { Config } from 'tailwindcss';

const token = (name: string) => `rgb(var(--${name}) / <alpha-value>)`;

const colorNames = [
  'chrome', 'chrome-2', 'chrome-deep', 'chrome-fg', 'chrome-muted',
  'bg', 'surface', 'surface-2', 'border', 'border-strong', 'fg', 'fg-muted',
  'primary', 'primary-hover', 'primary-fg', 'accent',
  'success', 'success-subtle', 'warning', 'warning-subtle',
  'danger', 'danger-subtle', 'info', 'info-subtle',
] as const;

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    // Replace (not extend) colors so ad-hoc palette classes like `bg-blue-500` don't exist.
    colors: {
      transparent: 'transparent',
      current: 'currentColor',
      ...Object.fromEntries(colorNames.map((n) => [n, token(n)])),
    },
    fontFamily: {
      sans: ['"Inter Variable"', 'Inter', 'system-ui', 'sans-serif'],
      mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
    },
    fontSize: {
      label: ['0.75rem', { lineHeight: '1rem', letterSpacing: '0.02em', fontWeight: '600' }],
      sm: ['0.875rem', { lineHeight: '1.375rem' }],
      code: ['0.875rem', { lineHeight: '1.375rem' }],
      base: ['1rem', { lineHeight: '1.875rem' }],
      ui: ['1rem', { lineHeight: '1.5rem' }],
      lead: ['1.125rem', { lineHeight: '1.5rem', fontWeight: '600' }],
      h3: ['1.25rem', { lineHeight: '1.75rem', fontWeight: '600' }],
      h2: ['1.75rem', { lineHeight: '2.25rem', fontWeight: '600', letterSpacing: '-0.01em' }],
      h1: ['2rem', { lineHeight: '2.5rem', fontWeight: '400', letterSpacing: '-0.01em' }],
      grade: ['3.5rem', { lineHeight: '1', fontWeight: '600' }],
      'code-inline': '0.875em',
    },
    borderRadius: {
      none: '0',
      sm: '2px',
      md: '4px',
      lg: '12px',
      full: '9999px',
    },
    boxShadow: {
      none: 'none',
      focus: '0 0 0 2px rgb(var(--primary))',
    },
    extend: {
      maxWidth: { content: '1160px', main: '760px' },
      height: { header: '72px', subheader: '64px', editor: '28rem', 'editor-lg': '36rem' },
      spacing: { gutter: '24px' },
      letterSpacing: { motto: '0.3em' },
      gridTemplateColumns: { 'main-sidebar': 'minmax(0, 1fr) 340px' },
    },
  },
  plugins: [],
} satisfies Config;
