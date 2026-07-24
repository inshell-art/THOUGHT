#!/usr/bin/env node

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { keccak256 } from "ethers";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const sourceRelative =
  "vendor/thought-glyph-library-third-set/fonts/humanist-smooth/glyphs.json";
const licenseSourceRelative =
  "vendor/thought-glyph-library-third-set/LICENSE-OFL.md";
const noticeSourceRelative =
  "vendor/thought-glyph-library-third-set/NOTICE.md";
const outputDirectoryRelative = "protocol/current/v2/renderer";
const profileRelative =
  `${outputDirectoryRelative}/thought.renderer.v2.profile.json`;
const canonicalOrder =
  " ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789.,?!:;'\"-()/&";
const maxPartBytes = 16_000;
const sourceFile = path.join(root, sourceRelative);
const licenseBytes = fs.readFileSync(path.join(root, licenseSourceRelative));
const noticeBytes = fs.readFileSync(path.join(root, noticeSourceRelative));
const outputDirectory = path.join(root, outputDirectoryRelative);
const checkOnly = process.argv.includes("--check");

const sha256 = (value) =>
  crypto.createHash("sha256").update(value).digest("hex");

const fail = (message) => {
  throw new Error(`THOUGHT V2 Humanist Smooth renderer generation failed: ${message}`);
};

const sourceBytes = fs.readFileSync(sourceFile);
const font = JSON.parse(sourceBytes.toString("utf8"));

if (
  font.family?.slug !== "humanist-smooth"
  || font.family?.id !== "S301"
  || font.librarySet?.id !== "inshell.thought.glyph-library.set-03"
  || font.librarySet?.memberId
    !== "inshell.thought.glyph-library.set-03.humanist-smooth"
  || font.librarySet?.version !== 1
) {
  fail("selected glyph-library identity drifted");
}
if (
  font.canonicalOrder !== canonicalOrder
  || font.glyphs?.length !== 76
) {
  fail("selected repertoire drifted");
}
if (
  font.metrics?.emSquare !== 8
  || font.metrics?.fixedAdvanceWidth !== 6
  || font.metrics?.fillRule !== "evenodd"
  || font.metrics?.visualBaseline !== 5.58
) {
  fail("selected Humanist Smooth metrics drifted");
}

for (let index = 0; index < canonicalOrder.length; index += 1) {
  const glyph = font.glyphs[index];
  const character = canonicalOrder[index];
  if (
    glyph?.character !== character
    || glyph?.codepoint !== character.codePointAt(0)
    || glyph?.advanceWidth !== 6
  ) {
    fail(`glyph order or advance drifted at index ${index}`);
  }
  if ((character === " ") !== (glyph.d === "")) {
    fail(`SPACE/path rule drifted at index ${index}`);
  }
}

const pathFragments = font.glyphs
  .filter(({ character }) => character !== " ")
  .map(({ codepoint, d }) => {
    const suffix = codepoint.toString(16).padStart(4, "0");
    return `<path id="humanist-smooth-g${suffix}" d="${d}" fill-rule="evenodd"/>`;
  });

const parts = [{ contents: "", byteLength: 0 }];
const glyphLocations = [];
for (const fragment of pathFragments) {
  const fragmentBytes = Buffer.from(fragment, "utf8");
  let part = parts.at(-1);
  if (part.byteLength + fragmentBytes.length > maxPartBytes && part.byteLength > 0) {
    part = { contents: "", byteLength: 0 };
    parts.push(part);
  }
  glyphLocations.push({
    byteLength: fragmentBytes.length,
    offset: part.byteLength,
    part: parts.length,
  });
  part.contents += fragment;
  part.byteLength += fragmentBytes.length;
}
if (parts.length !== 2) fail(`expected exactly two definition parts, received ${parts.length}`);

const outputs = new Map();
const licenseRelative = `${outputDirectoryRelative}/LICENSE-HUMANIST-SMOOTH-OFL-1.1.md`;
const noticeRelative = `${outputDirectoryRelative}/NOTICE-HUMANIST-SMOOTH.md`;
outputs.set(licenseRelative, licenseBytes);
outputs.set(noticeRelative, noticeBytes);
const partRecords = parts.map(({ contents }, index) => {
  const filename = `humanist-smooth-defs-${index + 1}.svgfrag`;
  const relativePath = `${outputDirectoryRelative}/${filename}`;
  const bytes = Buffer.from(contents, "utf8");
  outputs.set(relativePath, bytes);
  return {
    byteLength: bytes.length,
    keccak256: keccak256(bytes),
    path: relativePath,
    sha256: sha256(bytes),
  };
});

