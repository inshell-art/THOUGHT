import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import ts from "typescript";
import { TypedDataEncoder, Wallet, id, keccak256, toUtf8Bytes, verifyTypedData } from "ethers";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const protocolRoot = path.join(root, "protocol");
const releaseRoot = path.join(protocolRoot, "releases", "v2");
const fixtureRoot = path.join(releaseRoot, "renderer", "fixtures");
const conformanceRoot = path.join(releaseRoot, "conformance");
const attestationFixtureRoot = path.join(releaseRoot, "attestation", "fixtures");
const tempRoot = path.join(root, ".tmp", "thought-v2-protocol-build");
const generatedRoot = path.join(root, "src", "generated");

const deepSort = (value) => {
  if (Array.isArray(value)) return value.map(deepSort);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, deepSort(value[key])]));
  }
  return value;
};

const canonicalJson = (value) => `${JSON.stringify(deepSort(value), null, 2)}\n`;
const compactCanonicalJson = (value) => JSON.stringify(deepSort(value));
const write = (file, contents) => {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, contents);
};
const writeJson = (file, value) => write(file, canonicalJson(value));
const writeAtomic = (file, contents) => {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const temporary = `${file}.tmp`;
  fs.writeFileSync(temporary, contents);
  fs.renameSync(temporary, file);
};
const bytes = (file) => fs.readFileSync(file);
const sha256 = (data) => crypto.createHash("sha256").update(data).digest("hex");
const byteHex = (value) => `0x${Buffer.from(value, "utf8").toString("hex")}`;
const bytesHex = (value) => `0x${Buffer.from(value).toString("hex")}`;

const transpile = (input, output, replacements = []) => {
  const source = fs.readFileSync(input, "utf8");
  let compiled = ts.transpileModule(source, {
    fileName: input,
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ES2022,
      moduleResolution: ts.ModuleResolutionKind.Bundler,
      verbatimModuleSyntax: true,
    },
  }).outputText;
  for (const [from, to] of replacements) compiled = compiled.replaceAll(from, to);
  write(output, compiled);
};

fs.rmSync(tempRoot, { recursive: true, force: true });
fs.mkdirSync(tempRoot, { recursive: true });
transpile(path.join(root, "src", "thought-v2-protocol.ts"), path.join(tempRoot, "thought-v2-protocol.mjs"));
transpile(
  path.join(root, "src", "thought-v2-renderer.ts"),
  path.join(tempRoot, "thought-v2-renderer.mjs"),
  [["./thought-v2-protocol", "./thought-v2-protocol.mjs"]],
);
transpile(
  path.join(root, "src", "thought-v2-token-uri.ts"),
  path.join(tempRoot, "thought-v2-token-uri.mjs"),
  [
    ["./thought-v2-protocol", "./thought-v2-protocol.mjs"],
    ["./thought-v2-renderer", "./thought-v2-renderer.mjs"],
  ],
);
transpile(
  path.join(root, "src", "thought-v2-creation-attestation.ts"),
  path.join(tempRoot, "thought-v2-creation-attestation.mjs"),
  [["./thought-v2-protocol", "./thought-v2-protocol.mjs"]],
);
transpile(
  path.join(root, "src", "thought-v2-provenance.ts"),
  path.join(tempRoot, "thought-v2-provenance.mjs"),
  [["./thought-v2-protocol", "./thought-v2-protocol.mjs"]],
);
const protocol = await import(`${pathToFileURL(path.join(tempRoot, "thought-v2-protocol.mjs")).href}?v=1`);
const renderer = await import(`${pathToFileURL(path.join(tempRoot, "thought-v2-renderer.mjs")).href}?v=1`);
const tokenUri = await import(`${pathToFileURL(path.join(tempRoot, "thought-v2-token-uri.mjs")).href}?v=1`);
const attestation = await import(
  `${pathToFileURL(path.join(tempRoot, "thought-v2-creation-attestation.mjs")).href}?v=1`
);
const provenance = await import(
  `${pathToFileURL(path.join(tempRoot, "thought-v2-provenance.mjs")).href}?v=1`
);

const validCases = [
  ["one-byte-cycle", "a", "b"],
  ["source-63-bytes", "p".repeat(63), "a".repeat(63)],
  [
    "source-64-bytes",
    "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ!?",
    "?!ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789",
  ],
  [
    "direction-diagnostic-64-bytes",
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/",
    "/+9876543210zyxwvutsrqponmlkjihgfedcbaZYXWVUTSRQPONMLKJIHGFEDCBA",
  ],
  ["ascii", "quiet signal", "quiet return"],
  ["ascii-punctuation", "!#$%()*+,-./:;=?@[]^_`{|}~", "~|{}`_^][@?=;:/.-,+*)($#!"],
  ["internal-repeated-spaces", "alpha  beta", "GAMMA   DELTA"],
  ["cjk", "你好 世界", "安静 回声"],
  ["thai-combining", "ภาษาไทย้", "สัญญาณไทย"],
  ["arabic", "صوت هادئ", "ضوء قريب"],
  ["arabic-vowel-marks", "مَرْحَبًا", "صَوْتٌ عَرَبِيّ"],
  ["mixed-scripts", "quiet 山 river", "calm بحر signal"],
  ["utf8-two-byte", "é", "ø"],
  ["utf8-three-byte", "你", "界"],
  ["utf8-four-byte", "😀", "🚀"],
  ["emoji-skin-tone", "👍🏽", "👋🏾"],
  ["regional-indicator-flag", "🇸🇬", "🇯🇵"],
  ["combining-sequence", "e\u0301", "a\u0308"],
  ["unicode-precomposed", "é", "á"],
  ["xml-escaping", `a&b<c>\"'`, `A&B<C>\"'`],
  ["shortest", "a", "c"],
  ["maximum-valid-ascii", "p".repeat(64), "A".repeat(64)],
];
const invalidLineCases = [
  { id: "empty", promptLine: "", agentLine: "valid", kind: "prompt" },
  { id: "newline", promptLine: "line\nbreak", agentLine: "valid", kind: "prompt" },
  { id: "tab", promptLine: "line\tbreak", agentLine: "valid", kind: "prompt" },
  { id: "carriage-return", promptLine: "line\rbreak", agentLine: "valid", kind: "prompt" },
  { id: "control", promptLine: "line\u0001break", agentLine: "valid", kind: "prompt" },
  { id: "leading-space", promptLine: " leading", agentLine: "valid", kind: "prompt" },
  { id: "trailing-space", promptLine: "trailing ", agentLine: "valid", kind: "prompt" },
  { id: "all-spaces", promptLine: "   ", agentLine: "valid", kind: "prompt" },
  { id: "source-65-bytes", promptLine: `${"a".repeat(64)}b`, agentLine: "valid", kind: "prompt" },
  { id: "multibyte-over-64", promptLine: `${"a".repeat(63)}é`, agentLine: "valid", kind: "prompt" },
  { id: "zero-width-joiner", promptLine: "a\u200db", agentLine: "valid", kind: "prompt" },
  { id: "variation-selector", promptLine: "a\ufe0f", agentLine: "valid", kind: "prompt" },
  { id: "noncharacter", promptLine: "a\ufdd0", agentLine: "valid", kind: "prompt" },
];
const frozenRejectedCodepoints = [
  0x0009, 0x000d, 0x0085, 0x00a0, 0x1680, 0x2000, 0x200a, 0x2028, 0x2029,
  0x202f, 0x205f, 0x3000, 0x00ad, 0x034f, 0x061c, 0x115f, 0x1160, 0x17b4,
  0x17b5, 0x180b, 0x180f, 0x200b, 0x200c, 0x200d, 0x200e, 0x200f, 0x202a,
  0x202e, 0x2060, 0x2066, 0x2069, 0x206f, 0x3164, 0xfe00, 0xfe0f, 0xfeff,
  0xffa0, 0xfff0, 0xfff8, 0x1bca0, 0x1bca3, 0x1d173, 0x1d17a, 0xe0000,
  0xe0fff, 0xfdd0, 0xfdef,
  ...Array.from({ length: 17 }, (_, plane) => [plane * 0x10000 + 0xfffe, plane * 0x10000 + 0xffff]).flat(),
];
for (const codepoint of frozenRejectedCodepoints) {
  invalidLineCases.push({
    id: `codepoint-u-${codepoint.toString(16).padStart(4, "0")}`,
    promptLine: String.fromCodePoint(codepoint),
    agentLine: "valid",
    kind: "prompt",
  });
}
const invalidRawUtf8Cases = [
  ["lone-continuation", "80"],
  ["overlong-two-byte", "c0af"],
  ["overlong-three-byte", "e080af"],
  ["encoded-surrogate", "eda080"],
  ["above-unicode-maximum", "f4908080"],
  ["truncated-three-byte", "e282"],
  ["truncated-four-byte", "f09f92"],
  ["bad-two-byte-continuation", "c220"],
  ["bad-three-byte-continuation", "e220a1"],
  ["bad-four-byte-continuation", "f0208080"],
  ["invalid-f5-leader", "f5908080"],
  ["invalid-ff-leader", "ff"],
];
const validModelLabels = [
  ["one-byte", "M"],
  ["sixty-four-bytes", "M".repeat(64)],
  ["safe-non-ascii", "模型 Γ"],
  ["case-and-spacing", "Model  Family X"],
];
const validAgentLabels = [
  ["one-byte", "A"],
  ["sixty-four-bytes", "A".repeat(64)],
  ["safe-non-ascii", "代理 Γ"],
  ["case-and-spacing", "Codex  Agent"],
];
const declaredModelForVector = (index) => ["Model A", "Model A", "Model B", "模型 Γ"][index] ?? "Model A";
const declaredAgentForVector = (index) => ["Codex", "A", "Fixture Agent", "代理 Γ"][index] ?? "Codex";

