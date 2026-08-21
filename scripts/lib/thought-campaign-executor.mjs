import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

import { AbiCoder, Interface, getAddress, id, keccak256 } from "ethers";

import {
  PINNED_THOUGHT_RELEASE,
  makeThoughtReceiptEnvelope,
  parseJsonStrict,
  sha256Bytes,
  sha256Jcs,
  validateThoughtEnvelope,
} from "./thought-integrated-deployment.mjs";

export const EXECUTION_JOURNAL = "thought-execution-checkpoints.json";
export const EXECUTION_EVENTS = "thought-execution-events.jsonl";
export const EXECUTION_SCHEMA = "inshell.thought.deployment.execution-journal.v1";
export const CHECKPOINTS = Object.freeze([
  "thought-spec-registry-deployed",
  "thought-spec-registered",
  "protocol-registry-deployed",
  "registries-registered",
  "glyph-data-pointer-deployed",
  "renderer-ready",
  "attestation-verifier-deployed",
  "thought-deployed",
]);
const DEPLOYMENT_NAMES = Object.freeze({
  "deploy-thought-spec-registry": "thoughtSpecRegistry",
  "deploy-protocol-registry": "protocolRegistry",
  "deploy-glyph-data-pointer": "glyphDataPointer",
  "deploy-thought-renderer": "thoughtRenderer",
  "deploy-creation-attestation-verifier": "creationAttestationVerifier",
  "deploy-thought-nft": "thoughtNft",
});
const PROFILE = Object.freeze({
  rendererIdHash: "0x01982604c90acf1ca63020e0c3761b25d8dc8fc3c267d27ace14cb0d2c813d73",
  metadataProfileIdHash: "0x4cefae9cf44cc61bc8ec16e266ecb31f53e634834fe5975cc564ae9dfc51858b",
  workProfileIdHash: "0x2bf311e6034eb35e6d1f7bd92894012ee7e528609830cb3b28df1ce5dd82f85a",
  contextProfileIdHash: "0x9894359f9294f4b3a871442b19d851203138fad4a648c16f62fc04f55dff02b8",
  creationAttestationProfileId: "0x5759a606b1b0b1ba997b2d7b851c7e2022ed8ff4e0238e55e29ad8b36ce9194a",
  glyphPayloadKeccak256: "0xba37d00bb395b84f0487791300a29cdd2b1712b078fa218c6ed74fa11d74a081",
});
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
const DEFAULT_ADMIN_ROLE = `0x${"0".repeat(64)}`;
const THOUGHT_MOVEMENT = id("THOUGHT");
const ADDRESS = /^0x[0-9a-fA-F]{40}$/;
const HASH = /^0x[0-9a-fA-F]{64}$/;
const RELEASE_FILES = Object.freeze([
  ["contract/compiled/ThoughtSpecRegistry.json", "release/contracts/ThoughtSpecRegistry.json"],
  ["contract/compiled/ThoughtSpecRegistryV2.json", "release/contracts/ThoughtSpecRegistryV2.json"],
  ["contract/compiled/ThoughtRendererV2.json", "release/contracts/ThoughtRendererV2.json"],
  ["contract/compiled/CreationAttestationVerifierV2.json", "release/contracts/CreationAttestationVerifierV2.json"],
  ["contract/compiled/ThoughtNFTV2.json", "release/contracts/ThoughtNFTV2.json"],
  ["protocol/current/v2/THOUGHT.v2.md", "release/THOUGHT.v2.md"],
  ["protocol/current/v2/renderer/mono-76.im76.bin", "release/mono-76.im76.bin"],
]);

const fail = (message) => { throw new Error(`THOUGHT_EXECUTION_INVALID: ${message}`); };
const sameAddress = (left, right) => (
  typeof left === "string" && typeof right === "string" && left.toLowerCase() === right.toLowerCase()
);
const readJson = (file, label) => parseJsonStrict(fs.readFileSync(file, "utf8"), label);
const toSafeNumber = (value, label) => {
  let parsed;
  try { parsed = BigInt(value); } catch { fail(`${label} is not an unsigned integer`); }
  if (parsed < 0n || parsed > BigInt(Number.MAX_SAFE_INTEGER)) fail(`${label} exceeds the JSON safe-integer range`);
  return Number(parsed);
};
const atomicWriteJson = (file, value) => {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const temporary = `${file}.tmp`;
  fs.writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`, { flag: "wx" });
  fs.renameSync(temporary, file);
};
const rewriteJournal = (file, value) => {
  const temporary = `${file}.tmp`;
  if (fs.existsSync(temporary)) fail(`stale journal temporary file: ${temporary}`);
  fs.writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`, { flag: "wx" });
  fs.renameSync(temporary, file);
};
const appendExecutionEvent = (file, value, initialize = false) => {
  const bytes = `${JSON.stringify(value)}\n`;
  if (initialize) fs.writeFileSync(file, bytes, { flag: "wx" });
  else fs.appendFileSync(file, bytes, { flag: "a" });
};
const requireFile = (file, label) => {
  if (!fs.statSync(file, { throwIfNoEntry: false })?.isFile()) fail(`${label} is missing: ${file}`);
  return file;
};

function codeStorageInitCode(payload) {
  if (payload.length > 0x5fff) fail("code-storage payload exceeds the protocol bound");
  const runtime = Buffer.concat([Buffer.from([0]), payload]);
  const length = runtime.length.toString(16).padStart(4, "0");
  return `0x61${length}80600c6000396000f3${runtime.toString("hex")}`;
}

function artifact(bundleRoot, relative) {
  const file = path.join(bundleRoot, relative);
  const value = readJson(requireFile(file, `compiled artifact ${relative}`), `compiled artifact ${relative}`);
  if (!Array.isArray(value.abi) || typeof value.bytecode !== "string" || !value.bytecode.startsWith("0x")) {
    fail(`compiled artifact is incomplete: ${relative}`);
  }
  return value;
}

