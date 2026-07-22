# THOUGHT V2 integration previews

This tree contains explicitly noncanonical contract-integration previews for
the `inshell.art` development agent.

These artifacts are experimental. They are not candidate or stable releases,
are not authorized for protocol-registry registration, contain no Sepolia or
mainnet deployment, and must never be consumed by production.

Each immutable preview is stored under `releases/<artifact-id>/`. The
`experimental.json` file is a discovery pointer only. Consumers must verify
the pointed manifest and `SHA256SUMS.txt`, then pin the immutable artifact ID
and manifest SHA-256.

The authoritative publication and consumption rules remain
`docs/agent/THOUGHT_ARTIFACT_CONSUMPTION_BOOK.md`.
