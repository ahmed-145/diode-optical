# Implemented architecture — experimental v0.2

The implementation uses browser-native JavaScript modules as source and a small dependency-free Node build script. The earlier TypeScript/WASM/RaptorQ proposal was replaced with inspectable JavaScript and an independent bounded binary fountain codec. This is not RFC 6330 compatibility or patent clearance.

| Component | Implementation |
| --- | --- |
| Shared framing and envelope | src/common.js: limits, table-based CRC-32, SHA-256, encoding metadata, coefficient masks, encryption KDF |
| Receiver framing | src/read.js: frame parsing, base64 decoding, object parsing; excluded from sender |
| Sender only | src/encode.js + src/sender.js + MIT QR generator |
| Receiver only | src/decode.js + src/receiver.js + Apache-2.0 jsQR |
| Build | scripts/build.mjs: separate standalone HTML, script-hash CSP, source inventory, hashes |
| Audit | scripts/audit.mjs: sender allowlist, prohibited APIs, offline references, compiled script syntax |
| Verification | tests/: protocol, real QR raster/scanner, simulated UI, optional Chromium workflow |

The sender never imports receiver framing, object parsing, recovery, scanner, decompression, or camera code. Encryption keys are derived for encryption only in this build. Both builds inline their assets, and CSP denies network connections. Hosted sender headers additionally disable camera and microphone. This boundary belongs to the app, not the host OS. No database, backend, account, telemetry, local storage, or automatic received-file execution is present.

Metadata travels inside the recoverable object. The receiver maintains a single session with a maximum object size of 5 MiB + 128 KiB and 32 equations per generation. It releases solved-group buffers after reconstruction. Decompression and original file lengths are bounded; a SHA-256 match gates saving. AES-GCM is optional. See the exact [wire protocol](protocol.md).

Camera access is explicit, tracks are stopped on stop, completion, reset, hidden tab, or page exit, and camera and transfer operations use separate cancellation epochs; recovery refuses stale completion even when reset restarts the same file. Scanning uses requestVideoFrameCallback when available and a serial timer fallback otherwise. Device-enumeration failure does not discard a working camera. Download URLs are revoked on replacement/reset. Mobile camera behavior and runtime browser enforcement require separate physical/browser verification.

Offline sender operation is supported by a single HTML artifact. Receiver also has a single artifact but camera permissions depend on the browser's secure-context rules. HTTPS is the recommended camera deployment. UI includes keyboard-native controls, status announcements, responsive layouts, reduced-motion speed adjustment, and explicit playback pause. Optical transfer remains visually dependent.
