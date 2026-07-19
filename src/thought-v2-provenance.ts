import { keccak256, toUtf8Bytes } from "ethers";

import {
  THOUGHT_AGENT_DECLARATION_ID,
  THOUGHT_AGENT_RESULT_ID,
  THOUGHT_PROVENANCE_ID,
  assertThoughtLine,
  canonicalJsonStringify,
  MAX_PROVENANCE_BYTES,
  thoughtWorkHashes,
  type CanonicalJson,
  type ThoughtModelSource,
  type ThoughtWorkHashes,
} from "./thought-v2-protocol";

export const PROVENANCE_PUBLIC_IDENTIFIER_MAX_BYTES = 128;
export const PROVENANCE_PUBLIC_STRING_MAX_BYTES = 256;

export type ThoughtSpecPair = {
  thoughtSpecId: `0x${string}`;
  thoughtSpecHash: `0x${string}`;
};

export type ThoughtProtocolBinding = {
  manifestKeccak256: `0x${string}`;
  protocolReleaseId: `0x${string}`;
  thoughtSpecHash: `0x${string}`;
  thoughtSpecId: `0x${string}`;
};

export type ThoughtSelectedSpecEvidence = {
  specName: string;
  exactSpecBytes: Uint8Array;
  registeredPair: ThoughtSpecPair;
  mintPair: ThoughtSpecPair;
  tokenStatePair?: ThoughtSpecPair;
  claimPair?: ThoughtSpecPair;
};

export type ThoughtAgentRunSource = Exclude<ThoughtModelSource, "manual">;

export type ThoughtProcessAgentDeclaration = {
  label: string;
  source: ThoughtModelSource;
  status: "declared-unverified";
};

export type ThoughtProcessModelDeclaration = ThoughtProcessAgentDeclaration & {
  identifier?: string;
};

export type ThoughtAgentTransport = {
  adapter?: string;
  provider?: string;
  resultEnvelopeKeccak256: `0x${string}`;
  route?: string;
  runIdHash: `0x${string}`;
};

export type ThoughtProcess =
  | {
    agentDeclaration: ThoughtProcessAgentDeclaration & { source: "manual" };
    kind: "manual";
    modelDeclaration: ThoughtProcessModelDeclaration & { source: "manual" };
  }
  | {
    agentDeclaration: ThoughtProcessAgentDeclaration & { source: ThoughtAgentRunSource };
    kind: "agent-run";
    modelDeclaration: ThoughtProcessModelDeclaration & { source: ThoughtAgentRunSource };
    transport: ThoughtAgentTransport;
  };

export type ThoughtManualProcessEvidence = Extract<ThoughtProcess, { kind: "manual" }>;

export type ThoughtAgentRunProcessEvidence = Omit<
  Extract<ThoughtProcess, { kind: "agent-run" }>,
  "transport"
> & {
  transport: {
    adapter?: string;
    provider?: string;
    resultEnvelope: CanonicalJson;
    route?: string;
    runReference: string;
  };
};

export type ThoughtProcessEvidence = ThoughtManualProcessEvidence | ThoughtAgentRunProcessEvidence;

export type ThoughtMintContext = {
  chainId: string;
  intendedMinter: `0x${string}`;
  thoughtNft: `0x${string}`;
};

export type ThoughtProvenanceWork = ThoughtWorkHashes & {
  promptLine: string;
  agentLine: string;
};

export type ThoughtProvenanceV2 = {
  mintContext: ThoughtMintContext;
  process: ThoughtProcess;
  protocol: ThoughtProtocolBinding;
  schema: typeof THOUGHT_PROVENANCE_ID;
  work: ThoughtProvenanceWork;
};

export type ThoughtProvenanceBuildInput = {
  protocol: ThoughtProtocolBinding;
  selectedSpec: ThoughtSelectedSpecEvidence;
  promptLine: string;
  agentLine: string;
  process: ThoughtProcessEvidence;
  mintContext: ThoughtMintContext;
};

export type ThoughtProvenanceAttestationFacts = {
  chainId: string;
  declaredAgentHash: `0x${string}`;
  declaredModelHash: `0x${string}`;
  intendedMinter: `0x${string}`;
  protocolReleaseId: `0x${string}`;
  provenanceHash: `0x${string}`;
  runIdHash: `0x${string}`;
  thoughtNft: `0x${string}`;
  thoughtSpecHash: `0x${string}`;
  thoughtSpecId: `0x${string}`;
  workHash: `0x${string}`;
};

export type ThoughtTypedFacts = {
  promptLine?: string;
  agentLine?: string;
  declaredAgent?: string;
  declaredModel?: string;
  workHash?: `0x${string}`;
  provenanceHash?: `0x${string}`;
  protocolReleaseId?: `0x${string}`;
  manifestKeccak256?: `0x${string}`;
  thoughtSpecId?: `0x${string}`;
  thoughtSpecHash?: `0x${string}`;
  thoughtNft?: `0x${string}`;
  intendedMinter?: `0x${string}`;
  chainId?: string;
  runIdHash?: `0x${string}`;
  resultEnvelopeKeccak256?: `0x${string}`;
  attestationClaim?: ThoughtProvenanceAttestationFacts;
};

export type ThoughtProvenanceIssue = {
  code: string;
  path: string;
  message: string;
};

export type ProvenanceVerification = {
  conforming: boolean;
  exactBytes: Uint8Array;
  provenanceHash: `0x${string}`;
  parsed?: ThoughtProvenanceV2;
  issues: ThoughtProvenanceIssue[];
  errors: string[];
  declarations: string[];
};

