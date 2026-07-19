# THOUGHT V2 Protocol Release Binding and Rendering Canonicality Report

Date: 2026-07-15
Source publication update: 2026-07-16

## Status

The local implementation of
`THOUGHT_V2_NEXT_REFACTOR_PROTOCOL_RELEASE_AND_RENDERING_SPEC.md` is complete
through the required release-artifact, registry, collection-binding, offline
bundle, Agent/provenance, exact-source parity, regression, gas, code-size, and
browser rendering gates.

The generated release remains a provisional draft and is intentionally not
authorized for production registration. Its hash is technically registrable;
the hashes are local build evidence, not an approved protocol release or a
deployment instruction.

No public-network deployment, chain verification, release registration,
signature, artifact pin, upload, candidate/stable promotion, or downstream
rollout was performed. A disposable local Anvil deployment consumed fixture
PATH units to mint 60 gallery tokens solely for browser verification. Source
cleanup, commit, tag, and push were separately authorized by the operator on
2026-07-16.

## Discovery and Ownership

- This checkout contains the active contract, shared TypeScript reference,
  protocol package, generated embedded bundle, Agent-run integration, and local
  lab fixtures required by the specification.
- The immutable deployment evidence in the repository remains the V1 Sepolia
  archive. No verified immutable V2 deployment or conflicting V2 registry
  record was found.
- The prior 64-byte line profile and binary-weave refactor was complete and is
  preserved: exact 1..64 UTF-8 bytes, exact Agent-line uniqueness, 32x32 packed
  loom, PATH atomicity, and V1 behavior remain covered by regression tests.
- Normative protocol bytes live under `protocol/releases/v2/`. Generated
  consumers are derived from those bytes; they do not become independent
  authorities.
- `ThoughtSpecRegistryV2` owns append-only release commitments.
  `ThoughtNFT` owns immutable collection binding and canonical token behavior.
  `ThoughtRenderer` owns pure SVG serialization. TypeScript predicts and
  verifies those behaviors but does not supersede the contracts.

## Release Artifact Set

The deterministic manifest binds these 14 exact-byte roles:

```text
creative specification
Agent result schema
Agent declaration schema
provenance specification
provenance schema
work profile
renderer profile
text-validation fixtures
raw UTF-8 fixtures
loom fixtures
provenance fixtures
trait fixtures
SVG source fixtures
tokenURI fixtures
```

Generated draft files:

```text
protocol/releases/v2/release.manifest.draft.json
protocol/releases/v2/release.report.draft.json
src/generated/thought-v2-release-bundle.json
evm/src/ThoughtReleaseConstants.sol
```

The build hashes exact raw bytes, emits a deterministic manifest with a fixed
draft timestamp, derives the release ID from the frozen ABI domain, writes
generated consumers atomically, and verifies every emitted byte against the
source authority.

## Provisional Identity

```text
status:                   draft
registration authorized: false
manifest byte length:   3,779
manifest keccak256:     0xc46e1b3dbab5128bc4af98bc009dca3e45e6903c8263e0eb49cb5eb32fc16e0d
protocol release ID:    0xcab9cb82294d90e90d60203b27195c4daa75ea365f3d9b249caf5cd4006d6673
release-ID domain:      INSHELL_THOUGHT_PROTOCOL_RELEASE
```

Any normative artifact change changes the manifest hash and release ID. The
draft cannot be passed to registration/deployment tooling as an approved
release.

## Offline Embedded Bundle

`src/generated/thought-v2-release-bundle.json` contains every exact release
artifact byte and its expected byte length/hash. The shared verifier:

1. reconstructs every embedded file locally;
2. verifies its byte length and keccak256;
3. reconstructs and hashes the exact manifest bytes;
4. derives and checks the protocol release ID;
5. checks work-profile and renderer-profile IDs/hashes; and
6. performs no runtime protocol-file, IPFS, Arweave, or hosted-file fetch.

`npm run protocol:check` verifies the bundle with source artifacts available,
then verifies the same embedded bundle through its offline-only path.

## Append-Only Registry

`ThoughtSpecRegistryV2` stores one compact record per release:

```solidity
struct ReleaseRecord {
    bytes32 manifestHash;
    string manifestURI;
    address registrar;
    uint64 registeredAt;
}
```

