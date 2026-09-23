# THOUGHT V2 Next-Session Handoff

Date: 2026-07-19

## Start Here

```text
repo:       /Users/bigu/Projects/THOUGHT
branch:     codex/thought-v2-protocol-refinement
source tag: thought-v2-protocol-release-binding-20260716
candidate:  thought-v2-contract-release-candidate-20260719-r1
```

The previously dirty implementation tree was audited and consolidated into the
tagged source state above. A checkout of that tag should be clean. Preserve any
new local changes that appear after checkout.

The accumulated post-implementation, creation-attestation, selected-spec,
canonical-provenance, gallery/detail-page, and release-candidate work described
below is consolidated in the candidate tag above. The older source tag is only
the clean baseline, not the current candidate identity.

Current contract release-candidate report:

```text
docs/agent/THOUGHT_V2_CONTRACT_RELEASE_CANDIDATE_REPORT.md
```

Current downstream consumer handoff:

```text
docs/agent/IN_SHELL_ART_V2_PROTOCOL_REFINEMENT_HANDOFF.md
```

Current creation-attestation delta implementation report:

```text
docs/agent/THOUGHT_V2_CREATION_ATTESTATION_CONTRACT_DELTA_IMPLEMENTATION_REPORT.md
```

Its exact implemented baseline report:

```text
docs/agent/THOUGHT_V2_POST_IMPLEMENTATION_DELTA_IMPLEMENTATION_REPORT.md
```

Primary implementation report:

```text
docs/agent/THOUGHT_V2_NEXT_REFACTOR_IMPLEMENTATION_REPORT.md
```

Earlier 64-byte/binary-weave report:

```text
docs/agent/THOUGHT_V2_64_BYTE_BINARY_WEAVE_IMPLEMENTATION_REPORT.md
```

Source specification implemented in the current tree:

```text
/Users/bigu/Downloads/THOUGHT_V2_NEXT_REFACTOR_PROTOCOL_RELEASE_AND_RENDERING_SPEC.md
```

Post-implementation delta specification implemented locally:

```text
/Users/bigu/Downloads/THOUGHT_V2_POST_IMPLEMENTATION_DELTA_SPEC.md
```

Current contract-delta specification implemented locally:

```text
/Users/bigu/Downloads/THOUGHT_V2_CREATION_ATTESTATION_CONTRACT_DELTA_SPEC.md
```

Later selected-spec and canonical-provenance reports:

```text
docs/agent/THOUGHT_V2_SELECTED_SPEC_ATTESTATION_DELTA_IMPLEMENTATION_REPORT.md
docs/agent/THOUGHT_V2_CANONICAL_PROVENANCE_CORRECTION_DELTA_IMPLEMENTATION_REPORT.md
```

## Current State

The next protocol-release and rendering-canonicality refactor is locally
implemented. It includes:

- exact 1..64-byte UTF-8 prompt and Agent lines;
- exact Agent-line uniqueness and preserved PATH atomicity;
- `ThoughtRenderer` split from `ThoughtNFT`;
- canonical 32x32 binary-weave renderer;
- append-only `ThoughtSpecRegistryV2`;
- immutable `ThoughtNFT` protocol-release binding;
- deterministic exact-byte protocol manifest generation;
- generated Solidity release constants;
- generated offline FE release bundle;
- strict Agent result and provenance/JCS verification;
- exact Solidity/TypeScript SVG and full `tokenURI()` parity;
- conformance vectors for text, raw UTF-8, loom, provenance, traits, SVG, and
  tokenURI;
- deployment/signing-pack guards that reject drift or non-approved releases;
- V1 and existing V2 regression coverage; and
- browser invariant verification through the local Anvil token gallery.

The later post-implementation delta additionally includes:

- exact typed `declaredModel` mint/state/getter support under the same strict
  1..64-byte safe-line profile;
- declaration-only model label/source/optional identifier in Agent and
  provenance envelopes;
- exact five-attribute order: Prompt, Agent Response, Declared Model, Texture
  Density, Protocol;
- Binary Contrast removed from attributes while exact `bitDistance` remains a
  technical property;
- unchanged three-band Texture Density and supporting `Loom: N / 1,024
  underlying cells filled` gallery copy;
- regenerated profiles, schemas, ABI, conformance vectors, bundle, manifest,
  release ID, and Solidity constants; and
- strict gallery rejection of stale pre-delta token metadata.

The current creation-attestation contract delta additionally includes:

- exact typed `declaredAgent` state/getter/metadata under the same frozen
  1..64-byte safe-line profile;
