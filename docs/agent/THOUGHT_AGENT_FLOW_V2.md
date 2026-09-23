# THOUGHT Agent Flow V2

## Authority

The human owns the prompt, Agent choice, wallet, PATH authorization, and mint decision. The Agent performs one bounded creative round. It cannot choose a PATH token, authorize a wallet, or mint a THOUGHT.

The onchain contract remains permissionless. A direct caller may submit `ThoughtNFT.mint(MintThoughtInput)` without an Agent run, but the caller must still provide valid exact prompt, Agent, declared-Agent, and declared-model strings, a registered spec pair, provenance bytes, canonical empty or valid creation-attestation proof input, and PATH authorization. The canonical empty proof always takes the `Unattested` path.

## Release-bound result

The sealed task binds the exact protocol release, manifest, creative spec, Agent-result schema, and work profile. A result is one strict `inshell.thought.agent-result.v2` object:

```json
{
  "schema": "inshell.thought.agent-result.v2",
  "release": {
    "protocolReleaseId": "0x…",
    "manifestKeccak256": "0x…"
  },
  "agentLine": "one exact visible UTF-8 line",
  "agent": {
    "label": "Codex",
    "model": {
      "label": "GPT-5.6",
      "identifier": "optional exact runtime identifier",
      "source": "runtime_configured"
    }
  }
}
```

`agentLine`, `agent.label`, and `agent.model.label` each use the frozen 1-through-64-byte safe single-line profile. The accepted model source is exactly one of `connector_observed`, `runtime_configured`, `agent_declared`, `manual`, or `unknown`. The optional identifier must be a non-empty exact string when present.

The parser validates the entire object atomically: exact keys, release binding, Agent line, Agent shape, model label, model source, optional identifier, and optional Agent declaration. It never trims, normalizes, case-folds, repairs, or partially accepts a result. A failed parse leaves the run unreturned.

## Declaration handoff

After a result is accepted, the integration must:

1. copy exact `agent.label` unchanged into `MintThoughtInput.declaredAgent`;
2. copy exact `agent.model.label` unchanged into `MintThoughtInput.declaredModel`;
3. mirror those exact labels in `process.agentDeclaration.label` and `process.modelDeclaration.label`, preserving the model source and optional identifier; and
4. compare each provenance mirror with typed contract state when verifying the token.

`Declared Agent` and `Declared Model` are declaration-only context. A raw caller can claim any syntactically valid label, so neither may be presented as verified. The optional exact model identifier stays in provenance and never enters the collection trait. Typed contract values win over conflicting provenance mirrors.

## Work and provenance boundary

The reference builder validates exact `promptLine`, `agentLine`, `declaredAgent`, and `declaredModel` bytes. Only the prompt and Agent lines derive line hashes, Agent uniqueness, the packed 1,024-bit loom, SVG, and `workHash`. Neither declaration nor creation-attestation status alters creative identity.

Canonical `inshell.thought.provenance.v2` uses a strict `manual` or `agent-run` process branch. Both branches require `agentDeclaration` and `modelDeclaration`, and the closed protocol object carries the release/manifest commitments plus the exact selected `thoughtSpecId` and `thoughtSpecHash`. The shared builder verifies the exact spec bytes and compares their derived pair with the registered pair and mint draft; the shared verifier can additionally compare token state and an optional attestation claim. The contract stores provenance as opaque exact bytes and separately stores typed labels and the selected pair; it never parses provenance to obtain either trait or enforce the JSON schema.

An optional `inshell.thought.creation-workflow-attestation.v1` proof signs the exact selected creative-spec pair, provenance hash, and other contract-derived creation fields outside the provenance bytes. `ThoughtNFT` constructs the pair from the same validated mint fields it stores, so a proof for registered pair A cannot be reused with pair B. A valid proof yields the modest fixed status `Inshell THOUGHT App`; it does not prove Agent, model, browser, provider, route, or PATH execution. Verifier pause blocks only future nonempty proofs, and authority rotation cannot rewrite historical token metadata.

The wallet/PATH/mint action remains a distinct human step after result validation and review.
