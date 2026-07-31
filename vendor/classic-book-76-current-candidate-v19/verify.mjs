import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  decodeMono76PackedGlyph,
  inspectMono76Packed
} from "./onchain/decoder.mjs";

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const REPERTOIRE = " ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789.,?!:;'\"-()/&";
const EXPECTED_FACE_SHA256 = "0069b4bcc764bb1ffd9707b06a1bdd70a17e523c06dc8b50922e67c21016f0a6";
const EXPECTED_PACKED_SHA256 = "7ccb7fc26c0f7d8a25a70b85acea02ef270f7c10f1bb851eb68301dfadb24567";
const EXPECTED_PACKED_KECCAK256 = "0x4ea6450fce37dc4079370ee798f5bb29f7ed677dcd1300c7fd9b3e27bb4b273e";
const EXPECTED_PACKED_BYTES = 4263;
const EXPECTED_PATH_BYTES = 4101;
const EXPECTED_CHECKSUM_INVENTORY =
  ["HANDOFF.md","NOTICE.md","UNLICENSED.md","glyphs.json","index.mjs","onchain/decoder.mjs","onchain/metadata.json","onchain/packed.bin","onchain/packed.hex","package.json"];
const sha256 = (value) =>
  createHash("sha256").update(value).digest("hex");
const canonicalJson = (value) => {
  const normalize = (item) => {
    if (Array.isArray(item)) return item.map(normalize);
    if (item && typeof item === "object") {
      return Object.fromEntries(
        Object.keys(item).sort().map((key) => [key, normalize(item[key])])
      );
    }
    return item;
  };
  return `${JSON.stringify(normalize(value), null, 2)}\n`;
};

const [faceText, packed, metadataText, packageText, checksumsText] =
  await Promise.all([
    readFile(path.join(ROOT, "glyphs.json"), "utf8"),
    readFile(path.join(ROOT, "onchain/packed.bin")),
    readFile(path.join(ROOT, "onchain/metadata.json"), "utf8"),
    readFile(path.join(ROOT, "package.json"), "utf8"),
    readFile(path.join(ROOT, "SHA256SUMS"), "utf8")
  ]);
const face = JSON.parse(faceText);
const metadata = JSON.parse(metadataText);
const packageJson = JSON.parse(packageText);

assert.equal(faceText, canonicalJson(face), "glyphs JSON is not canonical");
assert.equal(metadataText, canonicalJson(metadata), "metadata JSON is not canonical");
assert.equal(packageText, canonicalJson(packageJson), "package JSON is not canonical");
assert.equal(sha256(faceText), EXPECTED_FACE_SHA256, "face SHA-256 differs");
assert.equal(sha256(packed), EXPECTED_PACKED_SHA256, "packed SHA-256 differs");
assert.equal(packed.length, EXPECTED_PACKED_BYTES, "packed byte count differs");
assert.equal(face.schema, "inshell.thought.glyph-library.classic-book-76.current-candidate.v1", "face schema differs");
assert.equal(face.candidate.revision, "c02-current-study-v19-20260731", "revision differs");
assert.equal(face.repertoire, REPERTOIRE, "repertoire differs");
assert.equal(face.glyphs.length, 76, "glyph count differs");
assert.equal(
  face.glyphs.map(({ character }) => character).join(""),
  REPERTOIRE,
  "glyph order differs"
);
assert.equal(face.metrics.fixedAdvanceWidth, 10, "fixed advance differs");
assert.equal(face.renderStyle.strokeWidth, 1.23, "stroke differs");
assert.equal(face.renderStyle.fill, "none", "fill differs");
assert.equal(face.composition.defaultOriginShiftX, 1, "origin shift differs");
assert.deepEqual(face.composition.appliedPerGlyphOffsets, {}, "baked offsets differ");
for (const glyph of face.glyphs) {
  assert.equal(
    sha256(glyph.d),
    glyph.pathSha256,
    `path SHA-256 differs for ${JSON.stringify(glyph.character)}`
  );
  assert.equal(
    decodeMono76PackedGlyph(packed, glyph.character),
    glyph.d,
    `packed path differs for ${JSON.stringify(glyph.character)}`
  );
}
const inspected = inspectMono76Packed(packed);
assert.equal(inspected.magic, "IM76", "packed magic differs");
assert.equal(inspected.version, 1, "packed version differs");
assert.equal(inspected.weight, 400, "packed weight differs");
assert.equal(inspected.glyphCount, 76, "packed glyph count differs");
assert.equal(inspected.pathBytes, EXPECTED_PATH_BYTES, "path byte count differs");
assert.equal(inspected.bytes.length, EXPECTED_PACKED_BYTES, "total byte count differs");
assert.equal(metadata.sha256, EXPECTED_PACKED_SHA256, "metadata SHA differs");
assert.equal(metadata.keccak256, EXPECTED_PACKED_KECCAK256, "metadata Keccak differs");
assert.equal(packageJson.name, "@inshell/classic-book-76-current-candidate", "package name differs");
assert.equal(packageJson.version, "0.19.0-candidate.20260731", "package version differs");
assert.equal(packageJson.private, true, "package must remain private");

assert.ok(checksumsText.endsWith("\n"), "SHA256SUMS newline missing");
const checksumLines = checksumsText.trimEnd().split("\n");
assert.equal(
  checksumLines.length,
  EXPECTED_CHECKSUM_INVENTORY.length,
  "checksum entry count differs"
);
const checksums = new Map();
for (const line of checksumLines) {
  const match = line.match(/^([0-9a-f]{64})  (.+)$/);
  assert.ok(match, `invalid checksum line: ${line}`);
  checksums.set(match[2], match[1]);
}
assert.deepEqual(
  [...checksums.keys()],
  EXPECTED_CHECKSUM_INVENTORY,
  "checksum inventory differs"
);
for (const relativePath of EXPECTED_CHECKSUM_INVENTORY) {
  assert.equal(
    checksums.get(relativePath),
    sha256(await readFile(path.join(ROOT, relativePath))),
    `checksum differs for ${relativePath}`
  );
}

console.log(
  "Classic Book 76 current candidate verified: "
    + `76 records, ${EXPECTED_PATH_BYTES} path bytes, `
    + `${EXPECTED_PACKED_BYTES} packed bytes, SHA-256 `
    + EXPECTED_PACKED_SHA256
);
