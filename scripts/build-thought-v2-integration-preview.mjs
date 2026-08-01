#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { id, keccak256 } from "ethers";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const artifactRoot = path.join(root, "artifacts", "thought-v2-integration-preview");
const baselineArtifactId = "thought-v2-noncanonical-integration-preview-20260801-r10";
const baselinePublicationCommit = "0cea80f10d6b5477d029560466628b315f48bf39";
const baselineManifestSha256Expected =
  "eefce7c7ea8c1422c9ab3e631ebe15bed7935fbaf79588158ed8fb28eb746e94";
const baselineReleaseDir = path.join(artifactRoot, "releases", baselineArtifactId);

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
const expectedPrefix = "thought-v2-noncanonical-integration-preview-";
const portableTraitsArtifactId =
  "thought-v2-noncanonical-integration-preview-20260801-r11";
if (!artifactId.startsWith(expectedPrefix) || sourceTag !== artifactId) {
  throw new Error(`artifact ID and tag must match and start with ${expectedPrefix}`);
}
if (artifactId !== portableTraitsArtifactId) {
  throw new Error(`this portable-traits builder is sealed for ${portableTraitsArtifactId}`);
}
if (!Number.isFinite(Date.parse(createdAt))) throw new Error("--created-at must be ISO-8601");

const releaseDir = path.join(artifactRoot, "releases", artifactId);
const pointerPath = path.join(artifactRoot, "experimental.json");

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
const sha256HexBytes = (value) => sha256(Buffer.from(value.slice(2), "hex"));

const baselineManifestPath = path.join(baselineReleaseDir, "manifest.json");
if (
  !fs.existsSync(baselineManifestPath)
  || sha256File(baselineManifestPath) !== baselineManifestSha256Expected
) {
  throw new Error("immutable r10 portable-traits baseline is missing or drifted");
}
const baselineManifest = JSON.parse(fs.readFileSync(baselineManifestPath, "utf8"));
if (
  baselineManifest.artifactId !== baselineArtifactId
  || run("git", ["rev-parse", `${baselineArtifactId}^{}`]) !== baselinePublicationCommit
) {
  throw new Error("immutable r10 artifact identity or publication tag drifted");
}

const mediaType = (file) => {
  if (file.endsWith(".json")) return "application/json";
  if (file.endsWith(".md")) return "text/markdown; charset=utf-8";
  if (file.endsWith(".ts")) return "text/typescript; charset=utf-8";
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
    throw new Error(`missing preview source ${fromRelative}`);
  }
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.copyFileSync(source, destination);
};

const copyTree = (fromRelative, toRelative) => {
  const sourceRoot = path.join(root, fromRelative);
  for (const file of listFiles(sourceRoot)) {
    copy(`${fromRelative}/${file}`, `${toRelative}/${file}`);
  }
};

const statusLines = run("git", ["status", "--porcelain=v1"])
  .split("\n")
  .filter(Boolean)
  .filter((line) => !line.includes("artifacts/thought-v2-integration-preview/"));

const releaseInput = readJson("protocol/current/v2/release-input.json");
if (releaseInput.registrationAuthorized !== false || releaseInput.status !== "implementation-candidate") {
  throw new Error("integration preview requires an unauthorized implementation-candidate release input");
}

const rendererSource = read("evm/src/v2/ThoughtRendererV2.sol").toString("utf8");
const constantsSource = read("evm/src/v2/ThoughtV2Constants.sol").toString("utf8");
if (
  !rendererSource.includes("inshell.mono-76")
  || !rendererSource.includes("GLYPH_PACKED_KECCAK256")
  || !rendererSource.includes("PACKED_BYTES = 4_600")
  || !rendererSource.includes('stroke-width="1.23"')
  || !rendererSource.includes('data-glyph-origin-shift-x="1"')
  || !rendererSource.includes('EXTERNAL_URL_BASE')
  || !rendererSource.includes('"external_url":"')
  || !rendererSource.includes('"trait_type":"Prompt Bytes"')
  || !rendererSource.includes('"trait_type":"Agent Bytes"')
  || rendererSource.includes('"trait_type":"Pair Bytes"')
  || rendererSource.includes('"trait_type":"Prompt Length"')
  || rendererSource.includes('"trait_type":"Agent Length"')
  || !constantsSource.includes('EXTERNAL_URL_BASE = "https://inshell.art/thought/"')
  || rendererSource.includes("<foreignObject")
  || rendererSource.includes("<text")
) {
  throw new Error("canonical sealed Mono 76 native-path renderer boundary drifted");
}

