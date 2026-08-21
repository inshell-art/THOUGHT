#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

import {
  parseJsonStrict,
  sha256Bytes,
  sha256Jcs,
  validatePathEnvelopeFile,
  validateThoughtEnvelope,
} from "./lib/thought-integrated-deployment.mjs";
import {
  CastThoughtExecutionAdapter,
  constructThoughtReceiptFromEvidence,
  executeTransactionPlan,
  executionContext,
  expectedThoughtBinding,
  preflightExecution,
  verifyExecutionCheckpoint,
} from "./lib/thought-campaign-executor.mjs";

const [mode, bundleRootArgument] = process.argv.slice(2);
const bundleRoot = path.resolve(bundleRootArgument ?? process.cwd());
const fail = (message) => { throw new Error(`THOUGHT_CAMPAIGN_INVALID: ${message}`); };
const readJson = (file, label) => {
  try {
    return parseJsonStrict(fs.readFileSync(file, "utf8"), label);
  } catch (error) {
    fail(`${label} is unreadable or invalid JSON: ${error.message}`);
  }
};
const requiredEnv = (name) => {
  const value = process.env[name];
  if (!value) fail(`${name} is required`);
  return value;
};

function loadContext() {
  const input = readJson(path.join(bundleRoot, "phase-input.json"), "phase-input.json");
  const campaignId = requiredEnv("SIGNING_OS_CAMPAIGN_ID");
  const environment = requiredEnv("SIGNING_OS_CAMPAIGN_ENVIRONMENT");
  const chainId = Number(requiredEnv("SIGNING_OS_CAMPAIGN_CHAIN_ID"));
  const phaseId = requiredEnv("SIGNING_OS_CAMPAIGN_PHASE_ID");
  if (campaignId !== input.campaignId || environment !== input.environment
      || chainId !== input.chainId || phaseId !== "thought") {
    fail("Signing OS campaign/environment/chain/phase binding mismatch");
  }
  const inputReceipt = requiredEnv("SIGNING_OS_CAMPAIGN_INPUT_RECEIPT");
  const expectedPath = {
    campaignId,
    environment,
    chainId,
    pathBundleDigest: input.priorReceipt.pathBundleDigest,
    retainedAuthority: input.authorities.pathRetainedAuthority,
    pathNft: input.priorReceipt.pathNft,
  };
  const prior = validatePathEnvelopeFile(
    inputReceipt,
    input.priorReceipt.envelopeSha256,
    expectedPath,
  );
  if (prior.payloadSha256 !== input.priorReceipt.payloadSha256) {
    fail("phase input PATH payload SHA-256 mismatch");
  }
  const signingBundleSha256 = requiredEnv("SIGNING_OS_CAMPAIGN_BUNDLE_SHA256");
  if (!/^[0-9a-f]{64}$/.test(signingBundleSha256)) fail("Signing OS bundle SHA-256 is malformed");
  const runDir = path.resolve(requiredEnv("SIGNING_OS_CAMPAIGN_RUN_DIR"));
  return {
    inputReceipt,
    execution: executionContext({
      bundleRoot,
      runDir,
      phaseInput: input,
      prior,
      bundleSha256: signingBundleSha256,
      productionInvocation: true,
    }),
  };
}

const productionAdapter = (context) => new CastThoughtExecutionAdapter(process.env, context.execution.phaseInput);

async function preflight() {
  const context = loadContext();
  await preflightExecution(context.execution, productionAdapter(context));
  process.stdout.write("THOUGHT campaign preflight PASS\n");
}

const writeEnvelope = (outputFile, envelope) => {
  if (fs.existsSync(outputFile)) fail("refusing to overwrite an existing output receipt");
  fs.writeFileSync(outputFile, `${JSON.stringify(envelope, null, 2)}\n`, { flag: "wx" });
  process.stdout.write(`THOUGHT campaign envelope emitted ${sha256Bytes(fs.readFileSync(outputFile))}\n`);
};

async function execute({ resume = false } = {}) {
  const context = loadContext();
  const outputFile = requiredEnv("SIGNING_OS_CAMPAIGN_OUTPUT_RECEIPT");
  const options = resume ? {
    resumeEvidenceRoot: path.resolve(requiredEnv("SIGNING_OS_CAMPAIGN_BLOCKED_EVIDENCE")),
    checkpoint: requiredEnv("SIGNING_OS_CAMPAIGN_CHECKPOINT_ID"),
  } : {};
  const result = await executeTransactionPlan(context.execution, productionAdapter(context), options);
  writeEnvelope(outputFile, result.envelope);
}

async function postconditions() {
  const context = loadContext();
  await preflightExecution(context.execution, productionAdapter(context));
  const outputFile = requiredEnv("SIGNING_OS_CAMPAIGN_OUTPUT_RECEIPT");
  const expected = expectedThoughtBinding(context.execution);
  const envelope = readJson(outputFile, "THOUGHT output envelope");
  validateThoughtEnvelope(envelope, expected);
  if (envelope.input_receipt_sha256 !== sha256Bytes(fs.readFileSync(context.inputReceipt))) {
    fail("THOUGHT output does not link the complete consumed PATH envelope");
  }
  const checkpoint = context.execution.plan.steps.at(-1).checkpointAfter;
  const journal = await verifyExecutionCheckpoint(
    context.execution,
    productionAdapter(context),
    context.execution.runDir,
    checkpoint,
  );
  const readback = await productionAdapter(context).collectFinalReadback(journal, context.execution);
  const reconstructed = constructThoughtReceiptFromEvidence(context.execution, journal, readback);
  if (sha256Jcs(envelope) !== sha256Jcs(reconstructed.envelope)) {
    fail("THOUGHT output envelope does not match the persisted mined/readback evidence");
  }
  process.stdout.write("THOUGHT campaign postconditions PASS\n");
}

async function verifyCheckpoint() {
  const context = loadContext();
  await preflightExecution(context.execution, productionAdapter(context));
  await verifyExecutionCheckpoint(
    context.execution,
    productionAdapter(context),
    path.resolve(requiredEnv("SIGNING_OS_CAMPAIGN_BLOCKED_EVIDENCE")),
    requiredEnv("SIGNING_OS_CAMPAIGN_CHECKPOINT_ID"),
  );
  process.stdout.write("THOUGHT execution checkpoint PASS\n");
}

if (mode === "preflight") await preflight();
else if (mode === "execute") await execute();
else if (mode === "resume") await execute({ resume: true });
else if (mode === "postconditions") await postconditions();
else if (mode === "verify-checkpoint") await verifyCheckpoint();
else fail("mode must be preflight, execute, resume, postconditions, or verify-checkpoint");
