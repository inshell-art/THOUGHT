#!/usr/bin/env node

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { keccak256 } from "ethers";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const checkOnly = process.argv.includes("--check");
const canonicalOrder =
  " ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789.,?!:;'\"-()/&";
const templateRelative = "evm/src/v2/ThoughtSvgRendererV2ClassicBook.sol";

const variants = [
  {
    contractName: "ThoughtSvgRendererV2ClassicLine",
    familyId: "S501",
    familyName: "Classic Line 76",
    packedBytes: 2_514,
    packedKeccak256: "0x139753d435a99bff61fd410929e57f9038ab5772ccc7a35a26a76ee03545fb77",
    packedPathBytes: 2_352,
    packedSha256: "d06f7403b4963d8f46e6e8559c7ab0e4a21a65aa3681b210bfe433d74ea56b42",
    slug: "classic-line",
    sourceSha256: "5aca96cc7c349d59d7303e5f706442da4f54349233b8d297d722277fae4899bd",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    strokeWidth: 0.72,
  },
  {
    contractName: "ThoughtSvgRendererV2ClassicRound",
    familyId: "S503",
    familyName: "Classic Round 76",
    packedBytes: 2_696,
    packedKeccak256: "0x55bf4234750664a8fc608d089e3f59074e3e1ae15f7082029888a6291d0de323",
    packedPathBytes: 2_534,
    packedSha256: "72ea88523caf278828b833368c4a3a289f7b80866ac464325d04f031c48e3a01",
    slug: "classic-round",
    sourceSha256: "0df0f883818638295e60004d53be50078e550258ea6536275b581dfa69257913",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    strokeWidth: 0.86,
  },
  {
    contractName: "ThoughtSvgRendererV2ClassicCompact",
    familyId: "S504",
    familyName: "Classic Compact 76",
    packedBytes: 2_631,
    packedKeccak256: "0x14c2bf9e9c2c5638980db8fd101c296e42fa8031fa59529b71b48e3fe9b027ea",
    packedPathBytes: 2_469,
    packedSha256: "204bf9e84103b57175e1dc0be06b3f42e91a4d0f8fb5b8b7457b52ff63c79393",
    slug: "classic-compact",
    sourceSha256: "8c50014d057a5d7a282e887d3ca67a62f4044ba589c389e2d16c6f4e9a9df7a1",
    strokeLinecap: "butt",
    strokeLinejoin: "miter",
    strokeWidth: 0.78,
  },
];

const sha256 = (value) =>
  crypto.createHash("sha256").update(value).digest("hex");

const underscored = (value) =>
  value.toLocaleString("en-US").replaceAll(",", "_");

const fail = (message) => {
  throw new Error(`THOUGHT V2 Set 5 renderer experiment generation failed: ${message}`);
};

const template = fs.readFileSync(path.join(root, templateRelative), "utf8");

const writeOrCheck = (relativePath, expected) => {
  const filename = path.join(root, relativePath);
  if (checkOnly) {
    if (!fs.existsSync(filename) || !fs.readFileSync(filename).equals(expected)) {
      fail(`${relativePath} is missing or stale`);
    }
    return;
  }
  fs.mkdirSync(path.dirname(filename), { recursive: true });
  fs.writeFileSync(filename, expected);
};

