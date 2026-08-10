#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const artifactRoot = path.join(root, "artifacts", "thought-v2-contract-release");
const artifactId = "thought-v2-canonical-portable-release-20260807-r2";
const releaseDir = path.join(artifactRoot, "releases", artifactId);
const baselineArtifactId = "thought-v2-canonical-portable-release-20260801-r1";
const baselineManifestSha256Expected =
  "4d60feba36165c19a3cf3680078cc6baa7ba066c147ca607e5c82d0306f65b1a";
const baselinePublicationCommit = "9617892bda9d7f7e880b614f84f1b6360ad8a652";
const baselineReleaseDir = path.join(
  root,
  "artifacts",
  "thought-v2-contract-release",
  "releases",
  baselineArtifactId,
);
const requirePublished = process.argv.includes("--require-published");

const fail = (message) => {
  throw new Error(`canonical V2 release verification failed: ${message}`);
};
const sha256 = (value) => crypto.createHash("sha256").update(value).digest("hex");
const hashFile = (file) => sha256(fs.readFileSync(file));
const hashHexBytes = (value) => sha256(Buffer.from(value.slice(2), "hex"));
const byteLengthOfHex = (value) => (value.length - 2) / 2;
const readJson = (directory, relativePath) =>
  JSON.parse(fs.readFileSync(path.join(directory, relativePath), "utf8"));
const safePath = (value) =>
  typeof value === "string"
  && value.length > 0
  && !path.posix.isAbsolute(value)
  && !value.split("/").some((segment) => segment.length === 0 || segment === "." || segment === "..");
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

if (!fs.existsSync(releaseDir)) fail(`missing release directory ${artifactId}`);
const manifestPath = path.join(releaseDir, "manifest.json");
const manifestSha256 = hashFile(manifestPath);
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
if (
  manifest.artifactId !== artifactId
  || manifest.artifactKind !== "thought-v2-canonical-portable-contract-release"
  || manifest.channel !== "stable"
  || manifest.classification !== "canonical-portable-contract-release"
  || manifest.flags?.candidateOrStable !== true
  || manifest.flags?.deploymentAuthorized !== false
  || manifest.flags?.productionConsumable !== true
  || manifest.flags?.registrationApplicable !== false
  || manifest.flags?.registrationAuthorized !== false
) fail("manifest identity, channel, classification, or policy flags drifted");
if (
  manifest.source?.dirty !== false
  || (manifest.source?.changedPaths ?? []).length !== 0
  || manifest.source?.tag !== artifactId
  || !/^[0-9a-f]{40}$/.test(manifest.source?.baseCommit ?? "")
) fail("manifest does not identify a clean source commit and expected annotated tag");
try {
  execFileSync("git", ["cat-file", "-e", `${manifest.source.baseCommit}^{commit}`], {
    cwd: root,
    stdio: "ignore",
  });
} catch {
  fail("clean source-base commit is unavailable");
}
if (
  manifest.publicationBinding?.annotatedTag !== artifactId
  || manifest.publicationBinding?.externalReceipt
    !== "artifacts/thought-v2-contract-release/stable.json"
  || manifest.publicationBinding?.selfReferenceExcluded !== true
) fail("publication binding policy drifted");

const declared = new Set();
for (const file of manifest.files ?? []) {
  if (!safePath(file.path) || declared.has(file.path)) fail(`unsafe or duplicate path ${file.path}`);
  declared.add(file.path);
  const absolute = path.join(releaseDir, ...file.path.split("/"));
  if (!fs.existsSync(absolute) || !fs.statSync(absolute).isFile()) fail(`missing ${file.path}`);
  if (fs.statSync(absolute).size !== file.byteLength) fail(`byte length mismatch ${file.path}`);
  if (hashFile(absolute) !== file.sha256) fail(`SHA-256 mismatch ${file.path}`);
}
const actualPayload = listFiles(releaseDir).filter(
  (file) => file !== "manifest.json" && file !== "SHA256SUMS.txt",
);
if (actualPayload.length !== declared.size || actualPayload.some((file) => !declared.has(file))) {
  fail("manifest/file-list disagreement");
}

const checksumLines = fs.readFileSync(path.join(releaseDir, "SHA256SUMS.txt"), "utf8")
  .trimEnd()
  .split("\n");
const checksums = new Map();
for (const line of checksumLines) {
  const match = /^([0-9a-f]{64})  (.+)$/.exec(line);
  if (!match || !safePath(match[2]) || checksums.has(match[2])) fail(`bad checksum line ${line}`);
  checksums.set(match[2], match[1]);
}
const expectedChecksums = listFiles(releaseDir).filter((file) => file !== "SHA256SUMS.txt");
if (checksums.size !== expectedChecksums.length) fail("checksum file count mismatch");
for (const file of expectedChecksums) {
  if (checksums.get(file) !== hashFile(path.join(releaseDir, file))) fail(`checksum mismatch ${file}`);
}

