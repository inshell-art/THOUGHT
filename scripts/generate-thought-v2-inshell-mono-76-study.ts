import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  assertMono76Text,
  loadMono76Font,
  loadMono76Manifest,
} from "@inshell/mono-76";

import { thoughtChatStudyWorks } from "../src/thought-v2-chat-study-corpus";

const PACKAGE_VERSION = "1.0.0";
const PACKAGE_RELEASE_TAG = "v1.0.0";
const PACKAGE_RELEASE_REVISION = "mono-76-centerline-v1-20260731";
const PACKAGE_MANIFEST_SHA256 =
  "3506060e6262da142b5d6cc858d03ebe875f3b9a5c52edc30d078b2f4a944c8c";
const GLYPH_JSON_SHA256 =
  "7ed61ed6335fce2c1e58184916f5d344b8384fc05d4c616e83c35ad4fa9ed47f";
const PACKED_SHA256 =
  "3acc0a9cf60c00aa2d512356386d1e2a999499896e25661e8e631d53d5e10926";
const PACKED_KECCAK256 =
  "0xba37d00bb395b84f0487791300a29cdd2b1712b078fa218c6ed74fa11d74a081";
const MANUAL_EDIT_PAYLOAD_SHA256 =
  "755f16a8f70d9141a8b2175bc1bafeaef93ead366179d85f3597bc3dfc9ddc56";

const ARTBOARD_SIZE = 1024;
const CANVAS_SIZE = 960;
const FRAME_SIZE = 32;
const FIELD_X = 57.6;
const FIELD_WIDTH = 844.8;
const FIELD_HEIGHT = 256;
const PROMPT_FIELD_TOP = 128;
const AGENT_FIELD_TOP = 576;
const AGENT_FIELD_BOTTOM = AGENT_FIELD_TOP + FIELD_HEIGHT;
const LINE_HEIGHT = 64;
const MAX_COLUMNS = 29;
const MAX_ROWS = 4;
const FIXED_ADVANCE = 10;
const GLYPH_SCALE = 2.88;
const ADVANCE = FIXED_ADVANCE * GLYPH_SCALE;
const SVG_VIEWBOX_HEIGHT = 16;
const SVG_BASELINE = 12;
const ORIGIN_SHIFT_X = 1;
const CELL_Y_INSET = (LINE_HEIGHT - SVG_VIEWBOX_HEIGHT * GLYPH_SCALE) / 2;
const BASELINE_IN_CELL = CELL_Y_INSET + SVG_BASELINE * GLYPH_SCALE;
const FRAME_COLOR = "#006100";
const GLYPH_COLOR = "#00ff00";
const CANVAS_COLOR = "#000000";
const WRAP_PROFILE = "greedy-space-then-fixed-cell-overlong-word";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputRoot = path.join(
  root,
  "public",
  "generated",
  "inshell-mono-76",
  PACKAGE_VERSION,
);
const packageRoot = path.join(root, "vendor", "mono-76");
const checkOnly = process.argv.includes("--check");

const sha256 = (value: string | Uint8Array): string =>
  crypto.createHash("sha256").update(value).digest("hex");

const xmlEscape = (value: string): string => value
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;")
  .replaceAll("'", "&apos;");

const number = (value: number): string => {
  const rounded = Math.round((value + Number.EPSILON) * 1_000_000) / 1_000_000;
  return String(Object.is(rounded, -0) ? 0 : rounded);
};

const byteLength = (value: string): number => Buffer.byteLength(value, "utf8");

const wrap = (value: string): string[] => {
  const rows: string[] = [];
  let cursor = 0;

  while (cursor < value.length) {
    if (rows.length === MAX_ROWS) {
      throw new RangeError(`Too many rendered rows for ${JSON.stringify(value)}`);
    }

    const remaining = value.length - cursor;
    let rowLength = Math.min(remaining, MAX_COLUMNS);
    if (remaining > MAX_COLUMNS) {
      for (let offset = MAX_COLUMNS; offset > 0; offset -= 1) {
        if (value[cursor + offset - 1] === " ") {
          rowLength = offset - 1;
          break;
        }
      }
    }

    rows.push(value.slice(cursor, cursor + rowLength));
    cursor += rowLength;
    if (cursor < value.length && value[cursor] === " ") cursor += 1;
  }

  return rows;
};