export type VerifiedCanonicalThoughtProvenance = {
  provenance: ThoughtProvenanceV2;
  canonicalJson: string;
  exactBytes: Uint8Array;
  provenanceHash: `0x${string}`;
  verification: ProvenanceVerification;
};

type JsonRecord = Record<string, unknown>;

const encoder = new TextEncoder();
const decoder = new TextDecoder("utf-8", { fatal: true });
const bytes32Pattern = /^0x[0-9a-f]{64}$/;
const packedFieldPattern = /^0x[0-9a-f]{256}$/;
const addressPattern = /^0x[0-9a-f]{40}$/;
const nonzeroDecimalPattern = /^[1-9][0-9]*$/;
const publicIdentifierPattern = /^[A-Za-z0-9][A-Za-z0-9._:/@+\-]*$/;
const zeroBytes32 = `0x${"00".repeat(32)}`;
const zeroAddress = `0x${"00".repeat(20)}`;
const uint256Max = (1n << 256n) - 1n;
const agentRunSources: readonly ThoughtAgentRunSource[] = [
  "agent_declared",
  "connector_observed",
  "runtime_configured",
  "unknown",
];

const addIssue = (
  issues: ThoughtProvenanceIssue[],
  code: string,
  path: string,
  message: string,
): void => {
  issues.push({ code, path, message });
};

const isRecord = (value: unknown): value is JsonRecord =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const inspectObject = (
  value: unknown,
  path: string,
  required: readonly string[],
  optional: readonly string[],
  issues: ThoughtProvenanceIssue[],
): JsonRecord | undefined => {
  if (!isRecord(value)) {
    addIssue(issues, "schema.object", path, `${path} must be an object`);
    return undefined;
  }
  for (const key of required) {
    if (!Object.hasOwn(value, key)) {
      const fieldPath = `${path}.${key}`;
      addIssue(issues, "schema.missing_property", fieldPath, `missing required property ${fieldPath}`);
    }
  }
  const allowed = new Set([...required, ...optional]);
  for (const key of Object.keys(value).filter((key) => !allowed.has(key)).sort()) {
    const fieldPath = `${path}.${key}`;
    addIssue(issues, "schema.unexpected_property", fieldPath, `unexpected property ${fieldPath}`);
  }
  return value;
};

const validateBytes32 = (
  value: unknown,
  path: string,
  issues: ThoughtProvenanceIssue[],
  nonzero = false,
): value is `0x${string}` => {
  if (typeof value !== "string" || !bytes32Pattern.test(value)) {
    addIssue(issues, "schema.bytes32", path, `${path} must be lowercase bytes32`);
    return false;
  }
  if (nonzero && value === zeroBytes32) {
    addIssue(issues, "semantic.nonzero", path, `${path} must be nonzero`);
    return false;
  }
  return true;
};

const validateAddress = (
  value: unknown,
  path: string,
  issues: ThoughtProvenanceIssue[],
): value is `0x${string}` => {
  if (typeof value !== "string" || !addressPattern.test(value)) {
    addIssue(issues, "schema.address", path, `${path} must be a lowercase address`);
    return false;
  }
  if (value === zeroAddress) {
    addIssue(issues, "semantic.nonzero", path, `${path} must be nonzero`);
    return false;
  }
  return true;
};

const validateChainId = (
  value: unknown,
  path: string,
  issues: ThoughtProvenanceIssue[],
): value is string => {
  if (typeof value !== "string" || !nonzeroDecimalPattern.test(value)) {
    addIssue(issues, "schema.nonzero_decimal", path, `${path} must be a canonical nonzero decimal string`);
    return false;
  }
  try {
    if (BigInt(value) > uint256Max) {
      addIssue(issues, "semantic.uint256", path, `${path} exceeds uint256`);
      return false;
    }
  } catch {
    addIssue(issues, "semantic.uint256", path, `${path} is not a uint256`);
    return false;
  }
  return true;
};

const validateLine = (
  value: unknown,
  path: string,
  kind: "prompt" | "agent" | "declaredAgent" | "model",
  issues: ThoughtProvenanceIssue[],
): value is string => {
  if (typeof value !== "string") {
    addIssue(issues, "schema.string", path, `${path} must be a string`);
    return false;
  }
  try {
    assertThoughtLine(value, kind);
    return true;
  } catch (error) {
    addIssue(
      issues,
      "semantic.public_line",
      path,
      error instanceof Error ? error.message : String(error),
    );
    return false;
  }
};

const isRejectedPublicCodePoint = (codePoint: number): boolean =>
  codePoint <= 0x1f ||
  (codePoint >= 0x7f && codePoint <= 0x9f) ||
  codePoint === 0x00ad ||
  codePoint === 0x00a0 ||
  codePoint === 0x034f ||
  codePoint === 0x061c ||
  (codePoint >= 0x115f && codePoint <= 0x1160) ||
  codePoint === 0x1680 ||
  (codePoint >= 0x17b4 && codePoint <= 0x17b5) ||
  (codePoint >= 0x180b && codePoint <= 0x180f) ||
  (codePoint >= 0x2000 && codePoint <= 0x200f) ||
  codePoint === 0x2028 ||
  codePoint === 0x2029 ||
  (codePoint >= 0x202a && codePoint <= 0x202e) ||
  codePoint === 0x202f ||
  codePoint === 0x205f ||
  (codePoint >= 0x2060 && codePoint <= 0x206f) ||
  codePoint === 0x3000 ||
  codePoint === 0x3164 ||
  (codePoint >= 0xfe00 && codePoint <= 0xfe0f) ||
  codePoint === 0xfeff ||
  codePoint === 0xffa0 ||
  (codePoint >= 0xfff0 && codePoint <= 0xfff8) ||
  (codePoint >= 0xfdd0 && codePoint <= 0xfdef) ||
  (codePoint >= 0x1bca0 && codePoint <= 0x1bca3) ||
  (codePoint >= 0x1d173 && codePoint <= 0x1d17a) ||
  (codePoint >= 0xe0000 && codePoint <= 0xe0fff) ||
  (codePoint & 0xffff) === 0xfffe ||
  (codePoint & 0xffff) === 0xffff;

