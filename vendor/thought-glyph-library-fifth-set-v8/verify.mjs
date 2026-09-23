import { createHash } from "node:crypto";
import {
  lstat,
  readFile,
  readdir
} from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  FIFTH_SET_FONT_SLUGS,
  FIFTH_SET_ID,
  FIFTH_SET_NAME,
  FIFTH_SET_REPERTOIRE,
  FIFTH_SET_VERSION,
  assertFifthSetFont,
  assertFifthSetText,
  listFifthSetFonts,
  loadAllFifthSetFonts,
  loadFifthSetFont,
  loadFifthSetManifest,
  loadFifthSetPacked,
  renderAllFifthSetLines,
  renderFifthSetLine,
  supportsFifthSetText
} from "./index.mjs";
import {
  decodeMono76PackedGlyph,
  inspectMono76Packed
} from "./onchain/decoder.mjs";

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const SOURCE_COMMIT = "a0ac1dafd2bc73ad023fc0e32e9b95b5385f608c";
const PUNCTUATION = `.,?!:;'"-()/&`;
const C02_A_PATH = "M1 0L4 10L7 0M2.3 4L5.7 4";
const C02_QUESTION_PATH =
  "M1 8Q2 10 4 10Q7 10 7 7Q7 5 4 4L4 3M4 0L4 1";
const C02_F_SMOOTH_RISE_PATH =
  "M2 0L2 8Q2 11 4 11Q5 11 6 10M0 7L6 7";
const C02_F_PATH =
  "M3 0L3 8Q3 11 5 11Q6 11 7 10M1 7L7 7";
const C02_F_PATH_SHA256 =
  "127b8029c9d1498b34d01979df8e39d8038254097c72925645c5ad31c03d08ac";
const C02_TWO_PATH =
  "M1 8Q2 10 4 10Q7 10 7 7Q7 6 5 4L1 0L7 0";
const C02_K_PREVIOUS_PATH =
  "M1 0L1 10M7 7L1 2M3 4L7 0";
const C02_K_PATH =
  "M1 0L1 10M7 7L1 2M3.18 3.82L7 0";
const C02_K_PATH_SHA256 =
  "d39c1506891f378003f993d2987840ba60190907eb5a224d619b8bb7c85ff6ff";
const BASE_HYPHEN_PATH = "M1 4L7 4";
const COMPACT_HYPHEN_PATH = "M2 4L6 4";
const C02_HYPHEN_PATH = "M1 5L7 5";
const C02_HYPHEN_PATH_SHA256 =
  "8502b6a652a5682ad07fad0e848ab34a7ee52c90b6b1b72dfa2f36e463ad50ee";
const BASE_G_PATH =
  "M7 8Q6 10 4 10Q1 10 1 5Q1 0 4 0Q6 0 7 2L7 5L4 5";
const C02_G_PATH =
  "M7 8Q6 10 4 10Q1 10 1 5Q1 0 4 0Q7 0 7 2L7 5L4 5";
const C02_G_PATH_SHA256 =
  "7522b25e1d85cad968bc84c4a4961b4588cbbcc8b982506a763a0947b6137db3";
const C04_G_PATH =
  "M7 8Q6 10 4 10Q1 10 1 7L1 3Q1 0 4 0Q7 0 7 3L7 5L4 5";
const C06_G_PATH =
  "M6 9Q5 10 4 10Q2 10 2 8L2 2Q2 0 4 0Q6 0 6 2L6 5L4 5";