const glyphId = (character: string): string =>
  `inshell-mono-76-g${character.codePointAt(0)!.toString(16).padStart(4, "0")}`;

const manifest = await loadMono76Manifest();
const face = await loadMono76Font();
const vendoredManifestBytes = fs.readFileSync(path.join(packageRoot, "manifest.json"));

if (
  manifest.id !== "inshell.mono-76"
  || manifest.release?.version !== PACKAGE_VERSION
  || manifest.release?.tag !== PACKAGE_RELEASE_TAG
  || manifest.release?.revision !== PACKAGE_RELEASE_REVISION
  || manifest.face?.weight !== 400
  || manifest.integrity?.faceSha256 !== GLYPH_JSON_SHA256
  || manifest.integrity?.packedSha256 !== PACKED_SHA256
  || manifest.integrity?.packedKeccak256 !== PACKED_KECCAK256
  || manifest.integrity?.manualEditPayloadSha256 !== MANUAL_EDIT_PAYLOAD_SHA256
  || face.release?.version !== PACKAGE_VERSION
  || face.metrics?.fixedAdvanceWidth !== FIXED_ADVANCE
  || face.metrics?.svgBaselineY !== SVG_BASELINE
  || face.metrics?.svgViewBoxHeight !== SVG_VIEWBOX_HEIGHT
  || face.composition?.defaultOriginShiftX !== ORIGIN_SHIFT_X
  || face.composition?.kerning !== false
  || face.renderStyle?.fill !== "none"
  || face.renderStyle?.strokeWidth !== 1.23
  || face.renderStyle?.strokeLinecap !== "round"
  || face.renderStyle?.strokeLinejoin !== "round"
  || sha256(vendoredManifestBytes) !== PACKAGE_MANIFEST_SHA256
) {
  throw new Error("Installed Inshell Mono 76 identity does not match the pinned v1.0.0 release");
}

const glyphs = new Map(
  face.glyphs.map((glyph: { character: string; d: string }) => [glyph.character, glyph]),
);

const renderDefinitions = (promptLine: string, agentLine: string): string => {
  const used = new Set([...promptLine, ...agentLine].filter((character) => character !== " "));
  const definitions = [...face.repertoire]
    .filter((character) => used.has(character))
    .map((character) => {
      const glyph = glyphs.get(character);
      if (!glyph?.d) throw new Error(`Missing native path for ${JSON.stringify(character)}`);
      return `<path id="${glyphId(character)}" d="${glyph.d}"/>`;
    });
  return `<defs>${definitions.join("")}</defs>`;
};

const renderRows = (
  rows: string[],
  alignment: "prompt" | "agent",
): string => {
  const firstCellTop = alignment === "prompt"
    ? PROMPT_FIELD_TOP
    : AGENT_FIELD_BOTTOM - rows.length * LINE_HEIGHT;

  return rows.map((row, rowIndex) => {
    let x = alignment === "prompt"
      ? FIELD_X + FIELD_WIDTH - row.length * ADVANCE + ORIGIN_SHIFT_X * GLYPH_SCALE
      : FIELD_X + ORIGIN_SHIFT_X * GLYPH_SCALE;
    const baseline = firstCellTop + rowIndex * LINE_HEIGHT + BASELINE_IN_CELL;
    const uses: string[] = [];

    for (const character of row) {
      if (character !== " ") {
        uses.push(
          `<use href="#${glyphId(character)}" transform="translate(${number(x)} ${number(baseline)}) scale(${number(GLYPH_SCALE)} ${number(-GLYPH_SCALE)})"/>`,
        );
      }
      x += ADVANCE;
    }

    return `<g data-row="${rowIndex + 1}" data-source="${xmlEscape(row)}">${uses.join("")}</g>`;
  }).join("");
};

