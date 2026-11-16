import {test} from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
import {webcrypto} from 'node:crypto';
import {File} from 'node:buffer';
function element() {
  const el={textContent:'',value:'',disabled:false,hidden:false,dataset:{},files:[],listeners:{},width:0,height:0,
    addEventListener(type,fn){this.listeners[type]=fn;},replaceChildren(){},click(){return this.onclick?.();},pause(){},play:async()=>{},getContext(){return this.context;}};
  el.context={fillStyle:'#fff',fillRect(x,y,w,h){
    if(!el.pixels||el.pixels.length!==el.width*el.height*4)el.pixels=new Uint8ClampedArray(el.width*el.height*4);
    const c=this.fillStyle==='#fff'?255:0;
    for(let py=y;py<y+h;py++)for(let px=x;px<x+w;px++){const p=(py*el.width+px)*4;el.pixels[p]=el.pixels[p+1]=el.pixels[p+2]=c;el.pixels[p+3]=255;}
  },drawImage(source){el.pixels=source.pixels.slice();},getImageData(){return {data:el.pixels,width:el.width,height:el.height};}};
  return el;
}
async function app(mode) {
  const html=await readFile(`dist/${mode}.html`,'utf8'),nodes={},scheduled=[];
  for(const tag of html.matchAll(/<[^>]+\bid="([^"]+)"[^>]*>/g)) {nodes[tag[1]]=element();nodes[tag[1]].hidden=/\bhidden\b/.test(tag[0]);nodes[tag[1]].disabled=/\bdisabled\b/.test(tag[0]);}
  nodes.speed&&(nodes.speed.value='8');nodes.profile&&(nodes.profile.value='balanced');nodes.compress&&(nodes.compress.checked=true);
  const document={getElementById:id=>nodes[id],createElement:()=>element(),addEventListener(){},hidden:false};
  const context=vm.createContext({console,crypto:webcrypto,Uint8Array,Uint32Array,Uint8ClampedArray,DataView,TextEncoder,TextDecoder,Blob,Response,CompressionStream,DecompressionStream,File,URL,btoa,atob,document,
    navigator:{},Option:class{},matchMedia:()=>({matches:false}),setTimeout(fn){scheduled.push(fn);return scheduled.length;},clearTimeout(){},createImageBitmap:async file=>({...file.bitmap,close(){}})});
  context.window=context;context.self=context;context.addEventListener=()=>{};
  for(const script of html.matchAll(/<script>([\s\S]*?)<\/script>/g))vm.runInContext(script[1],context);
  return {nodes,scheduled,context};
}
test('standalone UI scripts: sample → encrypted QR pixels → import → unlock → verified save/reset',async()=>{
  const sender=await app('sender'),receiver=await app('receiver'),s=sender.nodes,r=receiver.nodes;
  assert(s.prepare.disabled);s.demo.onclick();assert(!s.prepare.disabled);s.passphrase.value='UI test long passphrase';await s.prepare.onclick();
  assert.equal(s.mode.textContent,'READY');assert(!s.qr.hidden);s.play.onclick();
  for(let i=0;i<12 && r.unlock.hidden && r.result.hidden;i++){
    const qr=s.qr;r.image.files=[{size:qr.pixels.length,bitmap:{width:qr.width,height:qr.height,pixels:qr.pixels}}];
    await r.image.onchange();if(sender.scheduled.length)sender.scheduled.shift()();
  }
  assert(!r.unlock.hidden, r.status.textContent);assert(r.result.hidden);r.passphrase.value='wrong password';await r.unlock.onclick();assert.match(r.status.textContent,/Wrong passphrase/);
  r.passphrase.value='UI test long passphrase';await r.unlock.onclick();assert(!r.result.hidden,r.status.textContent);assert.match(r['received-name'].textContent,/hello-from-diode.txt/);assert.match(r.hash.textContent,/SHA-256 [a-f0-9]{64}/);
  r.save.onclick();r.reset.onclick();assert.equal(r.recovered.textContent,'0%');assert(r.result.hidden);
  await r.start.onclick();assert.match(r.status.textContent,/requires HTTPS/);
});