const C02_GEOMETRY_REVISION = Object.freeze({
  changes: Object.freeze([
    Object.freeze({
      after: C02_A_PATH,
      before: "M1 0L4 10L7 0M2 4L6 4",
      character: "A",
      id: "c02-a-crossbar-r2",
      reason:
        "Shorten the crossbar symmetrically so round caps do not protrude beyond the diagonal legs at heavier render strokes."
    }),
    Object.freeze({
      after: C02_QUESTION_PATH,
      before:
        "M1 8Q2 10 4 10Q7 10 7 7Q7 5 4 4L4 2M4 0L4 1",
      character: "?",
      id: "c02-question-gap-r3",
      reason:
        "Raise the upper-curve terminal one unit so its round-cap gap to the unchanged dot matches the exclamation mark."
    }),
    Object.freeze({
      after: C02_F_SMOOTH_RISE_PATH,
      before:
        "M2 0L2 8Q2 10 4 10Q5 10 6 9M0 7L6 7",
      character: "f",
      id: "c02-f-smooth-rise-r3",
      reason:
        "Raise C1, A2, C2, and A3 one unit; retain the horizontal A2 tangent and translate the second curve upward without changing its shape."
    }),
    Object.freeze({
      after: C02_TWO_PATH,
      before:
        "M1 8Q2 10 4 10Q7 10 7 7Q7 5 5 4L1 0L7 0",
      character: "2",
      id: "c02-two-smooth-curve-r4",
      reason:
        "Move the final quadratic control from (7,5) to (7,6), preserving the vertical tangent into the curve and the 45-degree tangent into the diagonal."
    }),
    Object.freeze({
      after: C02_F_PATH,
      before: C02_F_SMOOTH_RISE_PATH,
      character: "f",
      id: "c02-f-optical-spacing-r5",
      reason:
        "Translate every x coordinate one logical unit right so the glyph occupies x=1..7 like neighboring lowercase letters, balancing eft and ft spacing without changing the fixed advance, curve shape, vertical geometry, or stroke style."
    }),
    Object.freeze({
      after: C02_K_PATH,
      before: C02_K_PREVIOUS_PATH,
      character: "k",
      id: "c02-k-lower-arm-junction-r6",
      reason:
        "Move the lower arm start to a two-decimal approximation of the intersection between the upper diagonal and the continuing 45-degree lower arm, removing the protruding round-cap crossing without changing the stem, endpoints, advance, metrics, or stroke style."
    }),
    Object.freeze({
      after: C02_HYPHEN_PATH,
      before: BASE_HYPHEN_PATH,
      character: "-",
      id: "c02-hyphen-vertical-center-r7",
      reason:
        "Raise U+002D HYPHEN-MINUS one logical unit to y=5, the vertical midpoint between baseline y=0 and cap height y=10, without changing its x=1..7 extent, length, advance, metrics, or stroke style."
    }),
    Object.freeze({
      after: C02_G_PATH,
      before: BASE_G_PATH,
      character: "G",
      id: "c02-g-lower-join-r8",
      reason:
        "Move the lower-bowl quadratic control from (6,0) to (7,0), making the curve enter the (7,2) join vertically and continue tangent to the right stem while preserving its horizontal departure from (4,0), bounds, advance, metrics, and stroke style."
    })
  ]),
  id: "c02-geometry-r8",
  revisedOn: "2026-07-29",
  sourceCandidate: "C02"
});
const EXPECTED = Object.freeze([
  Object.freeze({
    familyId: "S501",
    gas: 596_948,
    memberId: `${FIFTH_SET_ID}.classic-line`,
    name: "Classic Line 76",
    packedBytes: 2_514,
    packedSha256:
      "d06f7403b4963d8f46e6e8559c7ab0e4a21a65aa3681b210bfe433d74ea56b42",
    slug: "classic-line",
    sourceCandidate: "C01",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    strokeWidth: 0.72
  }),
  Object.freeze({
    familyId: "S502",
    gas: 602_572,
    memberId: `${FIFTH_SET_ID}.classic-book`,
    name: "Classic Book 76",
    packedBytes: 2_540,
    packedSha256:
      "3ab51d7dcdce7e358e7c76002b8f78ddaa448a99de2116a238f7e22209f2bd60",
    slug: "classic-book",
    sourceCandidate: "C02",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    strokeWidth: 0.82
  }),
  Object.freeze({
    familyId: "S503",
    gas: 636_322,
    memberId: `${FIFTH_SET_ID}.classic-round`,
    name: "Classic Round 76",
    packedBytes: 2_696,
    packedSha256:
      "72ea88523caf278828b833368c4a3a289f7b80866ac464325d04f031c48e3a01",
    slug: "classic-round",
    sourceCandidate: "C04",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    strokeWidth: 0.86
  }),
  Object.freeze({
    familyId: "S504",
    gas: 622_265,
    memberId: `${FIFTH_SET_ID}.classic-compact`,
    name: "Classic Compact 76",
    packedBytes: 2_631,
    packedSha256:
      "204bf9e84103b57175e1dc0be06b3f42e91a4d0f8fb5b8b7457b52ff63c79393",
    slug: "classic-compact",
    sourceCandidate: "C06",
    strokeLinecap: "butt",
    strokeLinejoin: "miter",
    strokeWidth: 0.78
  })
]);
const failures = [];