- a separately deployed, immutable-profile `CreationAttestationVerifier`
  using EIP-712, canonical 65-byte ECDSA, authority epochs, pause, and two-step
  ownership;
- permissionless canonical-empty proofs mapped to `Unattested` and verified
  nonempty proofs mapped to `Inshell THOUGHT App`;
- exact six-attribute order: Prompt, Agent Response, Declared Agent, Declared
  Model, Creation Attestation, Texture Density;
- Protocol removed from front attributes while release facts remain technical;
- stored per-token attestation digest, immutable verifier address, and
  attested-only event history;
- generated profile, mint schema, verifier ABI, signed conformance fixtures,
  TypeScript parity encoder, and exact Solidity/TypeScript vectors;
- renderer-side tokenURI byte assembly to keep `ThoughtNFT` below 22 KiB; and
- fresh disposable Anvil evidence with 30 attested and 30 unattested tokens.

The implementation was initially left uncommitted because the source
specification prohibited external actions. On 2026-07-16, the operator
explicitly authorized worktree cleanup, commit, tag, and push. That
version-control authorization does not authorize protocol registration,
public deployment, non-fixture minting, candidate/stable promotion, or
downstream rollout. The later local-gallery request separately authorized a
disposable Anvil deployment and fixture mints only.

The current delta authorized disposable local deployment/mint evidence but
prohibited commit, tag, push, registration, public deployment, and publication.
Only the local Anvil action was performed.

## Draft Release Identity

The generated release is provisional. Its hash is technically registrable,
but production registration is intentionally not authorized:

```text
artifacts:               24
manifest byte length:    6,508
manifest hash:           0x88816286211e657f07e94a4728543c92c6463fece9701fb0cee0b1ae29ef0ef2
protocol release ID:     0x6950429fdb8c369226b47f5308590de7cc601c037cdbf816dead7eb3e6aa7bd5
registration authorized: false
offline bundle:          verified
```

The 24-artifact candidate now binds the consumer-facing contract interface,
five active ABIs, and contract hash vectors in addition to the previously
bound protocol, provenance, renderer, work, attestation, and conformance
artifacts. The current downstream integration contract is:

```text
docs/agent/IN_SHELL_ART_V2_PROTOCOL_REFINEMENT_HANDOFF.md
```

Do not register, deploy, publish, pin, or treat these draft hashes as an
approved immutable release without a separate explicit operator decision.

## Canonical Authorities

```text
creative spec:
  protocol/releases/v2/art/THOUGHT.v2.md

work profile:
  protocol/releases/v2/work/thought.work.v2.profile.json

renderer profile:
  protocol/releases/v2/renderer/thought.renderer.v2.profile.json

renderer policy:
  protocol/releases/v2/renderer/thought.svg.v2.binary-weave-32.md

creation attestation:
  protocol/releases/v2/attestation/thought.creation-workflow-attestation.v1.md
  protocol/releases/v2/attestation/fixtures/creation-attestation-vectors.json

mint ABI schema:
  protocol/releases/v2/contract/thought.mint-input.v2.schema.json

provenance:
  protocol/releases/v2/provenance/thought.provenance.v2.md
  protocol/releases/v2/provenance/thought.provenance.v2.schema.json

draft manifest/report:
  protocol/releases/v2/release.manifest.draft.json
  protocol/releases/v2/release.report.draft.json

embedded release bundle:
  src/generated/thought-v2-release-bundle.json

generated Solidity constants:
  evm/src/ThoughtReleaseConstants.sol
```

The canonical cross-repo publication/consumption policy remains:

```text
docs/agent/THOUGHT_ARTIFACT_CONSUMPTION_BOOK.md
```

`latest` is discovery-only. A production consumer must pin an immutable
artifact ID and manifest hash from a clean, approved release.

## Contract Surfaces

Key active files:

```text
evm/src/ThoughtNFT.sol
evm/src/ThoughtRenderer.sol
evm/src/CreationAttestationVerifier.sol
evm/src/ICreationAttestationVerifier.sol
evm/src/IThoughtRenderer.sol
evm/src/ThoughtSpecRegistryV2.sol
evm/test/ThoughtNFT.t.sol
evm/test/CreationAttestationVerifier.t.sol
evm/test/ThoughtSpecRegistryV2.t.sol
```

`ThoughtNFT` now binds these immutable constructor dependencies:

```text
pathNft
thoughtSpecRegistry
thoughtRenderer
protocolRegistry
protocolReleaseId
creationAttestationVerifier
```

The final record has 11 base slots. The current delta adds the Declared Agent
string head and full attestation digest slots. Declared Agent uses one slot
through 31 bytes, two slots at 32 bytes, or three slots at 64 bytes. An
attested token writes the full digest slot; Unattested stores zero. There is no
proof nonce slot. Existing exact provenance remains caller-supplied state.

