#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
if ! git rev-parse --show-toplevel >/dev/null 2>&1; then
  echo 'Clone diode-optical.bundle into a writable directory first; see README.md.' >&2
  exit 1
fi
gh auth status --hostname github.com >/dev/null
test "$(git branch --show-current)" = main || { echo 'Switch to main before publishing.' >&2; exit 1; }
test -z "$(git status --porcelain)" || { echo 'Commit or stash changes before publishing.' >&2; exit 1; }
if git remote get-url origin >/dev/null 2>&1; then
  origin_url=$(git remote get-url origin)
  case "$origin_url" in
    *.bundle) git remote rename origin source-bundle ;;
    *) echo 'An origin remote already exists; inspect it before publishing.' >&2; exit 1 ;;
  esac
fi
gh repo create diode-optical --private --description 'Research and design for offline one-way file transfer over animated QR codes' --source . --remote origin --push