run("forge", ["test", "--offline", "--root", "evm", "--match-contract", "ThoughtRendererV2Test"]);

fs.rmSync(releaseDir, { recursive: true, force: true });
fs.mkdirSync(releaseDir, { recursive: true });

copyTree("protocol/current/v2", "protocol/current/v2");
copyTree("vendor/mono-76", "dependencies/mono-76");
copy(
  "docs/agent/IN_SHELL_ART_V2_R11_PORTABLE_MARKETPLACE_TRAITS_INTEGRATION_PREVIEW_HANDOFF_20260801.md",
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
]) {
  copy(`src/${file}`, `reference/${file}`);
}

const compiledContracts = [
  {
    artifact: "evm/out/ThoughtNFTV2.sol/ThoughtNFTV2.json",
    classification: "current-contract-candidate",
    contractName: "ThoughtNFTV2",
  },
  {
    artifact: "evm/out/IThoughtRendererV2.sol/IThoughtRendererV2.json",
    classification: "current-renderer-interface",
    contractName: "IThoughtRendererV2",
  },
  {
    artifact: "evm/out/IThoughtSvgRendererV2.sol/IThoughtSvgRendererV2.json",
    classification: "current-svg-renderer-interface",
    contractName: "IThoughtSvgRendererV2",
  },
  {
    artifact: "evm/out/ThoughtRendererV2.sol/ThoughtRendererV2.json",
    classification: "current-native-path-renderer-candidate",
    contractName: "ThoughtRendererV2",
  },
  {
    artifact: "evm/out/ThoughtSvgRendererV2.sol/ThoughtSvgRendererV2.json",
    classification: "current-standalone-svg-renderer-candidate",
    contractName: "ThoughtSvgRendererV2",
  },
  {
    artifact: "evm/out/ThoughtRendererV2Split.sol/ThoughtRendererV2Split.json",
    classification: "current-split-metadata-renderer-candidate",
    contractName: "ThoughtRendererV2Split",
  },
  {
    artifact: "evm/out/ICreationAttestationVerifierV2.sol/ICreationAttestationVerifierV2.json",
    classification: "current-attestation-interface",
    contractName: "ICreationAttestationVerifierV2",
  },
  {
    artifact: "evm/out/CreationAttestationVerifierV2.sol/CreationAttestationVerifierV2.json",
    classification: "current-neutral-record-attestation-verifier",
    contractName: "CreationAttestationVerifierV2",
  },
  {
    artifact: "evm/out/ThoughtSpecRegistry.sol/ThoughtSpecRegistry.json",
    classification: "shared-current-dependency",
    contractName: "ThoughtSpecRegistry",
  },
  {
    artifact: "evm/out/ThoughtSpecRegistryV2.sol/ThoughtSpecRegistryV2.json",
    classification: "shared-current-protocol-release-registry",
    contractName: "ThoughtSpecRegistryV2",
  },
];

const contractIndex = [];
for (const descriptor of compiledContracts) {
  const foundry = readJson(descriptor.artifact);
  const compilationTarget = foundry.metadata?.settings?.compilationTarget ?? {};
  const sourceName = Object.keys(compilationTarget)[0];
  if (!Array.isArray(foundry.abi) || !sourceName) {
    throw new Error(`invalid Foundry artifact ${descriptor.artifact}`);
  }
  const compiled = {
    abi: foundry.abi,
    bytecode: foundry.bytecode?.object ?? null,
    classification: descriptor.classification,
    compiler: foundry.metadata?.compiler ?? null,
    contractName: descriptor.contractName,
    deployedBytecode: foundry.deployedBytecode?.object ?? null,
    methodIdentifiers: foundry.methodIdentifiers ?? {},
    schema: "inshell.thought.compiled-contract.integration-preview.v1",
    sourceName,
  };
  const output = `contract/compiled/${descriptor.contractName}.json`;
  writeJson(path.join(releaseDir, output), compiled);
  contractIndex.push({
    artifact: output,
    classification: descriptor.classification,
    contractName: descriptor.contractName,
    sourceName,
  });
}

