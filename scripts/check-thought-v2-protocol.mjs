import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { AbiCoder, id, keccak256 } from "ethers";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const releaseRoot = path.join(root, "protocol", "releases", "v2");
const manifestPath = path.join(releaseRoot, "release.manifest.draft.json");
const reportPath = path.join(releaseRoot, "release.report.draft.json");
const bundlePath = path.join(root, "src", "generated", "thought-v2-release-bundle.json");
const generatedPaths = [
  manifestPath,
  reportPath,
  bundlePath,
  path.join(releaseRoot, "provenance", "examples", "manual.json"),
  path.join(releaseRoot, "contract", "vectors", "hash-vectors.json"),
  ...fs.readdirSync(path.join(releaseRoot, "conformance")).sort()
    .map((name) => path.join(releaseRoot, "conformance", name)),
  ...fs.readdirSync(path.join(releaseRoot, "renderer", "fixtures")).sort()
    .filter((name) => name.endsWith(".json"))
    .map((name) => path.join(releaseRoot, "renderer", "fixtures", name)),
];

const before = new Map(generatedPaths.map((file) => [file, fs.readFileSync(file)]));
execFileSync(process.execPath, [path.join(root, "scripts", "build-thought-v2-protocol.mjs")], {
  cwd: root,
  stdio: "ignore",
});
for (const file of generatedPaths) {
  const previous = before.get(file);
  if (!previous?.equals(fs.readFileSync(file))) {
    throw new Error(`protocol generation is not deterministic or ${path.relative(root, file)} was stale`);
  }
}

const assertTextFilePolicy = (file, data) => {
  if (data.length === 0) throw new Error(`${file}: empty`);
  if (data[0] === 0xef && data[1] === 0xbb && data[2] === 0xbf) throw new Error(`${file}: BOM`);
  if (data.includes(0x0d)) throw new Error(`${file}: CR/CRLF found`);
  if (data[data.length - 1] !== 0x0a || data[data.length - 2] === 0x0a) {
    throw new Error(`${file}: expected exactly one final LF`);
  }
};

const manifestBytes = fs.readFileSync(manifestPath);
assertTextFilePolicy("release.manifest.draft.json", manifestBytes);
const manifest = JSON.parse(manifestBytes.toString("utf8"));
if (Object.hasOwn(manifest, "manifestHash") || Object.hasOwn(manifest, "protocolReleaseId")) {
  throw new Error("manifest contains a circular identity field");
}
const releaseInput = JSON.parse(fs.readFileSync(path.join(releaseRoot, "release-input.json"), "utf8"));
if (manifest.createdAt !== releaseInput.createdAt || releaseInput.status !== "draft") {
  throw new Error("manifest did not use the frozen draft release input");
}

const roles = new Set();
const paths = new Set();
for (const artifact of manifest.artifacts) {
  if (!artifact.role || roles.has(artifact.role)) throw new Error(`duplicate artifact role: ${artifact.role}`);
  if (
    path.isAbsolute(artifact.path) || artifact.path.includes("\\") ||
    artifact.path.split("/").some((part) => !part || part === "." || part === "..") || paths.has(artifact.path)
  ) throw new Error(`invalid artifact path: ${artifact.path}`);
  roles.add(artifact.role);
  paths.add(artifact.path);
  const data = fs.readFileSync(path.join(releaseRoot, artifact.path));
  assertTextFilePolicy(artifact.path, data);
  if (data.length !== artifact.byteLength) throw new Error(`${artifact.path}: byte length mismatch`);
  if (keccak256(data) !== artifact.keccak256) throw new Error(`${artifact.path}: Keccak-256 mismatch`);
}

const manifestHash = keccak256(manifestBytes);
const releaseId = keccak256(AbiCoder.defaultAbiCoder().encode(
  ["bytes32", "bytes32"],
  [id("INSHELL_THOUGHT_PROTOCOL_RELEASE"), manifestHash],
));
const report = JSON.parse(fs.readFileSync(reportPath, "utf8"));
if (report.status !== "draft" || report.registrationAuthorized !== false) {
  throw new Error("draft report claims registration authorization");
}
if (report.manifestHash !== manifestHash || report.protocolReleaseId !== releaseId) {
  throw new Error("draft report identity mismatch");
}

const bundle = JSON.parse(fs.readFileSync(bundlePath, "utf8"));
if (bundle.status !== "draft") throw new Error("embedded bundle status mismatch");
if (!Buffer.from(bundle.manifestBytesBase64, "base64").equals(manifestBytes)) {
  throw new Error("embedded manifest bytes mismatch");
}
if (bundle.expectedManifestHash !== manifestHash || bundle.expectedProtocolReleaseId !== releaseId) {
  throw new Error("embedded bundle identity mismatch");
}
if (bundle.artifacts.length !== manifest.artifacts.length) throw new Error("embedded artifact count mismatch");
const bundleByPath = new Map(bundle.artifacts.map((artifact) => [artifact.path, artifact]));
for (const artifact of manifest.artifacts) {
  const embedded = bundleByPath.get(artifact.path);
  if (!embedded) throw new Error(`embedded artifact missing: ${artifact.path}`);
  const source = fs.readFileSync(path.join(releaseRoot, artifact.path));
  if (!Buffer.from(embedded.bytesBase64, "base64").equals(source)) {
    throw new Error(`embedded artifact bytes mismatch: ${artifact.path}`);
  }
}

const first = fs.readFileSync(path.join(releaseRoot, manifest.artifacts[0].path));
const crlf = Buffer.from(first.toString("utf8").replaceAll("\n", "\r\n"));
if (keccak256(crlf) === keccak256(first)) throw new Error("LF to CRLF mutation did not change hash");
const bom = Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), first]);
if (keccak256(bom) === keccak256(first)) throw new Error("BOM mutation did not change hash");
const changedManifest = Buffer.from(manifestBytes);
changedManifest[changedManifest.length - 2] ^= 1;
const changedManifestHash = keccak256(changedManifest);
const changedReleaseId = keccak256(AbiCoder.defaultAbiCoder().encode(
  ["bytes32", "bytes32"],
  [id("INSHELL_THOUGHT_PROTOCOL_RELEASE"), changedManifestHash],
));
if (changedManifestHash === manifestHash || changedReleaseId === releaseId) {
  throw new Error("manifest mutation did not change release identity");
}

console.log(JSON.stringify({
  artifacts: manifest.artifacts.length,
  manifestHash,
  protocolReleaseId: releaseId,
  registrationAuthorized: false,
  verifiedOfflineBundle: true,
}, null, 2));
