import { createHash } from "node:crypto";
import {
  lstat,
  readFile,
  readdir
} from "node:fs/promises";
import path from "node:path";
import { isDeepStrictEqual } from "node:util";
import { fileURLToPath, pathToFileURL } from "node:url";

const SCRIPT_DIRECTORY = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.basename(fileURLToPath(import.meta.url)) === "verify.mjs"
  ? SCRIPT_DIRECTORY
  : path.resolve(SCRIPT_DIRECTORY, "..", "sets", "fourth-set");
const CANONICAL_ORDER =
  ` ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789.,?!:;'"-()/&`;
const NONLETTERS = `0123456789.,?!:;'"-()/&`;
const FIXTURE_TEXT = "Abc GIMNTU 04? &";
const PALETTE_SHA =
  "640800ed78bee95fa828d7219ab1711a8fc8177f0af18fa590af85602e297107";
const PALETTE_KECCAK =
  "0x5d16e42e857c3d93524b679426a87d59ec414466b581a904a72992d64c21a12f";
const EXPECTED_FAMILIES = [
  {
    id: "S401",
    slug: "tile-vertical-ledger",
    name: "Tile Vertical Ledger",
    construction: "block-run",
    sourceSetId: "inshell.thought.glyph-library.set-01",
    sourceMemberId:
      "inshell.thought.glyph-library.set-01.vertical-ledger",
    sourceFamilyId: "S11",
    sourceSlug: "vertical-ledger",
    sourceName: "Vertical Ledger",
    sourceFileSha256:
      "1bf0c3ef11c91821c8fe76778bd5ccd308b8efd579d2cb427b9cc6864b9278bb",
    pathSha256:
      "2413c845b6025f02e708224a2418b3a39e2f6714d1a979079b6869a0c16d7d1d",
    normalization: {
      ordinaryMatrix: [1, 0, 0, 1, 1.1, 0],
      safeMatrix: [1, 0, 0, 1, 1.1, 0],
      safeCharacters: ""
    }
  },
  {
    id: "S402",
    slug: "tile-column-relay",
    name: "Tile Column Relay",
    construction: "segment-mask",
    sourceSetId: "inshell.thought.glyph-library.set-02",
    sourceMemberId:
      "inshell.thought.glyph-library.set-02.column-relay",
    sourceFamilyId: "S202",
    sourceSlug: "column-relay",
    sourceName: "Column Relay",
    sourceFileSha256:
      "4276dc130fece04b9c12bb2112ee4205a706a9ff9f2361384ff1acc008698254",
    pathSha256:
      "188adc7d1d47e71a573ea73b843f4f4f05e9dc613d087ab0a651e85760011f62",
    normalization: {
      ordinaryMatrix: [0.917808, 0, 0, 0.917431, 1.27411, 0.283028],
      safeMatrix: [0.917808, 0, 0, 0.917431, 1.27411, 0.283028],
      safeCharacters: ""
    }
  },
  {
    id: "S403",
    slug: "tile-humanist-smooth",
    name: "Tile Humanist Smooth",
    construction: "conventional-outline",
    sourceSetId: "inshell.thought.glyph-library.set-03",
    sourceMemberId:
      "inshell.thought.glyph-library.set-03.humanist-smooth",
    sourceFamilyId: "S301",
    sourceSlug: "humanist-smooth",
    sourceName: "Humanist Smooth",
    sourceFileSha256:
      "66ddd9d4fca7fc07dded2c3295e5562c8cfcf966e4ef8bf4843646616899b7f8",
    pathSha256:
      "8b636ac92349472dcbf43186fb57d9c1ffbd4ce3ba2b5aa3dad0a79ce33a1f81",
    normalization: {
      ordinaryMatrix: [1, 0, 0, 1.221996, 1, -0.278717],
      safeMatrix: [1, 0, 0, 1, 1, 0],
      safeCharacters: "gjpqy,;()/"
    }
  }
];
const TIGHT = {
  id: "tight-v1",
  label: "Tight",
  glyphScale: 0.96,
  tileWidth: 6.5,
  tileHeight: 8,
  tileGap: 0.2,
  edgeStyle: "square",
  cornerRadius: 0.15,
  effectiveCornerRadius: 0,
  advanceWidth: 6.5,
  spaceAdvanceWidth: 6.5,
  monospaced: true,
  foregroundCandidates: ["#000000", "#ffffff"],
  foregroundRule: "higher WCAG 2.x contrast; exact ties choose black",
  blackLuminanceCutoff: 0.1791287847,
  whiteForegroundLetters: "BCGIMNTU",
  blackForegroundLetters: "ADEFHJKLOPQRSVWXYZ",
  minimumChosenContrast: 4.7734,
  outlineRequired: false
};
const sha256 = (value) =>
  createHash("sha256").update(value).digest("hex");