const limitations = readJson(releaseDir, "limitations.json");
if (
  limitations.productionConsumable !== true
  || limitations.deploymentAuthorized !== false
  || limitations.registrationApplicable !== false
  || limitations.registrationAuthorized !== false
) fail("release limitations/policy drifted");

const expectedTraits = [
  "Agent",
  "Model",
  "Creation Attestation",
  "Prompt Bytes",
  "Agent Bytes",
];
const metadataProfilePath = path.join(
  releaseDir,
  "protocol/current/v2/metadata/thought.metadata.v2.profile.json",
);
const metadataProfile = JSON.parse(fs.readFileSync(metadataProfilePath, "utf8"));
if (
  JSON.stringify(metadataProfile.attributeOrder) !== JSON.stringify(expectedTraits)
  || JSON.stringify(manifest.compatibility?.metadataProfile?.attributeOrder)
    !== JSON.stringify(expectedTraits)
  || manifest.compatibility?.metadataProfile?.profileSha256 !== hashFile(metadataProfilePath)
  || manifest.compatibility?.metadataProfile?.externalUrl?.base
    !== "https://inshell.art/thought/"
) fail("canonical metadata profile or external URL drifted");

const releaseInput = readJson(releaseDir, "protocol/current/v2/release-input.json");
if (
  releaseInput.status !== "canonical-portable-release"
  || releaseInput.productionConsumable !== true
  || releaseInput.registrationApplicable !== false
  || releaseInput.registrationAuthorized !== false
  || JSON.stringify(releaseInput.records?.metadataTraits) !== JSON.stringify(expectedTraits)
  || Object.values(releaseInput.deploymentAuthorization ?? {}).some((value) => value !== false)
) fail("packaged release-input policy drifted");

const pathDependency = readJson(
  releaseDir,
  "protocol/current/v2/integration/path-nft.v0.5.0.json",
);
if (
  pathDependency.schema !== "inshell.thought.path-dependency-lock.v1"
  || pathDependency.ownerRepository !== "PATH"
  || pathDependency.releaseTag !== "v0.5.0"
  || pathDependency.releasePublicationCommit !== "085cfc084b0e568740e0da639e968eb535f7e5c8"
  || pathDependency.contractSourceCommit !== "5a1ab1f137e76c80dc69045dc520454f6e07cbb1"
  || pathDependency.manifestSha256
    !== "a81355b459b40faea894cf1dfb7f484765a7ec62672039dd62d58a3a52849921"
  || pathDependency.pathNft?.abiSha256
    !== "c66d840e88064753923668e6107ab9de8ce62130fa798de6f159540a14e899fe"
  || pathDependency.pathNft?.redeploymentRequired !== true
  || pathDependency.consumeAuthorization?.schema !== "permission-epoch-v1"
  || pathDependency.consumeAuthorization?.requiredReturnType !== "uint32"
  || pathDependency.deployment?.addressesIncluded !== false
) fail("PATH v0.5.0 dependency lock drifted");

const appBoundary = readJson(
  releaseDir,
  "protocol/current/v2/integration/thought.app-contract-boundary.v1.json",
);
if (
  appBoundary.currentExecutableBoundary?.pathDependency?.lock !== "path-nft.v0.5.0.json"
  || appBoundary.currentExecutableBoundary?.pathDependency?.releaseTag !== "v0.5.0"
  || appBoundary.currentExecutableBoundary?.pathDependency?.consumeAuthorizationSchema
    !== "permission-epoch-v1"
  || appBoundary.currentExecutableBoundary?.pathDependency?.pathNftRedeploymentRequired !== true
  || appBoundary.productionAuthorization !== false
) fail("App/Contract boundary PATH dependency drifted");

const baselineManifestPath = path.join(baselineReleaseDir, "manifest.json");
if (hashFile(baselineManifestPath) !== baselineManifestSha256Expected) {
  fail("accepted canonical r1 manifest drifted");
}
const baselineManifest = JSON.parse(fs.readFileSync(baselineManifestPath, "utf8"));
if (baselineManifest.artifactId !== baselineArtifactId) {
  fail("accepted canonical r1 identity drifted");
}

const migration = readJson(releaseDir, "validation/r1-to-r2-path-v0.5.json");
if (
  migration.schema !== "inshell.thought.r1-to-r2-path-v0.5.canonical-portable-release.v1"
  || migration.baseline?.artifactId !== baselineArtifactId
  || migration.baseline?.manifestSha256 !== baselineManifestSha256Expected
  || migration.baseline?.publicationCommit !== baselinePublicationCommit
  || migration.current?.artifactId !== artifactId
  || migration.current?.sourceBaseCommit !== manifest.source.baseCommit
) fail("r1-to-r2 migration identity drifted");
for (const key of [
  "allCompiledAbisAndBytecode",
  "canonicalExternalUrl",
  "creationAttestation",
  "decodedTokenUriFixtures",
  "metadataProfileBytes",
  "provenanceBoundary",
  "selectedSpecBytesAndIdentity",
  "svgAndArtworkBytes",
]) if (migration.declaredUnchanged?.[key] !== true) fail(`missing unchanged declaration ${key}`);

