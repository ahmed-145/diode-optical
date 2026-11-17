import {readFile, mkdir, writeFile, rm} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const root = new URL('../', import.meta.url);
const read = p => readFile(new URL(p, root), 'utf8');
const strip = s => s.replace(/^import .*?;\s*$/gm, '').replace(/^export /gm, '');
const hash = s => createHash('sha256').update(s).digest('base64');
await rm(new URL('dist/', root), {recursive: true, force: true}); await mkdir(new URL('dist/', root));
const wasm64 = async p => (await readFile(new URL(p,root))).toString('base64');
const fastManifest=JSON.parse(await read('vendor/fast-qr-manifest.json'));
const zxingManifest=JSON.parse(await read('vendor/zxing-manifest.json'));
for(const [path,expected] of [['vendor/fast-qr.wasm',fastManifest.wasmSha256],['vendor/fast-qr.mjs',fastManifest.jsSha256],['vendor/zxing-reader.wasm',zxingManifest.wasmSha256]]){
  const actual=createHash('sha256').update(await readFile(new URL(path,root))).digest('hex');
  if(actual!==expected)throw new Error('Pinned optical dependency hash mismatch: '+path);
}
if(!(await read('vendor/zxing-reader.js')).includes(zxingManifest.wasmSha256))throw new Error('ZXing JS/WASM version mismatch');
const style = await read('src/style.css'), common = strip(await read('src/common.js'));
const inventory = {};
for (const mode of ['sender', 'receiver']) {
  const files = mode === 'sender' ? ['src/common.js','src/encode.js','src/qr.js','src/sender.js','vendor/qrcode.cjs','vendor/fast-qr.mjs','vendor/fast-qr.wasm'] : ['src/common.js','src/read.js','src/decode.js','src/capture.js','src/scanner.js','src/scan-worker.js','src/receiver.js','vendor/zxing-reader.js','vendor/zxing-reader.wasm'];
  let scripts;
  if(mode==='sender'){
    let glue=await read('vendor/fast-qr.mjs');
    glue=glue.slice(0,glue.indexOf('async function __wbg_init('));
    const start=glue.indexOf('async function __wbg_load('),end=glue.indexOf('function initSync(',start);
    glue=glue.slice(0,start)+glue.slice(end);
    glue=glue.replace('export class QrRenderer','class QrRenderer');
    const qr=strip(await read('src/qr.js'));
    const engine=`const DiodeWasmQr = (() => {${glue}\n${qr}\nlet engine;return {render(frame){engine ||= createWasmQr(Uint8Array.from(atob('${await wasm64('vendor/fast-qr.wasm')}'),c=>c.charCodeAt(0)));return engine.render(frame);}};})();`;
    const app=[common,strip(await read('src/encode.js')),strip(await read('src/sender.js'))].join('\n');
    scripts=[await read('vendor/qrcode.cjs'),engine,`(() => {\n'use strict';\n${app}\n})();`];
  }else{
    const library=await read('vendor/zxing-reader.js');
    const worker=library+'\n'+await read('src/scan-worker.js');
    const config=`const DiodeScannerConfig={bytes:Uint8Array.from(atob('${await wasm64('vendor/zxing-reader.wasm')}'),c=>c.charCodeAt(0)),workerSource:${JSON.stringify(worker)}};`;
    const app=[common,strip(await read('src/read.js')),strip(await read('src/decode.js')),strip(await read('src/capture.js')),strip(await read('src/scanner.js')),strip(await read('src/receiver.js'))].join('\n');
    scripts=[library,config,`(() => {\n'use strict';\n${app}\n})();`];
  }
  scripts=scripts.map(source=>source.replace(/<\/script/gi,'<\\/script'));
  const csp = `default-src 'none'; script-src 'wasm-unsafe-eval' ${scripts.map(s => `'sha256-${hash(s)}'`).join(' ')}; worker-src ${mode==='sender'?"'none'":'blob:'}; style-src 'unsafe-inline'; img-src data: blob:; media-src blob:; connect-src 'none'; base-uri 'none'; form-action 'none'; object-src 'none'`;
  let html = await read(`src/${mode}.html`);
  html = html.replace('<!--CSP-->', `<meta http-equiv="Content-Security-Policy" content="${csp}">`).replace('<!--STYLE-->', () => `<style>${style}</style>`).replace('<!--SCRIPTS-->', () => scripts.map(s => `<script>${s}</script>`).join('\n'));
  const license = mode==='sender' ? await read('vendor/qrcode.LICENSE')+'\n'+await read('vendor/fast-qr.LICENSE')+'\n'+await read('vendor/fast-qr-upstream.LICENSE') : await read('vendor/zxing.LICENSE')+'\n'+await read('vendor/zxing-cpp.LICENSE');
  html = html.replace('</body>', () => `<pre hidden id="third-party-license">${license.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')}</pre></body>`);
  await writeFile(new URL(`dist/${mode}.html`, root), html);
  inventory[mode] = files;
  if (mode === 'sender') await writeFile(new URL('dist/index.html', root), html);
}
await writeFile(new URL('dist/_headers', root), `/sender.html\n  Permissions-Policy: camera=(), microphone=()\n/index.html\n  Permissions-Policy: camera=(), microphone=()\n/*\n  X-Content-Type-Options: nosniff\n  Referrer-Policy: no-referrer\n`);
await writeFile(new URL('dist/build-inventory.json', root), JSON.stringify(inventory, null, 2) + '\n');
await writeFile(new URL('dist/LICENSE', root), await read('LICENSE'));
await writeFile(new URL('dist/THIRD_PARTY_LICENSES.txt', root), await read('vendor/qrcode.LICENSE')+'\n'+await read('vendor/fast-qr.LICENSE')+'\n'+await read('vendor/fast-qr-upstream.LICENSE')+'\n'+await read('vendor/zxing.LICENSE')+'\n'+await read('vendor/zxing-cpp.LICENSE'));
const sums = [];
for (const name of ['sender.html','receiver.html','index.html','_headers','build-inventory.json','LICENSE','THIRD_PARTY_LICENSES.txt']) {
  const bytes = await readFile(new URL(`dist/${name}`, root)); sums.push(`${createHash('sha256').update(bytes).digest('hex')}  ${name}`);
}
await writeFile(new URL('dist/SHA256SUMS', root), sums.join('\n') + '\n');
console.log('Built standalone sender.html and receiver.html (no runtime dependencies).');