Registration is owner-only. Zero hashes, zero owners, manifest URIs outside
1..200 bytes, unauthorized callers, and duplicate release IDs revert. Records
have getters and an event but no update or delete path. The URI is a retrieval
hint; it is not execution proof or a runtime dependency.

## Immutable Collection Binding

`ThoughtNFT` now receives a protocol registry and protocol release ID in its
constructor. Construction requires the registry and renderer to be contracts,
the renderer ID hash to match the generated release constants, and the release
ID to be registered. The following values are immutable collection facts:

```text
protocolRegistry
protocolReleaseId
protocolManifestHash
protocolManifestURI
renderer ID/profile
work profile ID/hash
```

The release ID and manifest are not copied into token records. The new release
binding therefore writes exactly zero new per-token storage slots. All tokens
in one deployment resolve the same immutable release.

The existing exact `provenanceJson` field remains caller-supplied per-token
state. A long Solidity string occupies one head slot plus
`ceil(byteLength / 32)` data slots; the 20,000-byte maximum uses 626 fresh
slots. For an all-nonzero 20,000-byte string, the attributable ABI calldata is
20,000 data bytes plus one 32-byte length word, approximately 320,152 calldata
gas before transaction-level fixed fields. This is preserved provenance cost,
not release-binding cost.

## Canonical Rendering and Metadata

The normative renderer policy now states:

```text
canonical: exact SVG source bytes and exact tokenURI source bytes
not promised: pixel-identical rasterization across viewers
derived only: PNGs, screenshots, and other raster previews
```

The renderer remains self-contained and deterministic. Loom geometry, line
placement, clipping, animation, identity, and hashes do not depend on font
measurement or external assets. Viewer fonts may change glyph rasterization;
that does not change the work.

The current binary weave uses the approved full-canvas scale: x=32, y=32,
width=896, height=896, 28 x 28 cells, and radius-10 marks. The orthogonal
prompt/Agent weave semantics and renderer identifier remain unchanged.

Metadata exposes exactly five ordered content attributes and ordered technical
properties. Exact Prompt and Agent Response literals are preserved as content
attributes. Structural metrics and deterministic observer traits supplement
those literals and do not imply semantic similarity. `Declared Agent` remains
declaration-only and is not promoted from untyped provenance into canonical
token metadata.

## Exact Source Parity

Solidity, TypeScript, generated fixtures, and the embedded bundle agree on
validation, hashes, packed loom, SVG, metadata, and tokenURI serialization.

Representative exact-byte gates:

```text
one-byte SVG keccak256:
0x9ecc3ca8c790cf007aa830ebfb23479f0b302f54b264d26fbcea6b0a1e199aa0

deterministic full tokenURI keccak256:
0x2ab866e95ae86c3462a7fd82c15bb33a33ed96aacffa6ed401fb819156d1f3a0
```

The full tokenURI gate fixes timestamp, token facts, exact provenance, release
binding, JSON field order, data-URI encoding, and embedded SVG bytes. Solidity
and TypeScript assert the same hash.

## Agent and Provenance Binding

The sealed Agent task embeds the verified release identity, creative spec,
result schema, work profile, and renderer profile outside the stored prompt
line. The result validator checks the complete envelope, release/profile
identity, exact prompt echo, exact Agent line, validation metrics, hashes, loom,
and declaration shape before a result is accepted.

V2 creation provenance has a dedicated specification, strict JSON schema,
RFC 8785 JCS byte policy, valid/invalid vectors, and a verifier that recomputes
all deterministic fields. Typed contract facts are authoritative after mint;
caller-supplied provenance is immutable evidence and cannot override them.
Post-mint token, transaction, block, event, and ownership facts are not inserted
retroactively into the pre-mint provenance record.

## Browser Rendering Evidence

The local Anvil gallery at `http://127.0.0.1:5177/thought-v2-lab.html` was
inspected in a real browser after a fresh deployment and 60 fixture mints:

```text
onchain tokenURI records:        60
decoded SVG sources:             60
unique SVG sources:              60
960x960 viewBox sources:         60
canonical geometry failures:     0
card attributes rendered:        300
selected-token attributes:       5
failed loaded images:            0
desktop horizontal overflow:     0
mobile horizontal overflow:      0
```

The fixtures include Latin, CJK, Arabic, Thai, combining sequences, and emoji.
The desktop and 390 x 844 mobile screenshots verify the restored full-canvas
look, invariant structure, and containment, not cross-platform pixel identity.

