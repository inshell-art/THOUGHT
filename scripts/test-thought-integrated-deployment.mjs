import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  PATH_PHASE_A_RECEIPT_TYPE,
  PINNED_PATH_RELEASE,
  THOUGHT_RECEIPT_SCHEMA,
  jcsCanonicalize,
  makePathPhaseBInput,
  makeThoughtCampaignPhaseDescriptor,
  makeThoughtReceiptEnvelope,
  parseJsonStrict,
  sha256Bytes,
  sha256Jcs,
  validatePathEnvelopeFile,
  validatePathPhaseAEnvelope,
  validateThoughtEnvelope,
  validateThoughtReceiptForPathPhaseB,
} from "./lib/thought-integrated-deployment.mjs";
import {
  CHECKPOINTS,
  EXECUTION_EVENTS,
  EXECUTION_JOURNAL,
  executeTransactionPlan,
  executionContext,
  verifyExecutionCheckpoint,
} from "./lib/thought-campaign-executor.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const examples = path.join(root, "ops/integrated-campaign/examples");
const pathEnvelopeFile = path.join(examples, "path-phase-a-envelope.example.json");
const readJson = (file) => JSON.parse(fs.readFileSync(file, "utf8"));
const clone = (value) => structuredClone(value);
const sha = (digit) => digit.repeat(64);
const h = (digit) => `0x${sha(digit)}`;
const address = (digit) => `0x${digit.repeat(40)}`;
const pathEnvelope = () => readJson(pathEnvelopeFile);
const pathEnvelopeSha256 = () => sha256Bytes(fs.readFileSync(pathEnvelopeFile));
const pathExpected = () => ({
  campaignId: "example-internal-sepolia-20260821",
  environment: "internal-sepolia",
  chainId: 11155111,
  pathBundleDigest: sha("b"),
  retainedAuthority: "0x2000000000000000000000000000000000000002",
  pathNft: "0x1000000000000000000000000000000000000001",
});
const thoughtPayload = () => readJson(path.join(examples, "thought-deployment-receipt.example.json"));
const thoughtExpected = () => ({
  ...pathExpected(),
  pathPhaseAEnvelopeSha256: pathEnvelopeSha256(),
  pathPhaseAPayloadSha256: pathEnvelope().protocol_payload.sha256,
  thoughtBundleDigest: h("b"),
  registryOwner: address("4"),
  attestationAuthority: address("5"),
  protocolReleaseId: thoughtPayload().registry.protocolReleaseId,
  protocolManifestHash: thoughtPayload().registry.protocolManifestHash,
});