function resolveValue(value, bundleRoot, outputs) {
  if (Array.isArray(value)) return value.map((entry) => resolveValue(entry, bundleRoot, outputs));
  if (value && typeof value === "object") {
    if (Object.keys(value).length === 1 && typeof value.outputRef === "string") {
      const output = outputs[value.outputRef];
      if (!output) fail(`transaction plan output is unresolved: ${value.outputRef}`);
      return output;
    }
    if (Object.keys(value).sort().join(",") === "encoding,fileRef" && value.encoding === "raw-bytes") {
      return `0x${fs.readFileSync(requireFile(path.join(bundleRoot, value.fileRef), value.fileRef)).toString("hex")}`;
    }
    fail("transaction plan contains an unsupported argument reference");
  }
  return value;
}

function operationForStep(step, bundleRoot, outputs) {
  const signerRef = step.signerRef;
  if (step.action === "deploy") {
    const compiled = artifact(bundleRoot, step.artifact);
    const constructor = compiled.abi.find((entry) => entry.type === "constructor") ?? { inputs: [] };
    const args = resolveValue(step.constructor ?? [], bundleRoot, outputs);
    const types = constructor.inputs.map((input) => input.type);
    if (types.length !== args.length) fail(`constructor arity mismatch for ${step.id}`);
    const suffix = types.length ? AbiCoder.defaultAbiCoder().encode(types, args).slice(2) : "";
    const initCode = `${compiled.bytecode}${suffix}`;
    return {
      kind: "create", signerRef, initCode,
      intentHash: keccak256(initCode),
      creationBytecodeHash: keccak256(initCode),
    };
  }
  if (step.action === "deploy-code-storage") {
    const payload = fs.readFileSync(requireFile(path.join(bundleRoot, step.payload), step.payload));
    if (keccak256(payload) !== step.expectedPayloadKeccak256) fail(`code-storage payload drift for ${step.id}`);
    const initCode = codeStorageInitCode(payload);
    return {
      kind: "create", signerRef, initCode,
      intentHash: keccak256(initCode),
      creationBytecodeHash: keccak256(initCode),
    };
  }
  if (step.action === "call") {
    const to = resolveValue(step.to, bundleRoot, outputs);
    const args = resolveValue(step.args ?? [], bundleRoot, outputs);
    const iface = new Interface([`function ${step.signature}`]);
    const calldata = iface.encodeFunctionData(step.signature.slice(0, step.signature.indexOf("(")), args);
    return { kind: "call", signerRef, to, signature: step.signature, args, calldata, intentHash: keccak256(calldata) };
  }
  fail(`unsupported transaction-plan action: ${step.action}`);
}

function expectedPlanSteps(phaseInput) {
  const deployer = phaseInput.authorities.deployer.signerRef;
  const owner = phaseInput.authorities.registryOwner.signerRef;
  return [
    { id: "deploy-thought-spec-registry", action: "deploy", signerRef: deployer, artifact: "release/contracts/ThoughtSpecRegistry.json", constructor: [phaseInput.authorities.registryOwner.address], output: "thoughtSpecRegistry", checkpointAfter: CHECKPOINTS[0] },
    { id: "register-thought-spec", action: "call", signerRef: owner, to: { outputRef: "thoughtSpecRegistry" }, signature: "registerThoughtSpec(string,string,bytes)", args: ["THOUGHT.v2.md", phaseInput.selectedSpec.ref, { fileRef: "release/THOUGHT.v2.md", encoding: "raw-bytes" }], checkpointAfter: CHECKPOINTS[1] },
    { id: "deploy-protocol-registry", action: "deploy", signerRef: deployer, artifact: "release/contracts/ThoughtSpecRegistryV2.json", constructor: [phaseInput.authorities.registryOwner.address], output: "protocolRegistry", checkpointAfter: CHECKPOINTS[2] },
    { id: "register-protocol-release", action: "call", signerRef: owner, to: { outputRef: "protocolRegistry" }, signature: "registerRelease(bytes32,string)", args: [phaseInput.protocolRegistration.manifestHash, phaseInput.protocolRegistration.manifestUri], checkpointAfter: CHECKPOINTS[3] },
    { id: "deploy-glyph-data-pointer", action: "deploy-code-storage", signerRef: deployer, payload: "release/mono-76.im76.bin", expectedPayloadKeccak256: PROFILE.glyphPayloadKeccak256, output: "glyphDataPointer", checkpointAfter: CHECKPOINTS[4] },
    { id: "deploy-thought-renderer", action: "deploy", signerRef: deployer, artifact: "release/contracts/ThoughtRendererV2.json", constructor: [{ outputRef: "glyphDataPointer" }], output: "thoughtRenderer", checkpointAfter: CHECKPOINTS[5] },
    { id: "deploy-creation-attestation-verifier", action: "deploy", signerRef: deployer, artifact: "release/contracts/CreationAttestationVerifierV2.json", constructor: [phaseInput.authorities.registryOwner.address, phaseInput.authorities.attestationAuthority], output: "creationAttestationVerifier", checkpointAfter: CHECKPOINTS[6] },
    { id: "deploy-thought-nft", action: "deploy", signerRef: deployer, artifact: "release/contracts/ThoughtNFTV2.json", constructor: [phaseInput.priorReceipt.pathNft, { outputRef: "thoughtSpecRegistry" }, { outputRef: "thoughtRenderer" }, { outputRef: "protocolRegistry" }, phaseInput.protocolRegistration.protocolReleaseId, { outputRef: "creationAttestationVerifier" }], output: "thoughtNft", checkpointAfter: CHECKPOINTS[7] },
  ];
}

