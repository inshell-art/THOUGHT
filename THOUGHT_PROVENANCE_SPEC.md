# THOUGHT Provenance Field Spec

Date: 2026-05-02

This document explains the current `thought.provenance.v1` JSON record used by THOUGHT.

Provenance is a compact run and mint context record. It is stored onchain by `ThoughtToken.provenanceOf(tokenId)` and anchored by `recordOf(tokenId).provenanceHash`.

It is not a cryptographic proof that a provider actually generated the work. It is the canonical context the app publishes with the minted THOUGHT.

## Scope

The provenance record describes:

- the app build that produced the record;
- the prompt and model route used for one model round;
- the THOUGHT.md spec anchor used as system instruction;
- the returned model text and canonical text hash;
- the request/web-search configuration;
- the mint context when the record is prepared for onchain mint.

## Encoding

The app serializes provenance with stable JSON key ordering.

String hashes are computed as:

```text
keccak256(utf8Bytes(value))
```

Contract constraints:

```text
MAX_PROVENANCE_BYTES = 2048
MAX_TEXT_BYTES = 1024
```

## Top-Level Shape

```json
{
  "app": "THOUGHT",
  "appBuild": "dev",
  "appVersion": "0.0.2",
  "chain": {
    "chainId": "31337",
    "pathNFT": "0x...",
    "thoughtToken": "0x..."
  },
  "client": {
    "generatedAt": "2026-05-02T00:00:00.000Z"
  },
  "hashes": {
    "promptHash": "0x...",
    "returnedTextHash": "0x...",
    "textHash": "0x..."
  },
  "mint": {
    "minter": "0x...",
    "movement": "THOUGHT",
    "pathId": "1"
  },
  "model": "qwen/qwen3.6-plus",
  "output": {
    "format": "thought.text.v1",
    "normalizer": "thought.normalize.v1",
    "returnedText": "MODEL RETURN",
    "textHash": "0x..."
  },
  "prompt": "user prompt",
  "provider": "openrouter",
  "request": {
    "maxOutputTokens": "128"
  },
  "route": "connect",
  "schema": "thought.provenance.v1",
  "thoughtSpec": {
    "hash": "0x...",
    "id": "0x...",
    "ref": "THOUGHT.md@v1"
  },
  "web": {
    "enabled": true,
    "tool": "openrouter:web_search"
  }
}
```

`chain` and `mint` are present only when provenance is rebuilt for mint. A generated browser-session work can have provenance without those two sections.

## Field Reference

### `schema`

Schema identifier for this record.

Current value:

```text
thought.provenance.v1
```

Use this before interpreting the rest of the fields.

### `app`

Application name.

Current value:

```text
THOUGHT
```

### `appVersion`

Frontend package/app version that built the record.

Example:

```text
0.0.2
```

### `appBuild`

Build channel or build label.

Examples:

```text
dev
production
```

### `client.generatedAt`

ISO timestamp created by the client when the model run context was created.

This is client-side time, not block time.

### `route`

How THOUGHT reached the model.

Allowed values:

```text
local
connect
direct
```

Meanings:

- `local`: browser calls a local Ollama endpoint.
- `connect`: browser uses delegated OpenRouter authorization.
- `direct`: browser uses a session-only provider API key.

### `provider`

Provider family used for the model call.

Current values:

```text
openrouter
openai
anthropic
ollama
```

For `connect`, the provider is currently `openrouter`.

For `local`, the provider is currently `ollama`.

### `model`

Model identifier selected for the run.

Examples:

```text
qwen/qwen3.6-plus
openai/gpt-oss-120b:free
llama3.2:1b
```

This is the model requested by the app. Provider-side routing or aliases may still resolve internally.

### `prompt`

The user prompt sent into the model round.

This is shown as first-layer material on the THOUGHT detail page because it is part of the artwork context.

### `thoughtSpec`

Anchor for the THOUGHT.md spec used as the system instruction.

Fields:

- `id`: spec id used by the contract registry.
- `ref`: human-readable spec reference, for example `THOUGHT.md@v1`.
- `hash`: hash of the THOUGHT.md spec text.

Verification:

```text
keccak256(utf8Bytes(THOUGHT.md text)) == thoughtSpec.hash
```

### `request.maxOutputTokens`

Maximum model output tokens requested by the app.

Current value:

```text
128
```

It is stored as a string in provenance to keep the record compact and stable.

### `web`

