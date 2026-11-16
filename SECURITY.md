# Security model

Planning repository only: no audited application or certified data diode exists here.

The proposed sender-only artifact limits this application's receive surface. It cannot constrain the OS, extensions, other applications, radios, microphones, peripherals, or a compromised browser. It provides no physical one-way enforcement.

Unencrypted QR streams can be captured by observers with line of sight. Checksums do not authenticate a sender. Received files may be unsafe to open; never execute them automatically.

A future receiver must bound sessions, allocation, decoding work, file sizes, and decompression; isolate sessions; reject malformed metadata; sanitize filenames; avoid persistent storage by default; and allow explicit download only after verification.

No supported release, response-time commitment, or private reporting channel is configured. Do not post sensitive files or exploit details publicly.
