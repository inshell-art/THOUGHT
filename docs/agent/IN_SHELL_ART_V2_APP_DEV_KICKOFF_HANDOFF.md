# THOUGHT V2 App development kickoff handoff

> Superseded for renderer/artifact integration on 2026-07-24. Use
> `IN_SHELL_ART_V2_NONCANONICAL_INTEGRATION_PREVIEW_HANDOFF.md` and the
> `thought-v2-noncanonical-integration-preview-20260725-r7` artifact. The
> mint/provenance/attestation boundary below remains useful background, but
> its r3 artifact pin and temporary Source Code Pro renderer facts are stale.

Date: 2026-07-23
From: THOUGHT Contract workspace
To: THOUGHT App owner working in `/Users/bigu/Projects/inshell.art`
Authorization: App-side local Anvil development may begin
Not authorized: Contract refactor, production signing, deployment, or release

## Copy-paste this prompt into the `inshell.art` agent

```text
You are the THOUGHT App owner working only in:

  /Users/bigu/Projects/inshell.art

Start App-side development against the current local THOUGHT V2 Contract
baseline in:

  /Users/bigu/Projects/THOUGHT

First read the inshell.art repository instructions and inspect its worktree.
Preserve unrelated or existing changes. Do not edit the THOUGHT repository.

Read these Contract-owner inputs in order:

1. /Users/bigu/Projects/THOUGHT/docs/agent/IN_SHELL_ART_V2_APP_DEV_KICKOFF_HANDOFF.md
2. /Users/bigu/Projects/THOUGHT/protocol/current/v2/integration/thought.app-contract-boundary.v1.md
3. /Users/bigu/Projects/THOUGHT/protocol/current/v2/integration/thought.app-contract-boundary.v1.json
4. /Users/bigu/Projects/THOUGHT/protocol/current/v2/contract/thought.mint-input.v2.schema.json
5. /Users/bigu/Projects/THOUGHT/protocol/current/v2/attestation/thought.creation-workflow-attestation.v1.md
6. /Users/bigu/Projects/THOUGHT/protocol/current/v2/metadata/thought.metadata.v2.profile.json
7. /Users/bigu/Projects/THOUGHT/protocol/current/v2/work/thought.work.v2.profile.json
8. /Users/bigu/Projects/THOUGHT/protocol/current/v2/provenance/thought.provenance.v2.md
9. /Users/bigu/Projects/THOUGHT/protocol/current/v2/provenance/thought.provenance.v2.schema.json

Use the current registry-bound ABI exactly. Do not implement the proposed
attestation-only or registry-removal architecture. It remains undecided.

Build the smallest complete local-Anvil integration slice in inshell.art:

- a generated or vendored typed ThoughtNFTV2 client from the current compiled
  ABI;
- a local-development Contract integration lock that identifies chain 31337,
  the boundary profile, ABI hash, and runtime addresses, and is unmistakably
  non-production;
- runtime checks for chain, bytecode, immutable dependencies, profile IDs,
  limits, protocol release, selected spec, renderer, and verifier;
- a guided Unattested mint builder using the canonical empty proof;
- a mock-official App mint builder using canonical provenance and a
  backend-only disposable Anvil signer;
- exact provenance JCS construction, verification, and hash parity before any
  positive mint request;
- PATH authorization/mint orchestration through the user's wallet;
- token read/detail support from typed state and tokenURI;
- the current trait semantics:
    * all tokens: Creation Attestation and length/byte traits;
    * valid nonzero attestation: Attested Agent and Attested Model;
    * Unattested: no filterable Agent/Model traits;
- tests for App builder -> EIP-712 claim -> Contract readback parity;
- tests proving provenance cannot elevate an Unattested declaration into an
  Attested Agent/Model trait.

Keep all fixture, corpus, source-path, and test-harness bookkeeping outside
provenanceJson, provenanceHash, token metadata, and attestation claims.

Security constraints:

- never place a production or persistent private key in frontend code,
  browser storage, repository files, logs, or fixtures;
- any signer used now must be disposable, Anvil-only, backend-only, and
  clearly labeled mock;
- never blindly sign a browser-supplied hash—the mock signing boundary must
  reconstruct and verify the authoritative claim;
- do not commit generated Anvil addresses;
- do not treat the Source Code Pro foreignObject renderer as production;
- do not promote the integration preview as candidate, stable, or production.

You own the THOUGHT App, Creative Work Specification, App provenance policy,
official workflow, and App release/integration locks. The THOUGHT workspace
owns Contract code, verifier, renderer, hard validation, and Contract release
artifacts. If App implementation appears to require a Contract change, stop
at an interface proposal and return it to the Contract owner; do not patch the
Contract repository.

Before broad implementation, record an accept/amend/defer response for
decisions D1-D8 in the boundary document. Deferral does not block the
non-production integration scaffolding above, but do not silently freeze a
deferred choice into a production-facing interface.

Run the relevant inshell.art tests and provide:

1. changed files;
2. implemented App-side flow;
3. local Anvil evidence;
4. D1-D8 decision matrix;
5. unresolved Contract questions;
6. explicit confirmation that no production key or deployment was added.
```

## Immutable integration preview for this kickoff

Use this exact source tag and artifact:

```text
repository: /Users/bigu/Projects/THOUGHT
branch: codex/thought-v2-chat-svg-experiment
source tag: thought-v2-noncanonical-integration-preview-20260723-r3
artifact ID: thought-v2-noncanonical-integration-preview-20260723-r3
artifact pointer: artifacts/thought-v2-integration-preview/experimental.json
manifest SHA-256: df8fc2112bf64152a4354c88f79d1d1b508cd9e43687eab46496d8174edbcb2b
```

Run `npm run integration-preview:v2:check` before consuming it. Pin the exact
artifact ID, manifest SHA-256, and source tag in an explicitly non-production
App integration lock. Do not pin the mutable `experimental.json` pointer.

The preview includes the current attestation-gated Agent/Model traits,
protocol candidate files, compiled contract ABIs/bytecode, reference builders,
gallery fixtures, boundary files, and conformance checker. It is not a
candidate/stable release and carries no persistent deployment.

## Renderer geometry the App must adopt

Display the token image exactly as supplied:

```text
SVG artboard:       1024 × 1024
outer frame:        32 units per side, #006100
inner canvas:       960 × 960 at x=32, y=32
canvas scale:       1 (no scaling)
canvas/glyph color: #000000 / #00ba00
```

The frame is inside the SVG artifact. Do not add a second frame in App or
marketplace presentation code. The bundled Anvil renderer uses Source Code Pro
and `foreignObject` only as a temporary implementation; do not copy that text
mechanism into a production renderer.

## Exact compiled Contract inputs

After running `npm run build:evm` in THOUGHT, Foundry artifacts are at:

```text
/Users/bigu/Projects/THOUGHT/evm/out/ThoughtNFTV2.sol/ThoughtNFTV2.json
/Users/bigu/Projects/THOUGHT/evm/out/CreationAttestationVerifier.sol/CreationAttestationVerifier.json
/Users/bigu/Projects/THOUGHT/evm/out/IThoughtRendererV2.sol/IThoughtRendererV2.json
/Users/bigu/Projects/THOUGHT/evm/out/ThoughtRendererV2DevSourceCodePro.sol/ThoughtRendererV2DevSourceCodePro.json
/Users/bigu/Projects/THOUGHT/evm/out/ThoughtSpecRegistry.sol/ThoughtSpecRegistry.json
/Users/bigu/Projects/THOUGHT/evm/out/ThoughtSpecRegistryV2.sol/ThoughtSpecRegistryV2.json
```

The App agent should extract the ABI deterministically into its own
non-production integration lock rather than importing a mutable Foundry
artifact at browser runtime.

Current TypeScript reference implementations are:

```text
/Users/bigu/Projects/THOUGHT/src/thought-v2-canonical-json.ts
/Users/bigu/Projects/THOUGHT/src/thought-v2-context-profile.ts
/Users/bigu/Projects/THOUGHT/src/thought-v2-creation-attestation.ts
/Users/bigu/Projects/THOUGHT/src/thought-v2-terminal-provenance.ts
/Users/bigu/Projects/THOUGHT/src/thought-v2-terminal-work-profile.ts
```

They define the current Contract parity baseline. The App owner decides how
to vendor, generate, or independently implement equivalent App-owned code,
but tests must prove exact parity.

## Start the Contract-side development environment

From `/Users/bigu/Projects/THOUGHT`, terminal one:

```bash
npm run devnode:v2:start
```

Terminal two:

```bash
npm run devnode:v2:gallery
npm run conformance:v2:app-contract
```

The generated local runtime descriptor is:

```text
/Users/bigu/Projects/THOUGHT/public/thought-v2-gallery.anvil.json
```

The App may read it only as local generated state. It must not copy its
addresses into a committed production or staging configuration.

## Current integration rules

The active mint input still includes:

```text
promptLine
agentLine
declaredAgent
declaredModel
pathId
thoughtSpecId
thoughtSpecHash
provenanceJson
deadline
pathSignature
creationAttestation
```

The current Creation Attestation claim still includes:

```text
profileId
thoughtNft
protocolReleaseId
thoughtSpecId
thoughtSpecHash
workHash
provenanceHash
declaredAgentHash
declaredModelHash
runIdHash
intendedMinter
deadline
authorityEpoch
```

Solidity stores provenance as opaque exact bytes and derives its Keccak-256
hash. It does not parse or certify the App's provenance schema. The official
App signer therefore carries the responsibility for reconstructing canonical
provenance and refusing malformed or mismatched claims.

## What the App can develop before D1-D8 are final

Safe now:

- ABI/client generation and runtime compatibility checks;
- local integration-lock format marked experimental;
- exact work/context validation parity;
- canonical empty-proof Unattested flow;
- mock backend-only Anvil attestation flow;
- provenance builder/verifier tests;
- PATH wallet orchestration;
- token readback, trait presentation, and error handling;
- decision-document scaffolding and Contract change proposals.

Wait for joint approval before:

- removing registry or selected-spec fields;
- changing the EIP-712 profile/type;
- defining production signer custody or authority addresses;
- publishing candidate/stable locks;
- Sepolia/mainnet deployment or production App rollout.

## Return path to the Contract owner

The App agent should return:

- its D1-D8 decision matrix;
- any requested ABI or verifier change as a written delta;
- App-generated cross-repository vectors;
- its proposed immutable App integration-lock schema;
- local Anvil test evidence.

The Contract owner can then evaluate only the Contract-side deltas, implement
approved changes here, and publish a fresh noncanonical integration preview
or later a clean candidate release.
