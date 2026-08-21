import crypto from "node:crypto";
import fs from "node:fs";

export const PROTOCOL_RECEIPT_ENVELOPE_SCHEMA = "inshell.deployment.protocol-receipt-envelope.v1";
export const PATH_PHASE_A_RECEIPT_TYPE = "inshell.path.phase-a.receipt.v1";
export const PATH_PHASE_A_SCHEMA = "inshell.path.deployment.phase-a.receipt.v1";
export const THOUGHT_PHASE_INPUT_SCHEMA = "inshell.thought.deployment.phase.input.v1";
export const THOUGHT_RECEIPT_SCHEMA = "inshell.thought.deployment.receipt.v1";
export const PATH_PHASE_B_INPUT_SCHEMA = "inshell.path.deployment.phase-b.input.v1";

export const PINNED_PATH_RELEASE = Object.freeze({
  repository: "https://github.com/inshell-art/path.git",
  releaseTag: "v0.5.0",
  gitCommit: "085cfc084b0e568740e0da639e968eb535f7e5c8",
  artifactManifestSha256: "a81355b459b40faea894cf1dfb7f484765a7ec62672039dd62d58a3a52849921",
});

export const PINNED_THOUGHT_RELEASE = Object.freeze({
  artifactId: "thought-v2-canonical-portable-release-20260807-r2",
  manifestSha256: "7cf7965edb3de6421c79d9c08f0781cabb78ea675bad354847b56ec8f19306cc",
  publicationCommit: "d29ddbfe76ff94c726b0786e43e61519c4087aab",
  sourceTag: "thought-v2-canonical-portable-release-20260807-r2",
});

const ADDRESS = /^0x[0-9a-fA-F]{40}$/;
const NONZERO_ADDRESS = /^0x(?!0{40}$)[0-9a-fA-F]{40}$/;
const BYTES32 = /^0x[0-9a-fA-F]{64}$/;
const SHA256 = /^[0-9a-f]{64}$/;
const COMMIT = /^[0-9a-f]{40}$/;
const CAMPAIGN_ID = /^[a-z0-9][a-z0-9._-]{0,127}$/;
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
const ENVIRONMENT_CHAINS = Object.freeze({
  "internal-sepolia": 11155111,
  "public-beta-sepolia": 11155111,
  mainnet: 1,
});
const PATH_PHASE_A_ACTIONS = Object.freeze([
  "SET_THOUGHT_MOVEMENT",
  "FREEZE_THOUGHT_MOVEMENT",
  "SET_WILL_MOVEMENT",
  "FREEZE_WILL_MOVEMENT",
  "SET_AWA_MOVEMENT",
  "FREEZE_AWA_MOVEMENT",
  "DEPLOY_AND_WIRE_PUBLIC_SALE",
  "FREEZE_PUBLIC_MINTER",
  "GRANT_FINAL_ROLES",
  "RENOUNCE_DEPLOYER_ADMIN",
]);
const ENVELOPE_KEYS = Object.freeze([
  "schema_version", "receipt_type", "campaign_id", "phase_id", "environment",
  "chain_id", "input_receipt_sha256", "protocol_payload",
]);
const PROTOCOL_PAYLOAD_KEYS = Object.freeze([
  "owner", "schema_id", "canonicalization", "sha256", "payload",
]);
const PATH_PAYLOAD_KEYS = Object.freeze([
  "receiptVersion", "kind", "status", "campaignId", "environment", "chainId",
  "pathRelease", "sourceBundleDigest", "deployer", "pathNft", "retainedAuthority",
  "movementStates", "publicExposure", "observedAtBlock",
]);

const fail = (message) => { throw new Error(message); };
const requireObject = (value, label) => {
  if (!value || typeof value !== "object" || Array.isArray(value)) fail(`${label} must be an object`);
  return value;
};
const requireExactKeys = (value, keys, label) => {
  requireObject(value, label);
  const actual = Object.keys(value).sort();
  const wanted = [...keys].sort();
  if (actual.length !== wanted.length || actual.some((key, index) => key !== wanted[index])) {
    fail(`${label} fields mismatch`);
  }
};
const requireString = (value, label) => {
  if (typeof value !== "string" || value.length === 0) fail(`${label} must be a non-empty string`);
  return value;
};
const requireMatch = (value, pattern, label) => {
  requireString(value, label);
  if (!pattern.test(value)) fail(`${label} is malformed`);
  return value;
};
const sameAddress = (left, right) => (
  typeof left === "string" && typeof right === "string" && left.toLowerCase() === right.toLowerCase()
);
const requirePositiveUint = (value, label) => {
  if ((typeof value !== "string" && typeof value !== "number") || !/^[1-9][0-9]*$/.test(String(value))) {
    fail(`${label} must be a positive unsigned integer`);
  }
  if (typeof value === "number" && !Number.isSafeInteger(value)) fail(`${label} numeric value must be an IEEE-754 safe integer`);
  return BigInt(value);
};

