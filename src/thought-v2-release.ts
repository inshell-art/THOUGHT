import { keccak256 } from "ethers";

import embeddedBundleJson from "./generated/thought-v2-release-bundle.json";
import { deriveProtocolReleaseId } from "./thought-v2-protocol";

export type ProtocolArtifact = {
  role: string;
  path: string;
  mediaType: string;
  byteLength: number;
  keccak256: `0x${string}`;
};

export type ThoughtProtocolManifest = {
  manifestFormat: string;
  manifestVersion: number;
  protocol: string;
  release: string;
  createdAt: string;
  artifacts: ProtocolArtifact[];
};

export type EmbeddedProtocolArtifact = ProtocolArtifact & { bytesBase64: string };

export type ThoughtProtocolReleaseBundle = {
  schema: "inshell.thought.embedded-release-bundle.v1";
  status: "draft" | "final";
  manifestBytesBase64: string;
  expectedManifestHash: `0x${string}`;
  expectedProtocolReleaseId: `0x${string}`;
  artifacts: EmbeddedProtocolArtifact[];
};

export type OnchainReleaseFacts = {
  protocolReleaseId: `0x${string}`;
  manifestHash: `0x${string}`;
  rendererProfileKeccak256?: `0x${string}`;
  workProfileKeccak256?: `0x${string}`;
};

export type VerifiedProtocolArtifact = ProtocolArtifact & {
  readonly bytes: Uint8Array;
};

export type VerifiedRelease = {
  readonly verified: true;
  readonly status: "draft" | "final";
  readonly manifest: ThoughtProtocolManifest;
  readonly manifestBytes: Uint8Array;
  readonly manifestHash: `0x${string}`;
  readonly protocolReleaseId: `0x${string}`;
  readonly artifacts: ReadonlyMap<string, VerifiedProtocolArtifact>;
};

const decoder = new TextDecoder("utf-8", { fatal: true });
const bytes32Pattern = /^0x[0-9a-f]{64}$/;
const pathPattern = /^(?!\/)(?!.*(?:^|\/)\.\.?\/)(?!.*\\).+$/;
const BASE64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

const decodeBase64 = (value: string): Uint8Array => {
  if (value.length % 4 !== 0 || !/^[A-Za-z0-9+/]*={0,2}$/.test(value)) throw new Error("invalid bundle base64");
  const padding = value.endsWith("==") ? 2 : value.endsWith("=") ? 1 : 0;
  const output = new Uint8Array((value.length / 4) * 3 - padding);
  let cursor = 0;
  for (let index = 0; index < value.length; index += 4) {
    const chars = value.slice(index, index + 4);
    const values = Array.from(chars, (character) => character === "=" ? 0 : BASE64.indexOf(character));
    if (values.some((item) => item < 0)) throw new Error("invalid bundle base64 alphabet");
    const chunk = (values[0]! << 18) | (values[1]! << 12) | (values[2]! << 6) | values[3]!;
    if (cursor < output.length) output[cursor++] = (chunk >> 16) & 0xff;
    if (cursor < output.length) output[cursor++] = (chunk >> 8) & 0xff;
    if (cursor < output.length) output[cursor++] = chunk & 0xff;
  }
  return output;
};

const exactKeys = (value: unknown, keys: readonly string[]): boolean =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value) &&
  JSON.stringify(Object.keys(value as object).sort()) === JSON.stringify([...keys].sort());

const parseManifest = (bytes: Uint8Array): ThoughtProtocolManifest => {
  if (bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) throw new Error("manifest contains BOM");
  if (bytes.includes(0x0d)) throw new Error("manifest contains CR");
  if (bytes.length === 0 || bytes[bytes.length - 1] !== 0x0a || bytes[bytes.length - 2] === 0x0a) {
    throw new Error("manifest must have exactly one final LF");
  }
  const parsed: unknown = JSON.parse(decoder.decode(bytes));
  if (!exactKeys(parsed, ["manifestFormat", "manifestVersion", "protocol", "release", "createdAt", "artifacts"])) {
    throw new Error("manifest shape mismatch");
  }
  const manifest = parsed as ThoughtProtocolManifest;
  if (manifest.manifestFormat !== "inshell.thought.release-manifest") throw new Error("manifest format mismatch");
  if (manifest.manifestVersion !== 1) throw new Error("manifest version mismatch");
  if (manifest.protocol !== "inshell.thought") throw new Error("protocol mismatch");
  if (!Array.isArray(manifest.artifacts) || manifest.artifacts.length === 0) throw new Error("manifest has no artifacts");
  const seenPaths = new Set<string>();
  const seenRoles = new Set<string>();
  for (const artifact of manifest.artifacts) {
    if (!exactKeys(artifact, ["role", "path", "mediaType", "byteLength", "keccak256"])) {
      throw new Error("manifest artifact shape mismatch");
    }
    if (!artifact.role || seenRoles.has(artifact.role)) throw new Error(`duplicate artifact role: ${artifact.role}`);
    if (!pathPattern.test(artifact.path) || seenPaths.has(artifact.path)) throw new Error(`invalid artifact path: ${artifact.path}`);
    if (!artifact.mediaType || !Number.isSafeInteger(artifact.byteLength) || artifact.byteLength <= 0) {
      throw new Error(`invalid artifact metadata: ${artifact.path}`);
    }
    if (!bytes32Pattern.test(artifact.keccak256)) throw new Error(`invalid artifact hash: ${artifact.path}`);
    seenRoles.add(artifact.role);
    seenPaths.add(artifact.path);
  }
  return manifest;
};

