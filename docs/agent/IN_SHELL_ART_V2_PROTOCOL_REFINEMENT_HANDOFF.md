# inshell.art Handoff: THOUGHT V2 Contract and Protocol Integration

Date: 2026-07-19

Candidate source tag: `thought-v2-contract-release-candidate-20260719`

## Status and boundary

This is the current producer-to-consumer handoff for the production Inshell
THOUGHT App. The `THOUGHT` repository owns the protocol, contracts, canonical
onchain output, exact release artifacts, ABIs, reference TypeScript, and
conformance vectors. The `inshell.art` repository owns the production App,
consumer lock, wallet/Agent integration, staging, and frontend rollout.

The local release described here is a verified release candidate, but it is
still emitted as a draft and is not authorized for production registration:

```text
manifest:               protocol/releases/v2/release.manifest.draft.json
artifact count:         24
manifest byte length:   6,508
manifest keccak256:     0x88816286211e657f07e94a4728543c92c6463fece9701fb0cee0b1ae29ef0ef2
protocol release ID:    0x6950429fdb8c369226b47f5308590de7cc601c037cdbf816dead7eb3e6aa7bd5
registration authorized:false
```

The byte length above is an expected candidate value and is checked by
`npm run protocol:check`. If regeneration reports a different value or hash,
use the generated report as authoritative and update this handoff before
consumer pinning.

`inshell.art` may integrate and test this candidate against Anvil. It must not
treat the candidate hash, Anvil addresses, a moving branch, `latest`, or
`protocol/CURRENT.json` as a production pin. Final production pinning requires
an approved `release.manifest.json`, clean source commit/tag, immutable artifact
location, and reviewed network deployment metadata.

## Ownership split

```text
THOUGHT producer
  contract and registry behavior
  exact protocol files and release identity
  canonical SVG/tokenURI output
  provenance/attestation formats and vectors
  ABIs and reviewed deployment metadata

inshell.art consumer
  production user experience
  verified embedded release and consumer lock
  Agent and wallet orchestration
  canonical provenance assembly before mint
  post-mint contract reads and display

OPS/operator
  registry and PATH administration
  protected attestation signer/KMS
  release approval, deployment, and rollback authority
```

The production attestation key must never be placed in browser JavaScript,
frontend environment files, source control, fixtures, provenance, or a Codex
task. `inshell.art` integrates with a protected signing service; OPS owns key
generation, custody, rotation, pause, and recovery.

## Exact producer artifacts

Resolve the candidate or final release from these producer files:

```text
protocol/releases/v2/release.manifest.draft.json
protocol/releases/v2/release.report.draft.json
src/generated/thought-v2-release-bundle.json
```

The manifest binds the exact creative spec, Agent schemas, attestation profile,
contract interface, five consumer-facing ABIs, contract hash vectors, mint
schema, provenance specification/schema, work and renderer profiles, and all
conformance vectors. The embedded bundle contains the exact bytes of every
manifest artifact and the expected release identity.

Consumer-facing ABI paths are:

```text
protocol/releases/v2/contract/abi/ThoughtNFT.json
protocol/releases/v2/contract/abi/ThoughtRenderer.json
protocol/releases/v2/contract/abi/ThoughtSpecRegistry.json
protocol/releases/v2/contract/abi/ThoughtSpecRegistryV2.json
protocol/releases/v2/contract/abi/CreationAttestationVerifier.json
```

`ThoughtSpecRegistryV2` is the current protocol-release registry contract. Do
not infer behavior from its historical name; consume its pinned ABI and the
`ThoughtNFT.protocolRegistry()` getter.

Reference TypeScript sources are:

```text
src/thought-v2-protocol.ts
src/thought-v2-release.ts
src/thought-v2-renderer.ts
src/thought-v2-token-uri.ts
src/thought-v2-provenance.ts
src/thought-v2-creation-attestation.ts
src/thought-agent-run.ts
```

These files are producer references, not independently editable consumer
authorities. If `inshell.art` vendors them, it must pin their source commit and
verify all behavior against the manifest vectors. Prefer a reviewed shared
package when one becomes available; do not create a divergent local renderer,
provenance schema, or EIP-712 type definition.

## Contract deployment shape

The active unversioned collection constructor is:

```solidity
ThoughtNFT(
    address pathNft,
    address thoughtSpecRegistry,
    address thoughtRenderer,
    address protocolRegistry,
    bytes32 protocolReleaseId,
    address creationAttestationVerifier
)
```

Supporting constructors are:

```solidity
ThoughtSpecRegistry(address owner)
ThoughtSpecRegistryV2(address owner)
ThoughtRenderer()
CreationAttestationVerifier(address initialOwner, address initialAuthority)
```

Do not infer production addresses from `evm/addresses.anvil.json`. That file is
disposable local state. Production addresses must come from a separately
reviewed immutable network release record.

## Mint input

Consume the ABI tuple exactly. Its logical shape is:

```solidity
struct CreationAttestationProof {
    bytes32 runIdHash;
    uint64 deadline;
    uint32 authorityEpoch;
    bytes signature;
}

struct MintThoughtInput {
    string promptLine;
    string agentLine;
    string declaredAgent;
    string declaredModel;
    uint256 pathId;
    bytes32 thoughtSpecId;
    bytes32 thoughtSpecHash;
    string provenanceJson;
    uint256 deadline;
    bytes pathSignature;
    CreationAttestationProof creationAttestation;
}
```

Mint remains permissionless. A valid mint consumes exactly one PATH `THOUGHT`
movement unit atomically. Invalid local input, duplicate Agent identity/work,
invalid selected spec, invalid attestation, PATH failure, or receiver failure
must not consume PATH or reserve token state.

## Required startup gate

Before enabling Agent execution or mint submission, read and compare:

```text
ThoughtNFT.protocolRegistry()
ThoughtNFT.protocolReleaseId()
ThoughtNFT.protocolManifestHash()
ThoughtNFT.protocolManifestURI()
ThoughtNFT.thoughtRenderer()
ThoughtNFT.RENDERER_ID_HASH()
ThoughtNFT.RENDERER_PROFILE_KECCAK256()
ThoughtNFT.WORK_PROFILE_KECCAK256()
ThoughtNFT.creationAttestationVerifier()
ThoughtNFT.CREATION_ATTESTATION_PROFILE_ID()
```

Then verify the embedded manifest and every embedded artifact offline. Any
contract, manifest, profile, verifier, ABI, or selected-spec mismatch must
produce an explicit incompatible-release state and disable Agent execution and
mint submission. Do not fall back to a locally copied spec or renderer.

## Exact line and identity rules

`promptLine`, `agentLine`, `declaredAgent`, and `declaredModel` each use the
same exact safe single-line profile:

```text
1 through 64 UTF-8 bytes
shortest-form valid UTF-8 and valid Unicode scalars
one visible line
U+0020 is the only permitted whitespace
no leading or trailing U+0020
no controls, frozen invisible/directional scalars, BOM, or noncharacters
no trimming, normalization, case folding, clipping, or repair
```

Only prompt and Agent lines derive the loom and creative work identity.
`agentIdentityHash` is derived from the exact Agent line and is globally unique.
`workHash` binds renderer identity, both line hashes, and the packed field.
Declarations and creation-attestation status do not alter artwork identity.

## Selected-spec flow

There is no active/latest spec gate in `ThoughtNFT`. Multiple registered
`THOUGHT.vN.md` versions may coexist.

For each mint:

1. Load exact selected spec bytes from the verified release or verified registry
   readback.
2. Derive `thoughtSpecId = keccak256(UTF8(specName))`.
3. Derive `thoughtSpecHash = keccak256(exactSpecBytes)`.
4. Confirm the exact pair is registered.
5. Use the same pair in the mint draft, canonical provenance, optional
   attestation claim, wallet review, and post-mint verification.

Never select `latestThoughtSpecId()` as a production policy. Selection is an
explicit App/user workflow decision.

## Provenance flow

Every positive App path must construct `inshell.thought.provenance.v2` through
the shared canonical builder and pass the shared verifier before wallet intent
or attestation signing.

The record must contain:

```text
mintContext
  chainId, intendedMinter, thoughtNft

process
  strict manual or strict agent-run variant

protocol
  manifestKeccak256, protocolReleaseId, thoughtSpecId, thoughtSpecHash

work
  exact lines and all recomputed work/loom commitments
```