const renderArtwork = (
  name: string,
  promptLine: string,
  agentLine: string,
): { agentRows: string[]; promptRows: string[]; svg: string } => {
  assertMono76Text(face, promptLine);
  assertMono76Text(face, agentLine);

  if (byteLength(promptLine) < 1 || byteLength(promptLine) > 64) {
    throw new RangeError(`Prompt line outside 1–64 bytes: ${JSON.stringify(promptLine)}`);
  }
  if (byteLength(agentLine) < 1 || byteLength(agentLine) > 64) {
    throw new RangeError(`Agent line outside 1–64 bytes: ${JSON.stringify(agentLine)}`);
  }

  const promptRows = wrap(promptLine);
  const agentRows = wrap(agentLine);
  const label = `${name}. Prompt: ${promptLine}. Agent: ${agentLine}`;
  const svg = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${ARTBOARD_SIZE}" height="${ARTBOARD_SIZE}" viewBox="0 0 ${ARTBOARD_SIZE} ${ARTBOARD_SIZE}" role="img" aria-label="${xmlEscape(label)}"`,
    ` data-renderer="inshell.thought.study.inshell-mono-76-native-paths.v1.0.0" data-font-family="Inshell Mono 76" data-font-weight="400"`,
    ` data-package-release="${PACKAGE_RELEASE_TAG}" data-package-revision="${PACKAGE_RELEASE_REVISION}" data-package-manifest-sha256="${PACKAGE_MANIFEST_SHA256}"`,
    ` data-wrap="${WRAP_PROFILE}" data-prompt-vertical-align="top" data-agent-vertical-align="bottom">`,
    `<title>${xmlEscape(name)} — Inshell Mono 76 Regular 400</title>`,
    `<rect id="work-frame" width="${ARTBOARD_SIZE}" height="${ARTBOARD_SIZE}" fill="${FRAME_COLOR}"/>`,
    `<g id="work-canvas" transform="translate(${FRAME_SIZE} ${FRAME_SIZE})">`,
    `<rect id="canvas-bg" width="${CANVAS_SIZE}" height="${CANVAS_SIZE}" fill="${CANVAS_COLOR}"/>`,
    renderDefinitions(promptLine, agentLine),
    `<g id="prompt-line" fill="none" stroke="${GLYPH_COLOR}" stroke-width="${face.renderStyle.strokeWidth}" stroke-linecap="${face.renderStyle.strokeLinecap}" stroke-linejoin="${face.renderStyle.strokeLinejoin}" data-source="${xmlEscape(promptLine)}" data-rows="${promptRows.length}" data-field-x="${FIELD_X}" data-field-y="${PROMPT_FIELD_TOP}" data-field-width="${FIELD_WIDTH}" data-field-height="${FIELD_HEIGHT}" data-field-bottom="${PROMPT_FIELD_TOP + FIELD_HEIGHT}" data-horizontal-align="right" data-vertical-align="top">`,
    renderRows(promptRows, "prompt"),
    "</g>",
    `<g id="agent-line" fill="none" stroke="${GLYPH_COLOR}" stroke-width="${face.renderStyle.strokeWidth}" stroke-linecap="${face.renderStyle.strokeLinecap}" stroke-linejoin="${face.renderStyle.strokeLinejoin}" data-source="${xmlEscape(agentLine)}" data-rows="${agentRows.length}" data-field-x="${FIELD_X}" data-field-y="${AGENT_FIELD_TOP}" data-field-width="${FIELD_WIDTH}" data-field-height="${FIELD_HEIGHT}" data-field-bottom="${AGENT_FIELD_BOTTOM}" data-horizontal-align="left" data-vertical-align="bottom">`,
    renderRows(agentRows, "agent"),
    "</g>",
    "</g>",
    "</svg>",
  ].join("");

  return { agentRows, promptRows, svg };
};