const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const byteLength = (value) => Buffer.byteLength(value, "utf8");
const normalize = (value) => {
  if (Array.isArray(value)) return value.map(normalize);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, normalize(value[key])])
    );
  }
  return value;
};
const canonicalJson = (value) => `${JSON.stringify(normalize(value), null, 2)}\n`;
const equivalent = (left, right) =>
  JSON.stringify(normalize(left)) === JSON.stringify(normalize(right));
const assert = (condition, message) => {
  if (!condition) failures.push(message);
};

const readJson = async (relativePath) => {
  const source = await readFile(path.join(ROOT, relativePath), "utf8");
  const value = JSON.parse(source);
  assert(source === canonicalJson(value), `${relativePath} is not canonical JSON`);
  return { source, value };
};

const listFiles = async (directory, prefix = "") => {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const absolutePath = path.join(directory, entry.name);
    const relativePath = path.posix.join(prefix, entry.name);
    const information = await lstat(absolutePath);
    if (information.isSymbolicLink()) {
      failures.push(`symlink is not allowed: ${relativePath}`);
    } else if (entry.isDirectory()) {
      files.push(...await listFiles(absolutePath, relativePath));
    } else if (entry.isFile()) {
      files.push(relativePath);
    }
  }
  return files.sort();
};

const validatePath = (slug, character, d) => {
  const label = `${slug}:${JSON.stringify(character)}`;
  const maximumY = slug === "classic-book" && character === "f" ? 11 : 10;
  if (character === " ") {
    assert(d === "", `${label} SPACE must be metrics-only`);
    return;
  }
  assert(d.length > 0, `${label} visible path is empty`);
  assert(!/[a-z]/.test(d), `${label} contains relative path commands`);
  assert(!/[^MLQZ0-9.\- ]/.test(d), `${label} has unsupported path syntax`);
  const tokens = d.match(/[MLQZ]|-?(?:\d+(?:\.\d+)?|\.\d+)/g) ?? [];
  assert(
    tokens.join("") === d.replaceAll(" ", ""),
    `${label} does not tokenize losslessly`
  );
  let index = 0;
  while (index < tokens.length) {
    const command = tokens[index++];
    const arity = command === "M" || command === "L"
      ? 2
      : command === "Q"
        ? 4
        : command === "Z"
          ? 0
          : -1;
    assert(arity >= 0, `${label} has unknown command ${command}`);
    if (arity < 0) return;
    const values = [];
    while (index < tokens.length && !/^[MLQZ]$/.test(tokens[index])) {
      values.push(Number(tokens[index++]));
    }
    assert(
      values.length === arity,
      `${label} ${command} has ${values.length} values, expected ${arity}`
    );
    for (let coordinate = 0; coordinate + 1 < values.length; coordinate += 2) {
      const x = values[coordinate];
      const y = values[coordinate + 1];
      assert(
        Number.isFinite(x) && x >= 0 && x <= 8,
        `${label} x coordinate ${x} is outside 0..8`
      );
      assert(
        Number.isFinite(y) && y >= -3 && y <= maximumY,
        `${label} y coordinate ${y} is outside -3..${maximumY}`
      );
    }
  }
};

assert(FIFTH_SET_ID === "inshell.thought.glyph-library.set-05", "set ID differs");
assert(FIFTH_SET_NAME === "THOUGHT Glyph Library — Fifth Set", "set name differs");
assert(FIFTH_SET_VERSION === 8, "set version differs");
assert(
  sha256(C02_F_PATH) === C02_F_PATH_SHA256,
  "classic-book lowercase-f path hash differs"
);
assert(
  sha256(C02_K_PATH) === C02_K_PATH_SHA256,
  "classic-book lowercase-k path hash differs"
);
assert(
  sha256(C02_HYPHEN_PATH) === C02_HYPHEN_PATH_SHA256,
  "classic-book U+002D path hash differs"
);
assert(
  sha256(C02_G_PATH) === C02_G_PATH_SHA256
    && byteLength(C02_G_PATH) === byteLength(BASE_G_PATH),
  "classic-book uppercase-G path integrity differs"
);
assert(FIFTH_SET_REPERTOIRE.length === 76, "repertoire length differs");
assert(new Set(FIFTH_SET_REPERTOIRE).size === 76, "repertoire is not unique");
assert(
  FIFTH_SET_REPERTOIRE
    === " ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789.,?!:;'\"-()/&",
  "canonical repertoire differs"
);
assert(PUNCTUATION.length === 13, "punctuation count differs");
assert(
  FIFTH_SET_FONT_SLUGS.join("|") === EXPECTED.map(({ slug }) => slug).join("|"),
  "runtime font order differs"
);

