# THOUGHT V2 canonical portable Contract release r3 handoff

Date: 2026-08-22

From: THOUGHT Contract owner

To: `inshell.art/thought` owner

## Purpose

r3 is the production-consumable Contract package for the canonical THOUGHT V2
bytecode after adopting the sealed Inshell Mono 76 `v1.1.0` glyph package. It
supersedes r2 for new consumption. It does not alter THOUGHT ABI, bytecode,
token state, metadata, provenance, attestation, renderer output, or mint
semantics.

## Exact delta from r2

- vendor the sealed Mono 76 `v1.1.0` release in place of `v1.0.0`, including
  its changelog, per-glyph shape proofs, machine-readable shape audit,
  geometry contract, conformance vectors, and hash-bound owner approval
  record;
- record the vendored package identity (`faceSha256`
  `2db30b08…`, tag `v1.1.0`, revision
  `mono-76-centerline-v1-shape-approved-20260822`) in the renderer profile;
- record the attested glyph face separately in the renderer profile as
  `attestedFaceSha256` `7ed61ed6…`.

Mono 76 `v1.1.0` is a shape-approval re-seal. It changes no glyph path. Its
IM76 payload is byte-identical to `v1.0.0`, so `packedSha256`,
`packedKeccak256`, and every rendered artwork byte are unchanged.

## Attested face versus vendored face

The renderer publishes `GLYPH_SOURCE_SHA256` `7ed61ed6…`, the face whose bytes
were packed into IM76 and deployed. That constant is deliberately unchanged by
r3: it remains a truthful statement of the deployed payload's origin, and
changing it would alter contract bytecode for a release that alters no
geometry.

The vendored package is `v1.1.0`. Both facts are published in the renderer
profile so that a consumer can verify the deployed attestation and the current
sealed package independently.

## Consumer rule

Consume r3 as one immutable pin. Verify its annotated tag, tag target,
manifest SHA-256, and every `SHA256SUMS.txt` entry. Do not mix r3 dependency
bytes with the r2 release envelope.

The package contains machine-readable r2-to-r3 evidence proving that every
bundled ABI, creation bytecode, runtime bytecode, selected-spec byte, IM76
payload, metadata profile, provenance schema, and token URI fixture is exact,
and that the single declared change — the renderer profile's glyph-source
provenance — is present and hash-evidenced.

## Authorization boundary

`productionConsumable: true` authorizes exact-byte consumption only. This
package bundles no deployment addresses or transactions, authorizes no
persistent-chain deployment, and does not by itself authorize frontend
rollout.