function makeExecutionBundle(directory) {
  const phaseInput = readJson(path.join(examples, "thought-phase-input.example.json"));
  const releaseRoot = path.join(
    root,
    "artifacts/thought-v2-contract-release/releases/thought-v2-canonical-portable-release-20260807-r2",
  );
  fs.mkdirSync(path.join(directory, "release/contracts"), { recursive: true });
  for (const name of [
    "ThoughtSpecRegistry", "ThoughtSpecRegistryV2", "ThoughtRendererV2",
    "CreationAttestationVerifierV2", "ThoughtNFTV2",
  ]) fs.copyFileSync(
    path.join(releaseRoot, `contract/compiled/${name}.json`),
    path.join(directory, `release/contracts/${name}.json`),
  );
  fs.copyFileSync(path.join(releaseRoot, "protocol/current/v2/THOUGHT.v2.md"), path.join(directory, "release/THOUGHT.v2.md"));
  fs.copyFileSync(path.join(releaseRoot, "protocol/current/v2/renderer/mono-76.im76.bin"), path.join(directory, "release/mono-76.im76.bin"));
  fs.copyFileSync(path.join(releaseRoot, "manifest.json"), path.join(directory, "release/manifest.json"));
  fs.writeFileSync(path.join(directory, "phase-input.json"), `${JSON.stringify(phaseInput, null, 2)}\n`);
  const plan = {
    schema: "inshell.deployment.protocol-bundle.transaction-plan.v1",
    campaignId: phaseInput.campaignId,
    bundleId: phaseInput.bundleId,
    environment: phaseInput.environment,
    chainId: phaseInput.chainId,
    resumability: {
      retrySigningTransactionSilently: false,
      checkpoints: [...CHECKPOINTS],
      onWrongAddressRoleBytecodeOrChain: "abandon-stack",
    },
    steps: [
      { id: "deploy-thought-spec-registry", action: "deploy", signerRef: "EXAMPLE_DEPLOYER", artifact: "release/contracts/ThoughtSpecRegistry.json", constructor: [address("4")], output: "thoughtSpecRegistry", checkpointAfter: CHECKPOINTS[0] },
      { id: "register-thought-spec", action: "call", signerRef: "EXAMPLE_ADMIN", to: { outputRef: "thoughtSpecRegistry" }, signature: "registerThoughtSpec(string,string,bytes)", args: ["THOUGHT.v2.md", phaseInput.selectedSpec.ref, { fileRef: "release/THOUGHT.v2.md", encoding: "raw-bytes" }], checkpointAfter: CHECKPOINTS[1] },
      { id: "deploy-protocol-registry", action: "deploy", signerRef: "EXAMPLE_DEPLOYER", artifact: "release/contracts/ThoughtSpecRegistryV2.json", constructor: [address("4")], output: "protocolRegistry", checkpointAfter: CHECKPOINTS[2] },
      { id: "register-protocol-release", action: "call", signerRef: "EXAMPLE_ADMIN", to: { outputRef: "protocolRegistry" }, signature: "registerRelease(bytes32,string)", args: [phaseInput.protocolRegistration.manifestHash, phaseInput.protocolRegistration.manifestUri], checkpointAfter: CHECKPOINTS[3] },
      { id: "deploy-glyph-data-pointer", action: "deploy-code-storage", signerRef: "EXAMPLE_DEPLOYER", payload: "release/mono-76.im76.bin", expectedPayloadKeccak256: "0xba37d00bb395b84f0487791300a29cdd2b1712b078fa218c6ed74fa11d74a081", output: "glyphDataPointer", checkpointAfter: CHECKPOINTS[4] },
      { id: "deploy-thought-renderer", action: "deploy", signerRef: "EXAMPLE_DEPLOYER", artifact: "release/contracts/ThoughtRendererV2.json", constructor: [{ outputRef: "glyphDataPointer" }], output: "thoughtRenderer", checkpointAfter: CHECKPOINTS[5] },
      { id: "deploy-creation-attestation-verifier", action: "deploy", signerRef: "EXAMPLE_DEPLOYER", artifact: "release/contracts/CreationAttestationVerifierV2.json", constructor: [address("4"), address("5")], output: "creationAttestationVerifier", checkpointAfter: CHECKPOINTS[6] },
      { id: "deploy-thought-nft", action: "deploy", signerRef: "EXAMPLE_DEPLOYER", artifact: "release/contracts/ThoughtNFTV2.json", constructor: [pathExpected().pathNft, { outputRef: "thoughtSpecRegistry" }, { outputRef: "thoughtRenderer" }, { outputRef: "protocolRegistry" }, phaseInput.protocolRegistration.protocolReleaseId, { outputRef: "creationAttestationVerifier" }], output: "thoughtNft", checkpointAfter: CHECKPOINTS[7] },
    ],
    forbiddenCalls: [
      "PathNFT.setMovementConfig(bytes32,address,uint32)",
      "PathNFT.freezeMovementConfig(bytes32)",
    ],
  };
  fs.writeFileSync(path.join(directory, "transaction-plan.json"), `${JSON.stringify(plan, null, 2)}\n`);
  return phaseInput;
}

class FakeExecutionAdapter {
  constructor({ failAt = -1, transactionBase = 0 } = {}) {
    this.failAt = failAt;
    this.transactionBase = transactionBase;
    this.executed = [];
    this.verified = [];
    this.preflights = 0;
    this.deployAddresses = new Map([
      ["deploy-thought-spec-registry", address("3")],
      ["deploy-protocol-registry", address("4")],
      ["deploy-glyph-data-pointer", address("5")],
      ["deploy-thought-renderer", address("6")],
      ["deploy-creation-attestation-verifier", address("7")],
      ["deploy-thought-nft", address("8")],
    ]);
  }

  async preflight() { this.preflights += 1; }