export const hashExactBytes = (bytes: Uint8Array): `0x${string}` =>
  keccak256(bytes) as `0x${string}`;

export const verifyProtocolRelease = async (
  bundle: ThoughtProtocolReleaseBundle,
  onchain?: OnchainReleaseFacts,
): Promise<VerifiedRelease> => {
  if (!exactKeys(bundle, [
    "schema",
    "status",
    "manifestBytesBase64",
    "expectedManifestHash",
    "expectedProtocolReleaseId",
    "artifacts",
  ])) throw new Error("embedded release bundle shape mismatch");
  if (bundle.schema !== "inshell.thought.embedded-release-bundle.v1") throw new Error("bundle schema mismatch");
  if (bundle.status !== "draft" && bundle.status !== "final") throw new Error("bundle status mismatch");
  if (!Array.isArray(bundle.artifacts) || bundle.artifacts.length === 0) throw new Error("bundle has no artifacts");
  const manifestBytes = decodeBase64(bundle.manifestBytesBase64);
  const manifestHash = hashExactBytes(manifestBytes);
  if (manifestHash !== bundle.expectedManifestHash) throw new Error("embedded manifest hash mismatch");
  const protocolReleaseId = deriveProtocolReleaseId(manifestHash);
  if (protocolReleaseId !== bundle.expectedProtocolReleaseId) throw new Error("embedded release ID mismatch");
  if (onchain && onchain.manifestHash !== manifestHash) throw new Error("onchain manifest hash mismatch");
  if (onchain && onchain.protocolReleaseId !== protocolReleaseId) throw new Error("onchain protocol release ID mismatch");

  const manifest = parseManifest(manifestBytes);
  if (bundle.artifacts.length !== manifest.artifacts.length) throw new Error("embedded artifact count mismatch");
  const embeddedByPath = new Map(bundle.artifacts.map((artifact) => [artifact.path, artifact]));
  const verified = new Map<string, VerifiedProtocolArtifact>();
  for (const expected of manifest.artifacts) {
    const embedded = embeddedByPath.get(expected.path);
    if (!embedded) throw new Error(`embedded artifact missing: ${expected.path}`);
    if (!exactKeys(embedded, ["role", "path", "mediaType", "byteLength", "keccak256", "bytesBase64"])) {
      throw new Error(`embedded artifact shape mismatch: ${expected.path}`);
    }
    for (const key of ["role", "mediaType", "byteLength", "keccak256"] as const) {
      if (embedded[key] !== expected[key]) throw new Error(`embedded artifact ${key} mismatch: ${expected.path}`);
    }
    const artifactBytes = decodeBase64(embedded.bytesBase64);
    if (artifactBytes.length !== expected.byteLength) throw new Error(`artifact byte length mismatch: ${expected.path}`);
    if (hashExactBytes(artifactBytes) !== expected.keccak256) throw new Error(`artifact hash mismatch: ${expected.path}`);
    verified.set(expected.role, Object.freeze({ ...expected, bytes: Uint8Array.from(artifactBytes) }));
  }
  if (
    onchain?.rendererProfileKeccak256 !== undefined &&
    verified.get("renderer-profile")?.keccak256 !== onchain.rendererProfileKeccak256
  ) throw new Error("onchain renderer profile hash mismatch");
  if (
    onchain?.workProfileKeccak256 !== undefined &&
    verified.get("work-profile")?.keccak256 !== onchain.workProfileKeccak256
  ) throw new Error("onchain work profile hash mismatch");
  return Object.freeze({
    verified: true as const,
    status: bundle.status,
    manifest,
    manifestBytes: Uint8Array.from(manifestBytes),
    manifestHash,
    protocolReleaseId,
    artifacts: verified,
  });
};

export const embeddedThoughtV2ReleaseBundle = embeddedBundleJson as ThoughtProtocolReleaseBundle;

export const verifyEmbeddedThoughtV2Release = (onchain?: OnchainReleaseFacts): Promise<VerifiedRelease> =>
  verifyProtocolRelease(embeddedThoughtV2ReleaseBundle, onchain);

export const requireVerifiedArtifact = (release: VerifiedRelease, role: string): VerifiedProtocolArtifact => {
  const artifact = release.artifacts.get(role);
  if (!artifact) throw new Error(`verified release artifact missing: ${role}`);
  return artifact;
};
