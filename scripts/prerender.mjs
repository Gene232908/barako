// Renders the app to static HTML and writes it into dist/index.html after `vite build`, so search
// engines and link previews see the full page (name, roles, about, services, contacts) without
// running any JavaScript. The browser still renders the app from scratch over it with createRoot.
//
// Fails soft: if rendering breaks, the build keeps the plain (empty-root) index.html.
import { readFile, writeFile } from 'node:fs/promises';
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { createServer } from 'vite';

const FILE = 'dist/index.html';
const ROOT = '<div id="root"></div>';

const vite = await createServer({
  server: { middlewareMode: true, hmr: false },
  appType: 'custom',
  logLevel: 'error',
});

try {
  const { App } = await vite.ssrLoadModule('/src/App.tsx');
  const html = renderToString(createElement(App));
  const page = await readFile(FILE, 'utf8');
  if (!page.includes(ROOT)) throw new Error(`${FILE} has no empty ${ROOT}`);
  await writeFile(FILE, page.replace(ROOT, `<div id="root">${html}</div>`));
  console.log(`[prerender] wrote ${(html.length / 1024).toFixed(1)} KB of HTML into ${FILE}`);
} catch (err) {
  console.warn(`[prerender] skipped: ${err instanceof Error ? err.message : err}`);
} finally {
  await vite.close();
}
