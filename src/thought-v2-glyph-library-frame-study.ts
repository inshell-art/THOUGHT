import {
  FOURTH_SET_TIGHT_PROFILE,
  resolveFourthSetTilePaint,
} from "@inshell/thought-glyph-library-fourth-set";

import {
  normalizeThoughtV2FrameColor,
  thoughtV2FrameStudyGeometry,
} from "./thought-v2-frame-study";

export type ThoughtV2GlyphStudyFont = {
  candidate?: {
    baseFaceSha256: string;
    basePackageVersion: string;
    basePackedSha256: string;
    baseSetVersion: number;
    baseSourceCommit: string;
    comparisonReportSchema: string;
    comparisonReportSha256: string;
    createdOn: string;
    pairSpacingAuditSha256: string;
    revision: string;
    status: string;
  };
  canonicalOrder?: string;
  composition?: {
    appliedPerGlyphOffsets: Record<string, number>;
    defaultOriginShiftX: number;
    fixedAdvanceWidth: number;
    kerning: boolean;
    mechanicalCenterReference: Record<string, number>;
    mechanicalCenterReferenceApplied: boolean;
    note: string;
  };
  repertoire?: string;
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
    classification?: string;
    name: string;
    slug: string;
    sourceCandidate?: string;
    style?: string;
    weight?: number;
  };
  glyphs: Array<{
    advanceWidth?: number;
    character: string;
    codepoint: number;
    d: string;
  }>;
  librarySet: {
    id: string;
    memberId: string;
    name: string;
    qualificationStatus?: string;
    version: number;
  };
  metrics: {
    baseline?: number;
    baselineContractStatus?: string;
    capHeight?: number;
    coordinateSystem?: string;
    descender?: number;
    emSquare?: number;
    fillRule?: "evenodd";
    fixedAdvanceWidth: number;
    svgBaselineY?: number;
    svgViewBoxHeight?: number;
    studyContractBaseline?: number;
    unitsPerEm?: number;
    visualBaseline?: number;
    xHeight?: number;
  };
  renderStyle?: {
    fill: "none";
    strokeLinecap: "butt" | "round" | "square";
    strokeLinejoin: "bevel" | "miter" | "round";
    strokeWidth: number;
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
export const THOUGHT_V2_GLYPH_STUDY_MIN_STROKE_WIDTH = 0.4;
export const THOUGHT_V2_GLYPH_STUDY_MAX_STROKE_WIDTH = 1.4;
export const THOUGHT_V2_GLYPH_STUDY_STROKE_WIDTH_STEP = 0.01;

const GLYPH_WIDTH = 28.8;
const GLYPH_HEIGHT = 38.4;
const GLYPH_SCALE = 4.8;
const FIFTH_SET_ADVANCE_WIDTH = 10;
const FIFTH_SET_GLYPH_SCALE = GLYPH_WIDTH / FIFTH_SET_ADVANCE_WIDTH;
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

const isFifthSetFont = (font: ThoughtV2GlyphStudyFont): boolean =>
  font.librarySet.id === "inshell.thought.glyph-library.set-05";

const isClassicBookCandidateFont = (font: ThoughtV2GlyphStudyFont): boolean =>
  font.librarySet.id
    === "inshell.thought.glyph-library.classic-book-76.current-candidate";

const isCenterlineFont = (font: ThoughtV2GlyphStudyFont): boolean =>
  isFifthSetFont(font) || isClassicBookCandidateFont(font);

export const normalizeThoughtV2GlyphStudyStrokeWidth = (
  requestedStrokeWidth: number | undefined,
  authoredStrokeWidth: number,
): number => {
  if (!Number.isFinite(authoredStrokeWidth) || authoredStrokeWidth <= 0) {
    throw new Error("Set 5 font has an invalid authored stroke width");
  }
  if (requestedStrokeWidth === undefined) return authoredStrokeWidth;
  if (
    !Number.isFinite(requestedStrokeWidth)
    || requestedStrokeWidth < THOUGHT_V2_GLYPH_STUDY_MIN_STROKE_WIDTH
    || requestedStrokeWidth > THOUGHT_V2_GLYPH_STUDY_MAX_STROKE_WIDTH
  ) {
    throw new Error(
      `study stroke width must be ${THOUGHT_V2_GLYPH_STUDY_MIN_STROKE_WIDTH} through ${THOUGHT_V2_GLYPH_STUDY_MAX_STROKE_WIDTH}`,
    );
  }
  return Number(requestedStrokeWidth.toFixed(2));
};

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
  const canonicalOrder = font.canonicalOrder ?? font.repertoire;
  if (!canonicalOrder) throw new Error("glyph-library font lacks canonical repertoire order");
  const used = [...new Set([...text].filter((character) => character !== " "))]
    .sort((left, right) =>
      canonicalOrder.indexOf(left) - canonicalOrder.indexOf(right));
  return `<defs>${used.map((character) => {
    const glyph = glyphs.get(character);
    if (!glyph) throw new Error(`glyph-library font lacks ${JSON.stringify(character)}`);
    const fillRule = font.metrics.fillRule
      ? ` fill-rule="${font.metrics.fillRule}"`
      : "";
    return `<path id="${glyphId(font, character)}" d="${glyph.d}"${fillRule}/>`;
  }).join("")}</defs>`;
};

