import {test} from 'node:test';
import assert from 'node:assert/strict';
import {webcrypto} from 'node:crypto';
import {createRequire} from 'node:module';
import {prepare} from '../src/encode.js';
import {FountainDecoder, openObject} from '../src/decode.js';
import {MAX_FILE, MAX_OBJECT, b64, crc32, digest, hex, pack, parseFrame, unb64} from '../src/common.js';
if (!globalThis.crypto) globalThis.crypto = webcrypto;
const require = createRequire(import.meta.url), qrcode = require('../vendor/qrcode.cjs'), jsQR = require('../vendor/jsqr.cjs');
function random(n) { const bytes = new Uint8Array(n); for (let offset = 0; offset < n; offset += 65536) crypto.getRandomValues(bytes.subarray(offset, offset + 65536)); return bytes; }
async function roundtrip(bytes, name, options = {}) {
  const sender = await prepare(bytes, name, options), receiver = new FountainDecoder();
  for (let i = 0; i < sender.blocks * 4 && receiver.progress < 1; i++) receiver.accept(sender.frame(i));
  assert.equal(receiver.progress, 1); return openObject(await receiver.recover(), options.passphrase);
}
test('empty, arbitrary binary and Unicode names round trip', async () => {
  for (const size of [0,1,255,256,257,8192,10000]) {
    const bytes = random(size), out = await roundtrip(bytes, 'ملاحظات 🔒.bin');
    assert.deepEqual(out.bytes, bytes); assert.equal(out.name, 'ملاحظات 🔒.bin');
  }
});
test('late join, 45% losses, shuffled order and duplicates recover using repair equations', async () => {
  const bytes = random(500000), sender = await prepare(bytes, 'document.bin', {compress:false}), receiver = new FountainDecoder();
  let state = 1234; const rand = () => { state = (Math.imul(state,1664525)+1013904223) >>> 0; return state / 2 ** 32; };
  let index = sender.generations * 100; // skip all systematic frames
  while (receiver.progress < 1 && index < sender.generations * 450) {
    const frames = []; for (let j=0;j<250;j++,index++) if (rand() > .45) frames.push(sender.frame(index));
    for (let j=frames.length-1;j>0;j--) { const k=Math.floor(rand()*(j+1)); [frames[j],frames[k]]=[frames[k],frames[j]]; }
    for (const frame of frames) { receiver.accept(frame); receiver.accept(frame); }
  }
  assert.equal(receiver.progress,1); assert.deepEqual((await openObject(await receiver.recover())).bytes,bytes);
});
test('one sender supports independent receivers', async () => {
  const bytes = random(20000), sender = await prepare(bytes,'broadcast'), receivers = [new FountainDecoder(),new FountainDecoder()];
  for (let i=0;i<sender.blocks*8;i++) { const frame=sender.frame(i); if(i%3!==0) receivers[0].accept(frame); if(i%4!==0) receivers[1].accept(frame); }
  for (const r of receivers) assert.deepEqual((await openObject(await r.recover())).bytes,bytes);
});
test('gzip is selected only when smaller and restores original bytes', async () => {
  const bytes = new TextEncoder().encode('hello Diode '.repeat(10000)), sender = await prepare(bytes,'compress.txt');
  assert(sender.object.length < bytes.length / 5); assert.deepEqual((await roundtrip(bytes,'compress.txt')).bytes,bytes);
});
test('AES-GCM unlock, wrong passphrase, tampering and short passphrase', async () => {
  const sender = await prepare(random(2000),'secret',{passphrase:'a sufficiently long passphrase'});
  const out = await openObject(sender.object,'a sufficiently long passphrase'); assert.equal(out.name,'secret');
  await assert.rejects(openObject(sender.object,'incorrect password'), /Wrong passphrase/);
  const altered=sender.object.slice(); altered[altered.length-1]^=1;
  await assert.rejects(openObject(altered,'a sufficiently long passphrase'), /Wrong passphrase/);
  await assert.rejects(prepare(new Uint8Array(),'x',{passphrase:'short'}), /8–1024/);
});
test('CRC rejects corrupted frames; format, bounds and mixed transfers rejected', async () => {
  const a=await prepare(random(1000),'a'), b=await prepare(random(1000),'b');
  const bad=unb64(a.frame(0).slice(5)); bad[40]^=1;
  assert.throws(()=>parseFrame('DIO1:'+b64(bad)),/Corrupt/);
  assert.throws(()=>parseFrame('garbage'),/Not a Diode/);
  const decoder=new FountainDecoder(); decoder.accept(a.frame(0)); assert.throws(()=>decoder.accept(b.frame(0)),/Different transfer/);
  new DataView(bad.buffer).setUint32(16,MAX_OBJECT+1); new DataView(bad.buffer).setUint32(290,crc32(bad.subarray(0,290)));
  assert.throws(()=>parseFrame('DIO1:'+b64(bad)),/size limit/);
  await assert.rejects(prepare(new Uint8Array(MAX_FILE+1),'too large'),/5 MB/);
  await assert.rejects(new FountainDecoder().recover(),/Need more/);
});
test('object digest, safe filename, declared size and expansion bounds', async () => {
  const bytes=new TextEncoder().encode('bounded payload');
  const sender=await prepare(bytes,'../../unsafe<script>.txt',{compress:false});
  const out=await openObject(sender.object); assert(!/[<>/\\]/.test(out.name));
  const altered=sender.object.slice(); altered[altered.length-1]^=1;
  await assert.rejects(openObject(altered),/SHA-256/);
  const meta={v:1,name:'x',size:1,sha256:hex(await digest(bytes)),compression:'none'};
  await assert.rejects(openObject(pack(meta,bytes)),/length mismatch/);
  meta.compression='gzip';
  const gz=new Uint8Array(await new Response(new Blob([new Uint8Array(100000)]).stream().pipeThrough(new CompressionStream('gzip'))).arrayBuffer());
  await assert.rejects(openObject(pack(meta,gz)),/exceeds declared/);
});
function raster(text, scale=5) {
  const code=qrcode(0,'M');code.addData(text,'Byte');code.make();const n=code.getModuleCount(),size=(n+8)*scale;
  const data=new Uint8ClampedArray(size*size*4); data.fill(255);
  for(let y=0;y<n;y++)for(let x=0;x<n;x++)if(code.isDark(y,x))for(let dy=0;dy<scale;dy++)for(let dx=0;dx<scale;dx++){
    const p=(((y+4)*scale+dy)*size+(x+4)*scale+dx)*4; data[p]=data[p+1]=data[p+2]=0;
  }return {data,size};
}
test('real QR renderer → pixels → real jsQR scanner → file recovery', async () => {
  const bytes=random(1800),sender=await prepare(bytes,'optical.bin',{compress:false}),receiver=new FountainDecoder();
  for(let i=0;i<sender.blocks;i++){
    const text=sender.frame(i),{data,size}=raster(text);
    // Modest deterministic pixel noise exercises the scanner, not a mocked decode.
    for(let p=0;p<data.length;p+=4){const delta=((p/4*17)%15)-7;for(let c=0;c<3;c++)data[p+c]=Math.max(0,Math.min(255,data[p+c]+delta));}
    const scanned=jsQR(data,size,size,{inversionAttempts:'dontInvert'});assert(scanned);assert.equal(scanned.data,text);receiver.accept(scanned.data);
  }
  assert.deepEqual((await openObject(await receiver.recover())).bytes,bytes);
});
test('5 MB binary transfer meets declared size limit', async () => {
  const bytes=random(MAX_FILE),out=await roundtrip(bytes,'maximum.bin',{compress:false});assert.deepEqual(out.bytes,bytes);
});
