#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
EVM_DIR="$ROOT_DIR/evm"
ADDRESSES_FILE="$EVM_DIR/addresses.anvil.json"
RPC_URL="${RPC_URL:-http://127.0.0.1:8545}"
PRIVATE_KEY="${PRIVATE_KEY:-0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80}"
PATH_NFT_ADDRESS="${PATH_NFT_ADDRESS:-}"
CONFIGURE_PATH_MOVEMENT="${CONFIGURE_PATH_MOVEMENT:-1}"
THOUGHT_MOVEMENT_QUOTA="${THOUGHT_MOVEMENT_QUOTA:-1}"
THOUGHT_SPEC_REF="${THOUGHT_SPEC_REF:-THOUGHT.md@v1}"

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing required command: $1" >&2
    exit 1
  fi
}

require_cmd cast
require_cmd forge
require_cmd node
require_cmd python3

THOUGHT_SPEC_ID="$(node --input-type=module -e "import { ethers } from 'ethers'; console.log(ethers.id('thought.md.v1'))")"
THOUGHT_SPEC_HASH="$(node --input-type=module -e "import fs from 'node:fs'; import { ethers } from 'ethers'; console.log(ethers.keccak256(ethers.toUtf8Bytes(fs.readFileSync(process.argv[1], 'utf8'))))" "$ROOT_DIR/THOUGHT.md")"
THOUGHT_SPEC_BYTES="$(node --input-type=module -e "import fs from 'node:fs'; process.stdout.write('0x' + Buffer.from(fs.readFileSync(process.argv[1])).toString('hex'))" "$ROOT_DIR/THOUGHT.md")"

if ! cast chain-id --rpc-url "$RPC_URL" >/dev/null 2>&1; then
  echo "Anvil RPC is not reachable at $RPC_URL" >&2
  echo "Start it with: anvil" >&2
  exit 1
fi

if [[ -z "$PATH_NFT_ADDRESS" ]]; then
  echo "PATH_NFT_ADDRESS is required." >&2
  echo "Deploy PATH first, then rerun with PATH_NFT_ADDRESS=<PathNFT address>." >&2
  exit 1
fi

tmp_seed="$(mktemp)"
tmp_previewer="$(mktemp)"
tmp_registry="$(mktemp)"
tmp_token="$(mktemp)"
trap 'rm -f "$tmp_seed" "$tmp_previewer" "$tmp_registry" "$tmp_token"' EXIT

(
  cd "$EVM_DIR"
  forge create src/SeedGenerator.sol:SeedGenerator \
    --rpc-url "$RPC_URL" \
    --private-key "$PRIVATE_KEY" \
    --broadcast \
    --json >"$tmp_seed"

  forge create src/ThoughtPreviewer.sol:ThoughtPreviewer \
    --rpc-url "$RPC_URL" \
    --private-key "$PRIVATE_KEY" \
    --broadcast \
    --json >"$tmp_previewer"

  forge create src/ThoughtSpecRegistry.sol:ThoughtSpecRegistry \
    --rpc-url "$RPC_URL" \
    --private-key "$PRIVATE_KEY" \
    --broadcast \
    --json >"$tmp_registry"
)

REGISTRY_ADDRESS="$(python3 - "$tmp_registry" <<'PY'
import json, sys
with open(sys.argv[1], "r", encoding="utf-8") as f:
    print(json.load(f)["deployedTo"])
PY
)"

cast send "$REGISTRY_ADDRESS" \
  "registerSpec(bytes32,string,bytes,bool)" \
  "$THOUGHT_SPEC_ID" \
  "$THOUGHT_SPEC_REF" \
  "$THOUGHT_SPEC_BYTES" \
  true \
  --rpc-url "$RPC_URL" \
  --private-key "$PRIVATE_KEY" >/dev/null

(
  cd "$EVM_DIR"
  forge create src/ThoughtToken.sol:ThoughtToken \
    --rpc-url "$RPC_URL" \
    --private-key "$PRIVATE_KEY" \
    --constructor-args "$PATH_NFT_ADDRESS" "$REGISTRY_ADDRESS" \
    --broadcast \
    --json >"$tmp_token"
)

SEED_ADDRESS="$(python3 - "$tmp_seed" <<'PY'
import json, sys
with open(sys.argv[1], "r", encoding="utf-8") as f:
    print(json.load(f)["deployedTo"])
PY
)"

PREVIEWER_ADDRESS="$(python3 - "$tmp_previewer" <<'PY'
import json, sys
with open(sys.argv[1], "r", encoding="utf-8") as f:
    print(json.load(f)["deployedTo"])
PY
)"

TOKEN_ADDRESS="$(python3 - "$tmp_token" <<'PY'
import json, sys
with open(sys.argv[1], "r", encoding="utf-8") as f:
    print(json.load(f)["deployedTo"])
PY
)"

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
fi

python3 - "$ADDRESSES_FILE" "$RPC_URL" "$CHAIN_ID" "$SEED_ADDRESS" "$PREVIEWER_ADDRESS" "$REGISTRY_ADDRESS" "$TOKEN_ADDRESS" "$PATH_NFT_ADDRESS" "$THOUGHT_MOVEMENT_QUOTA" "$THOUGHT_SPEC_ID" "$THOUGHT_SPEC_HASH" "$THOUGHT_SPEC_REF" <<'PY'
import json, sys

out_path, rpc_url, chain_id, seed_address, previewer_address, registry_address, token_address, path_nft_address, thought_movement_quota, thought_spec_id, thought_spec_hash, thought_spec_ref = sys.argv[1:]
payload = {
    "rpcUrl": rpc_url,
    "chainId": int(chain_id),
    "pathNft": {"address": path_nft_address},
    "pathMovement": {"name": "THOUGHT", "quota": int(thought_movement_quota)},
    "seedGenerator": {"address": seed_address},
    "thoughtPreviewer": {"address": previewer_address},
    "thoughtSpecRegistry": {"address": registry_address},
    "thoughtSpec": {
        "id": thought_spec_id,
        "hash": thought_spec_hash,
        "ref": thought_spec_ref,
    },
    "thoughtToken": {"address": token_address},
}
with open(out_path, "w", encoding="utf-8") as f:
    json.dump(payload, f, indent=2)
    f.write("\n")
PY

echo "SeedGenerator:   $SEED_ADDRESS"
echo "ThoughtPreviewer: $PREVIEWER_ADDRESS"
echo "ThoughtSpecRegistry: $REGISTRY_ADDRESS"
echo "ThoughtToken:    $TOKEN_ADDRESS"
echo "PathNFT:         $PATH_NFT_ADDRESS"
if [[ "$CONFIGURE_PATH_MOVEMENT" == "1" ]]; then
  echo "Configured PATH THOUGHT movement to $TOKEN_ADDRESS with quota $THOUGHT_MOVEMENT_QUOTA"
else
  echo "Skipped PATH movement config. Run PathNFT.setMovementConfig(THOUGHT, $TOKEN_ADDRESS, $THOUGHT_MOVEMENT_QUOTA)."
fi
echo "Wrote $ADDRESSES_FILE"
