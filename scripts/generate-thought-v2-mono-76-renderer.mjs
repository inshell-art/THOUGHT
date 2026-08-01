#!/usr/bin/env node

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { keccak256 } from "ethers";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const packageRootRelative = "vendor/mono-76";
const sourceRelative = `${packageRootRelative}/glyphs.json`;
const manifestRelative = `${packageRootRelative}/manifest.json`;
const packedRelative = `${packageRootRelative}/onchain/packed.bin`;
const noticeRelative = `${packageRootRelative}/NOTICE.md`;
const licenseRelative = `${packageRootRelative}/UNLICENSED.md`;
const packedOutputRelative = "protocol/current/v2/renderer/mono-76.im76.bin";
const profileRelative = "protocol/current/v2/renderer/thought.renderer.v2.profile.json";
const rendererSources = [
  "evm/src/v2/ThoughtRendererV2.sol",
  "evm/src/v2/ThoughtSvgRendererV2.sol",
];
const canonicalOrder =
  " ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789.,?!:;'\"-()/&";
const checkOnly = process.argv.includes("--check");

const expected = {
  faceSha256: "7ed61ed6335fce2c1e58184916f5d344b8384fc05d4c616e83c35ad4fa9ed47f",
  manualEditPayloadSha256: "755f16a8f70d9141a8b2175bc1bafeaef93ead366179d85f3597bc3dfc9ddc56",
  packedKeccak256: "0xba37d00bb395b84f0487791300a29cdd2b1712b078fa218c6ed74fa11d74a081",
  packedSha256: "3acc0a9cf60c00aa2d512356386d1e2a999499896e25661e8e631d53d5e10926",
};

const sha256 = (value) => crypto.createHash("sha256").update(value).digest("hex");
const fail = (message) => {
  throw new Error(`THOUGHT V2 Mono 76 renderer generation failed: ${message}`);
};
const read = (relative) => fs.readFileSync(path.join(root, relative));

const sourceBytes = read(sourceRelative);
const manifestBytes = read(manifestRelative);
const packedBytes = read(packedRelative);
const noticeBytes = read(noticeRelative);
const licenseBytes = read(licenseRelative);
const font = JSON.parse(sourceBytes.toString("utf8"));
const manifest = JSON.parse(manifestBytes.toString("utf8"));

if (
  manifest.schema !== "inshell.mono-76.release-manifest.v1"
  || manifest.id !== "inshell.mono-76"
  || manifest.packageName !== "@inshell/mono-76"
  || manifest.release?.tag !== "v1.0.0"
  || manifest.release?.version !== "1.0.0"
  || manifest.release?.status !== "sealed"
  || manifest.canonicalOrder !== canonicalOrder
  || manifest.recordCount !== 76
  || manifest.visibleGlyphCount !== 75
) {
  fail("sealed package identity drifted");
}
if (
  font.schema !== "inshell.mono-76.centerline-face.v1"
  || font.repertoire !== canonicalOrder
  || font.glyphs?.length !== 76
  || font.glyphs.map(({ character }) => character).join("") !== canonicalOrder
  || font.metrics?.fixedAdvanceWidth !== 10
  || font.metrics?.svgBaselineY !== 12
  || font.metrics?.svgViewBoxHeight !== 16
  || font.composition?.defaultOriginShiftX !== 1
  || font.composition?.kerning !== false
  || font.composition?.bakedOpticalAlignment?.pathsContainOffsets !== true
  || font.renderStyle?.fill !== "none"
  || font.renderStyle?.strokeWidth !== 1.23
  || font.renderStyle?.strokeLinecap !== "round"
  || font.renderStyle?.strokeLinejoin !== "round"
) {
  fail("sealed face metrics, composition, or paint drifted");
}
if (
  sha256(sourceBytes) !== expected.faceSha256
  || sha256(packedBytes) !== expected.packedSha256
  || keccak256(packedBytes) !== expected.packedKeccak256
  || manifest.integrity?.manualEditPayloadSha256 !== expected.manualEditPayloadSha256
) {
  fail("sealed face or packed integrity pin drifted");
}
if (
  packedBytes.length !== 4_600
  || packedBytes.subarray(0, 4).toString("ascii") !== "IM76"
  || packedBytes[4] !== 1
  || packedBytes.readUInt16BE(5) !== 400
  || packedBytes[7] !== 76
  || packedBytes.readUInt16BE(160) !== 4_438
) {
  fail("IM76 payload header or length drifted");
}

