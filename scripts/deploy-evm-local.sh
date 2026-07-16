#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
EVM_DIR="$ROOT_DIR/evm"
ADDRESSES_FILE="$EVM_DIR/addresses.anvil.json"
RPC_URL="${RPC_URL:-http://127.0.0.1:8545}"
PRIVATE_KEY="${PRIVATE_KEY:-}"
PATH_NFT_ADDRESS="${PATH_NFT_ADDRESS:-}"
CONFIGURE_PATH_MOVEMENT="${CONFIGURE_PATH_MOVEMENT:-1}"
THOUGHT_MOVEMENT_QUOTA="${THOUGHT_MOVEMENT_QUOTA:-1}"
THOUGHT_SPEC_NAME="${THOUGHT_SPEC_NAME:-THOUGHT.v2.md}"
THOUGHT_SPEC_FILE="${THOUGHT_SPEC_FILE:-$ROOT_DIR/specs/$THOUGHT_SPEC_NAME}"
THOUGHT_SPEC_REF="${THOUGHT_SPEC_REF:-$THOUGHT_SPEC_NAME}"
THOUGHT_PROTOCOL_MANIFEST_FILE="${THOUGHT_PROTOCOL_MANIFEST_FILE:-$ROOT_DIR/protocol/releases/v2/release.manifest.draft.json}"
THOUGHT_PROTOCOL_MANIFEST_URI="${THOUGHT_PROTOCOL_MANIFEST_URI:-}"
MAX_THOUGHT_SPEC_BYTES="${MAX_THOUGHT_SPEC_BYTES:-20000}"
THOUGHT_REGISTRY_OWNER="${THOUGHT_REGISTRY_OWNER:-}"
THOUGHT_REGISTRY_OWNER_PRIVATE_KEY="${THOUGHT_REGISTRY_OWNER_PRIVATE_KEY:-$PRIVATE_KEY}"

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing required command: $1" >&2
    exit 1
  fi
}

require_cmd cast
require_cmd forge
require_cmd jq
require_cmd node
require_cmd python3

if ! cast chain-id --rpc-url "$RPC_URL" >/dev/null 2>&1; then
  echo "Anvil RPC is not reachable at $RPC_URL" >&2
  echo "Start it with: anvil" >&2
  exit 1
fi

if [[ -z "$PRIVATE_KEY" ]]; then
  echo "PRIVATE_KEY is required for local THOUGHT deployment." >&2
  exit 1
fi

if [[ -z "$PATH_NFT_ADDRESS" ]]; then
  echo "PATH_NFT_ADDRESS is required." >&2
  echo "Deploy/reference PATH first, then rerun with PATH_NFT_ADDRESS=<PathNFT address>." >&2
  exit 1
fi

DEPLOYER_ADDRESS="$(cast wallet address --private-key "$PRIVATE_KEY")"
if [[ -z "$THOUGHT_REGISTRY_OWNER" ]]; then
  THOUGHT_REGISTRY_OWNER="$DEPLOYER_ADDRESS"
fi
THOUGHT_REGISTRY_OWNER_ADDRESS="$(cast wallet address --private-key "$THOUGHT_REGISTRY_OWNER_PRIVATE_KEY")"
if [[ "${THOUGHT_REGISTRY_OWNER_ADDRESS,,}" != "${THOUGHT_REGISTRY_OWNER,,}" ]]; then
  echo "THOUGHT_REGISTRY_OWNER_PRIVATE_KEY does not match THOUGHT_REGISTRY_OWNER." >&2
  exit 1
fi

tmp_spec="$(mktemp)"
tmp_registry="$(mktemp)"
tmp_protocol="$(mktemp)"
tmp_protocol_registry="$(mktemp)"
tmp_renderer="$(mktemp)"
tmp_token="$(mktemp)"
trap 'rm -f "$tmp_spec" "$tmp_registry" "$tmp_protocol" "$tmp_protocol_registry" "$tmp_renderer" "$tmp_token"' EXIT

