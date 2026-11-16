# Delivery status — experimental v0.1

| Item | Status |
| --- | --- |
| Independent framing and bounded fountain codec | Implemented; automated tests pass |
| Late join, loss/reordering/duplicates, broadcast | Simulated tests pass |
| Frame/object/file integrity gates | Implemented; corruption/size tests pass |
| Separate sender-only artifact | Implemented; build audit passes |
| Sender and camera/image receiver UI | Implemented; simulated DOM/canvas integration passes |
| Gzip and passphrase encryption | Implemented; round-trip/wrong-passphrase/tamper tests pass |
| Standalone HTML and reproducible build | Implemented; deterministic hashes checked locally |
| Full Chromium UI test | Included in GitHub CI; sandbox cannot run a local server/browser |
| Actual two-device camera transfer | Not performed |
| iOS/Android/low-end device and lighting matrix | Not performed |
| Independent security/cryptographic review | Not performed |
| Freedom-to-operate and naming clearance | Unresolved |
| Brotli, dual lanes, paper export, bidirectional | Not implemented; deferred |

This implementation is a private experimental prototype built at the owner's explicit direction. It does not close the original PRD's unresolved legal review or satisfy a production release gate. See [verification evidence](verification.md).