const failures = [];
const fail = (message) => failures.push(message);
const same = (actual, expected) => isDeepStrictEqual(actual, expected);
const count = (source, expression) =>
  [...source.matchAll(expression)].length;
const readJson = async (relative) =>
  JSON.parse(await readFile(path.join(ROOT, relative), "utf8"));

const walk = async (directory, prefix = "") => {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const relative = path.posix.join(prefix, entry.name);
    const absolute = path.join(directory, entry.name);
    if (entry.isSymbolicLink()) {
      fail(`distribution contains a symbolic link: ${relative}`);
      continue;
    }
    if (entry.isDirectory()) {
      files.push(...await walk(absolute, relative));
    } else if (entry.isFile()) {
      files.push(relative);
    } else {
      fail(`distribution contains an unsupported filesystem entry: ${relative}`);
    }
  }
  return files.sort();
};

const manifest = await readJson("manifest.json");
const packageJson = await readJson("package.json");
const palette = await readJson("palette.json");
const tilePolicy = await readJson("tile-policy.json");
const tileProfiles = await readJson("tile-profiles.json");
const storage = await readJson("storage-model.json");
const runtime = await import(
  `${pathToFileURL(path.join(ROOT, "index.mjs")).href}?verify=${Date.now()}`
);

if (
  manifest.id !== "inshell.thought.glyph-library.set-04"
  || manifest.name !== "THOUGHT Glyph Library — Fourth Set"
  || manifest.ordinal !== 4
  || manifest.ordinalLabel !== "4th Set"
  || manifest.slug !== "fourth-set"
  || manifest.version !== 1
  || manifest.qualificationStatus !== "declared-tight-background-tile"
) {
  fail("Fourth Set identity differs");
}
if (manifest.canonicalOrder !== CANONICAL_ORDER) {
  fail("Fourth Set canonical repertoire differs");
}
if (
  manifest.fontCount !== 3
  || !Array.isArray(manifest.fonts)
  || manifest.fonts.length !== 3
) {
  fail("Fourth Set must contain exactly three fonts");
}
if (
  !same(
    manifest.fonts.map((font) => font.slug),
    EXPECTED_FAMILIES.map((family) => family.slug)
  )
) {
  fail("Fourth Set ordered font slugs differ");
}
if (
  !same(
    manifest.fonts.map((font) => font.familyId),
    EXPECTED_FAMILIES.map((family) => family.id)
  )
) {
  fail("Fourth Set ordered family IDs differ");
}
if (
  manifest.defaultTileProfile !== TIGHT.id
  || manifest.tilePolicyFile !== "tile-policy.json"
  || manifest.tileProfilesFile !== "tile-profiles.json"
) {
  fail("Fourth Set default tile contract differs");
}
if (
  manifest.reviewSummary?.paletteBackgroundGlyphs !== 52
  || manifest.reviewSummary?.whiteBackgroundGlyphs !== 23
  || manifest.reviewSummary?.metricsOnlySpace !== 1
  || manifest.reviewSummary?.whiteForegroundGlyphs !== 16
  || manifest.reviewSummary?.blackForegroundGlyphs !== 59
) {
  fail("Fourth Set review counts differ");
}