const { value: packageJson } = await readJson("package.json");
assert(
  packageJson.name === "@inshell/thought-glyph-library-fifth-set"
    && packageJson.version === "1.7.0"
    && packageJson.private === true
    && packageJson.license === "UNLICENSED"
    && packageJson.exports?.["."] === "./index.mjs"
    && packageJson.exports?.["./fonts/*"] === "./fonts/*/glyphs.json"
    && packageJson.exports?.["./onchain/decoder"] === "./onchain/decoder.mjs"
    && packageJson.scripts?.verify === "node ./verify.mjs"
    && packageJson.scripts?.prepack === "npm run verify"
    && packageJson.scripts?.export === "node ./export.mjs"
    && packageJson.files?.includes("UNLICENSED.md")
    && packageJson.files?.includes("onchain"),
  "standalone package declaration differs"
);

const { value: manifest } = await readJson("manifest.json");
assert(
  manifest.schema === "inshell.thought.glyph-library-set.v1"
    && manifest.id === FIFTH_SET_ID
    && manifest.name === FIFTH_SET_NAME
    && manifest.ordinal === 5
    && manifest.ordinalLabel === "5th Set"
    && manifest.version === 8
    && manifest.status === "declared"
    && manifest.license === "UNLICENSED"
    && manifest.packageName === packageJson.name
    && manifest.canonicalOrder === FIFTH_SET_REPERTOIRE
    && manifest.fontCount === 4
    && manifest.memberCount === 4
    && manifest.fonts?.length === 4
    && manifest.sourceExperimentCommit === SOURCE_COMMIT
    && manifest.revisedOn === C02_GEOMETRY_REVISION.revisedOn
    && equivalent(manifest.revision, C02_GEOMETRY_REVISION)
    && manifest.membershipPolicy?.included.includes("digit-2")
    && manifest.membershipPolicy?.included
      .includes("optically spaced lowercase-f")
    && manifest.membershipPolicy?.included
      .includes("lowercase-k junction")
    && manifest.membershipPolicy?.included
      .includes("vertically centered U+002D")
    && manifest.membershipPolicy?.included
      .includes("smooth uppercase-G lower-join")
    && manifest.punctuationCount === 13,
  "Fifth Set manifest declaration differs"
);
assert(
  manifest.fonts.map(({ sourceCandidate }) => sourceCandidate).join("|")
    === "C01|C02|C04|C06"
    && manifest.fonts.map(({ familyId }) => familyId).join("|")
      === "S501|S502|S503|S504"
    && manifest.fonts.map(({ slug }) => slug).join("|")
      === "classic-line|classic-book|classic-round|classic-compact",
  "Fifth Set membership or order differs"
);
assert(
  !manifest.fonts.some(({ sourceCandidate }) =>
    sourceCandidate === "C03" || sourceCandidate === "C05"
  ),
  "excluded candidates leaked into Fifth Set"
);
assert(
  manifest.totals?.glyphRecords === 304
    && manifest.totals?.visibleGlyphs === 300
    && manifest.totals?.packedBytes === 10_381
    && manifest.totals?.measuredIndependentCreationGasSum === 2_458_107
    && manifest.totals?.measuredIndependentCreationGasSumCaveat
      .includes("not a measured combined contract"),
  "Fifth Set totals or gas caveat differ"
);

