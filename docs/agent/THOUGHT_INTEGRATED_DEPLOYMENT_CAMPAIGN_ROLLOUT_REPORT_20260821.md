# THOUGHT Integrated Deployment Campaign Rollout Report

Date: 2026-08-21
Repository: `THOUGHT`
Scope: THOUGHT-owned portion of the PATH + THOUGHT integrated deployment campaign

## Outcome

The THOUGHT deployment flow has been converted from the conflicting standalone Sepolia flow into a receipt-linked current-V2 protocol bundle.

The implemented ownership boundary is:

- PATH Phase A deploys `PathNFT` and leaves the THOUGHT movement unset, quota zero, and unfrozen.
- The THOUGHT phase consumes the complete generic PATH Phase A envelope, verifies the exact PATH-owned `path_campaign_phase_a_receipt` payload in place, deploys and verifies the pinned THOUGHT V2 stack, and emits the exact `ThoughtNFTV2` address in THOUGHT's canonical payload and a strict generic envelope.
- PATH Phase B exclusively configures and freezes the PATH THOUGHT movement.
- The THOUGHT phase does not mutate `PathNFT`.

No persistent-chain deployment, signer use, Safe use, protocol registration, PATH mutation, auction `openTime`, frontend exposure, or public rollout was performed or authorized.

## Implemented Changes

### Current-V2 protocol bundle generator

Added:

```text
scripts/write-thought-integrated-deployment-pack.mjs
```

The generator:

- requires a clean committed worktree;
- consumes a complete PATH Phase A envelope by exact raw-file SHA-256;
- verifies its empty predecessor link and RFC 8785 JCS payload SHA-256 under the safe-integer-only interoperability subset;
- binds campaign ID, environment, numeric chain ID, exact PathNFT, PATH bundle digest, and retained authority;
- pins PATH `v0.5.0` publication evidence;
- pins THOUGHT `thought-v2-canonical-portable-release-20260807-r2`;
- verifies the THOUGHT stable pointer, manifest, every declared release file, exact `THOUGHT.v2.md` identity, and Mono 76 payload;
- emits a typed transaction plan with output references instead of manually transcribed addresses;
- emits declarative registry, immutable-dependency, authority, profile, and PATH-prestate postconditions;
- declares `PathNFT.setMovementConfig` and `PathNFT.freezeMovementConfig` forbidden in the THOUGHT phase;
- emits bundle checksums and a content-derived bundle digest;
- generates `CAMPAIGN-PHASE.json` and protocol-owned preflight, execute, postcondition, checkpoint-verifier, and resume entrypoints for generic Signing OS;
- bundles the exact JavaScript runtime dependencies needed by the transferred immutable owner bundle;
- contains no deployment authorization.

Command:

```bash
npm run deployment:thought-phase:pack -- \
  --campaign-id <campaign-id> \
  --environment <internal-sepolia|public-beta-sepolia|mainnet> \
  --chain-id <chain-id> \
  --path-phase-a-envelope <envelope.json> \
  --expected-path-phase-a-envelope-sha256 <sha256> \
  --expected-path-bundle-digest <sha256> \
  --expected-path-retained-authority <address> \
  --expected-path-nft <address> \
  --deployer <address> \
  --deployer-signer-ref <signer-ref> \
  --registry-owner <address> \
  --registry-owner-signer-ref <signer-ref> \
  --attestation-authority <address> \
  --protocol-manifest-uri <immutable-uri>
```

### Receipt validation and linking

Added:

```text
scripts/lib/thought-integrated-deployment.mjs
```

Validation rejects:

- wrong campaign, environment, or chain;
- wrong PATH or THOUGHT release;
- complete PATH envelope or PATH payload digest mismatch;
- a non-empty PATH-A predecessor link, alternate generic envelope shape, floating-point JSON number, or unsafe numeric integer;
- PATH bundle digest or independently expected PathNFT mismatch;
- unexpected retained authority;
- placeholder or existing THOUGHT minter;
- nonzero THOUGHT quota;
- prematurely frozen THOUGHT movement;
- deployed or exposed public auction state in Phase A;
- incomplete deployment, registry, immutable, profile, or authority evidence;
- a THOUGHT receipt linked to a different `PathNFT`;
- a THOUGHT receipt claiming that the THOUGHT phase mutated PATH.

The THOUGHT payload preserves its rich current-V2 shape and now records both consumed PATH envelope and payload digests, `pathMutationPerformed: false`, and `pathMutationOwner: PATH_PHASE_B`. Its generic envelope links the exact complete PATH envelope. The validated THOUGHT envelope produces PATH Phase B input using receipt-carried addresses and all four envelope/payload digests without manual copying.

### Production transaction-plan executor

Added:

```text
scripts/lib/thought-campaign-executor.mjs
scripts/thought-campaign-entrypoint.mjs
ops/integrated-campaign/bin/verify-checkpoint
ops/integrated-campaign/bin/resume
```

The production execute path now:

- can run only through the Signing OS campaign context and its declared receipt/output/run-directory variables;
- accepts only the bundle-declared HTTPS RPC, encrypted deploy keystore/password file, and ADMIN Ledger derivation path;
- verifies the clean pinned release manifest and exact bundled artifacts before any signer invocation;
- requires the exact eight-step current-V2 plan, including exact signer assignment, initcode/call arguments, checkpoints, and forbidden PATH calls;
- records signing intent before one `cast send` invocation and never silently retries a failed or ambiguous action;
- verifies mined transaction sender, target, value, input hash, successful receipt, block, deployment address, runtime code, and protocol checkpoint;
- persists `thought-execution-checkpoints.json` plus append-only `thought-execution-events.jsonl` evidence;
- permits resume only from the exact last fully verified checkpoint after read-only re-verification; and
- constructs the rich THOUGHT owner payload from journaled mined evidence and final contract/PATH readbacks before emitting the strict generic envelope.

