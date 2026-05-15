#!/usr/bin/env bash
set -euo pipefail
PACK_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
HOST="$(hostname -s 2>/dev/null || hostname)"
DEV_OS_SSH="${DEV_OS_SSH:-bigu@192.168.0.104}"
DEV_OS_BRIDGE_INCOMING="${DEV_OS_BRIDGE_INCOMING:-/Users/bigu/Private/signing-os-bridge/incoming}"
LATEST="$(ls -td "$PACK_ROOT"/results/* 2>/dev/null | head -1 || true)"
[ -n "$LATEST" ] || { echo "no results found"; exit 1; }
command -v ssh >/dev/null 2>&1 || { echo "missing required tool: ssh"; exit 1; }
command -v rsync >/dev/null 2>&1 || { echo "missing required tool: rsync"; exit 1; }
ssh "$DEV_OS_SSH" "mkdir -p '$DEV_OS_BRIDGE_INCOMING/$HOST'"
DEST="$DEV_OS_SSH:$DEV_OS_BRIDGE_INCOMING/$HOST/$(basename "$LATEST")/"
rsync -a --delete "$LATEST/" "$DEST"
echo "pushed latest result to $DEST"
