import {BLOCK, WIDTH, MAX_FILE, MAX_OBJECT, assert, crc32, digest, hex, keyFor, maskFor, parseFrame, safeName, sourceCount, unb64, unpack, xor} from './common.js';
export class FountainDecoder {
  constructor() { this.reset(); }
  reset() { this.session = null; this.total = 0; this.rank = 0; this.groups = new Map(); this.result = null; this.done = false; }
  accept(text) {
    const frame = parseFrame(text);
    if (this.session) assert(frame.session === this.session && frame.total === this.total && frame.objectCrc === this.objectCrc, 'Different transfer detected. Reset to receive it.');
    else { this.session = frame.session; this.total = frame.total; this.objectCrc = frame.objectCrc; }
    if (this.done) return false;
    const count = sourceCount(this.total, frame.generation);
    let group = this.groups.get(frame.generation);
    if (!group) { group = { rows: [], rank: 0 }; this.groups.set(frame.generation, group); }
    if (group.rank === count) return false;
    let mask = maskFor(frame.seed, count), data = frame.payload;
    for (let pivot = 0; pivot < count; pivot++) {
      if (!((mask >>> pivot) & 1)) continue;
      const row = group.rows[pivot];
      if (row) { mask = (mask ^ row.mask) >>> 0; xor(data, row.data); }
      else {
        group.rows[pivot] = {mask, data}; group.rank++; this.rank++;
        if (group.rank === count) this.solve(group, count);
        return true;
      }
    }
    assert(!data.some(v => v !== 0), 'Inconsistent transfer data');
    return false;
  }
  solve(group, count) {
    for (let pivot = count - 1; pivot >= 0; pivot--) {
      const row = group.rows[pivot];
      for (let i = pivot + 1; i < count; i++) if ((row.mask >>> i) & 1) xor(row.data, group.rows[i].data);
      row.mask = (1 << pivot) >>> 0;
    }
  }
  get progress() { return this.total ? this.rank / Math.ceil(this.total / BLOCK) : 0; }
  async recover() {
    assert(this.total && this.progress === 1, 'Need more independent frames');
    if (this.result) return this.result;
    const object = new Uint8Array(this.total);
    for (const [generation, group] of this.groups) for (let i = 0; i < group.rows.length; i++) {
      const start = (generation * WIDTH + i) * BLOCK;
      object.set(group.rows[i].data.subarray(0, Math.min(BLOCK, this.total - start)), start);
    }
    assert(crc32(object) === this.objectCrc, 'Object checksum mismatch');
    assert(hex((await digest(object)).slice(0, 16)) === this.session, 'Object digest mismatch');
    this.done = true; this.result = object; this.groups.clear(); return object;
  }
}
async function decompress(payload, limit) {
  assert(typeof DecompressionStream !== 'undefined', 'This browser cannot decompress gzip files');
  const reader = new Blob([payload]).stream().pipeThrough(new DecompressionStream('gzip')).getReader();
  const parts = []; let size = 0;
  try {
    while (true) { const {value, done} = await reader.read(); if (done) break; size += value.length; assert(size <= limit, 'Decompressed file exceeds declared size'); parts.push(value); }
  } catch (e) { await reader.cancel().catch(() => {}); throw e; }
  const bytes = new Uint8Array(size); let p = 0; for (const part of parts) { bytes.set(part, p); p += part.length; } return bytes;
}
export async function openObject(object, passphrase = '') {
  let {meta, payload} = unpack(object);
  if (meta.encrypted === true) {
    assert(meta.kdf === 'PBKDF2-SHA256' && meta.iterations === 250000, 'Unsupported encryption settings');
    assert(typeof meta.salt === 'string' && meta.salt.length === 24 && typeof meta.iv === 'string' && meta.iv.length === 16, 'Invalid encryption metadata');
    const salt = unb64(meta.salt), iv = unb64(meta.iv);
    assert(salt.length === 16 && iv.length === 12 && payload.length <= MAX_OBJECT, 'Invalid encryption envelope');
    const key = await keyFor(passphrase, salt);
    let plain;
    try { plain = new Uint8Array(await crypto.subtle.decrypt({name: 'AES-GCM', iv, additionalData: new TextEncoder().encode('DIO1')}, key, payload)); }
    catch { throw new Error('Wrong passphrase or damaged encrypted file'); }
    ({meta, payload} = unpack(plain));
    assert(!meta.encrypted, 'Nested encryption is unsupported');
  }
  assert(Number.isInteger(meta.size) && meta.size >= 0 && meta.size <= MAX_FILE, 'Invalid file size');
  assert(typeof meta.sha256 === 'string' && /^[a-f0-9]{64}$/.test(meta.sha256), 'Invalid file digest');
  assert(meta.compression === 'none' || meta.compression === 'gzip', 'Unsupported compression');
  const bytes = meta.compression === 'gzip' ? await decompress(payload, meta.size) : payload;
  assert(bytes.length === meta.size, 'File length mismatch');
  assert(hex(await digest(bytes)) === meta.sha256, 'File SHA-256 mismatch');
  return {name: safeName(meta.name), bytes, sha256: meta.sha256};
}
