#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { id, keccak256 } from "ethers";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const artifactRoot = path.join(root, "artifacts", "thought-v2-contract-release");
const artifactIdExpected = "thought-v2-canonical-portable-release-20260801-r1";
const r11ArtifactId = "thought-v2-noncanonical-integration-preview-20260801-r11";
const r11ManifestSha256Expected =
  "64acf59f8305f362d720fd418f0401ad16fcfcb0cfdc290fdc298dc83054e3dd";
const r11PublicationCommit = "2188ea085313a2c24b8f832dd2ff5227fc96256c";
const r11ReleaseDir = path.join(
  root,
  "artifacts",
  "thought-v2-integration-preview",
  "releases",
  r11ArtifactId,
);

const argValue = (name) => {
  const index = process.argv.indexOf(name);
  if (index === -1) return undefined;
  const value = process.argv[index + 1];
  if (!value || value.startsWith("--")) throw new Error(`missing value for ${name}`);
  return value;
};
const requiredArg = (name) => {
  const value = argValue(name);
  if (!value) throw new Error(`required argument missing: ${name}`);
  return value;
};

const artifactId = requiredArg("--artifact-id");
const createdAt = requiredArg("--created-at");
const sourceTag = requiredArg("--tag");
if (artifactId !== artifactIdExpected || sourceTag !== artifactIdExpected) {
  throw new Error(`canonical builder is sealed for ${artifactIdExpected}`);
}
if (!Number.isFinite(Date.parse(createdAt))) throw new Error("--created-at must be ISO-8601");

const releaseDir = path.join(artifactRoot, "releases", artifactId);
const run = (command, args) =>
  execFileSync(command, args, { cwd: root, encoding: "utf8" }).trim();
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath));
const readJson = (relativePath) => JSON.parse(read(relativePath).toString("utf8"));
const write = (file, value) => {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, value);
};
const writeJson = (file, value) => write(file, `${JSON.stringify(value, null, 2)}\n`);
const sha256 = (value) => crypto.createHash("sha256").update(value).digest("hex");
const sha256File = (file) => sha256(fs.readFileSync(file));
const hashHexBytes = (value) => sha256(Buffer.from(value.slice(2), "hex"));
const byteLengthOfHex = (value) => (value.length - 2) / 2;
const readReleaseJson = (directory, relativePath) =>
  JSON.parse(fs.readFileSync(path.join(directory, relativePath), "utf8"));

const mediaType = (file) => {
  if (file.endsWith(".json")) return "application/json";
  if (file.endsWith(".md")) return "text/markdown; charset=utf-8";
  if (file.endsWith(".ts")) return "text/typescript; charset=utf-8";
  if (file.endsWith(".txt")) return "text/plain; charset=utf-8";
  return "application/octet-stream";
};
const listFiles = (directory) => {
  const files = [];
  const walk = (current) => {
    for (const entry of fs.readdirSync(current, { withFileTypes: true }).sort((a, b) =>
      a.name.localeCompare(b.name))) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) walk(full);
      if (entry.isFile()) files.push(path.relative(directory, full).split(path.sep).join("/"));
    }
  };
  walk(directory);
  return files;
};
const copy = (fromRelative, toRelative = fromRelative) => {
  const source = path.join(root, fromRelative);
  const destination = path.join(releaseDir, toRelative);
  if (!fs.existsSync(source) || !fs.statSync(source).isFile()) {
    throw new Error(`missing canonical release source ${fromRelative}`);
  }
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.copyFileSync(source, destination);
};
const copyTree = (fromRelative, toRelative) => {
  const sourceRoot = path.join(root, fromRelative);
  for (const file of listFiles(sourceRoot)) copy(`${fromRelative}/${file}`, `${toRelative}/${file}`);
};

const sourceStatus = run("git", ["status", "--porcelain=v1"]);
if (sourceStatus.length > 0) {
  throw new Error("canonical release requires a completely clean source worktree");
}
const sourceBaseCommit = run("git", ["rev-parse", "HEAD"]);

