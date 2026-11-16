import {readFile, mkdir, writeFile, rm} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const root = new URL('../', import.meta.url);
const read = p => readFile(new URL(p, root), 'utf8');
const strip = s => s.replace(/^import .*?;\s*$/gm, '').replace(/^export /gm, '');
const hash = s => createHash('sha256').update(s).digest('base64');
await rm(new URL('dist/', root), {recursive: true, force: true}); await mkdir(new URL('dist/', root));
const style = await read('src/style.css'), common = strip(await read('src/common.js'));
const inventory = {};
for (const mode of ['sender', 'receiver']) {
  const files = mode === 'sender' ? ['src/common.js','src/encode.js','src/sender.js','vendor/qrcode.cjs'] : ['src/common.js','src/read.js','src/decode.js','src/receiver.js','vendor/jsqr.cjs'];
  const app = [common, mode === 'receiver' ? strip(await read('src/read.js')) : '', strip(await read(mode === 'sender' ? 'src/encode.js' : 'src/decode.js')), strip(await read(`src/${mode}.js`))].join('\n');
  const lib = await read(files.at(-1));
  const scripts = [lib, `(() => {\n'use strict';\n${app}\n})();`].map(s => s.replace(/<\/script/gi, '<\\/script'));
  const csp = `default-src 'none'; script-src ${scripts.map(s => `'sha256-${hash(s)}'`).join(' ')}; style-src 'unsafe-inline'; img-src data: blob:; media-src blob:; connect-src 'none'; base-uri 'none'; form-action 'none'; object-src 'none'`;
  let html = await read(`src/${mode}.html`);
  html = html.replace('<!--CSP-->', `<meta http-equiv="Content-Security-Policy" content="${csp}">`).replace('<!--STYLE-->', () => `<style>${style}</style>`).replace('<!--SCRIPTS-->', () => scripts.map(s => `<script>${s}</script>`).join('\n'));
  const license = await read(mode === 'sender' ? 'vendor/qrcode.LICENSE' : 'vendor/jsqr.LICENSE');
  html = html.replace('</body>', () => `<pre hidden id="third-party-license">${license.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')}</pre></body>`);
  await writeFile(new URL(`dist/${mode}.html`, root), html);
  inventory[mode] = files;
  if (mode === 'sender') await writeFile(new URL('dist/index.html', root), html);
}
await writeFile(new URL('dist/_headers', root), `/sender.html\n  Permissions-Policy: camera=(), microphone=()\n/index.html\n  Permissions-Policy: camera=(), microphone=()\n/*\n  X-Content-Type-Options: nosniff\n  Referrer-Policy: no-referrer\n`);
await writeFile(new URL('dist/build-inventory.json', root), JSON.stringify(inventory, null, 2) + '\n');
await writeFile(new URL('dist/LICENSE', root), await read('LICENSE'));
await writeFile(new URL('dist/THIRD_PARTY_LICENSES.txt', root), 'QR generator (MIT)\n\n' + await read('vendor/qrcode.LICENSE') + '\n\njsQR (Apache-2.0)\n\n' + await read('vendor/jsqr.LICENSE'));
const sums = [];
for (const name of ['sender.html','receiver.html','index.html','_headers','build-inventory.json','LICENSE','THIRD_PARTY_LICENSES.txt']) {
  const bytes = await readFile(new URL(`dist/${name}`, root)); sums.push(`${createHash('sha256').update(bytes).digest('hex')}  ${name}`);
}
await writeFile(new URL('dist/SHA256SUMS', root), sums.join('\n') + '\n');
console.log('Built standalone sender.html and receiver.html (no runtime dependencies).');
