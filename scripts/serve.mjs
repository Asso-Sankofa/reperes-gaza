// Serveur local de prévisualisation pour dist/. Avec --watch, reconstruit à chaque modification.
// Usage : node scripts/serve.mjs [--watch] [--port 8080] [--host 127.0.0.1]
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { watch } from 'node:fs';
import { dirname, extname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from './build.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DIST = join(ROOT, 'dist');
const arg = (name, fallback) => { const i = process.argv.indexOf(name); return i > -1 ? process.argv[i + 1] : fallback; };
const PORT = Number(arg('--port', process.env.PORT || 8080));
const HOST = arg('--host', process.env.HOST || '127.0.0.1');
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.csv': 'text/csv; charset=utf-8', '.md': 'text/markdown; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2', '.txt': 'text/plain; charset=utf-8',
};

async function rebuild() {
  try { await build({ quiet: true }); console.log(`[${new Date().toLocaleTimeString('fr-FR')}] dist/ reconstruit`); }
  catch (e) { console.error(`[build] ${e.message}`); }
}

if (process.argv.includes('--watch')) {
  await rebuild();
  let timer;
  for (const dir of ['src', 'content']) {
    watch(join(ROOT, dir), { recursive: true }, () => { clearTimeout(timer); timer = setTimeout(rebuild, 120); });
  }
}

createServer(async (req, res) => {
  const path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  // Empêche toute sortie de dist/ (../).
  const file = normalize(join(DIST, path.endsWith('/') ? path + 'index.html' : path));
  if (file !== DIST && !file.startsWith(DIST + sep)) { res.writeHead(403).end(); return; }
  try {
    if (!(await stat(file)).isFile()) throw new Error('not a file');
    res.writeHead(200, { 'Content-Type': TYPES[extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    res.end(await readFile(file));
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }).end('Introuvable');
  }
}).listen(PORT, HOST, () => console.log(`Prévisualisation : http://${HOST === '0.0.0.0' ? 'localhost' : HOST}:${PORT}/`));
