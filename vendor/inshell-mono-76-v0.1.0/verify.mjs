import { createHash } from "node:crypto";
import {
  lstat,
  readFile,
  readdir
} from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  MONO_76_REPERTOIRE,
  MONO_76_WEIGHTS,
  assertMono76Text,
  listMono76Weights,
  loadAllMono76Weights,
  loadMono76Manifest,
  loadMono76Weight,
  renderMono76Line,
  renderMono76Text,
  supportsMono76Text
} from "./index.mjs";
import {
  decodeMono76PackedGlyph,
  inspectMono76Packed
} from "./onchain/decoder.mjs";

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const EXPECTED_ORDER =
  " ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789.,?!:;'\"-()/&";
const EXPECTED_SOURCE_SHA =
  "74bd80d3e42a08517cd7e1108ba3d86f2da29ac0f3065be95e0357956ab9db37";
const EXPECTED_PATH_STREAM_SHA =
  "e90b269f15f3c5f6ac6e71244f2120198d4b7196010b158a51b43a1ea4409d05";
const EXPECTED_RELEASE_COMMIT =
  "803b7e23ec97ae58b6232ea76519a76d428ba268";
const failures = [];

const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const byteLength = (value) => Buffer.byteLength(value, "utf8");
const count = (value, pattern) => value.match(pattern)?.length ?? 0;
const normalize = (value) => {
  if (Array.isArray(value)) return value.map(normalize);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value).sort().map((key) => [key, normalize(value[key])])
    );
  }
  return value;
};
const canonicalJson = (value) => `${JSON.stringify(normalize(value), null, 2)}\n`;

const readJson = async (relativePath) => {
  const source = await readFile(path.join(ROOT, relativePath), "utf8");
  const value = JSON.parse(source);
  if (canonicalJson(value) !== source) {
    failures.push(`${relativePath} is not canonical JSON`);
  }
  return { source, value };
};

const listFiles = async (
  directory,
  prefix = "",
  allowedTopLevel = null
) => {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (
      prefix === ""
      && allowedTopLevel
      && !allowedTopLevel.has(entry.name)
    ) {
      continue;
    }
    const absolutePath = path.join(directory, entry.name);
    const relativePath = path.posix.join(prefix, entry.name);
    const information = await lstat(absolutePath);
    if (information.isSymbolicLink()) {
      failures.push(`symlink is not allowed: ${relativePath}`);
      continue;
    }
    if (entry.isDirectory()) {
      files.push(
        ...await listFiles(absolutePath, relativePath, allowedTopLevel)
      );
    } else if (entry.isFile()) {
      files.push(relativePath);
    }
  }
  return files.sort();
};

const { value: upstream } = await readJson("upstream.json");
if (
  upstream.canonicalOrder !== EXPECTED_ORDER
  || upstream.releaseCommit !== EXPECTED_RELEASE_COMMIT
  || upstream.weights?.length !== 1
  || upstream.weights[0]?.weight !== 400
  || upstream.weights[0]?.style !== "Regular"
  || upstream.weights[0]?.postScriptName !== "SourceCodePro-Regular"
  || upstream.weights[0]?.sha256 !== EXPECTED_SOURCE_SHA
) {
  failures.push("upstream Regular 400 pin differs");
}

const { source: manifestSource, value: manifest } =
  await readJson("manifest.json");
if (
  manifest.id !== "inshell.mono-76"
  || manifest.name !== "Inshell Mono 76"
  || manifest.packageName !== "@inshell/mono-76"
  || manifest.version !== "0.1.0"
  || manifest.status !== "exact-regular-400"
  || manifest.canonicalOrder !== EXPECTED_ORDER
  || manifest.weightCount !== 1
  || manifest.totalGlyphRecords !== 76
  || manifest.glyphRecordsPerWeight !== 76
  || manifest.visibleGlyphsPerWeight !== 75
  || manifest.punctuationCount !== 13
  || manifest.weights?.length !== 1
  || manifest.weights[0]?.weight !== 400
) {
  failures.push("manifest declaration differs");
}
if (
  manifest.metrics?.unitsPerEm !== 1000
  || manifest.metrics?.fixedAdvanceWidth !== 600
  || manifest.metrics?.baseline !== 0
  || manifest.metrics?.coordinateSystem !== "native font units, y-up"
  || manifest.metrics?.lineBox?.top !== 760
  || manifest.metrics?.lineBox?.bottom !== -240
) {
  failures.push("native metric contract differs");
}

