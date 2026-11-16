# Diode
### Air-gapped, serverless file transfer over animated QR — for when radios are off, forbidden, or absent

**Product Requirements Document — Draft v0.1**
Prepared: August 7, 2026 · Status: Exploratory, pre-build, research-backed · Owner: TBD

---

## Table of Contents
1. Executive Summary
2. Background & Origin
3. Problem Statement
4. Market & Competitive Research
5. Goals & Non-Goals
6. Target Users
7. Product Scope — V1
8. Functional Requirements
9. Non-Functional Requirements
10. Roadmap
11. Success Metrics
12. Risks & Open Questions
13. Sources

---

## 1. Executive Summary

This PRD was triggered by watching an open-source project — [deedy/qr-data-transfer](https://github.com/deedy/qr-data-transfer) ("QRFerry") — go from 13 to 400+ GitHub stars in the span of one research session. That's a live signal that "move a file between two devices with a QR code" still has real pull. The research pass behind this document tried to find the sharpest, most defensible version of that idea rather than the most obvious one, and two findings changed the plan significantly:

- **The mainstream pain point is closing.** Google reverse-engineered AirDrop and is rolling out cross-platform Android↔Apple sharing through all of 2026, already reaching Samsung, and announced for Oppo, OnePlus, Vivo, Xiaomi, and Honor. "I can't wirelessly send my friend a photo" is rapidly stopping being a universal problem. Building a general AirDrop competitor in 2026 is swimming against a current Google and Apple are both paddling for you.
- **The obvious "unique" feature is already patented.** The instinct to make this bidirectional — two phones face-to-face, swapping in one motion — is good UX instinct, but US Patent 11,263,414 already claims almost exactly that mechanism (face-to-face devices, alternating payload/ACK barcodes, deadlock resolution when both try to send at once, full-duplex mode). It's also been demonstrated academically at least three times since 2016.
- **Patent activity isn't confined to the bidirectional idea — and it's more specific than "be careful."** A verification pass turned up a real, funded competitor: LiveDrop B.V., a Dutch company already selling a "software data diode" built on this exact optical mechanism, holding a 2023-priority patent family on the throughput optimizations. A separate, broader patent (US 11,049,094, Digimarc) claims the closer-to-core combination of erasure codes with sequential barcode display. Encouragingly, RFC 6330 itself — checked directly against Qualcomm's IETF filing — is not the problem; Qualcomm has disclosed it will not assert those patents against non-cellular devices.

The resulting thesis: **don't compete with AirDrop on convenience — compete with hardware data diodes, and now with LiveDrop, on openness and price**, using the plain, long-established fountain-coded animated-QR pattern that QRFerry and a decade of Bitcoin hardware wallets have already proven out. V1 is a one-way, verifiably-camera-less "hardened" transfer mode aimed at people who keep radios off on purpose (security-conscious devs, makers, journalists, anyone with an air-gapped box), not a mass-market swap app. A freedom-to-operate check — centered on the Digimarc and LiveDrop patents specifically — is a **pre-build** requirement for V1. See §4.5, §4.6, §4.7, and §12.

---

## 2. Background & Origin

### 2.1 The spark
[QRFerry](https://github.com/deedy/qr-data-transfer) moves a file from one browser tab to another as a live animated QR stream, with no server in the middle. Technically, it's a lot more than a "blink some QR codes" script:

- **RaptorQ fountain codes** (RFC 6330) mean the receiver doesn't need frames in order or complete — it needs *enough* unique symbols total, so blur, drops, and late joins don't kill a transfer.
- **Dual-lane rendering**: on Turbo 60, two QR codes alternate on a 60Hz screen so one lane is always fully "settled" whenever the camera's exposure window lands, pushing throughput past what a single flickering QR could reliably deliver. The most aggressive "1 Mbps lab profile" claims ~1.4 Mbps.
- **All WASM**: QR rendering (fast_qr), scanning (ZXing-C++), and the fountain codec run client-side, with checksums layered at the frame, object, and file level.

At the time of research, the repo's root page had **no LICENSE file**, meaning default all-rights-reserved copyright applies — a reminder that anything built here should be an independent implementation, not a fork presented as original work.

### 2.2 The star count, for the record
Because it came up mid-research: this repo's GitHub star count moved from 13 (a cached page fetch) → 125 (a search-index snapshot taken sometime after) → 416–419 (a fresh, live fetch) over the course of this conversation. The repo's author, Debarghya "Deedy" Das, has roughly 220K followers on X and a track record of posts going wide — the near-certain explanation is a viral tweet, not organic GitHub discovery. Worth noting only because it's a genuine, current market signal: **this category has real, active pull right now**, not hypothetical interest.

---

## 3. Problem Statement

Moving data between two devices that share *no* trusted network path is still clunkier than it should be:

| Method | Breaks down when… |
|---|---|
| USB / microSD | Physical logistics; drive compatibility; itself a malware bridge vector many air-gap policies explicitly ban |
| Bluetooth / Wi-Fi / NFC | Radios are physically disabled, policy-banned, jammed, or simply not present on the hardware (kiosks, embedded devices, older machines) |
| Email / cloud upload | Requires a network path to a third party — precisely what these situations are trying to avoid |
| Existing animated-QR tools (QRFerry and predecessors) | Solve one-way sender→receiver well, but offer no *verifiable* one-way guarantee, no broadcast-to-many, and are positioned generically in a way that increasingly competes with a shrinking pain point (see §4.3) |

The gap isn't "nobody has done animated QR transfer." It's: **nobody has taken this specific, well-proven technique and pointed it at the audience that actually still needs it** — people who've deliberately taken radios out of the equation, not people who'd rather AirDrop already worked.

---

## 4. Market & Competitive Research

### 4.1 Direct prior art — animated/optical QR transfer

| Project | Approach | Throughput | Status (as researched) | Notable technique |
|---|---|---|---|---|
| **QRFerry** (deedy/qr-data-transfer) | Browser, one-way | ~1.4 Mbps aggressive lab profile | Active, suddenly viral | RaptorQ fountain codes, dual-lane 60Hz alternation, all-WASM |
| **txqr** (divan) | Library/protocol, one-way | Not benchmarked here | Earlier-generation; cited directly as inspiration by later projects | Foundational fountain-coded animated QR |
| **qrxfer** (leonjza) | Python/OpenCV/Zbar CLI, one-way | Not benchmarked; author notes handheld capture is error-prone | Small hobby tool | Built explicitly for air-gapped machines, screen-to-screen or screen-to-phone |
| **qram** (Digital Bazaar) | JS library, one-way | Configurable fps | Library, not an app | Fountain-coded streaming QR encoder/decoder for embedding elsewhere |
| **Cimbar** | Browser/WASM, one-way | Targets ~800 kbit/s (100 KB/s) | Live web build at cimbar.org, installable as offline PWA | Swaps QR's monochrome modules for colored tiles to push past QR's density ceiling |
| **mohankumarelec/airgapped-qr-code-transfer** | Vue.js, one-way | Not benchmarked | Small hobby tool | gzip + qrcode.js + zbar-wasm, same core pattern |

**Takeaway:** the one-way pattern is thoroughly explored. Throughput records are already being chased by multiple projects. Racing QRFerry on raw Mbps is a narrow, already-crowded fight.

### 4.2 The crypto hardware-wallet vertical already proved this pattern for a decade

Bitcoin air-gapped signing has quietly been the proving ground for exactly this technology. Blockchain Commons' **Uniform Resources (UR)** format (spec BCR-2020-005) uses Luby-transform fountain codes to build animated QRs specifically so a scan can start on any frame and survive missed ones — solving what the community calls "the NASCAR problem" of every hardware wallet needing bespoke integration. It's in production in **Keystone 3 Pro, ELLIPAL Titan 2.0, NGRAVE ZERO, and SeedSigner**. Coldcard uses a rival format called **BBQr** with a different error-correction approach; Sparrow Wallet auto-detects which one to speak depending on the connected device. MicroSD remains the fallback for hardware that doesn't want a camera at all.

**Takeaway:** fountain-coded animated QR isn't experimental — it's a boring, decade-refined, production-proven pattern in a vertical that cares enormously about not losing money to a dropped frame. That derisks the *technical* core of this PRD considerably. It also means "PSBT signing" specifically is already extremely well served — general-purpose file transfer is the underserved angle, not crypto signing.

### 4.3 Why not just wait for Bluetooth/Wi-Fi/NFC to solve this? (Key pivot #1)

Two data points, one historical and one very current:

**Bump (2009–2014)** proved the demand for "one motion, mutual exchange" — tap two phones together, swap contact info and files. It hit 150M+ installs, was Apple's #8 all-time free app, and Google acquired it for roughly $35M in September 2013. Google shut it down four months later, in January 2014 — TechCrunch's contemporaneous reporting points to Apple's AirDrop (launched with iOS 7) having already eaten its reason to exist. Bump also wasn't peer-to-peer: it matched simultaneous "bump" events server-side using accelerometer and location data, not an optical or direct radio channel.

**AirDrop/Quick Share interoperability (2026)** is the more urgent data point. Google confirmed it reverse-engineered AirDrop's protocol (built in memory-safe Rust, independently assessed by NetSPI as notably strong) and shipped cross-platform Android↔Apple sharing starting with the Pixel 10 line in November 2025. Through 2026 it's expanding to Samsung's Galaxy S26 line (March), and Google has since named Oppo, OnePlus, Vivo, Xiaomi, and Honor as coming, alongside Qualcomm Snapdragon-level support. The single biggest reason someone downloads a "sharing app" today — *my friend has the wrong kind of phone* — is actively being dissolved by both platform owners simultaneously.

**Implication:** a general "swap files between any two phones" product is now competing with a free, built-in, zero-friction OS feature that's actively expanding its device coverage. Positioning this as an AirDrop alternative for the mainstream case is a losing bet. The defensible ground is the case OS-level radio sharing structurally *cannot* cover: radios that are off, disabled, policy-banned, jammed, or physically absent.

### 4.4 The high-end analog this can sit underneath: hardware data diodes

"Guaranteed one-way data flow" is already a real, established, well-funded market — just not a cheap one. Enterprise data diodes (Owl Cyber Defense, Everfox, Advenica, and others) enforce unidirectional flow with fiber optics: a transmitter on the secure side, a receiver on the untrusted side, and the simple physical fact that light can't travel backward from a photodetector to an LED. They cost **tens to hundreds of thousands of dollars per unit** and exist to satisfy standards like NERC-CIP and IEC 62443 in critical infrastructure and defense. OPSWAT's cheaper "Fend" line was specifically validated by the DoD's ESTCP program as a lower-cost alternative to six-figure legacy diodes, with a claimed ROI inside six months versus manual data-carrying processes (yes, people still burn DVDs for this).

**Implication:** there's proven willingness to pay real money for "physically cannot flow backward." A browser-based, code-auditable, effectively-free tool that gives a *software-verifiable* (not physics-enforced, and said honestly) version of that guarantee has a legitimate home — not as a replacement for certified hardware in classified or regulated environments, but as the accessible option for personal projects, dev/test benches, small businesses, and makers who currently have no option between "trust a Bluetooth toggle" and "spend $30K."

### 4.5 IP flag: bidirectional simultaneous exchange is not a clean differentiator (Key pivot #2)

The most obvious "make it more unique" idea — two devices face-to-face, screens and cameras both active, swapping in one motion — turns out to be well-trodden ground:

- **Academic prior art**: "ColorQR" (RGB-multiplexed bidirectional QR, full file-exchange app), "MAMBA" (adaptive bidirectional camera-display framework with fast feedback), and an IEEE paper demonstrating a full-duplex screen/camera system at ~60 kbps — all predate this PRD by years.
- **US Patent 11,263,414** ("Bidirectional data exchange across devices via barcodes") claims, in detail: two face-to-face devices each displaying and capturing 2D barcodes; an ACK-barcode handshake that advances the payload sequence; explicit **deadlock resolution** (random-countdown role negotiation) for when both devices try to send at once; a full-duplex mode where both sides send substantial payload simultaneously; device-ID allowlisting; and encryption of the payload. This is close to a complete claim map of the feature as originally imagined.

**Implication:** this is not disqualifying for the *idea* — it confirms the idea is good enough that others reached it independently, twice, in academia, and once, formally, in a patent filing. But it means bidirectional exchange cannot be this product's headline claim, and building it for anything beyond personal/non-commercial use needs real patent counsel, not a PM's judgment call. One design-around *hypothesis* worth having a lawyer evaluate: the patent's claims center heavily on an ACK-barcode-driven handshake and deadlock resolution; a version that instead runs two independent, blind, simultaneous fountain-code broadcasts (no per-packet ACK barcode, no deadlock state machine, each side just declares itself done when its own incoming stream checksums out) may sit outside the claimed mechanism. That is a hypothesis for counsel to test, not a conclusion this document is making.

### 4.6 IP flag #2: V1's own "make it good" optimizations are recently and specifically patented — by a real, funded, direct competitor

A second, more targeted search — because the base assumption in §4.5 (that the *one-way* case was clean) hadn't actually been checked — found a nearer problem, then a bigger one, then some good news buried in the same search. In order of how much they matter:

- **The 2023-priority patent family is very likely LiveDrop's, not an anonymous filing.** US 12,314,808 and US 12,380,300 ("Unidirectional transfer of data from sender to receiver") claim motion-adaptive barcode marker search and unequal color-channel data allocation — optimizations any competent engineer would naturally reach for. LiveDrop B.V. is a real, VC-funded (~$2.5M seed, 2025) Dutch company, founded 2021 in Eindhoven, whose entire product **is** a "software-based data diode" using exactly this screen-to-camera optical mechanism, marketed directly at the defense/security/healthcare buyers this PRD's V1 targets, with EU priority filings consistent with this patent family's European origin. This wasn't independently confirmed at the bibliographic-assignee level, but the circumstantial match is strong. **This is the more important finding: it's not just a patent, it's a funded, active, direct competitor already selling into this exact niche.** Worth a direct look at [livedrop.eu](https://livedrop.eu) before writing another line of this PRD's V1 scope.
- **A separate, broader patent is the real headline risk.** US 11,049,094 (Digimarc Corporation, granted 2021) claims an apparatus where a camera captures sequential graphics on a display, "each of the graphics comprises an output from an **erasure code generator**," and the receiver decodes and reconstructs a payload from those outputs. That is a close match to fountain-coded animated QR as a general mechanism — closer than the LiveDrop family, which is narrower (specific optimizations, not the base erasure-code-plus-sequential-barcode idea). One nuance worth flagging: this patent's lineage traces back through Digimarc filings about virtual-wallet and point-of-sale payment communication, not file transfer per se, which could matter for how a court would construe it — but the claim text itself is written broadly enough not to be obviously limited to payments. Treat this as the most consequential single item for counsel to look at.
- **RFC 6330 turned out to be less of a problem than either research pass first suggested.** Qualcomm's actual IPR disclosure on RFC 6330 (IETF disclosure #2554, verified directly against the datatracker) has two clauses: devices that implement a wireless wide-area standard get a paid license at standard rates; devices that **do not** implement a wireless wide-area standard get an explicit **covenant that Qualcomm will not assert its patents at all**. A browser-based QR tool has no cellular radio — it falls in the second, favorable bucket. Plain RFC 6330 fountain coding is not the risk here; the LiveDrop and Digimarc claims above are.

None of this touches the *base concept* of transferring data via sequential barcodes — that's old and unownable, with roots in a 1990s Nilsen one-way optical patent and academic prior art. **What's patented is the specific machinery**: LiveDrop's optical optimizations, and Digimarc's fountain-code-plus-sequential-barcode combination.

**Implication:** the single highest-priority item for a real freedom-to-operate search is now the Digimarc claim, with LiveDrop's active commercial position a close second (as competitive intelligence as much as IP risk). RFC 6330 itself is workable for a non-cellular device based on Qualcomm's own disclosed terms — this document was wrong to imply otherwise in an earlier draft. See §12.

### 4.7 A note on verifying this section

Everything in §4.5–4.6 was checked against primary sources — the actual patents, the actual IETF disclosure, the actual company — not taken on faith from either research pass that produced it. That's worth surfacing explicitly: a fluent, well-organized research report (from any source, including this one) can be substantially right about *what exists* while still being wrong about *what it means*, in ways that read as equally confident either way. The corrected RFC 6330 point above is a direct example — the source document was real, correctly located, and still led to the opposite of the right practical conclusion until read in full. Treat every synthesized research document, including this one, accordingly.

---

## 5. Goals & Non-Goals

**Goals**
- Ship a one-way, browser-based, fountain-coded animated-QR transfer tool with a *verifiably* camera-less build mode.
- Make the one-way guarantee inspectable, not just asserted — someone should be able to look at what's running (or the diff between builds) and confirm there's no receive path.
- Support one-sender-to-many-receivers broadcast, since fountain codes make this nearly free.
- Be positioned and marketed for radio-off/radio-denied contexts, explicitly not as a general AirDrop/Quick Share alternative.

**Non-Goals (V1)**
- Not a certified replacement for regulated critical-infrastructure data diodes (no NERC-CIP/Common Criteria/N3-equivalent certification is in scope).
- Not a bidirectional/simultaneous exchange tool — deferred pending patent review (§4.5).
- Not chasing QRFerry's throughput record as a primary metric; reliability and trust matter more than peak Mbps for this audience.
- Not a general consumer "share a photo with a stranger" app.

---

## 6. Target Users

1. **The security-conscious builder** — runs a genuinely air-gapped box (a signing machine, a forensics workstation, an ICS/OT test bench) and currently uses USB sticks or DVDs out of policy, not preference. Wants something cheaper and more convenient than a hardware diode, and is comfortable auditing code.
2. **The privacy-conscious individual** — journalist, researcher, or traveler who keeps Bluetooth/Wi-Fi off as a matter of practice and needs to move something between two of their own devices, or hand something to a source, without ever enabling a radio.
3. **The presenter/educator** — wants to broadcast something small (a Wi-Fi password, a handout, a slide PDF) to a room of people whose devices they don't control, without anyone joining a network or accepting a Bluetooth pairing prompt.
4. **The maker/hobbyist** — drawn in by the same "huh, that's clever" energy that made QRFerry go viral; not the primary business case, but a real acquisition and credibility channel (see §11).

---

## 7. Product Scope — V1

**Sender flow:** pick a file → compress (try both Brotli and gzip, keep the smaller) → fountain-encode → render as a single-lane animated QR with a progress readout. Dual-lane high-throughput rendering is a stretch goal, not a launch blocker.

**Receiver flow:** open the scan page → grant camera access → auto-detect the stream → reconstruct progressively as symbols arrive → verify checksum → save. Can join mid-stream and tolerate blur/drops, inherited directly from the fountain-code approach validated in §4.1–4.2.

**The headline feature — the Diode Build:** a separate, clearly-labeled build (or even a physically separate device/tab) that has **no camera-access code compiled into it at all** — not "ignores incoming frames," but structurally incapable of receiving. The value proposition is that the guarantee is checkable: open the bundle, see there's no camera permission request possible, no decode path in the source. This is what makes the security persona's trust bar achievable without needing them to just take the product's word for it.

**Zero-server, then zero-network:** runs entirely client-side like QRFerry; the reach goal is a single downloadable HTML file that, once saved, needs no network access ever again — meaningful for the highest-trust use cases where even the *initial* page load over the internet is a concern.

---

## 8. Functional Requirements

| ID | Requirement | Priority |
|---|---|---|
| FR-1 | Encode an arbitrary file into a fountain-coded, checksummed animated QR stream | P0 |
| FR-2 | Decode a scanned stream progressively, tolerating out-of-order/dropped/blurred frames | P0 |
| FR-3 | Verify integrity at frame, object, and whole-file level before allowing save | P0 |
| FR-4 | Ship a "Diode Build" with no camera/decode code path present in the bundle | P0 |
| FR-5 | Support mid-stream join (a late-arriving receiver doesn't need to wait for frame 1) | P0 |
| FR-6 | Broadcast mode: one sender stream, unlimited concurrent receivers, no pairing step | P1 |
| FR-7 | Compress before encoding (Brotli/gzip, smaller of the two) | P1 |
| FR-8 | Optional passphrase-based client-side encryption of the payload before it ever becomes a QR frame | P1 |
| FR-9 | Dual-lane or higher-throughput rendering mode for larger payloads | P2 |
| FR-10 | Printable "cold" export: tile the fountain-coded blocks into a multi-page PDF for paper backup | P2 (someday/maybe) |

---

## 9. Non-Functional Requirements

- **Performance:** define real targets only after prototyping against representative payloads (a ~10 KB config/contact file, a ~500 KB document, a ~5 MB image) across a small device/lighting matrix — resist the urge to promise a Mbps number before it's measured on this project's own implementation.
- **Security & privacy:** zero network calls after initial load, verifiable in browser devtools; open source; ideally a reproducible build so the shipped artifact can be checked against source.
- **Compatibility:** modern mobile browsers with camera access as the baseline (iOS Safari, Android Chrome); older/lower-end devices are explicitly part of the target audience (§6.1), so test on hardware below flagship tier, not just the newest phones.
- **Accessibility:** be honest that this entire category is visually driven and inherently difficult for blind or low-vision users — a real, unsolved limitation across every project in §4.1, worth flagging rather than glossing over, with status/progress at minimum exposed to screen readers even if the core exchange can't be.

---

## 10. Roadmap

- **Pre-V1:** Freedom-to-operate search covering §4.5–§4.7, centered on the Digimarc (US 11,049,094) and LiveDrop-family patents specifically. This gates the roadmap at the top, not partway through it — the Digimarc claim reaches close enough to the base erasure-code-plus-sequential-barcode mechanism that even a "plain" V1 needs this cleared, not just the optimization layer.
- **V1 (MVP):** One-way transfer, Diode Build, mid-stream join, integrity verification (FR-1–FR-5) — built on RFC 6330 fountain coding (cleared per §4.6) and straightforward full-frame QR scanning, deliberately avoiding LiveDrop's motion-adaptive search and color-channel tricks until FTO clears them specifically.
- **V1.1:** Broadcast mode, compression, optional encryption (FR-6–FR-8).
- **V2:** Higher-throughput rendering behind a flag (FR-9) — this is exactly where §4.6's patent family lives, so it's gated on the same FTO search, not a separate future check; evaluate a ggwave-style audio backchannel (~8–16 bytes/sec — far too slow for payload, plenty for "done"/"go denser" signaling) as an opt-in enhancement, only if blind fountain broadcast proves insufficient in practice.
- **V3 — exploratory, patent-gated:** Bidirectional simultaneous exchange. Do not begin implementation without patent counsel review of US 11,263,414 and related claims (§4.5).
- **Someday/maybe:** Cold/paper backup export (FR-10) — a genuinely different value prop (durability, no electronics needed at read-time) worth its own small spec later.

---

## 11. Success Metrics

- **Reliability:** % of test transfers completing without manual restart, across the device/lighting matrix defined in §9.
- **Time-to-completion** for the three representative payload sizes in §9, once real targets are set post-prototype.
- **Trust signal:** engagement from security-conscious communities (the audience QRFerry's own viral moment demonstrated is watching this space) — treated as a directional signal, not a KPI to chase for its own sake.
- **Diode Build adoption specifically** — if usage skews toward the hardened one-way mode over general two-way-capable use, that's confirmation the niche positioning (§4.3) is the right one.

---

## 12. Risks & Open Questions

- **Patent risk is a pre-build item now, not a pre-V3 item — and it's sharper than first flagged.** The load-bearing item is US 11,049,094 (Digimarc), whose "erasure code generator + sequential graphics" claim sits close to the core mechanism, not just an optimization layer. Close behind it: LiveDrop B.V., a real funded competitor whose patent family (§4.6) covers the specific optimizations. RFC 6330 itself is not the risk — verified directly against Qualcomm's IETF disclosure, which favors non-cellular implementers. None of this is legal clearance; it needs an actual freedom-to-operate search and counsel before meaningful build investment.
- **A few secondary claims from the research process remain unverified**, flagged rather than asserted: an assignee claim on US 9,306,906, a cited 2008 IEEE paper ("VCode"), an open-source project referred to as "FrameSend," and a claimed Tahoe-LAFS mailing-list discussion of RFC 6330. None of these change the picture above, but none should be repeated as fact without independently checking them first.
- **Trust bar:** will the security-conscious target user actually trust a browser/WASM tool with sensitive data without an independent audit? May require a fully offline-capable single-file distribution and a signed, reproducible build before this audience takes it seriously — worth user-testing with actual security practitioners before over-building.
- **Camera/display heterogeneity:** the same hard, unglamorous problem every project in §4.1 has had to fight — autofocus behavior, aspect ratios, older hardware. No project has fully solved it; budget real time for it.
- **Shrinking mainstream relevance:** §4.3's AirDrop/Quick Share finding is dated August 2026 and the rollout is ongoing — re-check this landscape before any V1.1+ planning, since the competitive picture is actively moving.
- **A funded, direct competitor already exists.** LiveDrop B.V. (§4.6) isn't just a patent risk — it's evidence this exact niche is investable and already has a well-positioned entrant with a head start on defense/government relationships. Worth a proper competitive teardown, not just a patent check.
- **Naming:** "Diode" is a working placeholder, not cleared — check trademark availability in relevant classes before public launch (and note "Diode" invites confusion with the hardware-diode category LiveDrop and others already occupy).
- **Provenance:** the inspiration repo (QRFerry) had no LICENSE file at time of research — a reminder to keep this project's own implementation independently written and its own licensing unambiguous from day one.

---

## 13. Sources

- [deedy/qr-data-transfer (QRFerry)](https://github.com/deedy/qr-data-transfer) — GitHub
- [txqr](https://github.com/divan/txqr), [qrxfer](https://github.com/leonjza/qrxfer), [qram](https://github.com/digitalbazaar/qram), [Cimbar](https://cimbar.org) — prior-art projects
- [Blockchain Commons — Animated QRs](https://developer.blockchaincommons.com/animated-qrs/) and [UR overview](https://github.com/BlockchainCommons/crypto-commons/blob/master/Docs/ur-overview.md)
- [Coldcard — Air-Gap Signing Methods](https://coldcard.com/learn/advanced-concepts/air-gap-signing-methods) (BBQr vs. UR)
- [Bump (application) — Wikipedia](https://en.wikipedia.org/wiki/Bump_(application)); [TechCrunch, Dec 2013](https://techcrunch.com/2013/12/31/google-to-close-bump-and-flock-its-recently-acquired-file-sharing-apps/)
- [9to5Google, May 2026 — AirDrop/Quick Share expansion](https://9to5google.com/2026/05/12/google-bringing-airdrop-support-most-android-phones-later-this-year/); [WinBuzzer, Feb 2026](https://winbuzzer.com/2026/02/06/android-airdrop-file-sharing-expansion-2026-xcxwbn/)
- [OPSWAT — Data Diodes at a Fraction of the Cost](https://www.opswat.com/blog/data-diodes-delivering-air-gap-security-at-a-fraction-of-the-cost); [Advenica — Data diodes vs. air gaps](https://advenica.com/learning-centre/articles/data-diodes-an-effective-alternative-to-airgaps/)
- US Patent [11,263,414](https://image-ppubs.uspto.gov/dirsearch-public/print/downloadPdf/11263414) — "Bidirectional data exchange across devices via barcodes"
- ColorQR and MAMBA (bidirectional camera-display communication) — via ResearchGate; IEEE Xplore, ["Bidirectional Communication System with Screen based Transmission and Camera based Reception of QR Encoded Information"](https://ieeexplore.ieee.org/document/9058167)
- US Patent [12,314,808](https://image-ppubs.uspto.gov/dirsearch-public/print/downloadPdf/12314808) and [12,380,300](https://image-ppubs.uspto.gov/dirsearch-public/print/downloadPdf/12380300) — "Unidirectional transfer of data from sender to receiver" (2023 priority)
- US Patent [11,206,696](https://patents.justia.com/patent/11206696) — "Unidirectional field device data transfer" (via Justia); US Patent [9,081,520](https://image-ppubs.uspto.gov/dirsearch-public/print/downloadPdf/9081520) — references the 1990s Nilsen one-way optical link patent (US 5,703,562) as prior art; US Patent family beginning [9,306,906](https://image-ppubs.uspto.gov/dirsearch-public/print/downloadPdf/10182075) — "unidirectional inter-host communication in an air gap environment" (2013–2014 priority)
- Medium/Volume Labs, ["Jumping the Gap — Data Transmission Over An Air Gap"](https://medium.com/volume-labs/jumping-the-gap-data-transmission-over-an-air-gap-cc00e765b0bd)
- US Patent [11,049,094](https://patents.google.com/patent/US11049094B2/en) (Digimarc Corporation) — "Methods and arrangements for device to device communication"
- [LiveDrop](https://livedrop.eu) — [company page](https://www.livedrop.eu/company); [PetaPixel coverage](https://petapixel.com/2025/03/09/livedrop-wirelessly-moves-data-using-dynamic-qr-codes-and-cameras/); [seed round announcement, BusinessWire](https://www.businesswire.com/news/home/20250619579442/en/LiveDrop-Raises-$2.5-Million-in-Oversubscribed-Defense-Focused-Seed-Round)
- IETF Datatracker — [QUALCOMM Incorporated's Statement about IPR related to RFC 6330](https://datatracker.ietf.org/ipr/2554/) (disclosure #2554)

