import { keccak256 } from "ethers";

import {
  canonicalJsonStringify,
  MAX_PROVENANCE_BYTES,
  THOUGHT_PROVENANCE_ID,
  thoughtWorkHashes,
  type CanonicalJson,
  type ThoughtWorkHashes,
} from "./thought-v2-protocol";

export type ThoughtArtifactBinding = {
  id: string;
  path: string;
  keccak256: `0x${string}`;
};

export type ThoughtProtocolBinding = {
  protocolReleaseId: `0x${string}`;
  manifestKeccak256: `0x${string}`;
  creativeSpec: ThoughtArtifactBinding;
  agentResultSchema: ThoughtArtifactBinding;
  workProfile: ThoughtArtifactBinding;
  rendererProfile: ThoughtArtifactBinding;
};

export type ThoughtAgentDeclaration = {
  schema: "inshell.thought.agent-declaration.v1";
  status: "declared-unverified";
  agentLabel: string;
  declaredOneCreativeResult: true;
};

export type ThoughtAgentTransport = {
  adapter?: string;
  runId?: string;
  rawResponseSha256?: string;
};

export type ThoughtProcess =
  | { kind: "manual" }
  | {
    kind: "agent-run";
    agentDeclaration: ThoughtAgentDeclaration;
    transport?: ThoughtAgentTransport;
  };

export type ThoughtMintContext = {
  chainId: string;
  thoughtNft: `0x${string}`;
  pathNft: `0x${string}`;
  minter: `0x${string}`;
  movement: "THOUGHT";
  pathId: string;
};

export type ThoughtProvenanceWork = ThoughtWorkHashes & {
  promptLine: string;
  agentLine: string;
};

export type ThoughtProvenanceV2 = {
  schema: typeof THOUGHT_PROVENANCE_ID;
  protocol: ThoughtProtocolBinding;
  work: ThoughtProvenanceWork;
  process: ThoughtProcess;
  mintContext: ThoughtMintContext;
};

export type ThoughtProvenanceBuildInput = {
  protocol: ThoughtProtocolBinding;
  promptLine: string;
  agentLine: string;
  process: ThoughtProcess;
  mintContext: ThoughtMintContext;
};

export type ThoughtTypedFacts = {
  promptLine: string;
  agentLine: string;
  workHash?: `0x${string}`;
  provenanceHash?: `0x${string}`;
  protocolReleaseId?: `0x${string}`;
  manifestKeccak256?: `0x${string}`;
  thoughtNft?: `0x${string}`;
  pathNft?: `0x${string}`;
  minter?: `0x${string}`;
  pathId?: string;
};

export type ProvenanceVerification = {
  conforming: boolean;
  exactBytes: Uint8Array;
  provenanceHash: `0x${string}`;
  parsed?: ThoughtProvenanceV2;
  errors: string[];
  declarations: string[];
};

const encoder = new TextEncoder();
const decoder = new TextDecoder("utf-8", { fatal: true });
const bytes32Pattern = /^0x[0-9a-f]{64}$/;
const addressPattern = /^0x[0-9a-f]{40}$/;
const decimalPattern = /^(0|[1-9][0-9]*)$/;
const sha256Pattern = /^[0-9a-f]{64}$/;
const safePathPattern = /^(?!\/)(?!.*(?:^|\/)\.\.?\/).+$/;

const ownKeysEqual = (value: unknown, required: readonly string[], optional: readonly string[] = []): boolean => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const actual = Object.keys(value).sort();
  const allowed = [...required, ...optional].sort();
  return required.every((key) => Object.hasOwn(value, key)) &&
    actual.every((key) => allowed.includes(key)) && actual.length <= allowed.length;
};

const isNonemptyString = (value: unknown, maximum = Number.MAX_SAFE_INTEGER): value is string =>
  typeof value === "string" && value.length >= 1 && value.length <= maximum;

const validateArtifact = (value: unknown, label: string, errors: string[]): value is ThoughtArtifactBinding => {
  if (!ownKeysEqual(value, ["id", "path", "keccak256"])) {
    errors.push(`${label} shape mismatch`);
    return false;
  }
  const artifact = value as Record<string, unknown>;
  if (!isNonemptyString(artifact.id)) errors.push(`${label}.id mismatch`);
  if (!isNonemptyString(artifact.path) || !safePathPattern.test(artifact.path)) errors.push(`${label}.path mismatch`);
  if (typeof artifact.keccak256 !== "string" || !bytes32Pattern.test(artifact.keccak256)) {
    errors.push(`${label}.keccak256 mismatch`);
  }
  return true;
};

