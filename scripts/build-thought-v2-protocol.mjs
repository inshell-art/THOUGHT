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
const tempRoot = path.join(root, ".tmp", "thought-v2-protocol-build");

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
const bytes = (file) => fs.readFileSync(file);
const sha256 = (data) => crypto.createHash("sha256").update(data).digest("hex");
const byteHex = (value) => `0x${Buffer.from(value, "utf8").toString("hex")}`;

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
const protocol = await import(`${pathToFileURL(path.join(tempRoot, "thought-v2-protocol.mjs")).href}?v=1`);
const renderer = await import(`${pathToFileURL(path.join(tempRoot, "thought-v2-renderer.mjs")).href}?v=1`);

const validCases = [
  ["one-byte-cycle", "a", "b"],
  ["source-63-bytes", "a".repeat(63), "b"],
  ["source-64-bytes", "a".repeat(64), "b"],
  ["source-65-bytes", `${"a".repeat(64)}b`, "c"],
  ["ascii", "quiet signal", "quiet return"],
  ["cjk", "你好 世界", "安静 回声"],
  ["arabic", "صوت هادئ", "ضوء قريب"],
  ["mixed-scripts", "quiet 山 river", "calm بحر signal"],
  ["utf8-two-byte", "é", "ø"],
  ["utf8-three-byte", "你", "界"],
  ["utf8-four-byte", "😀", "🚀"],
  ["combining-sequence", "e\u0301", "a\u0308"],
  ["unicode-precomposed", "é", "á"],
  ["xml-escaping", `a&b<c>\"'`, `A&B<C>\"'`],
  ["shortest", "a", "c"],
  ["maximum-valid-ascii", "p".repeat(72), "A".repeat(27)],
];
const invalidCases = [
  { id: "newline", promptLine: "line\nbreak", agentLine: "valid", kind: "prompt" },
  { id: "tab", promptLine: "line\tbreak", agentLine: "valid", kind: "prompt" },
  { id: "control", promptLine: "line\u0001break", agentLine: "valid", kind: "prompt" },
  { id: "outer-space", promptLine: " leading", agentLine: "valid", kind: "prompt" },
  { id: "repeated-space", promptLine: "double  space", agentLine: "valid", kind: "prompt" },
];

fs.rmSync(fixtureRoot, { recursive: true, force: true });
fs.mkdirSync(fixtureRoot, { recursive: true });
for (const [id, promptLine, agentLine] of validCases) {
  const hashes = protocol.thoughtWorkHashes(promptLine, agentLine);
  const svg = renderer.buildThoughtV2Svg({ promptLine, agentLine });
  writeJson(path.join(fixtureRoot, `${id}.json`), {
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
    prompt512: protocol.fitBinarySource512(promptLine),
    promptLine,
    promptLineKeccak256: hashes.promptLineKeccak256,
    promptLineUtf8: byteHex(promptLine),
    rendererId: protocol.THOUGHT_RENDERER_ID,
    workHash: hashes.workHash,
  });
}
writeJson(
  path.join(fixtureRoot, "invalid-lines.json"),
  invalidCases.map((fixture) => ({
    ...fixture,
    errors: protocol.measureThoughtLine(fixture[`${fixture.kind}Line`], fixture.kind).errors,
  })),
);

const thoughtArtifact = JSON.parse(fs.readFileSync(path.join(root, "evm", "out", "ThoughtNFT.sol", "ThoughtNFT.json"), "utf8"));
const registryArtifact = JSON.parse(fs.readFileSync(path.join(root, "evm", "out", "ThoughtSpecRegistry.sol", "ThoughtSpecRegistry.json"), "utf8"));
writeJson(path.join(releaseRoot, "contract", "abi", "ThoughtNFT.json"), { abi: thoughtArtifact.abi });
writeJson(path.join(releaseRoot, "contract", "abi", "ThoughtSpecRegistry.json"), { abi: registryArtifact.abi });

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

