import {performance} from 'node:perf_hooks';
import {createRequire} from 'node:module';
import {webcrypto} from 'node:crypto';
import {mkdir,writeFile} from 'node:fs/promises';
import {prepare} from '../src/encode.js';
import {PROFILES} from '../src/common.js';
if(!globalThis.crypto)globalThis.crypto=webcrypto;
const require=createRequire(import.meta.url),qrcode=require('../vendor/qrcode.cjs'),jsQR=require('../vendor/jsqr.cjs');
const input=Uint8Array.from({length:32768},(_,i)=>(i*79+(i>>>8))&255);
const percentile=(values,p)=>[...values].sort((a,b)=>a-b)[Math.ceil(values.length*p)-1];
const profiles=[];
for(const [name,profile] of Object.entries(PROFILES)){
  const sender=await prepare(input,'benchmark.bin',{block:profile.block,compress:false}),renderMs=[],scanMs=[];let modules;
  for(let i=0;i<12;i++){
    const start=performance.now(),text=sender.frame(i),qr=qrcode(0,'M');qr.addData(text,'Byte');qr.make();
    modules=qr.getModuleCount();const scale=4,size=(modules+8)*scale,data=new Uint8ClampedArray(size*size*4);data.fill(255);
    for(let y=0;y<modules;y++)for(let x=0;x<modules;x++)if(qr.isDark(y,x))for(let dy=0;dy<scale;dy++)for(let dx=0;dx<scale;dx++){
      const at=(((y+4)*scale+dy)*size+(x+4)*scale+dx)*4;data[at]=data[at+1]=data[at+2]=0;
    }
    renderMs.push(performance.now()-start);const before=performance.now();const result=jsQR(data,size,size,{inversionAttempts:'dontInvert'});scanMs.push(performance.now()-before);
    if(result?.data!==text)throw new Error(`QR scan failed for ${name}`);
  }
  profiles.push({name,symbolBytes:profile.block,targetFps:profile.fps,nominalBytesPerSecond:profile.block*profile.fps,qrModules:modules,samples:12,renderMedianMs:+percentile(renderMs,.5).toFixed(2),scanMedianMs:+percentile(scanMs,.5).toFixed(2),scanP95Ms:+percentile(scanMs,.95).toFixed(2)});
}
const result={environment:{node:process.version,platform:process.platform,arch:process.arch},method:'Synthetic RGBA raster at four pixels per QR module; real QR generator and jsQR. CPU timings and nominal payload rates are not measured optical throughput.',profiles};
await mkdir('test-results',{recursive:true});await writeFile('test-results/benchmark.json',JSON.stringify(result,null,2)+'\n');
console.table(profiles);console.log(result.method);
