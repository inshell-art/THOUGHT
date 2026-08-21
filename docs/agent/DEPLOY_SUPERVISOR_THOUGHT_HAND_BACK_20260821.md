# DEPLOY-SUPERVISOR THOUGHT Handback

Date: 2026-08-21
Owner repository: `/Users/bigu/Projects/THOUGHT`
Interop authority: `/Users/bigu/Projects/inshell-feed-ops/deployment-campaign/interop-v1.md`

## Outcome

THOUGHT's repository-owned campaign layer is aligned to frozen OPS interop v1.
It consumes the complete generic PATH Phase A envelope and validates the exact
PATH-owned `path_campaign_phase_a_receipt` object in
`protocol_payload.payload`. The previous THOUGHT-drafted alternate PATH shape
and schema were removed.

The implementation verifies:

- strict generic envelope fields and frozen phase/owner/schema identities;
- complete predecessor linkage (`input_receipt_sha256` is empty for PATH A and
  is the raw complete PATH envelope SHA-256 in the THOUGHT envelope);
- lowercase RFC 8785 JCS payload SHA-256;
- the integer-only interop subset (only IEEE-754-safe JSON integers; no floats,
  unsafe numeric integers, non-finite numbers, duplicate keys, or unpaired
  Unicode surrogates);
- campaign, environment, numeric chain identity, exact PathNFT, pinned PATH
  release, PATH source bundle, deployed transaction/address/block/runtime code,
  retained Phase B authority, all three unset/unfrozen movement states, and
  absent/unfrozen public exposure;
- the complete rich current-V2 THOUGHT payload, including release, source
  bundle, registry, immutable dependency, deployments, bytecode, authority,
  profiles, and exact approved ThoughtNFT integration address.

The THOUGHT payload retains `consumedPathPhaseAReceiptSha256` for shape
continuity and adds explicit `consumedPathPhaseA.envelopeSha256` and
`consumedPathPhaseA.payloadSha256`. It proves
`pathMutationPerformed: false` and `pathMutationOwner: PATH_PHASE_B`.

The generator now writes the strict `CAMPAIGN-PHASE.json`, immutable schema
mirrors, complete prior envelope, bundle-local validator/executor code,
bundle-contained JavaScript runtime dependencies, and executable `preflight`,
`execute`, `postconditions`, `verify-checkpoint`, and `resume` wrappers.

The production `execute` path is now complete for a later explicitly authorized
campaign. It fails closed unless Signing OS supplies the exact campaign context
and the bundle-declared RPC, encrypted deploy-keystore, password-file, and ADMIN
Ledger surfaces. Before any signer invocation it verifies the pinned clean V2
release manifest and every relocated contract/spec/glyph byte sequence, then
requires the exact eight-step plan, signer assignment, artifact, constructor,
call, checkpoint, and PATH no-mutation policy. It records the signing intent
before invoking `cast send` once. A failed or ambiguous signing invocation is
never retried.

Each mined transaction is read back and bound to the expected sender, target,
zero value, calldata/initcode hash, successful receipt, block, and deployed
address. Protocol postconditions then verify runtime code, exact registry bytes
and release commitments, owners/authority, renderer and metadata profiles,
ThoughtNFT immutable dependencies, and the unchanged PATH boundary. The
executor persists a checkpoint snapshot plus an append-only JSONL event log,
constructs the rich owner payload itself from that mined/readback evidence, and
emits only the strict generic envelope to
`SIGNING_OS_CAMPAIGN_OUTPUT_RECEIPT`. No caller-preconstructed production
receipt payload is accepted.

The separate test-only synthetic harness accepts a synthetic canonical PATH-A
envelope and THOUGHT payload, then exercises the exact production validators
and envelope constructor without RPC or deployment. No production phase
descriptor references the harness.

No signing, persistent-chain deployment, transaction broadcast, PATH mutation,
merge, staging, commit, protocol registration, or real credential use occurred.

## Changed Files

Interop implementation and bundle generation:

- `scripts/lib/thought-integrated-deployment.mjs`
- `scripts/lib/thought-campaign-executor.mjs`
- `scripts/thought-campaign-entrypoint.mjs`
- `scripts/synthetic-thought-campaign-harness.mjs`
- `scripts/write-thought-integrated-deployment-pack.mjs`
- `package.json`

Campaign contract, executable entrypoints, mirrors, schemas, and examples:

- `ops/integrated-campaign/CAMPAIGN-PHASE.json`
- `ops/integrated-campaign/README.md`
- `ops/integrated-campaign/bin/preflight`
- `ops/integrated-campaign/bin/execute`
- `ops/integrated-campaign/bin/postconditions`
- `ops/integrated-campaign/bin/verify-checkpoint`
- `ops/integrated-campaign/bin/resume`
- `ops/integrated-campaign/schemas/protocol-receipt-envelope.v1.schema.json`
- `ops/integrated-campaign/schemas/path-campaign-phase-a-receipt.v1.schema.json`
- `ops/integrated-campaign/schemas/thought-phase-input.v1.schema.json`
- `ops/integrated-campaign/schemas/thought-deployment-receipt.v1.schema.json`
- `ops/integrated-campaign/examples/path-phase-a-envelope.example.json`
- `ops/integrated-campaign/examples/thought-phase-input.example.json`
- `ops/integrated-campaign/examples/thought-deployment-receipt.example.json`

Tests and durable reporting:

- `scripts/test-thought-integrated-deployment.mjs`
- `docs/agent/THOUGHT_INTEGRATED_DEPLOYMENT_CAMPAIGN_ROLLOUT_REPORT_20260821.md`
- `docs/agent/DEPLOY_SUPERVISOR_THOUGHT_HAND_BACK_20260821.md`

Removed obsolete THOUGHT-owned alternates:

- `ops/integrated-campaign/schemas/path-phase-a-receipt.v1.schema.json`
- `ops/integrated-campaign/examples/path-phase-a-receipt.example.json`

## Dirty-Tree Boundary

The worktree was dirty before this owner pass. `package.json` was a pre-existing
modified tracked file that this pass had to extend. The campaign library,
generator, focused test, `ops/` tree, and rollout report were pre-existing
untracked campaign work that this pass aligned rather than reverting.

Pre-existing changes not modified by this owner pass remain in:

- `evm/foundry.toml`
- `scripts/write-thought-signing-os-pack.mjs`
- `evm/test/v2/IntegratedDeploymentCampaign.t.sol`
- `docs/agent/THOUGHT_INTEGRATED_DEPLOYMENT_CAMPAIGN_HANDBACK_20260821.md`

Nothing was staged, committed, merged, or reverted.

## Verification Results

Passed locally:

- `npm test`: 33 Vitest files / 184 tests and 38 campaign compatibility and
  no-network execution tests.
- `npm run test:evm`: 200 Solidity tests, including both current-V2 integrated
  campaign cross-phase tests.
- `npm run canonical-release:v2:check`: immutable r2 artifact, manifest, and 73
  files verified; deployment authorization remains false.
- `npm run production-readiness:v2:check`: artifact publication ready;
  persistent deployment and frontend activation remain false.
- Signing OS descriptor validation using its production `validate_descriptor`.
- Signing OS generic campaign suite: 13 tests passed.
- `git diff --check`.
- Focused `gitleaks detect --no-git --redact` scans of every campaign file/group:
  no leaks found.

Byte-identical mirrors:

```text
PATH payload schema SHA-256:
ec0e3baa332e2db3fd95d8122234a61c510718dd45ae651fd8032901dc28d507

OPS generic envelope schema SHA-256:
c74f493ba55326efcaca4be3ede6b33da319e2e6ae636817e1cb91aec550cccc
```

## Remaining Blockers

1. PATH must finish owner alignment and provide a real generic PATH-A envelope;
   PATH B must accept the exact emitted THOUGHT envelope and rich payload.
2. The three real immutable owner bundles need a Signing OS no-sign/no-broadcast
   rehearsal using the frozen campaign graph.
3. The dirty THOUGHT work must be separated, reviewed, and committed before any
   candidate bundle can be generated; the generator intentionally rejects this
   worktree.