const sampledGridPositions = (promptLine, agentLine) => {
  const promptBits = protocol.fitBinarySource512(promptLine);
  const agentBits = protocol.fitBinarySource512(agentLine);
  return [[0, 0], [0, 1], [1, 0], [1, 1], [30, 31], [31, 31]].map(([row, column]) => {
    const promptOwned = (row + column) % 2 === 0;
    const sourceIndex = promptOwned
      ? row * 16 + Math.floor(column / 2)
      : column * 16 + Math.floor(row / 2);
    return {
      bit: Number((promptOwned ? promptBits : agentBits)[sourceIndex]),
      column,
      fieldIndex: row * 32 + column,
      owner: promptOwned ? "prompt" : "agent",
      row,
      sourceIndex,
    };
  });
};

fs.rmSync(fixtureRoot, { recursive: true, force: true });
fs.mkdirSync(fixtureRoot, { recursive: true });
for (const [id, promptLine, agentLine] of validCases) {
  const hashes = protocol.thoughtWorkHashes(promptLine, agentLine);
  const svg = renderer.buildThoughtV2Svg({ promptLine, agentLine });
  writeJson(path.join(fixtureRoot, `${id}.json`), {
    agent64: bytesHex(protocol.fitBinarySource64(agentLine)),
    agent512: protocol.fitBinarySource512(agentLine),
    agentIdentityHash: hashes.agentIdentityHash,
    agentLine,
    agentLineKeccak256: hashes.agentLineKeccak256,
    agentLineUtf8: byteHex(agentLine),
    binaryFieldKeccak256: hashes.binaryFieldKeccak256,
    binaryFieldPacked: hashes.binaryFieldPacked,
    expectedSvg: svg,
    expectedSvgKeccak256: keccak256(toUtf8Bytes(svg)),
    id,
    prompt64: bytesHex(protocol.fitBinarySource64(promptLine)),
    prompt512: protocol.fitBinarySource512(promptLine),
    promptLine,
    promptLineKeccak256: hashes.promptLineKeccak256,
    promptLineUtf8: byteHex(promptLine),
    rendererId: protocol.THOUGHT_RENDERER_ID,
    sampledGridPositions: sampledGridPositions(promptLine, agentLine),
    workHash: hashes.workHash,
  });
}
writeJson(
  path.join(fixtureRoot, "invalid-lines.json"),
  invalidLineCases.map((fixture) => ({
    ...fixture,
    errors: protocol.measureThoughtLine(fixture[`${fixture.kind}Line`], fixture.kind).errors,
  })),
);
writeJson(
  path.join(fixtureRoot, "invalid-raw-utf8.json"),
  invalidRawUtf8Cases.map(([id, inputHex]) => {
    const input = Uint8Array.from(Buffer.from(inputHex, "hex"));
    return {
      errors: protocol.measureThoughtLineBytes(input, "prompt").errors,
      id,
      inputHex: `0x${inputHex}`,
      kind: "prompt",
    };
  }),
);

const collisionInputs = [
  ["a-aa", { promptLine: "A", agentLine: "A" }, { promptLine: "AA", agentLine: "AA" }],
  ["ab-abab", { promptLine: "AB", agentLine: "AB" }, { promptLine: "ABAB", agentLine: "ABAB" }],
];
writeJson(path.join(fixtureRoot, "cycling-collisions.json"), {
  collisions: collisionInputs.map(([id, first, second]) => {
    const firstHashes = protocol.thoughtWorkHashes(first.promptLine, first.agentLine);
    const secondHashes = protocol.thoughtWorkHashes(second.promptLine, second.agentLine);
    if (firstHashes.binaryFieldPacked !== secondHashes.binaryFieldPacked) {
      throw new Error(`expected cycling collision for ${id}`);
    }
    return {
      binaryFieldKeccak256: firstHashes.binaryFieldKeccak256,
      binaryFieldPacked: firstHashes.binaryFieldPacked,
      first: { ...first, ...firstHashes },
      id,
      second: { ...second, ...secondHashes },
    };
  }),
  schema: "inshell.thought.binary-weave-collisions.v1",
});