node --input-type=module - "$THOUGHT_SPEC_NAME" "$THOUGHT_SPEC_FILE" "$THOUGHT_SPEC_REF" "$MAX_THOUGHT_SPEC_BYTES" >"$tmp_spec" <<'NODE'
import fs from "node:fs";
import path from "node:path";
import { ethers } from "ethers";

const [specName, specFile, specRef, maxBytesRaw] = process.argv.slice(2);
const maxBytes = Number(maxBytesRaw);
const filename = path.basename(specFile);
const match = /^THOUGHT\.v([1-9][0-9]*)\.md$/.exec(specName);

if (!match) {
  throw new Error(`invalid THOUGHT spec name: ${specName}`);
}
if (filename !== specName) {
  throw new Error(`THOUGHT spec filename/name mismatch: ${filename} != ${specName}`);
}

const bytes = fs.readFileSync(specFile);
if (bytes.length === 0) {
  throw new Error("THOUGHT spec file is empty");
}
if (bytes.length > maxBytes) {
  throw new Error(`THOUGHT spec file exceeds ${maxBytes} bytes`);
}
if (bytes.length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
  throw new Error("THOUGHT spec file has UTF-8 BOM");
}
if (bytes.includes(0x0d)) {
  throw new Error("THOUGHT spec file contains CR/CRLF line endings");
}

const text = bytes.toString("utf8");
if (!text.includes(`Version: v${match[1]}`)) {
  throw new Error(`THOUGHT spec file must contain Version: v${match[1]}`);
}

const payload = {
  name: specName,
  ref: specRef,
  id: ethers.id(specName),
  hash: ethers.keccak256(bytes),
  bytes: `0x${bytes.toString("hex")}`,
  byteLength: bytes.length,
};
process.stdout.write(`${JSON.stringify(payload)}\n`);
NODE

node --input-type=module - "$THOUGHT_PROTOCOL_MANIFEST_FILE" "$THOUGHT_PROTOCOL_MANIFEST_URI" "$ROOT_DIR/evm/src/ThoughtReleaseConstants.sol" >"$tmp_protocol" <<'NODE'
import fs from "node:fs";
import { ethers } from "ethers";

const [manifestFile, manifestUriOverride, constantsFile] = process.argv.slice(2);
const bytes = fs.readFileSync(manifestFile);
if (bytes.length === 0) throw new Error("protocol manifest is empty");
if (bytes.subarray(0, 3).equals(Buffer.from([0xef, 0xbb, 0xbf]))) {
  throw new Error("protocol manifest has UTF-8 BOM");
}
if (bytes.includes(0x0d)) throw new Error("protocol manifest contains CR/CRLF line endings");
if (bytes.at(-1) !== 0x0a || bytes.at(-2) === 0x0a) {
  throw new Error("protocol manifest must have exactly one final LF");
}
const manifest = JSON.parse(bytes.toString("utf8"));
const artifactHash = (role) => {
  const matches = (manifest.artifacts ?? []).filter((artifact) => artifact.role === role);
  if (matches.length !== 1 || !ethers.isHexString(matches[0].keccak256, 32)) {
    throw new Error(`manifest must contain exactly one valid ${role} hash`);
  }
  return matches[0].keccak256;
};
const manifestHash = ethers.keccak256(bytes);
const releaseId = ethers.keccak256(ethers.AbiCoder.defaultAbiCoder().encode(
  ["bytes32", "bytes32"],
  [ethers.id("INSHELL_THOUGHT_PROTOCOL_RELEASE"), manifestHash],
));
const manifestURI = manifestUriOverride || `dev://thought/protocol/v2/${manifestHash}`;
const uriLength = Buffer.byteLength(manifestURI, "utf8");
if (uriLength < 1 || uriLength > 200) throw new Error(`invalid manifest URI length: ${uriLength}`);
const rendererProfileHash = artifactHash("renderer-profile");
const workProfileHash = artifactHash("work-profile");
const constants = fs.readFileSync(constantsFile, "utf8");
if (!constants.includes(`RENDERER_PROFILE_KECCAK256 = ${rendererProfileHash};`)) {
  throw new Error("compiled renderer profile constant does not match protocol manifest");
}
if (!constants.includes(`WORK_PROFILE_KECCAK256 = ${workProfileHash};`)) {
  throw new Error("compiled work profile constant does not match protocol manifest");
}
process.stdout.write(`${JSON.stringify({
  manifestHash,
  manifestURI,
  releaseId,
  rendererProfileHash,
  workProfileHash,
})}\n`);
NODE