  async executeStep(step, operation) {
    const index = this.executed.length;
    this.executed.push({ step, operation });
    if (index === this.failAt) throw new Error("synthetic signer interruption");
    return {
      transactionHash: `0x${(this.transactionBase + index + 1).toString(16).padStart(64, "0")}`,
      blockNumber: 100 + index,
      contractAddress: operation.kind === "create" ? this.deployAddresses.get(step.id) : undefined,
      status: "success",
    };
  }

  async verifyCheckpoint(step) {
    this.verified.push(step.id);
    return DEPLOYMENT_NAMES_FOR_TEST.has(step.id) ? { runtimeBytecodeHash: h("e") } : { registered: true };
  }

  async collectFinalReadback() {
    return {
      exactSpecBytesVerified: true,
      pathNftImmutable: pathExpected().pathNft,
      rendererIdHash: "0x01982604c90acf1ca63020e0c3761b25d8dc8fc3c267d27ace14cb0d2c813d73",
      metadataProfileIdHash: "0x4cefae9cf44cc61bc8ec16e266ecb31f53e634834fe5975cc564ae9dfc51858b",
      workProfileIdHash: "0x2bf311e6034eb35e6d1f7bd92894012ee7e528609830cb3b28df1ce5dd82f85a",
      contextProfileIdHash: "0x9894359f9294f4b3a871442b19d851203138fad4a648c16f62fc04f55dff02b8",
      creationAttestationProfileId: "0x5759a606b1b0b1ba997b2d7b851c7e2022ed8ff4e0238e55e29ad8b36ce9194a",
      registryOwner: address("4"),
      protocolRegistryOwner: address("4"),
      attestationVerifierOwner: address("4"),
      attestationAuthority: address("5"),
      attestationAuthorityEpoch: 1,
    };
  }
}

const DEPLOYMENT_NAMES_FOR_TEST = new Set([
  "deploy-thought-spec-registry", "deploy-protocol-registry", "deploy-glyph-data-pointer",
  "deploy-thought-renderer", "deploy-creation-attestation-verifier", "deploy-thought-nft",
]);

function makeExecutorContext(bundleRoot, runDir) {
  const phaseInput = readJson(path.join(bundleRoot, "phase-input.json"));
  const prior = validatePathEnvelopeFile(pathEnvelopeFile, pathEnvelopeSha256(), pathExpected());
  return executionContext({ bundleRoot, runDir, phaseInput, prior, bundleSha256: sha("b") });
}

test("RFC 8785 helper sorts object keys and hashes the canonical bytes", () => {
  const value = { z: 1, a: [true, { y: "x", b: null }] };
  assert.equal(jcsCanonicalize(value), '{"a":[true,{"b":null,"y":"x"}],"z":1}');
  assert.equal(sha256Jcs(value), sha256Bytes(Buffer.from(jcsCanonicalize(value))));
});

test("strict JSON parsing rejects duplicate object keys before canonicalization", () => {
  assert.throws(() => parseJsonStrict('{"payload":{"x":1,"x":2}}'), /duplicate object key/);
});

for (const source of ['{"value":1.0}', '{"value":1e0}', '{"value":0E+0}']) {
  test(`strict JSON parsing rejects floating-point syntax ${source}`, () => {
    assert.throws(() => parseJsonStrict(source), /floating-point JSON numbers are forbidden/);
  });
}