const validateProtocol = (value: unknown, errors: string[]): value is ThoughtProtocolBinding => {
  const keys = [
    "protocolReleaseId",
    "manifestKeccak256",
    "creativeSpec",
    "agentResultSchema",
    "workProfile",
    "rendererProfile",
  ] as const;
  if (!ownKeysEqual(value, keys)) {
    errors.push("protocol shape mismatch");
    return false;
  }
  const protocol = value as unknown as ThoughtProtocolBinding;
  if (!bytes32Pattern.test(protocol.protocolReleaseId)) errors.push("protocolReleaseId mismatch");
  if (!bytes32Pattern.test(protocol.manifestKeccak256)) errors.push("manifestKeccak256 mismatch");
  validateArtifact(protocol.creativeSpec, "creativeSpec", errors);
  validateArtifact(protocol.agentResultSchema, "agentResultSchema", errors);
  validateArtifact(protocol.workProfile, "workProfile", errors);
  validateArtifact(protocol.rendererProfile, "rendererProfile", errors);
  return true;
};

const validateMintContext = (value: unknown, errors: string[]): value is ThoughtMintContext => {
  const keys = ["chainId", "thoughtNft", "pathNft", "minter", "movement", "pathId"] as const;
  if (!ownKeysEqual(value, keys)) {
    errors.push("mintContext shape mismatch");
    return false;
  }
  const context = value as unknown as ThoughtMintContext;
  if (!decimalPattern.test(context.chainId)) errors.push("chainId mismatch");
  if (!addressPattern.test(context.thoughtNft)) errors.push("thoughtNft mismatch");
  if (!addressPattern.test(context.pathNft)) errors.push("pathNft mismatch");
  if (!addressPattern.test(context.minter)) errors.push("minter mismatch");
  if (context.movement !== "THOUGHT") errors.push("movement mismatch");
  if (!decimalPattern.test(context.pathId)) errors.push("pathId mismatch");
  return true;
};

const validateProcess = (value: unknown, errors: string[]): value is ThoughtProcess => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    errors.push("process shape mismatch");
    return false;
  }
  const process = value as Record<string, unknown>;
  if (process.kind === "manual") {
    if (!ownKeysEqual(value, ["kind"])) errors.push("manual process shape mismatch");
    return true;
  }
  if (process.kind !== "agent-run" || !ownKeysEqual(value, ["kind", "agentDeclaration"], ["transport"])) {
    errors.push("agent-run process shape mismatch");
    return false;
  }
  const declaration = process.agentDeclaration;
  if (!ownKeysEqual(declaration, ["schema", "status", "agentLabel", "declaredOneCreativeResult"])) {
    errors.push("agentDeclaration shape mismatch");
  } else {
    const claim = declaration as Record<string, unknown>;
    if (claim.schema !== "inshell.thought.agent-declaration.v1") errors.push("agentDeclaration.schema mismatch");
    if (claim.status !== "declared-unverified") errors.push("agentDeclaration.status mismatch");
    if (!isNonemptyString(claim.agentLabel, 100)) errors.push("agentDeclaration.agentLabel mismatch");
    if (claim.declaredOneCreativeResult !== true) errors.push("agentDeclaration result-count mismatch");
  }
  if (process.transport !== undefined) {
    if (!ownKeysEqual(process.transport, [], ["adapter", "runId", "rawResponseSha256"])) {
      errors.push("transport shape mismatch");
    } else {
      const transport = process.transport as Record<string, unknown>;
      if (transport.adapter !== undefined && !isNonemptyString(transport.adapter)) errors.push("transport.adapter mismatch");
      if (transport.runId !== undefined && !isNonemptyString(transport.runId)) errors.push("transport.runId mismatch");
      if (
        transport.rawResponseSha256 !== undefined &&
        (typeof transport.rawResponseSha256 !== "string" || !sha256Pattern.test(transport.rawResponseSha256))
      ) errors.push("transport.rawResponseSha256 mismatch");
    }
  }
  return true;
};

const validateWork = (value: unknown, errors: string[]): value is ThoughtProvenanceWork => {
  const keys = [
    "promptLine",
    "agentLine",
    "promptLineKeccak256",
    "agentLineKeccak256",
    "agentIdentityHash",
    "workHash",
    "binaryFieldPacked",
    "binaryFieldKeccak256",
  ] as const;
  if (!ownKeysEqual(value, keys)) {
    errors.push("work shape mismatch");
    return false;
  }
  const work = value as unknown as ThoughtProvenanceWork;
  try {
    const expected = thoughtWorkHashes(work.promptLine, work.agentLine);
    for (const key of [
      "promptLineKeccak256",
      "agentLineKeccak256",
      "agentIdentityHash",
      "workHash",
      "binaryFieldPacked",
      "binaryFieldKeccak256",
    ] as const) {
      if (work[key] !== expected[key]) errors.push(`work.${key} mismatch`);
    }
  } catch (error) {
    errors.push(error instanceof Error ? error.message : String(error));
  }
  return true;
};

const validateShape = (value: unknown, errors: string[]): value is ThoughtProvenanceV2 => {
  if (!ownKeysEqual(value, ["schema", "protocol", "work", "process", "mintContext"])) {
    errors.push("provenance shape mismatch");
    return false;
  }
  const record = value as Record<string, unknown>;
  if (record.schema !== THOUGHT_PROVENANCE_ID) errors.push("schema mismatch");
  validateProtocol(record.protocol, errors);
  validateWork(record.work, errors);
  validateProcess(record.process, errors);
  validateMintContext(record.mintContext, errors);
  return true;
};

