# THOUGHT Mainnet Deployment

This is the mainnet path for the active formal contracts. It intentionally requires explicit operator review and Ledger-backed authority; it is not a browser or Agent action.

## Preconditions

- A reviewed PATH mainnet release provides the `PathNFT` address and the long-term PATH ADMIN address.
- The registry owner is that Ledger-backed ADMIN address.
- The exact raw `specs/THOUGHT.v2.md` bytes have passed BOM, CRLF, name, and `Version: v2` checks.
- An approved exact-byte `protocol/releases/v2/release.manifest.json` and 1-200 byte retrieval URI have passed the complete release gate. Draft manifests are forbidden.
- The build and both active and legacy regression suites pass from the reviewed commit.
- No pre-existing PATH `THOUGHT` movement configuration conflicts with the intended formal `ThoughtNFT` address.

## Deploy

Use a software or multisig-controlled deploy signer only to deploy contracts. Use the Ledger ADMIN for registry registration and all PATH configuration calls.

```bash
cd /path/to/THOUGHT
npm run build:evm
npm run test:evm

cd evm
forge create --broadcast --rpc-url "$MAINNET_RPC_URL" "${DEPLOY_SIGNER_ARGS[@]}" --json \
  src/ThoughtSpecRegistry.sol:ThoughtSpecRegistry \
  --constructor-args "$THOUGHT_REGISTRY_OWNER" | tee registry.json

REGISTRY=$(jq -r .deployedTo registry.json)
SPEC_BYTES=0x$(xxd -p -c 256 ../specs/THOUGHT.v2.md | tr -d '\n')
SPEC_ID=$(cast keccak 'THOUGHT.v2.md')
SPEC_HASH=$(cast keccak "$SPEC_BYTES")
MANIFEST_BYTES=0x$(xxd -p -c 256 ../protocol/releases/v2/release.manifest.json | tr -d '\n')
MANIFEST_HASH=$(cast keccak "$MANIFEST_BYTES")
PROTOCOL_RELEASE_ID=$(cast keccak $(cast abi-encode \
  'f(bytes32,bytes32)' \
  $(cast keccak 'INSHELL_THOUGHT_PROTOCOL_RELEASE') \
  "$MANIFEST_HASH"))

cast send --rpc-url "$MAINNET_RPC_URL" "${REGISTRY_OWNER_SIGNER_ARGS[@]}" "$REGISTRY" \
  'registerThoughtSpec(string,string,bytes)' \
  'THOUGHT.v2.md' 'THOUGHT.v2.md' "$SPEC_BYTES"

forge create --broadcast --rpc-url "$MAINNET_RPC_URL" "${DEPLOY_SIGNER_ARGS[@]}" --json \
  src/ThoughtSpecRegistryV2.sol:ThoughtSpecRegistryV2 \
  --constructor-args "$THOUGHT_REGISTRY_OWNER" | tee protocol-registry.json

PROTOCOL_REGISTRY=$(jq -r .deployedTo protocol-registry.json)
cast send --rpc-url "$MAINNET_RPC_URL" "${REGISTRY_OWNER_SIGNER_ARGS[@]}" "$PROTOCOL_REGISTRY" \
  'registerRelease(bytes32,string)' "$MANIFEST_HASH" "$THOUGHT_PROTOCOL_MANIFEST_URI"

forge create --broadcast --rpc-url "$MAINNET_RPC_URL" "${DEPLOY_SIGNER_ARGS[@]}" --json \
  src/ThoughtRenderer.sol:ThoughtRenderer | tee thought-renderer.json

THOUGHT_RENDERER=$(jq -r .deployedTo thought-renderer.json)

forge create --broadcast --rpc-url "$MAINNET_RPC_URL" "${DEPLOY_SIGNER_ARGS[@]}" --json \
  src/ThoughtNFT.sol:ThoughtNFT \
  --constructor-args "$PATH_NFT" "$REGISTRY" "$THOUGHT_RENDERER" "$PROTOCOL_REGISTRY" "$PROTOCOL_RELEASE_ID" | tee thought-nft.json

THOUGHT_NFT=$(jq -r .deployedTo thought-nft.json)
```

## Configure and Freeze PATH

```bash
cast send --rpc-url "$MAINNET_RPC_URL" "${PATH_ADMIN_SIGNER_ARGS[@]}" "$PATH_NFT" \
  'setMovementConfig(bytes32,address,uint32)' \
  $(cast format-bytes32-string THOUGHT) "$THOUGHT_NFT" 1

cast send --rpc-url "$MAINNET_RPC_URL" "${PATH_ADMIN_SIGNER_ARGS[@]}" "$PATH_NFT" \
  'freezeMovementConfig(bytes32)' \
  $(cast format-bytes32-string THOUGHT)
```

## Required Readback

Before publishing frontend artifacts, verify all of the following on mainnet:

```bash
cast call --rpc-url "$MAINNET_RPC_URL" "$THOUGHT_NFT" 'pathNft()(address)'
cast call --rpc-url "$MAINNET_RPC_URL" "$THOUGHT_NFT" 'thoughtSpecRegistry()(address)'
cast call --rpc-url "$MAINNET_RPC_URL" "$THOUGHT_NFT" 'thoughtRenderer()(address)'
cast call --rpc-url "$MAINNET_RPC_URL" "$THOUGHT_NFT" 'protocolRegistry()(address)'
cast call --rpc-url "$MAINNET_RPC_URL" "$THOUGHT_NFT" 'protocolReleaseId()(bytes32)'
cast call --rpc-url "$MAINNET_RPC_URL" "$THOUGHT_NFT" 'protocolManifestHash()(bytes32)'
cast call --rpc-url "$MAINNET_RPC_URL" "$THOUGHT_NFT" 'protocolManifestURI()(string)'
cast call --rpc-url "$MAINNET_RPC_URL" "$THOUGHT_NFT" 'RENDERER_PROFILE_KECCAK256()(bytes32)'
cast call --rpc-url "$MAINNET_RPC_URL" "$THOUGHT_NFT" 'WORK_PROFILE_KECCAK256()(bytes32)'
cast call --rpc-url "$MAINNET_RPC_URL" "$REGISTRY" 'owner()(address)'
cast call --rpc-url "$MAINNET_RPC_URL" "$PROTOCOL_REGISTRY" 'owner()(address)'
cast call --rpc-url "$MAINNET_RPC_URL" "$PROTOCOL_REGISTRY" \
  'isRegistered(bytes32)(bool)' "$PROTOCOL_RELEASE_ID"
cast call --rpc-url "$MAINNET_RPC_URL" "$REGISTRY" \
  'isRegisteredThoughtSpec(bytes32,bytes32)(bool)' "$THOUGHT_SPEC_ID" "$THOUGHT_SPEC_HASH"
cast call --rpc-url "$MAINNET_RPC_URL" "$PATH_NFT" \
  'getAuthorizedMinter(bytes32)(address)' $(cast format-bytes32-string THOUGHT)
cast call --rpc-url "$MAINNET_RPC_URL" "$PATH_NFT" \
  'getMovementQuota(bytes32)(uint32)' $(cast format-bytes32-string THOUGHT)
cast call --rpc-url "$MAINNET_RPC_URL" "$PATH_NFT" \
  'isMovementFrozen(bytes32)(bool)' $(cast format-bytes32-string THOUGHT)
```

The expected final state is: the active `ThoughtNFT` is the PATH movement minter, quota is `1`, movement is frozen, the exact-spec registry contains the exact `THOUGHT.v2.md` id/hash pair, and the collection's immutable release/manifest/profile getters match the approved registered manifest.