function assertWellFormedUnicode(value, label) {
  for (let index = 0; index < value.length; index += 1) {
    const unit = value.charCodeAt(index);
    if (unit >= 0xd800 && unit <= 0xdbff) {
      const next = value.charCodeAt(index + 1);
      if (!(next >= 0xdc00 && next <= 0xdfff)) fail(`${label} contains an unpaired surrogate`);
      index += 1;
    } else if (unit >= 0xdc00 && unit <= 0xdfff) {
      fail(`${label} contains an unpaired surrogate`);
    }
  }
}

function jcsSerialize(value, label) {
  if (value === null) return "null";
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number") {
    if (!Number.isSafeInteger(value)) fail(`${label} must be an IEEE-754 safe integer; encode larger quantities as decimal strings`);
    return JSON.stringify(value);
  }
  if (typeof value === "string") {
    assertWellFormedUnicode(value, label);
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((entry, index) => jcsSerialize(entry, `${label}[${index}]`)).join(",")}]`;
  }
  if (typeof value === "object") {
    const entries = Object.keys(value).sort().map((key) => {
      assertWellFormedUnicode(key, `${label} key`);
      const entry = value[key];
      if (entry === undefined || typeof entry === "function" || typeof entry === "symbol" || typeof entry === "bigint") {
        fail(`${label}.${key} is not an I-JSON value`);
      }
      return `${JSON.stringify(key)}:${jcsSerialize(entry, `${label}.${key}`)}`;
    });
    return `{${entries.join(",")}}`;
  }
  fail(`${label} is not an I-JSON value`);
}

export const jcsCanonicalize = (value) => jcsSerialize(value, "JSON value");
export const sha256Bytes = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");
export const sha256File = (file) => sha256Bytes(fs.readFileSync(file));
export const sha256Jcs = (value) => sha256Bytes(Buffer.from(jcsCanonicalize(value), "utf8"));

export function parseJsonStrict(sourceValue, label = "JSON", { rejectFloatingPointSyntax = true } = {}) {
  const source = String(sourceValue);
  let index = 0;
  const parseFail = (message) => fail(`${label} is invalid: ${message} at byte ${index}`);
  const whitespace = () => {
    while (/[\u0009\u000a\u000d\u0020]/.test(source[index] ?? "")) index += 1;
  };
  const parseString = () => {
    const start = index;
    if (source[index] !== '"') parseFail("expected string");
    index += 1;
    while (index < source.length) {
      const character = source[index];
      if (character === '"') {
        index += 1;
        try { return JSON.parse(source.slice(start, index)); } catch { parseFail("malformed string"); }
      }
      if (character === "\\") {
        index += 1;
        if (source[index] === "u") {
          if (!/^[0-9a-fA-F]{4}$/.test(source.slice(index + 1, index + 5))) parseFail("malformed Unicode escape");
          index += 5;
        } else if ('"\\/bfnrt'.includes(source[index] ?? "")) index += 1;
        else parseFail("malformed escape");
      } else {
        if (character.charCodeAt(0) < 0x20) parseFail("unescaped control character");
        index += 1;
      }
    }
    parseFail("unterminated string");
  };
  const parseValue = () => {
    whitespace();
    const character = source[index];
    if (character === '"') return parseString();
    if (character === "{") {
      index += 1;
      const object = Object.create(null);
      const keys = new Set();
      whitespace();
      if (source[index] === "}") { index += 1; return object; }
      while (true) {
        whitespace();
        const key = parseString();
        if (keys.has(key)) parseFail(`duplicate object key ${JSON.stringify(key)}`);
        keys.add(key);
        whitespace();
        if (source[index] !== ":") parseFail("expected colon");
        index += 1;
        object[key] = parseValue();
        whitespace();
        if (source[index] === "}") { index += 1; return object; }
        if (source[index] !== ",") parseFail("expected comma or closing brace");
        index += 1;
      }
    }
    if (character === "[") {
      index += 1;
      const array = [];
      whitespace();
      if (source[index] === "]") { index += 1; return array; }
      while (true) {
        array.push(parseValue());
        whitespace();
        if (source[index] === "]") { index += 1; return array; }
        if (source[index] !== ",") parseFail("expected comma or closing bracket");
        index += 1;
      }
    }
    for (const [token, value] of [["true", true], ["false", false], ["null", null]]) {
      if (source.startsWith(token, index)) { index += token.length; return value; }
    }
    const match = source.slice(index).match(/^-?(?:0|[1-9][0-9]*)(?:\.[0-9]+)?(?:[eE][+-]?[0-9]+)?/);
    if (match) {
      index += match[0].length;
      if (rejectFloatingPointSyntax && /[.eE]/.test(match[0])) parseFail("floating-point JSON numbers are forbidden");
      const value = Number(match[0]);
      if (!Number.isFinite(value)) parseFail("non-finite number");
      return value;
    }
    parseFail("unexpected token");
  };
  const value = parseValue();
  whitespace();
  if (index !== source.length) parseFail("trailing content");
  return value;
}

export function validatePathPhaseAPayload(payloadValue, expected) {
  const payload = requireObject(payloadValue, "PATH Phase A payload");
  const exp = requireObject(expected, "expected PATH Phase A binding");
  requireExactKeys(payload, PATH_PAYLOAD_KEYS, "PATH Phase A payload");
  if (payload.receiptVersion !== "1" || payload.kind !== "path_campaign_phase_a_receipt"
      || payload.status !== "phase_a_complete") fail("PATH Phase A payload identity/status mismatch");
  if (payload.campaignId !== exp.campaignId) fail("PATH Phase A campaign mismatch");
  if (payload.environment !== exp.environment) fail("PATH Phase A environment mismatch");
  const expectedChain = ENVIRONMENT_CHAINS[exp.environment];
  if (!expectedChain || requirePositiveUint(payload.chainId, "PATH Phase A chainId") !== BigInt(expectedChain)
      || BigInt(exp.chainId) !== BigInt(expectedChain)) fail("PATH Phase A chain mismatch");

  const release = requireObject(payload.pathRelease, "pathRelease");
  requireExactKeys(release, ["repository", "releaseTag", "gitCommit", "artifactManifestSha256"], "pathRelease");
  for (const [key, value] of Object.entries(PINNED_PATH_RELEASE)) {
    if (release[key] !== value) fail(`wrong PATH release: ${key}`);
  }
  requireMatch(release.gitCommit, COMMIT, "pathRelease.gitCommit");
  requireMatch(release.artifactManifestSha256, SHA256, "pathRelease.artifactManifestSha256");
  requireMatch(payload.sourceBundleDigest, SHA256, "sourceBundleDigest");
  if (payload.sourceBundleDigest !== requireMatch(exp.pathBundleDigest, SHA256, "expected PATH bundle digest")) {
    fail("PATH Phase A bundle digest mismatch");
  }
  requireMatch(payload.deployer, NONZERO_ADDRESS, "deployer");

  const pathNft = requireObject(payload.pathNft, "pathNft");
  requireExactKeys(pathNft, ["address", "deploymentTx", "blockNumber", "runtimeBytecodeHash"], "pathNft");
  requireMatch(pathNft.address, NONZERO_ADDRESS, "pathNft.address");
  requireMatch(exp.pathNft, NONZERO_ADDRESS, "expected PathNFT");
  if (!sameAddress(pathNft.address, exp.pathNft)) fail("PATH Phase A PathNFT mismatch");
  requireMatch(pathNft.deploymentTx, BYTES32, "pathNft.deploymentTx");
  const deploymentBlock = requirePositiveUint(pathNft.blockNumber, "pathNft.blockNumber");
  requireMatch(pathNft.runtimeBytecodeHash, BYTES32, "pathNft.runtimeBytecodeHash");

  const authority = requireObject(payload.retainedAuthority, "retainedAuthority");
  requireExactKeys(authority, ["holder", "signerRef", "role", "permittedRemainingActions", "handoffComplete"], "retainedAuthority");
  requireMatch(authority.holder, NONZERO_ADDRESS, "retainedAuthority.holder");
  requireMatch(exp.retainedAuthority, NONZERO_ADDRESS, "expected retained authority");
  if (!sameAddress(authority.holder, exp.retainedAuthority)) fail("unexpected PATH retained authority");
  requireString(authority.signerRef, "retainedAuthority.signerRef");
  if (authority.role !== "DEFAULT_ADMIN_ROLE" || authority.handoffComplete !== false) {
    fail("PATH Phase B authority was not retained");
  }
  if (!Array.isArray(authority.permittedRemainingActions)
      || JSON.stringify(authority.permittedRemainingActions) !== JSON.stringify(PATH_PHASE_A_ACTIONS)) {
    fail("PATH retained action set mismatch");
  }

  requireExactKeys(payload.movementStates, ["THOUGHT", "WILL", "AWA"], "movementStates");
  for (const movementName of ["THOUGHT", "WILL", "AWA"]) {
    const state = payload.movementStates[movementName];
    requireExactKeys(state, ["minter", "quota", "frozen"], `movementStates.${movementName}`);
    if (!sameAddress(state.minter, ZERO_ADDRESS) || String(state.quota) !== "0" || state.frozen !== false) {
      fail(`PATH ${movementName} movement must be unset, zero quota, and unfrozen`);
    }
  }

  const exposure = payload.publicExposure;
  requireExactKeys(exposure, ["pathPulseAdapter", "pulseAuction", "openTime", "publicMinter", "publicMinterFrozen", "publicMintEnabled"], "publicExposure");
  if (exposure.pathPulseAdapter !== null || exposure.pulseAuction !== null || exposure.openTime !== null
      || !sameAddress(exposure.publicMinter, ZERO_ADDRESS) || exposure.publicMinterFrozen !== false
      || exposure.publicMintEnabled !== false) fail("PATH Phase A public exposure must remain absent and unfrozen");
  if (requirePositiveUint(payload.observedAtBlock, "observedAtBlock") < deploymentBlock) {
    fail("PATH Phase A observation predates deployment");
  }
  return payload;
}

export function validateProtocolReceiptEnvelope(envelopeValue, expected) {
  const envelope = requireObject(envelopeValue, "protocol receipt envelope");
  const exp = requireObject(expected, "expected envelope binding");
  requireExactKeys(envelope, ENVELOPE_KEYS, "protocol receipt envelope");
  if (envelope.schema_version !== 1 || envelope.receipt_type !== exp.receiptType
      || envelope.phase_id !== exp.phaseId) fail("protocol receipt envelope identity mismatch");
  if (!CAMPAIGN_ID.test(envelope.campaign_id) || envelope.campaign_id !== exp.campaignId) {
    fail("protocol receipt envelope campaign mismatch");
  }
  if (envelope.environment !== exp.environment || envelope.chain_id !== exp.chainId
      || !Number.isSafeInteger(envelope.chain_id) || envelope.chain_id < 1) {
    fail("protocol receipt envelope environment/chain mismatch");
  }
  const expectedInputDigest = exp.inputReceiptSha256 ?? "";
  if (envelope.input_receipt_sha256 !== expectedInputDigest
      || (expectedInputDigest !== "" && !SHA256.test(expectedInputDigest))) {
    fail("protocol receipt envelope prior linkage mismatch");
  }
  const protocol = envelope.protocol_payload;
  requireExactKeys(protocol, PROTOCOL_PAYLOAD_KEYS, "protocol_payload");
  if (protocol.owner !== exp.owner || protocol.schema_id !== exp.schemaId
      || protocol.canonicalization !== "rfc8785-jcs") fail("protocol payload identity mismatch");
  requireMatch(protocol.sha256, SHA256, "protocol_payload.sha256");
  const actualPayloadSha256 = sha256Jcs(protocol.payload);
  if (protocol.sha256 !== actualPayloadSha256) fail("protocol payload JCS SHA-256 mismatch");
  return { envelope, payload: protocol.payload, payloadSha256: actualPayloadSha256 };
}

export function validatePathPhaseAEnvelope(envelopeValue, expected) {
  const validated = validateProtocolReceiptEnvelope(envelopeValue, {
    ...expected,
    receiptType: PATH_PHASE_A_RECEIPT_TYPE,
    phaseId: "path-a",
    inputReceiptSha256: "",
    owner: "path",
    schemaId: PATH_PHASE_A_SCHEMA,
  });
  validatePathPhaseAPayload(validated.payload, expected);
  return validated;
}

export function validatePathEnvelopeFile(file, expectedEnvelopeSha256, expected) {
  const bytes = fs.readFileSync(file);
  const envelopeSha256 = sha256Bytes(bytes);
  if (envelopeSha256 !== requireMatch(expectedEnvelopeSha256, SHA256, "expected PATH envelope SHA-256")) {
    fail("PATH Phase A envelope SHA-256 mismatch");
  }
  const validated = validatePathPhaseAEnvelope(parseJsonStrict(bytes.toString("utf8"), "PATH Phase A envelope"), expected);
  return { ...validated, envelopeSha256 };
}

export function validateThoughtReceiptForPathPhaseB(receiptValue, expected) {
  const receipt = requireObject(receiptValue, "THOUGHT receipt payload");
  const exp = requireObject(expected, "expected THOUGHT binding");
  requireExactKeys(receipt, [
    "schema", "campaignId", "phase", "environment", "chainId", "status",
    "consumedPathPhaseAReceiptSha256", "consumedPathPhaseA", "pathNft",
    "thoughtRelease", "bundleDigest", "contracts", "deployments", "registry",
    "compatibility", "authorities", "approvedPathIntegration",
    "pathMutationPerformed", "pathMutationOwner", "verification",
  ], "THOUGHT receipt payload");
  if (receipt.schema !== THOUGHT_RECEIPT_SCHEMA || receipt.phase !== "thought" || receipt.status !== "complete") {
    fail("THOUGHT receipt is not complete");
  }
  if (receipt.campaignId !== exp.campaignId || receipt.environment !== exp.environment
      || receipt.chainId !== exp.chainId || !Number.isSafeInteger(receipt.chainId)
      || receipt.chainId < 1) fail("THOUGHT receipt campaign/environment/chain mismatch");
  const consumed = requireObject(receipt.consumedPathPhaseA, "consumedPathPhaseA");
  requireExactKeys(consumed, ["envelopeSha256", "payloadSha256"], "consumedPathPhaseA");
  requireMatch(consumed.envelopeSha256, SHA256, "consumedPathPhaseA.envelopeSha256");
  requireMatch(consumed.payloadSha256, SHA256, "consumedPathPhaseA.payloadSha256");
  if (consumed.envelopeSha256 !== requireMatch(exp.pathPhaseAEnvelopeSha256, SHA256, "expected PATH envelope SHA-256")
      || consumed.payloadSha256 !== requireMatch(exp.pathPhaseAPayloadSha256, SHA256, "expected PATH payload SHA-256")
      || receipt.consumedPathPhaseAReceiptSha256 !== consumed.envelopeSha256) {
    fail("THOUGHT receipt PATH link mismatch");
  }
  requireMatch(receipt.pathNft, ADDRESS, "THOUGHT receipt PathNFT");
  if (!sameAddress(receipt.pathNft, requireMatch(exp.pathNft, ADDRESS, "expected PathNFT"))) {
    fail("THOUGHT receipt PathNFT mismatch");
  }
  const release = requireObject(receipt.thoughtRelease, "thoughtRelease");
  requireExactKeys(release, Object.keys(PINNED_THOUGHT_RELEASE), "thoughtRelease");
  for (const [key, value] of Object.entries(PINNED_THOUGHT_RELEASE)) {
    if (release[key] !== value) fail(`wrong THOUGHT release: ${key}`);
  }
  requireMatch(receipt.bundleDigest, BYTES32, "THOUGHT bundleDigest");
  if (receipt.bundleDigest.toLowerCase()
      !== requireMatch(exp.thoughtBundleDigest, BYTES32, "expected THOUGHT bundle digest").toLowerCase()) {
    fail("THOUGHT bundle digest mismatch");
  }
  const contracts = requireObject(receipt.contracts, "contracts");
  const contractNames = [
    "thoughtSpecRegistry", "protocolRegistry", "glyphDataPointer", "thoughtRenderer",
    "creationAttestationVerifier", "thoughtNft",
  ];
  requireExactKeys(contracts, contractNames, "contracts");
  for (const name of contractNames) requireMatch(contracts[name], ADDRESS, `contracts.${name}`);
  if (!Array.isArray(receipt.deployments) || receipt.deployments.length !== 6) {
    fail("THOUGHT deployment evidence is incomplete");
  }
  for (const name of Object.keys(contracts)) {
    const deployment = receipt.deployments.find((entry) => entry?.name === name);
    if (deployment) requireExactKeys(deployment, [
      "name", "address", "transaction", "block", "creationBytecodeHash", "runtimeBytecodeHash",
    ], `deployments.${name}`);
    if (!deployment || !sameAddress(deployment.address, contracts[name])
        || !BYTES32.test(deployment.transaction) || !Number.isSafeInteger(deployment.block)
        || deployment.block <= 0 || !BYTES32.test(deployment.creationBytecodeHash)
        || !BYTES32.test(deployment.runtimeBytecodeHash)) {
      fail(`THOUGHT deployment evidence mismatch: ${name}`);
    }
  }
  const registry = requireObject(receipt.registry, "registry");
  requireExactKeys(registry, [
    "thoughtSpecId", "thoughtSpecHash", "protocolReleaseId", "protocolManifestHash", "exactBytesVerified",
  ], "registry");
  if (registry.thoughtSpecId !== "0x0a33583e39050834eb77372ea8b41ceded8fe4bb47c31fe1a72ebb880351b410"
      || registry.thoughtSpecHash !== "0xb2b0a167678816a7ae9dc9098b0d6a6852c0dc95feb59f9581de75bd2cc2231f"
      || registry.protocolReleaseId !== exp.protocolReleaseId
      || registry.protocolManifestHash !== exp.protocolManifestHash
      || registry.exactBytesVerified !== true) fail("THOUGHT registry evidence mismatch");
  const compatibility = requireObject(receipt.compatibility, "compatibility");
  requireExactKeys(compatibility, [
    "pathNftImmutable", "rendererIdHash", "metadataProfileIdHash", "workProfileIdHash",
    "contextProfileIdHash", "creationAttestationProfileId",
  ], "compatibility");
  if (!sameAddress(compatibility.pathNftImmutable, receipt.pathNft)
      || compatibility.rendererIdHash !== "0x01982604c90acf1ca63020e0c3761b25d8dc8fc3c267d27ace14cb0d2c813d73"
      || compatibility.metadataProfileIdHash !== "0x4cefae9cf44cc61bc8ec16e266ecb31f53e634834fe5975cc564ae9dfc51858b"
      || compatibility.workProfileIdHash !== "0x2bf311e6034eb35e6d1f7bd92894012ee7e528609830cb3b28df1ce5dd82f85a"
      || compatibility.contextProfileIdHash !== "0x9894359f9294f4b3a871442b19d851203138fad4a648c16f62fc04f55dff02b8"
      || compatibility.creationAttestationProfileId !== "0x5759a606b1b0b1ba997b2d7b851c7e2022ed8ff4e0238e55e29ad8b36ce9194a") {
    fail("THOUGHT immutable/profile compatibility mismatch");
  }
  const authorities = requireObject(receipt.authorities, "authorities");
  requireExactKeys(authorities, [
    "registryOwner", "protocolRegistryOwner", "attestationVerifierOwner",
    "attestationAuthority", "attestationAuthorityEpoch",
  ], "authorities");
  if (!sameAddress(authorities.registryOwner, requireMatch(exp.registryOwner, ADDRESS, "expected registry owner"))
      || !sameAddress(authorities.protocolRegistryOwner, exp.registryOwner)
      || !sameAddress(authorities.attestationVerifierOwner, exp.registryOwner)
      || !sameAddress(authorities.attestationAuthority, requireMatch(exp.attestationAuthority, ADDRESS, "expected attestation authority"))
      || authorities.attestationAuthorityEpoch !== 1) fail("unexpected THOUGHT authority state");
  requireExactKeys(receipt.approvedPathIntegration, ["movement", "quota", "thoughtNft"], "approvedPathIntegration");
  if (!sameAddress(receipt.approvedPathIntegration?.thoughtNft, contracts.thoughtNft)
      || receipt.approvedPathIntegration?.movement !== "THOUGHT"
      || receipt.approvedPathIntegration?.quota !== 1
      || receipt.pathMutationPerformed !== false || receipt.pathMutationOwner !== "PATH_PHASE_B") {
    fail("THOUGHT receipt PATH integration boundary mismatch");
  }
  requireExactKeys(receipt.verification, ["overall", "registry", "immutableDependencies", "profiles"], "verification");
  if (receipt.verification?.overall !== "PASS" || receipt.verification?.registry !== "PASS"
      || receipt.verification?.immutableDependencies !== "PASS"
      || receipt.verification?.profiles !== "PASS") fail("THOUGHT receipt verification is incomplete");
  return receipt;
}

export function makeThoughtReceiptEnvelope(thoughtPayload, expected) {
  validateThoughtReceiptForPathPhaseB(thoughtPayload, expected);
  const payloadSha256 = sha256Jcs(thoughtPayload);
  return {
    schema_version: 1,
    receipt_type: THOUGHT_RECEIPT_SCHEMA,
    campaign_id: thoughtPayload.campaignId,
    phase_id: "thought",
    environment: thoughtPayload.environment,
    chain_id: thoughtPayload.chainId,
    input_receipt_sha256: expected.pathPhaseAEnvelopeSha256,
    protocol_payload: {
      owner: "thought",
      schema_id: THOUGHT_RECEIPT_SCHEMA,
      canonicalization: "rfc8785-jcs",
      sha256: payloadSha256,
      payload: thoughtPayload,
    },
  };
}

export function validateThoughtEnvelope(envelopeValue, expected) {
  const validated = validateProtocolReceiptEnvelope(envelopeValue, {
    ...expected,
    receiptType: THOUGHT_RECEIPT_SCHEMA,
    phaseId: "thought",
    inputReceiptSha256: expected.pathPhaseAEnvelopeSha256,
    owner: "thought",
    schemaId: THOUGHT_RECEIPT_SCHEMA,
  });
  validateThoughtReceiptForPathPhaseB(validated.payload, expected);
  return validated;
}

export function makePathPhaseBInput(thoughtEnvelope, expected) {
  const { payload: receipt, payloadSha256 } = validateThoughtEnvelope(thoughtEnvelope, expected);
  return {
    schema: PATH_PHASE_B_INPUT_SCHEMA,
    campaignId: receipt.campaignId,
    environment: receipt.environment,
    chainId: receipt.chainId,
    pathPhaseAEnvelopeSha256: receipt.consumedPathPhaseA.envelopeSha256,
    pathPhaseAPayloadSha256: receipt.consumedPathPhaseA.payloadSha256,
    thoughtEnvelopeSha256: requireMatch(expected.thoughtEnvelopeSha256, SHA256, "expected THOUGHT envelope SHA-256"),
    thoughtPayloadSha256: payloadSha256,
    pathNft: receipt.pathNft,
    thoughtNft: receipt.contracts.thoughtNft,
    thoughtMovement: { name: "THOUGHT", quota: 1 },
  };
}

export function makeThoughtCampaignPhaseDescriptor({ bundleId, environment, chainId }) {
  if (!CAMPAIGN_ID.test(bundleId)) fail("campaign phase bundle ID is malformed");
  if (!Object.hasOwn(ENVIRONMENT_CHAINS, environment)
      || ENVIRONMENT_CHAINS[environment] !== chainId) fail("campaign phase environment/chain mismatch");
  return {
    schema_version: 1,
    bundle_id: bundleId,
    phase_id: "thought",
    environment,
    chain_id: chainId,
    entrypoints: {
      preflight: "bin/preflight",
      execute: "bin/execute",
      postconditions: "bin/postconditions",
    },
    input_receipt_type: PATH_PHASE_A_RECEIPT_TYPE,
    output_receipt_type: THOUGHT_RECEIPT_SCHEMA,
    allowed_environment_variables: [
      "THOUGHT_RPC_URL",
      "THOUGHT_DEPLOY_KEYSTORE",
      "THOUGHT_DEPLOY_PASSWORD_FILE",
      "THOUGHT_ADMIN_LEDGER_DERIVATION_PATH",
    ],
    resume_checkpoints: [
      "thought-spec-registry-deployed",
      "thought-spec-registered",
      "protocol-registry-deployed",
      "registries-registered",
      "glyph-data-pointer-deployed",
      "renderer-ready",
      "attestation-verifier-deployed",
      "thought-deployed",
    ].map((checkpointId) => ({
      checkpoint_id: checkpointId,
      verifier: "bin/verify-checkpoint",
      entrypoint: "bin/resume",
    })),
  };
}
