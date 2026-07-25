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
    !== "inshell.thought.renderer.v2.humanist-smooth-native-paths-frame-32-006100-green-00ff00-prompt-top-agent-bottom"
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
for (const contract of contractIndex.contracts ?? []) {
  const compiled = JSON.parse(fs.readFileSync(path.join(releaseDir, contract.artifact), "utf8"));
  if (!Array.isArray(compiled.abi) || compiled.contractName !== contract.contractName) {
    fail(`invalid compiled artifact ${contract.contractName}`);
  }
}
const thought = JSON.parse(
  fs.readFileSync(path.join(releaseDir, "contract/compiled/ThoughtNFTV2.json"), "utf8"),
);
if (!thought.abi.some((item) => item.type === "function" && item.name === "mint")) {
  fail("ThoughtNFTV2 mint ABI missing");
}

console.log(JSON.stringify({
  artifactId: pointer.artifactId,
  fileCount: manifest.files.length,
  manifestSha256: pointer.manifestSha256,
  verified: true,
}, null, 2));
