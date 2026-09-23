import { createHash } from "node:crypto";
import { lstat, readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";
import {
  loadSecondSetFont,
  loadSecondSetManifest,
  renderSecondSetLine
} from "./index.mjs";

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const EXPECTED_SET = {"id":"inshell.thought.glyph-library.set-02","name":"THOUGHT Glyph Library — Second Set","ordinal":2,"ordinalLabel":"2nd Set","slug":"second-set","version":1,"qualificationStatus":"exploratory-complete","declaredOn":"2026-07-24","memberCount":36};
const EXPECTED_TYPES = [{"id":"segment-mask","approachNumber":2,"approachLabel":"02 · Segment masks","memberCount":12},{"id":"stroke-graph","approachNumber":3,"approachLabel":"03 · Stroke graph","memberCount":12},{"id":"routed-path","approachNumber":4,"approachLabel":"04 · Routed path","memberCount":12}];
const EXPECTED_SLUGS = ["row-ledger","column-relay","orthogonal-bus","diagonal-truss","carrier-rail","elevator-relay","perimeter-tape","port-gap-code","bias-weave","tri-slot-shutter","dominant-axis","corner-scaffold","orthogonal-truss","diagonal-relay","pruned-arbor","terminal-runs","ladder-logic","median-bus","serpentine-thread","corner-switch","twin-channel","directed-flow","centroid-star","octilinear-knot","row-serpentine","column-serpentine","dogleg-maze","diagonal-shuttle","near-hop-dispatch","depth-trace","turn-priority-conduit","edge-bus","hub-spokes","orbit-loop","twin-rail-exchange","perimeter-relay"];
const EXPECTED_REVIEW_SUMMARY = {"legibilityPassCount":21,"legibilityHoldCount":15,"identityPassCount":20,"identityHoldCount":16,"dualPassCandidateCount":9,"combinedHoldCount":27,"expandedProtocolPassCount":36,"compactStorageHoldCount":36};
const EXPECTED_REVIEWS = {"row-ledger":{"legibility":"pass","identity":"pass","expandedProtocol":"pass","compactStorage":"unmeasured-hold","combined":"dual-pass-candidate"},"column-relay":{"legibility":"pass","identity":"pass","expandedProtocol":"pass","compactStorage":"unmeasured-hold","combined":"dual-pass-candidate"},"orthogonal-bus":{"legibility":"pass","identity":"hold","expandedProtocol":"pass","compactStorage":"unmeasured-hold","combined":"hold"},"diagonal-truss":{"legibility":"hold","identity":"pass","expandedProtocol":"pass","compactStorage":"unmeasured-hold","combined":"hold"},"carrier-rail":{"legibility":"hold","identity":"pass","expandedProtocol":"pass","compactStorage":"unmeasured-hold","combined":"hold"},"elevator-relay":{"legibility":"hold","identity":"pass","expandedProtocol":"pass","compactStorage":"unmeasured-hold","combined":"hold"},"perimeter-tape":{"legibility":"pass","identity":"pass","expandedProtocol":"pass","compactStorage":"unmeasured-hold","combined":"dual-pass-candidate"},"port-gap-code":{"legibility":"pass","identity":"pass","expandedProtocol":"pass","compactStorage":"unmeasured-hold","combined":"dual-pass-candidate"},"bias-weave":{"legibility":"pass","identity":"pass","expandedProtocol":"pass","compactStorage":"unmeasured-hold","combined":"dual-pass-candidate"},"tri-slot-shutter":{"legibility":"pass","identity":"hold","expandedProtocol":"pass","compactStorage":"unmeasured-hold","combined":"hold"},"dominant-axis":{"legibility":"pass","identity":"hold","expandedProtocol":"pass","compactStorage":"unmeasured-hold","combined":"hold"},"corner-scaffold":{"legibility":"pass","identity":"hold","expandedProtocol":"pass","compactStorage":"unmeasured-hold","combined":"hold"},"orthogonal-truss":{"legibility":"pass","identity":"pass","expandedProtocol":"pass","compactStorage":"unmeasured-hold","combined":"dual-pass-candidate"},"diagonal-relay":{"legibility":"pass","identity":"hold","expandedProtocol":"pass","compactStorage":"unmeasured-hold","combined":"hold"},"pruned-arbor":{"legibility":"pass","identity":"hold","expandedProtocol":"pass","compactStorage":"unmeasured-hold","combined":"hold"},"terminal-runs":{"legibility":"pass","identity":"hold","expandedProtocol":"pass","compactStorage":"unmeasured-hold","combined":"hold"},"ladder-logic":{"legibility":"pass","identity":"hold","expandedProtocol":"pass","compactStorage":"unmeasured-hold","combined":"hold"},"median-bus":{"legibility":"hold","identity":"pass","expandedProtocol":"pass","compactStorage":"unmeasured-hold","combined":"hold"},"serpentine-thread":{"legibility":"hold","identity":"hold","expandedProtocol":"pass","compactStorage":"unmeasured-hold","combined":"hold"},"corner-switch":{"legibility":"pass","identity":"hold","expandedProtocol":"pass","compactStorage":"unmeasured-hold","combined":"hold"},"twin-channel":{"legibility":"pass","identity":"hold","expandedProtocol":"pass","compactStorage":"unmeasured-hold","combined":"hold"},"directed-flow":{"legibility":"pass","identity":"hold","expandedProtocol":"pass","compactStorage":"unmeasured-hold","combined":"hold"},"centroid-star":{"legibility":"hold","identity":"pass","expandedProtocol":"pass","compactStorage":"unmeasured-hold","combined":"hold"},"octilinear-knot":{"legibility":"pass","identity":"pass","expandedProtocol":"pass","compactStorage":"unmeasured-hold","combined":"dual-pass-candidate"},"row-serpentine":{"legibility":"hold","identity":"pass","expandedProtocol":"pass","compactStorage":"unmeasured-hold","combined":"hold"},"column-serpentine":{"legibility":"hold","identity":"pass","expandedProtocol":"pass","compactStorage":"unmeasured-hold","combined":"hold"},"dogleg-maze":{"legibility":"hold","identity":"hold","expandedProtocol":"pass","compactStorage":"unmeasured-hold","combined":"hold"},"diagonal-shuttle":{"legibility":"hold","identity":"hold","expandedProtocol":"pass","compactStorage":"unmeasured-hold","combined":"hold"},"near-hop-dispatch":{"legibility":"hold","identity":"pass","expandedProtocol":"pass","compactStorage":"unmeasured-hold","combined":"hold"},"depth-trace":{"legibility":"pass","identity":"pass","expandedProtocol":"pass","compactStorage":"unmeasured-hold","combined":"dual-pass-candidate"},"turn-priority-conduit":{"legibility":"pass","identity":"hold","expandedProtocol":"pass","compactStorage":"unmeasured-hold","combined":"hold"},"edge-bus":{"legibility":"hold","identity":"pass","expandedProtocol":"pass","compactStorage":"unmeasured-hold","combined":"hold"},"hub-spokes":{"legibility":"hold","identity":"pass","expandedProtocol":"pass","compactStorage":"unmeasured-hold","combined":"hold"},"orbit-loop":{"legibility":"hold","identity":"pass","expandedProtocol":"pass","compactStorage":"unmeasured-hold","combined":"hold"},"twin-rail-exchange":{"legibility":"hold","identity":"hold","expandedProtocol":"pass","compactStorage":"unmeasured-hold","combined":"hold"},"perimeter-relay":{"legibility":"pass","identity":"pass","expandedProtocol":"pass","compactStorage":"unmeasured-hold","combined":"dual-pass-candidate"}};
const EXPECTED_ORDER = " ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789.,?!:;'\"-()/&";
const FIXTURE_TEXT = "THOUGHT 01? Agent &";
const failures = [];
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const canonicalJson = (value) => {
  const normalize = (item) => {
    if (Array.isArray(item)) return item.map(normalize);
    if (item && typeof item === "object") {
      return Object.fromEntries(Object.keys(item).sort().map((key) => [key, normalize(item[key])]));
    }
    return item;
  };
  return JSON.stringify(normalize(value), null, 2) + "\n";
};
const byteReportFor = (font) => {
  const paths = font.glyphs.map((glyph) => glyph.d).join("");
  const commands = paths.match(/[MLHVQCZ]/g) ?? [];
  const operands = paths.match(/-?(?:\d+(?:\.\d+)?|\.\d+)/g) ?? [];
  return {
    rawPathBytes: Buffer.byteLength(paths, "utf8"),
    normalizedPathBytes: Buffer.byteLength(paths, "utf8"),
    gzipBytesInformational: gzipSync(paths, { level: 9, mtime: 0 }).byteLength,
    pathCommands: commands.length,
    numericOperands: operands.length,
    maximumDecimalPrecision: operands.reduce(
      (maximum, operand) => Math.max(maximum, operand.split(".")[1]?.length ?? 0),
      0
    ),
    canonicalManifestBytes: Buffer.byteLength(canonicalJson(font), "utf8")
  };
};

const validatePath = (d, label) => {
  if (/[^MLHVQCZ0-9.\- ]/.test(d) || /[a-z]/.test(d)) {
    failures.push(`${label} has unsupported path syntax`);
    return;
  }
  const tokens = d.match(/[MLHVQCZ]|-?(?:\d+(?:\.\d+)?|\.\d+)/g) ?? [];
  const arity = { M: 2, L: 2, H: 1, V: 1, Q: 4, C: 6, Z: 0 };
  let index = 0;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  while (index < tokens.length) {
    const command = tokens[index++];
    if (!(command in arity)) {
      failures.push(`${label} has an operand where a command was required`);
      return;
    }
    const count = arity[command];
    const raw = tokens.slice(index, index + count);
    const values = raw.map(Number);
    index += count;
    if (values.length !== count || values.some((value) => !Number.isFinite(value))) {
      failures.push(`${label} has malformed ${command} operands`);
      return;
    }
    if (raw.some((number) => (number.split(".")[1]?.length ?? 0) > 2)) {
      failures.push(`${label} exceeds two-decimal precision`);
    }
    if (command === "H") {
      minX = Math.min(minX, values[0]);
      maxX = Math.max(maxX, values[0]);
    } else if (command === "V") {
      minY = Math.min(minY, values[0]);
      maxY = Math.max(maxY, values[0]);
    } else {
      for (let operand = 0; operand < values.length; operand += 2) {
        minX = Math.min(minX, values[operand]);
        maxX = Math.max(maxX, values[operand]);
        minY = Math.min(minY, values[operand + 1]);
        maxY = Math.max(maxY, values[operand + 1]);
      }
    }
  }
  if (Number.isFinite(minX)
    && (minX < 0.45 - 0.001 || maxX > 5.55 + 0.001
      || minY < 0.3 - 0.001 || maxY > 7.2 + 0.001)) {
    failures.push(`${label} exceeds declared bounds: ${minX},${minY}–${maxX},${maxY}`);
  }
};

const listBundleFiles = async (directory, prefix = "") => {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const relative = prefix ? `${prefix}/${entry.name}` : entry.name;
    const target = path.join(directory, entry.name);
    if (entry.isSymbolicLink() || (await lstat(target)).isSymbolicLink()) {
      failures.push(`bundle contains a symlink: ${relative}`);
      continue;
    }
    if (entry.isDirectory()) {
      files.push(...await listBundleFiles(target, relative));
    } else if (entry.isFile()) {
      files.push(relative);
    }
  }
  return files.sort();
};

