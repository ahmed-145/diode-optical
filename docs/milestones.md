# Delivery status — experimental v0.3

| Item | Status |
| --- | --- |
| Independent framing and bounded multi-profile fountain codec | Implemented; automated tests pass |
| Late join, loss/reordering/duplicates, broadcast | Simulated tests pass, including periodic capture losses |
| Frame/object/file integrity gates | Implemented; corruption/size tests pass |
| Separate sender-only artifact | Implemented; encoder-only WASM, no receiver framing/scanner/worker, build audit passes |
| Sender and camera/image receiver UI | Implemented; simulated DOM/canvas integration passes |
| Gzip and passphrase encryption | Implemented; round-trip/wrong-passphrase/tamper tests pass |
| Standalone HTML and reproducible build | Implemented; deterministic hashes checked locally |
| Browser matrix + continuous synthetic video | New v0.3 suite configured for all six profiles and single/dual streaming; results pending. Historical v0.2 passed all three engines. |
| Actual two-device camera transfer | Not performed |
| iOS/Android/low-end device and lighting matrix | Not performed |
| Independent security/cryptographic review | Not performed |
| Freedom-to-operate and naming clearance | Unresolved |
| Raw binary, worker WASM scanner, WASM rendering, refresh-paced single/dual display | Implemented; local optical tests pass; browser verification pending |
| Brotli, paper export, bidirectional | Not implemented; deferred |

This implementation is a private experimental prototype built at the owner's explicit direction. It does not close the original PRD's unresolved legal review or satisfy a production release gate. See [verification evidence](verification.md).
