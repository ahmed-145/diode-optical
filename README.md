# Diode Optical

Transfer a file through animated QR codes. No Wi-Fi, Bluetooth, server, account, or runtime CDN.

**Live app:** [Send from your computer](https://diode-optical.vercel.app/send) · [Receive on your iPhone](https://diode-optical.vercel.app/receive)

Open the receiver link in Safari, tap **Start camera**, allow access, and scan the sender’s stream. No local server or tunnel is needed for the hosted app.

**Experimental v0.3:** sender and receiver are implemented and automated checks run locally. The v0.3 WASM and binary transport upgrade is covered by local checks and a three-engine browser CI matrix. Real phone-camera/lighting validation and independent security review remain outstanding. This is not a certified hardware data diode.

## Run

Requires Node.js 20 or newer. No dependency installation is needed to build or run the app.

```sh
npm run check
npm run dev
```

Open `http://127.0.0.1:4173/sender.html` to send, or `/receiver.html` to receive. Camera access requires HTTPS or localhost. A phone accessing a desktop's plain HTTP LAN address normally cannot use its camera: host the static output over HTTPS, or copy receiver.html to the phone and verify whether that browser permits local-file camera access.

`npm run build` produces standalone `dist/sender.html` and `dist/receiver.html`. Each includes its own scripts and styles and has no runtime asset downloads. Sender can be opened directly as a file. Keep both HTML files together if you want the Send/Receive navigation links to work. CI publishes the distribution and test evidence as an Actions artifact.

## HTTPS hosting for an iPhone

Import this repository into Vercel; the checked-in vercel.json selects the static build. Use `/send` on the computer and `/receive` on the iPhone. See [deployment instructions](docs/deployment.md). This removes the temporary tunnel requirement; it does not accelerate QR transfer.

## Transfer

1. Choose a file (up to 5 MB), or try the sample.
2. Optionally enter a passphrase of at least eight characters. Share it separately.
3. Prepare the file, then start the QR stream. Start with iPhone (default); Robust, Balanced and Dense remain compatible alternatives. Turbo and Dual lab are optional higher-throughput experiments. Use slower playback for difficult cameras.
4. On each receiver, start its camera and point it at the whole QR code. QR screenshot import is also supported.
5. Once collected, enter the passphrase if needed and save the verified file.

Any number of receivers can join independently, including mid-stream. Frames may arrive out of order, repeat, or be lost. The stream produces new repair equations rather than requiring every original frame. Only a receiver can confirm completion. Keep displaying until all receivers finish.

Use small files first. Profiles offer these **nominal ceilings, not measured camera throughput**:

| Profile | Bytes/frame | Default fps | Payload ceiling before losses |
| --- | --- | --- | --- |
| Robust | 256 | 4 | 1 KB/s |
| Balanced | 512 | 8 | 4 KB/s |
| Dense | 1024 | 12 | 12 KB/s |
| iPhone (default; binary) | 1024 | 20 | 20 KB/s |
| Turbo (binary) | 2048 | 30 | 60 KB/s |
| Dual lab (binary; two lanes) | 1024 | 60 total | 60 KB/s |

Turbo and Dual require a sharper image and may be slower in practice if the camera misses more frames. For Dual, use fullscreen on the sender and select Wide guide plus Sharp on the receiver. The sender displays a lower-bound transfer time and its actual playback rate; only the receiver reports recovery. The 5 MB cap is a resource boundary, not a promise of a practical large-file transfer time.

## Implemented

- Separate camera-less sender and camera/image receiver HTML artifacts.
- Independently written generation-based binary fountain coding, bounded to 32 source symbols per generation with pseudorandom round offsets to resist periodic capture loss; not RFC 6330/RaptorQ and not compatible with other tools.
- Per-frame and whole-object CRC-32, a truncated object SHA-256 session identity, and full original-file SHA-256 verification.
- Optional gzip when it saves bytes; optional AES-256-GCM with PBKDF2-SHA256, 250,000 iterations, fresh salt and nonce.
- WASM QR rendering, worker-based ZXing scanning, raw binary profiles, staggered dual-lane lab mode, fixed camera guides, refresh-paced playback, drag/drop, controls, estimates, diagnostics, camera cleanup, useful-symbol progress, explicit verified download, responsive layout, keyboard controls, and live status.
- Strict no-connect CSP, sender dependency audit, deterministic builds and SHA-256 manifests.

Brotli, paper export, and bidirectional transfer are not implemented. Dual lane mode is experimental. The original PRD's patent/licensing review remains unresolved; the experimental codec is not a legal design-around claim.

## Validation

`npm run check` runs 23 protocol/QR/UI tests, builds both artifacts, and audits sender separation and script syntax. The UI integration test uses a DOM/canvas harness; it is not a substitute for a browser or physical camera.

Browser checks, including all-profile WASM screenshot-to-download tests, run on Chromium, Firefox and WebKit in CI. Chromium additionally tests the actual video scanning loop with a synthetic camera, completion cleanup, missing device labels, cancellation during permission requests, disconnection, and restart. It also runs continuous production sender-to-synthetic-camera transfers with late joins in single and dual modes. These are not physical phone-camera tests. To run locally:

```sh
npm install --no-save --package-lock=false playwright@1.65.1
npx playwright install chromium
npm run test:browser
# Optional: BROWSER_ENGINE=firefox npm run test:browser
```

`npm run benchmark` records real QR-render/scan CPU timings and nominal profile rates in test-results/benchmark.json. It does not measure optical throughput.

See [verification evidence](docs/verification.md) for results and limits. GitHub Actions runs both layers and retains HTML builds and screenshots.

## Project documents

- [Original PRD](diode-prd.md), preserved unchanged
- [Research review](docs/research-review.md)
- [Architecture](docs/architecture.md) and [wire protocol](docs/protocol.md)
- [Milestone status](docs/milestones.md)
- [Security model](SECURITY.md)
- [iPhone performance research and tuning](docs/iphone-performance.md)
- [Dependency provenance](vendor/README.md)

Original implementation is MIT licensed. The fast_qr wrapper/compiled renderer is reused under MIT from RaptorQR and fast_qr, with attribution; ZXing WASM retains MIT/Apache-2.0 notices. Vendored code retains its original MIT/Apache-2.0 license. Repository: https://github.com/ahmed-145/diode-optical.
