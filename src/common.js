export const BLOCK = 256;
export const WIDTH = 32;
export const PROFILES = Object.freeze({robust: {block: 256, fps: 4}, balanced: {block: 512, fps: 8}, dense: {block: 1024, fps: 12}, iphone: {block: 1024, fps: 20, binary: true}, turbo: {block: 2048, fps: 30, binary: true}, dual: {block:1024, fps:60, binary:true, lanes:2}});
export function validBlock(block) { return [256, 512, 1024, 2048].includes(block); }
export const MAX_FILE = 5 * 1024 * 1024;
export const MAX_OBJECT = MAX_FILE + 128 * 1024;
export const te = new TextEncoder();
export function assert(ok, message) { if (!ok) throw new Error(message); }
export function concat(...parts) {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let offset = 0; for (const p of parts) { out.set(p, offset); offset += p.length; } return out;
}
export function b64(bytes) {
  let s = ''; for (const v of bytes) s += String.fromCharCode(v); return btoa(s);
}
export async function digest(bytes) { return new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)); }
export function hex(bytes) { return Array.from(bytes, v => v.toString(16).padStart(2, '0')).join(''); }
const CRC_TABLE = Uint32Array.from({length: 256}, (_, value) => {
  let c = value; for (let i = 0; i < 8; i++) c = (c >>> 1) ^ ((c & 1) ? 0xedb88320 : 0);
  return c >>> 0;
});
export function crc32(bytes) {
  let c = 0xffffffff;
  for (const v of bytes) c = (c >>> 8) ^ CRC_TABLE[(c ^ v) & 255];
  return (c ^ 0xffffffff) >>> 0;
}
export function maskFor(seed, count) {
  if (seed < count) return (1 << seed) >>> 0;
  // A deterministic nonzero pseudorandom binary equation for this generation.
  let x = (seed + 0x9e3779b9) >>> 0;
  x = Math.imul(x ^ (x >>> 16), 0x21f0aaad);
  x = Math.imul(x ^ (x >>> 15), 0x735a2d97);
  x = (x ^ (x >>> 15)) >>> 0;
  x &= count === 32 ? 0xffffffff : (2 ** count - 1);
  return (x || 1) >>> 0;
}
export function xor(a, b) { for (let i = 0; i < a.length; i++) a[i] ^= b[i]; }
export function safeName(value) {
  assert(typeof value === 'string' && value.length <= 1024, 'Invalid filename');
  return value.replace(/[\x00-\x1f\x7f/\\:*?"<>|]/g, '_').replace(/^\.+/, '_').slice(0, 180) || 'received-file';
}
export function pack(meta, payload) {
  const json = te.encode(JSON.stringify(meta)); assert(json.length <= 8192, 'Metadata too large');
  const size = new Uint8Array(4); new DataView(size.buffer).setUint32(0, json.length);
  return concat(size, json, payload);
}
export async function keyFor(passphrase, salt, usages = ['encrypt']) {
  assert(typeof passphrase === 'string' && passphrase.length >= 8 && passphrase.length <= 1024, 'Use a passphrase of 8–1024 characters');
  const key = await crypto.subtle.importKey('raw', te.encode(passphrase), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey({name: 'PBKDF2', salt, iterations: 250000, hash: 'SHA-256'}, key, { name: 'AES-GCM', length: 256 }, false, usages);
}
export function formatBytes(n) { return n < 1024 ? `${n} B` : n < 1024 ** 2 ? `${(n / 1024).toFixed(1)} KB` : `${(n / 1024 ** 2).toFixed(1)} MB`; }

export function byteStream(bytes) {
  return new ReadableStream({start(controller) { controller.enqueue(bytes); controller.close(); }});
}