const paletteText = await readFile(path.join(ROOT, "COLOR_FONT.v1.txt"));
if (
  paletteText.byteLength !== 510
  || sha256(paletteText) !== PALETTE_SHA
  || paletteText.at(-1) === 10
) {
  fail("Color Font v1 canonical text differs");
}
if (
  palette.id !== "inshell.colorfont.v1"
  || palette.version !== "1"
  || palette.canonicalSha256 !== PALETTE_SHA
  || palette.canonicalKeccak256 !== PALETTE_KECCAK
  || !Array.isArray(palette.entries)
  || palette.entries.length !== 26
  || palette.entries.map((entry) => entry.letter).join("")
    !== "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
) {
  fail("Color Font v1 palette mirror differs");
}
if (
  manifest.palette?.role !== "tile-background"
  || manifest.palette?.canonicalSha256 !== PALETTE_SHA
  || manifest.palette?.currentProtocolDependency !== false
) {
  fail("Fourth Set palette binding differs");
}
if (
  tilePolicy.schema !== "inshell.thought.glyph-library.tile-policy.v1"
  || tilePolicy.colorBinding?.paletteRole !== "tile-background"
  || tilePolicy.colorBinding?.nonletters?.color !== "#ffffff"
  || tilePolicy.colorBinding?.foreground?.whiteLetters !== "BCGIMNTU"
  || tilePolicy.colorBinding?.foreground?.blackLetters
    !== "ADEFHJKLOPQRSVWXYZ"
  || tilePolicy.colorBinding?.space?.drawsBackground !== false
  || tilePolicy.colorBinding?.space?.drawsGlyph !== false
  || tilePolicy.colorBinding?.perGlyphColorDuplication !== false
) {
  fail("Fourth Set tile policy differs");
}
if (
  tileProfiles.defaultProfile !== TIGHT.id
  || !same(tileProfiles.profiles, [TIGHT])
) {
  fail("Fourth Set Tight profile differs");
}

if (
  packageJson.name !== "@inshell/thought-glyph-library-fourth-set"
  || packageJson.version !== "1.0.0"
  || packageJson.private !== true
  || packageJson.type !== "module"
  || packageJson.exports?.["./tile-policy"] !== "./tile-policy.json"
  || packageJson.exports?.["./tile-profiles"] !== "./tile-profiles.json"
  || packageJson.exports?.["./third-party-license"] !== "./LICENSE-OFL.md"
) {
  fail("Fourth Set package metadata or exports differ");
}

const requiredRuntimeExports = [
  "backgroundForCharacter",
  "getColorFontV1Entry",
  "getFourthSetTileProfile",
  "listFourthSetFonts",
  "listFourthSetTileProfiles",
  "loadAllFourthSetFonts",
  "loadFourthSetFont",
  "maximumContrastForeground",
  "renderAllFourthSetLines",
  "renderFourthSetGlyph",
  "renderFourthSetLine",
  "resolveFourthSetColor",
  "resolveFourthSetTilePaint"
];
for (const name of requiredRuntimeExports) {
  if (typeof runtime[name] !== "function") {
    fail(`Fourth Set runtime export ${name} is missing`);
  }
}

const directA = runtime.resolveFourthSetColor("A");
const aliasA = runtime.resolveFourthSetColor("a");
const nonletter = runtime.resolveFourthSetColor("0");
const space = runtime.resolveFourthSetColor(" ");
if (
  directA.backgroundHex !== "#00ffff"
  || directA.resolution !== "direct"
  || aliasA.backgroundHex !== "#00ffff"
  || aliasA.resolution !== "uppercase-alias"
  || nonletter.backgroundHex !== "#ffffff"
  || nonletter.resolution !== "nonletter-white"
  || nonletter.resolvedLetter !== null
  || nonletter.index !== null
  || space.backgroundHex !== null
  || space.resolution !== "metrics-only-space"
) {
  fail("Fourth Set color resolution differs");
}
try {
  runtime.getColorFontV1Entry("a");
  fail("strict Color Font v1 lookup accepted lowercase");
} catch {}
try {
  runtime.resolveFourthSetColor("@");
  fail("Set 4 color resolver accepted unsupported input");
} catch {}