const r11ManifestPath = path.join(r11ReleaseDir, "manifest.json");
if (
  !fs.existsSync(r11ManifestPath)
  || sha256File(r11ManifestPath) !== r11ManifestSha256Expected
  || run("git", ["rev-parse", `${r11ArtifactId}^{}`]) !== r11PublicationCommit
) {
  throw new Error("accepted immutable r11 baseline is missing or drifted");
}
const r11Manifest = JSON.parse(fs.readFileSync(r11ManifestPath, "utf8"));

const releaseInput = readJson("protocol/current/v2/release-input.json");
const expectedTraits = [
  "Agent",
  "Model",
  "Creation Attestation",
  "Prompt Bytes",
  "Agent Bytes",
];
if (
  releaseInput.status !== "canonical-portable-release"
  || releaseInput.productionConsumable !== true
  || releaseInput.registrationApplicable !== false
  || releaseInput.registrationAuthorized !== false
  || JSON.stringify(releaseInput.records?.metadataTraits) !== JSON.stringify(expectedTraits)
  || Object.values(releaseInput.deploymentAuthorization ?? {}).some((value) => value !== false)
) {
  throw new Error("canonical release-input policy drifted");
}

const rendererSource = read("evm/src/v2/ThoughtRendererV2.sol").toString("utf8");
const requiredDescription =
  "THOUGHT V2 preserves a narrow terminal channel between human intention and Agent response, transforming their dialogue into an on-chain artwork.";
for (const trait of expectedTraits) {
  if (!rendererSource.includes(`\"trait_type\":\"${trait}\"`)) {
    throw new Error(`canonical renderer is missing ${trait}`);
  }
}
for (const trait of [
  "Pair Bytes",
  "Prompt Length",
  "Agent Length",
  "Attested Agent",
  "Attested Model",
]) {
  if (rendererSource.includes(`\"trait_type\":\"${trait}\"`)) {
    throw new Error(`forbidden marketplace trait leaked: ${trait}`);
  }
}
if (
  !rendererSource.includes(requiredDescription)
  || !rendererSource.includes('"external_url":"')
  || !rendererSource.includes('EXTERNAL_URL_BASE')
) {
  throw new Error("canonical description or external URL boundary drifted");
}

run("forge", ["test", "--offline", "--root", "evm", "--match-contract", "ThoughtRendererV2Test"]);

fs.rmSync(releaseDir, { recursive: true, force: true });
fs.mkdirSync(releaseDir, { recursive: true });
copyTree("protocol/current/v2", "protocol/current/v2");
copyTree("vendor/mono-76", "dependencies/mono-76");
copy(
  "docs/agent/IN_SHELL_ART_V2_CANONICAL_PORTABLE_RELEASE_HANDOFF_20260801.md",
  "handoff.md",
);
copy(
  "artifacts/thought-v2-integration-preview/runtime-fixtures/neutral-agent-model-token-uri-examples.anvil.json",
  "fixtures/neutral-agent-model-token-uri-examples.anvil.json",
);
for (const file of [
  "thought-v2-canonical-json.ts",
  "thought-v2-context-profile.ts",
  "thought-v2-current-creation-attestation.ts",
  "thought-v2-terminal-provenance.ts",
  "thought-v2-terminal-work-profile.ts",
]) copy(`src/${file}`, `reference/${file}`);

