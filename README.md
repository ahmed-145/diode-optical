# Diode Optical

Transfer a file through animated QR codes. No Wi-Fi, Bluetooth, server, account, or runtime CDN.

**Experimental v0.1:** sender and receiver are implemented and automated checks run locally. Real phone-camera/lighting validation and independent security review remain outstanding. This is not a certified hardware data diode.

## Run

Requires Node.js 20 or newer. No dependency installation is needed to build or run the app.

```sh
npm run check
npm run dev
```

Open `http://127.0.0.1:4173/sender.html` to send, or `/receiver.html` to receive. Camera access requires HTTPS or localhost. A phone accessing a desktop's plain HTTP LAN address normally cannot use its camera: host the static output over HTTPS, or copy receiver.html to the phone and verify whether that browser permits local-file camera access.

`npm run build` produces standalone `dist/sender.html` and `dist/receiver.html`. Each includes its own scripts and styles and has no runtime asset downloads. Sender can be opened directly as a file. Keep both HTML files together if you want the Send/Receive navigation links to work. CI publishes the distribution and test evidence as an Actions artifact.

## Transfer

1. Choose a file (up to 5 MB), or try the sample.
2. Optionally enter a passphrase of at least eight characters. Share it separately.
3. Prepare the file, then start the QR stream. Use slower playback for difficult cameras.
4. On each receiver, start its camera and point it at the whole QR code. QR screenshot import is also supported.
5. Once collected, enter the passphrase if needed and save the verified file.

Any number of receivers can join independently, including mid-stream. Frames may arrive out of order, repeat, or be lost. The stream produces new repair equations rather than requiring every original frame. Only a receiver can confirm completion. Keep displaying until all receivers finish.

Use small files first. Payload capacity is 256 bytes/frame before recovery overhead: at the default 4 fps the ideal ceiling is approximately 1 KB/s. A 5 MB transfer can take well over 85 minutes. The size cap is a resource boundary, not a claim that large camera transfers are practical.

## Implemented

- Separate camera-less sender and camera/image receiver HTML artifacts.
- Independently written generation-based binary fountain coding, bounded to 32 source symbols per generation; not RFC 6330/RaptorQ and not compatible with other tools.
- Per-frame and whole-object CRC-32, a truncated object SHA-256 session identity, and full original-file SHA-256 verification.
- Optional gzip when it saves bytes; optional AES-256-GCM with PBKDF2-SHA256, 250,000 iterations, fresh salt and nonce.
- Pause/speed/fullscreen controls, reset, camera selection/cleanup, useful-symbol progress, explicit verified download, responsive layout, keyboard controls, and live status.
- Strict no-connect CSP, sender dependency audit, deterministic builds and SHA-256 manifests.

Brotli, dual lanes, paper export, and bidirectional transfer are not implemented. The original PRD's patent/licensing review remains unresolved; the experimental codec is not a legal design-around claim.

## Validation

`npm run check` runs ten protocol/QR/UI tests, builds both artifacts, and audits sender separation and script syntax. The UI integration test uses a DOM/canvas harness; it is not a substitute for a browser or physical camera.

Browser checks, including a real screenshot-to-receiver download, are provided separately:

```sh
npm install --no-save --package-lock=false playwright@1.58.0
npx playwright install chromium
npm run test:browser
```

See [verification evidence](docs/verification.md) for results and limits. GitHub Actions runs both layers and retains HTML builds and screenshots.

## Project documents

- [Original PRD](diode-prd.md), preserved unchanged
- [Research review](docs/research-review.md)
- [Architecture](docs/architecture.md) and [wire protocol](docs/protocol.md)
- [Milestone status](docs/milestones.md)
- [Security model](SECURITY.md)
- [Dependency provenance](vendor/README.md)

Original implementation is MIT licensed. Vendored code retains its original MIT/Apache-2.0 license. Repository: https://github.com/ahmed-145/diode-optical.