const { value: packageJson } = await readJson("package.json");
if (
  packageJson.name !== "@inshell/mono-76"
  || packageJson.version !== "0.1.0"
  || packageJson.private !== true
  || packageJson.license !== "SEE LICENSE IN LICENSES.md"
  || packageJson.repository?.url
    !== "git+ssh://git@github.com/inshell-art/inshell-mono-76.git"
  || packageJson.homepage
    !== "https://github.com/inshell-art/inshell-mono-76#readme"
  || packageJson.exports?.["."] !== "./index.mjs"
  || packageJson.exports?.["./weights/*"] !== "./fonts/*/glyphs.json"
  || packageJson.exports?.["./onchain/decoder"] !== "./onchain/decoder.mjs"
  || !packageJson.files?.includes("byte-reports")
  || !packageJson.files?.includes("UNLICENSED.md")
  || packageJson.scripts?.build !== "node ./src/build.mjs"
  || packageJson.scripts?.verify !== "node ./verify.mjs"
  || packageJson.scripts?.prepack !== "npm run verify"
) {
  failures.push("installable package declaration differs");
}

const record = manifest.weights[0];
const { source: referenceSource, value: reference } =
  await readJson("reference/400.json");
const { source: faceSource, value: face } = await readJson(record.file);
if (
  reference.weight !== 400
  || reference.style !== "Regular"
  || reference.source?.postScriptName !== "SourceCodePro-Regular"
  || reference.source?.versionName
    !== "Version 2.042;hotconv 1.1.0;makeotfexe 2.6.0"
  || reference.source?.sha256 !== EXPECTED_SOURCE_SHA
  || reference.source?.pathStreamSha256 !== EXPECTED_PATH_STREAM_SHA
  || reference.source?.releaseCommit !== EXPECTED_RELEASE_COMMIT
) {
  failures.push("native Source Code Pro Regular reference differs");
}
if (
  face.schema !== "inshell.mono-76.face.v1"
  || face.family?.name !== "Inshell Mono 76"
  || face.family?.faceName !== "Inshell Mono 76 Regular"
  || face.weight !== 400
  || face.style !== "Regular"
  || face.canonicalOrder !== EXPECTED_ORDER
  || face.glyphs?.length !== 76
  || face.glyphs.map((glyph) => glyph.character).join("") !== EXPECTED_ORDER
  || face.metrics?.unitsPerEm !== 1000
  || face.metrics?.fixedAdvanceWidth !== 600
  || face.metrics?.baseline !== 0
  || face.metrics?.fillRule !== "nonzero"
) {
  failures.push("Regular 400 face contract differs");
}
if (
  sha256(faceSource) !== record.fileSha256
  || sha256(referenceSource) === sha256(faceSource)
) {
  failures.push("face hash or generated/reference separation differs");
}

const pathStream = face.glyphs.map((glyph) => glyph.d).join("");
if (
  byteLength(pathStream) !== 20_053
  || sha256(pathStream) !== EXPECTED_PATH_STREAM_SHA
  || record.rawPathBytes !== 20_053
) {
  failures.push("Regular 400 path-stream identity differs");
}

for (const [index, glyph] of face.glyphs.entries()) {
  const sourceGlyph = reference.glyphs[index];
  if (
    glyph.character !== sourceGlyph.character
    || glyph.codepoint !== sourceGlyph.codepoint
    || glyph.glyphID !== sourceGlyph.glyphID
    || glyph.advanceWidth !== 600
    || glyph.d !== sourceGlyph.d
    || glyph.pathSha256 !== sourceGlyph.pathSha256
    || glyph.pathSha256 !== sha256(glyph.d)
  ) {
    failures.push(`glyph identity differs at index ${index}`);
    break;
  }
  if (glyph.character === " ") {
    if (glyph.d !== "") failures.push("SPACE must be metrics-only");
  } else if (
    glyph.d.length === 0
    || !glyph.d.endsWith("Z")
    || /[^MLQCZ0-9.\- ]/.test(glyph.d)
    || /[a-z]/.test(glyph.d)
  ) {
    failures.push(`unsupported native path syntax at ${glyph.character}`);
    break;
  }
}