Positive Agent-run provenance requires a complete validated Agent-result
envelope and public-safe run reference. The builder stores only their Keccak
commitments. Fixture/corpus/source-file bookkeeping, credentials, hidden
prompts, chain-of-thought, signatures, token IDs, transactions, blocks, and
post-mint facts are forbidden.

The exact JCS UTF-8 bytes become `MintThoughtInput.provenanceJson`.
`provenanceHash` is Keccak-256 of those exact submitted bytes. Solidity stores
and hashes the bytes as opaque input; it does not parse the JSON.

## Declaration semantics

Both declaration objects always retain:

```json
"status": "declared-unverified"
```

Allowed source values are:

```text
connector_observed
runtime_configured
agent_declared
manual
unknown
```

The source records where the App obtained the value, not whether the value is
true. A valid creation attestation proves that the authorized THOUGHT App
signer approved the bound creation record; it does not prove actual Agent,
model, provider, route, or PATH execution.

## Creation-attestation integration

The canonical empty proof is:

```text
runIdHash:     0x000...000
deadline:      0
authorityEpoch:0
signature:     0x
```

It produces the immutable metadata status `Unattested` and bypasses the
verifier. Any partial empty proof is invalid.

For an official App mint, the protected signing service signs the exact EIP-712
claim defined by the pinned profile and ABI. The claim binds:

```text
profileId
thoughtNft
protocolReleaseId
thoughtSpecId and thoughtSpecHash
workHash and provenanceHash
declaredAgentHash and declaredModelHash
runIdHash
intendedMinter
deadline
authorityEpoch
```

The browser sends only the returned `runIdHash`, deadline, authority epoch, and
65-byte signature in `CreationAttestationProof`. `ThoughtNFT` reconstructs the
full claim from current contract and mint facts. Do not let the browser submit
an independently trusted full claim to the contract.

The signing service must independently run the shared release, selected-spec,
provenance, typed-state, and claim-parity checks before signing. It must reject
draft/unapproved releases in production.

## Rendering boundary

Before mint, the App may show the shared TypeScript prediction after all
compatibility checks pass. After mint, replace the prediction with exact
`ThoughtNFT.tokenURI(tokenId)` or `svgOf(tokenId)` output.

Do not reconstruct a minted token with a consumer-owned SVG implementation.
Canonicality means exact SVG and tokenURI source bytes; pixel-identical font
rasterization across operating systems is not promised.

## Required consumer lock

The final production lock must contain at least:

```text
THOUGHT source commit and release tag
exact manifest artifact ID/location and manifest Keccak-256
protocolReleaseId
all consumed artifact hashes
ABI hashes
chain ID and reviewed deployment addresses
deployment blocks/transaction evidence
selected-spec registry address and registered pair policy
renderer/work/attestation profile identities
previous compatible rollback lock
```

The lock must point to immutable bytes. Production JavaScript must not fetch a
moving channel, branch, `latest`, or `CURRENT.json` to decide protocol behavior.

## Consumer acceptance gates

The `inshell.art` agent should not request production rollout until it proves:

- offline embedded release verification;
- startup rejection for every changed contract/release/profile address or hash;
- exact four-line validation parity;
- exact packed field, work hash, SVG, and tokenURI conformance vectors;
- manual Unattested mint preparation;
- Agent-run Unattested mint preparation;
- official attestation request/response without browser key material;
- selected-spec substitution rejection;
- provenance mutation rejection by the signer integration;
- PATH rejection and wallet rejection without stale success state;
- post-mint replacement of predictions with contract output;
- gallery/detail provenance downloads containing exact onchain bytes; and
- rollback by restoring a previous immutable consumer lock.

## Producer verification commands

Run from the pinned THOUGHT source state:

```bash
npm run protocol:build
npm run protocol:check
npm test
npm run build
npm run test:evm
git diff --check
```

The candidate source is consolidated under the tag above. A production producer
handoff must additionally include an approved `release.manifest.json`, immutable
manifest URI, reviewed public-network deployment record, and operator readback.
Those operator-only production facts are not present in this candidate handoff.

## V1 boundary

V1 remains immutable history under `protocol/history/v1/` and `evm/legacy/`.
Do not migrate V1 Color Font, normalization, preview, deployment addresses, or
provenance semantics into the V2 App.
