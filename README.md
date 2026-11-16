# Diode Optical

One-way file transfer over animated QR codes, for devices with radios off.

**Status: research and design. No application has been implemented.**

Repository name: `diode-optical`. Product working name: Diode; naming is not trademark-cleared.

- [Original PRD](diode-prd.md)
- [Research review](docs/research-review.md)
- [Architecture](docs/architecture.md)
- [Milestones](docs/milestones.md)
- [Security model](SECURITY.md)

The intended experience: choose a small file, display an animated QR stream, and scan it on one or more receivers. Receivers reconstruct and verify locally. A separate sender artifact excludes camera and receiver code. No backend, account, pairing, telemetry, or runtime CDN is planned.

The PRD makes freedom-to-operate review a pre-build requirement. It remains unresolved. No competitor source has been copied. A project license has not been selected; do not assume permission to reuse or distribute the material.

## Git repository

This workspace has a protected, nonfunctional `.git` directory. The portable initial history is `diode-optical.bundle`. Clone it to a writable location:

```sh
git clone /absolute/path/to/diode-optical.bundle diode-optical
cd diode-optical
```

After authenticating GitHub CLI, publish with:

```sh
bash scripts/publish-github.sh
```

This creates `diode-optical` as a private repository and pushes `main`. No GitHub repository has been created yet.
