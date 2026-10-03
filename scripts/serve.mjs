import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { dirname, extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.svg': 'image/svg+xml' };
const server = createServer(async (req, res) => {
  try {
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    const path = resolve(root, '.' + (pathname === '/' ? '/index.html' : pathname));
    if (!path.startsWith(root + sep) || pathname.split('/').some(s => s.startsWith('.'))) {
      res.writeHead(403).end(); return;
    }
    const data = await readFile(path);
    res.writeHead(200, { 'Content-Type': types[extname(path)] || 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' });
    res.end(data);
  } catch { res.writeHead(404).end('Not found'); }
});
server.listen(Number(process.env.PORT || 4173), process.env.HOST || '127.0.0.1', () => {
  console.log(`Engineer RPG: http://${process.env.HOST || '127.0.0.1'}:${server.address().port}`);
});