function validatePinnedReleaseBundle(bundleRoot, phaseInput) {
  for (const [key, expected] of Object.entries(PINNED_THOUGHT_RELEASE)) {
    if (phaseInput.release?.[key] !== expected) fail(`phase input release drift: ${key}`);
  }
  if (phaseInput.deploymentAuthorizationIncluded !== false
      || phaseInput.pathMutationPerformed !== false || phaseInput.pathMutationOwner !== "PATH_PHASE_B") {
    fail("phase input authorization/PATH ownership boundary mismatch");
  }
  const manifestFile = requireFile(path.join(bundleRoot, "release/manifest.json"), "pinned release manifest");
  const manifestBytes = fs.readFileSync(manifestFile);
  if (sha256Bytes(manifestBytes) !== PINNED_THOUGHT_RELEASE.manifestSha256) fail("pinned release manifest SHA-256 mismatch");
  const manifest = parseJsonStrict(manifestBytes.toString("utf8"), "pinned release manifest", {
    rejectFloatingPointSyntax: false,
  });
  if (manifest.artifactId !== PINNED_THOUGHT_RELEASE.artifactId || manifest.source?.dirty !== false) {
    fail("pinned release manifest identity/policy mismatch");
  }
  const files = new Map(manifest.files?.map((entry) => [entry.path, entry]));
  for (const [releasePath, bundlePath] of RELEASE_FILES) {
    const entry = files.get(releasePath);
    const bytes = fs.readFileSync(requireFile(path.join(bundleRoot, bundlePath), `pinned release file ${bundlePath}`));
    if (!entry || entry.byteLength !== bytes.length || entry.sha256 !== sha256Bytes(bytes)) {
      fail(`pinned release file mismatch: ${bundlePath}`);
    }
  }
  const selected = manifest.compatibility?.selectedSpec;
  const expectedSelected = {
    ...selected,
    ref: `${PINNED_THOUGHT_RELEASE.sourceTag}/protocol/current/v2/THOUGHT.v2.md`,
  };
  if (!selected || sha256Jcs(phaseInput.selectedSpec) !== sha256Jcs(expectedSelected)) {
    fail("selected THOUGHT specification does not match the pinned release");
  }
  const specBytes = fs.readFileSync(path.join(bundleRoot, "release/THOUGHT.v2.md"));
  if (id(selected.name) !== selected.thoughtSpecId || keccak256(specBytes) !== selected.thoughtSpecHash) {
    fail("selected THOUGHT specification identity mismatch");
  }
  const manifestHash = keccak256(manifestBytes);
  const releaseId = keccak256(AbiCoder.defaultAbiCoder().encode(
    ["bytes32", "bytes32"], [id("INSHELL_THOUGHT_PROTOCOL_RELEASE"), manifestHash],
  ));
  if (phaseInput.protocolRegistration?.manifestHash !== manifestHash
      || phaseInput.protocolRegistration?.protocolReleaseId !== releaseId) {
    fail("protocol release registration identity mismatch");
  }
}

export function validateExecutionPlan(bundleRoot, phaseInput, plan) {
  validatePinnedReleaseBundle(bundleRoot, phaseInput);
  if (plan.schema !== "inshell.deployment.protocol-bundle.transaction-plan.v1"
      || plan.campaignId !== phaseInput.campaignId || plan.bundleId !== phaseInput.bundleId
      || plan.environment !== phaseInput.environment || plan.chainId !== phaseInput.chainId) {
    fail("transaction plan identity mismatch");
  }
  if (plan.resumability?.retrySigningTransactionSilently !== false
      || JSON.stringify(plan.resumability?.checkpoints) !== JSON.stringify(CHECKPOINTS)
      || plan.resumability?.onWrongAddressRoleBytecodeOrChain !== "abandon-stack") {
    fail("transaction plan retry/checkpoint policy mismatch");
  }
  const execution = phaseInput.execution;
  if (phaseInput.authorities.deployer.signerRef === phaseInput.authorities.registryOwner.signerRef) {
    fail("deployer and registry-owner signer references must be distinct");
  }
  if (execution?.rpcEnvironmentVariable !== "THOUGHT_RPC_URL"
      || execution?.deploySigner?.signerRef !== phaseInput.authorities.deployer.signerRef
      || execution?.deploySigner?.kind !== "encrypted-keystore"
      || execution?.deploySigner?.keystoreEnvironmentVariable !== "THOUGHT_DEPLOY_KEYSTORE"
      || execution?.deploySigner?.passwordFileEnvironmentVariable !== "THOUGHT_DEPLOY_PASSWORD_FILE"
      || execution?.registryOwnerSigner?.signerRef !== phaseInput.authorities.registryOwner.signerRef
      || execution?.registryOwnerSigner?.kind !== "ledger"
      || execution?.registryOwnerSigner?.derivationPathEnvironmentVariable !== "THOUGHT_ADMIN_LEDGER_DERIVATION_PATH"
      || !Number.isSafeInteger(execution?.confirmations) || execution.confirmations < 1
      || execution?.retrySigningTransactionSilently !== false) {
    fail("bundle-declared signer/RPC execution surface mismatch");
  }
  if (sha256Jcs(plan.steps) !== sha256Jcs(expectedPlanSteps(phaseInput))) {
    fail("transaction plan is not the exact pinned THOUGHT V2 plan");
  }
  const expectedForbidden = [
    "PathNFT.setMovementConfig(bytes32,address,uint32)",
    "PathNFT.freezeMovementConfig(bytes32)",
  ];
  if (JSON.stringify(plan.forbiddenCalls) !== JSON.stringify(expectedForbidden)) fail("PATH mutation prohibition drift");
  for (const step of plan.steps) {
    const knownSigner = step.signerRef === phaseInput.authorities.deployer.signerRef
      || step.signerRef === phaseInput.authorities.registryOwner.signerRef;
    if (!knownSigner) fail(`step uses an undeclared signer reference: ${step.id}`);
    if (step.to && typeof step.to === "string" && sameAddress(step.to, phaseInput.priorReceipt.pathNft)) {
      fail(`transaction plan attempts a PATH call: ${step.id}`);
    }
  }
  return plan;
}