test("Node JCS digest matches the frozen Signing OS Python implementation", () => {
  const python = [
    "import hashlib,importlib.util,json,sys",
    'p="/Users/bigu/Projects/signing-os-ops/scripts/signing_os_deployment_campaign.py"',
    's=importlib.util.spec_from_file_location("campaign",p)',
    "m=importlib.util.module_from_spec(s)",
    "sys.modules[s.name]=m",
    "s.loader.exec_module(m)",
    `payload=json.load(open(${JSON.stringify(pathEnvelopeFile)}))["protocol_payload"]["payload"]`,
    'print(hashlib.sha256(m.jcs_canonical_bytes(payload)).hexdigest())',
  ].join("; ");
  const result = spawnSync("python3", ["-c", python], { encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout.trim(), pathEnvelope().protocol_payload.sha256);
});

for (const [label, value] of [
  ["floating-point", { value: 1.5 }],
  ["unsafe integer", { value: Number.MAX_SAFE_INTEGER + 1 }],
  ["non-finite", { value: Infinity }],
]) test(`JCS interoperability subset rejects ${label} numbers`, () => {
  assert.throws(() => jcsCanonicalize(value), /safe integer/);
});

test("accepts the complete canonical PATH-owned payload inside its generic envelope", () => {
  const validated = validatePathEnvelopeFile(pathEnvelopeFile, pathEnvelopeSha256(), pathExpected());
  assert.equal(validated.payload.kind, "path_campaign_phase_a_receipt");
  assert.equal(validated.payload.pathNft.address, pathExpected().pathNft);
  assert.equal(validated.payloadSha256, pathEnvelope().protocol_payload.sha256);
});

for (const [name, mutate, message] of [
  ["an alternate envelope field", (e) => { e.opaque_protocol_payload = {}; }, /fields mismatch/],
  ["a nonempty PATH-A prior link", (e) => { e.input_receipt_sha256 = sha("9"); }, /prior linkage/],
  ["a wrong payload digest", (e) => { e.protocol_payload.sha256 = sha("9"); }, /JCS SHA-256 mismatch/],
  ["payload reconstruction drift", (e) => { e.protocol_payload.payload.observedAtBlock = "102"; }, /JCS SHA-256 mismatch/],
  ["a wrong campaign", (e) => { e.campaign_id = "other"; }, /campaign mismatch/],
]) test(`rejects ${name}`, () => {
  const envelope = pathEnvelope();
  mutate(envelope);
  assert.throws(() => validatePathPhaseAEnvelope(envelope, pathExpected()), message);
});

for (const [name, mutate, message] of [
  ["a wrong PATH release", (p) => { p.pathRelease.releaseTag = "v0.4.0"; }, /wrong PATH release/],
  ["a wrong source bundle", (p) => { p.sourceBundleDigest = sha("c"); }, /bundle digest mismatch/],
  ["a wrong exact PathNFT", (_p, e) => { e.pathNft = address("9"); }, /PathNFT mismatch/],
  ["a wrong retained authority", (p) => { p.retainedAuthority.holder = address("3"); }, /unexpected PATH retained authority/],
  ["a premature WILL freeze", (p) => { p.movementStates.WILL.frozen = true; }, /WILL movement/],
  ["an adapter in Phase A", (p) => { p.publicExposure.pathPulseAdapter = address("8"); }, /public exposure/],
]) test(`rejects ${name}`, () => {
  const envelope = pathEnvelope();
  const expected = pathExpected();
  mutate(envelope.protocol_payload.payload, expected);
  envelope.protocol_payload.sha256 = sha256Jcs(envelope.protocol_payload.payload);
  assert.throws(() => validatePathPhaseAEnvelope(envelope, expected), message);
});

test("rejects a raw envelope file digest mismatch", () => {
  assert.throws(() => validatePathEnvelopeFile(pathEnvelopeFile, sha("f"), pathExpected()), /envelope SHA-256 mismatch/);
});

test("preserves the rich THOUGHT payload and emits a strict generic envelope", () => {
  const payload = thoughtPayload();
  const expected = thoughtExpected();
  validateThoughtReceiptForPathPhaseB(payload, expected);
  const envelope = makeThoughtReceiptEnvelope(payload, expected);
  const validated = validateThoughtEnvelope(envelope, expected);
  assert.deepEqual(validated.payload, payload);
  assert.equal(envelope.input_receipt_sha256, expected.pathPhaseAEnvelopeSha256);
  assert.equal(envelope.protocol_payload.sha256, sha256Jcs(payload));
  assert.deepEqual(Object.keys(envelope).sort(), [
    "campaign_id", "chain_id", "environment", "input_receipt_sha256", "phase_id",
    "protocol_payload", "receipt_type", "schema_version",
  ]);
});

test("links exact PATH envelope/payload and THOUGHT envelope/payload into PATH Phase B input", () => {
  const expected = { ...thoughtExpected(), thoughtEnvelopeSha256: sha("c") };
  const envelope = makeThoughtReceiptEnvelope(thoughtPayload(), expected);
  const phaseB = makePathPhaseBInput(envelope, expected);
  assert.equal(phaseB.pathPhaseAEnvelopeSha256, expected.pathPhaseAEnvelopeSha256);
  assert.equal(phaseB.pathPhaseAPayloadSha256, expected.pathPhaseAPayloadSha256);
  assert.equal(phaseB.thoughtPayloadSha256, envelope.protocol_payload.sha256);
  assert.equal(phaseB.pathNft, pathExpected().pathNft);
  assert.equal(phaseB.thoughtNft, address("8"));
});

for (const [name, mutate, message] of [
  ["an alternate owner field", (p) => { p.alternate = true; }, /fields mismatch/],
  ["wrong consumed PATH payload digest", (p) => { p.consumedPathPhaseA.payloadSha256 = sha("9"); }, /PATH link mismatch/],
  ["wrong protocol release commitment", (p) => { p.registry.protocolReleaseId = h("9"); }, /registry evidence mismatch/],
  ["PATH mutation claim", (p) => { p.pathMutationPerformed = true; }, /integration boundary mismatch/],
  ["THOUGHT ownership of PATH Phase B", (p) => { p.pathMutationOwner = "THOUGHT"; }, /integration boundary mismatch/],
  ["incomplete registry verification", (p) => { p.verification.registry = "FAIL"; }, /verification is incomplete/],
]) test(`THOUGHT payload rejects ${name}`, () => {
  const payload = thoughtPayload();
  mutate(payload);
  assert.throws(() => validateThoughtReceiptForPathPhaseB(payload, thoughtExpected()), message);
});

test("CAMPAIGN-PHASE uses frozen envelope identities and cannot reach the synthetic harness", () => {
  const descriptor = makeThoughtCampaignPhaseDescriptor({
    bundleId: "campaign-thought", environment: "internal-sepolia", chainId: 11155111,
  });
  assert.equal(descriptor.input_receipt_type, PATH_PHASE_A_RECEIPT_TYPE);
  assert.equal(descriptor.output_receipt_type, THOUGHT_RECEIPT_SCHEMA);
  assert.deepEqual(descriptor.entrypoints, {
    preflight: "bin/preflight", execute: "bin/execute", postconditions: "bin/postconditions",
  });
  assert.deepEqual(descriptor.allowed_environment_variables, [
    "THOUGHT_RPC_URL", "THOUGHT_DEPLOY_KEYSTORE", "THOUGHT_DEPLOY_PASSWORD_FILE",
    "THOUGHT_ADMIN_LEDGER_DERIVATION_PATH",
  ]);
  assert.deepEqual(descriptor.resume_checkpoints.map((entry) => entry.checkpoint_id), CHECKPOINTS);
  assert.doesNotMatch(JSON.stringify(descriptor), /synthetic-thought-campaign-harness/);
  assert.doesNotMatch(JSON.stringify(descriptor), /THOUGHT_DEPLOYMENT_RECEIPT_PAYLOAD/);
});

test("bounded executor runs the pinned plan once and constructs payload only from mined/readback evidence", async () => {
  const bundleRoot = fs.mkdtempSync(path.join(os.tmpdir(), "thought-executor-bundle-"));
  const runDir = fs.mkdtempSync(path.join(os.tmpdir(), "thought-executor-run-"));
  makeExecutionBundle(bundleRoot);
  const context = makeExecutorContext(bundleRoot, runDir);
  const adapter = new FakeExecutionAdapter();
  const result = await executeTransactionPlan(context, adapter);
  assert.equal(adapter.preflights, 1);
  assert.equal(adapter.executed.length, 8);
  assert.equal(adapter.verified.length, 8);
  assert.equal(result.envelope.receipt_type, THOUGHT_RECEIPT_SCHEMA);
  assert.equal(result.envelope.input_receipt_sha256, pathEnvelopeSha256());
  assert.equal(result.payload.pathMutationPerformed, false);
  assert.equal(result.payload.pathMutationOwner, "PATH_PHASE_B");
  assert.equal(result.payload.contracts.thoughtNft, address("8"));
  assert.equal(result.payload.deployments.length, 6);
  assert.deepEqual(result.payload.deployments.map((entry) => entry.transaction), [h("0").slice(0, -1) + "1", h("0").slice(0, -1) + "3", h("0").slice(0, -1) + "5", h("0").slice(0, -1) + "6", h("0").slice(0, -1) + "7", h("0").slice(0, -1) + "8"]);
  assert.ok(result.payload.deployments.every((entry) => entry.creationBytecodeHash !== h("0")));
  assert.ok(result.payload.deployments.every((entry) => entry.runtimeBytecodeHash === h("e")));
  const journal = readJson(path.join(runDir, EXECUTION_JOURNAL));
  assert.equal(journal.lastCheckpoint, CHECKPOINTS.at(-1));
  assert.ok(journal.steps.every((entry) => entry.state === "verified"));
  const events = fs.readFileSync(path.join(runDir, EXECUTION_EVENTS), "utf8").trim().split("\n").map(JSON.parse);
  assert.equal(events.length, 25);
  assert.deepEqual(events.map((entry) => entry.sequence), Array.from({ length: 25 }, (_, index) => index + 1));
  assert.equal(events[0].event, "execution-created");
  assert.equal(events.at(-1).event, "checkpoint-verified");
  assert.equal(events.at(-1).checkpoint, CHECKPOINTS.at(-1));
});

test("bounded executor rejects transaction-plan signer drift before any signing action", async () => {
  const bundleRoot = fs.mkdtempSync(path.join(os.tmpdir(), "thought-executor-drift-bundle-"));
  const runDir = fs.mkdtempSync(path.join(os.tmpdir(), "thought-executor-drift-run-"));
  makeExecutionBundle(bundleRoot);
  const planFile = path.join(bundleRoot, "transaction-plan.json");
  const plan = readJson(planFile);
  plan.steps[1].signerRef = "EXAMPLE_DEPLOYER";
  fs.writeFileSync(planFile, `${JSON.stringify(plan, null, 2)}\n`);
  const adapter = new FakeExecutionAdapter();
  await assert.rejects(
    () => executeTransactionPlan(makeExecutorContext(bundleRoot, runDir), adapter),
    /exact pinned THOUGHT V2 plan/,
  );
  assert.equal(adapter.executed.length, 0);
});

test("an ambiguous signing interruption is persisted and can never be silently retried", async () => {
  const bundleRoot = fs.mkdtempSync(path.join(os.tmpdir(), "thought-executor-ambiguous-bundle-"));
  const blockedRun = fs.mkdtempSync(path.join(os.tmpdir(), "thought-executor-ambiguous-run-"));
  const resumedRun = fs.mkdtempSync(path.join(os.tmpdir(), "thought-executor-ambiguous-resume-"));
  makeExecutionBundle(bundleRoot);
  const context = makeExecutorContext(bundleRoot, blockedRun);
  const interrupted = new FakeExecutionAdapter({ failAt: 2 });
  await assert.rejects(() => executeTransactionPlan(context, interrupted), /will not be retried/);
  const journal = readJson(path.join(blockedRun, EXECUTION_JOURNAL));
  assert.equal(journal.steps.length, 3);
  assert.equal(journal.steps[2].state, "intent-recorded");
  const events = fs.readFileSync(path.join(blockedRun, EXECUTION_EVENTS), "utf8").trim().split("\n").map(JSON.parse);
  assert.equal(events.at(-1).event, "signing-intent-recorded");
  assert.equal(events.at(-1).stepId, journal.steps[2].id);
  const resumeAdapter = new FakeExecutionAdapter({ transactionBase: 4 });
  const resumeContext = makeExecutorContext(bundleRoot, resumedRun);
  await assert.rejects(
    () => executeTransactionPlan(resumeContext, resumeAdapter, {
      resumeEvidenceRoot: blockedRun,
      checkpoint: CHECKPOINTS[1],
    }),
    /ambiguous or unverified signing action cannot be retried/,
  );
  assert.equal(resumeAdapter.executed.length, 0);
});

test("resume verifies the exact last clean checkpoint and signs only remaining steps", async () => {
  const bundleRoot = fs.mkdtempSync(path.join(os.tmpdir(), "thought-executor-resume-bundle-"));
  const fullRun = fs.mkdtempSync(path.join(os.tmpdir(), "thought-executor-full-run-"));
  const blockedEvidence = fs.mkdtempSync(path.join(os.tmpdir(), "thought-executor-clean-checkpoint-"));
  const resumedRun = fs.mkdtempSync(path.join(os.tmpdir(), "thought-executor-resumed-run-"));
  makeExecutionBundle(bundleRoot);
  const full = await executeTransactionPlan(makeExecutorContext(bundleRoot, fullRun), new FakeExecutionAdapter());
  const checkpointJournal = structuredClone(full.journal);
  checkpointJournal.steps = checkpointJournal.steps.slice(0, 4);
  checkpointJournal.outputs = {
    thoughtSpecRegistry: checkpointJournal.outputs.thoughtSpecRegistry,
    protocolRegistry: checkpointJournal.outputs.protocolRegistry,
  };
  checkpointJournal.lastCheckpoint = CHECKPOINTS[3];
  fs.writeFileSync(path.join(blockedEvidence, EXECUTION_JOURNAL), `${JSON.stringify(checkpointJournal, null, 2)}\n`);
  const resumeAdapter = new FakeExecutionAdapter({ transactionBase: 4 });
  await verifyExecutionCheckpoint(
    makeExecutorContext(bundleRoot, resumedRun), resumeAdapter, blockedEvidence, CHECKPOINTS[3],
  );
  const result = await executeTransactionPlan(
    makeExecutorContext(bundleRoot, resumedRun),
    resumeAdapter,
    { resumeEvidenceRoot: blockedEvidence, checkpoint: CHECKPOINTS[3] },
  );
  assert.equal(resumeAdapter.executed.length, 4);
  assert.deepEqual(resumeAdapter.executed.map((entry) => entry.step.id), [
    "deploy-glyph-data-pointer", "deploy-thought-renderer",
    "deploy-creation-attestation-verifier", "deploy-thought-nft",
  ]);
  assert.equal(result.payload.contracts.thoughtNft, address("8"));
  const resumedEvents = fs.readFileSync(path.join(resumedRun, EXECUTION_EVENTS), "utf8").trim().split("\n").map(JSON.parse);
  assert.equal(resumedEvents[0].event, "resumed-from-verified-checkpoint");
  assert.equal(resumedEvents[0].checkpoint, CHECKPOINTS[3]);
});

test("test-only synthetic harness uses production validators/helpers without production entrypoints", () => {
  const temporary = fs.mkdtempSync(path.join(os.tmpdir(), "thought-campaign-harness-"));
  const output = path.join(temporary, "thought-envelope.json");
  const result = spawnSync(process.execPath, [
    path.join(root, "scripts/synthetic-thought-campaign-harness.mjs"),
    "--path-envelope", pathEnvelopeFile,
    "--thought-payload", path.join(examples, "thought-deployment-receipt.example.json"),
    "--out", output,
    "--campaign-id", pathExpected().campaignId,
    "--environment", pathExpected().environment,
    "--chain-id", String(pathExpected().chainId),
    "--path-bundle-digest", pathExpected().pathBundleDigest,
    "--path-retained-authority", pathExpected().retainedAuthority,
    "--path-nft", pathExpected().pathNft,
    "--thought-bundle-digest", h("b"),
    "--registry-owner", address("4"),
    "--attestation-authority", address("5"),
  ], { cwd: root, encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr);
  const emitted = readJson(output);
  assert.equal(emitted.protocol_payload.owner, "thought");
  assert.equal(emitted.input_receipt_sha256, pathEnvelopeSha256());
});

test("checked-in PATH and OPS schema mirrors are byte-identical to their owners", () => {
  assert.deepEqual(
    fs.readFileSync(path.join(root, "ops/integrated-campaign/schemas/path-campaign-phase-a-receipt.v1.schema.json")),
    fs.readFileSync("/Users/bigu/Projects/path/schemas/path.campaign.phase_a_receipt.schema.json"),
  );
  assert.deepEqual(
    fs.readFileSync(path.join(root, "ops/integrated-campaign/schemas/protocol-receipt-envelope.v1.schema.json")),
    fs.readFileSync("/Users/bigu/Projects/inshell-feed-ops/deployment-campaign/schemas/protocol-receipt-envelope.v1.schema.json"),
  );
  assert.deepEqual(pathEnvelope().protocol_payload.payload.pathRelease, PINNED_PATH_RELEASE);
});

test("the conflicting archived standalone pack fails closed", () => {
  const result = spawnSync(process.execPath, [path.join(root, "scripts/write-thought-signing-os-pack.mjs")], {
    cwd: root, encoding: "utf8",
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Archived binary-weave standalone Sepolia pack is permanently disabled/);
});