for (const variant of variants) {
  const sourceRelative =
    `vendor/thought-glyph-library-fifth-set-v8/fonts/${variant.slug}/glyphs.json`;
  const packedRelative =
    `vendor/thought-glyph-library-fifth-set-v8/onchain/packed/${variant.slug}.bin`;
  const outputDirectoryRelative =
    `protocol/current/v2/renderer/experiments/${variant.slug}`;
  const packedOutputRelative =
    `${outputDirectoryRelative}/${variant.slug}.im76.bin`;
  const profileRelative =
    `${outputDirectoryRelative}/thought.renderer.v2.${variant.slug}.experiment.json`;
  const contractRelative =
    `evm/src/v2/${variant.contractName}.sol`;
  const sourceBytes = fs.readFileSync(path.join(root, sourceRelative));
  const packedBytes = fs.readFileSync(path.join(root, packedRelative));
  const font = JSON.parse(sourceBytes.toString("utf8"));

  if (
    font.family?.id !== variant.familyId
    || font.family?.slug !== variant.slug
    || font.family?.name !== variant.familyName
    || font.librarySet?.id !== "inshell.thought.glyph-library.set-05"
    || font.librarySet?.memberId
      !== `inshell.thought.glyph-library.set-05.${variant.slug}`
    || font.librarySet?.version !== 8
  ) {
    fail(`${variant.slug} glyph-library identity drifted`);
  }
  if (font.repertoire !== canonicalOrder || font.glyphs?.length !== 76) {
    fail(`${variant.slug} repertoire drifted`);
  }
  if (
    font.metrics?.fixedAdvanceWidth !== 10
    || font.metrics?.svgBaselineY !== 12
    || font.metrics?.svgViewBoxHeight !== 16
    || font.metrics?.coordinateSystem !== "logical units, y-up"
    || font.renderStyle?.fill !== "none"
    || font.renderStyle?.strokeWidth !== variant.strokeWidth
    || font.renderStyle?.strokeLinecap !== variant.strokeLinecap
    || font.renderStyle?.strokeLinejoin !== variant.strokeLinejoin
  ) {
    fail(`${variant.slug} metrics or centerline paint drifted`);
  }
  if (
    packedBytes.length !== variant.packedBytes
    || packedBytes.subarray(0, 4).toString("ascii") !== "IM76"
    || packedBytes[4] !== 1
    || packedBytes.readUInt16BE(5) !== 400
    || packedBytes[7] !== 76
    || packedBytes.readUInt16BE(160) !== variant.packedPathBytes
  ) {
    fail(`${variant.slug} IM76 payload header or length drifted`);
  }
  if (
    sha256(sourceBytes) !== variant.sourceSha256
    || sha256(packedBytes) !== variant.packedSha256
    || keccak256(packedBytes) !== variant.packedKeccak256
  ) {
    fail(`${variant.slug} pinned source or payload hash drifted`);
  }

  const implementationId =
    `inshell.thought.renderer.v2.${variant.slug}-76-im76-native-paths-frame-32-006100-green-00ff00-prompt-top-agent-bottom`;
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
      packedKeccak256: variant.packedKeccak256,
      packedPath: packedOutputRelative,
      packedSha256: variant.packedSha256,
      pathBytes: variant.packedPathBytes,
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
      familyId: variant.familyId,
      familyName: variant.familyName,
      fileKeccak256: keccak256(sourceBytes),
      fileSha256: sha256(sourceBytes),
      libraryMemberId: `inshell.thought.glyph-library.set-05.${variant.slug}`,
      librarySetId: "inshell.thought.glyph-library.set-05",
      librarySetVersion: 8,
      license: "UNLICENSED",
      packageReleaseCommit: "715487e6a2549f980284cdf7a0c0edca575defa6",
      packageVersion: "1.7.0",
      sourcePath: sourceRelative,
      sourceRepositoryCommit: "a0ac1dafd2bc73ad023fc0e32e9b95b5385f608c",
    },
    id: "inshell.thought.svg.v2.terminal-chat-path-glyphs",
    implementationId,
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
      strokeLinecap: variant.strokeLinecap,
      strokeLinejoin: variant.strokeLinejoin,
      strokeWidth: variant.strokeWidth,
    },
    qualification: {
      adoptedByThoughtV2: false,
      purpose: "exact Solidity integration and tokenURI gas acceptance measurement",
      rendererReleaseReady: false,
      status: "noncanonical-experiment",
    },
    schema: `inshell.thought.renderer.v2.${variant.slug}-experiment.v1`,
  };

  const solidity = template
    .replaceAll("ThoughtSvgRendererV2ClassicBook", variant.contractName)
    .replaceAll("Classic Book 76", variant.familyName)
    .replaceAll("Classic Book", variant.familyName.replace(" 76", ""))
    .replaceAll("classic-book", variant.slug)
    .replaceAll(
      "2789bd55606ddb20933414a64cc150ca78346714d1e04040b11ed3db6d718a38",
      variant.sourceSha256,
    )
    .replaceAll(
      "3ab51d7dcdce7e358e7c76002b8f78ddaa448a99de2116a238f7e22209f2bd60",
      variant.packedSha256,
    )
    .replaceAll(
      "a1505ed49c1e2b8d78d088de1a6b0b1cefcd6087cd47415bb29c39b4a3394430",
      variant.packedKeccak256.slice(2),
    )
    .replaceAll("2_540", underscored(variant.packedBytes))
    .replaceAll("2_378", underscored(variant.packedPathBytes))
    .replaceAll(
      'stroke-width="0.82" stroke-linecap="round" stroke-linejoin="round"',
      `stroke-width="${variant.strokeWidth}" stroke-linecap="${variant.strokeLinecap}" stroke-linejoin="${variant.strokeLinejoin}"`,
    );

  if (solidity === template || solidity.includes("classic-book")) {
    fail(`${variant.slug} Solidity template substitution failed`);
  }

  writeOrCheck(packedOutputRelative, packedBytes);
  writeOrCheck(
    profileRelative,
    Buffer.from(`${JSON.stringify(profile, null, 2)}\n`, "utf8"),
  );
  writeOrCheck(contractRelative, Buffer.from(solidity, "utf8"));
}

console.log(
  checkOnly
    ? "THOUGHT V2 Set 5 renderer experiment artifacts are current."
    : `Generated ${variants.length * 3} THOUGHT V2 Set 5 renderer experiment artifacts.`,
);
