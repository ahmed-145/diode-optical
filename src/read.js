import {BLOCK, WIDTH, MAX_OBJECT, assert, validBlock, hex, crc32} from './common.js';
const td = new TextDecoder('utf-8', { fatal: true });
export function unb64(s) {
  assert(typeof s === 'string' && s.length <= Math.ceil(MAX_OBJECT / 3) * 4, 'Invalid base64');
  const raw = atob(s); return Uint8Array.from(raw, c => c.charCodeAt(0));
}

export function sourceCount(total, generation, block = BLOCK) {
  return Math.min(WIDTH, Math.ceil(total / block) - generation * WIDTH);
}
export function isDiodePacket(value) {
  if (typeof value === 'string') return /^DIO[12]:/.test(value);
  return value instanceof Uint8Array && value[0]===68 && value[1]===73 && value[2]===79 && (value[3]===51 || ((value[3]===49 || value[3]===50) && value[4]===58));
}
export function parseFrame(input) {
  const binary = input instanceof Uint8Array && input[0]===68 && input[1]===73 && input[2]===79 && input[3]===51;
  let text=input,bytes;
  if (binary) { assert(input.length>=298 && input.length<=2090,'Invalid binary frame length'); bytes=input.subarray(4); }
  else {
    if (input instanceof Uint8Array) { assert(input.length<=1421,'Invalid frame length'); text=td.decode(input); }
    assert(typeof text==='string' && /^DIO[12]:/.test(text) && text.length>=397 && text.length<=1421,'Not a Diode frame (supported versions: 1, 2, 3)');
    bytes=unb64(text.slice(5));
  }
  assert(bytes.length>=294 && bytes.length<=2086,'Invalid frame length');
  const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength),legacy=!binary && text.startsWith('DIO1:');
  const block=legacy?BLOCK:view.getUint32(26);
  assert(validBlock(block) && bytes.length===block+38 && (binary || block<=1024),'Invalid symbol size');
  assert(view.getUint32(block+34)===crc32(bytes.subarray(0,block+34)),'Corrupt frame');
  const total=view.getUint32(16),generation=view.getUint16(20),seed=view.getUint32(22);
  assert(total>0 && total<=MAX_OBJECT,'Object exceeds size limit');
  assert(generation<Math.ceil(total/(block*WIDTH)),'Invalid generation');
  assert(!legacy || view.getUint32(26)===0,'Unsupported frame flags');
  return {session:hex(bytes.subarray(0,16)),id:bytes.slice(0,16),total,generation,seed,block,payload:bytes.slice(30,30+block),objectCrc:view.getUint32(30+block)};
}
export function unpack(bytes) {
  assert(bytes.length >= 4 && bytes.length <= MAX_OBJECT, 'Invalid envelope length');
  const length = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint32(0);
  assert(length > 0 && length <= 8192 && length + 4 <= bytes.length, 'Invalid metadata length');
  const meta = JSON.parse(td.decode(bytes.subarray(4, 4 + length)));
  assert(meta && typeof meta === 'object' && !Array.isArray(meta) && meta.v === 1, 'Unsupported envelope');
  return { meta, payload: bytes.subarray(4 + length) };
}