`declaredModel` is exact, immutable, declaration-only context. It does not
affect either line, hashes, Agent uniqueness, loom, SVG, work identity, or PATH
semantics. `declaredModelOf(tokenId)` is its authoritative typed getter.

`declaredAgent` has the same exact declaration-only boundary and exclusions.
`creationAttestationDigestOf(tokenId)` is zero only for Unattested. The verifier
is immutable, pause affects nonempty proofs only, and rotation/ownership changes
do not alter historical tokenURI bytes.

Exact parity anchors:

```text
one-byte SVG keccak256:
0x9ecc3ca8c790cf007aa830ebfb23479f0b302f54b264d26fbcea6b0a1e199aa0

deterministic full tokenURI keccak256:
0x10f49bb5f18c98210a00720183739e10fee54c192e7276120e100079bc32aeba
```

## Last Verified Results

```text
npx tsc --noEmit          passed
npm run protocol:check   passed; 24 artifacts, offline bundle verified
npm test                 passed; 88 tests
npm run build            passed
npm run build:evm        passed
npm run test:evm         passed; 149 tests
  verifier               11
  active ThoughtNFT V2   77
  ThoughtSpecRegistryV2   5
  archived V1            56
forge fmt --check        passed for changed Solidity files
git diff --check         passed
gitleaks source scan     passed; no leaks found with ignored generated dist excluded
```

The complete staged candidate diff was reviewed and the source-tree gitleaks
gate was rerun before candidate commit/tag/push. Public registration and
deployment were not authorized by that source-consolidation action.

## Local Development Page

The Anvil token gallery is:

```text
http://127.0.0.1:5177/thought-v2-lab.html
```

At handoff time, the Vite server was started from this THOUGHT checkout with:

```bash
npm run dev -- --host 127.0.0.1 --port 5177 --strictPort
```

Both gallery and detail URLs returned HTTP 200 on 2026-07-19. A new session
must still verify which process owns port 5177 before trusting it. If the server
is gone, restart it from `/Users/bigu/Projects/THOUGHT`.

The page reads only `ThoughtNFT.tokenURI()` records from the configured local
chain. A clean ephemeral Anvil node now hosts the current draft:

```text
RPC:        http://127.0.0.1:8545
chain ID:   31337
THOUGHT:    0x4C4a2f8c81640e47606d3fd77B353E87Ba015584
verifier:   0x04C89607413713Ec9775E14b954286519d836FEf
supply:     60
attested:   30
unattested: 30
```

Direct RPC checks on tokens 1, 2, and 60 confirmed exactly six ordered traits,
typed declaration parity, correct digest/status mapping, and byte-identical
embedded SVG versus `svgOf()`. This is disposable local evidence only.

## Version-Control Consolidation

The completed 64-byte weave, stable-look fixtures, Agent-carousel fixes, and
release-binding work were audited as one coherent implementation. Five dirty-
source `experimental` render bundles were retained as immutable historical
design evidence, consistent with the repository artifact policy. They are not
candidate or stable releases.

Before the source commit, the complete staged diff was reviewed, all listed
verification commands passed, the five experimental bundle checksums passed,
and the source secret scan found no leaks. The source tag does not promote the
draft manifest or any artifact channel.

## Recommended Next Session Sequence

```bash
cd /Users/bigu/Projects/THOUGHT
git status --short --branch
sed -n '1,260p' docs/agent/THOUGHT_V2_NEXT_SESSION_HANDOFF.md
sed -n '1,360p' docs/agent/THOUGHT_V2_CONTRACT_RELEASE_CANDIDATE_REPORT.md
sed -n '1,440p' docs/agent/IN_SHELL_ART_V2_PROTOCOL_REFINEMENT_HANDOFF.md
npm run protocol:check
npm test
npm run build
npm run test:evm
git diff --check
```

Then ask the operator what the next authorized phase is. The likely decision is
one of:

```text
authorize source consolidation into a clean candidate commit and tag
approve the exact draft bytes for final-manifest promotion and immutable publication
authorize protocol registration and network deployment separately
send final immutable network pins to the inshell.art consumer separately
```

Do not infer authorization for any external action from this handoff.

## External Actions Not Performed

The complete current candidate source was committed, tagged, and pushed after
explicit authorization. Disposable Anvil deployment and fixture
signatures/PATH consumption/mints are the only chain actions. There was no
public-chain deployment or verification, protocol registration, real
signature, real PATH consumption, artifact upload, stable promotion, or
production downstream rollout.
