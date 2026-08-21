#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import { AbiCoder, getAddress, id, isAddress, keccak256 } from "ethers";
import {
  PATH_PHASE_A_RECEIPT_TYPE,
  PINNED_THOUGHT_RELEASE,
  THOUGHT_PHASE_INPUT_SCHEMA,
  makeThoughtCampaignPhaseDescriptor,
  sha256Bytes,
  validatePathEnvelopeFile,
} from "./lib/thought-integrated-deployment.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const releaseRoot = path.join(
  root, "artifacts/thought-v2-contract-release/releases", PINNED_THOUGHT_RELEASE.artifactId,
);
const contractNames = [
  "ThoughtSpecRegistry", "ThoughtSpecRegistryV2", "ThoughtRendererV2",
  "CreationAttestationVerifierV2", "ThoughtNFTV2",
];
const runtimeDependencies = [
  "ethers", "@adraffy/ens-normalize", "@noble/curves", "@noble/hashes",
  "aes-js", "tslib", "ws",
];

const arg = (name, required = true) => {
  const index = process.argv.indexOf(name);
  if (index < 0) {
    if (required) throw new Error(`required argument missing: ${name}`);
    return undefined;
  }
  const value = process.argv[index + 1];
  if (!value || value.startsWith("--")) throw new Error(`missing value for ${name}`);
  return value;
};
const addressArg = (name) => {
  const value = arg(name);
  if (!isAddress(value)) throw new Error(`${name} must be an EVM address`);
  return getAddress(value);
};
const shaArg = (name) => {
  const value = arg(name).replace(/^0x/, "");
  if (!/^[0-9a-f]{64}$/.test(value)) throw new Error(`${name} must be lowercase SHA-256`);
  return value;
};
const sourceBundleDigestArg = (name) => {
  const value = arg(name);
  if (!/^[0-9a-f]{64}$/.test(value)) throw new Error(`${name} must be lowercase SHA-256`);
  return value;
};
const readJson = (file) => JSON.parse(fs.readFileSync(file, "utf8"));
const writeJson = (file, value) => {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
};
const copy = (source, destination) => {
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.copyFileSync(source, destination);
};
const copyTree = (source, destination) => {
  if (!fs.statSync(source, { throwIfNoEntry: false })?.isDirectory()) {
    throw new Error(`required bundled runtime dependency is missing: ${source}`);
  }
  fs.cpSync(source, destination, { recursive: true, dereference: true });
};
const listFiles = (directory) => {
  const out = [];
  const walk = (current) => {
    for (const entry of fs.readdirSync(current, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.isFile()) out.push(path.relative(directory, full).split(path.sep).join("/"));
    }
  };
  walk(directory);
  return out;
};
const git = (...args) => execFileSync("git", args, { cwd: root, encoding: "utf8" }).trim();

function verifyPinnedRelease() {
  const stable = readJson(path.join(root, "artifacts/thought-v2-contract-release/stable.json"));
  if (stable.artifactId !== PINNED_THOUGHT_RELEASE.artifactId
      || stable.manifestSha256 !== PINNED_THOUGHT_RELEASE.manifestSha256
      || stable.publicationCommit !== PINNED_THOUGHT_RELEASE.publicationCommit
      || stable.sourceTag !== PINNED_THOUGHT_RELEASE.sourceTag
      || stable.productionConsumable !== true || stable.deploymentAuthorized !== false) {
    throw new Error("stable THOUGHT release pointer mismatch");
  }
  const manifestFile = path.join(releaseRoot, "manifest.json");
  const manifestBytes = fs.readFileSync(manifestFile);
  if (sha256Bytes(manifestBytes) !== PINNED_THOUGHT_RELEASE.manifestSha256) {
    throw new Error("pinned THOUGHT manifest SHA-256 mismatch");
  }
  const manifest = JSON.parse(manifestBytes.toString("utf8"));
  if (manifest.artifactId !== PINNED_THOUGHT_RELEASE.artifactId
      || manifest.source?.dirty !== false || manifest.deploymentPolicy?.authorizedNow !== false) {
    throw new Error("pinned THOUGHT manifest policy mismatch");
  }
  for (const file of manifest.files) {
    const target = path.join(releaseRoot, file.path);
    if (!fs.existsSync(target) || sha256Bytes(fs.readFileSync(target)) !== file.sha256) {
      throw new Error(`pinned THOUGHT release file mismatch: ${file.path}`);
    }
  }
  const spec = manifest.compatibility.selectedSpec;
  return { manifest, manifestBytes, manifestFile, spec };
}