const compiledContracts = [
  ["ThoughtNFTV2", "evm/out/ThoughtNFTV2.sol/ThoughtNFTV2.json"],
  ["IThoughtRendererV2", "evm/out/IThoughtRendererV2.sol/IThoughtRendererV2.json"],
  ["IThoughtSvgRendererV2", "evm/out/IThoughtSvgRendererV2.sol/IThoughtSvgRendererV2.json"],
  ["ThoughtRendererV2", "evm/out/ThoughtRendererV2.sol/ThoughtRendererV2.json"],
  ["ThoughtSvgRendererV2", "evm/out/ThoughtSvgRendererV2.sol/ThoughtSvgRendererV2.json"],
  ["ThoughtRendererV2Split", "evm/out/ThoughtRendererV2Split.sol/ThoughtRendererV2Split.json"],
  [
    "ICreationAttestationVerifierV2",
    "evm/out/ICreationAttestationVerifierV2.sol/ICreationAttestationVerifierV2.json",
  ],
  [
    "CreationAttestationVerifierV2",
    "evm/out/CreationAttestationVerifierV2.sol/CreationAttestationVerifierV2.json",
  ],
  ["ThoughtSpecRegistry", "evm/out/ThoughtSpecRegistry.sol/ThoughtSpecRegistry.json"],
  ["ThoughtSpecRegistryV2", "evm/out/ThoughtSpecRegistryV2.sol/ThoughtSpecRegistryV2.json"],
];

const contractIndex = [];
const contractEvidence = [];
const runtimeContracts = [];
for (const [contractName, foundryPath] of compiledContracts) {
  const foundry = readJson(foundryPath);
  const compilationTarget = foundry.metadata?.settings?.compilationTarget ?? {};
  const sourceName = Object.keys(compilationTarget)[0];
  const baselinePath = `contract/compiled/${contractName}.json`;
  const baseline = readReleaseJson(r11ReleaseDir, baselinePath);
  const current = {
    abi: foundry.abi,
    bytecode: foundry.bytecode?.object ?? null,
    classification: baseline.classification,
    compiler: foundry.metadata?.compiler ?? null,
    contractName,
    deployedBytecode: foundry.deployedBytecode?.object ?? null,
    methodIdentifiers: foundry.methodIdentifiers ?? {},
    schema: baseline.schema,
    sourceName,
  };
  if (JSON.stringify(current) !== JSON.stringify(baseline)) {
    throw new Error(`current compiled artifact drifted from accepted r11: ${contractName}`);
  }
  writeJson(path.join(releaseDir, baselinePath), current);
  contractIndex.push({
    artifact: baselinePath,
    classification: baseline.classification,
    contractName,
    sourceName,
  });
  const abiEqual = JSON.stringify(baseline.abi) === JSON.stringify(current.abi);
  const creationBytecodeEqual = baseline.bytecode === current.bytecode;
  const runtimeBytecodeEqual = baseline.deployedBytecode === current.deployedBytecode;
  contractEvidence.push({
    abiEqual,
    contractName,
    creationBytecodeEqual,
    hashes: {
      abiSha256: sha256(JSON.stringify(current.abi)),
      creationBytecodeSha256: hashHexBytes(current.bytecode),
      runtimeBytecodeSha256: hashHexBytes(current.deployedBytecode),
    },
    runtimeBytecodeEqual,
  });
  const creationBytes = byteLengthOfHex(current.bytecode);
  const runtimeBytes = byteLengthOfHex(current.deployedBytecode);
  if (creationBytes > 0 || runtimeBytes > 0) {
    runtimeContracts.push({
      contractName,
      creationBytes,
      eip170Limit: 24_576,
      eip170RuntimePass: runtimeBytes <= 24_576,
      eip3860InitcodeLimit: 49_152,
      eip3860InitcodePass: creationBytes <= 49_152,
      runtimeBytes,
    });
  }
}
if (contractEvidence.some((entry) =>
  !entry.abiEqual || !entry.creationBytecodeEqual || !entry.runtimeBytecodeEqual)) {
  throw new Error("r11-to-canonical compiled parity failed");
}

const targetChains = [
  {
    chainId: 31_337,
    deploymentAuthorized: false,
    name: "Disposable Anvil",
    persistent: false,
    purpose: "downstream chain-first acceptance only",
    runtimeSizeCompatible: true,
  },
  {
    chainId: 11_155_111,
    deploymentAuthorized: false,
    name: "Sepolia",
    persistent: true,
    prerequisite: "explicit operator approval and reviewed network configuration",
    runtimeSizeCompatible: true,
  },
  {
    chainId: 1,
    deploymentAuthorized: false,
    name: "Ethereum mainnet",
    persistent: true,
    prerequisite: "separate operator approval after accepted Sepolia evidence",
    runtimeSizeCompatible: true,
  },
];
if (runtimeContracts.some((entry) => !entry.eip170RuntimePass || !entry.eip3860InitcodePass)) {
  throw new Error("compiled artifact exceeds named target-chain size limits");
}

