# THOUGHT Mainnet Deployment

This is the mainnet path for the active formal contracts. It intentionally requires explicit operator review and Ledger-backed authority; it is not a browser or Agent action.

## Preconditions

- A reviewed PATH mainnet release provides the `PathNFT` address and the long-term PATH ADMIN address.
- The registry owner is that Ledger-backed ADMIN address.
- The exact raw `specs/THOUGHT.v2.md` bytes have passed BOM, CRLF, name, and `Version: v2` checks.
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

cast send --rpc-url "$MAINNET_RPC_URL" "${REGISTRY_OWNER_SIGNER_ARGS[@]}" "$REGISTRY" \
  'registerThoughtSpec(string,string,bytes)' \
  'THOUGHT.v2.md' 'THOUGHT.v2.md' "$SPEC_BYTES"

forge create --broadcast --rpc-url "$MAINNET_RPC_URL" "${DEPLOY_SIGNER_ARGS[@]}" --json \
  src/ThoughtNFT.sol:ThoughtNFT \
  --constructor-args "$PATH_NFT" "$REGISTRY" | tee thought-nft.json

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
cast call --rpc-url "$MAINNET_RPC_URL" "$REGISTRY" 'owner()(address)'
cast call --rpc-url "$MAINNET_RPC_URL" "$REGISTRY" \
  'isRegisteredThoughtSpec(bytes32,bytes32)(bool)' "$THOUGHT_SPEC_ID" "$THOUGHT_SPEC_HASH"
cast call --rpc-url "$MAINNET_RPC_URL" "$PATH_NFT" \
  'getAuthorizedMinter(bytes32)(address)' $(cast format-bytes32-string THOUGHT)
cast call --rpc-url "$MAINNET_RPC_URL" "$PATH_NFT" \
  'getMovementQuota(bytes32)(uint32)' $(cast format-bytes32-string THOUGHT)
cast call --rpc-url "$MAINNET_RPC_URL" "$PATH_NFT" \
  'isMovementFrozen(bytes32)(bool)' $(cast format-bytes32-string THOUGHT)
```

The expected final state is: the active `ThoughtNFT` is the PATH movement minter, quota is `1`, movement is frozen, and the registry contains the exact `THOUGHT.v2.md` id/hash pair.
