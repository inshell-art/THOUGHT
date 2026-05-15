#!/usr/bin/env bash
set -euo pipefail
PACK_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
HOST="$(hostname -s 2>/dev/null || hostname)"
BRIDGE="/Users/bigu/Private/signing-os-bridge/incoming/$HOST"
LATEST="$(ls -td "$PACK_ROOT"/results/* 2>/dev/null | head -1 || true)"
[ -n "$LATEST" ] || { echo "no results found"; exit 1; }
mkdir -p "$BRIDGE"
DEST="$BRIDGE/$(basename "$LATEST")"
rm -rf "$DEST"
cp -R "$LATEST" "$DEST"
echo "pushed latest result to $DEST"
