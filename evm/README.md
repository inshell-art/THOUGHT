# THOUGHT EVM Contracts

This directory contains the current THOUGHT V2 contract candidate and preserved unpublished attempts.

## Current THOUGHT V2 Candidate

- `src/v2/ThoughtNFTV2.sol`: Terminal English ERC-721 mint foundation.
- `src/v2/ThoughtV2WorkProfile.sol`: exact 76-character, 1-through-64-byte line validator.
- `src/v2/ThoughtV2Identity.sol`: ordered prompt-plus-Agent identity and renderer-bound work hash.
- `src/v2/ThoughtV2ContextProfile.sol`: separate declaration-label validation.
- `src/v2/IThoughtRendererV2.sol`: renderer boundary for the pending native path-glyph implementation.
- `test/v2/ThoughtNFTV2.t.sol`: contract, identity, atomicity, and validation tests.
- `src/ThoughtSpecRegistry.sol`: shared append-only exact-spec registry.
- `src/ThoughtSpecRegistryV2.sol`: shared append-only compact protocol-release registry.
- `src/CreationAttestationVerifier.sol`: shared EIP-712 creation-attestation verifier.

This implementation is V2—not V3—because the earlier binary-weave work was
never published or deployed. Current V2 is not deployable yet: the path-glyph
renderer, metadata/provenance profiles, release artifacts, and deployment
tooling remain release gates. Candidate metadata/provenance profiles exist,
but are not final release artifacts while the renderer and manifest are open.

`ThoughtNFTV2` stores exact `declaredAgent` and `declaredModel` labels under the
separate visible-UTF-8 context profile, exposes each label and exact hash,
passes both labels to the renderer metadata boundary, and binds both hashes in
an optional creation-attestation claim. They remain declarations rather than
verified Agent/model identity and never affect pair identity or artwork.

## Historical Binary-Weave Attempt — Unpublished

The following unversioned contracts and all deployment notes below belong to
the superseded binary-weave/visible-Unicode attempt. They are retained as
development evidence only and must not be treated as current V2.

- `src/ThoughtNFT.sol`: historical unversioned ERC-721 attempt.
- `src/ThoughtRenderer.sol`: historical binary-weave renderer attempt.
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

## Historical Attempt Renderer and Metadata

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

V1 is not a current contract surface. Do not deploy it for new THOUGHT work.

See [../docs/ops/THOUGHT_V1_SEPOLIA_ARCHIVE.md](../docs/ops/THOUGHT_V1_SEPOLIA_ARCHIVE.md) for the archived-material inventory and the recorded V1 Sepolia deployment evidence.

## Commands

```bash
forge build
forge test

# Repo root
npm run build:evm
npm run test:evm
npm run attempt:deploy:evm-local
npm run attempt:ops:bundle:sepolia
```

`deploy-evm-local.sh` currently deploys the historical binary-weave attempt. Do not use it for current V2.

## Historical Attempt Deployment Notes — Do Not Use

- The `ThoughtSpecRegistry` owner is an explicit immutable constructor argument. On Sepolia and mainnet it must be the Ledger-backed long-term ADMIN address, not a software deployer.
- Register the exact raw `THOUGHT.v2.md` bytes before public minting. The deployment scripts reject BOM, CRLF, filename, and version-header mismatches before deployment.
- Register an approved exact-byte `release.manifest.json` in `ThoughtSpecRegistryV2` before deploying `ThoughtNFT`. Draft manifests are local-test-only. Verify the manifest's renderer/work/creation-attestation profile hashes against generated contract constants before broadcast and verify every immutable binding afterward.
- Deploy `CreationAttestationVerifier` with the Ledger-backed ADMIN/multisig owner and an explicitly reviewed service-key authority address. Never put the authority private key in this repository or a deployment pack.
- Configure `PathNFT.setMovementConfig(bytes32("THOUGHT"), thoughtNft, 1)` and then freeze the movement config before public use.
- Verify `pathNft`, both registries and owners, release ID/hash/URI, renderer/work-profile hashes, verifier address/profile/owner/authority/epoch/pause state, spec registration, PATH minter, quota, and frozen state after deployment.
- Mainnet execution uses the same formal signing workflow as Sepolia, but must be an explicitly reviewed release plan. Never substitute a software deployer for the Ledger ADMIN owner.

## Historical Attempt Agent and Plugin Boundary

The current Agent flow is defined in [../docs/agent/THOUGHT_AGENT_FLOW_V2.md](../docs/agent/THOUGHT_AGENT_FLOW_V2.md). The active `inshell.art` integration owns browser, run API, Plugin/MCP transport, task sealing, Agent result validation, provenance assembly, and wallet UX. The EVM contract only consumes PATH and mints a valid `MintThoughtInput`.