function main() {
  const status = git("status", "--porcelain=v1");
  if (status) throw new Error("deployment pack generation requires a clean worktree");

  const campaignId = arg("--campaign-id");
  const environment = arg("--environment");
  const chainId = Number(arg("--chain-id"));
  const receiptFile = path.resolve(arg("--path-phase-a-envelope"));
  const receiptSha256 = shaArg("--expected-path-phase-a-envelope-sha256");
  const pathBundleDigest = sourceBundleDigestArg("--expected-path-bundle-digest");
  const retainedAuthority = addressArg("--expected-path-retained-authority");
  const expectedPathNft = addressArg("--expected-path-nft");
  const deployer = addressArg("--deployer");
  const deployerSignerRef = arg("--deployer-signer-ref");
  const registryOwner = addressArg("--registry-owner");
  const registryOwnerSignerRef = arg("--registry-owner-signer-ref");
  const attestationAuthority = addressArg("--attestation-authority");
  const protocolManifestUri = arg("--protocol-manifest-uri");
  const outRoot = path.resolve(arg("--out-root", false) ?? path.join(root, "artifacts/deployment-campaign/packs"));
  const bundleId = arg("--bundle-id", false) ?? `${campaignId}-thought`;
  if (!Number.isSafeInteger(chainId) || chainId <= 0) throw new Error("--chain-id must be positive");
  if (Buffer.byteLength(protocolManifestUri) < 1 || Buffer.byteLength(protocolManifestUri) > 200) {
    throw new Error("--protocol-manifest-uri must be 1-200 UTF-8 bytes");
  }

  const pathEnvelope = validatePathEnvelopeFile(receiptFile, receiptSha256, {
    campaignId, environment, chainId, pathBundleDigest, retainedAuthority, pathNft: expectedPathNft,
  });
  const pathReceipt = pathEnvelope.payload;
  const release = verifyPinnedRelease();
  const specFile = path.join(releaseRoot, "protocol/current/v2/THOUGHT.v2.md");
  const glyphFile = path.join(releaseRoot, "protocol/current/v2/renderer/mono-76.im76.bin");
  const specBytes = fs.readFileSync(specFile);
  const glyphBytes = fs.readFileSync(glyphFile);
  if (release.spec.name !== "THOUGHT.v2.md" || release.spec.sha256 !== sha256Bytes(specBytes)
      || release.spec.thoughtSpecId !== id("THOUGHT.v2.md")
      || release.spec.thoughtSpecHash !== keccak256(specBytes)) {
    throw new Error("pinned THOUGHT spec identity mismatch");
  }
  if (glyphBytes.length !== 4600 || keccak256(glyphBytes)
      !== "0xba37d00bb395b84f0487791300a29cdd2b1712b078fa218c6ed74fa11d74a081") {
    throw new Error("pinned Mono 76 payload mismatch");
  }

  const protocolManifestHash = keccak256(release.manifestBytes);
  const protocolReleaseId = keccak256(AbiCoder.defaultAbiCoder().encode(
    ["bytes32", "bytes32"], [id("INSHELL_THOUGHT_PROTOCOL_RELEASE"), protocolManifestHash],
  ));
  const packRoot = path.join(outRoot, bundleId);
  if (fs.existsSync(packRoot)) throw new Error(`refusing to overwrite existing pack: ${packRoot}`);
  fs.mkdirSync(packRoot, { recursive: true });

  const phaseInput = {
    schema: THOUGHT_PHASE_INPUT_SCHEMA,
    campaignId, bundleId, phase: "thought", environment, chainId,
    priorReceipt: {
      receiptType: PATH_PHASE_A_RECEIPT_TYPE,
      schemaId: "inshell.path.deployment.phase-a.receipt.v1",
      envelopeSha256: receiptSha256,
      payloadSha256: pathEnvelope.payloadSha256,
      pathNft: pathReceipt.pathNft.address,
      pathBundleDigest,
    },
    release: { ...PINNED_THOUGHT_RELEASE },
    authorities: {
      deployer: { address: deployer, signerRef: deployerSignerRef },
      registryOwner: { address: registryOwner, signerRef: registryOwnerSignerRef },
      attestationAuthority,
      pathRetainedAuthority: retainedAuthority,
    },
    execution: {
      rpcEnvironmentVariable: "THOUGHT_RPC_URL",
      deploySigner: {
        signerRef: deployerSignerRef,
        kind: "encrypted-keystore",
        keystoreEnvironmentVariable: "THOUGHT_DEPLOY_KEYSTORE",
        passwordFileEnvironmentVariable: "THOUGHT_DEPLOY_PASSWORD_FILE",
      },
      registryOwnerSigner: {
        signerRef: registryOwnerSignerRef,
        kind: "ledger",
        derivationPathEnvironmentVariable: "THOUGHT_ADMIN_LEDGER_DERIVATION_PATH",
      },
      confirmations: 2,
      retrySigningTransactionSilently: false,
    },
    protocolRegistration: { manifestHash: protocolManifestHash, manifestUri: protocolManifestUri, protocolReleaseId },
    selectedSpec: { ...release.spec, ref: `${PINNED_THOUGHT_RELEASE.sourceTag}/protocol/current/v2/THOUGHT.v2.md` },
    pathMutationOwner: "PATH_PHASE_B",
    pathMutationPerformed: false,
    deploymentAuthorizationIncluded: false,
  };
  writeJson(path.join(packRoot, "phase-input.json"), phaseInput);
  copy(receiptFile, path.join(packRoot, "inputs/path-phase-a-envelope.json"));
  copy(release.manifestFile, path.join(packRoot, "release/manifest.json"));
  copy(specFile, path.join(packRoot, "release/THOUGHT.v2.md"));
  copy(glyphFile, path.join(packRoot, "release/mono-76.im76.bin"));
  for (const name of contractNames) {
    copy(path.join(releaseRoot, `contract/compiled/${name}.json`), path.join(packRoot, `release/contracts/${name}.json`));
  }
  for (const name of ["protocol-receipt-envelope.v1.schema.json", "path-campaign-phase-a-receipt.v1.schema.json", "thought-phase-input.v1.schema.json", "thought-deployment-receipt.v1.schema.json"]) {
    copy(path.join(root, `ops/integrated-campaign/schemas/${name}`), path.join(packRoot, `schemas/${name}`));
  }
  copy(path.join(root, "scripts/thought-campaign-entrypoint.mjs"), path.join(packRoot, "thought-campaign-entrypoint.mjs"));
  copy(path.join(root, "scripts/lib/thought-integrated-deployment.mjs"), path.join(packRoot, "lib/thought-integrated-deployment.mjs"));
  copy(path.join(root, "scripts/lib/thought-campaign-executor.mjs"), path.join(packRoot, "lib/thought-campaign-executor.mjs"));
  const lock = readJson(path.join(root, "package-lock.json"));
  const bundledRuntime = [];
  for (const dependency of runtimeDependencies) {
    const source = path.join(root, "node_modules", dependency);
    const installed = readJson(path.join(source, "package.json"));
    const locked = lock.packages?.[`node_modules/${dependency}`];
    if (!locked || installed.name !== dependency || installed.version !== locked.version) {
      throw new Error(`installed runtime dependency does not match package-lock.json: ${dependency}`);
    }
    copyTree(path.join(root, "node_modules", dependency), path.join(packRoot, "node_modules", dependency));
    bundledRuntime.push({ name: dependency, version: installed.version });
  }
  writeJson(path.join(packRoot, "runtime-dependencies.json"), {
    schema: "inshell.thought.deployment.runtime-dependencies.v1",
    packages: bundledRuntime,
    note: "@types packages are compile-time-only and are intentionally not bundled",
  });
  writeJson(path.join(packRoot, "CAMPAIGN-PHASE.json"), makeThoughtCampaignPhaseDescriptor({
    bundleId, environment, chainId,
  }));
  for (const [name, mode] of [
    ["preflight", "preflight"], ["execute", "execute"], ["postconditions", "postconditions"],
    ["verify-checkpoint", "verify-checkpoint"], ["resume", "resume"],
  ]) {
    const target = path.join(packRoot, `bin/${name}`);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, `#!/bin/sh\nset -eu\nBUNDLE_ROOT=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)\nexec node "$BUNDLE_ROOT/thought-campaign-entrypoint.mjs" ${mode} "$BUNDLE_ROOT"\n`);
    fs.chmodSync(target, 0o755);
  }

  const txPlan = {
    schema: "inshell.deployment.protocol-bundle.transaction-plan.v1",
    campaignId, bundleId, environment, chainId,
    resumability: {
      retrySigningTransactionSilently: false,
      checkpoints: [
        "thought-spec-registry-deployed", "thought-spec-registered", "protocol-registry-deployed",
        "registries-registered", "glyph-data-pointer-deployed", "renderer-ready",
        "attestation-verifier-deployed", "thought-deployed",
      ],
      onWrongAddressRoleBytecodeOrChain: "abandon-stack",
    },
    steps: [
      { id: "deploy-thought-spec-registry", action: "deploy", signerRef: deployerSignerRef, artifact: "release/contracts/ThoughtSpecRegistry.json", constructor: [registryOwner], output: "thoughtSpecRegistry", checkpointAfter: "thought-spec-registry-deployed" },
      { id: "register-thought-spec", action: "call", signerRef: registryOwnerSignerRef, to: { outputRef: "thoughtSpecRegistry" }, signature: "registerThoughtSpec(string,string,bytes)", args: ["THOUGHT.v2.md", phaseInput.selectedSpec.ref, { fileRef: "release/THOUGHT.v2.md", encoding: "raw-bytes" }], checkpointAfter: "thought-spec-registered" },
      { id: "deploy-protocol-registry", action: "deploy", signerRef: deployerSignerRef, artifact: "release/contracts/ThoughtSpecRegistryV2.json", constructor: [registryOwner], output: "protocolRegistry", checkpointAfter: "protocol-registry-deployed" },
      { id: "register-protocol-release", action: "call", signerRef: registryOwnerSignerRef, to: { outputRef: "protocolRegistry" }, signature: "registerRelease(bytes32,string)", args: [protocolManifestHash, protocolManifestUri], checkpointAfter: "registries-registered" },
      { id: "deploy-glyph-data-pointer", action: "deploy-code-storage", signerRef: deployerSignerRef, payload: "release/mono-76.im76.bin", expectedPayloadKeccak256: keccak256(glyphBytes), output: "glyphDataPointer", checkpointAfter: "glyph-data-pointer-deployed" },
      { id: "deploy-thought-renderer", action: "deploy", signerRef: deployerSignerRef, artifact: "release/contracts/ThoughtRendererV2.json", constructor: [{ outputRef: "glyphDataPointer" }], output: "thoughtRenderer", checkpointAfter: "renderer-ready" },
      { id: "deploy-creation-attestation-verifier", action: "deploy", signerRef: deployerSignerRef, artifact: "release/contracts/CreationAttestationVerifierV2.json", constructor: [registryOwner, attestationAuthority], output: "creationAttestationVerifier", checkpointAfter: "attestation-verifier-deployed" },
      { id: "deploy-thought-nft", action: "deploy", signerRef: deployerSignerRef, artifact: "release/contracts/ThoughtNFTV2.json", constructor: [pathReceipt.pathNft.address, { outputRef: "thoughtSpecRegistry" }, { outputRef: "thoughtRenderer" }, { outputRef: "protocolRegistry" }, protocolReleaseId, { outputRef: "creationAttestationVerifier" }], output: "thoughtNft", checkpointAfter: "thought-deployed" },
    ],
    forbiddenCalls: [
      "PathNFT.setMovementConfig(bytes32,address,uint32)",
      "PathNFT.freezeMovementConfig(bytes32)",
    ],
  };
  writeJson(path.join(packRoot, "transaction-plan.json"), txPlan);
  writeJson(path.join(packRoot, "postconditions.json"), {
    schema: "inshell.thought.deployment.postconditions.v1",
    pathPreconditionMustRemain: { pathNft: pathReceipt.pathNft.address, movement: "THOUGHT", minter: "0x0000000000000000000000000000000000000000", quota: 0, frozen: false },
    registry: { exactSpecId: release.spec.thoughtSpecId, exactSpecHash: release.spec.thoughtSpecHash, exactSpecBytesFile: "release/THOUGHT.v2.md", protocolReleaseId, protocolManifestHash, protocolManifestUri },
    immutableDependencies: {
      "ThoughtNFTV2.pathNft": pathReceipt.pathNft.address,
      "ThoughtNFTV2.thoughtSpecRegistry": { outputRef: "thoughtSpecRegistry" },
      "ThoughtNFTV2.thoughtRenderer": { outputRef: "thoughtRenderer" },
      "ThoughtNFTV2.protocolRegistry": { outputRef: "protocolRegistry" },
      "ThoughtNFTV2.protocolReleaseId": protocolReleaseId,
      "ThoughtNFTV2.creationAttestationVerifier": { outputRef: "creationAttestationVerifier" },
      "ThoughtRendererV2.glyphDefinitionsPointer1": { outputRef: "glyphDataPointer" },
    },
    profiles: {
      rendererIdHash: id("inshell.thought.svg.v2.terminal-chat-path-glyphs"),
      metadataProfileIdHash: id("inshell.thought.metadata.v2.terminal-chat"),
      workProfileIdHash: id("inshell.thought.work.v2.terminal-english-64"),
      contextProfileIdHash: id("inshell.thought.context.v2.visible-utf8-64"),
      creationAttestationProfileId: id("inshell.thought.creation-workflow-attestation.v2"),
    },
    authorities: {
      registryOwner,
      protocolRegistryOwner: registryOwner,
      attestationVerifierOwner: registryOwner,
      attestationAuthority,
      attestationAuthorityEpoch: 1,
    },
    receiptOutputSchema: "schemas/thought-deployment-receipt.v1.schema.json",
  });
  fs.writeFileSync(path.join(packRoot, "README.md"), `# THOUGHT integrated deployment phase bundle\n\nThis immutable protocol-owned bundle consumes complete PATH Phase A envelope SHA-256 \`${receiptSha256}\` and PATH payload JCS SHA-256 \`${pathEnvelope.payloadSha256}\`. When and only when Signing OS invokes \`bin/execute\` after explicit authorization, the bundle-local executor performs the exact pinned eight-step THOUGHT V2 plan through the declared RPC and signer surfaces. It records signing intent before each single signing invocation, persists mined and verified checkpoints in a snapshot plus append-only JSONL event log, constructs the rich THOUGHT payload solely from verified mined/readback evidence, and emits its strict generic envelope for PATH Phase B. It contains no deployment authorization and performs no PATH mutation. Signing OS must verify the bundle digest, campaign/environment/chain, complete prior envelope digest, signer authorization, and operator approval before execution.\n`);

  const payload = listFiles(packRoot).filter((file) => file !== "bundle-manifest.json" && file !== "SHA256SUMS.txt");
  const files = Object.fromEntries(payload.map((file) => [file, sha256Bytes(fs.readFileSync(path.join(packRoot, file)))]));
  const digestInput = payload.map((file) => `${files[file]}  ${file}\n`).join("");
  const bundleDigest = `0x${crypto.createHash("sha256").update(digestInput).digest("hex")}`;
  writeJson(path.join(packRoot, "bundle-manifest.json"), {
    schema: "inshell.thought.deployment.protocol-bundle.v1", campaignId, bundleId, environment, chainId,
    createdAt: new Date().toISOString(), sourceCommit: git("rev-parse", "HEAD"), sourceDirty: false,
    priorEnvelopeSha256: receiptSha256, priorPayloadSha256: pathEnvelope.payloadSha256,
    release: PINNED_THOUGHT_RELEASE, bundleDigest, files,
    deploymentAuthorized: false, pathMutationOwner: "PATH_PHASE_B",
  });
  const checksummed = listFiles(packRoot).filter((file) => file !== "SHA256SUMS.txt");
  fs.writeFileSync(path.join(packRoot, "SHA256SUMS.txt"), checksummed.map((file) => `${sha256Bytes(fs.readFileSync(path.join(packRoot, file)))}  ${file}`).join("\n") + "\n");
  console.log(`THOUGHT integrated deployment pack written: ${packRoot}`);
  console.log(`bundle_digest=${bundleDigest}`);
}

main();