Web-search configuration for the model call.

Fields:

- `enabled`: whether the app requested web-search support.
- `tool`: provider-specific tool name, or `unavailable`.

Examples:

```json
{ "enabled": true, "tool": "openrouter:web_search" }
```

```json
{ "enabled": false, "tool": "unavailable" }
```

### `output.returnedText`

Raw text returned by the model before THOUGHT normalization.

This is distinct from the minted canonical text. If it is byte-identical to the canonical text, the detail page may display `same as text`.

### `output.normalizer`

Identifier for the normalization rule applied before mint.

Current value:

```text
thought.normalize.v1
```

The contract is the source of truth for normalization and validation.

### `output.format`

Identifier for the output text format.

Current value:

```text
thought.text.v1
```

### `output.textHash`

Hash of the canonical minted THOUGHT text.

This duplicates `hashes.textHash` intentionally so the output block has its own local anchor.

Verification:

```text
keccak256(utf8Bytes(canonical text)) == output.textHash
```

### `hashes.promptHash`

Hash of `prompt`.

Verification:

```text
keccak256(utf8Bytes(prompt)) == hashes.promptHash
```

The same hash is passed to `ThoughtToken.mint(...)` and stored in `recordOf(tokenId).promptHash`.

### `hashes.returnedTextHash`

Hash of `output.returnedText`.

Verification:

```text
keccak256(utf8Bytes(output.returnedText)) == hashes.returnedTextHash
```

This anchors the provider return separately from the normalized canonical THOUGHT text.

### `hashes.textHash`

Hash of the canonical minted THOUGHT text.

Verification:

```text
keccak256(utf8Bytes(canonical text)) == hashes.textHash
```

The contract also stores this as `recordOf(tokenId).textHash`.

### `chain`

Onchain addresses used when the provenance is prepared for mint.

Fields:

- `chainId`: EVM chain id as a string.
- `pathNFT`: `$PATH` contract address.
- `thoughtToken`: THOUGHT token contract address.

This section is absent for pre-mint browser-session works.

### `mint`

Mint context added when provenance is rebuilt immediately before calling `ThoughtToken.mint(...)`.

Fields:

- `minter`: wallet address that submitted the mint.
- `movement`: currently `THOUGHT`.
- `pathId`: `$PATH` token consumed by the mint.

This section is absent for pre-mint browser-session works.

## Contract Anchors

For a minted THOUGHT, contract state is the authority for token anchors.

`ThoughtToken.recordOf(tokenId)` returns:

```text
textHash
promptHash
provenanceHash
thoughtSpecId
pathId
minter
mintedAt
```

`ThoughtToken.provenanceOf(tokenId)` returns:

```text
provenanceJson
```

Verification:

```text
keccak256(utf8Bytes(provenanceJson)) == recordOf(tokenId).provenanceHash
```

## Relationship Between Work and THOUGHT

`work` is generated by `run` and stored in the browser session.

`THOUGHT` is a minted onchain token made from a work.

The provenance record bridges them:

- before mint, provenance describes the generated work context;
- during mint, provenance is rebuilt with `chain` and `mint`;
- after mint, the contract stores provenance JSON and typed anchors.

## Verification Checklist

For a minted THOUGHT:

1. Fetch `recordOf(tokenId)`.
2. Fetch `provenanceOf(tokenId)`.
3. Verify `keccak256(utf8Bytes(provenanceJson)) == recordOf(tokenId).provenanceHash`.
4. Parse provenance JSON and verify `schema == thought.provenance.v1`.
5. Verify `keccak256(utf8Bytes(prompt)) == hashes.promptHash`.
6. Verify `keccak256(utf8Bytes(output.returnedText)) == hashes.returnedTextHash`.
7. Verify canonical text hash equals `hashes.textHash` and `recordOf(tokenId).textHash`.
8. Verify `thoughtSpec.id == recordOf(tokenId).thoughtSpecId`.
9. Verify `mint.pathId == recordOf(tokenId).pathId`.
10. Verify `mint.minter == recordOf(tokenId).minter`.

## Notes

- Provenance exposes context. It does not prove provider execution.
- Provider errors, raw API responses, and full provider traces are not stored by default.
- Keep provenance compact. The onchain provenance cap is 2048 bytes, and canonical THOUGHT text is capped at 1024 UTF-8 bytes.
- If the schema changes, introduce a new `schema` value rather than changing `thought.provenance.v1` in place.