const manifest = await loadSecondSetManifest();
for (const [key, value] of Object.entries(EXPECTED_SET)) {
  if (manifest[key] !== value) {
    failures.push(`manifest ${key} differs from ${JSON.stringify(value)}`);
  }
}
if (manifest.fontCount !== 36 || manifest.fonts.length !== 36) {
  failures.push(`expected 36 fonts, found ${manifest.fonts.length}`);
}
if (manifest.fonts.map((font) => font.slug).join("|") !== EXPECTED_SLUGS.join("|")) {
  failures.push("ordered Second Set membership differs");
}
if (new Set(manifest.fonts.map((font) => font.slug)).size !== 36) {
  failures.push("Second Set contains duplicate slugs");
}
if (manifest.canonicalOrder !== EXPECTED_ORDER) failures.push("canonical repertoire differs");
if (canonicalJson(manifest.reviewSummary) !== canonicalJson(EXPECTED_REVIEW_SUMMARY)) {
  failures.push("Second Set review summary differs");
}
for (const type of EXPECTED_TYPES) {
  const actual = manifest.fonts.filter((font) => font.type === type.id).length;
  if (actual !== 12) failures.push(`${type.id} expected 12 fonts, found ${actual}`);
}

const pathSignatures = new Set();
for (const record of manifest.fonts) {
  const fontPath = path.join(ROOT, record.file);
  const fontSource = await readFile(fontPath, "utf8");
  if (sha256(fontSource) !== record.sha256) failures.push(`${record.slug} font hash differs`);
  let font;
  try {
    font = await loadSecondSetFont(record.slug);
  } catch (error) {
    failures.push(String(error.message));
    continue;
  }
  if (canonicalJson(font) !== fontSource) failures.push(`${record.slug} is not canonical JSON`);
  if (font.canonicalOrder !== EXPECTED_ORDER || font.glyphs.length !== 76) {
    failures.push(`${record.slug} repertoire differs`);
  }
  if (font.librarySet?.id !== EXPECTED_SET.id
    || font.librarySet?.memberId !== record.memberId
    || font.librarySet?.qualificationStatus !== EXPECTED_SET.qualificationStatus) {
    failures.push(`${record.slug} Second Set declaration differs`);
  }
  if (font.family?.construction?.approach !== record.type) {
    failures.push(`${record.slug} type differs`);
  }
  if (canonicalJson(record.review) !== canonicalJson(EXPECTED_REVIEWS[record.slug])) {
    failures.push(`${record.slug} review status differs`);
  }
  const characters = font.glyphs.map((glyph) => glyph.character).join("");
  if (characters !== EXPECTED_ORDER || new Set(characters).size !== 76) {
    failures.push(`${record.slug} glyph ordering or uniqueness differs`);
  }
  for (const glyph of font.glyphs) {
    if (glyph.codepoint !== glyph.character.codePointAt(0)) {
      failures.push(`${record.slug} has a codepoint mismatch`);
    }
    if (glyph.advanceWidth !== 6) failures.push(`${record.slug} has a non-six-unit advance`);
    if (glyph.character === " " && glyph.d !== "") failures.push(`${record.slug} SPACE draws a path`);
    if (glyph.character !== " " && glyph.d.length === 0) {
      failures.push(`${record.slug} has an empty visible glyph`);
    }
    validatePath(glyph.d, `${record.slug}:U+${glyph.codepoint.toString(16)}`);
  }
  const byteReportSource = await readFile(path.join(ROOT, record.byteReport), "utf8");
  const expectedByteReport = byteReportFor(font);
  if (byteReportSource !== canonicalJson(expectedByteReport)) {
    failures.push(`${record.slug} byte report does not recompute byte-identically`);
  }
  if (record.normalizedPathBytes !== expectedByteReport.normalizedPathBytes
    || record.pathCommands !== expectedByteReport.pathCommands) {
    failures.push(`${record.slug} manifest byte metrics differ`);
  }
  pathSignatures.add(sha256(font.glyphs.map((glyph) => glyph.d).join("|")));
  const fixtureSource = await readFile(path.join(ROOT, record.fixture), "utf8");
  const renderedFixture = renderSecondSetLine(font, FIXTURE_TEXT, {
    title: `${record.name} — Second Set canonical line`
  });
  if (fixtureSource !== renderedFixture) {
    failures.push(`${record.slug} fixture does not rerender byte-identically`);
  }
  if (sha256(fixtureSource) !== record.fixtureSha256) {
    failures.push(`${record.slug} fixture hash differs`);
  }
}
if (pathSignatures.size !== 36) {
  failures.push(`expected 36 distinct full-repertoire signatures, found ${pathSignatures.size}`);
}
const storageSource = await readFile(path.join(ROOT, manifest.storageModel), "utf8");
const storage = JSON.parse(storageSource);
const expandedTotal = manifest.fonts.reduce(
  (total, record) => total + record.normalizedPathBytes,
  0
);
if (storage.setId !== EXPECTED_SET.id
  || storage.expandedNativeSvg?.fontCount !== 36
  || storage.expandedNativeSvg?.totalPathBytes !== expandedTotal
  || storage.compactGrammarDataFloor?.bitPackedBitmapPlusSelectorsBytes !== 365
  || storage.compactGrammarDataFloor?.byteAlignedBitmapPlusSelectorsBytes !== 411) {
  failures.push("storage model differs from the verified font records");
}

