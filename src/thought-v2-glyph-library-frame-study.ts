import {
  FOURTH_SET_TIGHT_PROFILE,
  resolveFourthSetTilePaint,
} from "@inshell/thought-glyph-library-fourth-set";

import {
  normalizeThoughtV2FrameColor,
  thoughtV2FrameStudyGeometry,
} from "./thought-v2-frame-study";

export type ThoughtV2GlyphStudyFont = {
  canonicalOrder: string;
  colorBinding?: {
    canonicalSha256: string;
    currentProtocolDependency: false;
    foreground: {
      minimumChosenContrast: number;
    };
    paletteId: string;
    paletteRole: "tile-background";
    sourceStatus: string;
  };
  family: {
    name: string;
    slug: string;
  };
  glyphs: Array<{
    advanceWidth: number;
    character: string;
    codepoint: number;
    d: string;
  }>;
  librarySet: {
    id: string;
    memberId: string;
    name: string;
    qualificationStatus: string;
    version: number;
  };
  metrics: {
    baselineContractStatus?: string;
    emSquare: number;
    fillRule: "evenodd";
    fixedAdvanceWidth: number;
    studyContractBaseline?: number;
    visualBaseline?: number;
  };
  tilePresentation?: {
    monospaced: true;
    normalization: {
      ordinaryMatrix: [number, number, number, number, number, number];
      safeCharacters: string;
      safeMatrix: [number, number, number, number, number, number];
    };
    profileId: "tight-v1";
    renderedAdvanceWidth: 6.5;
    spaceAdvanceWidth: 6.5;
  };
};

export const THOUGHT_V2_GLYPH_STUDY_MAX_COLUMNS = 29;
export const THOUGHT_V2_GLYPH_STUDY_TIGHT_TILE_MAX_COLUMNS = 27;
export const THOUGHT_V2_GLYPH_STUDY_MAX_ROWS = 4;
export const THOUGHT_V2_GLYPH_STUDY_WRAP = "greedy-space-then-fixed-cell-overlong-word";
export const THOUGHT_V2_GLYPH_STUDY_DEFAULT_FOREGROUND = "#00ff00";

const GLYPH_WIDTH = 28.8;
const GLYPH_HEIGHT = 38.4;
const GLYPH_SCALE = 4.8;
const TIGHT_TILE_WIDTH = FOURTH_SET_TIGHT_PROFILE.advanceWidth * GLYPH_SCALE;
const LINE_HEIGHT = 64;
const CANVAS_SIZE = 960;

const PROMPT_FIELD = {
  x: 57.6,
  y: 128,
  width: 844.8,
  height: 256,
} as const;

const AGENT_FIELD = {
  x: 57.6,
  y: 576,
  width: 844.8,
  height: 256,
} as const;

const escapeXml = (value: string): string => value
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;")
  .replaceAll("'", "&apos;");

const number = (value: number): string => {
  const rounded = Math.round((value + Number.EPSILON) * 100) / 100;
  return Object.is(rounded, -0) ? "0" : String(rounded);
};

const preciseNumber = (value: number): string =>
  Number(value.toFixed(6)).toString();

const matrixText = (matrix: [number, number, number, number, number, number]): string =>
  `matrix(${matrix.map(preciseNumber).join(" ")})`;

const isFourthSetFont = (font: ThoughtV2GlyphStudyFont): boolean =>
  font.librarySet.id === "inshell.thought.glyph-library.set-04";

const glyphId = (font: ThoughtV2GlyphStudyFont, character: string): string =>
  `${font.family.slug}-g${character.codePointAt(0)?.toString(16).padStart(4, "0")}`;

