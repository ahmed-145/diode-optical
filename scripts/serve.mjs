import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve, extname} from 'node:path';
import {existsSync} from 'node:fs';
const dir = resolve('dist');
if (!existsSync(dir)) await import('./build.mjs');
const port = Number(process.env.PORT || 4173);
const server = createServer(async (req, res) => {
  try {
    const path = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    const file = resolve(dir, '.' + (path === '/' ? '/index.html' : path));
    if (!file.startsWith(dir + '/')) { res.writeHead(403).end(); return; }
    const data = await readFile(file);
    res.setHeader('Content-Type', ({'.html':'text/html; charset=utf-8','.json':'application/json','.txt':'text/plain'})[extname(file)] || 'application/octet-stream');
    res.setHeader('X-Content-Type-Options', 'nosniff'); res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Permissions-Policy', path.includes('receiver') ? 'microphone=()' : 'camera=(), microphone=()');
    res.end(data);
  } catch { res.writeHead(404).end('Not found'); }
});
server.listen(port, '127.0.0.1', () => console.log(`Diode: http://127.0.0.1:${port}`));
