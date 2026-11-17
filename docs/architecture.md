# Implemented architecture — experimental v0.3

Browser-native JavaScript sources, pinned WebAssembly engines, and a dependency-free Node build script produce two standalone HTML artifacts. Runtime components are embedded locally; no database, upload endpoint, CDN dependency, account or telemetry is part of the application.

| Component | Implementation |
| --- | --- |
| Shared encoding/integrity | src/common.js: limits, CRC-32, SHA-256, object packing, coefficient masks, encryption KDF |
| Receive-only framing | src/read.js: binary/text packet parsing and object unpacking; excluded from sender |
| Fountain sender | src/encode.js: bounded generation-based binary equations; text and raw transports |
| QR renderer | src/qr.js + MIT fast_qr/RaptorQR WASM; JavaScript compatibility renderer |
| Receiver recovery | src/decode.js: bounded equation recovery, decompression, GCM opening, SHA-256 save gate |
| Capture | src/capture.js + receiver.js: fixed user-selected guide, bounded pixels, frame callbacks, lifecycle tokens |
| Scanner | src/scanner.js + src/scan-worker.js: pinned ZXing WASM in a Blob worker, main-thread fallback, serial backpressure |
| Build/audit | scripts/build.mjs and audit.mjs: separate source inventories, matching engine hashes, script-hash CSP, sender API exclusions, artifact hashes |
| Validation | tests/: legacy/new protocol, real renderer/scanner pairs, UI harness, browser matrix and synthetic video transfers |

The sender has no frame parser, camera, scanner, recovery decoder or receiver UI, and its CSP forbids workers and network connections. Only the QR encoder engine is compiled into it. The receiver permits its locally-created Blob worker and WASM compilation; it retains no-connect CSP. Generated WASM network loader glue is omitted on the sender; ZXing receives embedded wasmBinary on the receiver. The broad JavaScript unsafe-eval permission is not enabled.

DIO3 raw packets remove base64 expansion; DIO1/DIO2 remain readable. Object envelopes, metadata protection, gzip, passphrase encryption, maximum file/object sizes and whole-file SHA-256 checks remain in force. At most one decode runs at a time; camera frames are acquired only after the previous result is consumed. Session and camera cancellation are separate; stale work cannot complete a reset transfer. Worker initialization has a bounded wait and falls back to main-thread WASM if unavailable.

Sender playback uses whole display refresh callbacks and does not catch up with short flashes after a missed callback. Dual lab mode alternates writes to two canvas lanes; neither acknowledgment nor reverse channel is required. A matching receiver wide guide can extract two QR packets per captured frame.

Camera constraints are preferences, not hardware guarantees. Actual source/capture dimensions, processed scan rate, useful coded-data rate and scan latency are visible. Sharp requests higher resolution; continuous focus is requested only when advertised by the track. This is fixed crop geometry, not motion-adaptive marker tracking.

See [wire protocol](protocol.md), [iPhone research](iphone-performance.md), [dependency provenance](../vendor/README.md) and [verification](verification.md). Physical phone-camera validation and independent security/legal review remain open.
