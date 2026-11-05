/**
 * Post-build: write dist/sitemap.xml and dist/robots.txt from the canonical
 * URLs of the pre-rendered pages. Pages marked noindex are excluded, so the
 * sitemap can never drift from what is actually published.
 */
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const DIST = new URL('../dist/', import.meta.url).pathname;

async function* htmlFiles(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) yield* htmlFiles(path);
    else if (entry.name.endsWith('.html')) yield path;
  }
}

const urls = new Set();
for await (const file of htmlFiles(DIST)) {
  const html = await readFile(file, 'utf8');
  if (/<meta[^>]+name="robots"[^>]+content="[^"]*noindex/.test(html)) continue;
  const canonical = html.match(/<link[^>]+rel="canonical"[^>]+href="([^"]+)"/)?.[1];
  if (canonical) urls.add(canonical);
}
if (urls.size === 0) throw new Error('No canonical URLs found; refusing to write an empty sitemap.');

const sorted = [...urls].sort();
const origin = new URL(sorted[0]).origin;
const escape = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sorted.map((u) => `  <url><loc>${escape(u)}</loc></url>`).join('\n')}
</urlset>
`;
await writeFile(join(DIST, 'sitemap.xml'), sitemap);
await writeFile(join(DIST, 'robots.txt'), `User-agent: *\nAllow: /\n\nSitemap: ${origin}/sitemap.xml\n`);
console.log(`[generate-seo-files] sitemap.xml with ${sorted.length} URLs, robots.txt`);
