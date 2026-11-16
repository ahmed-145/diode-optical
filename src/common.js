export const BLOCK = 256;
export const WIDTH = 32;
export const MAX_FILE = 5 * 1024 * 1024;
export const MAX_OBJECT = MAX_FILE + 128 * 1024;
export const te = new TextEncoder();
export const td = new TextDecoder('utf-8', { fatal: true });
export function assert(ok, message) { if (!ok) throw new Error(message); }
export function concat(...parts) {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let offset = 0; for (const p of parts) { out.set(p, offset); offset += p.length; } return out;
}
export function b64(bytes) {
  let s = ''; for (const v of bytes) s += String.fromCharCode(v); return btoa(s);
}
export function unb64(s) {
  assert(typeof s === 'string' && s.length <= Math.ceil(MAX_OBJECT / 3) * 4, 'Invalid base64');
  const raw = atob(s); return Uint8Array.from(raw, c => c.charCodeAt(0));
}
export async function digest(bytes) { return new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)); }
export function hex(bytes) { return Array.from(bytes, v => v.toString(16).padStart(2, '0')).join(''); }
export function crc32(bytes) {
  let c = 0xffffffff;
  for (const v of bytes) { c ^= v; for (let i = 0; i < 8; i++) c = (c >>> 1) ^ ((c & 1) ? 0xedb88320 : 0); }
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
export function sourceCount(total, generation) {
  return Math.min(WIDTH, Math.ceil(total / BLOCK) - generation * WIDTH);
}
export function parseFrame(text) {
  assert(typeof text === 'string' && text.startsWith('DIO1:') && text.length === 397, 'Not a Diode v1 frame');
  const bytes = unb64(text.slice(5));
  assert(bytes.length === 294, 'Invalid frame length');
  const v = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  assert(v.getUint32(290) === crc32(bytes.subarray(0, 290)), 'Corrupt frame');
  const total = v.getUint32(16), generation = v.getUint16(20), seed = v.getUint32(22);
  assert(total > 0 && total <= MAX_OBJECT, 'Object exceeds size limit');
  assert(generation < Math.ceil(total / (BLOCK * WIDTH)), 'Invalid generation');
  assert(v.getUint32(26) === 0, 'Unsupported frame flags');
  return { session: hex(bytes.subarray(0, 16)), id: bytes.slice(0, 16), total, generation, seed, payload: bytes.slice(30, 286), objectCrc: v.getUint32(286) };
}
export function safeName(value) {
  assert(typeof value === 'string' && value.length <= 1024, 'Invalid filename');
  return value.replace(/[\x00-\x1f\x7f/\\:*?"<>|]/g, '_').replace(/^\.+/, '_').slice(0, 180) || 'received-file';
}
export function pack(meta, payload) {
  const json = te.encode(JSON.stringify(meta)); assert(json.length <= 8192, 'Metadata too large');
  const size = new Uint8Array(4); new DataView(size.buffer).setUint32(0, json.length);
  return concat(size, json, payload);
}
export function unpack(bytes) {
  assert(bytes.length >= 4 && bytes.length <= MAX_OBJECT, 'Invalid envelope length');
  const length = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint32(0);
  assert(length > 0 && length <= 8192 && length + 4 <= bytes.length, 'Invalid metadata length');
  const meta = JSON.parse(td.decode(bytes.subarray(4, 4 + length)));
  assert(meta && typeof meta === 'object' && !Array.isArray(meta) && meta.v === 1, 'Unsupported envelope');
  return { meta, payload: bytes.subarray(4 + length) };
}
export async function keyFor(passphrase, salt) {
  assert(typeof passphrase === 'string' && passphrase.length >= 8 && passphrase.length <= 1024, 'Use a passphrase of 8–1024 characters');
  const key = await crypto.subtle.importKey('raw', te.encode(passphrase), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey({name: 'PBKDF2', salt, iterations: 250000, hash: 'SHA-256'}, key, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
}
export function formatBytes(n) { return n < 1024 ? `${n} B` : n < 1024 ** 2 ? `${(n / 1024).toFixed(1)} KB` : `${(n / 1024 ** 2).toFixed(1)} MB`; }