function initialJournal(context) {
  return {
    schema: EXECUTION_SCHEMA,
    campaignId: context.phaseInput.campaignId,
    phaseId: "thought",
    bundleId: context.phaseInput.bundleId,
    bundleSha256: context.bundleSha256,
    inputEnvelopeSha256: context.prior.envelopeSha256,
    inputPayloadSha256: context.prior.payloadSha256,
    retrySigningTransactionSilently: false,
    steps: [],
    outputs: {},
    lastCheckpoint: "",
  };
}

function journalEvent(journal, event, detail = {}) {
  return {
    schema: "inshell.thought.deployment.execution-event.v1",
    sequence: detail.sequence,
    event,
    campaignId: journal.campaignId,
    bundleId: journal.bundleId,
    journalSha256: sha256Jcs(journal),
    ...Object.fromEntries(Object.entries(detail).filter(([key]) => key !== "sequence")),
  };
}

function validateJournal(journal, context) {
  if (journal.schema !== EXECUTION_SCHEMA || journal.campaignId !== context.phaseInput.campaignId
      || journal.phaseId !== "thought" || journal.bundleId !== context.phaseInput.bundleId
      || journal.bundleSha256 !== context.bundleSha256
      || journal.inputEnvelopeSha256 !== context.prior.envelopeSha256
      || journal.inputPayloadSha256 !== context.prior.payloadSha256
      || journal.retrySigningTransactionSilently !== false || !Array.isArray(journal.steps)) {
    fail("execution journal binding mismatch");
  }
  const transactionHashes = new Set();
  const contractAddresses = new Set();
  const derivedOutputs = {};
  for (let index = 0; index < journal.steps.length; index += 1) {
    const record = journal.steps[index];
    const planned = context.plan.steps[index];
    if (!planned || record.id !== planned.id || record.checkpoint !== planned.checkpointAfter) {
      fail("execution journal step order mismatch");
    }
    if (record.state !== "verified") {
      fail(`ambiguous or unverified signing action cannot be retried: ${record.id}`);
    }
    const operation = operationForStep(planned, context.bundleRoot, derivedOutputs);
    if (record.action !== planned.action || record.signerRef !== planned.signerRef
        || record.intentHash !== operation.intentHash
        || (operation.creationBytecodeHash ?? "") !== (record.creationBytecodeHash ?? "")
        || (operation.to ?? "").toLowerCase() !== (record.targetAddress ?? "").toLowerCase()) {
      fail(`execution journal intent does not match the pinned plan: ${record.id}`);
    }
    if (!HASH.test(record.transactionHash) || !Number.isSafeInteger(record.block) || record.block < 1) {
      fail(`execution journal mined evidence is malformed: ${record.id}`);
    }
    if (operation.kind === "create") {
      if (!ADDRESS.test(record.contractAddress ?? "") || !HASH.test(record.runtimeBytecodeHash ?? "")) {
        fail(`execution journal deployment evidence is malformed: ${record.id}`);
      }
      if (contractAddresses.has(record.contractAddress.toLowerCase())) fail("execution journal reuses a contract address");
      contractAddresses.add(record.contractAddress.toLowerCase());
      derivedOutputs[planned.output] = getAddress(record.contractAddress);
    }
    if (transactionHashes.has(record.transactionHash.toLowerCase())) fail("execution journal reuses a transaction hash");
    transactionHashes.add(record.transactionHash.toLowerCase());
  }
  if (sha256Jcs(derivedOutputs) !== sha256Jcs(journal.outputs)) fail("execution journal outputs mismatch");
  const expectedCheckpoint = journal.steps.at(-1)?.checkpoint ?? "";
  if (journal.lastCheckpoint !== expectedCheckpoint) fail("execution journal last checkpoint mismatch");
  return journal;
}

function deploymentEvidence(journal) {
  return journal.steps.filter((record) => DEPLOYMENT_NAMES[record.id]).map((record) => ({
    name: DEPLOYMENT_NAMES[record.id],
    address: record.contractAddress,
    transaction: record.transactionHash,
    block: record.block,
    creationBytecodeHash: record.creationBytecodeHash,
    runtimeBytecodeHash: record.runtimeBytecodeHash,
  }));
}

function expectedThought(context) {
  return {
    campaignId: context.phaseInput.campaignId,
    environment: context.phaseInput.environment,
    chainId: context.phaseInput.chainId,
    pathPhaseAEnvelopeSha256: context.prior.envelopeSha256,
    pathPhaseAPayloadSha256: context.prior.payloadSha256,
    pathNft: context.prior.payload.pathNft.address,
    thoughtBundleDigest: `0x${context.bundleSha256}`,
    registryOwner: context.phaseInput.authorities.registryOwner.address,
    attestationAuthority: context.phaseInput.authorities.attestationAuthority,
    protocolReleaseId: context.phaseInput.protocolRegistration.protocolReleaseId,
    protocolManifestHash: context.phaseInput.protocolRegistration.manifestHash,
  };
}