4. OPS must freeze the release matrix and exact bundle digests. Operator signer,
   environment deployment, and future `openTime` approvals remain separate.

## Exact OPS Verification Commands

Run the THOUGHT checks:

```bash
cd /Users/bigu/Projects/THOUGHT
npm run test:integrated-deployment
npm test
npm run test:evm
npm run canonical-release:v2:check
npm run production-readiness:v2:check
git diff --check
```

Verify owner schema custody byte-for-byte:

```bash
cd /Users/bigu/Projects/THOUGHT
cmp ops/integrated-campaign/schemas/path-campaign-phase-a-receipt.v1.schema.json /Users/bigu/Projects/path/schemas/path.campaign.phase_a_receipt.schema.json
cmp ops/integrated-campaign/schemas/protocol-receipt-envelope.v1.schema.json /Users/bigu/Projects/inshell-feed-ops/deployment-campaign/schemas/protocol-receipt-envelope.v1.schema.json
shasum -a 256 ops/integrated-campaign/schemas/path-campaign-phase-a-receipt.v1.schema.json ops/integrated-campaign/schemas/protocol-receipt-envelope.v1.schema.json
```

Validate THOUGHT's descriptor using the generic Signing OS production parser:

```bash
cd /Users/bigu/Projects/THOUGHT
python3 -c 'import importlib.util,json,pathlib,sys; p="/Users/bigu/Projects/signing-os-ops/scripts/signing_os_deployment_campaign.py"; s=importlib.util.spec_from_file_location("campaign",p); m=importlib.util.module_from_spec(s); sys.modules[s.name]=m; s.loader.exec_module(m); d=json.load(open("ops/integrated-campaign/CAMPAIGN-PHASE.json")); phase={"phase_id":"thought","input":{"receipt_type":"inshell.path.phase-a.receipt.v1"},"output":{"receipt_type":"inshell.thought.deployment.receipt.v1"}}; m.validate_descriptor(d,phase=phase,environment="internal-sepolia",chain_id=11155111,bundle_path=pathlib.Path("ops/integrated-campaign").resolve()); print("Signing OS descriptor validation PASS")'
```

Run the isolated synthetic PATH-A-to-THOUGHT compatibility harness:

```bash
cd /Users/bigu/Projects/THOUGHT
THOUGHT_SYNTH_DIR="$(mktemp -d)"
node scripts/synthetic-thought-campaign-harness.mjs \
  --path-envelope ops/integrated-campaign/examples/path-phase-a-envelope.example.json \
  --thought-payload ops/integrated-campaign/examples/thought-deployment-receipt.example.json \
  --out "$THOUGHT_SYNTH_DIR/thought-envelope.json" \
  --campaign-id example-internal-sepolia-20260821 \
  --environment internal-sepolia \
  --chain-id 11155111 \
  --path-bundle-digest bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb \
  --path-retained-authority 0x2000000000000000000000000000000000000002 \
  --path-nft 0x1000000000000000000000000000000000000001 \
  --thought-bundle-digest 0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb \
  --registry-owner 0x4444444444444444444444444444444444444444 \
  --attestation-authority 0x5555555555555555555555555555555555555555
node -e 'const fs=require("node:fs"),crypto=require("node:crypto"); const f=process.argv[1],e=JSON.parse(fs.readFileSync(f)); if(e.receipt_type!=="inshell.thought.deployment.receipt.v1"||e.phase_id!=="thought"||e.protocol_payload.owner!=="thought") process.exit(1); console.log("thoughtEnvelopeSha256="+crypto.createHash("sha256").update(fs.readFileSync(f)).digest("hex")); console.log("thoughtPayloadSha256="+e.protocol_payload.sha256)' "$THOUGHT_SYNTH_DIR/thought-envelope.json"
```

Run the frozen generic Signing OS suite:

```bash
cd /Users/bigu/Projects/signing-os-ops
python3 -m unittest tests/test_signing_os_deployment_campaign.py
```

The focused executor tests use injected in-memory test doubles and perform no
network access. None of these commands signs, deploys through RPC, or broadcasts
a transaction.