const validatePublicString = (
  value: unknown,
  path: string,
  issues: ThoughtProvenanceIssue[],
): value is string => {
  if (typeof value !== "string") {
    addIssue(issues, "schema.string", path, `${path} must be a string`);
    return false;
  }
  const byteLength = encoder.encode(value).length;
  if (byteLength < 1 || byteLength > PROVENANCE_PUBLIC_STRING_MAX_BYTES) {
    addIssue(
      issues,
      "semantic.public_string_length",
      path,
      `${path} must be 1 through ${PROVENANCE_PUBLIC_STRING_MAX_BYTES} UTF-8 bytes`,
    );
    return false;
  }
  if (value.startsWith(" ") || value.endsWith(" ")) {
    addIssue(issues, "semantic.public_string_outer_space", path, `${path} has outer U+0020`);
    return false;
  }
  for (let index = 0; index < value.length; index += 1) {
    const unit = value.charCodeAt(index);
    if (unit >= 0xd800 && unit <= 0xdfff) {
      const codePoint = value.codePointAt(index);
      if (codePoint === undefined || codePoint <= 0xffff) {
        addIssue(issues, "semantic.public_string_scalar", path, `${path} contains an unpaired surrogate`);
        return false;
      }
      index += 1;
      if (isRejectedPublicCodePoint(codePoint)) {
        addIssue(issues, "semantic.public_string_scalar", path, `${path} contains a disallowed scalar`);
        return false;
      }
    } else if (isRejectedPublicCodePoint(unit)) {
      addIssue(issues, "semantic.public_string_scalar", path, `${path} contains a disallowed scalar`);
      return false;
    }
  }
  return true;
};

const validatePublicIdentifier = (
  value: unknown,
  path: string,
  issues: ThoughtProvenanceIssue[],
): value is string => {
  if (
    typeof value !== "string" ||
    encoder.encode(value).length > PROVENANCE_PUBLIC_IDENTIFIER_MAX_BYTES ||
    !publicIdentifierPattern.test(value)
  ) {
    addIssue(
      issues,
      "semantic.public_identifier",
      path,
      `${path} must be a 1 through ${PROVENANCE_PUBLIC_IDENTIFIER_MAX_BYTES}-byte public identifier`,
    );
    return false;
  }
  return true;
};

const validateProtocol = (
  value: unknown,
  issues: ThoughtProvenanceIssue[],
): value is ThoughtProtocolBinding => {
  const object = inspectObject(
    value,
    "protocol",
    ["manifestKeccak256", "protocolReleaseId", "thoughtSpecHash", "thoughtSpecId"],
    [],
    issues,
  );
  if (!object) return false;
  validateBytes32(object.manifestKeccak256, "protocol.manifestKeccak256", issues, true);
  validateBytes32(object.protocolReleaseId, "protocol.protocolReleaseId", issues, true);
  validateBytes32(object.thoughtSpecHash, "protocol.thoughtSpecHash", issues, true);
  validateBytes32(object.thoughtSpecId, "protocol.thoughtSpecId", issues, true);
  return true;
};

const compareSpecPair = (
  label: string,
  actual: unknown,
  expected: ThoughtSpecPair,
  issues: ThoughtProvenanceIssue[],
): void => {
  if (!isRecord(actual)) {
    addIssue(issues, "selected_spec.pair", label, `${label} shape mismatch`);
    return;
  }
  const object = actual;
  for (const field of ["thoughtSpecId", "thoughtSpecHash"] as const) {
    if (!Object.hasOwn(object, field)) {
      addIssue(
        issues,
        "schema.missing_property",
        `${label}.${field}`,
        `missing required property ${label}.${field}`,
      );
    }
  }
  validateBytes32(object.thoughtSpecId, `${label}.thoughtSpecId`, issues, true);
  validateBytes32(object.thoughtSpecHash, `${label}.thoughtSpecHash`, issues, true);
  if (object.thoughtSpecId !== expected.thoughtSpecId) {
    addIssue(
      issues,
      "selected_spec.id_mismatch",
      `${label}.thoughtSpecId`,
      `${label}.thoughtSpecId parity mismatch`,
    );
  }
  if (object.thoughtSpecHash !== expected.thoughtSpecHash) {
    addIssue(
      issues,
      "selected_spec.hash_mismatch",
      `${label}.thoughtSpecHash`,
      `${label}.thoughtSpecHash parity mismatch`,
    );
  }
};