function buildPayload(context, journal, readback) {
  const contracts = Object.fromEntries(Object.entries(journal.outputs).map(([key, value]) => [key, getAddress(value)]));
  const deployments = deploymentEvidence(journal);
  if (deployments.length !== 6) fail("six verified contract deployments are required for the THOUGHT payload");
  const payload = {
    schema: "inshell.thought.deployment.receipt.v1",
    campaignId: context.phaseInput.campaignId,
    phase: "thought",
    environment: context.phaseInput.environment,
    chainId: context.phaseInput.chainId,
    status: "complete",
    consumedPathPhaseAReceiptSha256: context.prior.envelopeSha256,
    consumedPathPhaseA: {
      envelopeSha256: context.prior.envelopeSha256,
      payloadSha256: context.prior.payloadSha256,
    },
    pathNft: context.prior.payload.pathNft.address,
    thoughtRelease: { ...PINNED_THOUGHT_RELEASE },
    bundleDigest: `0x${context.bundleSha256}`,
    contracts,
    deployments,
    registry: {
      thoughtSpecId: context.phaseInput.selectedSpec.thoughtSpecId,
      thoughtSpecHash: context.phaseInput.selectedSpec.thoughtSpecHash,
      protocolReleaseId: context.phaseInput.protocolRegistration.protocolReleaseId,
      protocolManifestHash: context.phaseInput.protocolRegistration.manifestHash,
      exactBytesVerified: readback.exactSpecBytesVerified,
    },
    compatibility: {
      pathNftImmutable: readback.pathNftImmutable,
      rendererIdHash: readback.rendererIdHash,
      metadataProfileIdHash: readback.metadataProfileIdHash,
      workProfileIdHash: readback.workProfileIdHash,
      contextProfileIdHash: readback.contextProfileIdHash,
      creationAttestationProfileId: readback.creationAttestationProfileId,
    },
    authorities: {
      registryOwner: readback.registryOwner,
      protocolRegistryOwner: readback.protocolRegistryOwner,
      attestationVerifierOwner: readback.attestationVerifierOwner,
      attestationAuthority: readback.attestationAuthority,
      attestationAuthorityEpoch: readback.attestationAuthorityEpoch,
    },
    approvedPathIntegration: { movement: "THOUGHT", quota: 1, thoughtNft: contracts.thoughtNft },
    pathMutationPerformed: false,
    pathMutationOwner: "PATH_PHASE_B",
    verification: {
      overall: "PASS",
      registry: "PASS",
      immutableDependencies: "PASS",
      profiles: "PASS",
    },
  };
  return payload;
}

export function constructThoughtReceiptFromEvidence(context, journal, readback) {
  validateJournal(journal, context);
  const payload = buildPayload(context, journal, readback);
  const expected = expectedThought(context);
  const envelope = makeThoughtReceiptEnvelope(payload, expected);
  validateThoughtEnvelope(envelope, expected);
  return { payload, envelope };
}

export async function preflightExecution(context, adapter) {
  validateExecutionPlan(context.bundleRoot, context.phaseInput, context.plan);
  await adapter.preflight(context);
  return true;
}

export async function verifyExecutionCheckpoint(context, adapter, evidenceRoot, checkpoint) {
  const journalFile = path.join(evidenceRoot, EXECUTION_JOURNAL);
  const journal = validateJournal(readJson(requireFile(journalFile, "execution journal"), "execution journal"), context);
  if (!CHECKPOINTS.includes(checkpoint) || journal.lastCheckpoint !== checkpoint) {
    fail("requested resume checkpoint is not the last verified checkpoint");
  }
  for (let index = 0; index < journal.steps.length; index += 1) {
    await adapter.verifyCheckpoint(context.plan.steps[index], journal.steps[index], journal, context);
  }
  return journal;
}

export async function executeTransactionPlan(context, adapter, { resumeEvidenceRoot = "", checkpoint = "" } = {}) {
  await preflightExecution(context, adapter);
  const journalFile = path.join(context.runDir, EXECUTION_JOURNAL);
  const eventsFile = path.join(context.runDir, EXECUTION_EVENTS);
  let journal;
  let eventSequence = 1;
  if (fs.existsSync(journalFile) || fs.existsSync(eventsFile)) {
    fail("execution run directory already contains execution evidence");
  }
  if (resumeEvidenceRoot) {
    journal = await verifyExecutionCheckpoint(context, adapter, resumeEvidenceRoot, checkpoint);
    journal = structuredClone(journal);
    atomicWriteJson(journalFile, journal);
    appendExecutionEvent(eventsFile, journalEvent(journal, "resumed-from-verified-checkpoint", {
      sequence: eventSequence++, checkpoint, sourceJournalSha256: sha256Jcs(journal),
    }), true);
  } else {
    journal = initialJournal(context);
    atomicWriteJson(journalFile, journal);
    appendExecutionEvent(eventsFile, journalEvent(journal, "execution-created", {
      sequence: eventSequence++,
    }), true);
  }

  for (let index = journal.steps.length; index < context.plan.steps.length; index += 1) {
    const step = context.plan.steps[index];
    const operation = operationForStep(step, context.bundleRoot, journal.outputs);
    const record = {
      id: step.id,
      checkpoint: step.checkpointAfter,
      action: step.action,
      signerRef: step.signerRef,
      intentHash: operation.intentHash,
      state: "intent-recorded",
    };
    if (operation.to) record.targetAddress = getAddress(operation.to);
    if (operation.creationBytecodeHash) record.creationBytecodeHash = operation.creationBytecodeHash;
    journal.steps.push(record);
    rewriteJournal(journalFile, journal);
    appendExecutionEvent(eventsFile, journalEvent(journal, "signing-intent-recorded", {
      sequence: eventSequence++, stepId: step.id, checkpoint: step.checkpointAfter,
      signerRef: step.signerRef, intentHash: operation.intentHash,
    }));

    let mined;
    try {
      mined = await adapter.executeStep(step, operation, journal, context);
    } catch (error) {
      fail(`signing action ${step.id} failed or became ambiguous; it will not be retried: ${error.message}`);
    }
    if (!HASH.test(mined.transactionHash) || mined.status !== "success") {
      fail(`signing action ${step.id} did not return a successful mined receipt`);
    }
    record.transactionHash = mined.transactionHash.toLowerCase();
    record.block = toSafeNumber(mined.blockNumber, `${step.id} block number`);
    if (operation.kind === "create") {
      if (!ADDRESS.test(mined.contractAddress ?? "")) fail(`deployment ${step.id} did not return a contract address`);
      record.contractAddress = getAddress(mined.contractAddress);
    }
    record.state = "mined";
    rewriteJournal(journalFile, journal);
    appendExecutionEvent(eventsFile, journalEvent(journal, "transaction-mined", {
      sequence: eventSequence++, stepId: step.id, checkpoint: step.checkpointAfter,
      transactionHash: record.transactionHash, block: record.block,
    }));

    const verified = await adapter.verifyCheckpoint(step, record, journal, context);
    if (operation.kind === "create") {
      if (!HASH.test(verified.runtimeBytecodeHash ?? "")) fail(`runtime bytecode evidence missing for ${step.id}`);
      record.runtimeBytecodeHash = verified.runtimeBytecodeHash.toLowerCase();
      journal.outputs[step.output] = record.contractAddress;
    }
    record.verificationSha256 = sha256Jcs(verified);
    record.state = "verified";
    journal.lastCheckpoint = step.checkpointAfter;
    rewriteJournal(journalFile, journal);
    appendExecutionEvent(eventsFile, journalEvent(journal, "checkpoint-verified", {
      sequence: eventSequence++, stepId: step.id, checkpoint: step.checkpointAfter,
      verificationSha256: record.verificationSha256,
    }));
  }

  validateJournal(journal, context);
  const readback = await adapter.collectFinalReadback(journal, context);
  const { payload, envelope } = constructThoughtReceiptFromEvidence(context, journal, readback);
  return { journal, payload, envelope };
}