THOUGHT_SPEC_ID="$(python3 - "$tmp_spec" <<'PY'
import json, sys
with open(sys.argv[1], "r", encoding="utf-8") as f:
    print(json.load(f)["id"])
PY
)"
THOUGHT_SPEC_HASH="$(python3 - "$tmp_spec" <<'PY'
import json, sys
with open(sys.argv[1], "r", encoding="utf-8") as f:
    print(json.load(f)["hash"])
PY
)"
THOUGHT_SPEC_BYTES="$(python3 - "$tmp_spec" <<'PY'
import json, sys
with open(sys.argv[1], "r", encoding="utf-8") as f:
    print(json.load(f)["bytes"])
PY
)"
THOUGHT_SPEC_BYTE_LENGTH="$(python3 - "$tmp_spec" <<'PY'
import json, sys
with open(sys.argv[1], "r", encoding="utf-8") as f:
    print(json.load(f)["byteLength"])
PY
)"
PROTOCOL_MANIFEST_HASH="$(jq -r '.manifestHash' "$tmp_protocol")"
PROTOCOL_MANIFEST_URI="$(jq -r '.manifestURI' "$tmp_protocol")"
PROTOCOL_RELEASE_ID="$(jq -r '.releaseId' "$tmp_protocol")"
RENDERER_PROFILE_HASH="$(jq -r '.rendererProfileHash' "$tmp_protocol")"
WORK_PROFILE_HASH="$(jq -r '.workProfileHash' "$tmp_protocol")"

(
  cd "$EVM_DIR"
  forge create \
    --broadcast \
    --rpc-url "$RPC_URL" \
    --private-key "$PRIVATE_KEY" \
    --json \
    src/ThoughtSpecRegistry.sol:ThoughtSpecRegistry \
    --constructor-args "$THOUGHT_REGISTRY_OWNER" >"$tmp_registry"
)

REGISTRY_ADDRESS="$(python3 - "$tmp_registry" <<'PY'
import json, sys
with open(sys.argv[1], "r", encoding="utf-8") as f:
    print(json.load(f)["deployedTo"])
PY
)"

cast send "$REGISTRY_ADDRESS" \
  "registerThoughtSpec(string,string,bytes)" \
  "$THOUGHT_SPEC_NAME" \
  "$THOUGHT_SPEC_REF" \
  "$THOUGHT_SPEC_BYTES" \
  --rpc-url "$RPC_URL" \
  --private-key "$THOUGHT_REGISTRY_OWNER_PRIVATE_KEY" >/dev/null

REGISTERED_PAIR="$(cast call "$REGISTRY_ADDRESS" \
  "isRegisteredThoughtSpec(bytes32,bytes32)(bool)" \
  "$THOUGHT_SPEC_ID" \
  "$THOUGHT_SPEC_HASH" \
  --rpc-url "$RPC_URL")"
if [[ "$REGISTERED_PAIR" != "true" ]]; then
  echo "Registered THOUGHT spec ID/hash pair did not validate." >&2
  exit 1
fi

READBACK_HASH="$(cast call "$REGISTRY_ADDRESS" \
  "thoughtSpecBytes(bytes32)(bytes)" \
  "$THOUGHT_SPEC_ID" \
  --rpc-url "$RPC_URL" | node --input-type=module -e 'import { ethers } from "ethers"; let input = ""; process.stdin.on("data", c => input += c); process.stdin.on("end", () => console.log(ethers.keccak256(input.trim())));')"
if [[ "$READBACK_HASH" != "$THOUGHT_SPEC_HASH" ]]; then
  echo "THOUGHT spec readback hash mismatch." >&2
  exit 1
fi

