import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  loadFirstSetFont,
  loadFirstSetManifest,
  renderFirstSetLine
} from "./index.mjs";

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const EXPECTED_SET = {"id":"inshell.thought.glyph-library.set-01","name":"THOUGHT Glyph Library — First Set","ordinal":1,"ordinalLabel":"1st Set","slug":"first-set","version":1,"qualificationStatus":"study-qualified","declaredOn":"2026-07-24","memberCount":24};
const EXPECTED_SLUGS = ["diamond-lattice","crosspoint-array","ring-register","capsule-chain","horizontal-ledger","vertical-ledger","circuit-nodes","loom-weave","diagonal-shear","wedge-mosaic","negative-slab","stencil-slot","corner-code","pintrace","checker-depth","bubble-signal","stepped-contour","barcode-bands","punchcard-negative","domino-state","binary-dual","folded-ribbon","broken-route","offset-stack"];
const EXPECTED_ORDER = " ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789.,?!:;'\"-()/&";
const FIXTURE_TEXT = "Can an Agent hear silence?";
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

const manifest = await loadFirstSetManifest();
for (const [key, value] of Object.entries(EXPECTED_SET)) {
  if (manifest[key] !== value) failures.push(`manifest ${key} differs from ${JSON.stringify(value)}`);
}
if (manifest.fontCount !== 24 || manifest.fonts.length !== 24) {
  failures.push(`expected 24 fonts, found ${manifest.fonts.length}`);
}
if (manifest.fonts.map((font) => font.slug).join("|") !== EXPECTED_SLUGS.join("|")) {
  failures.push("ordered First Set membership differs");
}
if (new Set(manifest.fonts.map((font) => font.slug)).size !== 24) {
  failures.push("First Set contains duplicate slugs");
}
if (manifest.canonicalOrder !== EXPECTED_ORDER) failures.push("canonical repertoire differs");

for (const record of manifest.fonts) {
  const fontPath = path.join(ROOT, record.file);
  const fontSource = await readFile(fontPath, "utf8");
  if (sha256(fontSource) !== record.sha256) failures.push(`${record.slug} font hash differs`);
  let font;
  try {
    font = await loadFirstSetFont(record.slug);
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
    || font.librarySet?.qualificationStatus !== "study-qualified") {
    failures.push(`${record.slug} First Set declaration differs`);
  }
  const characters = font.glyphs.map((glyph) => glyph.character).join("");
  if (characters !== EXPECTED_ORDER || new Set(characters).size !== 76) {
    failures.push(`${record.slug} glyph ordering or uniqueness differs`);
  }
  for (const glyph of font.glyphs) {
    if (glyph.advanceWidth !== 6) failures.push(`${record.slug} has a non-six-unit advance`);
    if (glyph.character === " " && glyph.d !== "") failures.push(`${record.slug} SPACE draws a path`);
    if (glyph.character !== " " && glyph.d.length === 0) failures.push(`${record.slug} has an empty visible glyph`);
    if (/[^MLHVQCZ0-9.\- ]/.test(glyph.d) || /[a-z]/.test(glyph.d)) {
      failures.push(`${record.slug} U+${glyph.codepoint.toString(16)} has unsupported path syntax`);
    }
    for (const number of glyph.d.match(/-?(?:\d+(?:\.\d+)?|\.\d+)/g) ?? []) {
      if ((number.split(".")[1]?.length ?? 0) > 2) {
        failures.push(`${record.slug} U+${glyph.codepoint.toString(16)} exceeds two-decimal precision`);
      }
    }
  }
  const fixtureSource = await readFile(path.join(ROOT, record.fixture), "utf8");
  const renderedFixture = renderFirstSetLine(font, FIXTURE_TEXT, {
    title: `${record.name} — First Set canonical line`
  });
  if (fixtureSource !== renderedFixture) failures.push(`${record.slug} fixture does not rerender byte-identically`);
  if (sha256(fixtureSource) !== record.fixtureSha256) failures.push(`${record.slug} fixture hash differs`);
}

const checksumLines = (await readFile(path.join(ROOT, "SHA256SUMS"), "utf8")).trim().split("\n");
for (const line of checksumLines) {
  const match = line.match(/^([a-f0-9]{64})  (.+)$/);
  if (!match) {
    failures.push(`malformed SHA256SUMS line: ${line}`);
    continue;
  }
  const source = await readFile(path.join(ROOT, match[2]));
  if (sha256(source) !== match[1]) failures.push(`SHA256SUMS mismatch: ${match[2]}`);
}

if (failures.length) {
  process.stderr.write(`First Set verification failed (${failures.length}):\n- ${failures.join("\n- ")}\n`);
  process.exitCode = 1;
} else {
  process.stdout.write("First Set verification PASS: 24/24 fonts, hashes, schemas, and fixtures\n");
}