const thoughtArtifact = JSON.parse(fs.readFileSync(path.join(root, "evm", "out", "ThoughtNFT.sol", "ThoughtNFT.json"), "utf8"));
const rendererArtifact = JSON.parse(fs.readFileSync(path.join(root, "evm", "out", "ThoughtRenderer.sol", "ThoughtRenderer.json"), "utf8"));
const registryArtifact = JSON.parse(fs.readFileSync(path.join(root, "evm", "out", "ThoughtSpecRegistry.sol", "ThoughtSpecRegistry.json"), "utf8"));
const protocolRegistryArtifact = JSON.parse(fs.readFileSync(path.join(root, "evm", "out", "ThoughtSpecRegistryV2.sol", "ThoughtSpecRegistryV2.json"), "utf8"));
const verifierArtifact = JSON.parse(fs.readFileSync(path.join(root, "evm", "out", "CreationAttestationVerifier.sol", "CreationAttestationVerifier.json"), "utf8"));
writeJson(path.join(releaseRoot, "contract", "abi", "ThoughtNFT.json"), { abi: thoughtArtifact.abi });
writeJson(path.join(releaseRoot, "contract", "abi", "ThoughtRenderer.json"), { abi: rendererArtifact.abi });
writeJson(path.join(releaseRoot, "contract", "abi", "ThoughtSpecRegistry.json"), { abi: registryArtifact.abi });
writeJson(path.join(releaseRoot, "contract", "abi", "ThoughtSpecRegistryV2.json"), { abi: protocolRegistryArtifact.abi });
writeJson(path.join(releaseRoot, "contract", "abi", "CreationAttestationVerifier.json"), { abi: verifierArtifact.abi });

const baseVector = JSON.parse(fs.readFileSync(path.join(fixtureRoot, "one-byte-cycle.json"), "utf8"));
writeJson(path.join(releaseRoot, "contract", "vectors", "hash-vectors.json"), {
  agentIdentityDomain: protocol.AGENT_IDENTITY_DOMAIN,
  agentIdentityDomainText: protocol.AGENT_IDENTITY_DOMAIN_TEXT,
  rendererId: protocol.THOUGHT_RENDERER_ID,
  rendererIdHash: protocol.RENDERER_ID_HASH,
  vectors: [{
    agentIdentityHash: baseVector.agentIdentityHash,
    agentLine: baseVector.agentLine,
    agentLineKeccak256: baseVector.agentLineKeccak256,
    binaryFieldKeccak256: baseVector.binaryFieldKeccak256,
    binaryFieldPacked: baseVector.binaryFieldPacked,
    promptLine: baseVector.promptLine,
    promptLineKeccak256: baseVector.promptLineKeccak256,
    workHash: baseVector.workHash,
  }],
  workDomain: protocol.WORK_DOMAIN,
  workDomainText: protocol.WORK_DOMAIN_TEXT,
});

fs.rmSync(conformanceRoot, { recursive: true, force: true });
fs.mkdirSync(conformanceRoot, { recursive: true });

writeJson(path.join(conformanceRoot, "text-validation.json"), {
  invalid: invalidLineCases.map((item) => ({
    ...item,
    errors: protocol.measureThoughtLine(item[`${item.kind}Line`], item.kind).errors,
  })),
  invalidModels: invalidLineCases.map((item) => ({
    declaredModel: item.promptLine,
    errors: protocol.measureThoughtLine(item.promptLine, "model").errors,
    id: item.id,
  })),
  invalidDeclaredAgents: invalidLineCases.map((item) => ({
    declaredAgent: item.promptLine,
    errors: protocol.measureThoughtLine(item.promptLine, "declaredAgent").errors,
    id: item.id,
  })),
  schema: "inshell.thought.text-validation-vectors.v2",
  valid: validCases.map(([id, promptLine, agentLine]) => ({
    agent: protocol.measureThoughtLine(agentLine, "agent"),
    agentLine,
    id,
    prompt: protocol.measureThoughtLine(promptLine, "prompt"),
    promptLine,
  })),
  validModels: validModelLabels.map(([id, declaredModel]) => ({
    declaredModel,
    id,
    model: protocol.measureThoughtLine(declaredModel, "model"),
  })),
  validDeclaredAgents: validAgentLabels.map(([id, declaredAgent]) => ({
    declaredAgent,
    id,
    measurement: protocol.measureThoughtLine(declaredAgent, "declaredAgent"),
  })),
});
writeJson(path.join(conformanceRoot, "raw-utf8-vectors.json"), {
  invalid: invalidRawUtf8Cases.map(([id, inputHex]) => ({
    errors: protocol.measureThoughtLineBytes(Uint8Array.from(Buffer.from(inputHex, "hex")), "prompt").errors,
    id,
    inputHex: `0x${inputHex}`,
    modelErrors: protocol.measureThoughtLineBytes(Uint8Array.from(Buffer.from(inputHex, "hex")), "model").errors,
    declaredAgentErrors: protocol.measureThoughtLineBytes(
      Uint8Array.from(Buffer.from(inputHex, "hex")),
      "declaredAgent",
    ).errors,
  })),
  schema: "inshell.thought.raw-utf8-vectors.v2",
});
writeJson(path.join(conformanceRoot, "loom-vectors.json"), {
  collisions: JSON.parse(fs.readFileSync(path.join(fixtureRoot, "cycling-collisions.json"), "utf8")).collisions,
  schema: "inshell.thought.loom-vectors.v1",
  vectors: validCases.map(([id, promptLine, agentLine]) => ({
    agent64: bytesHex(protocol.fitBinarySource64(agentLine)),
    agentLine,
    id,
    prompt64: bytesHex(protocol.fitBinarySource64(promptLine)),
    promptLine,
    sampledGridPositions: sampledGridPositions(promptLine, agentLine),
    ...protocol.thoughtWorkHashes(promptLine, agentLine),
  })),
});