(
  cd "$EVM_DIR"
  forge create \
    --broadcast \
    --rpc-url "$RPC_URL" \
    --private-key "$THOUGHT_REGISTRY_OWNER_PRIVATE_KEY" \
    --json \
    src/ThoughtSpecRegistryV2.sol:ThoughtSpecRegistryV2 \
    --constructor-args "$THOUGHT_REGISTRY_OWNER" >"$tmp_protocol_registry"
)

PROTOCOL_REGISTRY_ADDRESS="$(jq -r '.deployedTo' "$tmp_protocol_registry")"
cast send "$PROTOCOL_REGISTRY_ADDRESS" \
  "registerRelease(bytes32,string)" \
  "$PROTOCOL_MANIFEST_HASH" \
  "$PROTOCOL_MANIFEST_URI" \
  --rpc-url "$RPC_URL" \
  --private-key "$THOUGHT_REGISTRY_OWNER_PRIVATE_KEY" >/dev/null

REGISTERED_RELEASE="$(cast call "$PROTOCOL_REGISTRY_ADDRESS" \
  "isRegistered(bytes32)(bool)" \
  "$PROTOCOL_RELEASE_ID" \
  --rpc-url "$RPC_URL")"
if [[ "$REGISTERED_RELEASE" != "true" ]]; then
  echo "Registered protocol release did not validate." >&2
  exit 1
fi

(
  cd "$EVM_DIR"
  forge create \
    --broadcast \
    --rpc-url "$RPC_URL" \
    --private-key "$PRIVATE_KEY" \
    --json \
    src/ThoughtRenderer.sol:ThoughtRenderer >"$tmp_renderer"
)
RENDERER_ADDRESS="$(jq -r '.deployedTo' "$tmp_renderer")"

(
  cd "$EVM_DIR"
  forge create \
    --broadcast \
    --rpc-url "$RPC_URL" \
    --private-key "$PRIVATE_KEY" \
    --json \
    src/ThoughtNFT.sol:ThoughtNFT \
    --constructor-args "$PATH_NFT_ADDRESS" "$REGISTRY_ADDRESS" "$RENDERER_ADDRESS" "$PROTOCOL_REGISTRY_ADDRESS" "$PROTOCOL_RELEASE_ID" >"$tmp_token"
)

TOKEN_ADDRESS="$(python3 - "$tmp_token" <<'PY'
import json, sys
with open(sys.argv[1], "r", encoding="utf-8") as f:
    print(json.load(f)["deployedTo"])
PY
)"

NFT_MANIFEST_HASH="$(cast call "$TOKEN_ADDRESS" 'protocolManifestHash()(bytes32)' --rpc-url "$RPC_URL")"
NFT_RENDERER_PROFILE_HASH="$(cast call "$TOKEN_ADDRESS" 'RENDERER_PROFILE_KECCAK256()(bytes32)' --rpc-url "$RPC_URL")"
NFT_WORK_PROFILE_HASH="$(cast call "$TOKEN_ADDRESS" 'WORK_PROFILE_KECCAK256()(bytes32)' --rpc-url "$RPC_URL")"
if [[ "${NFT_MANIFEST_HASH,,}" != "${PROTOCOL_MANIFEST_HASH,,}" ]]; then
  echo "ThoughtNFT protocol manifest hash mismatch." >&2
  exit 1
fi
if [[ "${NFT_RENDERER_PROFILE_HASH,,}" != "${RENDERER_PROFILE_HASH,,}" ]]; then
  echo "ThoughtNFT renderer profile hash mismatch." >&2
  exit 1
fi
if [[ "${NFT_WORK_PROFILE_HASH,,}" != "${WORK_PROFILE_HASH,,}" ]]; then
  echo "ThoughtNFT work profile hash mismatch." >&2
  exit 1
fi

CHAIN_ID="$(cast chain-id --rpc-url "$RPC_URL")"
THOUGHT_MOVEMENT="$(cast format-bytes32-string THOUGHT)"