const specBytes = read("protocol/current/v2/THOUGHT.v2.md");
const identifiers = releaseInput.identifiers;
const compatibility = {
  creationAttestation: {
    id: identifiers.creationAttestation,
    idKeccak256: id(identifiers.creationAttestation),
  },
  contextProfile: {
    id: identifiers.contextProfile,
    idKeccak256: id(identifiers.contextProfile),
  },
  metadataProfile: {
    attributeOrder: [
      "Agent",
      "Model",
      "Creation Attestation",
      "Prompt Bytes",
      "Agent Bytes",
    ],
    externalUrl: {
      base: "https://inshell.art/thought/",
      identityInput: false,
      location: "top-level",
      tokenIdFormat: "unsigned-base-10-no-leading-zeroes",
    },
    id: identifiers.metadataProfile,
    idKeccak256: id(identifiers.metadataProfile),
    profileSha256: sha256(read("protocol/current/v2/metadata/thought.metadata.v2.profile.json")),
  },
  protocol: {
    id: identifiers.protocolRelease,
    release: releaseInput.release,
    status: releaseInput.status,
  },
  provenance: { id: identifiers.provenance },
  renderer: {
    canonicalId: identifiers.renderer,
    canonicalIdKeccak256: id(identifiers.renderer),
    finalImplementationIncluded: true,
    geometry: releaseInput.rendererGeometry,
    packagedImplementation:
      "inshell.thought.renderer.v2.mono-76-v1-im76-native-paths-frame-32-006100-green-00ff00-prompt-top-agent-bottom",
  },
  selectedSpec: {
    byteLength: specBytes.length,
    name: "THOUGHT.v2.md",
    sha256: sha256(specBytes),
    thoughtSpecHash: keccak256(specBytes),
    thoughtSpecId: id("THOUGHT.v2.md"),
  },
  workProfile: {
    id: identifiers.workProfile,
    idKeccak256: id(identifiers.workProfile),
  },
};

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
  },
  persistentNetworkDeployments: [],
  schema: "inshell.thought.contract-index.integration-preview.v1",
});

const readReleaseJson = (directory, relativePath) =>
  JSON.parse(fs.readFileSync(path.join(directory, relativePath), "utf8"));
const compiledEvidence = (contractName) => {
  const relativePath = `contract/compiled/${contractName}.json`;
  const baseline = readReleaseJson(baselineReleaseDir, relativePath);
  const current = readReleaseJson(releaseDir, relativePath);
  return {
    abiEqual: JSON.stringify(baseline.abi) === JSON.stringify(current.abi),
    baseline: {
      abiSha256: sha256(JSON.stringify(baseline.abi)),
      creationBytecodeSha256: sha256HexBytes(baseline.bytecode),
      runtimeBytecodeSha256: sha256HexBytes(baseline.deployedBytecode),
    },
    contractName,
    creationBytecodeEqual: baseline.bytecode === current.bytecode,
    current: {
      abiSha256: sha256(JSON.stringify(current.abi)),
      creationBytecodeSha256: sha256HexBytes(current.bytecode),
      runtimeBytecodeSha256: sha256HexBytes(current.deployedBytecode),
    },
    runtimeBytecodeEqual: baseline.deployedBytecode === current.deployedBytecode,
  };
};

const unchangedContractArtifacts = [
  "ThoughtNFTV2",
  "CreationAttestationVerifierV2",
  "IThoughtRendererV2",
  "IThoughtSvgRendererV2",
  "ICreationAttestationVerifierV2",
  "ThoughtSpecRegistry",
  "ThoughtSpecRegistryV2",
  "ThoughtSvgRendererV2",
].map(compiledEvidence);
if (
  unchangedContractArtifacts.some(
    ({ abiEqual, creationBytecodeEqual, runtimeBytecodeEqual }) =>
      !abiEqual || !creationBytecodeEqual || !runtimeBytecodeEqual,
  )
) {
  throw new Error("contract declared unchanged from r10 has drifted");
}

const changedRendererArtifacts = ["ThoughtRendererV2", "ThoughtRendererV2Split"]
  .map(compiledEvidence);
if (
  changedRendererArtifacts.some(
    ({ abiEqual, creationBytecodeEqual, runtimeBytecodeEqual }) =>
      !abiEqual || creationBytecodeEqual || runtimeBytecodeEqual,
  )
) {
  throw new Error("portable-traits renderer bytecode/ABI delta is inaccurate");
}

