import { createHash } from "node:crypto";
import { gzipSync } from "node:zlib";
import {
  lstat,
  readFile,
  readdir
} from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  listThirdSetFonts,
  loadAllThirdSetFonts,
  loadThirdSetFont,
  renderThirdSetLine
} from "./index.mjs";

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const EXPECTED_SET = Object.freeze({
  id: "inshell.thought.glyph-library.set-03",
  name: "THOUGHT Glyph Library — Third Set",
  ordinal: 3,
  version: 1,
  status: "declared-with-metric-exception"
});
const EXPECTED_ORDER =
  ` ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789.,?!:;'"-()/&`;
const EXPECTED_SLUGS = ["humanist-smooth", "humanist-quantized"];
const EXPECTED_IDS = ["S301", "S302"];
const failures = [];
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const byteLength = (value) => Buffer.byteLength(value, "utf8");

const normalize = (value) => {
  if (Array.isArray(value)) return value.map(normalize);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value).sort().map((key) => [key, normalize(value[key])])
    );
  }
  if (typeof value === "number" && !Number.isFinite(value)) {
    throw new Error("non-finite JSON number");
  }
  return value;
};
const canonicalJson = (value) => `${JSON.stringify(normalize(value), null, 2)}\n`;

const listFiles = async (directory, prefix = "") => {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const absolute = path.join(directory, entry.name);
    const relative = path.posix.join(prefix, entry.name);
    const stat = await lstat(absolute);
    if (stat.isSymbolicLink()) {
      failures.push(`symlink is not allowed: ${relative}`);
      continue;
    }
    if (entry.isDirectory()) {
      files.push(...await listFiles(absolute, relative));
    } else if (entry.isFile()) {
      files.push(relative);
    }
  }
  return files.sort();
};

const manifestSource = await readFile(path.join(ROOT, "manifest.json"), "utf8");
const manifest = JSON.parse(manifestSource);
if (
  manifest.id !== EXPECTED_SET.id
  || manifest.name !== EXPECTED_SET.name
  || manifest.ordinal !== EXPECTED_SET.ordinal
  || manifest.version !== EXPECTED_SET.version
  || manifest.qualificationStatus !== EXPECTED_SET.status
) {
  failures.push("Third Set declaration differs");
}
if (manifest.canonicalOrder !== EXPECTED_ORDER) {
  failures.push("canonical repertoire differs");
}
if (manifest.fontCount !== 2 || manifest.fonts?.length !== 2) {
  failures.push("Third Set must contain exactly two fonts");
}
if (manifest.fonts?.map((record) => record.slug).join("|") !== EXPECTED_SLUGS.join("|")) {
  failures.push("Third Set ordered slugs differ");
}
if (manifest.fonts?.map((record) => record.familyId).join("|") !== EXPECTED_IDS.join("|")) {
  failures.push("Third Set family IDs differ");
}
if (
  manifest.reviewSummary?.visualPass !== 2
  || manifest.reviewSummary?.metricContractHold !== 2
) {
  failures.push("Third Set review summary differs");
}

const packageJson = JSON.parse(await readFile(path.join(ROOT, "package.json"), "utf8"));
if (
  packageJson.name !== "@inshell/thought-glyph-library-third-set"
  || packageJson.version !== "1.0.0"
  || packageJson.license !== "OFL-1.1"
  || packageJson.exports?.["."] !== "./index.mjs"
  || packageJson.exports?.["./fonts/*"] !== "./fonts/*/glyphs.json"
) {
  failures.push("installable package declaration differs");
}

const runtimeRecords = await listThirdSetFonts();
if (runtimeRecords.map((record) => record.slug).join("|") !== EXPECTED_SLUGS.join("|")) {
  failures.push("runtime font index differs");
}

