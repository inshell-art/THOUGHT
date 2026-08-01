#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const artifactRoot = path.join(root, "artifacts", "thought-v2-integration-preview");
const pointer = JSON.parse(fs.readFileSync(path.join(artifactRoot, "experimental.json"), "utf8"));
const releaseDir = path.join(artifactRoot, "releases", pointer.artifactId);
const sha256 = (value) => crypto.createHash("sha256").update(value).digest("hex");
const hashFile = (file) => sha256(fs.readFileSync(file));

const fail = (message) => {
  throw new Error(`integration preview verification failed: ${message}`);
};
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

if (
  pointer.classification !== "noncanonical-integration-preview"
  || pointer.productionConsumable !== false
  || pointer.registrationAuthorized !== false
) fail("pointer safety flags changed");
if (!pointer.artifactId.startsWith("thought-v2-noncanonical-integration-preview-")) {
  fail("unexpected artifact ID");
}

const manifestPath = path.join(releaseDir, "manifest.json");
if (hashFile(manifestPath) !== pointer.manifestSha256) fail("manifest SHA-256 mismatch");
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
if (
  manifest.artifactId !== pointer.artifactId
  || manifest.channel !== "experimental"
  || manifest.classification !== "noncanonical-integration-preview"
  || manifest.flags?.candidateOrStable !== false
  || manifest.flags?.deploymentAuthorized !== false
  || manifest.flags?.productionConsumable !== false
  || manifest.flags?.registrationAuthorized !== false
) fail("manifest identity or safety flags changed");
if (manifest.compatibility?.renderer?.finalImplementationIncluded !== true) {
  fail("preview does not include the adopted native-path renderer");
}
if (
  manifest.compatibility?.renderer?.packagedImplementation
    !== "inshell.thought.renderer.v2.mono-76-v1-im76-native-paths-frame-32-006100-green-00ff00-prompt-top-agent-bottom"
  || manifest.compatibility?.renderer?.geometry?.artboard !== "1024x1024"
  || manifest.compatibility?.renderer?.geometry?.canvas !== "960x960@32,32"
  || manifest.compatibility?.renderer?.geometry?.canvasScale !== 1
  || manifest.compatibility?.renderer?.geometry?.fields?.prompt?.bottom !== 384
  || manifest.compatibility?.renderer?.geometry?.fields?.prompt?.verticalAlign !== "top"
  || manifest.compatibility?.renderer?.geometry?.fields?.agent?.bottom !== 832
  || manifest.compatibility?.renderer?.geometry?.fields?.agent?.verticalAlign !== "bottom"
  || manifest.compatibility?.renderer?.geometry?.frameColor !== "#006100"
  || manifest.compatibility?.renderer?.geometry?.frameUnitsPerSide !== 32
  || manifest.compatibility?.renderer?.geometry?.glyphColor !== "#00ff00"
) fail("preview renderer geometry drifted");
if (
  manifest.compatibility?.metadataProfile?.externalUrl?.base
    !== "https://inshell.art/thought/"
  || manifest.compatibility?.metadataProfile?.externalUrl?.location !== "top-level"
  || manifest.compatibility?.metadataProfile?.externalUrl?.identityInput !== false
  || manifest.compatibility?.metadataProfile?.externalUrl?.tokenIdFormat
    !== "unsigned-base-10-no-leading-zeroes"
) fail("preview canonical external URL boundary drifted");

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

const limitations = JSON.parse(fs.readFileSync(path.join(releaseDir, "limitations.json"), "utf8"));
if (
  limitations.candidateOrStable !== false
  || limitations.canonicalRendererIncluded !== true
  || limitations.deploymentAuthorized !== false
  || limitations.productionConsumable !== false
  || limitations.registrationAuthorized !== false
) fail("limitations no longer fail closed");