## Regression Evidence

- Invalid direct calldata remains rejected onchain before PATH consumption.
- Exact Agent duplicates still fail; prompt reuse remains valid.
- PATH failure, receiver failure, and reentrancy preserve supply, identity,
  token records, and PATH state atomically.
- Existing 64-byte validator, Unicode, loom, and source-vector suites pass.
- V1 remains isolated and readable: all 51 V1 NFT tests and five V1 preview
  tests pass.

## Gas and Code Size

Compiler posture remains Solidity 0.8.28, optimizer enabled at 200 runs,
`viaIR`, Prague EVM, no bytecode hash, and disabled CBOR metadata.

### Registry

| Measurement | Result | Gate |
| --- | ---: | ---: |
| Runtime bytecode | 1,868 B | below EIP-170 |
| Initcode | 2,021 B | below EIP-3860 |
| Deployment gas | 374,268 | <= 1,500,000 |
| Register 1-byte URI | 76,176 | <= 300,000 |
| Register 100-byte URI | 161,507 | <= 300,000 |
| Register 200-byte URI | 229,074 | <= 300,000 |

### Deployment and Code Size

| Contract/state | Runtime | Initcode | Deployment gas |
| --- | ---: | ---: | ---: |
| Regular ERC-721 baseline | 1,167 B | 2,069 B | 312,278 |
| Clean pre-64-byte monolithic `ThoughtNFT` | 25,692 B | 26,026 B | 5,618,243 |
| Pre-release-binding refactored `ThoughtNFT` | 18,214 B | 18,869 B | 3,695,144 |
| Current release-bound `ThoughtNFT` | 21,267 B | 22,169 B | 4,317,597 |
| `ThoughtRenderer` | 8,462 B | 8,488 B | 1,728,359 |
| Current NFT + renderer | - | - | 6,045,956 |

The current NFT runtime is below the approximate 22 KiB review target and has
3,309 bytes of EIP-170 headroom. Combined deployment remains below the approved
8,000,000-gas ceiling.

### Mint and Views

| Case | Gas | Returned bytes |
| --- | ---: | ---: |
| PATH `consumeUnit` | 76,806 | 0 |
| Mint, 1-byte lines | 537,053 | 0 |
| Mint, 64-byte ASCII lines | 647,252 | 0 |
| Mint, 64-byte four-byte Unicode lines | 786,786 | 0 |
| Mint, 20,000-byte provenance | 14,353,407 | 0 |
| Read 20,000-byte provenance | 140,967 | 20,000 |
| Reject malformed UTF-8 | 3,527 | 0 |
| Build binary field, 1-byte lines | 111,366 | 128 |
| Build binary field, 64-byte lines | 193,667 | 128 |
| `svgOf`, short lines | 7,300,939 | 17,207 |
| `tokenURI`, short lines | 11,645,150 | 34,009 |

Release binding adds no per-token storage write. Representative mint gas is
effectively unchanged from the pre-binding implementation; view cost increases
come from exposing the exact release/profile metadata in canonical output.

## Verification Results

```text
npm run protocol:build   passed; 14 exact-byte artifacts generated
npm run protocol:check   passed; embedded bundle verified offline
npm test                 60 passed
npm run build            passed
npm run build:evm        passed
npm run test:evm         115 passed
  ThoughtSpecRegistryV2   5 passed
  active V2              54 passed
  archived V1            56 passed
browser invariant check  passed; 60 onchain works, no geometry failures or overflow
forge fmt --check        passed for all changed Solidity files
git diff --check         passed
gitleaks source scan     passed; generated `dist/` excluded
```

The initial no-git scan of the production output produced one generic-key
false positive from minified UI copy containing the literal phrase `api key`.
The source-tree scan, excluding generated build/cache output, found no leaks.

## Remaining Blockers

- The manifest is a draft and is not authorized for production registration.
- Release review and explicit approval are still required before generating a
  registration-approved immutable manifest.
- Registry ownership, deployment identity, registration transaction, V2
  deployment, external verification, artifact archival, consumer pinning, and
  publication remain separate authorized operations.
- Cross-viewer pixel identity is not a release criterion and must not be
  advertised.

## Completion State

The local semantic implementation and all required local evidence are complete.
The next valid step is review of the exact draft release bytes. Source
version-control publication does not authorize any remaining release,
registry, deployment, mint, or downstream operation.