const signatures = new Set();
for (const [index, record] of (manifest.fonts ?? []).entries()) {
  const expectedSlug = EXPECTED_SLUGS[index];
  const expectedId = EXPECTED_IDS[index];
  if (
    record.slug !== expectedSlug
    || record.familyId !== expectedId
    || record.memberId !== `${EXPECTED_SET.id}.${expectedSlug}`
    || record.classification !== "conventional-outline"
    || record.review?.visual !== "pass"
    || record.review?.metricContract !== "hold"
  ) {
    failures.push(`${expectedSlug} manifest record differs`);
    continue;
  }

  const fontSource = await readFile(path.join(ROOT, record.file), "utf8");
  const font = JSON.parse(fontSource);
  if (canonicalJson(font) !== fontSource) {
    failures.push(`${expectedSlug} glyph payload is not canonical JSON`);
  }
  if (sha256(fontSource) !== record.sha256) {
    failures.push(`${expectedSlug} glyph payload hash differs`);
  }
  if (
    font.family?.slug !== expectedSlug
    || font.family?.id !== expectedId
    || font.family?.classification !== "conventional-outline"
    || font.librarySet?.id !== EXPECTED_SET.id
    || font.librarySet?.memberId !== record.memberId
    || font.librarySet?.qualificationStatus !== EXPECTED_SET.status
    || font.experiment?.setMembership !== record.memberId
  ) {
    failures.push(`${expectedSlug} embedded Third Set declaration differs`);
  }
  if (
    font.family?.review?.visual !== "pass"
    || font.family?.review?.metricContract !== "hold"
    || font.metrics?.visualBaseline !== record.visualBaseline
    || font.metrics?.studyContractBaseline !== 7
    || font.metrics?.baselineContractStatus !== "experimental-mismatch-disclosed"
  ) {
    failures.push(`${expectedSlug} metric exception differs`);
  }
  if (
    font.canonicalOrder !== EXPECTED_ORDER
    || font.glyphs?.length !== 76
    || font.glyphs.map((glyph) => glyph.character).join("") !== EXPECTED_ORDER
  ) {
    failures.push(`${expectedSlug} glyph repertoire differs`);
  }

  const paths = font.glyphs.map((glyph) => glyph.d).join("");
  signatures.add(sha256(paths));
  const commands = paths.match(/[MLHVQCZ]/g) ?? [];
  const operands = paths.match(/-?(?:\d+(?:\.\d+)?|\.\d+)/g) ?? [];
  for (const glyph of font.glyphs) {
    if (glyph.advanceWidth !== 6) {
      failures.push(`${expectedSlug} has a non-six-unit advance`);
      break;
    }
    if (glyph.character === " " ? glyph.d !== "" : glyph.d.length === 0) {
      failures.push(`${expectedSlug} SPACE/visible-path contract differs`);
      break;
    }
    if (/[^MLHVQCZ0-9.\- ]/.test(glyph.d) || /[a-z]/.test(glyph.d)) {
      failures.push(`${expectedSlug} has unsupported path syntax`);
      break;
    }
  }
  for (const operand of operands) {
    const value = Number(operand);
    if (
      !Number.isFinite(value)
      || value < 0
      || value > 8
      || (operand.split(".")[1]?.length ?? 0) > 2
    ) {
      failures.push(`${expectedSlug} has an invalid coordinate`);
      break;
    }
    if (
      expectedSlug === "humanist-quantized"
      && Math.abs(value * 4 - Math.round(value * 4)) > 1e-9
    ) {
      failures.push(`${expectedSlug} leaves the quarter-unit lattice`);
      break;
    }
  }

  const reportSource = await readFile(path.join(ROOT, record.byteReport), "utf8");
  const report = JSON.parse(reportSource);
  if (sha256(reportSource) !== record.byteReportSha256) {
    failures.push(`${expectedSlug} byte-report hash differs`);
  }
  const rawPathBytes = byteLength(paths);
  const commandTagBits = commands.length * 3;
  const coordinateStreamBits =
    operands.length * report.compactFixedWidthDataFloor.coordinateWidthBits;
  const glyphOffsetWidthBits = Math.ceil(Math.log2(commands.length + 1));
  const glyphOffsetBits = 77 * glyphOffsetWidthBits;
  const totalBits = commandTagBits + coordinateStreamBits + glyphOffsetBits;
  if (
    report.rawPathBytes !== rawPathBytes
    || report.rawPathBits !== rawPathBytes * 8
    || report.normalizedPathBytes !== rawPathBytes
    || report.gzipBytesInformational
      !== gzipSync(paths, { level: 9, mtime: 0 }).byteLength
    || report.pathCommands !== commands.length
    || report.numericOperands !== operands.length
    || report.canonicalManifestBytes !== byteLength(fontSource)
    || report.compactFixedWidthDataFloor.commandTagBits !== commandTagBits
    || report.compactFixedWidthDataFloor.coordinateStreamBits
      !== coordinateStreamBits
    || report.compactFixedWidthDataFloor.glyphOffsetWidthBits
      !== glyphOffsetWidthBits
    || report.compactFixedWidthDataFloor.glyphOffsetBits !== glyphOffsetBits
    || report.compactFixedWidthDataFloor.totalBits !== totalBits
    || report.compactFixedWidthDataFloor.totalBytesRoundedUp
      !== Math.ceil(totalBits / 8)
  ) {
    failures.push(`${expectedSlug} byte report differs`);
  }

  const runtimeFont = await loadThirdSetFont(expectedSlug);
  if (canonicalJson(runtimeFont) !== fontSource) {
    failures.push(`${expectedSlug} runtime payload differs`);
  }
  const fixtureSource = await readFile(path.join(ROOT, record.fixture), "utf8");
  const fixture = renderThirdSetLine(font, manifest.fixtureText, {
    title: `${font.family.name} — Third Set canonical line`
  });
  if (
    fixtureSource !== fixture
    || sha256(fixtureSource) !== record.fixtureSha256
  ) {
    failures.push(`${expectedSlug} canonical fixture differs`);
  }
}
if (signatures.size !== 2) failures.push("Third Set outline signatures are not distinct");