const checksumLines = (await readFile(path.join(ROOT, "SHA256SUMS"), "utf8"))
  .trim()
  .split("\n");
const checksumFiles = new Set();
for (const line of checksumLines) {
  const match = line.match(/^([a-f0-9]{64})  (.+)$/);
  if (!match) {
    failures.push(`malformed SHA256SUMS line: ${line}`);
    continue;
  }
  if (checksumFiles.has(match[2])) {
    failures.push(`duplicate SHA256SUMS entry: ${match[2]}`);
    continue;
  }
  checksumFiles.add(match[2]);
  try {
    const source = await readFile(path.join(ROOT, match[2]));
    if (sha256(source) !== match[1]) failures.push(`SHA256SUMS mismatch: ${match[2]}`);
  } catch {
    failures.push(`SHA256SUMS file is missing: ${match[2]}`);
  }
}
const actualFiles = (await listBundleFiles(ROOT)).filter(
  (relative) => relative !== "SHA256SUMS"
);
for (const relative of actualFiles) {
  if (!checksumFiles.has(relative)) failures.push(`unlisted bundle file: ${relative}`);
}
for (const relative of checksumFiles) {
  if (!actualFiles.includes(relative)) failures.push(`listed bundle file is absent: ${relative}`);
}

if (failures.length) {
  process.stderr.write(
    `Second Set verification failed (${failures.length}):\n- ${failures.join("\n- ")}\n`
  );
  process.exitCode = 1;
} else {
  process.stdout.write(
    "Second Set verification PASS: 36/36 fonts (12 segment masks, 12 stroke graphs, 12 routed paths), hashes, bounds, syntax, and fixtures\n"
  );
}