function normalizeCastString(value) {
  const trimmed = String(value).trim();
  if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
    try { return JSON.parse(trimmed); } catch { /* use raw below */ }
  }
  return trimmed;
}

export class CastThoughtExecutionAdapter {
  constructor(environment, phaseInput) {
    this.environment = environment;
    this.phaseInput = phaseInput;
    this.rpcUrl = environment.THOUGHT_RPC_URL;
    this.confirmations = phaseInput.execution?.confirmations;
    const required = [
      "THOUGHT_RPC_URL", "THOUGHT_DEPLOY_KEYSTORE", "THOUGHT_DEPLOY_PASSWORD_FILE",
      "THOUGHT_ADMIN_LEDGER_DERIVATION_PATH",
    ];
    for (const name of required) if (!environment[name]) fail(`${name} is required for production execution`);
    let parsed;
    try { parsed = new URL(this.rpcUrl); } catch { fail("THOUGHT_RPC_URL is malformed"); }
    if (parsed.protocol !== "https:" || parsed.username || parsed.password) {
      fail("THOUGHT_RPC_URL must be credential-free HTTPS");
    }
    if (!Number.isSafeInteger(this.confirmations) || this.confirmations < 1) fail("bundle confirmations must be a positive safe integer");
  }

  cast(args, label) {
    const result = spawnSync("cast", args, { encoding: "utf8", maxBuffer: 32 * 1024 * 1024 });
    if (result.status !== 0) fail(`${label} failed: ${String(result.stderr).trim() || `exit ${result.status}`}`);
    return String(result.stdout).trim();
  }

  signerArgs(signerRef) {
    if (signerRef === this.phaseInput.authorities.deployer.signerRef) {
      return [
        "--keystore", this.environment.THOUGHT_DEPLOY_KEYSTORE,
        "--password-file", this.environment.THOUGHT_DEPLOY_PASSWORD_FILE,
        "--from", this.phaseInput.authorities.deployer.address,
      ];
    }
    if (signerRef === this.phaseInput.authorities.registryOwner.signerRef) {
      return [
        "--ledger", "--mnemonic-derivation-path", this.environment.THOUGHT_ADMIN_LEDGER_DERIVATION_PATH,
        "--from", this.phaseInput.authorities.registryOwner.address,
      ];
    }
    fail(`unknown signer reference: ${signerRef}`);
  }

  signerAddress(signerRef) {
    if (signerRef === this.phaseInput.authorities.deployer.signerRef) {
      return this.phaseInput.authorities.deployer.address;
    }
    if (signerRef === this.phaseInput.authorities.registryOwner.signerRef) {
      return this.phaseInput.authorities.registryOwner.address;
    }
    fail(`unknown signer reference: ${signerRef}`);
  }

  async chainId() {
    return toSafeNumber(this.cast(["chain-id", "--rpc-url", this.rpcUrl], "chain-id readback"), "chain ID");
  }

  async code(address) {
    const code = this.cast(["code", "--rpc-url", this.rpcUrl, address], `code readback ${address}`);
    if (!/^0x[0-9a-fA-F]*$/.test(code)) fail(`malformed code readback: ${address}`);
    return code.toLowerCase();
  }

  async call(address, signature, args = []) {
    return normalizeCastString(this.cast(["call", "--rpc-url", this.rpcUrl, address, signature, ...args.map(String)], `readback ${signature}`));
  }

  async pathBoundary(context) {
    const pathNft = context.prior.payload.pathNft.address;
    const code = await this.code(pathNft);
    if (code === "0x" || keccak256(code).toLowerCase() !== context.prior.payload.pathNft.runtimeBytecodeHash.toLowerCase()) {
      fail("PathNFT runtime bytecode mismatch");
    }
    const minter = await this.call(pathNft, "getAuthorizedMinter(bytes32)(address)", [THOUGHT_MOVEMENT]);
    const quota = await this.call(pathNft, "getMovementQuota(bytes32)(uint32)", [THOUGHT_MOVEMENT]);
    const frozen = await this.call(pathNft, "isMovementFrozen(bytes32)(bool)", [THOUGHT_MOVEMENT]);
    if (!sameAddress(minter, ZERO_ADDRESS) || BigInt(quota) !== 0n || frozen !== "false") {
      fail("PathNFT THOUGHT movement changed during the THOUGHT phase");
    }
    const authority = await this.call(pathNft, "hasRole(bytes32,address)(bool)", [DEFAULT_ADMIN_ROLE, context.phaseInput.authorities.pathRetainedAuthority]);
    if (authority !== "true") fail("PATH Phase B retained authority readback failed");
    return { minter: ZERO_ADDRESS, quota: 0, frozen: false };
  }

