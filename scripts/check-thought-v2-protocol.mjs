import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { keccak256 } from "ethers";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const protocolRoot = path.join(root, "protocol");
const releaseRoot = path.join(protocolRoot, "releases", "v2");
const manifestPath = path.join(releaseRoot, "release-manifest.json");
const currentPath = path.join(protocolRoot, "CURRENT.json");
const beforeManifest = fs.readFileSync(manifestPath);
const beforeCurrent = fs.readFileSync(currentPath);

execFileSync(process.execPath, [path.join(root, "scripts", "build-thought-v2-protocol.mjs")], {
  cwd: root,
  stdio: "ignore",
});

const afterManifest = fs.readFileSync(manifestPath);
const afterCurrent = fs.readFileSync(currentPath);
if (!beforeManifest.equals(afterManifest) || !beforeCurrent.equals(afterCurrent)) {
  throw new Error("protocol generator is not deterministic or generated artifacts were stale");
}

const manifest = JSON.parse(afterManifest.toString("utf8"));
for (const artifact of manifest.artifacts) {
  const file = path.join(releaseRoot, artifact.path);
  const data = fs.readFileSync(file);
  if (data.length !== artifact.byteLength) throw new Error(`${artifact.path}: byte length mismatch`);
  if (keccak256(data) !== artifact.keccak256) throw new Error(`${artifact.path}: Keccak-256 mismatch`);
  if (crypto.createHash("sha256").update(data).digest("hex") !== artifact.sha256) {
    throw new Error(`${artifact.path}: SHA-256 mismatch`);
  }
  if (data[0] === 0xef && data[1] === 0xbb && data[2] === 0xbf) throw new Error(`${artifact.path}: BOM`);
  if (data.includes(Buffer.from("\r"))) throw new Error(`${artifact.path}: CRLF/CR found`);
  if (data[data.length - 1] !== 0x0a) throw new Error(`${artifact.path}: final LF missing`);
}

const current = JSON.parse(afterCurrent.toString("utf8"));
if (current.keccak256 !== keccak256(afterManifest)) throw new Error("CURRENT manifest Keccak-256 mismatch");
if (current.byteLength !== afterManifest.length) throw new Error("CURRENT manifest byte length mismatch");
if (current.sha256 !== crypto.createHash("sha256").update(afterManifest).digest("hex")) {
  throw new Error("CURRENT manifest SHA-256 mismatch");
}
console.log(`verified ${manifest.artifacts.length} normative artifacts (${current.keccak256})`);
