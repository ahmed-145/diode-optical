# Diode wire protocol — v1, v2 and v3

Status: experimental v0.3, implementation-specific; no RFC 6330 interoperability. All integers are unsigned big-endian. Legacy Robust QR frames contain ASCII `DIO1:` followed by standard base64 for 294 bytes (397 characters overall). Balanced and Dense use `DIO2:` with the same header layout and a variable symbol size. Receivers accept both versions; old v0.1 receivers need Robust mode. No payload depends on a one-time descriptor beacon.

| Offset | Length | Field |
| --- | --- | --- |
| 0 | 16 | First 16 bytes of SHA-256 of the entire recoverable object |
| 16 | 4 | Object byte length, 1 to 5 MiB + 128 KiB |
| 20 | 2 | Generation index |
| 22 | 4 | Equation seed |
| 26 | 4 | Reserved flags, must be zero |
| 30 | 256 | Encoded symbol |
| 286 | 4 | CRC-32 of entire object |
| 290 | 4 | CRC-32 of bytes 0–289 |

CRC is standard reflected IEEE polynomial 0xedb88320, initial/final XOR 0xffffffff. Base64 is transport encoding, not encryption.

## Version 2 variable symbol sizes

`DIO2:` frames encode B + 38 bytes where B is 512 or 1024 (the parser also accepts B=256). The first 26 bytes are unchanged. Offset 26 stores B as a 4-byte integer. Payload occupies bytes 30 through 30+B-1; object CRC is at 30+B and frame CRC at 34+B. The frame CRC covers bytes 0 through 33+B. Reject unsupported B, mismatched actual length, excessive total length, and invalid generation indexes before storing equations. Symbol size is part of session consistency; changing a profile requires a receiver reset. Metadata envelopes and encryption are unchanged, including AES-GCM additional authenticated data `DIO1`.

## Fountain equations

Split the object into B-byte zero-padded symbols (B=256 for legacy v1). Each generation has up to 32 source symbols. Seeds below that generation's source count select the corresponding source symbol. Other seeds generate a nonzero 32-bit coefficient mask with `maskFor` in src/common.js, limited to the actual source count. The encoded payload is XOR of the selected symbols.

For frame sequence index i and generation count G, seed = floor(i/G); offset = maskFor(seed + 32, 32) mod G; generation = (i mod G + offset) mod G. Pseudorandom offsets resist phase locking under periodic capture loss; a simple linear rotation was found insufficient in regression tests. No deterministic schedule can guarantee recovery against every adversarial loss pattern. Seeds advance until the 32-bit range is exhausted. The receiver inserts equations by lowest-set-bit pivot, discards dependent duplicates, and back-substitutes once a generation reaches full rank. Different session identities, lengths, or object CRC values are never mixed. Rank, not raw frame count, drives progress.

This finite-seed fountain construction needs enough independent equations in every generation; no particular loss pattern or capture duration guarantees completion. The maximum file is 5 MiB. Memory grows linearly with object size, and equation work is bounded by the 32-symbol generation width.

## Object envelope

A 4-byte JSON byte length (1–8192), UTF-8 JSON metadata, and opaque payload. Metadata must have `v: 1`.

Plain metadata: `name` (sanitized on receipt), original `size`, original lowercase SHA-256 hex `sha256`, and `compression` (`none` or `gzip`). Gzip is used only when it saves bytes. Decompression is streamed and aborted above the declared original size, which cannot exceed 5 MiB. Output length and digest must match before download is enabled.

Encrypted metadata: `encrypted: true`, `kdf: PBKDF2-SHA256`, `iterations: 250000`, base64 `salt` (16 random bytes), base64 `iv` (12 random bytes). AES-256-GCM encrypts the complete plain envelope with additional authenticated data equal to UTF-8 `DIO1` and Web Crypto's default 128-bit tag. Nested encryption is rejected. The KDF configuration is fixed, not accepted as arbitrary work from untrusted metadata. Passphrases are 8–1024 JavaScript string characters and encoded as UTF-8 without normalization.

The object identity and object CRC cover the final encrypted envelope when encryption is enabled. SHA-256 without an independently trusted digest does not establish sender identity. Passphrase security still depends on entropy and secure sharing. This protocol has not had an independent cryptographic review.

## Version 3 raw-byte QR frames

New iPhone/Turbo/Dual profiles encode QR byte data directly: four ASCII magic bytes `DIO3`, followed by the same core header/payload/CRC layout as v2. The symbol size at core offset 26 is explicit; accepted sizes are 256, 512, 1024 and 2048. The complete raw packet must contain B+42 bytes, at most 2090. Offsets relative to the raw packet: session ID 4, object length 20, generation 24, seed 26, symbol size 30, payload 34, object CRC 34+B, frame CRC 38+B. CRC covers core bytes only: raw packet bytes 4 through 37+B. The fixed magic is independently validated.

Byte payload is taken from the scanner's original `bytes`, never its decoded text representation. Legacy ASCII QR bytes are decoded only after their bounded DIO1/DIO2 prefix is recognized. Session consistency still includes symbol size. The metadata/encryption envelope and AES-GCM additional authenticated data `DIO1` are unchanged.

Parallel lanes carry independent ordinary packets from the same encoder. A lane is not a separate session, and neither packet order nor lane identity is needed for decoding. The display sends the next encoding equation whenever a lane is updated; the other lane remains unchanged. No ACK, negotiation, device identifier, network handshake or receive path is added to the sender.