const validateSelectedSpecEvidence = (
  protocol: ThoughtProtocolBinding,
  evidence: ThoughtSelectedSpecEvidence,
  issues: ThoughtProvenanceIssue[],
): void => {
  if (!isRecord(evidence)) {
    addIssue(issues, "selected_spec.evidence", "selectedSpec", "selected spec evidence shape mismatch");
    return;
  }
  if (typeof evidence.specName !== "string" || evidence.specName.length === 0) {
    addIssue(issues, "selected_spec.name", "selectedSpec.specName", "selected spec name mismatch");
    return;
  }
  if (!(evidence.exactSpecBytes instanceof Uint8Array) || evidence.exactSpecBytes.length === 0) {
    addIssue(
      issues,
      "selected_spec.bytes",
      "selectedSpec.exactSpecBytes",
      "selected spec exact bytes mismatch",
    );
    return;
  }
  const derivedPair: ThoughtSpecPair = {
    thoughtSpecId: keccak256(toUtf8Bytes(evidence.specName)) as `0x${string}`,
    thoughtSpecHash: keccak256(evidence.exactSpecBytes) as `0x${string}`,
  };
  compareSpecPair("provenance protocol pair", protocol, derivedPair, issues);
  compareSpecPair("registered pair", evidence.registeredPair, derivedPair, issues);
  compareSpecPair("mint pair", evidence.mintPair, derivedPair, issues);
  if (evidence.tokenStatePair !== undefined) {
    compareSpecPair("token state pair", evidence.tokenStatePair, derivedPair, issues);
  }
  if (evidence.claimPair !== undefined) {
    compareSpecPair("attestation claim pair", evidence.claimPair, derivedPair, issues);
  }
};

const validateMintContext = (
  value: unknown,
  issues: ThoughtProvenanceIssue[],
): value is ThoughtMintContext => {
  const object = inspectObject(
    value,
    "mintContext",
    ["chainId", "intendedMinter", "thoughtNft"],
    [],
    issues,
  );
  if (!object) return false;
  validateChainId(object.chainId, "mintContext.chainId", issues);
  validateAddress(object.intendedMinter, "mintContext.intendedMinter", issues);
  validateAddress(object.thoughtNft, "mintContext.thoughtNft", issues);
  return true;
};

const validateDeclaration = (
  value: unknown,
  path: "process.agentDeclaration" | "process.modelDeclaration",
  kind: "manual" | "agent-run",
  model: boolean,
  issues: ThoughtProvenanceIssue[],
): value is ThoughtProcessAgentDeclaration | ThoughtProcessModelDeclaration => {
  const object = inspectObject(
    value,
    path,
    ["label", "source", "status"],
    model ? ["identifier"] : [],
    issues,
  );
  if (!object) return false;
  validateLine(object.label, `${path}.label`, model ? "model" : "declaredAgent", issues);
  if (object.status !== "declared-unverified") {
    addIssue(issues, "schema.const", `${path}.status`, `${path}.status mismatch`);
  }
  if (kind === "manual") {
    if (object.source !== "manual") {
      addIssue(issues, "schema.const", `${path}.source`, `${path}.source mismatch`);
    }
  } else if (
    typeof object.source !== "string" ||
    !(agentRunSources as readonly string[]).includes(object.source)
  ) {
    addIssue(issues, "schema.enum", `${path}.source`, `${path}.source mismatch`);
  }
  if (model && object.identifier !== undefined) {
    validatePublicString(object.identifier, `${path}.identifier`, issues);
  }
  return true;
};

const validateTransport = (
  value: unknown,
  issues: ThoughtProvenanceIssue[],
): value is ThoughtAgentTransport => {
  const object = inspectObject(
    value,
    "process.transport",
    ["resultEnvelopeKeccak256", "runIdHash"],
    ["adapter", "provider", "route"],
    issues,
  );
  if (!object) return false;
  validateBytes32(
    object.resultEnvelopeKeccak256,
    "process.transport.resultEnvelopeKeccak256",
    issues,
    true,
  );
  validateBytes32(object.runIdHash, "process.transport.runIdHash", issues, true);
  for (const field of ["adapter", "provider", "route"] as const) {
    if (object[field] !== undefined) {
      validatePublicIdentifier(object[field], `process.transport.${field}`, issues);
    }
  }
  return true;
};

const validateProcess = (
  value: unknown,
  issues: ThoughtProvenanceIssue[],
): value is ThoughtProcess => {
  if (!isRecord(value)) {
    addIssue(issues, "schema.object", "process", "process must be an object");
    return false;
  }
  const kind = value.kind;
  if (kind !== "manual" && kind !== "agent-run") {
    inspectObject(value, "process", ["agentDeclaration", "kind", "modelDeclaration"], [], issues);
    addIssue(issues, "schema.discriminator", "process.kind", "process.kind mismatch");
    return false;
  }
  const object = inspectObject(
    value,
    "process",
    kind === "manual"
      ? ["agentDeclaration", "kind", "modelDeclaration"]
      : ["agentDeclaration", "kind", "modelDeclaration", "transport"],
    [],
    issues,
  );
  if (!object) return false;
  validateDeclaration(object.agentDeclaration, "process.agentDeclaration", kind, false, issues);
  validateDeclaration(object.modelDeclaration, "process.modelDeclaration", kind, true, issues);
  if (kind === "agent-run") validateTransport(object.transport, issues);
  return true;
};

const validateWork = (
  value: unknown,
  issues: ThoughtProvenanceIssue[],
): value is ThoughtProvenanceWork => {
  const keys = [
    "agentIdentityHash",
    "agentLine",
    "agentLineKeccak256",
    "binaryFieldKeccak256",
    "binaryFieldPacked",
    "promptLine",
    "promptLineKeccak256",
    "workHash",
  ] as const;
  const object = inspectObject(value, "work", keys, [], issues);
  if (!object) return false;
  const validPrompt = validateLine(object.promptLine, "work.promptLine", "prompt", issues);
  const validAgent = validateLine(object.agentLine, "work.agentLine", "agent", issues);
  for (const field of [
    "promptLineKeccak256",
    "agentLineKeccak256",
    "agentIdentityHash",
    "workHash",
    "binaryFieldKeccak256",
  ] as const) {
    validateBytes32(object[field], `work.${field}`, issues);
  }
  if (typeof object.binaryFieldPacked !== "string" || !packedFieldPattern.test(object.binaryFieldPacked)) {
    addIssue(
      issues,
      "schema.binary_field",
      "work.binaryFieldPacked",
      "work.binaryFieldPacked must be exactly 128 lowercase hexadecimal bytes",
    );
  }
  if (validPrompt && validAgent) {
    const expected = thoughtWorkHashes(object.promptLine as string, object.agentLine as string);
    for (const field of [
      "promptLineKeccak256",
      "agentLineKeccak256",
      "agentIdentityHash",
      "workHash",
      "binaryFieldPacked",
      "binaryFieldKeccak256",
    ] as const) {
      if (object[field] !== expected[field]) {
        addIssue(issues, "semantic.work_commitment", `work.${field}`, `work.${field} mismatch`);
      }
    }
  }
  return true;
};

