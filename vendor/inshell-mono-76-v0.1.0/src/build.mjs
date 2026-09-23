import { createHash } from "node:crypto";
import {
  mkdir,
  readFile,
  readdir,
  rm,
  stat,
  writeFile
} from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";
import { renderNativeLine } from "./render-core.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const WEIGHTS = Object.freeze([400]);
const STYLE_BY_WEIGHT = Object.freeze({
  400: "Regular"
});
const CANONICAL_ORDER =
  " ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789.,?!:;'\"-()/&";
const PUNCTUATION = `.,?!:;'"-()/&`;
const LINE_BOX = Object.freeze({ top: 760, bottom: -240, height: 1000 });

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
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const byteLength = (value) => Buffer.byteLength(value, "utf8");
const escapeHtml = (value) =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

const put = async (relativePath, value) => {
  const target = path.join(ROOT, relativePath);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, value);
};

const cleanGenerated = async () => {
  for (const relativePath of [
    "fonts",
    "byte-reports",
    "fixtures",
    "onchain/packed"
  ]) {
    const target = path.join(ROOT, relativePath);
    if (!target.startsWith(`${ROOT}${path.sep}`)) {
      throw new Error("refusing to clean outside the package root");
    }
    await rm(target, { recursive: true, force: true });
  }
};

const makeFace = (reference) => ({
  schema: "inshell.mono-76.face.v1",
  family: {
    id: "inshell.mono-76",
    name: "Inshell Mono 76",
    faceName: reference.faceName,
    style: reference.style,
    weight: reference.weight,
    classification: "monospaced conventional outline",
    relationship:
      "renamed restricted SVG-path Modified Version of Adobe Source Code Pro"
  },
  weight: reference.weight,
  style: reference.style,
  canonicalOrder: CANONICAL_ORDER,
  metrics: {
    unitsPerEm: 1000,
    fixedAdvanceWidth: 600,
    baseline: 0,
    coordinateSystem: "native font units, y-up",
    fillRule: "nonzero",
    lineBox: LINE_BOX,
    font: reference.source.fontMetrics,
    space: { advanceWidth: 600, drawsPath: false }
  },
  provenance: {
    upstreamFamily: "Source Code Pro",
    upstreamPostScriptName: reference.source.postScriptName,
    upstreamVersion: reference.source.versionName,
    upstreamFileName: reference.source.fileName,
    upstreamFileSha256: reference.source.sha256,
    upstreamPathStreamSha256: reference.source.pathStreamSha256,
    upstreamRepository: reference.source.officialRepository,
    upstreamReleaseCommit: reference.source.releaseCommit,
    upstreamDownloadUrl: reference.source.downloadUrl,
    license: "OFL-1.1",
    reservedFontName: "Source",
    modification:
      "Restricted to the declared 76-character repertoire and converted to native SVG path records. Outline coordinates, weight geometry, 1000 UPM, and 600-unit advances are preserved without fitting, stretching, synthetic weight, or quantization."
  },
  glyphs: reference.glyphs.map((glyph) => ({
    character: glyph.character,
    codepoint: glyph.codepoint,
    glyphID: glyph.glyphID,
    advanceWidth: glyph.advanceWidth,
    d: glyph.d,
    pathSha256: glyph.pathSha256,
    commandCount: glyph.commandCount,
    commandCounts: glyph.commandCounts,
    coordinateCount: glyph.coordinateCount,
    coordinateBounds: glyph.coordinateBounds
  }))
});

const packFace = (face) => {
  const pathBuffers = face.glyphs.map((glyph) => Buffer.from(glyph.d, "utf8"));
  const pathStream = Buffer.concat(pathBuffers);
  if (pathStream.length > 0xffff) {
    throw new Error(`${face.weight} path stream exceeds uint16 offset capacity`);
  }
  const header = Buffer.alloc(8 + 77 * 2);
  header.write("IM76", 0, "ascii");
  header.writeUInt8(1, 4);
  header.writeUInt16BE(face.weight, 5);
  header.writeUInt8(76, 7);
  let offset = 0;
  header.writeUInt16BE(offset, 8);
  for (const [index, glyphPath] of pathBuffers.entries()) {
    offset += glyphPath.length;
    header.writeUInt16BE(offset, 8 + (index + 1) * 2);
  }
  return Buffer.concat([header, pathStream]);
};

const fixtureSvg = (face, text, options) =>
  `${renderNativeLine(face, text, options)}\n`;

