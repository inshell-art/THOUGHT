# THOUGHT V2 Contract releases

This lane contains the current Terminal English / native-path-glyph V2
Contract packages. It is separate from both:

- `artifacts/thought-v2`, which is the unpublished binary-weave historical
  attempt; and
- `artifacts/thought-v2-integration-preview`, which contains noncanonical
  disposable-Anvil integration previews.

Immutable packages live under `releases/<artifact-id>/`. `stable.json` is a
discovery/publication receipt only. Consumers must pin the exact artifact ID,
manifest SHA-256, publication commit, and annotated tag rather than resolving
the pointer at runtime.

`productionConsumable: true` means a package is eligible to become an exact
downstream production byte pin. It does not authorize a Contract deployment,
frontend rollout, signer operation, or protocol registration. Those decisions
are expressed separately and require explicit operator approval.

The prepared r2 lane updates canonical r1 only for the reviewed PATH v0.5.0
dependency lock and App/Contract boundary. Its release checker proves exact r1
ABI, bytecode, creative-spec, renderer, metadata-profile, and fixture parity.
Use `npm run production-readiness:v2:check` before packaging. After an immutable
r2 package, annotated tag, and publication receipt exist, use
`npm run canonical-release:v2:check -- --require-published` to verify the
published stable binding. Neither command authorizes deployment or activation.
