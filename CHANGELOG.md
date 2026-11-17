# Changelog

## 0.3.0 — 2026-11-17

- Add raw-byte iPhone/Turbo profiles and staggered Dual lab mode, retaining legacy receivers via compatible profiles.
- Reuse and credit MIT fast_qr/RaptorQR rendering and pinned MIT/Apache ZXing WASM scanning; embed assets without runtime CDN loading.
- Move scanning into a worker with serial backpressure and a main-thread WASM fallback.
- Add fixed center/wide guides, capture resolution controls and useful-data/latency diagnostics.
- Hold symbols for whole display refreshes; let fullscreen codes fill the available screen.
- Add matched-engine CPU benchmarks, raw-byte/corruption/loss/dual-code/memory tests and continuous browser-to-synthetic-camera verification.
- Record the owner's live Vercel sender/receiver links.

## 0.2.0 — 2026-11-17

- Add Robust/Balanced/Dense payload profiles with legacy frame compatibility, transfer-time lower bounds and measured playback rate.
- Preserve scanning resolution for dense codes; scan new video frames instead of polling the same exposure, with a timer fallback.
- Separate camera cancellation from transfer cancellation. Stop late-arriving streams; recover after disconnection; keep a working camera if device labels are unavailable.
- Fix stale reconstruction after reset and periodic-loss phase locking. Add regression coverage across profiles and maximum-size files.
- Remove receiver parsing code from the sender artifact; derive sender encryption keys for encryption only.
- Add drag/drop, signal diagnostics, throttled progress announcements and a reproducible synthetic QR benchmark.
- Use local-file reading, cached selection bytes, and byte-backed compression streams for offline preparation; keep prepared and paused states distinct.
- Expand browser CI to current pinned Chromium, Firefox and WebKit; add Chromium synthetic camera pipeline and lifecycle tests.

Camera throughput, physical-device compatibility and security certification are not implied by these changes.