const fixtureManifestHash = `0x${"11".repeat(32)}`;
const fixtureReleaseId = protocol.deriveProtocolReleaseId(fixtureManifestHash);
const fixtureThoughtSpecName = "THOUGHT.v2.md";
const fixtureThoughtSpecBytes = bytes(path.join(releaseRoot, "art", fixtureThoughtSpecName));
const fixtureThoughtSpecPair = {
  thoughtSpecId: keccak256(toUtf8Bytes(fixtureThoughtSpecName)),
  thoughtSpecHash: keccak256(fixtureThoughtSpecBytes),
};
const fixtureSelectedSpec = {
  specName: fixtureThoughtSpecName,
  exactSpecBytes: fixtureThoughtSpecBytes,
  pair: fixtureThoughtSpecPair,
};
const alternateThoughtSpecName = "THOUGHT.v3.md";
const alternateThoughtSpecBytes = Buffer.from(
  "# THOUGHT.v3.md\n\nVersion: v3\n\nConformance-only selected-spec fixture.\n",
);
const alternateThoughtSpecPair = {
  thoughtSpecId: keccak256(toUtf8Bytes(alternateThoughtSpecName)),
  thoughtSpecHash: keccak256(alternateThoughtSpecBytes),
};
const alternateSelectedSpec = {
  specName: alternateThoughtSpecName,
  exactSpecBytes: alternateThoughtSpecBytes,
  pair: alternateThoughtSpecPair,
};
const fixtureProtocolFor = (selectedSpec) => ({
  manifestKeccak256: fixtureManifestHash,
  protocolReleaseId: fixtureReleaseId,
  thoughtSpecHash: selectedSpec.pair.thoughtSpecHash,
  thoughtSpecId: selectedSpec.pair.thoughtSpecId,
});
const fixtureProtocol = fixtureProtocolFor(fixtureSelectedSpec);
const fixtureSelectedSpecEvidence = ({ claim = false, tokenState = false, selectedSpec = fixtureSelectedSpec } = {}) => ({
  specName: selectedSpec.specName,
  exactSpecBytes: selectedSpec.exactSpecBytes,
  registeredPair: selectedSpec.pair,
  mintPair: selectedSpec.pair,
  ...(claim ? { claimPair: selectedSpec.pair } : {}),
  ...(tokenState ? { tokenStatePair: selectedSpec.pair } : {}),
});
const fixtureMintContext = {
  chainId: "31337",
  intendedMinter: `0x${"33".repeat(20)}`,
  thoughtNft: `0x${"11".repeat(20)}`,
};
const declarationFor = (label, source) => ({
  label,
  source,
  status: "declared-unverified",
});
const manualProcessFor = (declaredAgent, declaredModel, modelIdentifier) => ({
  agentDeclaration: declarationFor(declaredAgent, "manual"),
  kind: "manual",
  modelDeclaration: {
    ...declarationFor(declaredModel, "manual"),
    ...(modelIdentifier ? { identifier: modelIdentifier } : {}),
  },
});
const agentResultEnvelopeFor = ({
  agentLine,
  declaredAgent,
  declaredModel,
  manifestKeccak256,
  modelIdentifier,
  modelSource,
  protocolReleaseId,
}) => ({
  agent: {
    label: declaredAgent,
    model: {
      ...(modelIdentifier ? { identifier: modelIdentifier } : {}),
      label: declaredModel,
      source: modelSource,
    },
  },
  agentLine,
  release: { manifestKeccak256, protocolReleaseId },
  schema: protocol.THOUGHT_AGENT_RESULT_ID,
});
const agentRunProcessFor = ({
  adapter = "fixture",
  agentLine,
  declaredAgent,
  declaredModel,
  modelIdentifier,
  modelSource = "runtime_configured",
  protocolBinding,
  provider,
  route,
  runReference,
}) => ({
  agentDeclaration: declarationFor(declaredAgent, modelSource),
  kind: "agent-run",
  modelDeclaration: {
    ...declarationFor(declaredModel, modelSource),
    ...(modelIdentifier ? { identifier: modelIdentifier } : {}),
  },
  transport: {
    adapter,
    ...(provider ? { provider } : {}),
    resultEnvelope: agentResultEnvelopeFor({
      agentLine,
      declaredAgent,
      declaredModel,
      manifestKeccak256: protocolBinding.manifestKeccak256,
      modelIdentifier,
      modelSource,
      protocolReleaseId: protocolBinding.protocolReleaseId,
    }),
    ...(route ? { route } : {}),
    runReference,
  },
});
const provenanceVector = (id, input, typedFacts = {}, selectedSpec = fixtureSelectedSpecEvidence()) => {
  const built = provenance.buildVerifiedCanonicalProvenance({ ...input, selectedSpec }, typedFacts);
  const independentlyHashed = keccak256(built.exactBytes);
  if (built.provenanceHash !== independentlyHashed) {
    throw new Error(`shared provenance hash mismatch for ${id}`);
  }
  return {
    canonicalJson: built.canonicalJson,
    id,
    keccak256: built.provenanceHash,
    record: built.provenance,
  };
};
const manualProvenance = provenanceVector(
  "manual",
  {
    mintContext: fixtureMintContext,
    process: manualProcessFor("Codex", "Model A"),
    protocol: fixtureProtocol,
    promptLine: "quiet signal",
    agentLine: "quiet return",
  },
);
const agentRunProvenance = provenanceVector(
  "agent-run",
  {
    mintContext: fixtureMintContext,
    process: agentRunProcessFor({
      adapter: "codex",
      agentLine: "the archive answers once",
      declaredAgent: "Codex",
      declaredModel: "GPT-5.6",
      modelIdentifier: "gpt-5.6-2026-07-15",
      protocolBinding: fixtureProtocol,
      provider: "openai-fixture",
      route: "fixture/agent-run",
      runReference: "run-1",
    }),
    protocol: fixtureProtocol,
    promptLine: "trace the archive",
    agentLine: "the archive answers once",
  },
);
const observedLegacyHybrid = {
  mintContext: {
    chainId: "31337",
    minter: fixtureMintContext.intendedMinter,
    movement: "THOUGHT",
    pathId: "12",
    pathNft: `0x${"22".repeat(20)}`,
    thoughtNft: fixtureMintContext.thoughtNft,
  },
  process: {
    agentDeclaration: {
      declaredOneCreativeResult: true,
      label: "Codex",
      schema: protocol.THOUGHT_AGENT_DECLARATION_ID,
      status: "declared-unverified",
    },
    kind: "agent-run",
    modelDeclaration: { label: "Model A", source: "runtime_configured" },
  },
  protocol: {
    agentResultSchema: { keccak256: `0x${"55".repeat(32)}`, path: "agent/result.schema.json" },
    creativeSpec: { id: "inshell.thought.v2", keccak256: fixtureThoughtSpecPair.thoughtSpecHash },
    manifestKeccak256: fixtureManifestHash,
    protocolReleaseId: fixtureReleaseId,
    rendererProfile: { keccak256: `0x${"66".repeat(32)}`, path: "renderer/profile.json" },
    workProfile: { keccak256: `0x${"77".repeat(32)}`, path: "work/profile.json" },
  },
  schema: protocol.THOUGHT_PROVENANCE_ID,
  work: manualProvenance.record.work,
};
const observedLegacyHybridCanonicalJson = protocol.canonicalJsonStringify(observedLegacyHybrid);
const observedLegacyHybridVerification = provenance.verifyProvenance(
  Uint8Array.from(Buffer.from(observedLegacyHybridCanonicalJson, "utf8")),
);
if (observedLegacyHybridVerification.conforming) {
  throw new Error("observed legacy-hybrid provenance unexpectedly conforms");
}
writeJson(path.join(conformanceRoot, "provenance-vectors.json"), {
  invalid: [
    {
      canonicalJson: observedLegacyHybridCanonicalJson,
      id: "observed-legacy-hybrid",
      issues: observedLegacyHybridVerification.issues,
    },
    { id: "wrong-release", mutate: { path: "protocol.protocolReleaseId", value: `0x${"ff".repeat(32)}` } },
    { id: "wrong-spec-id", mutate: { path: "protocol.thoughtSpecId", value: `0x${"ff".repeat(32)}` } },
    { id: "wrong-spec-hash", mutate: { path: "protocol.thoughtSpecHash", value: `0x${"ff".repeat(32)}` } },
    { id: "wrong-work-hash", mutate: { path: "work.workHash", value: `0x${"ff".repeat(32)}` } },
    { id: "noncanonical-leading-space", prefix: " " },
    { add: { path: "transactionHash", value: `0x${"ff".repeat(32)}` }, id: "forbidden-post-mint-field" },
  ],
  schema: "inshell.thought.provenance-vectors.v2",
  valid: [manualProvenance, agentRunProvenance],
});
write(path.join(releaseRoot, "provenance", "examples", "manual.json"), manualProvenance.canonicalJson);

