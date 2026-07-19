# THOUGHT Provenance V2

Identifier: `inshell.thought.provenance.v2`

## Authority and boundary

Typed contract state is authoritative for accepted lines, declarations, work and line hashes, the binary loom, selected THOUGHT specification, collection release, PATH consumption, ownership, and all minted facts. Provenance is a pre-mint creation record that can be checked against typed state but cannot override it. Solidity stores and hashes the exact bounded bytes as opaque input; it does not parse JSON or enforce this schema.

The creation-attestation signature, digest, status, profile claim, and `provenanceHash` remain outside provenance. PATH authorization and consumption are also outside provenance. This keeps the attestation boundary on the witnessed creative workflow and avoids circular commitments.

## Exact canonical tree

Every positive V2 record has exactly these closed root objects and fields:

```text
mintContext
  chainId
  intendedMinter
  thoughtNft

process
  strict manual variant OR strict agent-run variant

protocol
  manifestKeccak256
  protocolReleaseId
  thoughtSpecHash
  thoughtSpecId

schema
  inshell.thought.provenance.v2

work
  agentIdentityHash
  agentLine
  agentLineKeccak256
  binaryFieldKeccak256
  binaryFieldPacked
  promptLine
  promptLineKeccak256
  workHash
```

`chainId` is a canonical nonzero decimal string fitting `uint256`. Addresses are exact lowercase nonzero addresses. The four protocol values are exact lowercase nonzero bytes32 values projected from the validated release and selected registry pair. The work object is recomputed under `inshell.thought.work.v2`; `binaryFieldPacked` contains all 1,024 underlying cells as exactly 128 bytes.

PATH address, PATH ID, movement, signatures, deadlines, token ID, transaction, block, mint-success, marketplace classifications, fixture bookkeeping, and repeated release-artifact descriptors are forbidden. The exact selected `thoughtSpecId + thoughtSpecHash` pair is explicit because it selects one registered creative specification under the release; it is not replaced by an artifact descriptor.

## Process variants

Manual is used when no complete validated Agent-result envelope and public-safe run commitment are retained:

```json
{"agentDeclaration":{"label":"Fixture Agent","source":"manual","status":"declared-unverified"},"kind":"manual","modelDeclaration":{"label":"Fixture Model","source":"manual","status":"declared-unverified"}}
```

Both declarations and their exact `manual` source are required. `transport` is forbidden. `modelDeclaration.identifier` is optional.

Agent-run is used only with a complete atomically validated `inshell.thought.agent-result.v2` object and an exact public-safe run reference:

```json
{"agentDeclaration":{"label":"Fixture Agent","source":"runtime_configured","status":"declared-unverified"},"kind":"agent-run","modelDeclaration":{"label":"Fixture Model","source":"runtime_configured","status":"declared-unverified"},"transport":{"resultEnvelopeKeccak256":"0x1111111111111111111111111111111111111111111111111111111111111111","runIdHash":"0x2222222222222222222222222222222222222222222222222222222222222222"}}
```

Agent-run declaration sources are exactly `agent_declared`, `connector_observed`, `runtime_configured`, or `unknown`; `manual` is forbidden. `resultEnvelopeKeccak256` is Keccak-256 of the RFC 8785 canonical UTF-8 bytes of the complete validated result object. `runIdHash` is Keccak-256 of the exact public-safe run-reference UTF-8 bytes; the raw reference remains outside provenance. Optional `adapter`, `provider`, and `route` are 1–128-byte ASCII public identifiers matching `[A-Za-z0-9][A-Za-z0-9._:/@+-]*`. Optional model identifiers are exact 1–256-byte public strings with no controls, disallowed scalars, rejected whitespace, or outer U+0020.

Both declaration objects always contain exact `label`, `source`, and `status: declared-unverified`. `agentDeclaration.schema`, `agentDeclaration.declaredOneCreativeResult`, and any Boolean purporting to prove execution are forbidden. Declarations remain unverified even when Creation Attestation is valid.

## Canonical bytes and verification

Positive bytes are RFC 8785 JCS, UTF-8 without BOM, leading/trailing whitespace, or final newline. Hexadecimal is lowercase, decimal strings are canonical, and unavailable optional values are omitted rather than represented by `null` or placeholders. `provenanceHash = keccak256(exact submitted bytes)`. The existing contract cap is 20,000 bytes.

The shared builder validates all four exact public labels/lines and optional metadata, projects release, collection, intended-minter, and selected-spec facts from one validated mint draft, validates and hashes Agent-run evidence, recomputes work/loom commitments, validates the strict closed schema, serializes once, enforces the byte cap, and hashes those bytes. Every positive fixture, mock attestation, disposable mint, tokenURI vector, and gallery download uses that builder and passes the same exact bytes through the shared structured verifier before use.

The verifier hashes exact bytes before parsing, rejects invalid UTF-8/JSON or non-JCS bytes, validates the strict schema and semantic profiles, recomputes all commitments, and compares supplied release, selected-spec, token/mint, declaration, run, and attestation facts. It returns ordered issue objects. Typed contract state wins over conflicting opaque provenance.

## Fixture and V1 boundary

Fixture IDs and names, corpus IDs and names, source paths, display order, duplicate bookkeeping, and test descriptions remain local harness data only. `inshell.thought.gallery-fixture.v1` and malformed provenance may appear only in explicitly named negative tests. Historical V1 provenance retains its original semantics and bytes; V2 tooling never rewrites or migrates it.

## Forbidden private content

Provenance must not contain system/developer prompts, hidden context, chain-of-thought, private Agent memory or tool output, callback/bearer/API credentials, wallet signatures, secret material, or a full private conversation.
