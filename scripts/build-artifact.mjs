// Package the lesson player as a self-contained page for sharing as an
// Artifact: page content without the document skeleton, a stylesheet with
// the fonts embedded as data: URIs, and the ES modules it imports.
//
//   node scripts/build-artifact.mjs <outDir>

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';

const root = resolve(new URL('..', import.meta.url).pathname);
const out = resolve(process.argv[2] ?? join(root, 'dist/artifact'));

// Follow relative imports from the entry module.
const modules = new Set();
async function collect(path) {
  if (modules.has(path)) return;
  modules.add(path);
  const src = await readFile(join(root, path), 'utf8');
  for (const m of src.matchAll(/from\s+'(\.[^']+)'/g)) {
    await collect(join(dirname(path), m[1]).replace(/\\/g, '/'));
  }
}
await collect('src/lesson/main.js');

for (const path of modules) {
  await mkdir(join(out, dirname(path)), { recursive: true });
  await writeFile(join(out, path), await readFile(join(root, path)));
}

// Stylesheet with fonts inlined.
let css = await readFile(join(root, 'styles/lesson.css'), 'utf8');
for (const m of [...css.matchAll(/url\("\.\.\/(assets\/fonts\/[^"]+\.woff2)"\)/g)]) {
  const b64 = (await readFile(join(root, m[1]))).toString('base64');
  css = css.replace(m[0], `url("data:font/woff2;base64,${b64}")`);
}
await mkdir(join(out, 'styles'), { recursive: true });
await writeFile(join(out, 'styles/lesson.css'), css);

// Page: the body of index.html, plus a title and the stylesheet link.
const html = await readFile(join(root, 'index.html'), 'utf8');
const body = html.slice(html.indexOf('<body>') + 6, html.indexOf('</body>')).trim();
const page = `<title>Scratch Physics</title>\n<link rel="stylesheet" href="styles/lesson.css">\n${body}\n`;
await writeFile(join(out, 'index.html'), page);

const files = ['styles/lesson.css', ...modules];
await writeFile(join(out, 'files.json'), JSON.stringify(files, null, 2));
console.log(`Wrote ${files.length + 1} files to ${out}`);
