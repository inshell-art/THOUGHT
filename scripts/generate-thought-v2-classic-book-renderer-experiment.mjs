#!/usr/bin/env node

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { keccak256 } from "ethers";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourceRelative =
  "vendor/thought-glyph-library-fifth-set-v8/fonts/classic-book/glyphs.json";
const packedRelative =
  "vendor/thought-glyph-library-fifth-set-v8/onchain/packed/classic-book.bin";
const outputDirectoryRelative =
  "protocol/current/v2/renderer/experiments/classic-book";
const packedOutputRelative = `${outputDirectoryRelative}/classic-book.im76.bin`;
const profileRelative = `${outputDirectoryRelative}/thought.renderer.v2.classic-book.experiment.json`;
const solidityRelative = "evm/src/v2/ThoughtSvgRendererV2ClassicBook.sol";
const canonicalOrder =
  " ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789.,?!:;'\"-()/&";
const checkOnly = process.argv.includes("--check");

const sha256 = (value) =>
  crypto.createHash("sha256").update(value).digest("hex");

const fail = (message) => {
  throw new Error(`THOUGHT V2 Classic Book renderer experiment generation failed: ${message}`);
};

const sourceBytes = fs.readFileSync(path.join(root, sourceRelative));
const packedBytes = fs.readFileSync(path.join(root, packedRelative));
const font = JSON.parse(sourceBytes.toString("utf8"));
const solidity = fs.readFileSync(path.join(root, solidityRelative), "utf8");

if (
  font.family?.id !== "S502"
  || font.family?.slug !== "classic-book"
  || font.librarySet?.id !== "inshell.thought.glyph-library.set-05"
  || font.librarySet?.memberId !== "inshell.thought.glyph-library.set-05.classic-book"
  || font.librarySet?.version !== 8
) {
  fail("selected glyph-library identity drifted");
}
if (font.repertoire !== canonicalOrder || font.glyphs?.length !== 76) {
  fail("selected repertoire drifted");
}
if (
  font.metrics?.fixedAdvanceWidth !== 10
  || font.metrics?.svgBaselineY !== 12
  || font.metrics?.svgViewBoxHeight !== 16
  || font.metrics?.coordinateSystem !== "logical units, y-up"
  || font.renderStyle?.fill !== "none"
  || font.renderStyle?.strokeWidth !== 0.82
  || font.renderStyle?.strokeLinecap !== "round"
  || font.renderStyle?.strokeLinejoin !== "round"
) {
  fail("selected metrics or centerline paint drifted");
}
if (
  packedBytes.length !== 2_540
  || packedBytes.subarray(0, 4).toString("ascii") !== "IM76"
  || packedBytes[4] !== 1
  || packedBytes.readUInt16BE(5) !== 400
  || packedBytes[7] !== 76
  || packedBytes.readUInt16BE(160) !== 2_378
) {
  fail("IM76 payload header or length drifted");
}
if (
  sha256(sourceBytes) !== "2789bd55606ddb20933414a64cc150ca78346714d1e04040b11ed3db6d718a38"
  || sha256(packedBytes) !== "3ab51d7dcdce7e358e7c76002b8f78ddaa448a99de2116a238f7e22209f2bd60"
  || keccak256(packedBytes) !== "0xa1505ed49c1e2b8d78d088de1a6b0b1cefcd6087cd47415bb29c39b4a3394430"
) {
  fail("pinned source or packed payload hash drifted");
}
if (
  !solidity.includes("0x2789bd55606ddb20933414a64cc150ca78346714d1e04040b11ed3db6d718a38")
  || !solidity.includes("0x3ab51d7dcdce7e358e7c76002b8f78ddaa448a99de2116a238f7e22209f2bd60")
  || !solidity.includes("0xa1505ed49c1e2b8d78d088de1a6b0b1cefcd6087cd47415bb29c39b4a3394430")
  || !solidity.includes("PACKED_BYTES = 2_540")
  || !solidity.includes("PACKED_PATH_BYTES = 2_378")
) {
  fail(`${solidityRelative} is not pinned to the selected revision-8 payload`);
}

const profile = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  acceptance: {
    hardTokenUriGasLimit: 10_000_000,
    preferredTokenUriGasLimit: 8_000_000,
    scope: "all current gallery fixtures plus maximum valid 64-byte pairs",
  },
  colors: {
    canvas: "#000000",
    frame: "#006100",
    glyph: "#00ff00",
  },
  format: {
    headerBytes: 162,
    id: "IM76",
    packedKeccak256: keccak256(packedBytes),
    packedPath: packedOutputRelative,
    packedSha256: sha256(packedBytes),
    pathBytes: 2_378,
    totalBytes: packedBytes.length,
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
    familyId: "S502",
    familyName: "Classic Book 76",
    fileKeccak256: keccak256(sourceBytes),
    fileSha256: sha256(sourceBytes),
    libraryMemberId: "inshell.thought.glyph-library.set-05.classic-book",
    librarySetId: "inshell.thought.glyph-library.set-05",
    librarySetVersion: 8,
    license: "UNLICENSED",
    packageReleaseCommit: "715487e6a2549f980284cdf7a0c0edca575defa6",
    packageVersion: "1.7.0",
    sourcePath: sourceRelative,
    sourceRepositoryCommit: "a0ac1dafd2bc73ad023fc0e32e9b95b5385f608c",
  },
  id: "inshell.thought.svg.v2.terminal-chat-path-glyphs",
  implementationId:
    "inshell.thought.renderer.v2.classic-book-76-im76-native-paths-frame-32-006100-green-00ff00-prompt-top-agent-bottom",
  metrics: {
    fixedAdvance: 10,
    glyphScale: 2.88,
    lineHeight: 64,
    maxColumns: 29,
    maxRows: 4,
    svgBaselineY: 12,
    svgViewBoxHeight: 16,
    wrap: "greedy-space-then-fixed-cell-overlong-word",
  },
  paint: {
    fill: "none",
    stroke: "#00ff00",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    strokeWidth: 0.82,
  },
  qualification: {
    adoptedByThoughtV2: false,
    purpose: "exact Solidity integration and tokenURI gas acceptance measurement",
    rendererReleaseReady: false,
    status: "noncanonical-experiment",
  },
  schema: "inshell.thought.renderer.v2.classic-book-experiment.v1",
};

const outputs = new Map([
  [packedOutputRelative, packedBytes],
  [profileRelative, Buffer.from(`${JSON.stringify(profile, null, 2)}\n`, "utf8")],
]);

for (const [relativePath, expected] of outputs) {
  const filename = path.join(root, relativePath);
  if (checkOnly) {
    if (!fs.existsSync(filename) || !fs.readFileSync(filename).equals(expected)) {
      fail(`${relativePath} is missing or stale`);
    }
    continue;
  }
  fs.mkdirSync(path.dirname(filename), { recursive: true });
  fs.writeFileSync(filename, expected);
}

console.log(
  checkOnly
    ? "THOUGHT V2 Classic Book renderer experiment artifacts are current."
    : `Generated ${outputs.size} THOUGHT V2 Classic Book renderer experiment artifacts.`,
);
