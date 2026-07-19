# THOUGHT EVM Contracts

This directory contains the active THOUGHT contract and the preserved V1 archive.

## Active Formal Contract

- `src/ThoughtNFT.sol`: the public, unversioned ERC-721 contract. Its mint surface is `mint(MintThoughtInput)`.
- `src/ThoughtRenderer.sol`: the immutable renderer dependency pinned by renderer-id hash at `ThoughtNFT` construction.
- `src/CreationAttestationVerifier.sol`: the separate EIP-712 verifier with two-step ownership, service-key rotation, epochs, and pause controls.
- `src/ThoughtSpecRegistry.sol`: the immutable-owner, append-only registry for exact `THOUGHT.vN.md` bytes.
- `src/ThoughtSpecRegistryV2.sol`: the immutable-owner, append-only registry for compact protocol-release commitments.
- `src/ContractCodeStorage.sol`: immutable code-pointer storage used by the registry.

`ThoughtNFT` has six immutable constructor bindings:

```solidity
new ThoughtNFT(
    pathNft,
    thoughtSpecRegistry,
    thoughtRenderer,
    protocolRegistry,
    protocolReleaseId,
    creationAttestationVerifier
)
```

The constructor requires `protocolReleaseId` to exist in `protocolRegistry`, requires the verifier to report the frozen creation-attestation profile ID, and permanently binds the collection to both dependencies. It also freezes exact renderer/work/attestation-profile hashes as generated constants. The constructor does not pin one creative-spec version. Every mint supplies an exact registered
`(thoughtSpecId, thoughtSpecHash)` pair, so multiple registered `THOUGHT.vN.md` versions
can coexist and remain mintable in one collection.

Each successful mint:

1. validates the human-owned `promptLine`, Agent-produced `agentLine`, typed `declaredAgent`, and typed `declaredModel` against the frozen strict UTF-8/XML/Unicode profile;
2. validates the supplied exact registered `(thoughtSpecId, thoughtSpecHash)` pair and non-empty provenance bytes;
3. classifies the canonical empty proof or verifies a complete EIP-712 creation claim before PATH;
4. consumes exactly one PATH `THOUGHT` movement unit atomically; and
5. stores the two lines, both exact declaration labels, attestation digest or zero, provenance payload, PATH id/serial, hashes, minter, and timestamp before safe-minting and emitting canonical events.

The contract does not require an Agent receipt, run id, Plugin, MCP server, or website. A user may call `mint(MintThoughtInput)` directly when the normal PATH authorization and contract validations pass. Agent execution is a provenance and convenience layer, not a mint authority.

`agentIdentityHash` is the domain-separated uniqueness key derived from `agentLineHash`. `workHash` separately fingerprints the renderer, both line hashes, and packed-field hash. The same exact Agent-line UTF-8 bytes cannot mint twice, even with a changed prompt or provenance.

Visible-line limits are deterministic and enforced before PATH consumption:

| Line | UTF-8 byte length |
| --- | ---: |
| `promptLine` | 1 through 64 |
| `agentLine` | 1 through 64 |
| `declaredAgent` | 1 through 64 |
| `declaredModel` | 1 through 64 |

## Renderer and Metadata

`tokenURI` returns marketplace-compatible onchain JSON with an embedded 960x960 SVG image. The public description is:

> A human prompt transformed by an Agent into a fully onchain work.

Metadata uses public `THOUGHT` naming and renderer id `inshell.thought.svg.v2.binary-weave-32`. Its six ordered observer attributes are Prompt, Agent Response, Declared Agent, Declared Model, Creation Attestation, and Texture Density. `Protocol` and `Binary Contrast` are not observer attributes. Exact `loomWeight`, `bitDistance`, release identity, creation-attestation profile ID, immutable verifier, and digest remain technical properties. It also includes work/provenance facts, PATH facts, and the exact spec pair. It never embeds full spec text.

The canonical all-zero/empty creation proof mints `Unattested` without calling the verifier, including while the verifier is paused. A valid current-authority proof stores its EIP-712 digest and mints `Inshell THOUGHT App`. This label attests only that the configured authority recognized the committed creation-workflow facts; it is not proof of an Agent, model, browser, provider, or PATH execution. Authority rotation or pause cannot rewrite historical token metadata.

The renderer cycles each exact UTF-8 source to 64 bytes and derives a fixed 1024-bit checkerboard field:

```text
F[row][col] = P512[row*16 + floor(col/2)] when (row+col) is even
F[row][col] = A512[col*16 + floor(row/2)] when (row+col) is odd
```

The 1024-bit field is packed MSB-first into exactly 128 bytes. The exact packed field is exposed through `binaryField(promptLine, agentLine)` and `binaryFieldOf(tokenId)` for provenance and independent verification.

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

`deploy-evm-local.sh` registers raw `specs/THOUGHT.v2.md` bytes and a local protocol manifest, verifies profile hashes against generated contract constants, deploys the active unversioned contracts and verifier, configures PATH movement `THOUGHT` with quota `1`, and freezes that PATH movement by default.

## Sepolia and Mainnet Requirements

- The `ThoughtSpecRegistry` owner is an explicit immutable constructor argument. On Sepolia and mainnet it must be the Ledger-backed long-term ADMIN address, not a software deployer.
- Register the exact raw `THOUGHT.v2.md` bytes before public minting. The deployment scripts reject BOM, CRLF, filename, and version-header mismatches before deployment.
- Register an approved exact-byte `release.manifest.json` in `ThoughtSpecRegistryV2` before deploying `ThoughtNFT`. Draft manifests are local-test-only. Verify the manifest's renderer/work/creation-attestation profile hashes against generated contract constants before broadcast and verify every immutable binding afterward.
- Deploy `CreationAttestationVerifier` with the Ledger-backed ADMIN/multisig owner and an explicitly reviewed service-key authority address. Never put the authority private key in this repository or a deployment pack.
- Configure `PathNFT.setMovementConfig(bytes32("THOUGHT"), thoughtNft, 1)` and then freeze the movement config before public use.
- Verify `pathNft`, both registries and owners, release ID/hash/URI, renderer/work-profile hashes, verifier address/profile/owner/authority/epoch/pause state, spec registration, PATH minter, quota, and frozen state after deployment.
- Mainnet execution uses the same formal signing workflow as Sepolia, but must be an explicitly reviewed release plan. Never substitute a software deployer for the Ledger ADMIN owner.

## Agent and Plugin Boundary

The current Agent flow is defined in [../docs/agent/THOUGHT_AGENT_FLOW_V2.md](../docs/agent/THOUGHT_AGENT_FLOW_V2.md). The active `inshell.art` integration owns browser, run API, Plugin/MCP transport, task sealing, Agent result validation, provenance assembly, and wallet UX. The EVM contract only consumes PATH and mints a valid `MintThoughtInput`.
