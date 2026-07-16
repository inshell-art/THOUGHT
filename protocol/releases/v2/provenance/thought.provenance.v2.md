# THOUGHT Provenance V2

Identifier: `inshell.thought.provenance.v2`

## Authority

Typed contract state is authoritative for accepted lines, line and work hashes, the binary loom, the collection release, PATH consumption, ownership, and all other minted facts. The exact pre-mint creation record is evidence that can be verified against typed state but can never override it. Agent/provider/model/route and one-round statements are declared process facts, not proof. Token ID, transaction, block, event, and derived renderer output are post-mint receipt facts and are not retroactively inserted into the creation record.

## Exact record

A conforming record uses the strict `thought.provenance.v2.schema.json` shape and preserves the exact accepted `promptLine` and `agentLine`. It binds the protocol release ID, exact manifest hash, creative spec, Agent-result schema, work profile, and renderer profile. It carries all deterministic line, identity, work, packed-field, and field-hash values plus a strict `manual` or `agent-run` process branch and only pre-mint chain/contract/minter/PATH context known before submission.

The canonical record bytes use RFC 8785 JSON Canonicalization Scheme (JCS), UTF-8 without BOM, no leading or trailing JSON whitespace, and no final newline. Lowercase hexadecimal and canonical decimal strings are required by the schema. `provenanceHash` is Keccak-256 of the exact submitted canonical bytes. The contract preserves and hashes the submitted bytes within its 20,000-byte cap but does not parse JSON; offchain schema validity and JCS conformance are therefore verifier labels, not typed contract facts.

## Responsibilities

- The FE/shared builder verifies the embedded protocol release, validates both lines and the complete Agent result, computes deterministic fields, builds JCS bytes, validates the strict schema, and fails the official run before mint on any mismatch.
- The contract validates both lines, Agent uniqueness, the exact registered creative-spec pair, release binding, PATH atomicity, and the provenance byte bound. It stores exact submitted provenance and exposes its hash.
- A verifier preserves and hashes bytes before parsing, byte-compares JCS output, validates the strict schema, rederives every deterministic field, compares optional typed token facts, and reports explicit mismatch reasons.
- A viewer treats opaque provenance as untrusted display data and labels Agent declarations `declared-unverified`.

## Forbidden content

Creation provenance must not contain system/developer prompts, hidden context, chain-of-thought, private Agent memory or tool output, callback/bearer/API credentials, wallet signatures, secret material, future token IDs, transaction hashes, block facts, mint-success claims, or returned PATH serials unknown before mint. Optional fields are omitted when unavailable; placeholders are not data.

## V1 boundary

Historical V1 tokens retain `thought.provenance.v1` semantics and bytes. V2 tooling must not reinterpret, normalize, rewrite, or migrate those records. The V2 provenance spec, schema, and fixtures are exact release artifacts committed by the release manifest; they are not separately minted or copied in full into the registry.
