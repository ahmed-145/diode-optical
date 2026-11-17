import {performance} from 'node:perf_hooks';
import {createRequire} from 'node:module';
import {webcrypto} from 'node:crypto';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {prepare} from '../src/encode.js';
import {PROFILES} from '../src/common.js';
import {createWasmQr} from '../src/qr.js';
import {createScanner} from '../src/scanner.js';
if(!globalThis.crypto)globalThis.crypto=webcrypto;
const require=createRequire(import.meta.url),qrcode=require('../vendor/qrcode.cjs'),jsQR=require('../vendor/jsqr.cjs');
const context=vm.createContext({console,Uint8Array,Uint8ClampedArray,ArrayBuffer,DataView,WebAssembly,TextDecoder,TextEncoder,URL,Blob,Response,performance,setTimeout,clearTimeout});
vm.runInContext(await readFile('vendor/zxing-reader.js','utf8'),context);globalThis.ZXingWASM=context.ZXingWASM;
const wasm=createWasmQr(await readFile('vendor/fast-qr.wasm')),reader=createScanner({bytes:new Uint8Array(await readFile('vendor/zxing-reader.wasm'))});
const input=Uint8Array.from({length:32768},(_,i)=>(i*79+(i>>>8))&255);
const percentile=(values,p)=>[...values].sort((a,b)=>a-b)[Math.ceil(values.length*p)-1];
function jsRaster(frame){
  const binary=typeof frame!=='string',code=qrcode(0,binary?'L':'M');code.addData(binary?Array.from(frame,v=>String.fromCharCode(v)).join(''):frame,'Byte');code.make();
  const n=code.getModuleCount(),scale=4,size=(n+8)*scale,data=new Uint8ClampedArray(size*size*4);data.fill(255);
  for(let y=0;y<n;y++)for(let x=0;x<n;x++)if(code.isDark(y,x))for(let dy=0;dy<scale;dy++)for(let dx=0;dx<scale;dx++){const at=(((y+4)*scale+dy)*size+(x+4)*scale+dx)*4;data[at]=data[at+1]=data[at+2]=0;}
  return {data,width:size,height:size};
}
const profiles=[];
for(const [name,profile] of Object.entries(PROFILES)){
  const sender=await prepare(input,'benchmark.bin',{block:profile.block,binary:!!profile.binary,compress:false}),jsRender=[],fastRender=[],jsScan=[],wasmScan=[];
  let modules,jsDecoded=0;
  for(let i=0;i<15;i++){
    const frame=sender.frame(i),expected=typeof frame==='string'?new TextEncoder().encode(frame):frame;
    let before=performance.now();jsRaster(frame);jsRender.push(performance.now()-before);
    before=performance.now();const image=wasm.render(frame,4);fastRender.push(performance.now()-before);modules=image.width/4-8;
    before=performance.now();const old=jsQR(image.data,image.width,image.height,{inversionAttempts:'dontInvert'});jsScan.push(performance.now()-before);
    if(old?.binaryData && Buffer.from(old.binaryData).equals(Buffer.from(expected)))jsDecoded++;
    before=performance.now();const results=await reader.scan(image);wasmScan.push(performance.now()-before);assert.deepEqual(new Uint8Array(results[0].bytes),expected);
  }
  profiles.push({name,symbolBytes:profile.block,targetFps:profile.fps,nominalBytesPerSecond:profile.block*profile.fps,qrModules:modules,samples:15,jsDecoded,wasmDecoded:15,jsRenderMedianMs:+percentile(jsRender,.5).toFixed(2),wasmRenderMedianMs:+percentile(fastRender,.5).toFixed(2),jsScanMedianMs:+percentile(jsScan,.5).toFixed(2),wasmScanMedianMs:+percentile(wasmScan,.5).toFixed(2),wasmScanP95Ms:+percentile(wasmScan,.95).toFixed(2)});
}
const result={environment:{node:process.version,platform:process.platform,arch:process.arch},method:'Matched QR pixels at four pixels/module. Real old JS renderer/jsQR versus fast_qr WASM/ZXing WASM. Synthetic CPU measurements and nominal channel rates, not phone-camera throughput.',profiles};
await mkdir('test-results',{recursive:true});await writeFile('test-results/benchmark.json',JSON.stringify(result,null,2)+'\n');console.table(profiles);console.log(result.method);