fs.rmSync(attestationFixtureRoot, { recursive: true, force: true });
fs.mkdirSync(attestationFixtureRoot, { recursive: true });
const fixtureVerifier = `0x${"44".repeat(20)}`;
const fixtureChainId = 31_337n;
const fixtureAuthority = new Wallet(id("THOUGHT V2 CREATION ATTESTATION NON-PRODUCTION FIXTURE KEY"));
const attestationCases = [
  { id: "ascii", promptLine: "a", agentLine: "b", declaredAgent: "Codex", declaredModel: "Model A", deadline: 1_900_000_000n, authorityEpoch: 1n },
  { id: "safe-non-ascii", promptLine: "你好", agentLine: "مرحبا", declaredAgent: "代理 Γ", declaredModel: "模型 Γ", deadline: 1_900_000_001n, authorityEpoch: 2n },
  { id: "one-byte-declarations", promptLine: "p", agentLine: "r", declaredAgent: "A", declaredModel: "M", deadline: 1n, authorityEpoch: 1n },
  { id: "sixty-four-byte-boundaries", promptLine: "p".repeat(64), agentLine: "r".repeat(64), declaredAgent: "A".repeat(64), declaredModel: "M".repeat(64), deadline: (1n << 64n) - 1n, authorityEpoch: (1n << 32n) - 1n },
  { id: "safe-non-ascii-alternate-spec", promptLine: "你好", agentLine: "مرحبا", declaredAgent: "代理 Γ", declaredModel: "模型 Γ", deadline: 1_900_000_005n, authorityEpoch: 2n, selectedSpec: alternateSelectedSpec },
];
const attestationVectors = [];
for (const [index, item] of attestationCases.entries()) {
  const mintContext = fixtureMintContext;
  const selectedSpec = item.selectedSpec ?? fixtureSelectedSpec;
  const selectedProtocol = fixtureProtocolFor(selectedSpec);
  const runReference = `public-safe-run-${String(index + 1).padStart(4, "0")}`;
  const attestedProvenance = provenanceVector(`attestation-${index + 1}`, {
    protocol: selectedProtocol,
    promptLine: item.promptLine,
    agentLine: item.agentLine,
    process: agentRunProcessFor({
      agentLine: item.agentLine,
      declaredAgent: item.declaredAgent,
      declaredModel: item.declaredModel,
      protocolBinding: selectedProtocol,
      runReference,
    }),
    mintContext,
  }, {
    declaredAgent: item.declaredAgent,
    declaredModel: item.declaredModel,
  }, fixtureSelectedSpecEvidence({ claim: true, selectedSpec }));
  const claim = {
    profileId: protocol.THOUGHT_CREATION_ATTESTATION_PROFILE_ID,
    thoughtNft: mintContext.thoughtNft,
    protocolReleaseId: fixtureReleaseId,
    thoughtSpecId: selectedSpec.pair.thoughtSpecId,
    thoughtSpecHash: selectedSpec.pair.thoughtSpecHash,
    workHash: protocol.thoughtWorkHashes(item.promptLine, item.agentLine).workHash,
    provenanceHash: attestedProvenance.keccak256,
    declaredAgentHash: keccak256(toUtf8Bytes(item.declaredAgent)),
    declaredModelHash: keccak256(toUtf8Bytes(item.declaredModel)),
    runIdHash: attestedProvenance.record.process.transport.runIdHash,
    intendedMinter: mintContext.intendedMinter,
    deadline: item.deadline,
    authorityEpoch: item.authorityEpoch,
  };
  const preSignVerification = provenance.verifyProvenance(
    Uint8Array.from(Buffer.from(attestedProvenance.canonicalJson, "utf8")),
    selectedProtocol,
    {
      declaredAgent: item.declaredAgent,
      declaredModel: item.declaredModel,
      attestationClaim: {
        chainId: fixtureChainId.toString(),
        declaredAgentHash: claim.declaredAgentHash,
        declaredModelHash: claim.declaredModelHash,
        intendedMinter: claim.intendedMinter,
        protocolReleaseId: claim.protocolReleaseId,
        provenanceHash: claim.provenanceHash,
        runIdHash: claim.runIdHash,
        thoughtNft: claim.thoughtNft,
        thoughtSpecHash: claim.thoughtSpecHash,
        thoughtSpecId: claim.thoughtSpecId,
        workHash: claim.workHash,
      },
    },
    fixtureSelectedSpecEvidence({ claim: true, selectedSpec }),
  );
  if (!preSignVerification.conforming) {
    throw new Error(`mock signer rejected ${item.id}: ${preSignVerification.errors.join("; ")}`);
  }
  const domain = attestation.creationAttestationDomain(fixtureChainId, fixtureVerifier);
  const signature = await fixtureAuthority.signTypedData(
    domain,
    attestation.CREATION_ATTESTATION_TYPES,
    claim,
  );
  attestationVectors.push({
    authority: fixtureAuthority.address.toLowerCase(),
    claim: {
      ...claim,
      deadline: claim.deadline.toString(),
      authorityEpoch: Number(claim.authorityEpoch),
    },
    agentLine: item.agentLine,
    declaredAgent: item.declaredAgent,
    declaredModel: item.declaredModel,
    digest: attestation.hashCreationAttestationClaim(fixtureChainId, fixtureVerifier, claim),
    domain: { ...domain, chainId: domain.chainId.toString() },
    domainSeparator: TypedDataEncoder.hashDomain(domain),
    id: item.id,
    promptLine: item.promptLine,
    provenance: {
      canonicalJson: attestedProvenance.canonicalJson,
      keccak256: attestedProvenance.keccak256,
      processKind: "agent-run",
    },
    signature,
    structHash: attestation.hashCreationAttestationStruct(claim),
  });
}
const previousDraftTypes = {
  CreationAttestation: attestation.CREATION_ATTESTATION_TYPES.CreationAttestation
    .filter(({ name }) => name !== "thoughtSpecId" && name !== "thoughtSpecHash"),
};
const firstVector = attestationVectors[0];
const firstClaim = {
  ...firstVector.claim,
  deadline: BigInt(firstVector.claim.deadline),
  authorityEpoch: BigInt(firstVector.claim.authorityEpoch),
};
const {
  thoughtSpecId: omittedPreviousThoughtSpecId,
  thoughtSpecHash: omittedPreviousThoughtSpecHash,
  ...previousDraftClaim
} = firstClaim;
void omittedPreviousThoughtSpecId;
void omittedPreviousThoughtSpecHash;
const fixtureDomain = attestation.creationAttestationDomain(fixtureChainId, fixtureVerifier);
const previousDraftSignature = await fixtureAuthority.signTypedData(
  fixtureDomain,
  previousDraftTypes,
  previousDraftClaim,
);
const substitutedPairClaim = {
  ...firstClaim,
  thoughtSpecId: alternateThoughtSpecPair.thoughtSpecId,
  thoughtSpecHash: alternateThoughtSpecPair.thoughtSpecHash,
};
const substitutedPairDigest = attestation.hashCreationAttestationClaim(
  fixtureChainId,
  fixtureVerifier,
  substitutedPairClaim,
);
const mutatedProvenanceBytes = Uint8Array.from(toUtf8Bytes(firstVector.provenance.canonicalJson));
mutatedProvenanceBytes[0] ^= 1;
const mutatedProvenanceHash = keccak256(mutatedProvenanceBytes);
const mutatedProvenanceClaim = { ...firstClaim, provenanceHash: mutatedProvenanceHash };
writeJson(path.join(attestationFixtureRoot, "creation-attestation-vectors.json"), {
  canonicalEmptyProof: {
    authorityEpoch: 0,
    deadline: "0",
    runIdHash: `0x${"00".repeat(32)}`,
    signature: "0x",
  },
  domainName: attestation.CREATION_ATTESTATION_DOMAIN_NAME,
  domainVersion: attestation.CREATION_ATTESTATION_DOMAIN_VERSION,
  previousDraftProof: {
    claim: {
      ...previousDraftClaim,
      deadline: previousDraftClaim.deadline.toString(),
      authorityEpoch: Number(previousDraftClaim.authorityEpoch),
    },
    digest: TypedDataEncoder.hash(fixtureDomain, previousDraftTypes, previousDraftClaim),
    recoveredAuthority: verifyTypedData(fixtureDomain, previousDraftTypes, previousDraftClaim, previousDraftSignature)
      .toLowerCase(),
    signature: previousDraftSignature,
    typeHash: id("CreationAttestation(bytes32 profileId,address thoughtNft,bytes32 protocolReleaseId,bytes32 workHash,bytes32 provenanceHash,bytes32 declaredAgentHash,bytes32 declaredModelHash,bytes32 runIdHash,address intendedMinter,uint64 deadline,uint32 authorityEpoch)"),
    typeString: "CreationAttestation(bytes32 profileId,address thoughtNft,bytes32 protocolReleaseId,bytes32 workHash,bytes32 provenanceHash,bytes32 declaredAgentHash,bytes32 declaredModelHash,bytes32 runIdHash,address intendedMinter,uint64 deadline,uint32 authorityEpoch)",
  },
  selectedPairSubstitution: {
    originalDigest: firstVector.digest,
    originalSignature: firstVector.signature,
    substitutedClaim: {
      ...substitutedPairClaim,
      deadline: substitutedPairClaim.deadline.toString(),
      authorityEpoch: Number(substitutedPairClaim.authorityEpoch),
    },
    substitutedDigest: substitutedPairDigest,
    recoveredFromReusedSignature: verifyTypedData(
      fixtureDomain,
      attestation.CREATION_ATTESTATION_TYPES,
      substitutedPairClaim,
      firstVector.signature,
    ).toLowerCase(),
  },
  oneByteProvenanceMutation: {
    originalDigest: firstVector.digest,
    originalProvenanceHash: firstClaim.provenanceHash,
    mutatedDigest: attestation.hashCreationAttestationClaim(
      fixtureChainId,
      fixtureVerifier,
      mutatedProvenanceClaim,
    ),
    mutatedProvenanceHash,
  },
  invalid: [
    { id: "partial-empty-run", mutate: { path: "proof.runIdHash", value: id("partial") } },
    { id: "partial-empty-deadline", mutate: { path: "proof.deadline", value: "1" } },
    { id: "partial-empty-epoch", mutate: { path: "proof.authorityEpoch", value: 1 } },
    { id: "wrong-profile", mutate: { path: "claim.profileId", value: id("wrong-profile") } },
    { id: "wrong-chain", mutate: { path: "domain.chainId", value: "31338" } },
    { id: "wrong-verifier", mutate: { path: "domain.verifyingContract", value: `0x${"55".repeat(20)}` } },
    { id: "wrong-thought-nft", mutate: { path: "claim.thoughtNft", value: `0x${"66".repeat(20)}` } },
    { id: "wrong-release", mutate: { path: "claim.protocolReleaseId", value: id("wrong-release") } },
    { id: "wrong-spec-id", mutate: { path: "claim.thoughtSpecId", value: id("wrong-spec-id") } },
    { id: "wrong-spec-hash", mutate: { path: "claim.thoughtSpecHash", value: id("wrong-spec-hash") } },
    { id: "wrong-spec-pair", mutate: { path: "claim.thoughtSpecId+thoughtSpecHash", value: `${alternateThoughtSpecPair.thoughtSpecId}+${alternateThoughtSpecPair.thoughtSpecHash}` } },
    { id: "wrong-work", mutate: { path: "claim.workHash", value: id("wrong-work") } },
    { id: "wrong-provenance", mutate: { path: "claim.provenanceHash", value: id("wrong-provenance") } },
    { id: "wrong-declared-agent", mutate: { path: "claim.declaredAgentHash", value: id("wrong-agent") } },
    { id: "wrong-declared-model", mutate: { path: "claim.declaredModelHash", value: id("wrong-model") } },
    { id: "zero-run", mutate: { path: "claim.runIdHash", value: `0x${"00".repeat(32)}` } },
    { id: "wrong-run", mutate: { path: "claim.runIdHash", value: id("wrong-run") } },
    { id: "wrong-minter", mutate: { path: "claim.intendedMinter", value: `0x${"77".repeat(20)}` } },
    { id: "wrong-deadline", mutate: { path: "claim.deadline", value: "1900000002" } },
    { id: "wrong-epoch", mutate: { path: "claim.authorityEpoch", value: 3 } },
    { id: "malformed-signature", mutate: { path: "proof.signature", value: "0x01" } },
    {
      id: "previous-draft-type",
      typeString: "CreationAttestation(bytes32 profileId,address thoughtNft,bytes32 protocolReleaseId,bytes32 workHash,bytes32 provenanceHash,bytes32 declaredAgentHash,bytes32 declaredModelHash,bytes32 runIdHash,address intendedMinter,uint64 deadline,uint32 authorityEpoch)",
      typeHash: id("CreationAttestation(bytes32 profileId,address thoughtNft,bytes32 protocolReleaseId,bytes32 workHash,bytes32 provenanceHash,bytes32 declaredAgentHash,bytes32 declaredModelHash,bytes32 runIdHash,address intendedMinter,uint64 deadline,uint32 authorityEpoch)"),
    },
  ],
  primaryType: attestation.CREATION_ATTESTATION_PRIMARY_TYPE,
  profileId: protocol.THOUGHT_CREATION_ATTESTATION_PROFILE_ID,
  profileName: protocol.THOUGHT_CREATION_ATTESTATION_PROFILE,
  schema: "inshell.thought.creation-attestation-vectors.v1",
  typeHash: attestation.CREATION_ATTESTATION_TYPEHASH,
  typeString: attestation.CREATION_ATTESTATION_TYPE_STRING,
  types: attestation.CREATION_ATTESTATION_TYPES,
  vectors: attestationVectors,
});

