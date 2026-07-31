# THOUGHT V2 neutral Agent/Model contract refactor — implementation report

Date: 2026-07-31
Status: implemented and validated as a noncanonical integration preview
Production/registration authorization: none

## Outcome

Current V2 now stores Agent and Model as neutral typed records. They are always
published as `Agent` and `Model` marketplace traits. Creation Attestation is a
separate proof/status and no longer gates those traits.

The archived binary-weave attempt and its v1 attestation verifier were left
unchanged. Current V2 has a dedicated `CreationAttestationVerifierV2`, interface,
profile, domain version, type hash, and conformance vector. V1 signatures are
explicitly rejected.

## Contract changes

- `MintThoughtInput` and `ThoughtRecord`: `agent`, `model`.
- Public reads: `agentOf`, `modelOf`, `agentHashOf`, `modelHashOf`.
- Limits: `MAX_AGENT_RECORD_BYTES`, `MAX_MODEL_RECORD_BYTES`.
- Validator: `validateRecords`.
- Attestation claim: `agentHash`, `modelHash`.
- Attestation profile: `inshell.thought.creation-workflow-attestation.v2`.
- EIP-712 domain version: `2`.
- Metadata traits: Agent, Model, then Creation Attestation for every token.
- Metadata properties: neutral Agent/Model keys and `thought.records`.
- Provenance remains opaque exact bytes in Solidity; its App-owned wire schema
  was not renamed.

## Invariants retained

- PATH `consumeUnit` uses the canonical `uint32` return and widens to stored
  `uint256` without changing THOUGHT's external PATH serial API.
- Prompt/Agent line validation, ordered-pair uniqueness, work identity, and
  exact SVG rendering are unchanged.
- Failed validation/attestation/PATH/receiver operations remain atomic.
- Multiple registered THOUGHT specs remain mintable.
- Renderer metadata-profile compatibility remains fail-closed.
- Monolithic and split renderer bytes remain equal for representative,
  punctuation, repertoire, and maximum-line cases.

## Tests and release evidence

- `npm run test:evm`: 197 passed, 0 failed.
- `npm test -- --run`: 180 passed, 0 failed.
- `npm run build:evm`: pass.
- `npm run build`: pass.
- `npm run renderer:v2:check`: pass; all 76 Humanist Smooth glyphs and source
  hashes match.
- `npm run conformance:v2:app-contract`: pass against a fresh disposable Anvil
  deployment.
- `npm run integration-preview:v2:check`: pass; 48 packaged files and every
  checksum verified.
- `git diff --check`: pass.
- `gitleaks detect --no-git --redact`: one known false positive in generated
  `dist` UI copy adjacent to the literal phrase `api key`; source inspection
  found no embedded credential.

Runtime byte sizes remain below EIP-170:

| Contract | Runtime bytes | EIP-170 headroom |
| --- | ---: | ---: |
| `ThoughtNFTV2` | 17,252 | 7,324 |
| `ThoughtRendererV2` | 18,264 | 6,312 |
| `ThoughtRendererV2Split` | 11,080 | 13,496 |
| `CreationAttestationVerifierV2` | 3,864 | 20,712 |

Disposable Anvil minted 66 real tokens: 6 mock-attested and 60 Unattested.
Every token passed typed-state, provenance, metadata, trait-order, and
attestation parity checks. The package includes exact tokenURI examples for one
token on each attestation path.

The existing Humanist Smooth renderer's heaviest gallery tokenURI remains a
known RPC concern rather than a mint failure: 3,420,860 minimum, 6,495,903
average, and 10,966,244 maximum estimated view gas. This refactor did not alter
the artwork or resolve that separate renderer-cost topic.

## Integration-preview artifact

- Artifact ID:
  `thought-v2-noncanonical-integration-preview-20260731-r8`
- Classification: noncanonical integration preview
- Manifest SHA-256: recorded by the immutable `experimental.json` pointer
- Base commit: recorded by the package manifest
- Branch: `codex/thought-v2-chat-svg-experiment`
- Publication tag:
  `thought-v2-noncanonical-integration-preview-20260731-r8`

Packaged compiled-artifact SHA-256 values:

| Contract artifact | SHA-256 |
| --- | --- |
| `ThoughtNFTV2` | `7413b430cbdccee597768b7c6b75d88beeccd51b3d6b6ae853264e02ded1b0fc` |
| `ThoughtRendererV2` | `d8806a0c5f6b854beaceac9e3da80ce7f670951368ed269c3850d0e85a7f2822` |
| `CreationAttestationVerifierV2` | `207da0ebf4bb89fc4e008a6a85ece1ed46fc4d59f1686ed8e7b03d9d23150518` |

The downstream rollout contract is documented in
`IN_SHELL_ART_V2_NEUTRAL_AGENT_MODEL_INTEGRATION_PREVIEW_HANDOFF_20260731.md`.
