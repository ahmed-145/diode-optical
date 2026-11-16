# Delivery milestones

All work below is open; these are acceptance criteria, not completed features.

## 0 — Prerequisites

- Record freedom-to-operate and deployment-device licensing decisions, with jurisdictional scope.
- Select project license and record dependency licenses/provenance.
- Finalize protocol byte layout, resource limits, compatibility policy, and threat model.
- Evaluate QR and fountain libraries without copying unlicensed competitor code.

Exit: recorded decisions and reproducible dependency evaluation.

## 1 — Transfer core

Implement framing, object validation, compression selection, and fountain adapter. Test deterministic fixtures, empty files, Unicode names, arbitrary bytes, duplicates, reordering, loss, late joins, mixed sessions, corruption, and bounds. Include actual QR renderer-to-scanner round trips. Reject invalid lengths, excessive allocations/decompression, unsupported versions, and checksum mismatch.

Exit: byte-identical round trips and bounded failures for hostile input.

## 2 — Sender and receiver

Build file selection, QR playback/pause and density controls, camera selection/cleanup, reception status, and verified download. Produce and audit a separate sender artifact. Sender shows playback statistics only; receiver shows unique valid symbols and reconstruction state.

Exit: actual two-device transfer and one-sender/two-receiver broadcast without feedback or pairing.

## 3 — Offline release

Pin toolchain and dependencies; publish hashes and a reproducible build recipe. Verify runtime network silence, sender isolation, keyboard controls, status announcements, and interrupted transfers.

Test ~10 KB, ~500 KB, and ~5 MB files on iOS Safari, Android Chrome, and a lower-end device under bright/dim lighting. Record exact device/browser versions, successes/attempts, completion time, memory, scan rate, and failures. Verify offline camera behavior using actual distribution artifacts.

Exit: measured support matrix and documented limits. Synthetic tests alone do not establish hardware reliability or production readiness.
