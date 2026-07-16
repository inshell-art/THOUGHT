import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import ts from "typescript";
import { keccak256, toUtf8Bytes } from "ethers";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const protocolRoot = path.join(root, "protocol");
const releaseRoot = path.join(protocolRoot, "releases", "v2");
const fixtureRoot = path.join(releaseRoot, "renderer", "fixtures");
const conformanceRoot = path.join(releaseRoot, "conformance");
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
const protocol = await import(`${pathToFileURL(path.join(tempRoot, "thought-v2-protocol.mjs")).href}?v=1`);
const renderer = await import(`${pathToFileURL(path.join(tempRoot, "thought-v2-renderer.mjs")).href}?v=1`);
const tokenUri = await import(`${pathToFileURL(path.join(tempRoot, "thought-v2-token-uri.mjs")).href}?v=1`);

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
writeJson(path.join(releaseRoot, "contract", "abi", "ThoughtNFT.json"), { abi: thoughtArtifact.abi });
writeJson(path.join(releaseRoot, "contract", "abi", "ThoughtRenderer.json"), { abi: rendererArtifact.abi });
writeJson(path.join(releaseRoot, "contract", "abi", "ThoughtSpecRegistry.json"), { abi: registryArtifact.abi });
writeJson(path.join(releaseRoot, "contract", "abi", "ThoughtSpecRegistryV2.json"), { abi: protocolRegistryArtifact.abi });

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
  schema: "inshell.thought.text-validation-vectors.v1",
  valid: validCases.map(([id, promptLine, agentLine]) => ({
    agent: protocol.measureThoughtLine(agentLine, "agent"),
    agentLine,
    id,
    prompt: protocol.measureThoughtLine(promptLine, "prompt"),
    promptLine,
  })),
});
writeJson(path.join(conformanceRoot, "raw-utf8-vectors.json"), {
  invalid: invalidRawUtf8Cases.map(([id, inputHex]) => ({
    errors: protocol.measureThoughtLineBytes(Uint8Array.from(Buffer.from(inputHex, "hex")), "prompt").errors,
    id,
    inputHex: `0x${inputHex}`,
  })),
  schema: "inshell.thought.raw-utf8-vectors.v1",
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
const artifactBinding = (id, relativePath) => ({
  id,
  keccak256: keccak256(bytes(path.join(releaseRoot, relativePath))),
  path: relativePath.split("/").at(-1),
});
const fixtureProtocol = {
  agentResultSchema: artifactBinding(protocol.THOUGHT_AGENT_RESULT_ID, "agent/thought.agent-result.v2.schema.json"),
  creativeSpec: artifactBinding("inshell.thought.v2", "art/THOUGHT.v2.md"),
  manifestKeccak256: fixtureManifestHash,
  protocolReleaseId: fixtureReleaseId,
  rendererProfile: artifactBinding(protocol.THOUGHT_RENDERER_ID, "renderer/thought.renderer.v2.profile.json"),
  workProfile: artifactBinding(protocol.THOUGHT_WORK_PROFILE_ID, "work/thought.work.v2.profile.json"),
};
const fixtureMintContext = {
  chainId: "31337",
  minter: `0x${"33".repeat(20)}`,
  movement: "THOUGHT",
  pathId: "12",
  pathNft: `0x${"22".repeat(20)}`,
  thoughtNft: `0x${"11".repeat(20)}`,
};
const provenanceRecord = (promptLine, agentLine, process) => ({
  mintContext: fixtureMintContext,
  process,
  protocol: fixtureProtocol,
  schema: protocol.THOUGHT_PROVENANCE_ID,
  work: { promptLine, agentLine, ...protocol.thoughtWorkHashes(promptLine, agentLine) },
});
const provenanceVector = (id, record) => {
  const canonical = protocol.canonicalJsonStringify(record);
  return { canonicalJson: canonical, id, keccak256: keccak256(toUtf8Bytes(canonical)), record };
};
const manualProvenance = provenanceVector(
  "manual",
  provenanceRecord("quiet signal", "quiet return", { kind: "manual" }),
);
const agentRunProvenance = provenanceVector(
  "agent-run",
  provenanceRecord("trace the archive", "the archive answers once", {
    agentDeclaration: {
      agentLabel: "Codex",
      declaredOneCreativeResult: true,
      schema: protocol.THOUGHT_AGENT_DECLARATION_ID,
      status: "declared-unverified",
    },
    kind: "agent-run",
    transport: { adapter: "codex", rawResponseSha256: "44".repeat(32), runId: "run-fixture-1" },
  }),
);
writeJson(path.join(conformanceRoot, "provenance-vectors.json"), {
  invalid: [
    { id: "wrong-release", mutate: { path: "protocol.protocolReleaseId", value: `0x${"ff".repeat(32)}` } },
    { id: "wrong-work-hash", mutate: { path: "work.workHash", value: `0x${"ff".repeat(32)}` } },
    { id: "noncanonical-leading-space", prefix: " " },
    { add: { path: "transactionHash", value: `0x${"ff".repeat(32)}` }, id: "forbidden-post-mint-field" },
  ],
  schema: "inshell.thought.provenance-vectors.v1",
  valid: [manualProvenance, agentRunProvenance],
});
write(path.join(releaseRoot, "provenance", "examples", "manual.json"), `${manualProvenance.canonicalJson}\n`);

const classifyDensity = (value) => value <= 460 ? "Open" : value <= 563 ? "Balanced" : "Dense";
const classifyContrast = (value) => value <= 170 ? "Low" : value <= 341 ? "Medium" : "High";
writeJson(path.join(conformanceRoot, "trait-vectors.json"), {
  binaryContrastBoundaries: [0, 170, 171, 341, 342, 512].map((value) => ({ label: classifyContrast(value), value })),
  representatives: validCases.map(([id, promptLine, agentLine]) => ({
    id,
    ...protocol.deriveThoughtTraits(promptLine, agentLine),
  })),
  schema: "inshell.thought.trait-vectors.v1",
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
writeJson(path.join(conformanceRoot, "token-uri-vectors.json"), {
  schema: "inshell.thought.token-uri-vectors.v1",
  v1Regression: {
    sourceKeccak256: keccak256(bytes(path.join(root, "evm", "legacy", "ThoughtNFTV1.sol"))),
    sourcePath: "evm/legacy/ThoughtNFTV1.sol",
  },
  vectors: validCases.slice(0, 4).map(([id, promptLine, agentLine], index) => {
    const input = {
      agentLine,
      manifestKeccak256: fixtureManifestHash,
      minter: `0x${"33".repeat(20)}`,
      mintedAt: BigInt(1_700_000_000 + index),
      pathId: BigInt(index + 1),
      pathSerial: BigInt(index),
      promptLine,
      protocolReleaseId: fixtureReleaseId,
      provenanceJson: manualProvenance.canonicalJson,
      rendererProfileKeccak256: rendererProfileHash,
      thoughtSpecHash: keccak256(toUtf8Bytes("fixture thought spec")),
      thoughtSpecId: keccak256(toUtf8Bytes("THOUGHT.v2.md")),
      tokenId: BigInt(index + 1),
      workProfileKeccak256: workProfileHash,
    };
    const metadata = tokenUri.buildThoughtV2Metadata(input);
    const uri = tokenUri.buildThoughtV2TokenUri(input);
    return {
      id,
      metadata,
      metadataKeccak256: keccak256(toUtf8Bytes(metadata)),
      tokenURI: uri,
      tokenURIKeccak256: keccak256(toUtf8Bytes(uri)),
    };
  }),
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