const { source: reportSource, value: report } =
  await readJson(record.byteReport);
if (
  sha256(reportSource) !== record.byteReportSha256
  || report.weight !== 400
  || report.rawPathBytes !== 20_053
  || report.packedHeaderAndOffsetsBytes !== 162
  || report.packedBytes !== 20_215
  || report.packedSha256 !== record.packedSha256
) {
  failures.push("Regular 400 byte report differs");
}

const packed = await readFile(path.join(ROOT, record.packed.binary));
const packedHex = (
  await readFile(path.join(ROOT, record.packed.hex), "utf8")
).trim();
const { value: packedMetadata } = await readJson(record.packed.metadata);
const inspected = inspectMono76Packed(packed);
if (
  packed.length !== 20_215
  || sha256(packed) !== record.packedSha256
  || packedHex !== `0x${packed.toString("hex")}`
  || inspected.weight !== 400
  || inspected.glyphCount !== 76
  || inspected.pathBytes !== 20_053
  || packedMetadata.totalBytes !== packed.length
  || packedMetadata.sha256 !== sha256(packed)
) {
  failures.push("packed Regular 400 artifact differs");
}
for (const glyph of face.glyphs) {
  if (decodeMono76PackedGlyph(packed, glyph.character) !== glyph.d) {
    failures.push(`packed decoder differs at ${glyph.character}`);
    break;
  }
}

const { value: storage } = await readJson("storage-model.json");
if (
  storage.weights?.length !== 1
  || storage.weights[0]?.weight !== 400
  || storage.totals?.weightCount !== 1
  || storage.totals?.glyphRecords !== 76
  || storage.totals?.rawPathBytes !== 20_053
  || storage.totals?.packedBytes !== 20_215
) {
  failures.push("storage model differs");
}

const expectedFixtures = [
  "fixtures/400/lowercase.svg",
  "fixtures/400/numbers-punctuation.svg",
  "fixtures/400/path-nft.svg",
  "fixtures/400/uppercase.svg",
  "fixtures/400/website-slogan.svg"
];
if (
  Object.values(record.fixtures).sort().join("|")
  !== expectedFixtures.join("|")
) {
  failures.push("fixture declaration differs");
}
for (const fixturePath of expectedFixtures) {
  const source = await readFile(path.join(ROOT, fixturePath), "utf8");
  if (
    !source.startsWith("<svg ")
    || !source.includes('data-family="Inshell Mono 76"')
    || !source.includes('data-weight="400"')
    || /<(?:text|foreignObject|script|image)\b/i.test(source)
    || /(?:font-family|@font-face|\shref=)/i.test(source)
  ) {
    failures.push(`fixture is not self-contained native SVG: ${fixturePath}`);
  }
}

if (
  MONO_76_REPERTOIRE !== EXPECTED_ORDER
  || MONO_76_WEIGHTS.join("|") !== "400"
) {
  failures.push("runtime constants differ");
}
const runtimeManifest = await loadMono76Manifest();
const runtimeIndex = await listMono76Weights();
const runtimeFace = await loadMono76Weight("regular");
const runtimeFaces = await loadAllMono76Weights();
if (
  runtimeManifest.weightCount !== 1
  || runtimeIndex.length !== 1
  || runtimeIndex[0].weight !== 400
  || runtimeFaces.length !== 1
  || runtimeFace.weight !== 400
  || !supportsMono76Text(runtimeFace, "THOUGHT WILL AWA!")
  || supportsMono76Text(runtimeFace, "@")
  || assertMono76Text(runtimeFace, "PATH 610") !== "PATH 610"
) {
  failures.push("runtime loading or repertoire API differs");
}
try {
  await loadMono76Weight(500);
  failures.push("runtime accepted an undeclared weight");
} catch (error) {
  if (!(error instanceof RangeError)) failures.push("wrong unknown-weight error");
}
try {
  assertMono76Text(runtimeFace, "@");
  failures.push("runtime accepted an unsupported character");
} catch (error) {
  if (!(error instanceof RangeError) || !error.message.includes("U+0040")) {
    failures.push("unsupported-character error differs");
  }
}

