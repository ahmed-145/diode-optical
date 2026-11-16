# Verification evidence — 2026-11-16

## Passed locally

Node.js 20.12.2 on the supplied Linux workspace, `npm run check`:

- Ten automated tests covering empty/binary/Unicode files, late joins after all systematic symbols, deterministic 45% losses with reordering/duplicates, independent broadcast receivers, gzip selection, AES-GCM correct/wrong keys and tampering, frame corruption, invalid lengths, mixed sessions, unsafe filenames, digest mismatch, decompression bounds, actual QR raster-to-jsQR recovery, a 5 MiB random binary round trip, and a standalone-script UI flow.
- The UI flow uses a simulated DOM/canvas with real vendored QR/scanner code and real Web Crypto. It exercises sample selection, encrypted preparation, rendered pixels, QR image import, wrong/right passphrase, verified save/reset, and unavailable-camera feedback. It is not an actual browser.
- Separate artifacts build and pass source allowlist, emitted sender prohibited-API checks, script parsing, and no remote script/asset references. CSP denies network connections.
- A scheduling regression found by periodic-loss broadcast testing was fixed by rotating the generation order each round.

## Passed in GitHub Chromium

[Workflow run 43897562324](https://github.com/ahmed-145/diode-optical/actions/runs/43897562324), commit `3525824c54e2701c84bd839efb1ca13a9cd93ac7`, completed successfully on Ubuntu 24.04 with Node 22 and Playwright 1.58.0. It passed all ten tests, the build audit, identical rebuild hashes, and the real Chromium UI checks: rendered QR screenshots imported into the receiver, wrong/right passphrase behavior, downloaded bytes matching the original, reset, camera denial, offline sender playback, 390/1440-pixel overflow checks, no page errors, and no external runtime requests. Built HTML, result JSON, and screenshots are retained in the workflow artifact.

The initial CI run failed during Playwright installation because ubuntu-latest resolved to an unsupported OS. Pinning Ubuntu 24.04 fixed the setup; no failing application test was suppressed.

## Browser and hardware limitations

Local preview failed with `listen EPERM` on 127.0.0.1. Local Chromium launch failed with a prohibited socket operation. No browser or physical-camera success is claimed from those attempts.

A separate Playwright test and GitHub Actions workflow exercise real Chromium rendering, QR screenshot import, encrypted verification/download byte comparison, reset, camera denial, offline sender playback, responsive overflow, console errors, and external requests. These checks passed in the workflow linked above.

Actual camera streams, iOS Safari, Android Chrome, low-end devices, autofocus, glare, hand movement, tab lifecycle behavior on phones, and offline receiver permissions remain untested. The required ~10 KB/~500 KB/~5 MB device/lighting matrix is open. No measured optical throughput or production readiness claim is made.

## Reproduce

```sh
npm run check
cp dist/SHA256SUMS /tmp/diode-first-hashes
npm run build
cmp dist/SHA256SUMS /tmp/diode-first-hashes
```

Browser testing requires the optional Playwright harness described in README.md. Distribution hashes cover artifacts from the same source/toolchain, not a signed release or a third-party audit.