const validateShape = (
  value: unknown,
  issues: ThoughtProvenanceIssue[],
): value is ThoughtProvenanceV2 => {
  const start = issues.length;
  const object = inspectObject(
    value,
    "provenance",
    ["mintContext", "process", "protocol", "schema", "work"],
    [],
    issues,
  );
  if (!object) return false;
  if (object.schema !== THOUGHT_PROVENANCE_ID) {
    addIssue(issues, "schema.const", "schema", "schema mismatch");
  }
  validateMintContext(object.mintContext, issues);
  validateProcess(object.process, issues);
  validateProtocol(object.protocol, issues);
  validateWork(object.work, issues);
  return issues.length === start;
};

const validateResultModel = (
  value: unknown,
  issues: ThoughtProvenanceIssue[],
): JsonRecord | undefined => {
  const object = inspectObject(
    value,
    "process.transport.resultEnvelope.agent.model",
    ["label", "source"],
    ["identifier"],
    issues,
  );
  if (!object) return undefined;
  validateLine(
    object.label,
    "process.transport.resultEnvelope.agent.model.label",
    "model",
    issues,
  );
  if (
    typeof object.source !== "string" ||
    !["agent_declared", "connector_observed", "runtime_configured", "manual", "unknown"].includes(
      object.source,
    )
  ) {
    addIssue(
      issues,
      "schema.enum",
      "process.transport.resultEnvelope.agent.model.source",
      "Agent result model source mismatch",
    );
  }
  if (object.identifier !== undefined) {
    validatePublicString(
      object.identifier,
      "process.transport.resultEnvelope.agent.model.identifier",
      issues,
    );
  }
  return object;
};

const validateAgentResultEnvelope = (
  value: unknown,
  protocol: ThoughtProtocolBinding,
  expectedAgentLine: string,
  expectedAgent: ThoughtProcessAgentDeclaration,
  expectedModel: ThoughtProcessModelDeclaration,
  issues: ThoughtProvenanceIssue[],
): void => {
  const rootPath = "process.transport.resultEnvelope";
  const object = inspectObject(
    value,
    rootPath,
    ["agent", "agentLine", "release", "schema"],
    ["declaration"],
    issues,
  );
  if (!object) return;
  if (object.schema !== THOUGHT_AGENT_RESULT_ID) {
    addIssue(issues, "schema.const", `${rootPath}.schema`, "Agent result schema mismatch");
  }
  if (validateLine(object.agentLine, `${rootPath}.agentLine`, "agent", issues)) {
    if (object.agentLine !== expectedAgentLine) {
      addIssue(issues, "process.result_parity", `${rootPath}.agentLine`, "Agent result line mismatch");
    }
  }
  const release = inspectObject(
    object.release,
    `${rootPath}.release`,
    ["manifestKeccak256", "protocolReleaseId"],
    [],
    issues,
  );
  if (release) {
    validateBytes32(release.manifestKeccak256, `${rootPath}.release.manifestKeccak256`, issues, true);
    validateBytes32(release.protocolReleaseId, `${rootPath}.release.protocolReleaseId`, issues, true);
    if (release.manifestKeccak256 !== protocol.manifestKeccak256) {
      addIssue(
        issues,
        "process.result_parity",
        `${rootPath}.release.manifestKeccak256`,
        "Agent result manifest hash mismatch",
      );
    }
    if (release.protocolReleaseId !== protocol.protocolReleaseId) {
      addIssue(
        issues,
        "process.result_parity",
        `${rootPath}.release.protocolReleaseId`,
        "Agent result release ID mismatch",
      );
    }
  }
  const agent = inspectObject(object.agent, `${rootPath}.agent`, ["label", "model"], [], issues);
  if (agent) {
    if (validateLine(agent.label, `${rootPath}.agent.label`, "declaredAgent", issues)) {
      if (agent.label !== expectedAgent.label) {
        addIssue(issues, "process.result_parity", `${rootPath}.agent.label`, "Agent result label mismatch");
      }
    }
    const model = validateResultModel(agent.model, issues);
    if (model) {
      for (const field of ["label", "source", "identifier"] as const) {
        if (model[field] !== expectedModel[field]) {
          addIssue(
            issues,
            "process.result_parity",
            `${rootPath}.agent.model.${field}`,
            `Agent result model ${field} mismatch`,
          );
        }
      }
    }
  }
  if (object.declaration !== undefined) {
    const declaration = inspectObject(
      object.declaration,
      `${rootPath}.declaration`,
      ["declaredOneCreativeResult", "label", "schema", "status"],
      [],
      issues,
    );
    if (declaration) {
      if (declaration.schema !== THOUGHT_AGENT_DECLARATION_ID) {
        addIssue(issues, "schema.const", `${rootPath}.declaration.schema`, "Agent declaration schema mismatch");
      }
      if (declaration.status !== "declared-unverified") {
        addIssue(issues, "schema.const", `${rootPath}.declaration.status`, "Agent declaration status mismatch");
      }
      if (declaration.declaredOneCreativeResult !== true) {
        addIssue(
          issues,
          "schema.const",
          `${rootPath}.declaration.declaredOneCreativeResult`,
          "Agent declaration result-count mismatch",
        );
      }
      if (declaration.label !== expectedAgent.label) {
        addIssue(issues, "process.result_parity", `${rootPath}.declaration.label`, "Agent declaration label mismatch");
      }
    }
  }
};

