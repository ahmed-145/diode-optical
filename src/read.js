import {BLOCK, WIDTH, MAX_OBJECT, assert, validBlock, hex, crc32} from './common.js';
const td = new TextDecoder('utf-8', { fatal: true });
export function unb64(s) {
  assert(typeof s === 'string' && s.length <= Math.ceil(MAX_OBJECT / 3) * 4, 'Invalid base64');
  const raw = atob(s); return Uint8Array.from(raw, c => c.charCodeAt(0));
}

export function sourceCount(total, generation, block = BLOCK) {
  return Math.min(WIDTH, Math.ceil(total / block) - generation * WIDTH);
}
export function parseFrame(text) {
  assert(typeof text === 'string' && /^DIO[12]:/.test(text) && text.length >= 397 && text.length <= 1421, 'Not a Diode frame (supported versions: 1, 2)');
  const bytes = unb64(text.slice(5));
  assert(bytes.length >= 294 && bytes.length <= 1062, 'Invalid frame length');
  const v = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const legacy = text.startsWith('DIO1:');
  const block = legacy ? BLOCK : v.getUint32(26);
  assert(validBlock(block) && bytes.length === block + 38, 'Invalid symbol size');
  assert(v.getUint32(block + 34) === crc32(bytes.subarray(0, block + 34)), 'Corrupt frame');
  const total = v.getUint32(16), generation = v.getUint16(20), seed = v.getUint32(22);
  assert(total > 0 && total <= MAX_OBJECT, 'Object exceeds size limit');
  assert(generation < Math.ceil(total / (block * WIDTH)), 'Invalid generation');
  assert(!legacy || v.getUint32(26) === 0, 'Unsupported frame flags');
  return { session: hex(bytes.subarray(0, 16)), id: bytes.slice(0, 16), total, generation, seed, block, payload: bytes.slice(30, 30 + block), objectCrc: v.getUint32(30 + block) };
}

export function unpack(bytes) {
  assert(bytes.length >= 4 && bytes.length <= MAX_OBJECT, 'Invalid envelope length');
  const length = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint32(0);
  assert(length > 0 && length <= 8192 && length + 4 <= bytes.length, 'Invalid metadata length');
  const meta = JSON.parse(td.decode(bytes.subarray(4, 4 + length)));
  assert(meta && typeof meta === 'object' && !Array.isArray(meta) && meta.v === 1, 'Unsupported envelope');
  return { meta, payload: bytes.subarray(4 + length) };
}
