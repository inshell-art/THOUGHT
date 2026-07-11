# THOUGHT.v2.md

Version: v2

## THOUGHT

THOUGHT is a human prompt transformed by the user's Agent into a fully onchain work.

The human is the principal and curator. The human supplies `promptLine`, reviews the Agent result, and decides whether to authorize a mint. The Agent is a bounded creative actor: it receives the sealed task, returns one `agentLine`, and submits one result.

The token stores both visible lines exactly as submitted to the contract:

```text
promptLine = visible human material
agentLine = visible Agent return
```

The contract derives the work hash and official SVG from those two lines. It does not prove that an Agent was used. A manual caller may mint directly when all contract invariants, PATH authorization, registered-spec validation, and provenance requirements pass.

## One Creative Round

This task allows exactly one creative Agent response.

Allowed:

```text
fetch sealed task
read this exact registered spec
produce one agentLine
submit one agent result
```

Forbidden:

```text
ask for clarification
offer alternatives
produce a draft and then rewrite it
perform a hidden repair pass
ask another model to improve the result
```

If the result is invalid, the run is rejected. Do not repair it with another creative response.

## Agent Boundary

The Agent must not:

```text
rewrite promptLine
choose a PATH
connect or use a wallet
authorize PATH consumption
sign a transaction
mint a THOUGHT
claim ownership of the work
```

The Agent may use the sealed task's prompt, registered spec, and permitted public references to choose one result. It must not treat a provenance declaration as proof of an offchain event.

## Visible Text Rules

`agentLine` must be one visible UTF-8 line.

Required:

```text
non-empty
no newline or control characters
no invisible Unicode controls
normal ASCII spaces only
no leading space
no trailing space
no repeated spaces
case preserved exactly as returned
fits the contract's byte and display-width limits
```

Case is not normalized. ASCII, non-Latin scripts, punctuation, and visible symbols are accepted or rejected only by the active contract's visible-text rules. Do not depend on the frontend to rewrite a result before mint.

The result may become public, fully onchain, and permanently inspectable. Return only a line suitable for that outcome.

## Required Agent Result

Submit exactly one JSON object conforming to `thought.agent-result.v2`:

```json
{
  "schema": "thought.agent-result.v2",
  "agentLine": "one visible Agent line",
  "provenanceFragment": {
    "schema": "thought.agent-fragment.v1",
    "declaredAgent": "Codex",
    "declaredOneRound": true,
    "declaredNoWalletUse": true,
    "thoughtSpecId": "0x...",
    "thoughtSpecHash": "0x..."
  }
}
```

The fragment is a declaration. It is not a provider signature, cryptographic attestation, or proof that the Agent actually received the prompt or obeyed every rule.

## Renderer and Provenance

The renderer machine identifier is:

```text
thought.svg.v2.fixed-a-32
```

It derives a fixed 1024-bit field from the exact UTF-8 bytes of:

```text
promptLine followed by agentLine
```

For a source shorter than 1024 bits, the byte-bit stream repeats cyclically. For a longer source, it truncates after the first 1024 bits. A one bit is a filled circle. A zero bit is a hollow ring.

The final provenance schema is `thought.provenance.v2`. It records the visible lines, technical spec anchor, renderer identifier, exact derived binary field, and applicable run or manual-mint context. It must not claim that an Agent event is cryptographically proven when it is only declared.

## Mint Boundary

The human reviews the candidate. The wallet and PATH authorization remain separate from generation. A valid mint requires a registered exact `(thoughtSpecId, thoughtSpecHash)` pair, non-empty provenance bytes, a usable PATH THOUGHT movement unit, and a successful public `ThoughtNFT.mint(MintThoughtInput)` call.

Do not confuse the website, Plugin, Skill, MCP tools, or run API with a mint authority. They are convenience and provenance surfaces. The contract is the authority for whether a mint succeeds.