let computedWhiteLetters = "";
let computedBlackLetters = "";
let minimumContrast = Number.POSITIVE_INFINITY;
for (const letter of "ABCDEFGHIJKLMNOPQRSTUVWXYZ") {
  const paint = runtime.resolveFourthSetTilePaint(letter);
  minimumContrast = Math.min(minimumContrast, paint.chosenContrast);
  if (paint.foreground === "#ffffff") computedWhiteLetters += letter;
  else computedBlackLetters += letter;
  if (
    paint.background !== runtime.getColorFontV1Entry(letter).hex
    || paint.chosenContrast < 4.5
    || paint.outlined !== false
  ) {
    fail(`letter tile paint differs for ${letter}`);
  }
}
if (
  computedWhiteLetters !== "BCGIMNTU"
  || computedBlackLetters !== "ADEFHJKLOPQRSVWXYZ"
  || Math.abs(minimumContrast - 4.7734) > 0.0001
) {
  fail("computed letter foreground split or minimum contrast differs");
}
for (const character of NONLETTERS) {
  const paint = runtime.resolveFourthSetTilePaint(character);
  if (
    paint.background !== "#ffffff"
    || paint.foreground !== "#000000"
    || paint.chosenContrast !== 21
    || paint.paletteBacked !== false
    || paint.resolvedLetter !== null
  ) {
    fail(`white nonletter tile differs for ${JSON.stringify(character)}`);
  }
}
const spacePaint = runtime.resolveFourthSetTilePaint(" ");
if (
  spacePaint.drawsTile !== false
  || spacePaint.drawsGlyph !== false
  || spacePaint.background !== null
  || spacePaint.foreground !== null
) {
  fail("SPACE paint contract differs");
}

const loadedRecords = await runtime.listFourthSetFonts();
if (
  !same(
    loadedRecords.map((record) => record.slug),
    EXPECTED_FAMILIES.map((family) => family.slug)
  )
) {
  fail("runtime Fourth Set font index differs");
}
const loadedAll = await runtime.loadAllFourthSetFonts();
if (loadedAll.length !== 3) {
  fail("runtime did not load all three Fourth Set fonts");
}

