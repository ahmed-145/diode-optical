# Research review — 2026-11-16

## Assessment

The initial workspace contains only a 32,997-byte PRD: no code, dependencies, tests, or functional Git history. Preserve the PRD and prepare a private planning repository named `diode-optical`.

The strongest proposed differentiators are inspectable sender isolation, offline distribution, and a documented protocol. Demand for those features still needs validation. A camera-less application cannot enforce a physically one-way host.

## Verified findings and corrections

- [Qualcomm IETF disclosure 2554](https://datatracker.ietf.org/ipr/2554/) distinguishes devices implementing wireless wide-area standards from those that do not, with additional conditions. The PRD's inference that a browser app automatically qualifies for non-cellular treatment is unsupported: actual deployment devices and full terms need review. RFC 6330 is not marked cleared.
- [US12314808B2](https://patents.google.com/patent/US12314808B2/en) lists Livedrop BV as original/current assignee and records an assignment. Attribution for this patent is stronger than the PRD's circumstantial hypothesis. This does not independently verify every related family member or current legal status.
- [LiveDrop's company page](https://livedrop.eu/company/about-livedrop) describes offline optical communication with a defence/security focus. Offline positioning alone is insufficient differentiation.
- [QRFerry's repository](https://github.com/deedy/qr-data-transfer) describes browser transfer, RaptorQ, WASM, single/dual lanes, and layered CRCs. This supports feasibility; its throughput claims are not Diode benchmarks. No source code was copied.

## Unresolved source checks

Retrieval of US11049094B2 failed twice during this review; US12380300B2 also failed. Claim scope and legal status were not independently verified here. Obtain official claims, prosecution history, assignments, jurisdictions, status, and a professional claim chart before treating freedom to operate as resolved.

The PRD's AirDrop rollout, historical star trajectory, funding amount, and wallet compatibility list were not reverified. Do not republish them as fresh research. Naming availability and competitor licensing also remain unresolved.

## Engineering corrections

1. No camera import is an application boundary, not physical one-way enforcement. Other applications, peripherals, extensions, and the OS remain outside it.
2. CRC detects accidental corruption. SHA-256 checks content against an expected digest; an unauthenticated digest carried in the same stream does not prove sender identity. Authentication needs separately trusted information or an appropriate cryptographic design.
3. Anyone with line of sight can capture an unencrypted stream. Air-gapped does not mean confidential.
4. Do not assume native browser Brotli compression. Start with identity plus feature-detected gzip; assess a vendored Brotli codec and its license separately. Retain compression only when total encoded size shrinks.
5. A downloadable sender HTML file does not establish that mobile camera permissions work offline from `file://`. Test the actual receiver distribution and secure-context strategy.
6. Fountain reception tolerates loss but cannot guarantee completion under arbitrary loss. The sender has no completion feedback; display playback statistics rather than simulated receiver progress.

## Decision

Original recommendation: resolve the PRD's pre-build review before implementation. The owner subsequently explicitly directed implementation of an experimental prototype. That work now exists; the original PRD is preserved, and legal clearance remains unresolved. The independent fountain codec is not a claim of patent avoidance. Do not call the prototype hardened or production-ready based on source scanning alone.