const contractIndex = JSON.parse(fs.readFileSync(path.join(releaseDir, "contract/index.json"), "utf8"));
if ((contractIndex.persistentNetworkDeployments ?? []).length !== 0) fail("persistent deployment included");
if (
  contractIndex.externalDependencies?.pathNft?.requiredMethod
    !== "consumeUnit(uint256,bytes32,address,uint256,bytes)"
  || contractIndex.externalDependencies?.pathNft?.requiredReturnType !== "uint32"
) fail("canonical PATH consumeUnit dependency drifted");
for (const contract of contractIndex.contracts ?? []) {
  const compiled = JSON.parse(fs.readFileSync(path.join(releaseDir, contract.artifact), "utf8"));
  if (!Array.isArray(compiled.abi) || compiled.contractName !== contract.contractName) {
    fail(`invalid compiled artifact ${contract.contractName}`);
  }
}
for (const requiredContract of [
  "ThoughtRendererV2",
  "ThoughtRendererV2Split",
  "ThoughtSvgRendererV2",
]) {
  if (!(contractIndex.contracts ?? []).some(({ contractName }) => contractName === requiredContract)) {
    fail(`renderer architecture artifact missing: ${requiredContract}`);
  }
}
const thought = JSON.parse(
  fs.readFileSync(path.join(releaseDir, "contract/compiled/ThoughtNFTV2.json"), "utf8"),
);
if (!thought.abi.some((item) => item.type === "function" && item.name === "mint")) {
  fail("ThoughtNFTV2 mint ABI missing");
}
const functionNames = new Set(
  thought.abi.filter((item) => item.type === "function").map(({ name }) => name),
);
for (const name of ["agentOf", "modelOf", "agentHashOf", "modelHashOf"]) {
  if (!functionNames.has(name)) fail(`ThoughtNFTV2 neutral getter missing: ${name}`);
}
for (const name of [
  "declaredAgentOf",
  "declaredModelOf",
  "declaredAgentHashOf",
  "declaredModelHashOf",
]) {
  if (functionNames.has(name)) fail(`ThoughtNFTV2 legacy getter leaked: ${name}`);
}
const mint = thought.abi.find((item) => item.type === "function" && item.name === "mint");
const mintComponents = mint?.inputs?.[0]?.components?.map(({ name }) => name) ?? [];
if (!mintComponents.includes("agent") || !mintComponents.includes("model")) {
  fail("ThoughtNFTV2 mint input is missing neutral Agent/Model records");
}
if (mintComponents.includes("declaredAgent") || mintComponents.includes("declaredModel")) {
  fail("ThoughtNFTV2 legacy mint record names leaked");
}

const metadataProfile = JSON.parse(
  fs.readFileSync(
    path.join(releaseDir, "protocol/current/v2/metadata/thought.metadata.v2.profile.json"),
    "utf8",
  ),
);
if (
  JSON.stringify(metadataProfile.marketplaceRequired)
    !== JSON.stringify(["name", "description", "image", "external_url", "background_color", "attributes"])
) fail("metadata profile does not require canonical top-level external_url");

const renderer = JSON.parse(
  fs.readFileSync(path.join(releaseDir, "contract/compiled/ThoughtRendererV2.json"), "utf8"),
);
if (!renderer.abi.some((item) => item.type === "function" && item.name === "EXTERNAL_URL_BASE")) {
  fail("ThoughtRendererV2 external URL base getter missing");
}

const parity = JSON.parse(
  fs.readFileSync(path.join(releaseDir, "validation/renderer-parity.json"), "utf8"),
);
if (
  parity.exactTokenUriByteParity !== true
  || parity.externalUrl?.base !== "https://inshell.art/thought/"
  || JSON.stringify(parity.externalUrl?.testedTokenIds)
    !== JSON.stringify([
      "1",
      "42",
      "115792089237316195423570985008687907853269984665640564039457584007913129639935",
    ])
) fail("renderer external URL parity evidence drifted");