export const wrapThoughtV2GlyphStudyLine = (
  value: string,
  maxColumns = THOUGHT_V2_GLYPH_STUDY_MAX_COLUMNS,
): string[] => {
  if (!Number.isInteger(maxColumns) || maxColumns < 1) {
    throw new Error("maxColumns must be a positive integer");
  }
  if (value.length === 0) return [];

  const rows: string[] = [];
  let current = "";
  const pushLong = (word: string): string => {
    let rest = word;
    while (rest.length > maxColumns) {
      rows.push(rest.slice(0, maxColumns));
      rest = rest.slice(maxColumns);
    }
    return rest;
  };

  for (const word of value.split(" ")) {
    if (word.length > maxColumns) {
      if (current) rows.push(current);
      current = pushLong(word);
    } else if (!current) {
      current = word;
    } else if (current.length + 1 + word.length <= maxColumns) {
      current += ` ${word}`;
    } else {
      rows.push(current);
      current = word;
    }
  }
  if (current) rows.push(current);
  return rows;
};

const assertStudyLine = (
  font: ThoughtV2GlyphStudyFont,
  value: string,
  fieldName: "promptLine" | "agentLine",
): void => {
  if (value.length < 1 || value.length > 64) {
    throw new Error(`${fieldName} must contain 1 through 64 approved ASCII characters`);
  }
  if (value.startsWith(" ") || value.endsWith(" ") || value.includes("  ")) {
    throw new Error(`${fieldName} violates the Terminal English spacing profile`);
  }
  const repertoire = new Set(font.glyphs.map(({ character }) => character));
  for (const character of value) {
    if (!repertoire.has(character)) {
      const codePoint = character.codePointAt(0)?.toString(16).toUpperCase().padStart(4, "0");
      throw new Error(`${fieldName} contains unsupported U+${codePoint}`);
    }
  }
};

const definitionsForText = (font: ThoughtV2GlyphStudyFont, text: string): string => {
  const glyphs = new Map(font.glyphs.map((glyph) => [glyph.character, glyph]));
  const used = [...new Set([...text].filter((character) => character !== " "))]
    .sort((left, right) =>
      font.canonicalOrder.indexOf(left) - font.canonicalOrder.indexOf(right));
  return `<defs>${used.map((character) => {
    const glyph = glyphs.get(character);
    if (!glyph) throw new Error(`glyph-library font lacks ${JSON.stringify(character)}`);
    return `<path id="${glyphId(font, character)}" d="${glyph.d}" fill-rule="${font.metrics.fillRule}"/>`;
  }).join("")}</defs>`;
};

