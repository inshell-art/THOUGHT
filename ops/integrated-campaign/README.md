# THOUGHT integrated campaign phase

This directory mirrors the frozen OPS generic envelope schema and the exact
PATH-owned `path_campaign_phase_a_receipt` schema. The mirrors are inputs to
THOUGHT validation, not THOUGHT-owned variants.

The production bundle generator writes `CAMPAIGN-PHASE.json` and five
protocol-owned entrypoints:

- `bin/preflight` validates the complete PATH Phase A envelope, its raw-file
  digest, empty predecessor link, JCS payload digest, owner payload, and the
  campaign's exact PathNFT/release/bundle/authority/state bindings.
- `bin/execute` is the bounded protocol transaction-plan executor. It assembles
  initcode from pinned artifacts, invokes each declared signer exactly once per
  step, waits for mined evidence, verifies the declared checkpoint, constructs
  the rich payload from readbacks, and writes the strict generic envelope only
  to `SIGNING_OS_CAMPAIGN_OUTPUT_RECEIPT`.
- `bin/postconditions` revalidates both complete envelopes, both payload
  digests, all THOUGHT evidence, and the exact predecessor linkage.

The descriptor exposes only `THOUGHT_RPC_URL`, encrypted deploy-keystore and
password-file paths, and the ADMIN Ledger derivation path. Their signer refs,
expected addresses, modes, RPC variable name, confirmations, and no-retry rule
are also pinned in `phase-input.json`. Cross-phase input and output use only
`SIGNING_OS_CAMPAIGN_INPUT_RECEIPT` and
`SIGNING_OS_CAMPAIGN_OUTPUT_RECEIPT`.

Generated transferable bundles include the lockfile-matched runtime packages
needed by their `.mjs` helpers; they do not depend on a repository checkout or
network package installation at execution time.

Every signing intent is persisted before invocation, followed by mined evidence
and a verified checkpoint in both the checkpoint snapshot and an append-only
JSONL event log. An intent without a verified checkpoint is
ambiguous and cannot be resumed or retried. `bin/verify-checkpoint` performs
read-only verification against preserved blocked evidence; `bin/resume` starts
only after the exact last verified protocol checkpoint.

`scripts/synthetic-thought-campaign-harness.mjs` is test-only. It exercises the
same production validators and envelope constructor without deployment or RPC,
and it is deliberately absent from `CAMPAIGN-PHASE.json`.

JCS is restricted to JSON integers in the IEEE-754 safe range. Floats,
non-finite values, and unsafe numeric integers are rejected; larger EVM
quantities must be decimal strings.