const normativePaths = [
  "art/THOUGHT.v2.md",
  "work/thought.work.v2.md",
  "work/thought.work.v2.schema.json",
  "agent/thought.agent-result.v2.schema.json",
  "agent/thought.agent-declaration.v1.schema.json",
  "renderer/thought.svg.v2.binary-interleave-32.md",
  ...fs.readdirSync(fixtureRoot).sort().map((name) => `renderer/fixtures/${name}`),
  "provenance/thought.provenance.v2.md",
  "provenance/thought.provenance.v2.schema.json",
  "contract/thought-nft.v2.interface.md",
  "contract/abi/ThoughtNFT.json",
  "contract/abi/ThoughtSpecRegistry.json",
  "contract/vectors/hash-vectors.json",
];
const artifacts = normativePaths.sort().map((relativePath) => {
  const data = bytes(path.join(releaseRoot, relativePath));
  return {
    byteLength: data.length,
    encoding: "utf-8",
    keccak256: keccak256(data),
    lineEndings: "lf",
    path: relativePath,
    sha256: sha256(data),
  };
});
const manifest = {
  algorithms: {
    artifactContentHash: "keccak256-exact-bytes",
    artifactTransportHash: "sha256-exact-bytes",
    binaryField: "utf8-msb-first-independent-512-cycle-or-truncate-interleave-pack-msb-first",
    compositeHashEncoding: "solidity-abi.encode",
    jsonSerialization: "recursive-key-sort-json-two-space-final-lf",
  },
  artifacts,
  identifiers: {
    agentDeclaration: protocol.THOUGHT_AGENT_DECLARATION_ID,
    agentResult: protocol.THOUGHT_AGENT_RESULT_ID,
    generationFile: "THOUGHT.v2.md",
    protocolRelease: protocol.THOUGHT_PROTOCOL_ID,
    provenance: protocol.THOUGHT_PROVENANCE_ID,
    renderer: protocol.THOUGHT_RENDERER_ID,
    workProfile: protocol.THOUGHT_WORK_PROFILE_ID,
  },
  schema: "inshell.thought.release-manifest.v1",
};
const manifestBytes = Buffer.from(canonicalJson(manifest));
const manifestPath = path.join(releaseRoot, "release-manifest.json");
write(manifestPath, manifestBytes);
const manifestKeccak = keccak256(manifestBytes);
writeJson(path.join(protocolRoot, "CURRENT.json"), {
  byteLength: manifestBytes.length,
  id: protocol.THOUGHT_PROTOCOL_ID,
  keccak256: manifestKeccak,
  manifest: "releases/v2/release-manifest.json",
  sha256: sha256(manifestBytes),
});

const anchorFor = (relativePath, id) => {
  const data = bytes(path.join(releaseRoot, relativePath));
  return { id, keccak256: keccak256(data), ref: `protocol/releases/v2/${relativePath}` };
};
const exampleHashes = protocol.thoughtWorkHashes("quiet signal", "quiet return");
const manualExample = {
  agentIdentityHash: exampleHashes.agentIdentityHash,
  agentLine: "quiet return",
  agentLineKeccak256: exampleHashes.agentLineKeccak256,
  binaryFieldKeccak256: exampleHashes.binaryFieldKeccak256,
  binaryFieldPacked: exampleHashes.binaryFieldPacked,
  promptLine: "quiet signal",
  promptLineKeccak256: exampleHashes.promptLineKeccak256,
  protocol: {
    id: protocol.THOUGHT_PROTOCOL_ID,
    keccak256: manifestKeccak,
    ref: "protocol/releases/v2/release-manifest.json",
  },
  renderer: anchorFor("renderer/thought.svg.v2.binary-interleave-32.md", protocol.THOUGHT_RENDERER_ID),
  schema: protocol.THOUGHT_PROVENANCE_ID,
  spec: anchorFor("art/THOUGHT.v2.md", "THOUGHT.v2.md"),
  transport: { kind: "manual" },
  workHash: exampleHashes.workHash,
  workProfile: anchorFor("work/thought.work.v2.md", protocol.THOUGHT_WORK_PROFILE_ID),
};
write(path.join(releaseRoot, "provenance", "examples", "manual.json"), `${compactCanonicalJson(manualExample)}\n`);
write(path.join(root, "specs", "THOUGHT.v2.md"), bytes(path.join(releaseRoot, "art", "THOUGHT.v2.md")));

console.log(JSON.stringify({
  artifactCount: artifacts.length,
  manifest: path.relative(root, manifestPath),
  protocolReleaseKeccak256: manifestKeccak,
}, null, 2));