export const buildThoughtProvenance = (input: ThoughtProvenanceBuildInput): ThoughtProvenanceV2 => ({
  schema: THOUGHT_PROVENANCE_ID,
  protocol: input.protocol,
  work: {
    promptLine: input.promptLine,
    agentLine: input.agentLine,
    ...thoughtWorkHashes(input.promptLine, input.agentLine),
  },
  process: input.process,
  mintContext: input.mintContext,
});

export const serializeThoughtProvenance = (provenance: ThoughtProvenanceV2): string => {
  const errors: string[] = [];
  validateShape(provenance, errors);
  if (errors.length > 0) throw new Error(errors.join("; "));
  const serialized = canonicalJsonStringify(provenance as unknown as CanonicalJson);
  const size = encoder.encode(serialized).length;
  if (size > MAX_PROVENANCE_BYTES) throw new Error(`provenance is ${size}/${MAX_PROVENANCE_BYTES} bytes`);
  return serialized;
};

export const buildCanonicalProvenance = (input: ThoughtProvenanceBuildInput): Uint8Array =>
  encoder.encode(serializeThoughtProvenance(buildThoughtProvenance(input)));

export const thoughtProvenanceKeccak256 = (exactBytes: Uint8Array | string): `0x${string}` =>
  keccak256(typeof exactBytes === "string" ? encoder.encode(exactBytes) : exactBytes) as `0x${string}`;

export const verifyProvenance = (
  exactBytes: Uint8Array,
  expectedProtocol?: ThoughtProtocolBinding,
  typedFacts?: ThoughtTypedFacts,
): ProvenanceVerification => {
  const bytesCopy = Uint8Array.from(exactBytes);
  const errors: string[] = [];
  const declarations: string[] = [];
  const provenanceHash = thoughtProvenanceKeccak256(bytesCopy);
  if (bytesCopy.length === 0) errors.push("provenance is empty");
  if (bytesCopy.length > MAX_PROVENANCE_BYTES) errors.push(`provenance is ${bytesCopy.length}/${MAX_PROVENANCE_BYTES} bytes`);
  if (bytesCopy[0] === 0xef && bytesCopy[1] === 0xbb && bytesCopy[2] === 0xbf) errors.push("provenance has a BOM");

  let parsed: ThoughtProvenanceV2 | undefined;
  try {
    const text = decoder.decode(bytesCopy);
    const unknownValue: unknown = JSON.parse(text);
    if (canonicalJsonStringify(unknownValue as CanonicalJson) !== text) errors.push("provenance is not RFC 8785 canonical JSON");
    if (validateShape(unknownValue, errors)) parsed = unknownValue;
  } catch (error) {
    errors.push(`provenance parse failed: ${error instanceof Error ? error.message : String(error)}`);
  }

  if (parsed?.process.kind === "agent-run") {
    declarations.push(`Declared Agent: ${parsed.process.agentDeclaration.agentLabel} (unverified)`);
    declarations.push("Declared one creative result (unverified)");
  }

  if (parsed && expectedProtocol) {
    const actual = canonicalJsonStringify(parsed.protocol as unknown as CanonicalJson);
    const expected = canonicalJsonStringify(expectedProtocol as unknown as CanonicalJson);
    if (actual !== expected) errors.push("protocol artifact binding mismatch");
  }

  if (parsed && typedFacts) {
    const comparisons: [string, unknown, unknown][] = [
      ["promptLine", parsed.work.promptLine, typedFacts.promptLine],
      ["agentLine", parsed.work.agentLine, typedFacts.agentLine],
      ["workHash", parsed.work.workHash, typedFacts.workHash],
      ["protocolReleaseId", parsed.protocol.protocolReleaseId, typedFacts.protocolReleaseId],
      ["manifestKeccak256", parsed.protocol.manifestKeccak256, typedFacts.manifestKeccak256],
      ["thoughtNft", parsed.mintContext.thoughtNft, typedFacts.thoughtNft],
      ["pathNft", parsed.mintContext.pathNft, typedFacts.pathNft],
      ["minter", parsed.mintContext.minter, typedFacts.minter],
      ["pathId", parsed.mintContext.pathId, typedFacts.pathId],
    ];
    for (const [label, actual, expected] of comparisons) {
      if (expected !== undefined && actual !== expected) errors.push(`typed ${label} mismatch`);
    }
    if (typedFacts.provenanceHash !== undefined && provenanceHash !== typedFacts.provenanceHash) {
      errors.push("typed provenanceHash mismatch");
    }
  }

  return { conforming: errors.length === 0, exactBytes: bytesCopy, provenanceHash, parsed, errors, declarations };
};

export const verifyThoughtProvenance = (provenance: ThoughtProvenanceV2): string[] =>
  verifyProvenance(encoder.encode(canonicalJsonStringify(provenance as unknown as CanonicalJson))).errors;