let totalPathBytes = 0;
for (let index = 0; index < EXPECTED_FAMILIES.length; index += 1) {
  const expected = EXPECTED_FAMILIES[index];
  const record = manifest.fonts[index];
  if (
    record.familyId !== expected.id
    || record.slug !== expected.slug
    || record.name !== expected.name
    || record.memberId
      !== `inshell.thought.glyph-library.set-04.${expected.slug}`
    || record.construction !== expected.construction
    || record.sourceGeometry?.setId !== expected.sourceSetId
    || record.sourceGeometry?.memberId !== expected.sourceMemberId
    || record.sourceGeometry?.familyId !== expected.sourceFamilyId
    || record.sourceGeometry?.slug !== expected.sourceSlug
    || record.sourceGeometry?.name !== expected.sourceName
    || record.sourceGeometry?.fileSha256 !== expected.sourceFileSha256
    || record.sourceGeometry?.pathSha256 !== expected.pathSha256
    || !same(record.normalization, expected.normalization)
  ) {
    fail(`${expected.slug} manifest record differs`);
    continue;
  }

  const fontBytes = await readFile(path.join(ROOT, record.file));
  const font = JSON.parse(fontBytes);
  if (sha256(fontBytes) !== record.sha256) {
    fail(`${expected.slug} manifest hash differs`);
  }
  if (
    font.librarySet?.id !== "inshell.thought.glyph-library.set-04"
    || font.librarySet?.memberId
      !== `inshell.thought.glyph-library.set-04.${expected.slug}`
    || font.family?.id !== expected.id
    || font.family?.slug !== expected.slug
    || font.family?.name !== expected.name
    || font.family?.construction?.approach !== expected.construction
    || font.sourceGeometry?.sourceFamilyId !== expected.sourceFamilyId
    || font.colorBinding?.paletteRole !== "tile-background"
    || font.colorBinding?.nonletters?.color !== "#ffffff"
    || font.tilePresentation?.profileId !== "tight-v1"
    || font.tilePresentation?.renderedAdvanceWidth !== 6.5
    || font.tilePresentation?.spaceAdvanceWidth !== 6.5
    || font.tilePresentation?.monospaced !== true
    || !same(font.tilePresentation?.normalization, expected.normalization)
    || font.canonicalOrder !== CANONICAL_ORDER
    || !Array.isArray(font.glyphs)
    || font.glyphs.length !== 76
    || font.glyphs.map((glyph) => glyph.character).join("")
      !== CANONICAL_ORDER
    || font.metrics?.fixedAdvanceWidth !== 6
    || font.metrics?.space?.advanceWidth !== 6
    || font.metrics?.space?.drawsPath !== false
  ) {
    fail(`${expected.slug} font payload contract differs`);
  }
  const forbiddenKeys = new Set([
    "background",
    "color",
    "fill",
    "foreground",
    "palette",
    "paletteId",
    "stroke"
  ]);
  for (const glyph of font.glyphs) {
    if (
      typeof glyph.d !== "string"
      || (glyph.character === " " ? glyph.d !== "" : glyph.d.length === 0)
      || [...Object.keys(glyph)].some((key) => forbiddenKeys.has(key))
    ) {
      fail(`${expected.slug} glyph payload differs at ${JSON.stringify(glyph.character)}`);
      break;
    }
  }
  const paths = font.glyphs.map((glyph) => glyph.d).join("");
  if (sha256(paths) !== expected.pathSha256) {
    fail(`${expected.slug} source path identity differs`);
  }
  totalPathBytes += Buffer.byteLength(paths);

  const reportBytes = await readFile(path.join(ROOT, record.byteReport));
  const report = JSON.parse(reportBytes);
  if (
    sha256(reportBytes) !== record.byteReportSha256
    || report.geometry?.sourceFileSha256 !== expected.sourceFileSha256
    || report.geometry?.pathSha256 !== expected.pathSha256
    || report.geometry?.rawPathBytes !== Buffer.byteLength(paths)
    || report.colorStorage?.compactSharedPaintDataFloorBytes !== 88
    || report.colorStorage?.perGlyphColorDuplication !== false
    || report.tilePresentation?.renderedAdvanceWidth !== 6.5
    || report.tilePresentation?.monospaced !== true
  ) {
    fail(`${expected.slug} byte report differs`);
  }

  const tightFixture = await readFile(
    path.join(ROOT, record.fixtures.tight.file),
    "utf8"
  );
  const expectedTightFixture = runtime.renderFourthSetLine(font, FIXTURE_TEXT, {
    title: `${expected.name} — Tight background tiles`
  });
  if (
    tightFixture !== expectedTightFixture
    || sha256(tightFixture) !== record.fixtures.tight.sha256
  ) {
    fail(`${expected.slug} Tight fixture differs`);
  }
  const repertoireFixture = await readFile(
    path.join(ROOT, record.fixtures.repertoire.file),
    "utf8"
  );
  const expectedRepertoire = runtime.renderFourthSetLine(
    font,
    CANONICAL_ORDER,
    { title: `${expected.name} — complete Tight repertoire` }
  );
  if (
    repertoireFixture !== expectedRepertoire
    || sha256(repertoireFixture) !== record.fixtures.repertoire.sha256
  ) {
    fail(`${expected.slug} repertoire fixture differs`);
  }
  if (
    count(repertoireFixture, /<rect /g) !== 75
    || count(repertoireFixture, /<use /g) !== 75
    || count(repertoireFixture, /class="tile-cell"/g) !== 75
    || count(repertoireFixture, /data-palette-letter=/g) !== 52
    || count(repertoireFixture, /data-background="#ffffff"/g) !== 23
    || count(repertoireFixture, /data-foreground="#ffffff"/g) !== 16
    || count(repertoireFixture, /data-foreground="#000000"/g) !== 59
    || count(repertoireFixture, /rx="0"/g) !== 75
    || !repertoireFixture.includes('viewBox="0 0 494 8"')
    || !repertoireFixture.includes('data-advance-width="6.5"')
    || !repertoireFixture.includes('data-monospaced="true"')
    || /<text|foreignObject| stroke=|paint-order=|keyline/i.test(
      repertoireFixture
    )
  ) {
    fail(`${expected.slug} exhaustive Tight rendering differs`);
  }
}