const usesForRows = (
  font: ThoughtV2GlyphStudyFont,
  rows: string[],
  field: typeof PROMPT_FIELD | typeof AGENT_FIELD,
  horizontalAlign: "left" | "right",
): string => {
  const glyphs = new Set(font.glyphs.map(({ character }) => character));
  const fourthSet = isFourthSetFont(font);
  const presentation = font.tilePresentation;
  if (fourthSet && (!presentation || presentation.profileId !== FOURTH_SET_TIGHT_PROFILE.id)) {
    throw new Error("Fourth Set font is missing the approved tight-v1 presentation");
  }
  const cellWidth = fourthSet ? TIGHT_TILE_WIDTH : GLYPH_WIDTH;
  const contentHeight = rows.length * LINE_HEIGHT;
  const firstY =
    field.y + field.height - contentHeight + ((LINE_HEIGHT - GLYPH_HEIGHT) / 2);

  return rows.map((row, rowIndex) => {
    let x = horizontalAlign === "right"
      ? field.x + field.width - (row.length * cellWidth)
      : field.x;
    const y = firstY + (rowIndex * LINE_HEIGHT);
    const uses: string[] = [];
    for (const character of row) {
      if (character !== " ") {
        if (!glyphs.has(character)) throw new Error(`glyph-library font lacks ${JSON.stringify(character)}`);
        if (fourthSet && presentation) {
          const paint = resolveFourthSetTilePaint(character, {
            tileProfile: FOURTH_SET_TIGHT_PROFILE.id,
          });
          if (!paint.drawsTile || !paint.drawsGlyph) {
            throw new Error(`Fourth Set paint unexpectedly hides ${JSON.stringify(character)}`);
          }
          const normalization = presentation.normalization.safeCharacters.includes(character)
            ? presentation.normalization.safeMatrix
            : presentation.normalization.ordinaryMatrix;
          const paletteAttributes = paint.paletteBacked
            ? ` data-palette-letter="${paint.resolvedLetter}" data-palette-index="${paint.index}" data-palette-alias="${escapeXml(paint.aliasTerm ?? "")}"`
            : "";
          const tileX = FOURTH_SET_TIGHT_PROFILE.tileGap / 2;
          const tileY = FOURTH_SET_TIGHT_PROFILE.tileGap / 2;
          const tileWidth = FOURTH_SET_TIGHT_PROFILE.tileWidth - FOURTH_SET_TIGHT_PROFILE.tileGap;
          const tileHeight = FOURTH_SET_TIGHT_PROFILE.tileHeight - FOURTH_SET_TIGHT_PROFILE.tileGap;
          const outerTransform =
            `translate(${preciseNumber(FOURTH_SET_TIGHT_PROFILE.tileWidth / 2)} 4) `
            + `scale(${preciseNumber(FOURTH_SET_TIGHT_PROFILE.glyphScale)}) translate(-4 -4)`;
          uses.push(
            `<g class="tile-cell" transform="translate(${number(x)} ${number(y)}) scale(${GLYPH_SCALE})" data-character="${escapeXml(character)}" data-tile-profile="${FOURTH_SET_TIGHT_PROFILE.id}" data-color-resolution="${escapeXml(paint.resolution)}"${paletteAttributes}><rect x="${preciseNumber(tileX)}" y="${preciseNumber(tileY)}" width="${preciseNumber(tileWidth)}" height="${preciseNumber(tileHeight)}" rx="${preciseNumber(FOURTH_SET_TIGHT_PROFILE.effectiveCornerRadius)}" fill="${paint.background}" data-background="${paint.background}" data-edge-style="${FOURTH_SET_TIGHT_PROFILE.edgeStyle}"/><g class="normalized-glyph" transform="${outerTransform}"><use href="#${glyphId(font, character)}" transform="${matrixText(normalization)}" fill="${paint.foreground}" data-foreground="${paint.foreground}" data-contrast-ratio="${preciseNumber(paint.chosenContrast)}" data-normalization="${escapeXml(matrixText(normalization))}"/></g></g>`,
          );
        } else {
          uses.push(
            `<use href="#${glyphId(font, character)}" transform="translate(${number(x)} ${number(y)}) scale(${GLYPH_SCALE})"/>`,
          );
        }
      }
      x += cellWidth;
    }
    return uses.join("");
  }).join("");
};

