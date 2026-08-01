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
