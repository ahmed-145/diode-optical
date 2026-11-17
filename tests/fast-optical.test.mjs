import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {webcrypto} from 'node:crypto';
import vm from 'node:vm';
import {createRequire} from 'node:module';
import {createWasmQr} from '../src/qr.js';
import {createScanner} from '../src/scanner.js';
import {capturePlan} from '../src/capture.js';
import {prepare} from '../src/encode.js';
import {FountainDecoder,openObject} from '../src/decode.js';
import {parseFrame,isDiodePacket} from '../src/read.js';
import {crc32} from '../src/common.js';
if(!globalThis.crypto)globalThis.crypto=webcrypto;
const context=vm.createContext({console,Uint8Array,Uint8ClampedArray,ArrayBuffer,DataView,WebAssembly,TextEncoder,TextDecoder,URL,Blob,Response,performance,setTimeout,clearTimeout});
vm.runInContext(await readFile('vendor/zxing-reader.js','utf8'),context);globalThis.ZXingWASM=context.ZXingWASM;
const renderer=createWasmQr(await readFile('vendor/fast-qr.wasm'));
const scanner=createScanner({bytes:new Uint8Array(await readFile('vendor/zxing-reader.wasm'))});
const bytes=Uint8Array.from({length:32000},(_,i)=>(i*101+(i>>>8))&255);
test('binary optical frames round-trip through real fast_qr WASM and ZXing WASM',async()=>{
  for(const block of [1024,2048]){
    const sender=await prepare(bytes,'binary.bin',{block,binary:true,compress:false}),receiver=new FountainDecoder();
    for(let i=0;i<sender.blocks*4&&receiver.progress<1;i++){
      const packet=sender.frame(i);assert(packet instanceof Uint8Array);assert(isDiodePacket(packet));assert.equal(packet.length,block+42);
      const image=renderer.render(packet,3),results=await scanner.scan(image);
      assert.equal(results.length,1);assert.deepEqual(new Uint8Array(results[0].bytes),packet);receiver.accept(new Uint8Array(results[0].bytes));
    }
    assert.equal(receiver.progress,1);assert.deepEqual((await openObject(await receiver.recover())).bytes,bytes);
  }
});
test('new scanner also decodes all legacy text profiles with the WASM renderer',async()=>{
  for(const block of [256,512,1024]){
    const sender=await prepare(bytes,'legacy',{block,compress:false}),text=sender.frame(0);
    const results=await scanner.scan(renderer.render(text,3));assert.equal(results.length,1);
    assert.equal(new TextDecoder().decode(results[0].bytes),text);assert.equal(parseFrame(new Uint8Array(results[0].bytes)).block,block);
  }
});
test('binary transport rejects corrupted or oversized packets before allocation',async()=>{
  const sender=await prepare(bytes,'bounded',{block:2048,binary:true,compress:false});
  const altered=sender.frame(0).slice();altered[50]^=1;assert.throws(()=>parseFrame(altered),/Corrupt/);
  const header=sender.frame(0).slice();new DataView(header.buffer).setUint32(30,8192);assert.throws(()=>parseFrame(header),/symbol size/);
  assert.throws(()=>parseFrame(new Uint8Array([68,73,79,51])),/length/);
  const invalid=sender.frame(0).slice();new DataView(invalid.buffer).setUint32(20,0xffffffff);new DataView(invalid.buffer).setUint32(2086,crc32(invalid.subarray(4,2086)));assert.throws(()=>parseFrame(invalid),/size limit/);
});
test('fixed camera framing bounds work for portrait, landscape and small images',()=>{
  for(const [width,height] of [[1920,1080],[1080,1920],[640,480],[320,320]]){
    for(const center of [true,false]){const p=capturePlan(width,height,{center,maxSide:720});assert(p.x>=0&&p.y>=0);assert(p.x+p.sourceWidth<=width);assert(p.y+p.sourceHeight<=height);assert(p.width<=720&&p.height<=720);if(center)assert.equal(p.width,p.height);else assert.equal(p.sourceWidth,width);}
  }
  assert.throws(()=>capturePlan(0,1920),/Invalid/);assert.throws(()=>capturePlan(1920,1080,{maxSide:10000}),/Invalid/);
});
test('renderer does not grow its WASM memory across repeated raw frames',()=>{
  const packet=new Uint8Array(1066).fill(83);renderer.render(packet);const before=renderer.memoryBytes();
  for(let i=0;i<300;i++){packet[20]=i&255;renderer.render(packet,2);}assert.equal(renderer.memoryBytes(),before);
});
test('compatibility QR writer preserves raw binary bytes',async()=>{
  const require=createRequire(import.meta.url),qrcode=require('../vendor/qrcode.cjs');
  const packet=(await prepare(bytes,'fallback',{block:1024,binary:true,compress:false})).frame(0);
  const qr=qrcode(0,'L');qr.addData(Array.from(packet,v=>String.fromCharCode(v)).join(''),'Byte');qr.make();
  const n=qr.getModuleCount(),size=(n+8)*3,data=new Uint8ClampedArray(size*size*4);data.fill(255);
  for(let y=0;y<n;y++)for(let x=0;x<n;x++)if(qr.isDark(y,x))for(let dy=0;dy<3;dy++)for(let dx=0;dx<3;dx++){const at=(((y+4)*3+dy)*size+(x+4)*3+dx)*4;data[at]=data[at+1]=data[at+2]=0;}
  const results=await scanner.scan({data,width:size,height:size});assert.deepEqual(new Uint8Array(results[0].bytes),packet);
});

test('two independent binary codes are extracted from one image',async()=>{
  const sender=await prepare(bytes,'dual.bin',{block:1024,binary:true,compress:false});
  const packets=[sender.frame(0),sender.frame(1)],images=packets.map(p=>{const image=renderer.render(p,3);return {...image,data:image.data.slice()};});
  const width=images[0].width*2+24,height=images[0].height,data=new Uint8ClampedArray(width*height*4);data.fill(255);
  for(let lane=0;lane<2;lane++)for(let y=0;y<height;y++)data.set(images[lane].data.subarray(y*images[lane].width*4,(y+1)*images[lane].width*4),(y*width+lane*(images[lane].width+24))*4);
  const results=await scanner.scan({data,width,height},false,2);assert.equal(results.length,2);
  const ids=Array.from(results,r=>parseFrame(new Uint8Array(r.bytes)).seed).sort((a,b)=>a-b);assert.deepEqual(ids,[0,1]);
  const plan=capturePlan(1920,1080,{wide:true,maxSide:1080});assert.equal(plan.width,1080);assert.equal(plan.height,540);assert(plan.sourceWidth<=1920&&plan.sourceHeight<=1080);
});
test('binary repair symbols recover late joins with dropped and duplicate frames',async()=>{
  const source=new Uint8Array(100000);for(let offset=0;offset<source.length;offset+=65536)crypto.getRandomValues(source.subarray(offset,offset+65536));
  const sender=await prepare(source,'random.bin',{block:2048,binary:true,compress:false}),receiver=new FountainDecoder();
  for(let i=sender.generations*80;i<sender.generations*300&&receiver.progress<1;i++){if(i%3===0)continue;const packet=sender.frame(i);receiver.accept(packet);receiver.accept(packet);}
  assert.equal(receiver.progress,1);assert.deepEqual((await openObject(await receiver.recover())).bytes,source);
});