const nftStages = Object.freeze([
  { id: 1, active: [] },
  { id: 8, active: [0] },
  { id: 14, active: [0, 1] },
  { id: 21, active: [0, 1, 2, 3, 4, 5, 6] },
  { id: 55, active: [0, 1, 2, 3, 4, 5, 6, 8, 9, 10] },
  { id: 144, active: [0, 1, 2, 3, 4, 5, 6, 8, 9, 10, 11] },
  { id: 377, active: [0, 1, 2, 3, 4, 5, 6, 8, 9, 10, 11, 13, 14] },
  {
    id: 610,
    active: [0, 1, 2, 3, 4, 5, 6, 8, 9, 10, 11, 13, 14, 15, 16]
  }
]);
const nftText = "THOUGHT WILL AWA!";
const fillsForStage = (stage) =>
  [...nftText].map((character, index) =>
    character === " " || stage.active.includes(index) ? "#00ff20" : "#ffffff"
  );

const renderWeightSection = (face, record) => {
  const websiteWords = ["THOUGHT", "WILL", "AWA!"].map((word) => `
    <div class="movement">
      <small>${word === "THOUGHT" ? "on Sepolia now" : word === "WILL" ? "launch in 2027" : "launch in 2028"}</small>
      ${renderNativeLine(face, word, {
        fontSize: 168,
        fill: "#087b12",
        padding: 4,
        className: "movement-svg"
      })}
    </div>`).join("");

  const nftCards = nftStages.map((stage) => `
    <article class="path-card">
      <div class="path-art">
        ${renderNativeLine(face, nftText, {
          fontSize: 25,
          padding: 22,
          background: "#000000",
          fills: fillsForStage(stage),
          className: "path-svg"
        })}
      </div>
      <footer><strong>PATH #${stage.id}</strong><span>${stage.id === 610 ? "COMPLETE" : "PROGRESS"}</span></footer>
    </article>`).join("");

  const repertoireRows = [
    "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
    "abcdefghijklmnopqrstuvwxyz",
    `0123456789${PUNCTUATION}`
  ].map((line) => `
    <div class="repertoire-line">${renderNativeLine(face, line, {
      fontSize: 58,
      fill: "#eff8f0",
      padding: 10
    })}</div>`).join("");

  return `
  <section class="weight" id="weight-${face.weight}">
    <header class="weight-head">
      <div><span>${face.weight}</span><h2>${escapeHtml(face.style)}</h2></div>
      <p>${record.rawPathBytes.toLocaleString("en-US")} raw SVG path bytes · ${record.packedBytes.toLocaleString("en-US")} packed bytes</p>
    </header>
    <div class="website-stage">${websiteWords}</div>
    <h3>PATH NFT stress sequence</h3>
    <div class="path-grid">${nftCards}</div>
    <details>
      <summary>Complete 76-character repertoire</summary>
      <div class="repertoire">${repertoireRows}</div>
    </details>
  </section>`;
};

const makeIdentityAudit = (reference, face) =>
  reference.glyphs.map((sourceGlyph, index) => {
    const packagedGlyph = face.glyphs[index];
    const label = sourceGlyph.character === " " ? "SPACE" : sourceGlyph.character;
    const sourceFace = { ...face, glyphs: reference.glyphs };
    return `
      <article class="glyph-card">
        <header><strong>${escapeHtml(label)}</strong><span>U+${sourceGlyph.codepoint.toString(16).toUpperCase().padStart(4, "0")}</span></header>
        <div class="glyph-pair">
          <div><small>Source</small>${renderNativeLine(sourceFace, sourceGlyph.character, {
            fontSize: 92,
            padding: 12,
            fill: "#ffffff",
            background: "#000000"
          })}</div>
          <div><small>Package</small>${renderNativeLine(face, packagedGlyph.character, {
            fontSize: 92,
            padding: 12,
            fill: "#00ff35",
            background: "#000000"
          })}</div>
        </div>
        <footer>exact · ${packagedGlyph.pathSha256.slice(0, 10)}</footer>
      </article>`;
  }).join("");

