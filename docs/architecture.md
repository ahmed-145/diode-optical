# Proposed architecture

Design only; all components below are unimplemented.

Use TypeScript with a static bundler and pinned dependencies. Produce sender and receiver from separate entry points. No shared router may pull receiver modules into the sender. Evaluate whether the selected fountain package can separate encoder and decoder, including WASM exports.

| Component | Responsibility |
| --- | --- |
| Protocol core | Versioned envelopes, bounds, checksums, safe metadata parsing |
| Sender | File selection, compression, fountain encoding, QR display, pause/speed |
| Receiver | Explicit camera controls, scanning, bounded recovery, verification, save |
| Build audit | Import graph, emitted JS/WASM inventory, network behavior, artifact hashes |

No backend or database. Vendor all runtime assets. Stop camera tracks and workers on stop/navigation/completion; revoke object URLs when no longer needed.

## Data flow

Sender: file → metadata and original SHA-256 → optional compression → recoverable object → fountain symbols → bounded frames with CRC → monochrome QR.

Receiver: camera → scanner → frame validation → session selection → deduplication/recovery → object validation → bounded decompression → original length/digest verification → explicit download.

Specify byte layout before coding: magic/version, session ID, codec ID, object and symbol lengths, encoding symbol ID, and checksum coverage. Protect metadata inside the recoverable object so late joins need no one-time beacon. Specify original/encoded lengths and enforce limits before allocation. Set explicit maximum file size, symbol count, sessions, memory, decoding work, and decompressed bytes; finalize defaults from device measurements.

Never mix sessions. Confirm before replacing an active session. Sanitize filenames, treat received content as opaque bytes, and never execute or preview received HTML.

## Sender boundary

Exclude camera, scanner, recovery decoder, and receiver UI, including transitive code and WASM exports. Verify import graphs and final artifacts, not just minified string searches. Apply a restrictive CSP and hosted Permissions-Policy disabling camera/microphone. This does not constrain other software on the device.

Test with networking disabled and camera permission denied. Log browser requests and inspect every bundled asset. No telemetry, remote fonts, remote error reporting, or CDN fallback.

## Offline and accessibility

Test actual receiver camera access on iOS Safari and Android Chrome using the chosen offline/secure-context strategy. Bundle workers and WASM locally. Provide keyboard controls, readable contrast, pause, and screen-reader status at meaningful intervals. Animated optical transfer remains visually dependent.

Encryption needs a reviewed envelope/key-derivation design. Dual lanes, colour multiplexing, backchannels, paper export, and bidirectional transfer are deferred.