const loaded = await loadAllThirdSetFonts();
if (loaded.length !== 2) failures.push("runtime did not load both Third Set fonts");

const storage = JSON.parse(await readFile(path.join(ROOT, "storage-model.json"), "utf8"));
if (
  storage.setId !== EXPECTED_SET.id
  || storage.fontCount !== 2
  || storage.expandedNativeSvg?.totalPathBytes !== 42146
  || storage.compactFixedWidthDataFloor?.totalBits !== 88469
) {
  failures.push("Third Set storage model differs");
}

const license = await readFile(path.join(ROOT, "LICENSE-OFL.md"), "utf8");
if (
  !license.includes("SIL OPEN FONT LICENSE Version 1.1")
  || !license.includes("Reserved Font Name 'Source'")
) {
  failures.push("OFL license/copyright notice differs");
}
const handoff = await readFile(path.join(ROOT, "HANDOFF.md"), "utf8");
if (
  !handoff.includes("npm run export:third-set")
  || !handoff.includes("@inshell/thought-glyph-library-third-set")
  || !handoff.includes("loadAllThirdSetFonts")
) {
  failures.push("downstream handoff is incomplete");
}

const actualFiles = await listFiles(ROOT);
const checksumLines = (
  await readFile(path.join(ROOT, "SHA256SUMS"), "utf8")
).trim().split("\n");
const listed = new Set();
for (const line of checksumLines) {
  const match = line.match(/^([a-f0-9]{64})  (.+)$/);
  if (!match) {
    failures.push(`malformed checksum line: ${line}`);
    continue;
  }
  listed.add(match[2]);
  const contents = await readFile(path.join(ROOT, match[2]));
  if (sha256(contents) !== match[1]) {
    failures.push(`checksum mismatch: ${match[2]}`);
  }
}
for (const relative of actualFiles.filter((file) => file !== "SHA256SUMS")) {
  if (!listed.has(relative)) failures.push(`unlisted bundle file: ${relative}`);
}
for (const relative of listed) {
  if (!actualFiles.includes(relative)) failures.push(`listed file is absent: ${relative}`);
}

if (failures.length) {
  process.stderr.write(
    `Third Set verification failed (${failures.length}):\n- ${failures.join("\n- ")}\n`
  );
  process.exitCode = 1;
} else {
  process.stdout.write(
    "Third Set verification PASS: 2/2 conventional-outline fonts, metric exceptions, hashes, fixtures, runtime API, package exports, OFL license, and handoff\n"
  );
}