const buildProcess = (
  evidence: ThoughtProcessEvidence,
  protocol: ThoughtProtocolBinding,
  agentLine: string,
  issues: ThoughtProvenanceIssue[],
): ThoughtProcess | undefined => {
  if (!isRecord(evidence) || (evidence.kind !== "manual" && evidence.kind !== "agent-run")) {
    addIssue(issues, "process.evidence", "process", "process evidence shape mismatch");
    return undefined;
  }
  const kind = evidence.kind;
  inspectObject(
    evidence,
    "process",
    kind === "manual"
      ? ["agentDeclaration", "kind", "modelDeclaration"]
      : ["agentDeclaration", "kind", "modelDeclaration", "transport"],
    [],
    issues,
  );
  validateDeclaration(evidence.agentDeclaration, "process.agentDeclaration", kind, false, issues);
  validateDeclaration(evidence.modelDeclaration, "process.modelDeclaration", kind, true, issues);
  if (kind === "manual") {
    return {
      agentDeclaration: { ...evidence.agentDeclaration },
      kind,
      modelDeclaration: { ...evidence.modelDeclaration },
    };
  }

  const transport = inspectObject(
    evidence.transport,
    "process.transport",
    ["resultEnvelope", "runReference"],
    ["adapter", "provider", "route"],
    issues,
  );
  if (!transport) return undefined;
  for (const field of ["adapter", "provider", "route"] as const) {
    if (transport[field] !== undefined) {
      validatePublicIdentifier(transport[field], `process.transport.${field}`, issues);
    }
  }
  const validRunReference = validatePublicIdentifier(
    transport.runReference,
    "process.transport.runReference",
    issues,
  );
  validateAgentResultEnvelope(
    transport.resultEnvelope,
    protocol,
    agentLine,
    evidence.agentDeclaration,
    evidence.modelDeclaration,
    issues,
  );
  if (!validRunReference) return undefined;
  let canonicalResult: string;
  try {
    canonicalResult = canonicalJsonStringify(transport.resultEnvelope as CanonicalJson);
  } catch (error) {
    addIssue(
      issues,
      "process.result_serialization",
      "process.transport.resultEnvelope",
      `Agent result canonicalization failed: ${error instanceof Error ? error.message : String(error)}`,
    );
    return undefined;
  }
  const resultEnvelopeKeccak256 = keccak256(encoder.encode(canonicalResult)) as `0x${string}`;
  const runIdHash = keccak256(encoder.encode(transport.runReference as string)) as `0x${string}`;
  return {
    agentDeclaration: { ...evidence.agentDeclaration },
    kind,
    modelDeclaration: { ...evidence.modelDeclaration },
    transport: {
      ...(typeof transport.adapter === "string" ? { adapter: transport.adapter } : {}),
      ...(typeof transport.provider === "string" ? { provider: transport.provider } : {}),
      resultEnvelopeKeccak256,
      ...(typeof transport.route === "string" ? { route: transport.route } : {}),
      runIdHash,
    },
  };
};

const compareTyped = (
  label: string,
  path: string,
  actual: unknown,
  expected: unknown,
  issues: ThoughtProvenanceIssue[],
): void => {
  if (expected !== undefined && actual !== expected) {
    addIssue(issues, "typed.mismatch", path, `typed ${label} mismatch`);
  }
};

const validateAttestationParity = (
  parsed: ThoughtProvenanceV2,
  provenanceHash: `0x${string}`,
  claim: ThoughtProvenanceAttestationFacts,
  issues: ThoughtProvenanceIssue[],
): void => {
  const base = "attestationClaim";
  validateChainId(claim.chainId, `${base}.chainId`, issues);
  validateAddress(claim.thoughtNft, `${base}.thoughtNft`, issues);
  validateAddress(claim.intendedMinter, `${base}.intendedMinter`, issues);
  for (const field of [
    "declaredAgentHash",
    "declaredModelHash",
    "protocolReleaseId",
    "provenanceHash",
    "runIdHash",
    "thoughtSpecHash",
    "thoughtSpecId",
    "workHash",
  ] as const) {
    validateBytes32(claim[field], `${base}.${field}`, issues, true);
  }
  const expectedAgentHash = keccak256(encoder.encode(parsed.process.agentDeclaration.label));
  const expectedModelHash = keccak256(encoder.encode(parsed.process.modelDeclaration.label));
  const comparisons: [string, unknown, unknown][] = [
    ["chainId", parsed.mintContext.chainId, claim.chainId],
    ["thoughtNft", parsed.mintContext.thoughtNft, claim.thoughtNft],
    ["intendedMinter", parsed.mintContext.intendedMinter, claim.intendedMinter],
    ["protocolReleaseId", parsed.protocol.protocolReleaseId, claim.protocolReleaseId],
    ["thoughtSpecId", parsed.protocol.thoughtSpecId, claim.thoughtSpecId],
    ["thoughtSpecHash", parsed.protocol.thoughtSpecHash, claim.thoughtSpecHash],
    ["workHash", parsed.work.workHash, claim.workHash],
    ["provenanceHash", provenanceHash, claim.provenanceHash],
    ["declaredAgentHash", expectedAgentHash, claim.declaredAgentHash],
    ["declaredModelHash", expectedModelHash, claim.declaredModelHash],
  ];
  for (const [field, actual, expected] of comparisons) {
    if (actual !== expected) {
      addIssue(
        issues,
        "attestation.mismatch",
        `${base}.${field}`,
        `attestation ${field} mismatch`,
      );
    }
  }
  if (parsed.process.kind !== "agent-run") {
    addIssue(
      issues,
      "attestation.process_kind",
      "process.kind",
      "attestation requires canonical Agent-run provenance",
    );
  } else if (parsed.process.transport.runIdHash !== claim.runIdHash) {
    addIssue(
      issues,
      "attestation.mismatch",
      `${base}.runIdHash`,
      "attestation runIdHash mismatch",
    );
  }
};

