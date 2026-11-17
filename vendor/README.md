# Vendored dependency provenance

Retrieved through the GitHub connector on 2026-11-16. No source changes; extensions renamed to `.cjs` so tests can load the upstream UMD distributions in this ESM project. Build inlines these distributions without a runtime CDN.

| File | Source | Git blob SHA | License |
| --- | --- | --- | --- |
| jsqr.cjs | https://github.com/cozmo/jsQR/blob/master/dist/jsQR.js | 99ea9df26907009e5553233ffe03c529c1521739 | Apache-2.0; jsqr.LICENSE |
| qrcode.cjs | https://github.com/kazuhikoarase/qrcode-generator/blob/master/js/dist/qrcode.js | df13f829bf41f36b82f0ed85751ed3b4c39cfeb8 | MIT; qrcode.LICENSE |

The stored bytes and blob identities pin the code, even if upstream master moves. Preserve license files with any redistribution. Original code is independently written; no source was copied from QRFerry or LiveDrop.

## v0.3 compiled optical engines

- `fast-qr.mjs` / `fast-qr.wasm`: reused from [RaptorQR's renderer package](https://github.com/infrost/RaptorQR/tree/main/packages/raptorqr-fast-qr-wasm/src/wasm), MIT, Copyright 2026 Haixiang. Compiled upstream [fast_qr](https://github.com/erwanvivien/fast_qr) is MIT, Copyright 2023 Erwan VIVIEN. Both notices are retained in fast-qr.LICENSE and fast-qr-upstream.LICENSE. Exact hashes and source Git blob identities are recorded in fast-qr-manifest.json. The standalone build retains the synchronous initialization path and omits unused network-loading glue; the vendored original is unchanged.
- `zxing-reader.js` / `zxing-reader.wasm`: official npm `zxing-wasm@3.1.7`, MIT wrapper and Apache-2.0 C++ library. zxing-manifest.json records package integrity and WASM SHA-256; builds require the matching JS hash constant. Source C++ revision: f19f7c6e0509fe0eeb822bf35c41b0f637dec290. Notices are in zxing.LICENSE and zxing-cpp.LICENSE.
- `scripts/vendor-zxing.mjs` and the maintainer-only vendor workflow retrieve the pinned npm package with lifecycle scripts disabled. Runtime HTML embeds the engines and does not contact npm/CDNs.
- jsQR is retained for comparison tests/benchmarks; it is no longer the runtime receiver scanner. qrcode.cjs remains a compatibility renderer and benchmark reference.

No AGPL application/codec code from the reviewed Decimen-derived projects was copied. This preserves the existing project license; it does not settle patent questions.