const verifier = JSON.parse(
  fs.readFileSync(path.join(releaseDir, "contract/compiled/CreationAttestationVerifierV2.json"), "utf8"),
);
const hashClaim = verifier.abi.find((item) => item.type === "function" && item.name === "hashClaim");
const claimComponents = hashClaim?.inputs?.[0]?.components?.map(({ name }) => name) ?? [];
if (!claimComponents.includes("agentHash") || !claimComponents.includes("modelHash")) {
  fail("Creation Attestation V2 claim is missing neutral record hashes");
}
if (claimComponents.includes("declaredAgentHash") || claimComponents.includes("declaredModelHash")) {
  fail("Creation Attestation V2 legacy record hashes leaked");
}

const examples = JSON.parse(
  fs.readFileSync(
    path.join(releaseDir, "fixtures/neutral-agent-model-token-uri-examples.anvil.json"),
    "utf8",
  ),
);
if (examples.schema !== "inshell.thought.v2.neutral-agent-model-token-uri-examples.anvil.v1") {
  fail("neutral Agent/Model tokenURI fixture schema drifted");
}
const fixtureStatuses = new Set(examples.examples?.map(({ creationAttestation }) => creationAttestation));
if (!fixtureStatuses.has("Inshell THOUGHT App") || !fixtureStatuses.has("Unattested")) {
  fail("tokenURI fixtures do not cover both attestation paths");
}
const fixtureTokenIds = new Set(examples.examples?.map(({ tokenId }) => tokenId));
if (!fixtureTokenIds.has(1) || !fixtureTokenIds.has(42)) {
  fail("tokenURI fixtures do not cover external URL tokens 1 and 42");
}
for (const example of examples.examples ?? []) {
  if (!example.tokenUri?.startsWith("data:application/json;base64,")) {
    fail(`invalid tokenURI fixture for THOUGHT #${example.tokenId}`);
  }
  const metadata = example.metadata;
  const decodedMetadata = JSON.parse(
    Buffer.from(example.tokenUri.slice("data:application/json;base64,".length), "base64")
      .toString("utf8"),
  );
  if (JSON.stringify(decodedMetadata) !== JSON.stringify(metadata)) {
    fail(`tokenURI/decoded metadata fixture mismatch for THOUGHT #${example.tokenId}`);
  }
  if (
    metadata.external_url !== `https://inshell.art/thought/${example.tokenId}`
    || (JSON.stringify(metadata).match(/"external_url":/g) ?? []).length !== 1
  ) fail(`canonical external URL fixture drifted for THOUGHT #${example.tokenId}`);
  if (
    metadata.description
      !== "THOUGHT V2 preserves a narrow terminal channel between human intention and Agent response, transforming their dialogue into an on-chain artwork."
  ) fail(`description fixture drifted for THOUGHT #${example.tokenId}`);
  const traitTypes = metadata?.attributes?.map(({ trait_type }) => trait_type) ?? [];
  if (
    !traitTypes.includes("Agent")
    || !traitTypes.includes("Model")
    || !traitTypes.includes("Creation Attestation")
    || traitTypes.includes("Attested Agent")
    || traitTypes.includes("Attested Model")
  ) fail(`neutral trait fixture drifted for THOUGHT #${example.tokenId}`);
  const contractMetadata = structuredClone(metadata);
  if (contractMetadata?.thought) delete contractMetadata.thought.provenanceJson;
  const serialized = JSON.stringify(contractMetadata);
  for (const forbidden of ["declaredAgent", "declaredModel", "declared-unverified"]) {
    if (serialized.includes(forbidden)) {
      fail(`forbidden metadata term ${forbidden} in THOUGHT #${example.tokenId}`);
    }
  }
}

console.log(JSON.stringify({
  artifactId: pointer.artifactId,
  fileCount: manifest.files.length,
  manifestSha256: pointer.manifestSha256,
  verified: true,
}, null, 2));