const classifyDensity = (value) => value <= 460 ? "Open" : value <= 563 ? "Balanced" : "Dense";
writeJson(path.join(conformanceRoot, "trait-vectors.json"), {
  representatives: validCases.map(([id, promptLine, agentLine]) => ({
    id,
    ...protocol.deriveThoughtTraits(promptLine, agentLine),
  })),
  schema: "inshell.thought.trait-vectors.v2",
  textureDensityBoundaries: [0, 460, 461, 563, 564, 1024].map((value) => ({ label: classifyDensity(value), value })),
});
writeJson(path.join(conformanceRoot, "svg-vectors.json"), {
  canonicality: "canonical-source-viewer-dependent-raster-v1",
  schema: "inshell.thought.svg-vectors.v1",
  vectors: validCases.map(([id, promptLine, agentLine]) => {
    const source = renderer.buildThoughtV2Svg({ promptLine, agentLine });
    return { id, keccak256: keccak256(toUtf8Bytes(source)), source };
  }),
});

const rendererProfileHash = keccak256(bytes(path.join(releaseRoot, "renderer", "thought.renderer.v2.profile.json")));
const workProfileHash = keccak256(bytes(path.join(releaseRoot, "work", "thought.work.v2.profile.json")));
const tokenUriVectors = [];
for (const [[vectorId, promptLine, agentLine], index] of validCases.slice(0, 4).map((item, index) => [item, index])) {
  const declaredAgent = declaredAgentForVector(index);
  const declaredModel = declaredModelForVector(index);
  const processKind = index === 0 || index === 2 ? "manual" : "agent-run";
  const mintContext = fixtureMintContext;
  const shouldAttest = index === 3;
  const runReference = `public-safe-run-${String(index + 101).padStart(4, "0")}`;
  const tokenProvenance = provenanceVector(`token-uri-${index + 1}`, {
    protocol: fixtureProtocol,
    promptLine,
    agentLine,
    process: processKind === "manual"
      ? manualProcessFor(declaredAgent, declaredModel)
      : agentRunProcessFor({
        agentLine,
        declaredAgent,
        declaredModel,
        protocolBinding: fixtureProtocol,
        runReference,
      }),
    mintContext,
  }, { declaredAgent, declaredModel }, fixtureSelectedSpecEvidence({ claim: shouldAttest, tokenState: true }));
  let creationAttestationDigest = `0x${"00".repeat(32)}`;
  let mockAttestation;
  if (shouldAttest) {
    const claim = {
      profileId: protocol.THOUGHT_CREATION_ATTESTATION_PROFILE_ID,
      thoughtNft: mintContext.thoughtNft,
      protocolReleaseId: fixtureReleaseId,
      thoughtSpecId: fixtureThoughtSpecPair.thoughtSpecId,
      thoughtSpecHash: fixtureThoughtSpecPair.thoughtSpecHash,
      workHash: protocol.thoughtWorkHashes(promptLine, agentLine).workHash,
      provenanceHash: tokenProvenance.keccak256,
      declaredAgentHash: keccak256(toUtf8Bytes(declaredAgent)),
      declaredModelHash: keccak256(toUtf8Bytes(declaredModel)),
      runIdHash: tokenProvenance.record.process.transport.runIdHash,
      intendedMinter: mintContext.intendedMinter,
      deadline: 1_900_100_000n + BigInt(index),
      authorityEpoch: 1n,
    };
    const preSignVerification = provenance.verifyProvenance(
      Uint8Array.from(Buffer.from(tokenProvenance.canonicalJson, "utf8")),
      fixtureProtocol,
      {
        declaredAgent,
        declaredModel,
        attestationClaim: {
          chainId: fixtureChainId.toString(),
          declaredAgentHash: claim.declaredAgentHash,
          declaredModelHash: claim.declaredModelHash,
          intendedMinter: claim.intendedMinter,
          protocolReleaseId: claim.protocolReleaseId,
          provenanceHash: claim.provenanceHash,
          runIdHash: claim.runIdHash,
          thoughtNft: claim.thoughtNft,
          thoughtSpecHash: claim.thoughtSpecHash,
          thoughtSpecId: claim.thoughtSpecId,
          workHash: claim.workHash,
        },
      },
      fixtureSelectedSpecEvidence({ claim: true, tokenState: true }),
    );
    if (!preSignVerification.conforming) {
      throw new Error(`mock signer rejected tokenURI vector ${vectorId}: ${preSignVerification.errors.join("; ")}`);
    }
    const domain = attestation.creationAttestationDomain(fixtureChainId, fixtureVerifier);
    const signature = await fixtureAuthority.signTypedData(
      domain,
      attestation.CREATION_ATTESTATION_TYPES,
      claim,
    );
    creationAttestationDigest = attestation.hashCreationAttestationClaim(
      fixtureChainId,
      fixtureVerifier,
      claim,
    );
    mockAttestation = {
      claim: {
        ...claim,
        deadline: claim.deadline.toString(),
        authorityEpoch: Number(claim.authorityEpoch),
      },
      digest: creationAttestationDigest,
      signature,
    };
  }
  const input = {
    agentLine,
    declaredAgent,
    declaredModel,
    creationAttestationDigest,
    creationAttestationVerifier: fixtureVerifier,
    manifestKeccak256: fixtureManifestHash,
    minter: mintContext.intendedMinter,
    mintedAt: BigInt(1_700_000_000 + index),
    pathId: BigInt(index + 1),
    pathSerial: BigInt(index),
    promptLine,
    protocolReleaseId: fixtureReleaseId,
    provenanceJson: tokenProvenance.canonicalJson,
    rendererProfileKeccak256: rendererProfileHash,
    thoughtSpecHash: fixtureThoughtSpecPair.thoughtSpecHash,
    thoughtSpecId: fixtureThoughtSpecPair.thoughtSpecId,
    tokenId: BigInt(index + 1),
    workProfileKeccak256: workProfileHash,
  };
  const metadata = tokenUri.buildThoughtV2Metadata(input);
  const uri = tokenUri.buildThoughtV2TokenUri(input);
  tokenUriVectors.push({
    id: vectorId,
    metadata,
    metadataKeccak256: keccak256(toUtf8Bytes(metadata)),
    ...(mockAttestation ? { mockAttestation } : {}),
    provenance: {
      canonicalJson: tokenProvenance.canonicalJson,
      keccak256: tokenProvenance.keccak256,
      processKind,
    },
    tokenURI: uri,
    tokenURIKeccak256: keccak256(toUtf8Bytes(uri)),
  });
}
writeJson(path.join(conformanceRoot, "token-uri-vectors.json"), {
  schema: "inshell.thought.token-uri-vectors.v2",
  v1Regression: {
    sourceKeccak256: keccak256(bytes(path.join(root, "evm", "legacy", "ThoughtNFTV1.sol"))),
    sourcePath: "evm/legacy/ThoughtNFTV1.sol",
  },
  vectors: tokenUriVectors,
});