for (const [index, expected] of EXPECTED.entries()) {
  const record = manifest.fonts[index];
  const { source: faceSource, value: face } = await readJson(record.file);
  const { source: reportSource, value: report } =
    await readJson(record.byteReport);
  const packed = await readFile(path.join(ROOT, record.packed.binary));
  const packedHex = (
    await readFile(path.join(ROOT, record.packed.hex), "utf8")
  ).trim();
  const { value: packedMetadata } = await readJson(record.packed.metadata);
  const inspected = inspectMono76Packed(packed);

  assert(
    record.order === index + 1
      && record.familyId === expected.familyId
      && record.memberId === expected.memberId
      && record.name === expected.name
      && record.slug === expected.slug
      && record.sourceCandidate === expected.sourceCandidate
      && record.glyphCount === 76
      && record.packed.bytes === expected.packedBytes
      && record.packed.sha256 === expected.packedSha256
      && record.measuredAnvilPragueCreationGas === expected.gas,
    `${expected.slug} manifest record differs`
  );
  assert(
    face.schema === "inshell.thought.glyph-library.set-05.face.v1"
      && face.family?.id === expected.familyId
      && face.family?.name === expected.name
      && face.family?.slug === expected.slug
      && face.family?.sourceCandidate === expected.sourceCandidate
      && face.family?.weight === 400
      && face.family?.style === "Regular"
      && face.librarySet?.id === FIFTH_SET_ID
      && face.librarySet?.memberId === expected.memberId
      && face.librarySet?.order === index + 1
      && face.librarySet?.ordinal === 5
      && face.librarySet?.version === 8
      && face.repertoire === FIFTH_SET_REPERTOIRE
      && face.glyphs?.length === 76
      && face.glyphs.map(({ character }) => character).join("")
        === FIFTH_SET_REPERTOIRE,
    `${expected.slug} face identity differs`
  );
  assert(
    face.metrics?.unitsPerEm === 13
      && face.metrics?.fixedAdvanceWidth === 10
      && face.metrics?.ascender
        === (expected.sourceCandidate === "C02" ? 11 : 10)
      && face.metrics?.capHeight === 10
      && face.metrics?.xHeight === 7
      && face.metrics?.baseline === 0
      && face.metrics?.descender === -3
      && face.metrics?.svgBaselineY === 12
      && face.metrics?.svgViewBoxHeight === 16
      && face.metrics?.space?.advanceWidth === 10
      && face.metrics?.space?.drawsPath === false,
    `${expected.slug} metric contract differs`
  );
  assert(
    face.renderStyle?.fill === "none"
      && face.renderStyle?.strokeWidth === expected.strokeWidth
      && face.renderStyle?.strokeLinecap === expected.strokeLinecap
      && face.renderStyle?.strokeLinejoin === expected.strokeLinejoin
      && equivalent(record.renderStyle, face.renderStyle),
    `${expected.slug} centerline render style differs`
  );
  assert(
    face.provenance?.sourceExperimentCommit === SOURCE_COMMIT
      && face.provenance?.sourceCandidate === expected.sourceCandidate
      && face.provenance?.importedFontOutlines === false
      && face.provenance?.tracedFontOutlines === false
      && (
        expected.sourceCandidate === "C02"
          ? equivalent(
              face.provenance?.geometryRevision,
              C02_GEOMETRY_REVISION
            )
          : face.provenance?.geometryRevision === undefined
      ),
    `${expected.slug} provenance differs`
  );
  assert(
    sha256(faceSource) === record.fileSha256,
    `${expected.slug} face hash differs`
  );
  for (const glyph of face.glyphs) {
    validatePath(expected.slug, glyph.character, glyph.d);
    assert(
      glyph.codepoint === glyph.character.codePointAt(0)
        && glyph.pathSha256 === sha256(glyph.d),
      `${expected.slug}:${JSON.stringify(glyph.character)} glyph metadata differs`
    );
  }
  if (expected.sourceCandidate === "C02") {
    assert(
      face.glyphs.find(({ character }) => character === "A")?.d
          === C02_A_PATH
        && face.glyphs.find(({ character }) => character === "?")?.d
          === C02_QUESTION_PATH
        && face.glyphs.find(({ character }) => character === "f")?.d
          === C02_F_PATH
        && face.glyphs.find(({ character }) => character === "f")
          ?.pathSha256 === C02_F_PATH_SHA256
        && face.glyphs.find(({ character }) => character === "2")?.d
          === C02_TWO_PATH
        && face.glyphs.find(({ character }) => character === "k")?.d
          === C02_K_PATH
        && face.glyphs.find(({ character }) => character === "k")
          ?.pathSha256 === C02_K_PATH_SHA256
        && face.glyphs.find(({ character }) => character === "-")?.d
          === C02_HYPHEN_PATH
        && face.glyphs.find(({ character }) => character === "-")
          ?.pathSha256 === C02_HYPHEN_PATH_SHA256
        && face.glyphs.find(({ character }) => character === "G")?.d
          === C02_G_PATH
        && face.glyphs.find(({ character }) => character === "G")
          ?.pathSha256 === C02_G_PATH_SHA256,
      "classic-book revision-8 geometry differs"
    );
  } else {
    const expectedHyphen = expected.sourceCandidate === "C06"
      ? COMPACT_HYPHEN_PATH
      : BASE_HYPHEN_PATH;
    assert(
      face.glyphs.find(({ character }) => character === "-")?.d
        === expectedHyphen,
      `${expected.slug} preexisting U+002D geometry changed`
    );
    const expectedG = expected.sourceCandidate === "C04"
      ? C04_G_PATH
      : expected.sourceCandidate === "C06"
        ? C06_G_PATH
        : BASE_G_PATH;
    assert(
      face.glyphs.find(({ character }) => character === "G")?.d
        === expectedG,
      `${expected.slug} preexisting uppercase-G geometry changed`
    );
  }

  const pathStream = face.glyphs.map(({ d }) => d).join("");
  assert(
    inspected.magic === "IM76"
      && inspected.version === 1
      && inspected.weight === 400
      && inspected.glyphCount === 76
      && inspected.pathBytes === byteLength(pathStream)
      && packed.length === expected.packedBytes
      && sha256(packed) === expected.packedSha256
      && packedHex === `0x${packed.toString("hex")}`,
    `${expected.slug} packed payload differs`
  );
  for (const glyph of face.glyphs) {
    assert(
      decodeMono76PackedGlyph(packed, glyph.character) === glyph.d,
      `${expected.slug}:${JSON.stringify(glyph.character)} packed decode differs`
    );
  }
  assert(
    packedMetadata.schema
      === "inshell.thought.glyph-library.set-05.im76-payload.v1"
      && packedMetadata.familyId === expected.familyId
      && packedMetadata.slug === expected.slug
      && packedMetadata.sourceCandidate === expected.sourceCandidate
      && packedMetadata.magic === "IM76"
      && packedMetadata.version === 1
      && packedMetadata.weight === 400
      && packedMetadata.glyphCount === 76
      && packedMetadata.totalBytes === packed.length
      && packedMetadata.pathBytes === inspected.pathBytes
      && packedMetadata.sha256 === expected.packedSha256,
    `${expected.slug} packed metadata differs`
  );
  assert(
    report.schema
      === "inshell.thought.glyph-library.set-05.byte-report.v1"
      && report.familyId === expected.familyId
      && report.slug === expected.slug
      && report.sourceCandidate === expected.sourceCandidate
      && report.glyphRecords === 76
      && report.visibleGlyphs === 75
      && report.punctuationGlyphs === 13
      && report.rawPathBytes === byteLength(pathStream)
      && report.rawPathBits === byteLength(pathStream) * 8
      && report.packedHeaderAndOffsetsBytes === 162
      && report.packedPathBytes === inspected.pathBytes
      && report.packedBytes === packed.length
      && report.packedSha256 === expected.packedSha256
      && report.measuredAnvilPragueCreationGas === expected.gas
      && report.measuredGasScope.includes("excludes renderer")
      && sha256(reportSource) === record.byteReportSha256,
    `${expected.slug} byte/gas report differs`
  );

  for (const [fixtureName, fixturePath] of Object.entries(record.fixtures)) {
    const fixture = await readFile(path.join(ROOT, fixturePath), "utf8");
    assert(
      fixture.startsWith("<svg ")
        && fixture.includes(`data-library-set-id="${FIFTH_SET_ID}"`)
        && fixture.includes(`data-library-member-id="${expected.memberId}"`)
        && fixture.includes(`data-font-slug="${expected.slug}"`)
        && fixture.includes('fill="none"')
        && fixture.includes(`stroke-width="${expected.strokeWidth}"`)
        && fixture.includes(`stroke-linecap="${expected.strokeLinecap}"`)
        && fixture.includes(`stroke-linejoin="${expected.strokeLinejoin}"`)
        && (
          fixture.includes('fill="#030604"')
          || fixture.includes('fill="#000000"')
        )
        && !/<(?:text|foreignObject|script|image)\b/i.test(fixture)
        && !/(?:font-family|@font-face|\shref=)/i.test(fixture),
      `${expected.slug} ${fixtureName} fixture differs`
    );
  }
}