  async preflight(context) {
    if (context.productionInvocation !== true) fail("production adapter is restricted to the Signing OS entrypoint");
    if (await this.chainId() !== context.phaseInput.chainId) fail("RPC chain mismatch");
    const deployer = this.cast([
      "wallet", "address", "--keystore", this.environment.THOUGHT_DEPLOY_KEYSTORE,
      "--password-file", this.environment.THOUGHT_DEPLOY_PASSWORD_FILE,
    ], "deployer keystore address readback");
    if (!sameAddress(deployer, context.phaseInput.authorities.deployer.address)) fail("deployer keystore address mismatch");
    const admin = this.cast([
      "wallet", "address", "--ledger", "--mnemonic-derivation-path",
      this.environment.THOUGHT_ADMIN_LEDGER_DERIVATION_PATH,
    ], "ADMIN Ledger address readback");
    if (!sameAddress(admin, context.phaseInput.authorities.registryOwner.address)) fail("ADMIN Ledger address mismatch");
    await this.pathBoundary(context);
  }

  async executeStep(step, operation) {
    const base = [
      "send", "--json", "--rpc-url", this.rpcUrl,
      "--confirmations", String(this.confirmations),
      ...this.signerArgs(operation.signerRef),
    ];
    const args = operation.kind === "create"
      ? [...base, "--create", operation.initCode]
      : [...base, operation.to, operation.signature, ...operation.args.map(String)];
    // This is the sole signing invocation. Never rerun it on any error.
    const output = this.cast(args, `single signing invocation ${step.id}`);
    let receipt;
    try { receipt = parseJsonStrict(output, `cast receipt for ${step.id}`); } catch (error) {
      fail(`cast returned an unparseable receipt for ${step.id}: ${error.message}`);
    }
    const transactionHash = receipt.transactionHash ?? receipt.hash;
    const blockNumber = receipt.blockNumber;
    const rawStatus = receipt.status;
    const status = rawStatus === "0x1" || rawStatus === 1 || rawStatus === "1" ? "success" : "failed";
    return { transactionHash, blockNumber, contractAddress: receipt.contractAddress, status };
  }

  async assertCode(address, label) {
    const code = await this.code(address);
    if (code === "0x") fail(`${label} has no runtime bytecode`);
    return { runtimeBytecodeHash: keccak256(code).toLowerCase() };
  }

  async assertMinedTransaction(record) {
    const transaction = parseJsonStrict(this.cast([
      "tx", "--json", "--rpc-url", this.rpcUrl, record.transactionHash,
    ], `transaction readback ${record.id}`), `transaction readback ${record.id}`);
    const receipt = parseJsonStrict(this.cast([
      "receipt", "--json", "--rpc-url", this.rpcUrl, record.transactionHash,
    ], `receipt readback ${record.id}`), `receipt readback ${record.id}`);
    const input = transaction.input ?? transaction.data;
    const status = receipt.status;
    if (!sameAddress(transaction.from, this.signerAddress(record.signerRef))
        || typeof input !== "string" || keccak256(input) !== record.intentHash
        || BigInt(transaction.value ?? 0) !== 0n
        || toSafeNumber(receipt.blockNumber, `${record.id} receipt block`) !== record.block
        || (status !== "0x1" && status !== 1 && status !== "1")) {
      fail(`mined transaction does not match the recorded pinned intent: ${record.id}`);
    }
    if (record.targetAddress) {
      if (!sameAddress(transaction.to, record.targetAddress)) fail(`mined call target mismatch: ${record.id}`);
    } else if (transaction.to !== null && transaction.to !== undefined) {
      fail(`mined deployment unexpectedly has a target: ${record.id}`);
    }
    if (record.contractAddress && !sameAddress(receipt.contractAddress, record.contractAddress)) {
      fail(`mined deployment address mismatch: ${record.id}`);
    }
  }

