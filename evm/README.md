# THOUGHT EVM Contracts

This directory contains the active THOUGHT contract and the preserved V1 archive.

## Active Formal Contract

- `src/ThoughtNFT.sol`: the public, unversioned ERC-721 contract. Its mint surface is `mint(MintThoughtInput)`.
- `src/ThoughtSpecRegistry.sol`: the immutable-owner, append-only registry for exact `THOUGHT.vN.md` bytes.
- `src/ContractCodeStorage.sol`: immutable code-pointer storage used by the registry.

`ThoughtNFT` has exactly two immutable constructor dependencies:

```solidity
new ThoughtNFT(pathNft, thoughtSpecRegistry)
```

Each successful mint:

1. validates the human-owned `promptLine` and Agent-produced `agentLine` as visible UTF-8 text with ordinary single spaces;
2. validates the supplied exact registered `(thoughtSpecId, thoughtSpecHash)` pair and non-empty provenance bytes;
3. consumes exactly one PATH `THOUGHT` movement unit atomically; and
4. stores the two lines, provenance payload, PATH id/serial, hashes, minter, and timestamp before emitting `ThoughtMinted`.

The contract does not require an Agent receipt, run id, Plugin, MCP server, or website. A user may call `mint(MintThoughtInput)` directly when the normal PATH authorization and contract validations pass. Agent execution is a provenance and convenience layer, not a mint authority.

Canonical work identity is the hash of the ordered pair `(promptLineHash, agentLineHash)`. The same pair cannot mint twice, while a changed prompt or Agent line is a different work.

## Renderer and Metadata

`tokenURI` returns marketplace-compatible onchain JSON with an embedded 960x960 SVG image. The public description is:

> A human prompt transformed by an Agent into a fully onchain work.

Metadata uses public `THOUGHT` naming and technical renderer id `thought.svg.v2.fixed-a-32`. It includes the two visible lines, their hashes, work hash, provenance hash/payload, PATH id/serial, minter, minted timestamp, and exact spec id/hash. It never embeds full spec text.

The renderer derives a fixed 1024-bit field from UTF-8 bytes in this order:

```text
promptLine bytes, then agentLine bytes
```

Short payloads repeat to 1024 bits; long payloads truncate to 1024 bits. The exact field is exposed through `binaryField(promptLine, agentLine)` and `binaryFieldOf(tokenId)` for provenance and independent verification.

## V1 Archive

V1 Sepolia rehearsal source and pre-deployment material are preserved as archive evidence:

- `legacy/ThoughtNFTV1.sol`
- `legacy/ThoughtSpecRegistryV1.sol`
- `legacy/ColorFontV1.sol`
- `test/legacy/ThoughtNFTV1.t.sol`
- `../scripts/deploy-evm-v1-local.sh`

V1 is not the active contract surface. Do not deploy it for new THOUGHT work.

See [../docs/ops/THOUGHT_V1_SEPOLIA_ARCHIVE.md](../docs/ops/THOUGHT_V1_SEPOLIA_ARCHIVE.md) for the archived-material inventory and the recorded V1 Sepolia deployment evidence.

## Commands

```bash
forge build
forge test

# Repo root
npm run build:evm
npm run test:evm
npm run deploy:evm-local
npm run ops:bundle:sepolia
```

`deploy-evm-local.sh` registers raw `specs/THOUGHT.v2.md` bytes, deploys the active unversioned contracts, configures PATH movement `THOUGHT` with quota `1`, and freezes that PATH movement by default.

## Sepolia and Mainnet Requirements

- The `ThoughtSpecRegistry` owner is an explicit immutable constructor argument. On Sepolia and mainnet it must be the Ledger-backed long-term ADMIN address, not a software deployer.
- Register the exact raw `THOUGHT.v2.md` bytes before public minting. The deployment scripts reject BOM, CRLF, filename, and version-header mismatches before deployment.
- Configure `PathNFT.setMovementConfig(bytes32("THOUGHT"), thoughtNft, 1)` and then freeze the movement config before public use.
- Verify `pathNft`, `thoughtSpecRegistry`, registry ownership, spec registration, PATH minter, quota, and frozen state after deployment.
- Mainnet execution uses the same formal signing workflow as Sepolia, but must be an explicitly reviewed release plan. Never substitute a software deployer for the Ledger ADMIN owner.

## Agent and Plugin Boundary

The current Agent flow is defined in [../docs/agent/THOUGHT_AGENT_FLOW_V2.md](../docs/agent/THOUGHT_AGENT_FLOW_V2.md). The active `inshell.art` integration owns browser, run API, Plugin/MCP transport, task sealing, Agent result validation, provenance assembly, and wallet UX. The EVM contract only consumes PATH and mints a valid `MintThoughtInput`.