There is no production environment variable or file input for a
caller-preconstructed THOUGHT receipt payload. The synthetic harness remains a
separate test-only path and is absent from `CAMPAIGN-PHASE.json`.

### Machine-readable schemas and examples

Added under `ops/integrated-campaign/`:

```text
CAMPAIGN-PHASE.json
schemas/protocol-receipt-envelope.v1.schema.json
schemas/path-campaign-phase-a-receipt.v1.schema.json
schemas/thought-phase-input.v1.schema.json
schemas/thought-deployment-receipt.v1.schema.json
examples/path-phase-a-envelope.example.json
examples/thought-phase-input.example.json
examples/thought-deployment-receipt.example.json
```

The PATH and generic schema mirrors are byte-identical to their owning repositories. The examples use synthetic addresses and transaction hashes. They are documentation fixtures only and must not be used for deployment.

The test-only `scripts/synthetic-thought-campaign-harness.mjs` accepts a canonical synthetic PATH-A envelope and a synthetic THOUGHT payload, then uses the exact production validators and envelope helpers to produce a THOUGHT envelope without RPC or deployment. It is not referenced by the production phase descriptor.

### Archived flow disabled

The historical binary-weave standalone Sepolia pack generator now fails closed unconditionally:

```text
scripts/write-thought-signing-os-pack.mjs
```

It can no longer generate a pack that deploys historical contracts and mutates or freezes PATH as part of the THOUGHT phase.

### Cross-phase EVM coverage

Added:

```text
evm/test/v2/IntegratedDeploymentCampaign.t.sol
```

The test:

1. establishes the Phase A PATH state;
2. deploys the exact current-V2 registries;
3. registers exact `THOUGHT.v2.md` bytes;
4. registers the pinned release-manifest commitment;
5. deploys the sealed Mono 76 pointer and `ThoughtRendererV2`;
6. deploys `CreationAttestationVerifierV2` and `ThoughtNFTV2`;
7. verifies every immutable dependency;
8. proves the THOUGHT phase leaves PATH unchanged;
9. completes Phase B using the emitted `ThoughtNFTV2` address;
10. proves a wrong THOUGHT receipt address cannot freeze the movement.

## Immutable Release References

### PATH

```text
Release: v0.5.0
Publication commit: 085cfc084b0e568740e0da639e968eb535f7e5c8
Contract source commit: 5a1ab1f137e76c80dc69045dc520454f6e07cbb1
Manifest SHA-256: a81355b459b40faea894cf1dfb7f484765a7ec62672039dd62d58a3a52849921
```

### THOUGHT

```text
Artifact: thought-v2-canonical-portable-release-20260807-r2
Manifest SHA-256: 7cf7965edb3de6421c79d9c08f0781cabb78ea675bad354847b56ec8f19306cc
Publication commit: d29ddbfe76ff94c726b0786e43e61519c4087aab
Source tag: thought-v2-canonical-portable-release-20260807-r2
```

## Qualification Results

Passed:

```text
npm test
  184 Vitest tests passed
  38 integrated deployment compatibility and no-network execution tests passed

npm run test:evm
  200 Solidity tests passed

npm run canonical-release:v2:check
  canonical r2 manifest and all 73 declared files verified

npm run production-readiness:v2:check
  artifact publication readiness passed
  current deployment authorization remains false

git diff --check
  passed

gitleaks on all changed files
  passed; no findings
```

The repository-wide `gitleaks --no-git` scan reports one pre-existing finding in the ignored generated file `dist/assets/index-DmZ1lssk.js`. No rollout file is implicated.

## Resume and Failure Policy

Signing transactions must never be silently retried.

Protocol-declared checkpoints exist after every transaction, with snapshot and
append-only event evidence:

```text
thought-spec-registry-deployed
thought-spec-registered
protocol-registry-deployed
registries-registered
glyph-data-pointer-deployed
renderer-ready
attestation-verifier-deployed
thought-deployed
```

A clean interruption may resume only after re-verifying:

- campaign, environment, and chain;
- complete PATH Phase A envelope SHA-256 and PATH payload JCS SHA-256;
- PATH and THOUGHT bundle digests;
- completed transaction receipts;
- deployed addresses and bytecode;
- registry readback;
- authority state;
- checkpoint postconditions.

A wrong address, role, bytecode, chain, permanent freeze, registry commitment, or authority state abandons the stack. Deployment evidence must not be edited to make a failed stack appear complete.

## Remaining Cross-Repository Gates

The integrated campaign is not yet executable end to end.

Required next handbacks:

1. PATH must finish its owner alignment so Phase A emits the generic envelope with its canonical payload and Phase B consumes the exact THOUGHT envelope/payload.
2. Signing OS's frozen generic core passes its own 13-test suite, but the three real owner bundles still require one no-sign/no-broadcast end-to-end rehearsal.
3. OPS must freeze the release matrix and approve the combined campaign graph and bundle digests.
4. The operator must separately authorize each signer, environment deployment, and future `openTime`.
5. Internal Sepolia must pass before public-beta Sepolia; accepted public-beta evidence is required before mainnet.

No real THOUGHT deployment bundle was generated and the production executor was
not invoked during this rollout: no real PATH Phase A receipt or deployment
authorization was supplied, no credentials or RPC were used, and the
implementation worktree is not yet a clean committed source state. Executor
coverage used injected test doubles only.
