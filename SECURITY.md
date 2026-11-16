# Security model

Experimental v0.1; not independently audited or certified. Do not treat this as a physical data diode.

The sender build contains no camera or receiver code. It cannot constrain the OS, extensions, other apps, peripherals, radios, microphones, or a compromised browser. CSP denies network connections, and hosted sender headers disable camera/microphone; those controls still depend on the browser and deployment.

Unencrypted optical payloads can be captured by anyone with line of sight. CRC detects corruption. The transmitted SHA-256 digest checks file integrity, not sender identity. Optional AES-256-GCM authenticates ciphertext under a passphrase-derived key; it does not identify a person, and weak passphrases permit offline guessing. There is no independent cryptographic review.

The receiver limits file/object size, metadata, generation width, active sessions and decompression output. It refuses mixed transfers, sanitizes filenames, requires integrity verification before save, treats bytes as opaque content, and never executes or renders incoming HTML. Received files can still be malicious when opened elsewhere. A hostile source can deny service or fill the one active session until reset.

No payload or camera data is intentionally persisted. Camera tracks are stopped on exit, hiding the page, reset, explicit stop and transfer completion. Files and passphrases may remain in process memory until the page closes; secure erasure in a browser is not guaranteed.

No supported production release, response-time commitment, or private reporting channel is configured. Do not post sensitive files or exploit details in public issues. Real camera compatibility, physical isolation, regulatory compliance, and patent freedom-to-operate remain unverified.
