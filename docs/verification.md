# Verification — v0.3 optical pipeline upgrade (2026-11-17)

Local `npm run check` passes 23 tests. New tests use the actual pinned fast_qr and ZXing WASM engines, byte-exact raw packets and original-file recovery, legacy profiles, raw JavaScript fallback, bounded/corrupt packet rejection, portrait/landscape guide bounds, stable renderer memory, two independent QR codes in one image, and high-entropy late-join recovery with losses and duplicates. Sender dependency hashes and API separation are audited.

The matched-pixel CPU benchmark records all six profiles, baseline decode success counts, median rendering/scanning time and scanner P95 in test-results/benchmark.json. It is not a phone-camera throughput benchmark. See [research and measurement scope](iphone-performance.md).

The browser suite is being rerun on Chromium, Firefox and WebKit for this upgrade. It requires the actual WASM renderer and worker scanner, exercises all six profiles, and adds continuous single/dual production sender-to-synthetic-video transfers with late join and byte-identical verified downloads. Passing results must be confirmed before marking the new browser coverage green.

## Historical v0.2 evidence


Local `npm run check` passes 15 tests. Added coverage includes periodic loss at several rates across all symbol sizes, all-profile real QR scans at three pixels/module, bounded/mixed profile headers, CRC known answers, and reset during a pending reconstruction of the same file. The maximum-file test now exercises all three symbol sizes. Sender build checks now also exclude receive-side framing/base64/object parsing helpers.

`npm run benchmark` reports synthetic raster rendering/scanning CPU timings and profile payload ceilings; no optical throughput claim is made. The default channel increases from 256 bytes × 4 fps to 512 bytes × 8 fps. Dense offers 1024 × 12. Camera performance may erase those theoretical gains under poor capture conditions.

The CI matrix now includes Chromium, Firefox and WebKit for all-profile UI transfer/download verification, encryption, camera denial, reset, offline playback, responsive overflow and error/network checks. Chromium additionally exercises actual HTMLVideoElement → canvas → jsQR scanning using a synthetic MediaStream and checks permission cancellation, device-enumeration failure, track end, cleanup and restart. **Passed:** [v0.2 workflow 43984231696](https://github.com/ahmed-145/diode-optical/actions/runs/43984231696), application commit `725335ac596a3d17032c05b134f99cc6d998d13f`. All three jobs succeeded with Playwright 1.65.1 on Ubuntu 24.04. The suite also verifies gzip through the actual browser receiver and fresh local file selection with offline emulation enabled. Test result JSON is written only after the full applicable suite succeeds. Per-engine HTML builds, screenshots, benchmark JSON and test results are retained in the workflow artifacts.

The older Playwright 1.58.0 WebKit build rejected local file reads under offline emulation, including FileReader. The current pinned harness passes the unchanged offline requirement. This was a test-environment compatibility issue; the source also now uses a classic local-file reader, caches selected bytes for repeated preparation, and compresses/decompresses from byte-backed streams. A separate prepared/paused-state bug was fixed and has regression coverage. Related upstream offline-emulation work is tracked in [Playwright #42775](https://github.com/microsoft/playwright/issues/42775); that issue concerns service-worker navigation and is not a proof of the exact cause of our Blob read failure.

Actual physical camera/lighting/device testing and independent security review remain open. Desktop WebKit passing does not establish iOS Safari hardware compatibility.

## Historical v0.1 evidence


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
