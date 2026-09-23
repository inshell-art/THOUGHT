# THOUGHT V2 App / Contract boundary review handoff

Date: 2026-07-23
From: THOUGHT Contract owner workspace
To: `inshell.art` / THOUGHT App owner
Status: review request; no App rollout or production authorization

## What is ready

The Contract repository now has a contract-owner boundary draft in:

- `protocol/current/v2/integration/thought.app-contract-boundary.v1.md`;
- `protocol/current/v2/integration/thought.app-contract-boundary.v1.json`.

The Markdown explains responsibilities and trust semantics. The JSON pins the
current executable constructor, mint fields, profile IDs, byte limits,
Creation Attestation claim order, trait policy, registry dependencies, and
open decisions.

The draft is deliberately non-authoritative. It does not implement or approve
the registry-removal architecture discussed on 2026-07-23.

## Current executable contract facts

`ThoughtNFTV2` currently requires immutable:

- PATH NFT;
- THOUGHT spec registry;
- renderer;
- protocol registry and a registered protocol release ID;
- Creation Attestation verifier.

Its current mint input requires:

- `promptLine`;
- `agentLine`;
- `declaredAgent`;
- `declaredModel`;
- `pathId`;
- `thoughtSpecId`;
- `thoughtSpecHash`;
- `provenanceJson`;
- PATH `deadline` and `pathSignature`;
- `creationAttestation`.

Do not remove or omit the registry/spec fields in App integration yet. The
desired attestation-only architecture remains a proposed target.

## What the Contract verifies

The Contract validates:

- the exact Terminal English line profile;
- declaration-label byte/profile rules;
- nonempty provenance up to 20,000 UTF-8 bytes;
- the registered selected-spec pair;
- ordered prompt-plus-Agent uniqueness and work uniqueness;
- the canonical empty proof or a valid Creation Attestation;
- PATH authorization and atomic consumption.

It derives and stores all typed state, work commitments, exact provenance
bytes/hash, selected spec, attestation digest, PATH facts, and mint facts.

Solidity does not parse the provenance schema. The App is responsible for
building and verifying canonical App provenance before an official mint. An
Unattested direct caller can submit any nonempty provenance bytes within the
contract envelope.

## Creation Attestation bridge

The current EIP-712 claim binds:

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

The Contract reconstructs these authoritative values. The signer must
reconstruct canonical provenance and claim values from an App-controlled
completed run; it must never sign a browser-supplied digest blindly.

A valid proof means the configured authority signed the exact claim. It does
not independently prove the provider/model declarations or semantic
compliance. The declaration status remains `declared-unverified`.

## Trait policy to review

Every token has:

- `Creation Attestation`;
- prompt, Agent, and pair byte counts;
- prompt and Agent length classes.

A valid nonzero Creation Attestation additionally exposes:

- `Attested Agent`;
- `Attested Model`.

An Unattested token still stores `declaredAgent` and `declaredModel` in typed
state and technical metadata, but omits filterable Agent/Model traits.
Provenance content cannot elevate those traits.

## Run the executable boundary gate

Use a disposable Anvil chain only:

```bash
npm run devnode:v2:start
```

In another terminal:

```bash
npm run devnode:v2:gallery
npm run conformance:v2:app-contract
```

The gate checks:

- bytecode at every configured dependency;
- immutable address and release pins;
- Contract, renderer, and verifier profile parity;
- limits and verifier authority state;
- all gallery tokenURI/provenance/trait rules;
- attested versus Unattested counts;
- direct typed-state parity samples;
- selected-spec and protocol-manifest readback;
- continued non-authorization of the proposed registry-removal target.

Current local evidence: 66 disposable Anvil tokens, with 6 mock-attested and
60 Unattested, pass.

The same working state also passes:

- TypeScript/Vite production build;
- 149 TypeScript tests across 28 suites;
- Solidity build with `0.8.28`;
- 177 Solidity tests across 7 suites.

## Review requested from the App owner

For each item, answer `accept`, `amend`, or `defer`:

1. Final Creation Attestation EIP-712 type and profile name.
2. Manual-work UI entry and field labels.
3. Minimal guided Unattested provenance profile.
4. Whether raw provenance appears in the App.
5. Signer authority, rotation, pause, custody, and epoch policy.
6. Final uniqueness rule and accepted Unattested ordering race.
7. Historical/publication treatment of registry and verifier artifacts.
8. Cross-repository handoff and immutable integration-lock formats.

Also resolve the ownership conflict: the current
`docs/agent/THOUGHT_ARTIFACT_CONSUMPTION_BOOK.md` assigns creative-spec and
provenance-schema ownership to THOUGHT, while the new proposal assigns them to
the THOUGHT App owner.

## What not to do yet

- Do not implement the proposed attestation-only ABI.
- Do not delete registry or selected-spec integration.
- Do not create a production signer or insert a private key in frontend code.
- Do not pin disposable Anvil addresses.
- Do not treat the Source Code Pro `foreignObject` renderer as release-ready.
- Do not publish a candidate/stable App or Contract lock from this dirty
  working state.

After joint approval, the Contract owner can write the exact Contract delta,
implement it, regenerate immutable Contract artifacts/vectors, and provide a
clean release candidate. The App owner can then pin that release in an App
integration lock and implement the product workflow.
