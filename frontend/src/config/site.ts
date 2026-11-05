/**
 * Single source of truth for brand identity. Change the name, domain or
 * tagline here and nowhere else.
 */
export const site = {
  name: 'Secure Your Git',
  domain: 'secureyourgit.com',
  url: 'https://secureyourgit.com',
  tagline: 'Find and fix security risks in your GitHub Actions workflows.',
  trademarkNotice:
    'Git is a trademark of Software Freedom Conservancy. GitHub is a trademark of GitHub, Inc. Secure Your Git is not affiliated with or endorsed by either.',
  /** Maximum workflow size accepted by the scanner (bytes). See docs/THREAT_MODEL.md. */
  maxInputBytes: 256 * 1024,
} as const;