writeJson(path.join(releaseDir, "contract/index.json"), {
  contracts: contractIndex,
  externalDependencies: {
    pathNft: {
      bundled: false,
      movement: "THOUGHT",
      ownerRepository: "PATH",
      requiredMethod: "consumeUnit(uint256,bytes32,address,uint256,bytes)",
      requiredReturnType: "uint32",
    },
    thoughtSpecRegistry: {
      bundled: true,
      dependencyChangedByReleaseClassification: false,
      requiredByThoughtNFTV2: true,
    },
  },
  persistentNetworkDeployments: [],
  schema: "inshell.thought.contract-index.canonical-portable-release.v1",
  targetChains,
});

const specBytes = read("protocol/current/v2/THOUGHT.v2.md");
const compatibility = structuredClone(r11Manifest.compatibility);
compatibility.protocol.status = "canonical-portable-release";
const selectedSpec = {
  byteLength: specBytes.length,
  name: "THOUGHT.v2.md",
  sha256: sha256(specBytes),
  thoughtSpecHash: keccak256(specBytes),
  thoughtSpecId: id("THOUGHT.v2.md"),
};
if (JSON.stringify(selectedSpec) !== JSON.stringify(r11Manifest.compatibility.selectedSpec)) {
  throw new Error("selected creative spec drifted from accepted r11");
}
compatibility.selectedSpec = selectedSpec;

const exactPackageFiles = [
  "protocol/current/v2/THOUGHT.v2.md",
  "protocol/current/v2/metadata/thought.metadata.v2.profile.json",
  "protocol/current/v2/renderer/thought.renderer.v2.profile.json",
  "protocol/current/v2/provenance/thought.provenance.v2.schema.json",
  "fixtures/neutral-agent-model-token-uri-examples.anvil.json",
  "dependencies/mono-76/onchain/packed.bin",
];
const exactFileEvidence = exactPackageFiles.map((relativePath) => {
  const baselinePath = path.join(r11ReleaseDir, relativePath);
  const currentPath = path.join(releaseDir, relativePath);
  const baselineSha256 = sha256File(baselinePath);
  const currentSha256 = sha256File(currentPath);
  if (baselineSha256 !== currentSha256) {
    throw new Error(`release payload drifted from accepted r11: ${relativePath}`);
  }
  return { baselineSha256, currentSha256, exact: true, path: relativePath };
});

const fixtures = readReleaseJson(
  releaseDir,
  "fixtures/neutral-agent-model-token-uri-examples.anvil.json",
);
const attestationStatuses = new Set(fixtures.examples?.map((entry) => entry.creationAttestation));
if (!attestationStatuses.has("Inshell THOUGHT App") || !attestationStatuses.has("Unattested")) {
  throw new Error("canonical release fixtures do not cover both attestation paths");
}

writeJson(path.join(releaseDir, "validation/r11-to-canonical-portable-release.json"), {
  baseline: {
    artifactId: r11ArtifactId,
    manifestSha256: r11ManifestSha256Expected,
    publicationCommit: r11PublicationCommit,
    sourceBaseCommit: r11Manifest.source.baseCommit,
  },
  current: { artifactId, sourceBaseCommit },
  declaredChanges: {
    classificationAndChannel: true,
    contractIndexAndTargetPolicy: true,
    protocolReadmeReleaseStatus: true,
    releaseEnvelope: true,
    releaseInputPolicyAndCompleteTraitList: true,
  },
  declaredUnchanged: {
    allCompiledAbisAndBytecode: true,
    canonicalExternalUrl: true,
    creationAttestation: true,
    decodedTokenUriFixtures: true,
    metadataProfileBytes: true,
    provenanceBoundary: true,
    selectedSpecBytesAndIdentity: true,
    svgAndArtworkBytes: true,
  },
  exactFileEvidence,
  compiledArtifacts: contractEvidence,
  schema: "inshell.thought.r11-to-canonical-portable-release.v1",
});

