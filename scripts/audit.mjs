import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import vm from 'node:vm';
const inventory = JSON.parse(await readFile('dist/build-inventory.json', 'utf8'));
assert.deepEqual(inventory.sender, ['src/common.js','src/encode.js','src/qr.js','src/sender.js','vendor/qrcode.cjs','vendor/fast-qr.mjs','vendor/fast-qr.wasm']);
const sender = await readFile('dist/sender.html','utf8');
for (const forbidden of ['parseFrame','unpack(','unb64','sourceCount','getUserMedia','mediaDevices','jsQR','FountainDecoder','openObject','DecompressionStream','fetch(','XMLHttpRequest','WebSocket(','serviceWorker']) assert(!sender.includes(forbidden), `Sender contains ${forbidden}`);
for (const mode of ['sender','receiver']) {
  const html = await readFile(`dist/${mode}.html`, 'utf8');
  assert(!/<(?:script|link|img)[^>]+(?:src|href)=["']https?:/i.test(html));
  for (const script of html.matchAll(/<script>([\s\S]*?)<\/script>/g)) new vm.Script(script[1]);
  assert(html.includes("connect-src 'none'"));
}
console.log('Audit passed: sender dependency allowlist, forbidden APIs, offline scripts and syntax.');