const evidenceByContract = new Map(
  (migration.compiledArtifacts ?? []).map((entry) => [entry.contractName, entry]),
);
const contractIndex = readJson(releaseDir, "contract/index.json");
if ((contractIndex.persistentNetworkDeployments ?? []).length !== 0) {
  fail("persistent deployment addresses were bundled");
}
if (
  contractIndex.externalDependencies?.pathNft?.requiredReturnType !== "uint32"
  || contractIndex.externalDependencies?.thoughtSpecRegistry?.requiredByThoughtNFTV2 !== true
  || contractIndex.externalDependencies?.thoughtSpecRegistry?.dependencyChangedByReleaseClassification
    !== false
) fail("Contract dependency boundary drifted");

for (const contract of contractIndex.contracts ?? []) {
  const current = readJson(releaseDir, contract.artifact);
  const baseline = readJson(baselineReleaseDir, contract.artifact);
  const evidence = evidenceByContract.get(contract.contractName);
  if (
    JSON.stringify(current) !== JSON.stringify(baseline)
    || evidence?.abiEqual !== true
    || evidence?.creationBytecodeEqual !== true
    || evidence?.runtimeBytecodeEqual !== true
    || evidence?.hashes?.abiSha256 !== sha256(JSON.stringify(current.abi))
    || evidence?.hashes?.creationBytecodeSha256 !== hashHexBytes(current.bytecode)
    || evidence?.hashes?.runtimeBytecodeSha256 !== hashHexBytes(current.deployedBytecode)
  ) fail(`compiled r1 parity drifted: ${contract.contractName}`);
}

for (const evidence of migration.exactFileEvidence ?? []) {
  const current = path.join(releaseDir, evidence.path);
  const baseline = path.join(baselineReleaseDir, evidence.path);
  if (
    evidence.exact !== true
    || evidence.baselineSha256 !== hashFile(baseline)
    || evidence.currentSha256 !== hashFile(current)
    || evidence.baselineSha256 !== evidence.currentSha256
  ) fail(`exact r1 file parity drifted: ${evidence.path}`);
}

const selectedSpec = manifest.compatibility?.selectedSpec;
const specPath = path.join(releaseDir, "protocol/current/v2/THOUGHT.v2.md");
if (
  selectedSpec?.byteLength !== 4627
  || selectedSpec?.sha256 !== "90df786a3ffb5ec38bffd09ff356ec560d0b7dddcdf57170891149a92a399e9b"
  || selectedSpec?.thoughtSpecId
    !== "0x0a33583e39050834eb77372ea8b41ceded8fe4bb47c31fe1a72ebb880351b410"
  || selectedSpec?.thoughtSpecHash
    !== "0xb2b0a167678816a7ae9dc9098b0d6a6852c0dc95feb59f9581de75bd2cc2231f"
  || fs.statSync(specPath).size !== selectedSpec.byteLength
  || hashFile(specPath) !== selectedSpec.sha256
) fail("selected creative spec bytes or identity drifted");

const requiredDescription =
  "THOUGHT V2 preserves a narrow terminal channel between human intention and Agent response, transforming their dialogue into an on-chain artwork.";
