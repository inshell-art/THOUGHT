# THOUGHT EVM Contracts

This port is a transitional checkpoint. Keep it runnable, but treat it as deprecated once the planned near-greenfield refactor begins.

This directory contains the Ethereum/Foundry port of the THOUGHT contracts.

## Contracts
- `SeedGenerator.sol`: deterministic `getSeed(uint256,uint64,string)` helper.
- `ThoughtPreviewer.sol`: `preview`, `previewWithFuel`, and `previewMetrics`.
- `ThoughtSpecRegistry.sol`: owner-managed active `THOUGHT.md` registry. Spec bytes are stored once in contract code storage and exposed through hash-validated read helpers.
- `ThoughtToken.sol`: ERC-721 mint contract for front-page THOUGHT outputs. Each mint stores compact provenance JSON, typed hashes, and a registry-backed `THOUGHT.md` spec id; it enforces unique canonical text and consumes one PATH `THOUGHT` movement unit atomically before minting.

## Commands
- `forge build`
- `forge test`
- `forge snapshot --offline`
- `PATH_NFT_ADDRESS=<PathNFT address> ../scripts/deploy-evm-local.sh`

## Local frontend wiring
- Deployment writes `addresses.anvil.json`.
- Deployment stores bundled `THOUGHT.md@v1` in `ThoughtSpecRegistry`, marks it active, and writes the registry address plus active spec id/hash/ref.
- The deploy script configures `PathNFT.setMovementConfig(bytes32("THOUGHT"), thoughtToken, 1)` by default. Set `CONFIGURE_PATH_MOVEMENT=0` to skip that admin call.
- `src/contracts-main.ts` reads that file and calls the preview contract over JSON-RPC.
- `src/main.ts` fetches the active spec text from `ThoughtSpecRegistry`, validates its hash, caches it by chain/registry/spec/hash, and uses it for generation and mint provenance.
