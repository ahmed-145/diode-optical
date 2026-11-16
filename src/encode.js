import {BLOCK, WIDTH, MAX_FILE, MAX_OBJECT, assert, b64, crc32, digest, hex, keyFor, maskFor, pack, safeName, xor} from './common.js';
export async function prepare(bytes, name, {passphrase = '', compress = true} = {}) {
  assert(bytes instanceof Uint8Array && bytes.length <= MAX_FILE, 'Choose a file of 5 MB or smaller');
  assert(crypto.subtle, 'Web Crypto requires HTTPS or localhost');
  let payload = bytes, compression = 'none';
  if (compress && typeof CompressionStream !== 'undefined' && bytes.length) {
    const candidate = new Uint8Array(await new Response(new Blob([bytes]).stream().pipeThrough(new CompressionStream('gzip'))).arrayBuffer());
    if (candidate.length + 16 < bytes.length) { payload = candidate; compression = 'gzip'; }
  }
  let object = pack({ v: 1, name: safeName(name), size: bytes.length, sha256: hex(await digest(bytes)), compression }, payload);
  if (passphrase) {
    const salt = crypto.getRandomValues(new Uint8Array(16)), iv = crypto.getRandomValues(new Uint8Array(12));
    const key = await keyFor(passphrase, salt);
    const encrypted = new Uint8Array(await crypto.subtle.encrypt({name: 'AES-GCM', iv, additionalData: new TextEncoder().encode('DIO1')}, key, object));
    object = pack({v: 1, encrypted: true, salt: b64(salt), iv: b64(iv), kdf: 'PBKDF2-SHA256', iterations: 250000}, encrypted);
  }
  assert(object.length <= MAX_OBJECT, 'Encoded object too large');
  return new FountainEncoder(object, await digest(object));
}
export class FountainEncoder {
  constructor(object, hash) {
    this.object = object; this.id = hash.slice(0, 16); this.crc = crc32(object);
    this.generations = Math.ceil(object.length / (BLOCK * WIDTH));
    this.blocks = Math.ceil(object.length / BLOCK); this.index = 0;
  }
  frame(index = this.index++) {
    assert(Number.isSafeInteger(index) && index >= 0 && index < this.generations * 2 ** 32, 'Frame sequence exhausted');
    const seed = Math.floor(index / this.generations);
    // Rotate each round so periodic camera loss cannot permanently starve a generation.
    const generation = (index % this.generations + seed % this.generations) % this.generations;
    const count = Math.min(WIDTH, this.blocks - generation * WIDTH);
    const mask = maskFor(seed, count), payload = new Uint8Array(BLOCK);
    for (let i = 0; i < count; i++) if ((mask >>> i) & 1) {
      const start = (generation * WIDTH + i) * BLOCK;
      const part = this.object.subarray(start, start + BLOCK);
      xor(payload.subarray(0, part.length), part);
    }
    const bytes = new Uint8Array(294), view = new DataView(bytes.buffer);
    bytes.set(this.id); view.setUint32(16, this.object.length); view.setUint16(20, generation); view.setUint32(22, seed);
    bytes.set(payload, 30); view.setUint32(286, this.crc); view.setUint32(290, crc32(bytes.subarray(0, 290)));
    return 'DIO1:' + b64(bytes);
  }
}
