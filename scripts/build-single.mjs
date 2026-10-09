// Package the lesson player as ONE self-contained HTML file (styles, fonts and
// every module inlined) that opens by double-click, offline, on any device.
//
//   node scripts/build-single.mjs <out.html>
//
// Modules are wrapped in function scopes and linked through a small registry,
// so names never collide between files.

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';

const root = resolve(new URL('..', import.meta.url).pathname);
const out = resolve(process.argv[2] ?? join(root, 'dist/scratch-physics.html'));

const order = [];
const seen = new Set();
async function collect(path) {
  if (seen.has(path)) return;
  seen.add(path);
  const src = await readFile(join(root, path), 'utf8');
  for (const m of src.matchAll(/from\s+'(\.[^']+)'/g)) await collect(join(dirname(path), m[1]).replace(/\\/g, '/'));
  order.push({ path, src });
}
await collect('src/lesson/main.js');

function transform({ path, src }) {
  const names = [];
  let code = src.replace(/import\s+([\s\S]*?)\s+from\s+'(\.[^']+)';/g, (_, what, rel) => {
    const dep = join(dirname(path), rel).replace(/\\/g, '/');
    const star = /^\*\s+as\s+(\w+)$/.exec(what.trim());
    if (star) return `const ${star[1]} = __m[${JSON.stringify(dep)}];`;
    const inner = what.trim().replace(/^\{|\}$/g, '').split(',').map((s) => s.trim()).filter(Boolean)
      .map((s) => s.replace(/^(\w+)\s+as\s+(\w+)$/, '$1: $2')).join(', ');
    return `const { ${inner} } = __m[${JSON.stringify(dep)}];`;
  });
  code = code.replace(/^export\s+(const|let)\s+\{([^}]*)\}/gm, (_, kind, list) => {
    names.push(...list.split(',').map((x) => x.trim().split(':').pop().trim()).filter(Boolean));
    return `${kind} {${list}}`;
  });
  code = code.replace(/^export\s+(async\s+function|function|const|let|class)\s+(\w+)/gm, (_, kind, name) => {
    names.push(name);
    return `${kind} ${name}`;
  });
  code = code.replace(/^export\s+\{([^}]*)\};?/gm, (_, list) => {
    names.push(...list.split(',').map((s) => s.trim()).filter(Boolean));
    return '';
  });
  if (/^\s*(import|export)\s/m.test(code)) throw new Error(`untransformed import/export in ${path}`);
  return `__m[${JSON.stringify(path)}] = (() => {\n${code}\nreturn { ${names.join(', ')} };\n})();`;
}

let css = await readFile(join(root, 'styles/lesson.css'), 'utf8');
for (const m of [...css.matchAll(/url\("\.\.\/(assets\/fonts\/[^"]+\.woff2)"\)/g)]) {
  const b64 = (await readFile(join(root, m[1]))).toString('base64');
  css = css.replace(m[0], `url("data:font/woff2;base64,${b64}")`);
}

const html = await readFile(join(root, 'index.html'), 'utf8');
const head = html.slice(0, html.indexOf('</head>'))
  .replace(/<link rel="preload"[^>]*>\n?/g, '')
  .replace(/<link rel="stylesheet"[^>]*>/, () => `<style>\n${css}\n</style>`);
const body = html.slice(html.indexOf('<body>'), html.indexOf('</body>'))
  .replace(/<script type="module" src="[^"]+"><\/script>/, '');
const js = `const __m = {};\n${order.map(transform).join('\n')}`;
const page = `${head}</head>\n${body}<script type="module">\n${js.replace(/<\/script/g, '<\\/script')}\n</script>\n</body>\n</html>\n`;
await mkdir(dirname(out), { recursive: true });
await writeFile(out, page);
console.log(`Wrote ${out} (${(page.length / 1024).toFixed(0)} KB, ${order.length} modules)`);