const issueMessages = (issues: readonly ThoughtProvenanceIssue[]): string[] =>
  issues.map(({ message }) => message);

export const buildThoughtProvenance = (input: ThoughtProvenanceBuildInput): ThoughtProvenanceV2 => {
  const selectedSpecIssues: ThoughtProvenanceIssue[] = [];
  validateSelectedSpecEvidence(input.protocol, input.selectedSpec, selectedSpecIssues);
  if (selectedSpecIssues.length > 0) {
    throw new Error(`selected spec verification failed: ${issueMessages(selectedSpecIssues).join("; ")}`);
  }

  const issues: ThoughtProvenanceIssue[] = [];
  validateProtocol(input.protocol, issues);
  validateMintContext(input.mintContext, issues);
  validateLine(input.promptLine, "work.promptLine", "prompt", issues);
  validateLine(input.agentLine, "work.agentLine", "agent", issues);
  const process = buildProcess(input.process, input.protocol, input.agentLine, issues);
  if (!process || issues.length > 0) {
    throw new Error(`provenance build failed: ${issueMessages(issues).join("; ")}`);
  }

  const provenance: ThoughtProvenanceV2 = {
    mintContext: { ...input.mintContext },
    process,
    protocol: { ...input.protocol },
    schema: THOUGHT_PROVENANCE_ID,
    work: {
      agentLine: input.agentLine,
      promptLine: input.promptLine,
      ...thoughtWorkHashes(input.promptLine, input.agentLine),
    },
  };
  const schemaIssues: ThoughtProvenanceIssue[] = [];
  validateShape(provenance, schemaIssues);
  if (schemaIssues.length > 0) {
    throw new Error(`built provenance failed schema validation: ${issueMessages(schemaIssues).join("; ")}`);
  }
  return provenance;
};