const fixtures = readJson(releaseDir, "fixtures/neutral-agent-model-token-uri-examples.anvil.json");
const statuses = new Set(fixtures.examples?.map(({ creationAttestation }) => creationAttestation));
if (!statuses.has("Inshell THOUGHT App") || !statuses.has("Unattested")) {
  fail("fixtures do not cover both Creation Attestation paths");
}
for (const example of fixtures.examples ?? []) {
  if (!example.tokenUri?.startsWith("data:application/json;base64,")) {
    fail(`invalid tokenURI fixture for THOUGHT #${example.tokenId}`);
  }
  const decoded = JSON.parse(
    Buffer.from(example.tokenUri.slice("data:application/json;base64,".length), "base64")
      .toString("utf8"),
  );
  if (JSON.stringify(decoded) !== JSON.stringify(example.metadata)) {
    fail(`tokenURI decode parity drifted for THOUGHT #${example.tokenId}`);
  }
  const metadata = example.metadata;
  if (
    metadata.description !== requiredDescription
    || metadata.external_url !== `https://inshell.art/thought/${example.tokenId}`
    || (JSON.stringify(metadata).match(/"external_url":/g) ?? []).length !== 1
  ) fail(`description or external URL drifted for THOUGHT #${example.tokenId}`);
  const traitTypes = metadata.attributes?.map(({ trait_type }) => trait_type) ?? [];
  if (
    JSON.stringify(traitTypes) !== JSON.stringify(expectedTraits)
    || new Set(traitTypes).size !== traitTypes.length
  ) fail(`trait order/count drifted for THOUGHT #${example.tokenId}`);
  for (const forbidden of [
    "Pair Bytes",
    "Prompt Length",
    "Agent Length",
    "Attested Agent",
    "Attested Model",
  ]) if (traitTypes.includes(forbidden)) fail(`forbidden trait leaked: ${forbidden}`);
  const traitMap = new Map(metadata.attributes.map((trait) => [trait.trait_type, trait]));
  for (const [traitType, source] of [
    ["Prompt Bytes", metadata.thought.promptLine],
    ["Agent Bytes", metadata.thought.agentLine],
  ]) {
    const trait = traitMap.get(traitType);
    if (
      trait?.display_type !== "number"
      || trait?.max_value !== 64
      || trait?.value !== Buffer.byteLength(source, "utf8")
    ) fail(`${traitType} shape drifted for THOUGHT #${example.tokenId}`);
  }
  if (
    traitMap.get("Agent")?.value !== metadata.thought.records.agent.label
    || traitMap.get("Model")?.value !== metadata.thought.records.model.label
    || traitMap.get("Creation Attestation")?.value
      !== metadata.thought.creationAttestation.status
  ) fail(`typed-state trait parity drifted for THOUGHT #${example.tokenId}`);
}

const runtime = readJson(releaseDir, "validation/runtime-size-and-target-chains.json");
if (
  runtime.eip170RuntimeLimit !== 24_576
  || runtime.eip3860InitcodeLimit !== 49_152
  || runtime.persistentDeploymentAddressesBundled !== false
) fail("runtime-size policy drifted");
const runtimeByContract = new Map(runtime.contracts?.map((entry) => [entry.contractName, entry]));
for (const contract of contractIndex.contracts ?? []) {
  const compiled = readJson(releaseDir, contract.artifact);
  const creationBytes = byteLengthOfHex(compiled.bytecode);
  const runtimeBytes = byteLengthOfHex(compiled.deployedBytecode);
  if (creationBytes === 0 && runtimeBytes === 0) continue;
  const evidence = runtimeByContract.get(contract.contractName);
  if (
    evidence?.creationBytes !== creationBytes
    || evidence?.runtimeBytes !== runtimeBytes
    || evidence?.eip170RuntimePass !== true
    || evidence?.eip3860InitcodePass !== true
    || runtimeBytes > 24_576
    || creationBytes > 49_152
  ) fail(`runtime-size evidence drifted: ${contract.contractName}`);
}

const expectedTargets = new Map([
  [31_337, "Disposable Anvil"],
  [11_155_111, "Sepolia"],
  [1, "Ethereum mainnet"],
]);
for (const target of manifest.deploymentPolicy?.targetChains ?? []) {
  if (
    expectedTargets.get(target.chainId) !== target.name
    || target.deploymentAuthorized !== false
    || target.runtimeSizeCompatible !== true
  ) fail(`target-chain policy drifted: ${target.chainId}`);
  expectedTargets.delete(target.chainId);
}
if (expectedTargets.size > 0 || manifest.deploymentPolicy?.authorizedNow !== false) {
  fail("target-chain list or deployment authorization drifted");
}

const tests = readJson(releaseDir, "validation/producer-tests.json");
if (
  tests.typescriptTestsPassed !== 184
  || tests.evmTestsPassed !== 198
  || tests.focusedRendererEvmTestsPassed !== 17
) fail("producer test evidence drifted");

const stablePointerPath = path.join(artifactRoot, "stable.json");
if (fs.existsSync(stablePointerPath)) {
  const pointer = JSON.parse(fs.readFileSync(stablePointerPath, "utf8"));
  if (pointer.artifactId === artifactId && (
    pointer.manifestSha256 !== manifestSha256
    || pointer.productionConsumable !== true
    || pointer.deploymentAuthorized !== false
    || pointer.registrationApplicable !== false
    || pointer.sourceTag !== artifactId
    || !/^[0-9a-f]{40}$/.test(pointer.publicationCommit ?? "")
    || pointer.tagTarget !== pointer.publicationCommit
  )) fail("stable publication receipt drifted");
  if (requirePublished && pointer.artifactId !== artifactId) {
    fail("stable publication receipt does not publish this artifact");
  }
} else if (requirePublished) {
  fail("stable publication receipt is missing");
}

console.log(JSON.stringify({
  artifactId,
  fileCount: manifest.files.length,
  manifestSha256,
  productionConsumable: true,
  deploymentAuthorized: false,
  registrationApplicable: false,
  verified: true,
}, null, 2));
