import {QrRenderer, initSync} from '../vendor/fast-qr.mjs';
export function qrSpec(frame) {
  if (typeof frame !== 'string') return frame.length <= 1066 ? {version:23,ecc:0} : {version:34,ecc:0};
  return frame.length <= 397 ? {version:15,ecc:1} : frame.length <= 741 ? {version:22,ecc:1} : {version:31,ecc:1};
}
export function createWasmQr(bytes) {
  const output=initSync({module:bytes}),renderer=new QrRenderer();
  return {render(frame,scale=4) {
    const data=typeof frame==='string'?new TextEncoder().encode(frame):frame;
    const {version,ecc}=qrSpec(frame),side=renderer.render_rgba(data,version,ecc,scale);
    return {data:new Uint8ClampedArray(output.memory.buffer,renderer.rgba_ptr(),side*side*4),width:side,height:side};
  },memoryBytes:()=>output.memory.buffer.byteLength,close:()=>renderer.free()};
}