if (
  totalPathBytes !== 97368
  || storage.fontCount !== 3
  || storage.expandedNativeSvgGeometry?.totalPathBytes !== totalPathBytes
  || storage.expandedNativeSvgGeometry?.totalPathBits !== totalPathBytes * 8
  || storage.sharedPaintData?.compactSharedPaintDataFloorBytes !== 88
  || storage.sharedPaintData
    ?.inlineBackgroundAndForegroundHexFloorAvoided !== 3150
) {
  fail("Fourth Set storage model differs");
}

const humanist = await runtime.loadFourthSetFont("tile-humanist-smooth");
const humanistTransforms = runtime.renderFourthSetLine(humanist, "Ag,Q");
if (
  count(
    humanistTransforms,
    /data-normalization="matrix\(1 0 0 1\.221996 1 -0\.278717\)"/g
  ) !== 2
  || count(
    humanistTransforms,
    /data-normalization="matrix\(1 0 0 1 1 0\)"/g
  ) !== 2
) {
  fail("Humanist Smooth ordinary/safe normalization differs");
}
try {
  runtime.renderFourthSetLine(humanist, "@");
  fail("Fourth Set renderer accepted unsupported input");
} catch {}

const gallery = await readFile(path.join(ROOT, "gallery.html"), "utf8");
if (
  count(gallery, /class="font-card"/g) !== 3
  || count(gallery, /data-set-font=/g) !== 3
  || !gallery.includes("every supported digit and punctuation mark uses white")
  || !gallery.includes("6.5u monospaced cell")
  || /<script[^>]+src=["']https?:\/\/|<link[^>]+href=["']https?:\/\//.test(
    gallery
  )
) {
  fail("Fourth Set gallery contract differs");
}

for (const relative of [
  "README.md",
  "HANDOFF.md",
  "NOTICE.md",
  "REVIEW.md",
  "UNLICENSED.md",
  "LICENSE-OFL.md"
]) {
  const source = await readFile(path.join(ROOT, relative), "utf8");
  if (!source.trim()) fail(`${relative} is empty`);
}
const docs = await Promise.all(
  ["README.md", "HANDOFF.md", "NOTICE.md", "REVIEW.md"]
    .map((relative) => readFile(path.join(ROOT, relative), "utf8"))
);
const combinedDocs = docs.join("\n");
if (
  /palette-nodes|palette-truss|palette-trace|dark-keyline|zombie-gray fallback/i
    .test(combinedDocs)
  || !combinedDocs.includes("tile-vertical-ledger")
  || !combinedDocs.includes("tile-column-relay")
  || !combinedDocs.includes("tile-humanist-smooth")
  || !combinedDocs.includes("LICENSE-OFL.md")
) {
  fail("Fourth Set documentation is stale or incomplete");
}

const allFiles = await walk(ROOT);
const checksumSource = await readFile(path.join(ROOT, "SHA256SUMS"), "utf8");
const checksumLines = checksumSource.trimEnd().split("\n");
const checksumFiles = [];
for (const line of checksumLines) {
  const match = /^([0-9a-f]{64})  (.+)$/.exec(line);
  if (!match) {
    fail(`invalid SHA256SUMS line: ${line}`);
    continue;
  }
  const [, expectedHash, relative] = match;
  checksumFiles.push(relative);
  const target = path.join(ROOT, relative);
  try {
    const stat = await lstat(target);
    if (!stat.isFile()) fail(`checksum target is not a file: ${relative}`);
    else if (sha256(await readFile(target)) !== expectedHash) {
      fail(`checksum mismatch: ${relative}`);
    }
  } catch {
    fail(`checksum target is missing: ${relative}`);
  }
}
const expectedChecksumFiles = allFiles
  .filter((relative) => relative !== "SHA256SUMS")
  .sort();
if (!same(checksumFiles, expectedChecksumFiles)) {
  fail("SHA256SUMS coverage or ordering differs");
}

if (failures.length) {
  process.stderr.write(
    `Fourth Set verification FAIL (${failures.length}):\n- ${failures.join("\n- ")}\n`
  );
  process.exitCode = 1;
} else {
  process.stdout.write(
    "Fourth Set verification PASS: 3/3 Tight background-tile fonts, exact source geometry, white digit/punctuation tiles, automatic black/white contrast, monospaced runtime, fixtures, licenses, and exhaustive checksums\n"
  );
}
