# iPhone optical-transfer research and implementation — 2026-11-17

## Decision

Optimize the actual optical pipeline before adding more nominal FPS: use raw QR bytes, compiled rendering/scanning, a worker with serial backpressure, stable display-refresh holds, and an explicit camera guide. Keep the separate sender artifact, bounded decoding, gzip/encryption envelopes, and verified downloads. No file relay or WebRTC path was introduced.

## Primary sources reviewed

| Source | Evidence and relevance | Reuse decision |
| --- | --- | --- |
| [RaptorQR](https://github.com/infrost/RaptorQR) | Reports 183.6 KB/s for a 6.5 MB file with an iPhone 16/Safari, using V30-L × 4 codes at 30 fps. These are the author's lab results, not Diode results or a guarantee for another phone. Uses fast_qr WASM, ZXing WASM, workers and RaptorQ. | Reused its MIT-licensed fast_qr WASM wrapper and compiled renderer, retaining Haixiang's notice and the upstream fast_qr MIT license. No wholesale application/protocol copy. |
| [fast_qr](https://github.com/erwanvivien/fast_qr) | Rust QR generation, wrapped by RaptorQR for fixed RGBA buffers and byte input. | Pinned compiled encoder plus wrapper; hash-checked at build time. |
| [zxing-wasm](https://github.com/Sec-ant/zxing-wasm) | Maintained ZXing-C++ WASM reader with original payload bytes, QR-only format restrictions and configurable effort. Documentation requires matching JS and WASM and supports providing wasmBinary for local initialization. | Vendored official npm 3.1.7 assets, with package integrity, WASM SHA-256, MIT wrapper and Apache-2.0 C++ notices. No runtime CDN. |
| [Decimen-derived qr-transfer](https://github.com/nthung2112/qr-transfer) and [optical-transfer](https://github.com/KrisCris/optical-transfer) | Useful parallel-display and stable-refresh prior art; their current repositories have AGPL-3.0 licenses. Their measured hardware results do not establish Diode performance. | Reviewed design and documentation; did not copy their source or binary codec into this MIT project. |
| [requestVideoFrameCallback](https://developer.mozilla.org/en-US/docs/Web/API/HTMLVideoElement/requestVideoFrameCallback) | Camera processing can be driven by newly presented video frames. | Retained the frame callback and timer fallback; the scan loop waits for one decode to finish before scheduling another. |

## Changes in v0.3

- **Raw transport:** DIO3 carries a binary envelope directly in QR byte mode. Legacy DIO1/DIO2 base64 frames remain readable. Maximum raw symbol size is bounded to 2048 bytes.
- **Compiled renderer:** fast_qr creates QR pixels in a reusable WASM buffer; the browser copies them to canvas in one operation. Compatibility JavaScript rendering remains available.
- **Compiled scanner:** ZXing runs inside a locally-created worker; a main-thread WASM fallback handles unavailable workers. One decode runs at a time. No image backlog is accumulated by the camera loop.
- **Camera acquisition:** default iPhone mode uses a fixed visible center guide and at most 720-pixel processing, rather than scanning a large full frame. Sharp requests a higher camera resolution and up to 1080-pixel processing. Continuous focus is requested only when the track advertises it. The browser may choose a different actual resolution; diagnostics expose it.
- **Stable playback:** the sender holds codes for a whole number of actual display refresh callbacks. Missed callbacks lengthen a code instead of causing catch-up flashes.
- **Fullscreen:** QR display can fill the available screen instead of retaining the old 470-pixel maximum.
- **Dual lab mode:** two raw-byte QR lanes alternate updates. Each lane remains stable while the other changes. Select Wide guide and Sharp on the receiver, and use a large/fullscreen sender. This is experimental until checked on the actual phone.

No motion-adaptive marker tracking, color-channel multiplexing, acknowledgment barcode, or bidirectional transfer was added. This is not freedom-to-operate clearance; the original patent questions remain unresolved.

## Profiles and use

| Profile | Bytes/symbol | Requested symbols/s | Nominal payload ceiling |
| --- | --- | --- | --- |
| Robust | 256 | 4 | 1 KB/s |
| Balanced | 512 | 8 | 4 KB/s |
| Dense | 1024 | 12 | 12 KB/s |
| iPhone (default) | 1024, binary | 20 | 20 KB/s |
| Turbo | 2048, binary | 30 | 60 KB/s |
| Dual lab | 1024, binary; two lanes | 60 total | 60 KB/s |

These are channel ceilings before missing frames and recovery overhead, not measured file throughput. Display cadence is quantized to real refreshes, so the measured rate may differ from the request. The old receiver cannot read binary profiles; load the new receiver or choose a legacy profile.

For the owner's deployment, open https://diode-optical.vercel.app/send on the computer and https://diode-optical.vercel.app/receive in iPhone Safari. Start with **iPhone**, **Fast** capture, and the **Center guide**, keep the white border inside the guide, and use the main back camera. Try Turbo or Dual only after the receiver is collecting data reliably. The useful coded-data rate is more meaningful than the sender's requested FPS.

## Measurements and remaining limits

`npm run benchmark` compares both engines on the same generated pixels and verifies decoded bytes. A local Node 20/x64 sample measured Balanced rendering at 13.03 ms (JavaScript fixture) versus 2.24 ms (WASM), and scanning at 18.72 ms (jsQR) versus 2.10 ms (ZXing). This is a small synthetic CPU benchmark, excludes real acquisition/driver/lighting effects, and is not a phone throughput claim. Fresh per-engine benchmark JSON is retained by CI.

Local checks cover real WASM QR/scanner round trips, legacy compatibility, raw-byte fallback, corruption/size validation, two-code extraction, late joins/loss/duplicates, capture bounds and stable renderer memory. The browser matrix and continuous synthetic-video tests must pass before declaring this upgrade validated in browsers.

The iPhone model/iOS version and physical captures have not been supplied. Actual lens selection, rolling shutter, autofocus, exposure, screen brightness/glare and battery/thermal behavior remain hardware test items. A native iOS capture/decoder app could avoid browser capture copies and offer more camera control, but would require a different delivery path; it is not claimed to exist here.