export const renderThoughtV2GlyphLibraryFrameStudySvg = (
  font: ThoughtV2GlyphStudyFont,
  promptLine: string,
  agentLine: string,
  requestedFrameWidth: number,
  requestedFrameColor: string,
  requestedTextColor: string,
): string => {
  assertStudyLine(font, promptLine, "promptLine");
  assertStudyLine(font, agentLine, "agentLine");
  const fourthSet = isFourthSetFont(font);
  const maxColumns = fourthSet
    ? THOUGHT_V2_GLYPH_STUDY_TIGHT_TILE_MAX_COLUMNS
    : THOUGHT_V2_GLYPH_STUDY_MAX_COLUMNS;
  const promptRows = wrapThoughtV2GlyphStudyLine(promptLine, maxColumns);
  const agentRows = wrapThoughtV2GlyphStudyLine(agentLine, maxColumns);
  if (
    promptRows.length > THOUGHT_V2_GLYPH_STUDY_MAX_ROWS
    || agentRows.length > THOUGHT_V2_GLYPH_STUDY_MAX_ROWS
  ) {
    throw new Error("glyph-library study wrapping exceeds the four-row field");
  }

  const geometry = thoughtV2FrameStudyGeometry(requestedFrameWidth);
  const frameColor = normalizeThoughtV2FrameColor(requestedFrameColor);
  const textColor = normalizeThoughtV2FrameColor(requestedTextColor);
  const library = font.librarySet;
  const metadata = [
    `data-renderer="inshell.thought.svg.v2.terminal-chat-path-glyphs.library-study"`,
    `data-library-set-id="${escapeXml(library.id)}"`,
    `data-library-set-name="${escapeXml(library.name)}"`,
    `data-library-member-id="${escapeXml(library.memberId)}"`,
    `data-library-set-version="${library.version}"`,
    `data-qualification-status="${escapeXml(library.qualificationStatus)}"`,
    `data-wrap="${THOUGHT_V2_GLYPH_STUDY_WRAP}"`,
    `data-max-columns="${maxColumns}"`,
    `data-prompt-source="${escapeXml(promptLine)}"`,
    `data-agent-source="${escapeXml(agentLine)}"`,
  ].join(" ");
  const metricMetadata = font.metrics.visualBaseline === undefined
    ? ""
    : [
      ` data-visual-baseline="${number(font.metrics.visualBaseline)}"`,
      ` data-study-contract-baseline="${number(font.metrics.studyContractBaseline ?? 7)}"`,
      ` data-baseline-contract-status="${escapeXml(font.metrics.baselineContractStatus ?? "mismatch-disclosed")}"`,
      ` data-metric-adjustment="none"`,
    ].join("");
  const fourthSetMetadata = fourthSet
    ? font.colorBinding && font.tilePresentation
      ? [
        ` data-color-font-id="${escapeXml(font.colorBinding.paletteId)}"`,
        ` data-color-font-sha256="${escapeXml(font.colorBinding.canonicalSha256)}"`,
        ` data-color-font-status="${escapeXml(font.colorBinding.sourceStatus)}"`,
        ` data-current-protocol-dependency="${font.colorBinding.currentProtocolDependency}"`,
        ` data-palette-role="${font.colorBinding.paletteRole}"`,
        ` data-tile-profile="${font.tilePresentation.profileId}"`,
        ` data-monospaced="${font.tilePresentation.monospaced}"`,
        ` data-advance-width="${font.tilePresentation.renderedAdvanceWidth}"`,
        ` data-text-color-policy="canonical-per-tile"`,
        ` data-minimum-selected-contrast="${preciseNumber(font.colorBinding.foreground.minimumChosenContrast)}"`,
      ].join("")
      : (() => {
        throw new Error("Fourth Set font is missing its canonical color binding");
      })()
    : "";
  const textColorAttribute = fourthSet ? "canonical-per-tile" : textColor;
  const promptPaint = fourthSet
    ? `data-paint-policy="canonical-per-tile"`
    : `fill="${textColor}"`;
  const agentPaint = promptPaint;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${geometry.artboardSize}" height="${geometry.artboardSize}" viewBox="0 0 ${geometry.artboardSize} ${geometry.artboardSize}" role="img" aria-label="THOUGHT native path glyph study" data-frame-study="outer-canvas" data-frame-width="${geometry.frameWidth}" data-frame-color="${frameColor}" data-text-color="${textColorAttribute}" data-canvas-size="${geometry.canvasSize}" data-glyph-family="${escapeXml(font.family.slug)}" data-field-vertical-align="bottom"><title>THOUGHT native path glyph study</title><metadata ${metadata}${metricMetadata}${fourthSetMetadata}/><rect id="work-frame" width="${geometry.artboardSize}" height="${geometry.artboardSize}" fill="${frameColor}"/><g id="work-canvas" transform="${geometry.canvasTransform}"><rect id="canvas-bg" width="${CANVAS_SIZE}" height="${CANVAS_SIZE}" fill="#000000"/>${definitionsForText(font, `${promptLine}${agentLine}`)}<g id="prompt-line" ${promptPaint} data-source="${escapeXml(promptLine)}" data-rows="${promptRows.length}" data-field-x="57.6" data-field-y="128" data-field-width="844.8" data-field-height="256" data-field-bottom="384" data-horizontal-align="right" data-vertical-align="bottom">${usesForRows(font, promptRows, PROMPT_FIELD, "right")}</g><g id="agent-line" ${agentPaint} data-source="${escapeXml(agentLine)}" data-rows="${agentRows.length}" data-field-x="57.6" data-field-y="576" data-field-width="844.8" data-field-height="256" data-field-bottom="832" data-horizontal-align="left" data-vertical-align="bottom">${usesForRows(font, agentRows, AGENT_FIELD, "left")}</g></g></svg>`;
};
