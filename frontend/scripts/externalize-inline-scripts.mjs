/**
 * Post-build: move every inline <script> in dist/**.html into an external,
 * content-hashed file so the site can ship `script-src 'self'` with no
 * 'unsafe-inline' and no per-build CSP hashes. Fails if any inline script remains.
 */
import { createHash } from 'node:crypto';
import { readdir, readFile, writeFile, mkdir } from 'node:fs/promises';
import { join, relative } from 'node:path';

const DIST = new URL('../dist/', import.meta.url).pathname;
const OUT_DIR = join(DIST, 'assets', 'inline');
const INLINE_SCRIPT = /<script(?![^>]*\bsrc=)([^>]*)>([\s\S]*?)<\/script>/g;

async function* htmlFiles(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) yield* htmlFiles(path);
    else if (entry.name.endsWith('.html')) yield path;
  }
}

await mkdir(OUT_DIR, { recursive: true });
let moved = 0;
for await (const file of htmlFiles(DIST)) {
  const html = await readFile(file, 'utf8');
  const replacements = [];
  for (const match of html.matchAll(INLINE_SCRIPT)) {
    const [whole, attrs, body] = match;
    // JSON-LD and other data blocks are not executed and are allowed by CSP.
    if (/type=["']application\/(ld\+)?json["']/.test(attrs)) continue;
    const hash = createHash('sha256').update(body).digest('hex').slice(0, 16);
    const name = `${hash}.js`;
    await writeFile(join(OUT_DIR, name), body);
    replacements.push([whole, `<script${attrs} src="/assets/inline/${name}"></script>`]);
  }
  let out = html;
  for (const [from, to] of replacements) out = out.replace(from, to);
  const leftover = [...out.matchAll(INLINE_SCRIPT)].filter(([, attrs]) => !/application\/(ld\+)?json/.test(attrs));
  if (leftover.length) throw new Error(`Inline script left in ${relative(DIST, file)}`);
  if (replacements.length) await writeFile(file, out);
  moved += replacements.length;
}
console.log(`[externalize-inline-scripts] moved ${moved} inline script(s) to /assets/inline/`);
