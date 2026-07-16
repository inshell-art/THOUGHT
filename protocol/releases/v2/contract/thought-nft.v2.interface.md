# ThoughtNFT V2 Conformance Interface

Public product name: `THOUGHT`

The unversioned `ThoughtNFT` constructor pins PATH, the exact-spec registry, the immutable `ThoughtRenderer`, `ThoughtSpecRegistryV2`, and one registered `protocolReleaseId`. Construction verifies contract code, the expected `RENDERER_ID_HASH`, and release registration. Mint remains permissionless and consumes exactly one PATH `THOUGHT` unit.

The contract validates exact lines and provenance, derives packed field and all hashes, rejects an existing `agentIdentityHash`, validates the supplied registered spec pair, consumes PATH, stores immutable facts, mints ERC-721, and emits events in that order. The constructor does not pin one spec version; multiple registered `THOUGHT.vN.md` versions may coexist and remain mintable.

Read helpers expose exact packed field, `binaryFieldKeccak256`, `agentIdentityHash`, `workHash`, registry/release/manifest bindings, frozen renderer/work-profile hashes, `svgOf`, and marketplace `tokenURI`. The contract computes and passes the authoritative field and validated metrics to the pinned renderer. The contract does not prove Agent authorship, one-round process truth, or opaque provenance semantics.