const baselineMetadataProfilePath = path.join(
  baselineReleaseDir,
  "protocol/current/v2/metadata/thought.metadata.v2.profile.json",
);
const currentMetadataProfilePath = path.join(
  releaseDir,
  "protocol/current/v2/metadata/thought.metadata.v2.profile.json",
);
const baselineMetadataProfile = JSON.parse(fs.readFileSync(baselineMetadataProfilePath, "utf8"));
const currentMetadataProfile = JSON.parse(fs.readFileSync(currentMetadataProfilePath, "utf8"));
const expectedTraitOrder = [
  "Agent",
  "Model",
  "Creation Attestation",
  "Prompt Bytes",
  "Agent Bytes",
];
if (JSON.stringify(currentMetadataProfile.attributeOrder) !== JSON.stringify(expectedTraitOrder)) {
  throw new Error("portable marketplace trait profile order drifted");
}
const baselineFixtures = readReleaseJson(
  baselineReleaseDir,
  "fixtures/neutral-agent-model-token-uri-examples.anvil.json",
).examples;
const currentFixtures = readReleaseJson(
  releaseDir,
  "fixtures/neutral-agent-model-token-uri-examples.anvil.json",
).examples;
const fixtureKey = ({ metadata }) =>
  `${metadata.properties.promptLine}\u0000${metadata.properties.agentLine}`;
const currentFixturesByWork = new Map(currentFixtures.map((fixture) => [fixtureKey(fixture), fixture]));
const fixtureComparisons = baselineFixtures.map((baseline) => {
  const current = currentFixturesByWork.get(fixtureKey(baseline));
  if (!current) throw new Error(`r10 fixture work missing from current fixtures: ${fixtureKey(baseline)}`);
  const baselineImageSha256 = sha256(baseline.metadata.image);
  const currentImageSha256 = sha256(current.metadata.image);
  const currentTraitTypes = current.metadata.attributes.map(({ trait_type }) => trait_type);
  const duplicateCount = currentTraitTypes.length - new Set(currentTraitTypes).size;
  const traitByType = new Map(current.metadata.attributes.map((trait) => [trait.trait_type, trait]));
  const promptTrait = traitByType.get("Prompt Bytes");
  const agentTrait = traitByType.get("Agent Bytes");
  if (
    baselineImageSha256 !== currentImageSha256
    || baseline.metadata.external_url !== current.metadata.external_url
    || JSON.stringify(currentTraitTypes) !== JSON.stringify(expectedTraitOrder)
    || duplicateCount !== 0
    || promptTrait?.display_type !== "number"
    || promptTrait?.max_value !== 64
    || promptTrait?.value !== Buffer.byteLength(current.metadata.thought.promptLine, "utf8")
    || agentTrait?.display_type !== "number"
    || agentTrait?.max_value !== 64
    || agentTrait?.value !== Buffer.byteLength(current.metadata.thought.agentLine, "utf8")
    || traitByType.get("Agent")?.value !== current.metadata.thought.records.agent.label
    || traitByType.get("Model")?.value !== current.metadata.thought.records.model.label
    || traitByType.get("Creation Attestation")?.value
      !== current.metadata.thought.creationAttestation.status
  ) {
    throw new Error(`portable trait fixture parity drifted: ${fixtureKey(baseline)}`);
  }
  return {
    agentLine: baseline.metadata.properties.agentLine,
    baselineImageSha256,
    baselineTokenId: baseline.tokenId,
    currentAttributeOrder: currentTraitTypes,
    currentImageSha256,
    currentTokenId: current.tokenId,
    duplicateTraitNames: duplicateCount,
    externalUrlEqual: baseline.metadata.external_url === current.metadata.external_url,
    imageBytesEqual: true,
    promptLine: baseline.metadata.properties.promptLine,
    typedStateParity: true,
  };
});