const { value: storage } = await readJson("storage-model.json");
assert(
  storage.schema
    === "inshell.thought.glyph-library.set-05.storage-model.v1"
    && storage.fonts?.length === 4
    && storage.fonts.map(({ sourceCandidate }) => sourceCandidate).join("|")
      === "C01|C02|C04|C06"
    && storage.totals?.fontCount === 4
    && storage.totals?.glyphRecords === 304
    && storage.totals?.packedBytes === 10_381
    && storage.totals?.measuredIndependentCreationGasSum === 2_458_107
    && storage.totals?.measuredIndependentCreationGasSumIsCombinedMeasurement
      === false
    && storage.caveat.includes("excludes renderer"),
  "storage/gas model differs"
);

const runtimeManifest = await loadFifthSetManifest();
const runtimeIndex = await listFifthSetFonts();
const runtimeEntries = await loadAllFifthSetFonts();
const round = await loadFifthSetFont("classic-round");
const book = await loadFifthSetFont("classic-book");
const packedRound = await loadFifthSetPacked("classic-round");
const packedBook = await loadFifthSetPacked("classic-book");
assert(
  equivalent(runtimeManifest, manifest)
    && runtimeIndex.length === 4
    && runtimeEntries.length === 4
    && runtimeIndex.map(({ slug }) => slug).join("|")
      === FIFTH_SET_FONT_SLUGS.join("|")
    && runtimeEntries.map(({ font }) => font.family.id).join("|")
      === "S501|S502|S503|S504"
    && assertFifthSetFont(round) === round
    && assertFifthSetFont(book) === book
    && supportsFifthSetText(round, "THOUGHT WILL AWA!")
    && !supportsFifthSetText(round, "PATH #610")
    && assertFifthSetText(round, "PATH 610") === "PATH 610"
    && sha256(packedRound) === EXPECTED[2].packedSha256
    && sha256(packedBook) === EXPECTED[1].packedSha256
    && book.metrics?.ascender === 11
    && book.glyphs.find(({ character }) => character === "A")?.d
      === C02_A_PATH
    && book.glyphs.find(({ character }) => character === "?")?.d
      === C02_QUESTION_PATH
    && book.glyphs.find(({ character }) => character === "f")?.d
      === C02_F_PATH
    && book.glyphs.find(({ character }) => character === "2")?.d
      === C02_TWO_PATH
    && book.glyphs.find(({ character }) => character === "k")?.d
      === C02_K_PATH
    && book.glyphs.find(({ character }) => character === "-")?.d
      === C02_HYPHEN_PATH
    && book.glyphs.find(({ character }) => character === "G")?.d
      === C02_G_PATH,
  "runtime loading or support API differs"
);
try {
  await loadFifthSetFont("classic-slab");
  failures.push("runtime accepted an excluded font");
} catch (error) {
  assert(error instanceof RangeError, "excluded-font error type differs");
}
try {
  assertFifthSetText(round, "@");
  failures.push("runtime accepted an unsupported character");
} catch (error) {
  assert(
    error instanceof RangeError && error.message.includes("U+0040"),
    "unsupported-character error differs"
  );
}