if [[ "$CONFIGURE_PATH_MOVEMENT" == "1" ]]; then
  cast send "$PATH_NFT_ADDRESS" \
    "setMovementConfig(bytes32,address,uint32)" \
    "$THOUGHT_MOVEMENT" \
    "$TOKEN_ADDRESS" \
    "$THOUGHT_MOVEMENT_QUOTA" \
    --rpc-url "$RPC_URL" \
    --private-key "$PRIVATE_KEY" >/dev/null
  cast send "$PATH_NFT_ADDRESS" \
    "freezeMovementConfig(bytes32)" \
    "$THOUGHT_MOVEMENT" \
    --rpc-url "$RPC_URL" \
    --private-key "$PRIVATE_KEY" >/dev/null
fi

python3 - "$ADDRESSES_FILE" "$RPC_URL" "$CHAIN_ID" "$REGISTRY_ADDRESS" "$PROTOCOL_REGISTRY_ADDRESS" "$THOUGHT_REGISTRY_OWNER" "$RENDERER_ADDRESS" "$TOKEN_ADDRESS" "$PATH_NFT_ADDRESS" "$THOUGHT_MOVEMENT_QUOTA" "$THOUGHT_SPEC_NAME" "$THOUGHT_SPEC_ID" "$THOUGHT_SPEC_HASH" "$THOUGHT_SPEC_REF" "$THOUGHT_SPEC_BYTE_LENGTH" "$PROTOCOL_RELEASE_ID" "$PROTOCOL_MANIFEST_HASH" "$PROTOCOL_MANIFEST_URI" "$RENDERER_PROFILE_HASH" "$WORK_PROFILE_HASH" <<'PY'
import json, sys

out_path, rpc_url, chain_id, registry_address, protocol_registry_address, registry_owner, renderer_address, token_address, path_nft_address, thought_movement_quota, thought_spec_name, thought_spec_id, thought_spec_hash, thought_spec_ref, thought_spec_byte_length, protocol_release_id, protocol_manifest_hash, protocol_manifest_uri, renderer_profile_hash, work_profile_hash = sys.argv[1:]
payload = {
    "schema": "thought.evm.v2.addresses",
    "network": "anvil",
    "rpcUrl": rpc_url,
    "chainId": int(chain_id),
    "path": {"address": path_nft_address},
    "thoughtSpecRegistry": {"address": registry_address, "owner": registry_owner},
    "protocolRegistry": {"address": protocol_registry_address, "owner": registry_owner},
    "thoughtRenderer": {"address": renderer_address},
    "thought": {"address": token_address},
    "movement": "THOUGHT",
    "movementQuota": int(thought_movement_quota),
    "recommendedThoughtSpecName": thought_spec_name,
    "recommendedThoughtSpecId": thought_spec_id,
    "recommendedThoughtSpecHash": thought_spec_hash,
    "recommendedThoughtSpecRef": thought_spec_ref,
    "recommendedThoughtSpecByteLength": int(thought_spec_byte_length),
    "protocolRelease": {
        "id": protocol_release_id,
        "manifestHash": protocol_manifest_hash,
        "manifestURI": protocol_manifest_uri,
        "rendererProfileHash": renderer_profile_hash,
        "workProfileHash": work_profile_hash,
    },
}
with open(out_path, "w", encoding="utf-8") as f:
    json.dump(payload, f, indent=2)
    f.write("\n")
print(json.dumps(payload, indent=2))
PY

echo "ThoughtSpecRegistry: $REGISTRY_ADDRESS"
echo "ThoughtSpecRegistry owner: $THOUGHT_REGISTRY_OWNER"
echo "ThoughtNFT:          $TOKEN_ADDRESS"
echo "PathNFT:             $PATH_NFT_ADDRESS"
if [[ "$CONFIGURE_PATH_MOVEMENT" == "1" ]]; then
  echo "Configured and froze PATH THOUGHT movement to $TOKEN_ADDRESS with quota $THOUGHT_MOVEMENT_QUOTA"
else
  echo "Skipped PATH movement config. Run PathNFT.setMovementConfig(THOUGHT, $TOKEN_ADDRESS, $THOUGHT_MOVEMENT_QUOTA), then PathNFT.freezeMovementConfig(THOUGHT)."
fi
echo "Wrote $ADDRESSES_FILE"