export const serializeThoughtProvenance = (provenance: ThoughtProvenanceV2): string => {
  const issues: ThoughtProvenanceIssue[] = [];
  validateShape(provenance, issues);
  if (issues.length > 0) throw new Error(issueMessages(issues).join("; "));
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
  selectedSpec?: ThoughtSelectedSpecEvidence,
): ProvenanceVerification => {
  const bytesCopy = Uint8Array.from(exactBytes);
  const issues: ThoughtProvenanceIssue[] = [];
  const declarations: string[] = [];
  const provenanceHash = thoughtProvenanceKeccak256(bytesCopy);
  if (bytesCopy.length === 0) {
    addIssue(issues, "byte.empty", "provenance", "provenance is empty");
  }
  if (bytesCopy.length > MAX_PROVENANCE_BYTES) {
    addIssue(
      issues,
      "byte.too_large",
      "provenance",
      `provenance is ${bytesCopy.length}/${MAX_PROVENANCE_BYTES} bytes`,
    );
  }
  if (bytesCopy[0] === 0xef && bytesCopy[1] === 0xbb && bytesCopy[2] === 0xbf) {
    addIssue(issues, "byte.bom", "provenance", "provenance has a BOM");
  }
  const first = bytesCopy[0];
  const last = bytesCopy[bytesCopy.length - 1];
  const isJsonWhitespace = (byte: number | undefined) =>
    byte === 0x09 || byte === 0x0a || byte === 0x0d || byte === 0x20;
  if (isJsonWhitespace(first) || isJsonWhitespace(last)) {
    addIssue(issues, "byte.outer_whitespace", "provenance", "provenance has outer JSON whitespace");
  }
  if (last === 0x0a) {
    addIssue(issues, "byte.final_lf", "provenance", "provenance has a final LF");
  }

  let parsed: ThoughtProvenanceV2 | undefined;
  try {
    const text = decoder.decode(bytesCopy);
    const unknownValue: unknown = JSON.parse(text);
    if (canonicalJsonStringify(unknownValue as CanonicalJson) !== text) {
      addIssue(
        issues,
        "jcs.noncanonical",
        "provenance",
        "provenance is not RFC 8785 canonical JSON",
      );
    }
    const shapeIssues: ThoughtProvenanceIssue[] = [];
    if (validateShape(unknownValue, shapeIssues)) parsed = unknownValue;
    issues.push(...shapeIssues);
  } catch (error) {
    addIssue(
      issues,
      "json.invalid",
      "provenance",
      `provenance parse failed: ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  if (parsed) {
    declarations.push(`Declared Agent: ${parsed.process.agentDeclaration.label} (unverified)`);
    declarations.push(
      `Declared Model: ${parsed.process.modelDeclaration.label} (unverified; source ${parsed.process.modelDeclaration.source})`,
    );
  }

  if (parsed && expectedProtocol) {
    const actual = canonicalJsonStringify(parsed.protocol as unknown as CanonicalJson);
    const expected = canonicalJsonStringify(expectedProtocol as unknown as CanonicalJson);
    if (actual !== expected) {
      addIssue(issues, "release.mismatch", "protocol", "protocol binding mismatch");
    }
  }

  if (selectedSpec) {
    if (parsed) validateSelectedSpecEvidence(parsed.protocol, selectedSpec, issues);
    else {
      addIssue(
        issues,
        "selected_spec.nonconforming",
        "selectedSpec",
        "selected spec evidence requires conforming provenance",
      );
    }
  }

  if (parsed && typedFacts) {
    const comparisons: [string, string, unknown, unknown][] = [
      ["promptLine", "work.promptLine", parsed.work.promptLine, typedFacts.promptLine],
      ["agentLine", "work.agentLine", parsed.work.agentLine, typedFacts.agentLine],
      ["declaredAgent", "process.agentDeclaration.label", parsed.process.agentDeclaration.label, typedFacts.declaredAgent],
      ["declaredModel", "process.modelDeclaration.label", parsed.process.modelDeclaration.label, typedFacts.declaredModel],
      ["workHash", "work.workHash", parsed.work.workHash, typedFacts.workHash],
      ["protocolReleaseId", "protocol.protocolReleaseId", parsed.protocol.protocolReleaseId, typedFacts.protocolReleaseId],
      ["manifestKeccak256", "protocol.manifestKeccak256", parsed.protocol.manifestKeccak256, typedFacts.manifestKeccak256],
      ["thoughtSpecId", "protocol.thoughtSpecId", parsed.protocol.thoughtSpecId, typedFacts.thoughtSpecId],
      ["thoughtSpecHash", "protocol.thoughtSpecHash", parsed.protocol.thoughtSpecHash, typedFacts.thoughtSpecHash],
      ["thoughtNft", "mintContext.thoughtNft", parsed.mintContext.thoughtNft, typedFacts.thoughtNft],
      ["intendedMinter", "mintContext.intendedMinter", parsed.mintContext.intendedMinter, typedFacts.intendedMinter],
      ["chainId", "mintContext.chainId", parsed.mintContext.chainId, typedFacts.chainId],
    ];
    if (parsed.process.kind === "agent-run") {
      comparisons.push(
        ["runIdHash", "process.transport.runIdHash", parsed.process.transport.runIdHash, typedFacts.runIdHash],
        [
          "resultEnvelopeKeccak256",
          "process.transport.resultEnvelopeKeccak256",
          parsed.process.transport.resultEnvelopeKeccak256,
          typedFacts.resultEnvelopeKeccak256,
        ],
      );
    } else if (typedFacts.runIdHash !== undefined || typedFacts.resultEnvelopeKeccak256 !== undefined) {
      addIssue(
        issues,
        "typed.process_kind",
        "process.kind",
        "typed Agent-run transport facts require Agent-run provenance",
      );
    }
    for (const [label, path, actual, expected] of comparisons) {
      compareTyped(label, path, actual, expected, issues);
    }
    if (typedFacts.provenanceHash !== undefined && provenanceHash !== typedFacts.provenanceHash) {
      addIssue(issues, "typed.mismatch", "provenanceHash", "typed provenanceHash mismatch");
    }
    if (typedFacts.attestationClaim !== undefined) {
      validateAttestationParity(parsed, provenanceHash, typedFacts.attestationClaim, issues);
    }
  }

  return {
    conforming: issues.length === 0,
    exactBytes: bytesCopy,
    provenanceHash,
    parsed,
    issues,
    errors: issueMessages(issues),
    declarations,
  };
};

export const verifyThoughtProvenance = (provenance: ThoughtProvenanceV2): string[] =>
  verifyProvenance(encoder.encode(canonicalJsonStringify(provenance as unknown as CanonicalJson))).errors;

export const buildVerifiedCanonicalProvenance = (
  input: ThoughtProvenanceBuildInput,
  typedFacts: ThoughtTypedFacts = {},
): VerifiedCanonicalThoughtProvenance => {
  const provenance = buildThoughtProvenance(input);
  const canonicalJson = serializeThoughtProvenance(provenance);
  const exactBytes = encoder.encode(canonicalJson);
  const provenanceHash = thoughtProvenanceKeccak256(exactBytes);
  const verification = verifyProvenance(
    exactBytes,
    input.protocol,
    {
      promptLine: input.promptLine,
      agentLine: input.agentLine,
      declaredAgent: provenance.process.agentDeclaration.label,
      declaredModel: provenance.process.modelDeclaration.label,
      workHash: provenance.work.workHash as `0x${string}`,
      provenanceHash,
      protocolReleaseId: input.protocol.protocolReleaseId,
      manifestKeccak256: input.protocol.manifestKeccak256,
      thoughtSpecId: input.protocol.thoughtSpecId,
      thoughtSpecHash: input.protocol.thoughtSpecHash,
      thoughtNft: input.mintContext.thoughtNft,
      intendedMinter: input.mintContext.intendedMinter,
      chainId: input.mintContext.chainId,
      ...(provenance.process.kind === "agent-run"
        ? {
          runIdHash: provenance.process.transport.runIdHash,
          resultEnvelopeKeccak256: provenance.process.transport.resultEnvelopeKeccak256,
        }
        : {}),
      ...typedFacts,
    },
    input.selectedSpec,
  );
  if (!verification.conforming || !verification.parsed) {
    throw new Error(`built provenance failed verification: ${verification.errors.join("; ")}`);
  }
  return { provenance, canonicalJson, exactBytes, provenanceHash, verification };
};