writeJson(path.join(releaseDir, "validation/r10-to-r11-portable-marketplace-traits.json"), {
  baseline: {
    artifactId: baselineArtifactId,
    manifestSha256: baselineManifestSha256Expected,
    publicationCommit: baselinePublicationCommit,
    metadataProfile: {
      attributeOrder: baselineMetadataProfile.attributeOrder,
      sha256: sha256File(baselineMetadataProfilePath),
    },
    selectedSpec: baselineManifest.compatibility.selectedSpec,
    sourceBaseCommit: baselineManifest.source.baseCommit,
  },
  current: {
    artifactId,
    metadataProfile: {
      attributeOrder: currentMetadataProfile.attributeOrder,
      sha256: sha256File(currentMetadataProfilePath),
    },
    selectedSpec: compatibility.selectedSpec,
  },
  declaredChanges: {
    marketplaceAttributes: true,
    metadataProfileBytesAndHash: true,
    rendererMetadataBytecode: true,
    tokenUriBytes: true,
  },
  declaredUnchanged: {
    canonicalExternalUrl: true,
    creationAttestation: true,
    provenanceBoundary: true,
    publicNftAbiAndBytecode: true,
    rendererIdentity: true,
    selectedSpecBytesAndHash: true,
    svgAndArtworkBytes: true,
  },
  fixtureComparisons,
  removedTraits: ["Pair Bytes", "Prompt Length", "Agent Length"],
  schema: "inshell.thought.r10-to-r11-portable-marketplace-traits.integration-preview.v1",
  changedRendererArtifacts,
  unchangedContractArtifacts,
});

writeJson(path.join(releaseDir, "validation/renderer-parity.json"), {
  exactTokenUriByteParity: true,
  externalUrl: {
    base: "https://inshell.art/thought/",
    testedTokenIds: [
      "1",
      "42",
      "115792089237316195423570985008687907853269984665640564039457584007913129639935",
    ],
  },
  implementations: [
    "ThoughtRendererV2",
    "ThoughtRendererV2Split+ThoughtSvgRendererV2",
  ],
  schema: "inshell.thought.renderer-parity.integration-preview.v1",
  testContract: "ThoughtRendererV2Test",
  testSource: "evm/test/v2/ThoughtRendererV2.t.sol",
  verifiedAt: createdAt,
});

writeJson(path.join(releaseDir, "limitations.json"), {
  candidateOrStable: false,
  canonicalRendererIncluded: true,
  deploymentAuthorized: false,
  limitations: [
    "canonical sealed Inshell Mono 76 v1.0.0 renderer is included but this package remains an integration preview",
    "final release manifest and registry records are absent",
    "no Sepolia or mainnet deployment metadata is included",
    "no production attestation authority or private-key workflow is included",
  ],
  productionConsumable: false,
  registrationAuthorized: false,
  schema: "inshell.thought.integration-preview-limitations.v1",
});

writeJson(path.join(releaseDir, "README.json"), {
  artifactId,
  classification: "noncanonical-integration-preview",
  intendedConsumer: "inshell.art development agent",
  productionConsumable: false,
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
  artifactKind: "thought-v2-contract-integration-preview",
  channel: "experimental",
  classification: "noncanonical-integration-preview",
  compatibility,
  createdAt,
  files,
  flags: {
    candidateOrStable: false,
    deploymentAuthorized: false,
    productionConsumable: false,
    registrationAuthorized: false,
  },
  schema: "inshell.thought.immutable-artifact-manifest.v1",
  source: {
    baseCommit: run("git", ["rev-parse", "HEAD"]),
    branch: run("git", ["branch", "--show-current"]),
    changedPaths: statusLines,
    dirty: statusLines.length > 0,
    remote: run("git", ["remote", "get-url", "origin"]),
    tag: sourceTag,
  },
};
writeJson(path.join(releaseDir, "manifest.json"), manifest);

const checksumPaths = listFiles(releaseDir).filter((file) => file !== "SHA256SUMS.txt");
const checksumText = `${checksumPaths
  .map((file) => `${sha256File(path.join(releaseDir, file))}  ${file}`)
  .join("\n")}\n`;
write(path.join(releaseDir, "SHA256SUMS.txt"), checksumText);

const manifestSha256 = sha256File(path.join(releaseDir, "manifest.json"));
writeJson(pointerPath, {
  artifactId,
  classification: "noncanonical-integration-preview",
  manifestPath: `artifacts/thought-v2-integration-preview/releases/${artifactId}/manifest.json`,
  manifestSha256,
  productionConsumable: false,
  registrationAuthorized: false,
  schema: "inshell.thought.integration-preview-pointer.v1",
  sourceTag,
});

console.log(JSON.stringify({ artifactId, fileCount: files.length, manifestSha256, sourceTag }, null, 2));