  async verifyCheckpoint(step, record, journal, context) {
    await this.assertMinedTransaction(record);
    const outputs = { ...journal.outputs };
    if (record.contractAddress && step.output) outputs[step.output] = record.contractAddress;
    if (step.id === "deploy-thought-spec-registry") {
      const runtime = await this.assertCode(record.contractAddress, step.id);
      if (!sameAddress(await this.call(record.contractAddress, "owner()(address)"), context.phaseInput.authorities.registryOwner.address)) fail("ThoughtSpecRegistry owner mismatch");
      return runtime;
    }
    if (step.id === "register-thought-spec") {
      const registry = outputs.thoughtSpecRegistry;
      if (await this.call(registry, "isRegisteredThoughtSpec(bytes32,bytes32)(bool)", [context.phaseInput.selectedSpec.thoughtSpecId, context.phaseInput.selectedSpec.thoughtSpecHash]) !== "true") fail("THOUGHT spec registration readback failed");
      const exact = await this.call(registry, "thoughtSpecBytes(bytes32)(bytes)", [context.phaseInput.selectedSpec.thoughtSpecId]);
      const expected = `0x${fs.readFileSync(path.join(context.bundleRoot, "release/THOUGHT.v2.md")).toString("hex")}`;
      if (exact.toLowerCase() !== expected.toLowerCase()) fail("THOUGHT spec exact-byte readback failed");
      return { registered: true, exactBytesSha256: sha256Bytes(Buffer.from(exact.slice(2), "hex")) };
    }
    if (step.id === "deploy-protocol-registry") {
      const runtime = await this.assertCode(record.contractAddress, step.id);
      if (!sameAddress(await this.call(record.contractAddress, "owner()(address)"), context.phaseInput.authorities.registryOwner.address)) fail("protocol registry owner mismatch");
      return runtime;
    }
    if (step.id === "register-protocol-release") {
      if (await this.call(outputs.protocolRegistry, "isRegistered(bytes32)(bool)", [context.phaseInput.protocolRegistration.protocolReleaseId]) !== "true") fail("protocol release registration readback failed");
      return { registered: true, protocolReleaseId: context.phaseInput.protocolRegistration.protocolReleaseId };
    }
    if (step.id === "deploy-glyph-data-pointer") {
      const runtime = await this.assertCode(record.contractAddress, step.id);
      const code = await this.code(record.contractAddress);
      const payload = fs.readFileSync(path.join(context.bundleRoot, "release/mono-76.im76.bin"));
      if (code !== `0x00${payload.toString("hex")}` || keccak256(payload) !== PROFILE.glyphPayloadKeccak256) fail("glyph pointer exact code readback failed");
      return runtime;
    }
    if (step.id === "deploy-thought-renderer") {
      const runtime = await this.assertCode(record.contractAddress, step.id);
      if (!sameAddress(await this.call(record.contractAddress, "glyphDefinitionsPointer1()(address)"), outputs.glyphDataPointer)
          || (await this.call(record.contractAddress, "RENDERER_ID_HASH()(bytes32)")).toLowerCase() !== PROFILE.rendererIdHash
          || (await this.call(record.contractAddress, "METADATA_PROFILE_ID_HASH()(bytes32)")).toLowerCase() !== PROFILE.metadataProfileIdHash) fail("renderer immutable/profile readback failed");
      return runtime;
    }
    if (step.id === "deploy-creation-attestation-verifier") {
      const runtime = await this.assertCode(record.contractAddress, step.id);
      if (!sameAddress(await this.call(record.contractAddress, "owner()(address)"), context.phaseInput.authorities.registryOwner.address)
          || !sameAddress(await this.call(record.contractAddress, "authority()(address)"), context.phaseInput.authorities.attestationAuthority)
          || BigInt(await this.call(record.contractAddress, "authorityEpoch()(uint32)")) !== 1n
          || (await this.call(record.contractAddress, "profileId()(bytes32)")).toLowerCase() !== PROFILE.creationAttestationProfileId
          || await this.call(record.contractAddress, "paused()(bool)") !== "false") fail("attestation verifier authority/profile readback failed");
      return runtime;
    }
    if (step.id === "deploy-thought-nft") {
      const runtime = await this.assertCode(record.contractAddress, step.id);
      const checks = [
        ["pathNft()(address)", context.prior.payload.pathNft.address, true],
        ["thoughtSpecRegistry()(address)", outputs.thoughtSpecRegistry, true],
        ["thoughtRenderer()(address)", outputs.thoughtRenderer, true],
        ["protocolRegistry()(address)", outputs.protocolRegistry, true],
        ["creationAttestationVerifier()(address)", outputs.creationAttestationVerifier, true],
        ["protocolReleaseId()(bytes32)", context.phaseInput.protocolRegistration.protocolReleaseId, false],
        ["RENDERER_ID_HASH()(bytes32)", PROFILE.rendererIdHash, false],
        ["METADATA_PROFILE_ID_HASH()(bytes32)", PROFILE.metadataProfileIdHash, false],
        ["WORK_PROFILE_ID_HASH()(bytes32)", PROFILE.workProfileIdHash, false],
        ["CONTEXT_PROFILE_ID_HASH()(bytes32)", PROFILE.contextProfileIdHash, false],
        ["CREATION_ATTESTATION_PROFILE_ID()(bytes32)", PROFILE.creationAttestationProfileId, false],
      ];
      for (const [signature, expected, isAddress] of checks) {
        const actual = await this.call(record.contractAddress, signature);
        if (isAddress ? !sameAddress(actual, expected) : actual.toLowerCase() !== expected.toLowerCase()) fail(`ThoughtNFT immutable/profile mismatch: ${signature}`);
      }
      return runtime;
    }
    fail(`checkpoint verifier does not recognize ${step.id}`);
  }

  async collectFinalReadback(journal, context) {
    await this.pathBoundary(context);
    for (let index = 0; index < journal.steps.length; index += 1) {
      await this.verifyCheckpoint(context.plan.steps[index], journal.steps[index], journal, context);
    }
    const outputs = journal.outputs;
    const exact = await this.call(outputs.thoughtSpecRegistry, "thoughtSpecBytes(bytes32)(bytes)", [context.phaseInput.selectedSpec.thoughtSpecId]);
    return {
      exactSpecBytesVerified: sha256Bytes(Buffer.from(exact.slice(2), "hex")) === context.phaseInput.selectedSpec.sha256,
      pathNftImmutable: await this.call(outputs.thoughtNft, "pathNft()(address)"),
      rendererIdHash: (await this.call(outputs.thoughtNft, "RENDERER_ID_HASH()(bytes32)")).toLowerCase(),
      metadataProfileIdHash: (await this.call(outputs.thoughtNft, "METADATA_PROFILE_ID_HASH()(bytes32)")).toLowerCase(),
      workProfileIdHash: (await this.call(outputs.thoughtNft, "WORK_PROFILE_ID_HASH()(bytes32)")).toLowerCase(),
      contextProfileIdHash: (await this.call(outputs.thoughtNft, "CONTEXT_PROFILE_ID_HASH()(bytes32)")).toLowerCase(),
      creationAttestationProfileId: (await this.call(outputs.thoughtNft, "CREATION_ATTESTATION_PROFILE_ID()(bytes32)")).toLowerCase(),
      registryOwner: await this.call(outputs.thoughtSpecRegistry, "owner()(address)"),
      protocolRegistryOwner: await this.call(outputs.protocolRegistry, "owner()(address)"),
      attestationVerifierOwner: await this.call(outputs.creationAttestationVerifier, "owner()(address)"),
      attestationAuthority: await this.call(outputs.creationAttestationVerifier, "authority()(address)"),
      attestationAuthorityEpoch: toSafeNumber(await this.call(outputs.creationAttestationVerifier, "authorityEpoch()(uint32)"), "attestation authority epoch"),
    };
  }
}

export function executionContext({ bundleRoot, runDir, phaseInput, prior, bundleSha256, productionInvocation = false }) {
  const plan = readJson(path.join(bundleRoot, "transaction-plan.json"), "transaction plan");
  return { bundleRoot, runDir, phaseInput, prior, bundleSha256, plan, productionInvocation };
}

export function expectedThoughtBinding(context) {
  return expectedThought(context);
}