const conformanceNames = [
  "text-validation.json",
  "raw-utf8-vectors.json",
  "loom-vectors.json",
  "provenance-vectors.json",
  "trait-vectors.json",
  "svg-vectors.json",
  "token-uri-vectors.json",
];
if (JSON.stringify(fs.readdirSync(conformanceRoot).sort()) !== JSON.stringify([...conformanceNames].sort())) {
  throw new Error("unexpected conformance fixture set");
}

const artifactDescriptors = [
  ["creative-spec", "art/THOUGHT.v2.md", "text/markdown; charset=utf-8"],
  ["agent-result-schema", "agent/thought.agent-result.v2.schema.json", "application/schema+json"],
  ["agent-declaration-schema", "agent/thought.agent-declaration.v1.schema.json", "application/schema+json"],
  ["creation-attestation-profile", "attestation/thought.creation-workflow-attestation.v1.md", "text/markdown; charset=utf-8"],
  ["contract-interface", "contract/thought-nft.v2.interface.md", "text/markdown; charset=utf-8"],
  ["contract-abi:ThoughtNFT", "contract/abi/ThoughtNFT.json", "application/json"],
  ["contract-abi:ThoughtRenderer", "contract/abi/ThoughtRenderer.json", "application/json"],
  ["contract-abi:ThoughtSpecRegistry", "contract/abi/ThoughtSpecRegistry.json", "application/json"],
  ["contract-abi:ThoughtProtocolRegistry", "contract/abi/ThoughtSpecRegistryV2.json", "application/json"],
  ["contract-abi:CreationAttestationVerifier", "contract/abi/CreationAttestationVerifier.json", "application/json"],
  ["contract-hash-vectors", "contract/vectors/hash-vectors.json", "application/json"],
  ["mint-input-schema", "contract/thought.mint-input.v2.schema.json", "application/schema+json"],
  ["provenance-spec", "provenance/thought.provenance.v2.md", "text/markdown; charset=utf-8"],
  ["provenance-schema", "provenance/thought.provenance.v2.schema.json", "application/schema+json"],
  ["work-profile", "work/thought.work.v2.profile.json", "application/json"],
  ["renderer-profile", "renderer/thought.renderer.v2.profile.json", "application/json"],
  ["fixture:text-validation", "conformance/text-validation.json", "application/json"],
  ["fixture:raw-utf8", "conformance/raw-utf8-vectors.json", "application/json"],
  ["fixture:loom", "conformance/loom-vectors.json", "application/json"],
  ["fixture:provenance", "conformance/provenance-vectors.json", "application/json"],
  ["fixture:traits", "conformance/trait-vectors.json", "application/json"],
  ["fixture:svg", "conformance/svg-vectors.json", "application/json"],
  ["fixture:token-uri", "conformance/token-uri-vectors.json", "application/json"],
  ["fixture:creation-attestation", "attestation/fixtures/creation-attestation-vectors.json", "application/json"],
];
const safeRelativePath = (relativePath) => {
  if (
    path.isAbsolute(relativePath) || relativePath.includes("\\") ||
    relativePath.split("/").some((part) => !part || part === "." || part === "..")
  ) throw new Error(`invalid release artifact path: ${relativePath}`);
};
const roles = new Set();
const paths = new Set();
const artifacts = artifactDescriptors.map(([role, relativePath, mediaType]) => {
  safeRelativePath(relativePath);
  if (roles.has(role)) throw new Error(`duplicate artifact role: ${role}`);
  if (paths.has(relativePath)) throw new Error(`duplicate artifact path: ${relativePath}`);
  roles.add(role);
  paths.add(relativePath);
  const data = bytes(path.join(releaseRoot, relativePath));
  if (data.length === 0) throw new Error(`empty release artifact: ${relativePath}`);
  if (data[0] === 0xef && data[1] === 0xbb && data[2] === 0xbf) throw new Error(`BOM: ${relativePath}`);
  if (data.includes(0x0d)) throw new Error(`CR/CRLF: ${relativePath}`);
  if (data[data.length - 1] !== 0x0a || data[data.length - 2] === 0x0a) {
    throw new Error(`artifact must have exactly one final LF: ${relativePath}`);
  }
  if (mediaType.includes("json")) {
    try {
      JSON.parse(data.toString("utf8"));
    } catch (error) {
      throw new Error(`invalid JSON artifact ${relativePath}: ${error.message}`);
    }
  }
  return { role, path: relativePath, mediaType, byteLength: data.length, keccak256: keccak256(data) };
});
const releaseInput = JSON.parse(fs.readFileSync(path.join(releaseRoot, "release-input.json"), "utf8"));
if (releaseInput.status !== "draft") throw new Error("this local task may generate only a draft release");
const manifest = {
  manifestFormat: "inshell.thought.release-manifest",
  manifestVersion: 1,
  protocol: "inshell.thought",
  release: releaseInput.release,
  createdAt: releaseInput.createdAt,
  artifacts,
};
const manifestBytes = Buffer.from(`${JSON.stringify(manifest, null, 2)}\n`);
const manifestPath = path.join(releaseRoot, "release.manifest.draft.json");
writeAtomic(manifestPath, manifestBytes);
const manifestHash = keccak256(manifestBytes);
const protocolReleaseId = protocol.deriveProtocolReleaseId(manifestHash);
writeJson(path.join(generatedRoot, "thought-v2-release-bundle.json"), {
  artifacts: artifacts.map((artifact) => ({
    ...artifact,
    bytesBase64: bytes(path.join(releaseRoot, artifact.path)).toString("base64"),
  })),
  expectedManifestHash: manifestHash,
  expectedProtocolReleaseId: protocolReleaseId,
  manifestBytesBase64: manifestBytes.toString("base64"),
  schema: "inshell.thought.embedded-release-bundle.v1",
  status: "draft",
});
writeJson(path.join(releaseRoot, "release.report.draft.json"), {
  manifestByteLength: manifestBytes.length,
  manifestHash,
  protocolReleaseId,
  registrationAuthorized: false,
  status: "draft",
});
write(path.join(root, "specs", "THOUGHT.v2.md"), bytes(path.join(releaseRoot, "art", "THOUGHT.v2.md")));

console.log(JSON.stringify({
  artifactCount: artifacts.length,
  manifest: path.relative(root, manifestPath),
  manifestHash,
  protocolReleaseId,
  registrationAuthorized: false,
}, null, 2));