for (const source of rendererSources) {
  const solidity = read(source).toString("utf8");
  for (const pin of [
    expected.faceSha256,
    expected.packedSha256,
    expected.packedKeccak256.slice(2),
  ]) {
    if (!solidity.includes(pin)) fail(`${source} does not pin ${pin}`);
  }
  if (
    !solidity.includes("PACKED_BYTES = 4_600")
    || !solidity.includes("PACKED_PATH_BYTES = 4_438")
    || !solidity.includes('stroke-width="1.23"')
    || !solidity.includes('data-glyph-origin-shift-x="1"')
  ) {
    fail(`${source} does not preserve the sealed rendering contract`);
  }
}

const profile = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  colors: {
    canvas: "#000000",
    frame: "#006100",
    glyph: "#00ff00",
  },
  format: {
    headerBytes: 162,
    id: "IM76",
    packedKeccak256: expected.packedKeccak256,
    packedPath: packedOutputRelative,
    packedSha256: expected.packedSha256,
    pathBytes: 4_438,
    totalBytes: 4_600,
    version: 1,
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
        verticalAlign: "top",
        width: 844.8,
        x: 57.6,
        y: 128,
      },
    },
    frameUnitsPerSide: 32,
  },
  glyphSource: {
    canonicalOrder,
    faceSha256: expected.faceSha256,
    familyId: "inshell.mono-76",
    familyName: "Inshell Mono 76",
    fileKeccak256: keccak256(sourceBytes),
    fileSha256: expected.faceSha256,
    license: "UNLICENSED",
    licenseArtifact: {
      path: licenseRelative,
      sha256: sha256(licenseBytes),
    },
    libraryMemberId: "inshell.mono-76",
    manualEditPayloadSha256: expected.manualEditPayloadSha256,
    manifestArtifact: {
      path: manifestRelative,
      sha256: sha256(manifestBytes),
    },
    noticeArtifact: {
      path: noticeRelative,
      sha256: sha256(noticeBytes),
    },
    packageName: "@inshell/mono-76",
    packageVersion: "1.0.0",
    releaseRevision: "mono-76-centerline-v1-20260731",
    releaseTag: "v1.0.0",
    sourcePath: sourceRelative,
  },
  id: "inshell.thought.svg.v2.terminal-chat-path-glyphs",
  implementationId:
    "inshell.thought.renderer.v2.mono-76-v1-im76-native-paths-frame-32-006100-green-00ff00-prompt-top-agent-bottom",
  metrics: {
    fixedAdvance: 10,
    glyphScale: 2.88,
    lineHeight: 64,
    maxColumns: 29,
    maxRows: 4,
    originShiftX: 1,
    svgBaselineY: 12,
    svgViewBoxHeight: 16,
    wrap: "greedy-space-then-fixed-cell-overlong-word",
  },
  paint: {
    fill: "none",
    stroke: "#00ff00",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    strokeWidth: 1.23,
  },
  qualification: {
    adoptedByThoughtV2: true,
    packageStatus: "sealed",
    rendererReleaseReady: true,
    visualReview: "pass",
  },
  restrictions: {
    embeddedFont: false,
    fallbackFonts: false,
    foreignObject: false,
    runtimeKerning: false,
    runtimeOpticalOffsetTable: false,
    svgText: false,
    systemFontLookup: false,
  },
  schema: "inshell.thought.renderer-profile.v2",
  version: 2,
};

const outputs = new Map([
  [packedOutputRelative, packedBytes],
  [profileRelative, Buffer.from(`${JSON.stringify(profile, null, 2)}\n`, "utf8")],
]);

for (const [relative, expectedBytes] of outputs) {
  const filename = path.join(root, relative);
  if (checkOnly) {
    if (!fs.existsSync(filename) || !fs.readFileSync(filename).equals(expectedBytes)) {
      fail(`generated artifact drifted: ${relative}`);
    }
  } else {
    fs.mkdirSync(path.dirname(filename), { recursive: true });
    fs.writeFileSync(filename, expectedBytes);
  }
}

console.log(JSON.stringify({
  checked: checkOnly,
  faceSha256: expected.faceSha256,
  implementationId: profile.implementationId,
  packedBytes: packedBytes.length,
  packedKeccak256: expected.packedKeccak256,
  packedSha256: expected.packedSha256,
  profile: profileRelative,
  releaseTag: "v1.0.0",
}, null, 2));
