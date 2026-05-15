#!/usr/bin/env bash
set -euo pipefail
PACK_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
RUN_ID="$(jq -r '.run_id' "$PACK_ROOT/inputs.json")"
HOST="$(hostname -s 2>/dev/null || hostname)"
BRIDGE="/Users/bigu/Private/signing-os-bridge/incoming/$HOST/history"
POST="$PACK_ROOT/artifacts/postconditions.json"
[ -r "$POST" ] || { echo "missing postconditions; run bin/postconditions first"; exit 1; }
STATUS="$(jq -r '.overall_status' "$POST")"
[ "$STATUS" = "PASS" ] || { echo "postconditions not PASS"; exit 1; }
HISTORY="$PACK_ROOT/history/$RUN_ID"
rm -rf "$HISTORY"
mkdir -p "$HISTORY/pack-manifests" "$HISTORY/canonical-artifacts" "$HISTORY/results" "$HISTORY/recovery-notes" "$HISTORY/audit" "$HISTORY/fe-release"
cp "$PACK_ROOT/PACK-MANIFEST.json" "$PACK_ROOT/READY-PACK-MANIFEST.json" "$PACK_ROOT/SHA256SUMS.txt" "$HISTORY/pack-manifests/"
for f in deployment.sepolia-thought.json txs.json post_state.json postconditions.json checks.thought.post.json; do cp "$PACK_ROOT/artifacts/$f" "$HISTORY/canonical-artifacts/"; done
cp -R "$PACK_ROOT/results/." "$HISTORY/results/"
cp -R "$PACK_ROOT/artifacts/fe-release/." "$HISTORY/fe-release/"
cat > "$HISTORY/README.md" <<EOF2
# THOUGHT Sepolia Deployment History

Run ID: $RUN_ID
EOF2
cat > "$HISTORY/QUALIFICATION.md" <<EOF2
# Qualification

Run ID: $RUN_ID
Network/lane: sepolia
Source commit: $(jq -r '.thought.repoCommit' "$PACK_ROOT/inputs.json")
Bundle hash: $(jq -r '.pack_hash' "$PACK_ROOT/PACK-MANIFEST.json")
Inputs SHA256: $(if command -v sha256sum >/dev/null 2>&1; then sha256sum "$PACK_ROOT/inputs.json"; else shasum -a 256 "$PACK_ROOT/inputs.json"; fi | awk '{print $1}')
Deploy signer: $(jq -r '.thought.deploySignerRef' "$PACK_ROOT/inputs.json")
ADMIN signer: $(jq -r '.path.adminSignerRef' "$PACK_ROOT/inputs.json") / $(jq -r '.path.admin' "$PACK_ROOT/inputs.json")
PATH dependency run id: $(jq -r '.path.runId' "$PACK_ROOT/inputs.json")
PATH NFT: $(jq -r '.path.pathNft' "$PACK_ROOT/inputs.json")
ThoughtNFT: $(jq -r '.thought_nft' "$PACK_ROOT/artifacts/addresses.sepolia.json")
Registry: $(jq -r '.thought_spec_registry' "$PACK_ROOT/artifacts/addresses.sepolia.json")
Final status: PASS
Qualified for: FE Sepolia candidate handoff
Not qualified for: mainnet
Known deviations: none recorded
Required next stages: sync FE release into inshell.art and run FE smoke tests
EOF2
(cd "$HISTORY" && find . -type f ! -name SHA256SUMS.txt -print0 | sort -z | xargs -0 shasum -a 256 > SHA256SUMS.txt)
mkdir -p "$BRIDGE"
DEST="$BRIDGE/$RUN_ID"
rm -rf "$DEST"
cp -R "$HISTORY" "$DEST"
echo "pushed deployment history to $DEST"