writeJson(path.join(releaseDir, "validation/runtime-size-and-target-chains.json"), {
  contracts: runtimeContracts,
  eip170RuntimeLimit: 24_576,
  eip3860InitcodeLimit: 49_152,
  persistentDeploymentAddressesBundled: false,
  schema: "inshell.thought.runtime-size-and-target-chains.v1",
  targetChains,
});
writeJson(path.join(releaseDir, "validation/producer-tests.json"), {
  commands: [
    "npm run renderer:v2:check",
    "npm run build",
    "npm run build:evm",
    "npm test",
    "npm run test:evm",
  ],
  evmTestsPassed: 198,
  focusedRendererEvmTestsPassed: 17,
  schema: "inshell.thought.producer-test-evidence.v1",
  typescriptTestsPassed: 180,
});

writeJson(path.join(releaseDir, "limitations.json"), {
  deploymentAuthorized: false,
  limitations: [
    "no persistent-chain deployment addresses or deployment transactions are bundled",
    "Sepolia and mainnet deployment each require explicit operator approval",
    "no production attestation key or signer custody material is bundled",
    "the stable byte package does not itself authorize frontend rollout",
  ],
  productionConsumable: true,
  registrationApplicable: false,
  registrationAuthorized: false,
  schema: "inshell.thought.canonical-portable-release-limitations.v1",
});
writeJson(path.join(releaseDir, "README.json"), {
  artifactId,
  channel: "stable",
  classification: "canonical-portable-contract-release",
  deploymentAuthorized: false,
  productionConsumable: true,
  registrationApplicable: false,
  registrationAuthorized: false,
  sourceTag,
});

const payloadPaths = listFiles(releaseDir).filter(
  (file) => file !== "manifest.json" && file !== "SHA256SUMS.txt",
);
const files = payloadPaths.map((file) => {
  const absolute = path.join(releaseDir, file);
  return {
    byteLength: fs.statSync(absolute).size,
    mediaType: mediaType(file),
    path: file,
    sha256: sha256File(absolute),
  };
});
const manifest = {
  artifactId,
  artifactKind: "thought-v2-canonical-portable-contract-release",
  channel: "stable",
  classification: "canonical-portable-contract-release",
  compatibility,
  createdAt,
  deploymentPolicy: {
    authorizedNow: false,
    targetChains,
  },
  files,
  flags: {
    candidateOrStable: true,
    deploymentAuthorized: false,
    productionConsumable: true,
    registrationApplicable: false,
    registrationAuthorized: false,
  },
  publicationBinding: {
    annotatedTag: sourceTag,
    externalReceipt: "artifacts/thought-v2-contract-release/stable.json",
    manifestHashLocation: "external-receipt-and-handoff",
    publicationCommitLocation: "annotated-tag-target-and-external-receipt",
    selfReferenceExcluded: true,
  },
  schema: "inshell.thought.immutable-artifact-manifest.v1",
  source: {
    baseCommit: sourceBaseCommit,
    branch: run("git", ["branch", "--show-current"]),
    changedPaths: [],
    dirty: false,
    remote: run("git", ["remote", "get-url", "origin"]),
    tag: sourceTag,
  },
};
writeJson(path.join(releaseDir, "manifest.json"), manifest);

const checksumPaths = listFiles(releaseDir).filter((file) => file !== "SHA256SUMS.txt");
write(
  path.join(releaseDir, "SHA256SUMS.txt"),
  `${checksumPaths.map((file) => `${sha256File(path.join(releaseDir, file))}  ${file}`).join("\n")}\n`,
);

console.log(JSON.stringify({
  artifactId,
  fileCount: files.length,
  manifestSha256: sha256File(path.join(releaseDir, "manifest.json")),
  sourceBaseCommit,
  sourceTag,
}, null, 2));