const glyphIndexBytes = Buffer.alloc(glyphLocations.length * 5);
for (let index = 0; index < glyphLocations.length; index += 1) {
  const location = glyphLocations[index];
  if (location.offset > 0xffff || location.byteLength > 0xffff) {
    fail(`glyph index does not fit uint16 fields at ${index}`);
  }
  const cursor = index * 5;
  glyphIndexBytes[cursor] = location.part;
  glyphIndexBytes.writeUInt16BE(location.offset, cursor + 1);
  glyphIndexBytes.writeUInt16BE(location.byteLength, cursor + 3);
}
const glyphIndexRelative = `${outputDirectoryRelative}/humanist-smooth-index.bin`;
outputs.set(glyphIndexRelative, glyphIndexBytes);
const glyphIndexRecord = {
  byteLength: glyphIndexBytes.length,
  entryCount: glyphLocations.length,
  entryEncoding: "uint8-part,uint16be-offset,uint16be-length",
  keccak256: keccak256(glyphIndexBytes),
  path: glyphIndexRelative,
  sha256: sha256(glyphIndexBytes),
};

const profile = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  colors: {
    canvas: "#000000",
    frame: "#006100",
    glyph: "#00ff00",
  },
  geometry: {
    artboard: { height: 1024, width: 1024 },
    canvas: { height: 960, scale: 1, width: 960, x: 32, y: 32 },
    fields: {
      agent: {
        bottom: 832,
        height: 256,
        horizontalAlign: "left",
        verticalAlign: "bottom",
        width: 844.8,
        x: 57.6,
        y: 576,
      },
      prompt: {
        bottom: 384,
        height: 256,
        horizontalAlign: "right",
        verticalAlign: "bottom",
        width: 844.8,
        x: 57.6,
        y: 128,
      },
    },
    frameUnitsPerSide: 32,
  },
  glyphSource: {
    canonicalOrder,
    familyId: "S301",
    familyName: "Humanist Smooth",
    fileKeccak256: keccak256(sourceBytes),
    fileSha256: sha256(sourceBytes),
    libraryMemberId: "inshell.thought.glyph-library.set-03.humanist-smooth",
    librarySetId: "inshell.thought.glyph-library.set-03",
    librarySetVersion: 1,
    license: "OFL-1.1",
    licenseArtifact: {
      path: licenseRelative,
      sha256: sha256(licenseBytes),
    },
    noticeArtifact: {
      path: noticeRelative,
      sha256: sha256(noticeBytes),
    },
    pathDefinitionIndex: glyphIndexRecord,
    pathDefinitions: partRecords,
    sourcePath: sourceRelative,
  },
  id: "inshell.thought.svg.v2.terminal-chat-path-glyphs",
  implementationId:
    "inshell.thought.renderer.v2.humanist-smooth-native-paths-frame-32-006100-green-00ff00-fixed-bottom-fields",
  metrics: {
    emSquare: 8,
    fillRule: "evenodd",
    fixedAdvance: 6,
    glyphScale: 4.8,
    lineHeight: 64,
    maxColumns: 29,
    maxRows: 4,
    visualBaseline: 5.58,
    wrap: "greedy-space-then-fixed-cell-overlong-word",
  },
  qualification: {
    adoptedByThoughtV2: true,
    glyphLibrarySourceStatus: "declared-with-metric-exception",
    metricDecision:
      "THOUGHT V2 explicitly adopts the Humanist Smooth native 5.58 visual baseline; the prior baseline-7 study contract does not apply.",
    rendererReleaseReady: true,
    visualReview: "pass",
  },
  restrictions: {
    embeddedFont: false,
    fallbackFonts: false,
    foreignObject: false,
    svgText: false,
    systemFontLookup: false,
  },
  schema: "inshell.thought.renderer-profile.v2",
  version: 2,
};
outputs.set(profileRelative, Buffer.from(`${JSON.stringify(profile, null, 2)}\n`, "utf8"));

for (const [relativePath, expected] of outputs) {
  const absolute = path.join(root, relativePath);
  if (checkOnly) {
    if (!fs.existsSync(absolute) || !fs.readFileSync(absolute).equals(expected)) {
      fail(`generated artifact drifted: ${relativePath}`);
    }
    continue;
  }
  fs.mkdirSync(path.dirname(absolute), { recursive: true });
  fs.writeFileSync(absolute, expected);
}

console.log(JSON.stringify({
  checked: checkOnly,
  glyphCount: font.glyphs.length,
  implementationId: profile.implementationId,
  parts: partRecords,
  profile: profileRelative,
  sourceFileKeccak256: profile.glyphSource.fileKeccak256,
  sourceFileSha256: profile.glyphSource.fileSha256,
}, null, 2));