const rendered = renderMono76Line(
  runtimeFace,
  "THOUGHT WILL AWA!",
  { fontSize: 100, fill: "#00ff35", background: "#000000", padding: 20 }
);
const renderedAsync = await renderMono76Text(
  "PATH 610",
  { weight: 400, fontSize: 40 }
);
if (
  !rendered.startsWith("<svg ")
  || !rendered.includes('data-weight="400"')
  || !rendered.includes("scale(0.1 -0.1)")
  || /<(?:text|foreignObject|script)\b/i.test(rendered)
  || !renderedAsync.includes('aria-label="PATH 610"')
) {
  failures.push("runtime SVG rendering differs");
}

const gallery = await readFile(path.join(ROOT, "gallery.html"), "utf8");
if (
  count(gallery, /<section class="weight"/g) !== 1
  || count(gallery, /class="path-card"/g) !== 8
  || count(gallery, /class="glyph-card"/g) !== 76
  || !gallery.includes("Regular 400")
  || !gallery.includes("One native weight")
  || gallery.includes("Five native weights")
) {
  failures.push("gallery acceptance counts differ");
}

const license = await readFile(path.join(ROOT, "LICENSE-OFL.md"), "utf8");
const notice = await readFile(path.join(ROOT, "NOTICE.md"), "utf8");
const handoff = await readFile(path.join(ROOT, "HANDOFF.md"), "utf8");
const provenance = await readFile(path.join(ROOT, "PROVENANCE.md"), "utf8");
const onchain = await readFile(path.join(ROOT, "ONCHAIN.md"), "utf8");
if (
  !license.includes("SIL OPEN FONT LICENSE Version 1.1")
  || !license.includes("Reserved Font Name 'Source'")
  || !notice.includes("Inshell Mono 76 Regular")
  || !handoff.includes("Regular 400")
  || !handoff.includes("npm install")
  || !provenance.includes(EXPECTED_SOURCE_SHA)
  || !onchain.includes("20,215 bytes")
) {
  failures.push("license, provenance, on-chain guide, or handoff differs");
}

const checksumSource = await readFile(path.join(ROOT, "SHA256SUMS"), "utf8");
const checksumEntries = new Map();
for (const line of checksumSource.trimEnd().split("\n")) {
  const match = line.match(/^([0-9a-f]{64})  (.+)$/);
  if (!match || checksumEntries.has(match?.[2])) {
    failures.push(`invalid checksum line: ${line}`);
    continue;
  }
  checksumEntries.set(match[2], match[1]);
}
const releasePayloadRoots = new Set([
  "package.json",
  ...packageJson.files
]);
const actualFiles = (await listFiles(ROOT, "", releasePayloadRoots))
  .filter((relativePath) => relativePath !== "SHA256SUMS");
if (
  [...checksumEntries.keys()].sort().join("|")
  !== actualFiles.join("|")
) {
  failures.push("SHA256SUMS file set differs");
}
for (const relativePath of actualFiles) {
  const actual = sha256(await readFile(path.join(ROOT, relativePath)));
  if (checksumEntries.get(relativePath) !== actual) {
    failures.push(`checksum differs: ${relativePath}`);
  }
}

if (failures.length > 0) {
  process.stderr.write(
    `Inshell Mono 76 verification FAIL (${failures.length})\n- ${failures.join("\n- ")}\n`
  );
  process.exitCode = 1;
} else {
  process.stdout.write(
    `Inshell Mono 76 verification PASS: Regular 400 only · 76/76 exact native paths · 13 punctuation · 20,053 raw path bytes · 20,215 packed bytes · runtime, fixtures, provenance, license, and checksums\n`
  );
}