const generatedWorks = thoughtChatStudyWorks.map((work, index) => {
  const { agentRows, promptRows, svg } = renderArtwork(
    work.name,
    work.promptLine,
    work.agentLine,
  );
  return {
    id: work.id,
    number: index + 1,
    name: work.name,
    studyKind: work.studyKind,
    file: `${work.id}.svg`,
    promptBytes: byteLength(work.promptLine),
    agentBytes: byteLength(work.agentLine),
    promptRows: promptRows.length,
    agentRows: agentRows.length,
    svg,
    svgSha256: sha256(svg),
  };
});

const generatedManifest = `${JSON.stringify({
  schema: "inshell.thought.inshell-mono-76-study-assets.v1",
  package: {
    id: manifest.id,
    version: PACKAGE_VERSION,
    releaseTag: PACKAGE_RELEASE_TAG,
    releaseRevision: PACKAGE_RELEASE_REVISION,
    manifestSha256: PACKAGE_MANIFEST_SHA256,
    glyphJsonSha256: GLYPH_JSON_SHA256,
    packedSha256: PACKED_SHA256,
    packedKeccak256: PACKED_KECCAK256,
    manualEditPayloadSha256: MANUAL_EDIT_PAYLOAD_SHA256,
    family: face.family.name,
    face: face.family.faceName,
    style: face.family.style,
    weight: face.weight,
    repertoire: face.repertoire,
  },
  renderer: {
    id: "inshell.thought.study.inshell-mono-76-native-paths.v1.0.0",
    artboard: ARTBOARD_SIZE,
    canvas: CANVAS_SIZE,
    frame: FRAME_SIZE,
    frameColor: FRAME_COLOR,
    glyphColor: GLYPH_COLOR,
    glyphScale: GLYPH_SCALE,
    lineHeight: LINE_HEIGHT,
    fixedAdvance: ADVANCE,
    sourceFixedAdvance: FIXED_ADVANCE,
    originShiftX: ORIGIN_SHIFT_X,
    svgBaseline: SVG_BASELINE,
    svgViewBoxHeight: SVG_VIEWBOX_HEIGHT,
    strokeWidth: face.renderStyle.strokeWidth,
    maxColumns: MAX_COLUMNS,
    maxRows: MAX_ROWS,
    wrapProfile: WRAP_PROFILE,
    promptVerticalAlign: "top",
    agentVerticalAlign: "bottom",
  },
  fixtureCount: generatedWorks.length,
  works: generatedWorks.map(({ svg, ...work }) => work),
}, null, 2)}\n`;

const expectedFiles = new Map<string, string>([
  ["study-manifest.json", generatedManifest],
  ...generatedWorks.map(({ file, svg }) => [file, svg] as const),
]);

if (checkOnly) {
  const mismatches: string[] = [];
  for (const [file, expected] of expectedFiles) {
    const absolute = path.join(outputRoot, file);
    if (!fs.existsSync(absolute) || fs.readFileSync(absolute, "utf8") !== expected) {
      mismatches.push(file);
    }
  }

  const actualFiles = fs.existsSync(outputRoot)
    ? fs.readdirSync(outputRoot).filter((file) => file.endsWith(".svg") || file.endsWith(".json"))
    : [];
  const extras = actualFiles.filter((file) => !expectedFiles.has(file));

  if (mismatches.length > 0 || extras.length > 0) {
    throw new Error(
      `Inshell Mono 76 study assets drifted; mismatches: ${mismatches.join(", ") || "none"}; extras: ${extras.join(", ") || "none"}`,
    );
  }

  console.log(
    `Inshell Mono 76 study assets PASS: ${generatedWorks.length} deterministic SVGs · ${PACKAGE_RELEASE_TAG} · Regular 400`,
  );
} else {
  fs.mkdirSync(outputRoot, { recursive: true });
  for (const [file, contents] of expectedFiles) {
    fs.writeFileSync(path.join(outputRoot, file), contents);
  }
  console.log(
    `Generated ${generatedWorks.length} Inshell Mono 76 Regular 400 native-path SVGs in ${path.relative(root, outputRoot)}`,
  );
}