const rendered = renderFifthSetLine(round, "THOUGHT WILL AWA!", {
  background: "#000000",
  height: 100,
  padding: 2,
  stroke: "#00ff35"
});
const renderedAll = await renderAllFifthSetLines("PATH 610");
assert(
  rendered.startsWith("<svg ")
    && rendered.includes(`data-library-set-id="${FIFTH_SET_ID}"`)
    && rendered.includes('data-font-slug="classic-round"')
    && rendered.includes('fill="#000000"')
    && rendered.includes('fill="none"')
    && rendered.includes('stroke-width="0.86"')
    && rendered.includes("scale(1 -1)")
    && !/<(?:text|foreignObject|script)\b/i.test(rendered)
    && renderedAll.length === 4,
  "runtime SVG rendering differs"
);

const gallery = await readFile(path.join(ROOT, "gallery.html"), "utf8");
assert(
  (gallery.match(/<section class="font"/g) ?? []).length === 4
    && (gallery.match(/class="path-card"/g) ?? []).length === 16
    && gallery.includes("Declared Fifth Set")
    && gallery.includes("Classic mono.")
    && gallery.includes("C01, C02, C04, and C06")
    && gallery.includes("approved A crossbar")
    && gallery.includes("question-mark gap")
    && gallery.includes("smooth-rise and optically spaced lowercase-f")
    && gallery.includes("smooth digit-2")
    && gallery.includes("lowercase-k junction")
    && gallery.includes("vertically centered U+002D")
    && gallery.includes("smooth uppercase-G lower-join")
    && gallery.includes("logical ascender at y=11")
    && gallery.includes("centered on x=1..7")
    && gallery.includes(
      "(3.18,3.82), the two-decimal approximation of the diagonal intersection"
    )
    && gallery.includes(
      "U+002D centerline sits at y=5, halfway between baseline and cap height"
    )
    && gallery.includes(
      "uppercase G lower bowl joins the right stem with a shared vertical tangent"
    )
    && gallery.includes("dark presentation only")
    && !gallery.includes("Classic Slab 76")
    && !gallery.includes("Classic Bracket 76")
    && !gallery.includes("#f4f5f4")
    && !gallery.includes("#f4f4f4")
    && !/background:(?:white|#fff(?:fff)?)(?:;|})/i.test(gallery)
    && gallery.includes(".website-stage{")
    && gallery.includes("background:var(--panel)")
    && (gallery.match(/<rect[^>]+fill="#030604"/g) ?? []).length >= 12,
  "dark selected-font gallery differs"
);

const handoff = await readFile(path.join(ROOT, "HANDOFF.md"), "utf8");
const provenance = await readFile(path.join(ROOT, "PROVENANCE.md"), "utf8");
const notice = await readFile(path.join(ROOT, "NOTICE.md"), "utf8");
const unlicensed = await readFile(path.join(ROOT, "UNLICENSED.md"), "utf8");
const review = await readFile(path.join(ROOT, "REVIEW.md"), "utf8");
assert(
  handoff.includes("npm install --save")
    && handoff.includes("loadFifthSetFont")
    && handoff.includes("loadFifthSetPacked")
    && handoff.includes("thought-glyph-library-fifth-set-v8")
    && handoff.includes(SOURCE_COMMIT)
    && handoff.includes('loadFifthSetFont("classic-book")')
    && handoff.includes("C02 revision 8")
    && handoff.includes(C02_F_PATH_SHA256)
    && handoff.includes(C02_K_PATH_SHA256)
    && handoff.includes(C02_HYPHEN_PATH_SHA256)
    && handoff.includes(C02_G_PATH_SHA256)
    && handoff.includes(
      "3ab51d7dcdce7e358e7c76002b8f78ddaa448a99de2116a238f7e22209f2bd60"
    )
    && handoff.includes(
      "0xa1505ed49c1e2b8d78d088de1a6b0b1cefcd6087cd47415bb29c39b4a3394430"
    )
    && handoff.includes("byte-identical glyph paths")
    && handoff.includes("not a measured combined-contract deployment")
    && provenance.includes(SOURCE_COMMIT)
    && provenance.includes(C02_A_PATH)
    && provenance.includes(C02_QUESTION_PATH)
    && provenance.includes(C02_F_PATH)
    && provenance.includes(C02_TWO_PATH)
    && provenance.includes(C02_K_PATH)
    && provenance.includes(C02_HYPHEN_PATH)
    && provenance.includes(C02_G_PATH)
    && provenance.includes("No third-party font file")
    && notice.includes("Copyright © 2026 Inshell")
    && unlicensed.includes("No public license")
    && review.includes("C01, C02, C04, and C06")
    && review.includes("digit-`2`")
    && review.includes("lowercase-`k`")
    && review.includes("U+002D")
    && review.includes("uppercase `G`")
    && review.includes("2,540 bytes")
    && review.includes("602,572 creation"),
  "handoff, provenance, ownership, or review declaration differs"
);

const decoderSolidity = await readFile(
  path.join(ROOT, "onchain/InshellMono76Decoder.sol"),
  "utf8"
);
assert(
  decoderSolidity.includes("library InshellMono76Decoder")
    && decoderSolidity.includes("function glyph")
    && decoderSolidity.includes("function weight"),
  "Solidity decoder differs"
);

const checksumSource = await readFile(path.join(ROOT, "SHA256SUMS"), "utf8");
const checksumEntries = new Map();
for (const line of checksumSource.trimEnd().split("\n")) {
  const match = line.match(/^([0-9a-f]{64})  (.+)$/);
  assert(Boolean(match), `invalid checksum line: ${line}`);
  if (match) {
    assert(!checksumEntries.has(match[2]), `duplicate checksum: ${match[2]}`);
    checksumEntries.set(match[2], match[1]);
  }
}
const allowedTopLevel = new Set(["package.json", ...packageJson.files]);
const distributionFiles = (await listFiles(ROOT))
  .filter((relativePath) =>
    allowedTopLevel.has(relativePath.split("/")[0])
      && relativePath !== "SHA256SUMS"
  );
assert(
  [...checksumEntries.keys()].join("|") === distributionFiles.join("|"),
  "SHA256SUMS file inventory differs"
);
for (const relativePath of distributionFiles) {
  assert(
    checksumEntries.get(relativePath)
      === sha256(await readFile(path.join(ROOT, relativePath))),
    `checksum differs: ${relativePath}`
  );
}

if (failures.length > 0) {
  for (const failure of failures) console.error(`FAIL ${failure}`);
  process.exitCode = 1;
} else {
  console.log(
    "Fifth Set verified: "
      + EXPECTED.map((font) =>
        `${font.familyId}/${font.sourceCandidate} ${font.packedBytes} B`
      ).join(" · ")
  );
}