const makeGallery = ({ faces, records, references, manifest }) => {
  const weightSections = faces.map((face, index) =>
    renderWeightSection(face, records[index])
  ).join("");
  const regularIndex = WEIGHTS.indexOf(400);
  const identityAudit = makeIdentityAudit(
    references[regularIndex],
    faces[regularIndex]
  );
  const nav = WEIGHTS.map((weight) =>
    `<a href="#weight-${weight}">${weight}</a>`
  ).join("");
  const sourceRows = manifest.weights.map((record) => `
    <tr><td>${record.weight}</td><td>${record.style}</td><td><code>${record.source.postScriptName}</code></td><td><code>${record.source.fileSha256}</code></td></tr>`
  ).join("");

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Inshell Mono 76 · exact weight review</title>
<style>
:root{color-scheme:dark;--green:#00ff35;--ink:#f2f7f3;--muted:#92a097;--line:#244029;--paper:#071009;--panel:#0d1710}
*{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;background:#020703;color:var(--ink);font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace}a{color:inherit}code{font-size:10px;overflow-wrap:anywhere}
nav{position:sticky;top:0;z-index:10;display:flex;gap:10px;align-items:center;padding:12px 22px;border-bottom:1px solid var(--line);background:rgba(2,7,3,.94);backdrop-filter:blur(10px)}nav strong{margin-right:auto;color:var(--green)}nav a{padding:5px 10px;border:1px solid var(--line);border-radius:999px;text-decoration:none}
main{max-width:1540px;margin:auto;padding:0 24px}.hero{min-height:74vh;display:grid;align-content:center;gap:28px;border-bottom:1px solid var(--line)}.eyebrow,h3,summary{color:var(--green);letter-spacing:.12em;text-transform:uppercase;font-size:11px}.hero h1{margin:0;max-width:1100px;font:500 clamp(44px,8vw,118px)/.92 system-ui,sans-serif;letter-spacing:-.06em}.hero p{max-width:820px;color:var(--muted);font:400 17px/1.65 system-ui,sans-serif}.facts{display:flex;flex-wrap:wrap;gap:10px}.facts span{padding:8px 12px;border:1px solid var(--line);border-radius:999px;color:#cce8d0;font-size:12px}
.weight{padding:92px 0;border-bottom:1px solid var(--line);scroll-margin-top:56px}.weight-head{display:flex;justify-content:space-between;gap:28px;align-items:end;margin-bottom:38px}.weight-head>div{display:flex;gap:20px;align-items:baseline}.weight-head span{font-size:58px;color:var(--green)}.weight-head h2{margin:0;font:500 38px/1 system-ui,sans-serif}.weight-head p{color:var(--muted);font-size:11px}
.website-stage{min-height:440px;padding:44px 24px;background:#f3f3f3;color:#087b12;display:grid;grid-template-columns:1.15fr .8fr .8fr;gap:6vw;align-items:center}.movement{min-width:0}.movement small{display:block;margin-bottom:12px}.movement svg{display:block;width:100%;height:auto;overflow:visible}
.weight h3{margin:50px 0 18px}.path-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:16px}.path-card{padding:10px;background:#f4f4f4;color:#202520;border-radius:10px}.path-art{aspect-ratio:1;display:grid;place-items:center;background:#000}.path-art svg{width:100%;height:auto}.path-card footer{display:flex;justify-content:space-between;padding:13px 2px 4px;gap:8px}.path-card footer span{color:#697169;font-size:10px}
details{margin-top:38px;border-top:1px solid var(--line);padding-top:18px}summary{cursor:pointer}.repertoire{margin-top:18px;padding:18px;background:var(--panel);overflow:hidden}.repertoire-line svg{display:block;width:100%;height:auto}
.audit{padding:92px 0}.audit h2{font:500 clamp(38px,6vw,76px)/1 system-ui,sans-serif;letter-spacing:-.04em}.audit>p{max-width:820px;color:var(--muted);line-height:1.6}.glyph-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}.glyph-card{padding:12px;border:1px solid var(--line);background:var(--panel)}.glyph-card header,.glyph-card footer{display:flex;justify-content:space-between;gap:8px}.glyph-card header span,.glyph-card footer,.glyph-pair small{font-size:9px;color:var(--muted)}.glyph-pair{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:12px 0}.glyph-pair>div{min-width:0}.glyph-pair small{display:block;margin-bottom:5px}.glyph-pair svg{display:block;width:100%;height:auto}.glyph-card footer{color:var(--green)}
.provenance{padding:60px 0 100px}.provenance table{width:100%;border-collapse:collapse}.provenance th,.provenance td{text-align:left;padding:12px;border-bottom:1px solid var(--line);vertical-align:top}.provenance th{color:var(--green);font-size:10px;text-transform:uppercase}
@media(max-width:900px){main{padding:0 14px}.website-stage{grid-template-columns:1fr;gap:42px}.path-grid{grid-template-columns:repeat(2,1fr)}.glyph-grid{grid-template-columns:repeat(2,1fr)}.weight-head{align-items:flex-start;flex-direction:column}.weight-head p{margin:0}.hero{min-height:66vh}}
@media(max-width:520px){nav{padding:10px;gap:5px}nav a{padding:4px 7px;font-size:10px}.path-grid,.glyph-grid{grid-template-columns:1fr}.website-stage{min-height:650px;padding:30px 15px}.weight{padding:64px 0}.weight-head span{font-size:44px}.weight-head h2{font-size:30px}}
</style>
</head>
<body>
<nav><strong>INSHELL MONO 76</strong>${nav}<a href="#identity">identity</a></nav>
<main>
  <section class="hero">
    <span class="eyebrow">Exact Source Code Pro geometry · Regular 400</span>
    <h1>One repertoire.<br>One native weight.</h1>
    <p>Regular 400 is extracted from the pinned Adobe Source Code Pro v2.042 static TTF. Every packaged path is byte-identical to its native source extraction. There is no 8×8 fit, vertical compression, synthetic emboldening, quantization, or browser font substitution.</p>
    <div class="facts"><span>76 records</span><span>75 visible glyphs</span><span>13 punctuation marks</span><span>1000 UPM</span><span>600 advance</span><span>native y-up paths</span></div>
  </section>
${weightSections}
  <section class="audit" id="identity">
    <span class="eyebrow">Regular 400 · letter-by-letter identity audit</span>
    <h2>Source extraction beside packaged output.</h2>
    <p>All 76 records—including metrics-only SPACE and all 13 punctuation marks—are compared in canonical order. “Exact” means the packaged SVG <code>d</code> value and its pinned Source Code Pro extraction are the same bytes.</p>
    <div class="glyph-grid">${identityAudit}</div>
  </section>
  <section class="provenance">
    <span class="eyebrow">Pinned upstream inputs</span>
    <h2>Source Code Pro v2.042</h2>
    <table><thead><tr><th>Weight</th><th>Style</th><th>PostScript name</th><th>TTF SHA-256</th></tr></thead><tbody>${sourceRows}</tbody></table>
  </section>
</main>
</body>
</html>
`;
};

const listFiles = async (
  directory,
  prefix = "",
  allowedTopLevel = null
) => {
  const entries = await readdir(directory, { withFileTypes: true });
  const results = [];
  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    if (
      prefix === ""
      && allowedTopLevel
      && !allowedTopLevel.has(entry.name)
    ) {
      continue;
    }
    const relativePath = path.posix.join(prefix, entry.name);
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      results.push(
        ...await listFiles(absolutePath, relativePath, allowedTopLevel)
      );
    } else if (entry.isFile()) {
      results.push(relativePath);
    }
  }
  return results;
};

await cleanGenerated();

const upstream = JSON.parse(await readFile(path.join(ROOT, "upstream.json"), "utf8"));
const references = [];
const faces = [];
const records = [];

for (const weight of WEIGHTS) {
  const reference = JSON.parse(
    await readFile(path.join(ROOT, "reference", `${weight}.json`), "utf8")
  );
  if (
    reference.weight !== weight
    || reference.style !== STYLE_BY_WEIGHT[weight]
    || reference.canonicalOrder !== CANONICAL_ORDER
    || reference.glyphs.length !== 76
  ) {
    throw new Error(`${weight} reference contract differs`);
  }
  const face = makeFace(reference);
  const faceJson = canonicalJson(face);
  const packed = packFace(face);
  const pathStream = face.glyphs.map((glyph) => glyph.d).join("");
  const report = {
    schema: "inshell.mono-76.byte-report.v1",
    weight,
    style: face.style,
    glyphRecords: 76,
    visibleGlyphs: 75,
    rawPathBytes: byteLength(pathStream),
    rawPathBits: byteLength(pathStream) * 8,
    gzipPathBytesInformational: gzipSync(pathStream).length,
    expandedFaceJsonBytes: byteLength(faceJson),
    packedFormat: "IM76 uint16-offset UTF-8 SVG-path stream v1",
    packedHeaderAndOffsetsBytes: 162,
    packedPathBytes: byteLength(pathStream),
    packedBytes: packed.length,
    packedSha256: sha256(packed),
    sourcePathStreamSha256: reference.source.pathStreamSha256,
    caveat:
      "Packed bytes are immutable geometry data only. They exclude storage/deployment framing, a renderer, SVG serialization, lookup integration, and executable bytecode."
  };
  const reportJson = canonicalJson(report);
  const facePath = `fonts/${weight}/glyphs.json`;
  const reportPath = `byte-reports/${weight}.json`;
  const fixturePaths = {
    website: `fixtures/${weight}/website-slogan.svg`,
    pathNft: `fixtures/${weight}/path-nft.svg`,
    uppercase: `fixtures/${weight}/uppercase.svg`,
    lowercase: `fixtures/${weight}/lowercase.svg`,
    numbersPunctuation: `fixtures/${weight}/numbers-punctuation.svg`
  };
  const packedPaths = {
    binary: `onchain/packed/${weight}.bin`,
    hex: `onchain/packed/${weight}.hex`,
    metadata: `onchain/packed/${weight}.json`
  };

  await put(facePath, faceJson);
  await put(reportPath, reportJson);
  await put(packedPaths.binary, packed);
  await put(packedPaths.hex, `0x${packed.toString("hex")}\n`);
  await put(packedPaths.metadata, canonicalJson({
    schema: "inshell.mono-76.packed-artifact.v1",
    weight,
    style: face.style,
    format: "IM76 uint16-offset UTF-8 SVG-path stream v1",
    magic: "IM76",
    version: 1,
    glyphCount: 76,
    canonicalOrder: CANONICAL_ORDER,
    offsetWidthBits: 16,
    pathOffset: 162,
    pathBytes: byteLength(pathStream),
    totalBytes: packed.length,
    sha256: sha256(packed),
    sourcePathStreamSha256: reference.source.pathStreamSha256
  }));
  await put(fixturePaths.website, fixtureSvg(
    face,
    "THOUGHT WILL AWA!",
    { fontSize: 100, padding: 30, fill: "#087b12", background: "#f3f3f3" }
  ));
  await put(fixturePaths.pathNft, fixtureSvg(
    face,
    nftText,
    {
      fontSize: 27,
      padding: 24,
      fills: fillsForStage(nftStages.at(-1)),
      background: "#000000"
    }
  ));
  await put(fixturePaths.uppercase, fixtureSvg(
    face,
    "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
    { fontSize: 64, padding: 16, fill: "#00ff35", background: "#000000" }
  ));
  await put(fixturePaths.lowercase, fixtureSvg(
    face,
    "abcdefghijklmnopqrstuvwxyz",
    { fontSize: 64, padding: 16, fill: "#00ff35", background: "#000000" }
  ));
  await put(fixturePaths.numbersPunctuation, fixtureSvg(
    face,
    `0123456789${PUNCTUATION}`,
    { fontSize: 64, padding: 16, fill: "#00ff35", background: "#000000" }
  ));

  references.push(reference);
  faces.push(face);
  records.push({
    weight,
    style: face.style,
    slug: String(weight),
    faceName: face.family.faceName,
    file: facePath,
    fileSha256: sha256(faceJson),
    byteReport: reportPath,
    byteReportSha256: sha256(reportJson),
    rawPathBytes: report.rawPathBytes,
    gzipPathBytesInformational: report.gzipPathBytesInformational,
    packedBytes: report.packedBytes,
    packedSha256: report.packedSha256,
    fixtures: fixturePaths,
    packed: packedPaths,
    source: {
      family: "Source Code Pro",
      postScriptName: reference.source.postScriptName,
      version: reference.source.versionName,
      fileName: reference.source.fileName,
      fileSha256: reference.source.sha256,
      pathStreamSha256: reference.source.pathStreamSha256,
      releaseCommit: reference.source.releaseCommit
    }
  });
}

const storageModel = {
  schema: "inshell.mono-76.storage-model.v1",
  weights: records.map((record) => ({
    weight: record.weight,
    style: record.style,
    rawPathBytes: record.rawPathBytes,
    gzipPathBytesInformational: record.gzipPathBytesInformational,
    packedBytes: record.packedBytes,
    packedSha256: record.packedSha256
  })),
  totals: {
    weightCount: records.length,
    glyphRecords: records.length * 76,
    rawPathBytes: records.reduce((sum, record) => sum + record.rawPathBytes, 0),
    packedBytes: records.reduce((sum, record) => sum + record.packedBytes, 0)
  },
  deploymentCaveat:
    "These figures measure geometry payloads only. One packed face is near the EIP-170 runtime-code ceiling before renderer or retrieval code, so no single-contract deployment claim is made. Downstream must measure its complete compiled architecture."
};
const storageJson = canonicalJson(storageModel);
await put("storage-model.json", storageJson);

const manifest = {
  schema: "inshell.mono-76.package.v1",
  id: "inshell.mono-76",
  name: "Inshell Mono 76",
  packageName: "@inshell/mono-76",
  version: "0.1.0",
  status: "exact-regular-400",
  canonicalOrder: CANONICAL_ORDER,
  glyphRecordsPerWeight: 76,
  visibleGlyphsPerWeight: 75,
  punctuationCount: 13,
  weightCount: 1,
  totalGlyphRecords: 76,
  weights: records,
  metrics: {
    unitsPerEm: 1000,
    fixedAdvanceWidth: 600,
    baseline: 0,
    coordinateSystem: "native font units, y-up",
    fillRule: "nonzero",
    lineBox: LINE_BOX
  },
  identity:
    "A renamed restricted SVG-path Modified Version of Adobe Source Code Pro v2.042. Every packaged glyph path is byte-identical to its declared source extraction.",
  naming:
    "Inshell Mono 76 is the primary family name. Source Code Pro is used only for required provenance and factual attribution.",
  license: {
    fontSoftware: "OFL-1.1",
    file: "LICENSE-OFL.md",
    notice: "NOTICE.md",
    reservedFontName: "Source"
  },
  upstream: {
    repository: upstream.repository,
    releaseCommit: upstream.releaseCommit,
    packageVersion: upstream.packageVersion,
    manifest: "upstream.json"
  },
  storageModel: "storage-model.json",
  onchainGuide: "ONCHAIN.md",
  handoff: "HANDOFF.md"
};
const manifestJson = canonicalJson(manifest);
await put("manifest.json", manifestJson);

const packageDefinition = {
  name: "@inshell/mono-76",
  version: "0.1.0",
  description:
    "Inshell Mono 76: exact native SVG paths for a restricted 76-character Source Code Pro Regular 400 subset",
  private: true,
  type: "module",
  sideEffects: false,
  license: "SEE LICENSE IN LICENSES.md",
  repository: {
    type: "git",
    url: "git+ssh://git@github.com/inshell-art/inshell-mono-76.git"
  },
  homepage: "https://github.com/inshell-art/inshell-mono-76#readme",
  bugs: {
    url: "https://github.com/inshell-art/inshell-mono-76/issues"
  },
  engines: { node: ">=22" },
  exports: {
    ".": "./index.mjs",
    "./manifest": "./manifest.json",
    "./weights/*": "./fonts/*/glyphs.json",
    "./storage-model": "./storage-model.json",
    "./onchain/decoder": "./onchain/decoder.mjs",
    "./license": "./LICENSE-OFL.md",
    "./notice": "./NOTICE.md",
    "./package.json": "./package.json"
  },
  files: [
    "byte-reports",
    "fonts",
    "fixtures",
    "onchain",
    "reference",
    "src",
    "gallery.html",
    "HANDOFF.md",
    "index.mjs",
    "LICENSE-OFL.md",
    "LICENSES.md",
    "manifest.json",
    "NOTICE.md",
    "ONCHAIN.md",
    "PROVENANCE.md",
    "README.md",
    "REVIEW.md",
    "SHA256SUMS",
    "storage-model.json",
    "UNLICENSED.md",
    "upstream.json",
    "verify.mjs"
  ],
  scripts: {
    build: "node ./src/build.mjs",
    prepack: "npm run verify",
    "refresh:source": "node ./src/refresh-sources.mjs",
    verify: "node ./verify.mjs"
  }
};
const packageJson = canonicalJson(packageDefinition);
await put("package.json", packageJson);

await put("gallery.html", makeGallery({
  faces,
  records,
  references,
  manifest
}));

const releasePayloadRoots = new Set([
  "package.json",
  ...packageDefinition.files
]);
const allFiles = (await listFiles(ROOT, "", releasePayloadRoots))
  .filter((relativePath) => relativePath !== "SHA256SUMS");
const checksumLines = [];
for (const relativePath of allFiles) {
  const absolutePath = path.join(ROOT, relativePath);
  if ((await stat(absolutePath)).isFile()) {
    checksumLines.push(
      `${sha256(await readFile(absolutePath))}  ${relativePath}`
    );
  }
}
await put("SHA256SUMS", `${checksumLines.join("\n")}\n`);

process.stdout.write(
  `Inshell Mono 76 build complete: ${records.length} weights · ${records.length * 76} glyph records · ${storageModel.totals.rawPathBytes} raw path bytes · ${storageModel.totals.packedBytes} packed bytes\n`
);