const usesForRows = (
  font: ThoughtV2GlyphStudyFont,
  rows: string[],
  field: typeof PROMPT_FIELD | typeof AGENT_FIELD,
  horizontalAlign: "left" | "right",
  verticalAlign: "top" | "bottom",
): string => {
  const glyphs = new Set(font.glyphs.map(({ character }) => character));
  const fourthSet = isFourthSetFont(font);
  const centerline = isCenterlineFont(font);
  const presentation = font.tilePresentation;
  if (fourthSet && (!presentation || presentation.profileId !== FOURTH_SET_TIGHT_PROFILE.id)) {
    throw new Error("Fourth Set font is missing the approved tight-v1 presentation");
  }
  if (
    centerline
    && (
      font.metrics.fixedAdvanceWidth !== FIFTH_SET_ADVANCE_WIDTH
      || font.metrics.svgBaselineY === undefined
      || font.metrics.svgViewBoxHeight === undefined
      || !font.renderStyle
      || font.renderStyle.fill !== "none"
    )
  ) {
    throw new Error("centerline font is missing its required metrics or paint");
  }
  const cellWidth = fourthSet ? TIGHT_TILE_WIDTH : GLYPH_WIDTH;
  const contentHeight = rows.length * LINE_HEIGHT;
  const firstRowTop = verticalAlign === "top"
    ? field.y
    : field.y + field.height - contentHeight;
  const firstY = centerline
    ? firstRowTop
      + ((LINE_HEIGHT - ((font.metrics.svgViewBoxHeight ?? 0) * FIFTH_SET_GLYPH_SCALE)) / 2)
      + ((font.metrics.svgBaselineY ?? 0) * FIFTH_SET_GLYPH_SCALE)
    : firstRowTop + ((LINE_HEIGHT - GLYPH_HEIGHT) / 2);

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
          const centerlineX = x
            + ((font.composition?.defaultOriginShiftX ?? 0) * FIFTH_SET_GLYPH_SCALE);
          const transform = centerline
            ? `translate(${number(centerlineX)} ${number(y)}) scale(${number(FIFTH_SET_GLYPH_SCALE)} -${number(FIFTH_SET_GLYPH_SCALE)})`
            : `translate(${number(x)} ${number(y)}) scale(${GLYPH_SCALE})`;
          uses.push(`<use href="#${glyphId(font, character)}" transform="${transform}"/>`);
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
  requestedStrokeWidth?: number,
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
  const centerline = isCenterlineFont(font);
  if (requestedStrokeWidth !== undefined && (!centerline || !font.renderStyle)) {
    throw new Error("study stroke-width override is only supported by centerline fonts");
  }
  const effectiveStrokeWidth = centerline && font.renderStyle
    ? normalizeThoughtV2GlyphStudyStrokeWidth(requestedStrokeWidth, font.renderStyle.strokeWidth)
    : undefined;
  const weightMode = requestedStrokeWidth === undefined ? "authored-regular" : "synthetic-stroke-study";
  const library = font.librarySet;
  const metadata = [
    `data-renderer="inshell.thought.svg.v2.terminal-chat-path-glyphs.library-study"`,
    `data-library-set-id="${escapeXml(library.id)}"`,
    `data-library-set-name="${escapeXml(library.name)}"`,
    `data-library-member-id="${escapeXml(library.memberId)}"`,
    `data-library-set-version="${library.version}"`,
    `data-qualification-status="${escapeXml(library.qualificationStatus ?? (centerline ? "declared" : "unspecified"))}"`,
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
  const centerlineMetadata = centerline && font.renderStyle
    ? [
      ` data-path-model="centerline"`,
      ` data-coordinate-system="${escapeXml(font.metrics.coordinateSystem ?? "logical units, y-up")}"`,
      ` data-fixed-advance-width="${font.metrics.fixedAdvanceWidth}"`,
      ` data-font-style="${escapeXml(font.family.style ?? "Regular")}"`,
      ` data-font-weight="${font.family.weight ?? 400}"`,
      ` data-source-candidate="${escapeXml(font.family.sourceCandidate ?? "")}"`,
      ` data-render-fill="${font.renderStyle.fill}"`,
      ` data-authored-stroke-width="${font.renderStyle.strokeWidth}"`,
      ` data-stroke-width="${effectiveStrokeWidth}"`,
      ` data-weight-mode="${weightMode}"`,
      ` data-stroke-linecap="${font.renderStyle.strokeLinecap}"`,
      ` data-stroke-linejoin="${font.renderStyle.strokeLinejoin}"`,
      ...(font.candidate
        ? [
          ` data-candidate-revision="${escapeXml(font.candidate.revision)}"`,
          ` data-candidate-status="${escapeXml(font.candidate.status)}"`,
          ` data-base-set-version="${font.candidate.baseSetVersion}"`,
          ` data-origin-shift-x="${font.composition?.defaultOriginShiftX ?? 0}"`,
          ` data-kerning="${font.composition?.kerning ?? false}"`,
          ` data-per-glyph-offsets-applied="${font.composition?.mechanicalCenterReferenceApplied ?? false}"`,
        ]
        : []),
    ].join("")
    : "";
  const textColorAttribute = fourthSet ? "canonical-per-tile" : textColor;
  const promptPaint = fourthSet
    ? `data-paint-policy="canonical-per-tile"`
    : centerline && font.renderStyle
      ? `fill="none" stroke="${textColor}" stroke-width="${effectiveStrokeWidth}" stroke-linecap="${font.renderStyle.strokeLinecap}" stroke-linejoin="${font.renderStyle.strokeLinejoin}" data-paint-policy="${font.candidate ? requestedStrokeWidth === undefined ? "candidate-centerline-stroke" : "candidate-centerline-weight-study" : requestedStrokeWidth === undefined ? "canonical-centerline-stroke" : "synthetic-centerline-weight-study"}"`
      : `fill="${textColor}"`;
  const agentPaint = promptPaint;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${geometry.artboardSize}" height="${geometry.artboardSize}" viewBox="0 0 ${geometry.artboardSize} ${geometry.artboardSize}" role="img" aria-label="THOUGHT native path glyph study" data-frame-study="outer-canvas" data-frame-width="${geometry.frameWidth}" data-frame-color="${frameColor}" data-text-color="${textColorAttribute}" data-canvas-size="${geometry.canvasSize}" data-glyph-family="${escapeXml(font.family.slug)}" data-prompt-vertical-align="top" data-agent-vertical-align="bottom"><title>THOUGHT native path glyph study</title><metadata ${metadata}${metricMetadata}${fourthSetMetadata}${centerlineMetadata}/><rect id="work-frame" width="${geometry.artboardSize}" height="${geometry.artboardSize}" fill="${frameColor}"/><g id="work-canvas" transform="${geometry.canvasTransform}"><rect id="canvas-bg" width="${CANVAS_SIZE}" height="${CANVAS_SIZE}" fill="#000000"/>${definitionsForText(font, `${promptLine}${agentLine}`)}<g id="prompt-line" ${promptPaint} data-source="${escapeXml(promptLine)}" data-rows="${promptRows.length}" data-field-x="57.6" data-field-y="128" data-field-width="844.8" data-field-height="256" data-field-bottom="384" data-horizontal-align="right" data-vertical-align="top">${usesForRows(font, promptRows, PROMPT_FIELD, "right", "top")}</g><g id="agent-line" ${agentPaint} data-source="${escapeXml(agentLine)}" data-rows="${agentRows.length}" data-field-x="57.6" data-field-y="576" data-field-width="844.8" data-field-height="256" data-field-bottom="832" data-horizontal-align="left" data-vertical-align="bottom">${usesForRows(font, agentRows, AGENT_FIELD, "left", "bottom")}</g></g></svg>`;
};
