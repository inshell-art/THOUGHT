export type ThoughtV2LineKind = "prompt" | "agent";

export type ThoughtV2Measure = {
  byteLength: number;
  displayUnits: number;
  errors: string[];
};

export type ThoughtV2SvgInput = {
  promptLine: string;
  agentLine: string;
  agentFontSize?: number;
  promptFontSize?: number;
  agentBgColor?: string;
  agentFrameColor?: string;
  canvasBgColor?: string;
  agentTextColor?: string;
  promptTextColor?: string;
  lineBgPadding?: number;
  promptBottomOffset?: number;
};

const SVG_WIDTH = 960;
const SVG_HEIGHT = 960;
const WORK_FRAME_SIZE = 16;
const WORK_FRAME_COLOR = "#202020";
const WORK_FRAME_INNER_SIZE = SVG_WIDTH - WORK_FRAME_SIZE * 2;
const WORK_FRAME_SCALE = WORK_FRAME_INNER_SIZE / SVG_WIDTH;
const WORK_FRAME_TRANSFORM = `translate(${WORK_FRAME_SIZE} ${WORK_FRAME_SIZE}) scale(${WORK_FRAME_SCALE})`;
const AGENT_X = 480;
const AGENT_TARGET_WIDTH = 784;
const AGENT_BASE_FONT = 44;
const AGENT_MIN_FONT = 44;
const AGENT_BG = { x: 87, y: 378, width: 786, height: 70, radius: 8 };
const AGENT_CLIP = { x: 88, y: 378, width: 784, height: 70, radius: 8 };
const AGENT_TEXT_Y = 413;
const AGENT_FRAME_STROKE_WIDTH = 1;
const PROMPT_X = 480;
const PROMPT_TARGET_WIDTH = 628;
const PROMPT_BASE_FONT = 16;
const PROMPT_MIN_FONT = 16;
const PROMPT_BG = { x: 165, y: 868, width: 630, height: 44, radius: 8 };
const PROMPT_CLIP = { x: 166, y: 868, width: 628, height: 44, radius: 8 };
const PROMPT_TEXT_Y = 890;
const DEFAULT_CANVAS_BG = "#000000";
const DEFAULT_AGENT_TEXT = "#ffffff";
const DEFAULT_PROMPT_TEXT = "#ffffff";
const DEFAULT_AGENT_FRAME = "#ffffff";
const BINARY_BG_X = 48;
const BINARY_BG_Y = 57;
const BINARY_BG_ROWS = 48;
const BINARY_BG_ROW_GAP = 18;
const BINARY_BG_WIDTH = 864;
const BINARY_BG_HEIGHT = (BINARY_BG_ROWS - 1) * BINARY_BG_ROW_GAP;
const BINARY_BG_DOT_RADIUS_RATIO = 0.32;
const BINARY_BG_FILL = "#006100";
const BINARY_BG_OPACITY = 0.5;
const BINARY_BG_OPACITY_ATTR = "0.50";
const CAROUSEL_MIN_GAP = 240;
const CAROUSEL_FONT_GAP_MULTIPLIER = 6;

const PROMPT_MAX_BYTES = 1024;
const AGENT_MAX_BYTES = 1024;
const PROMPT_MAX_UNITS = 960;
const AGENT_MAX_UNITS = 960;

const FONT_STACK =
  "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Noto Sans Mono', 'Noto Sans Mono CJK SC', 'Noto Sans Mono CJK JP', 'Noto Sans Mono CJK KR', 'Noto Sans', monospace, sans-serif";

const encoder = new TextEncoder();

export const THOUGHT_V2_RENDER_CONTRACT = {
  schemaVersion: 1,
  canvas: {
    width: SVG_WIDTH,
    height: SVG_HEIGHT,
    defaultBg: DEFAULT_CANVAS_BG,
  },
  workFrame: {
    size: WORK_FRAME_SIZE,
    color: WORK_FRAME_COLOR,
    transform: WORK_FRAME_TRANSFORM,
  },
  fontFamily: FONT_STACK,
  binaryBackground: {
    sourceOrder: ["promptLine", "agentLine"],
    encoding: "utf-8",
    layout: "one-pass-square-cell-grid",
    x: BINARY_BG_X,
    y: BINARY_BG_Y,
    maxRows: BINARY_BG_ROWS,
    width: BINARY_BG_WIDTH,
    height: BINARY_BG_HEIGHT,
    glyphs: {
      one: "circle",
      zero: "hollow circle",
    },
    cell: {
      mode: "square-grid-fit",
      radiusMode: "percentage-of-square-cell",
      radiusFormula: "ceil(cellSize * dotRadiusRatio)",
      dotRadiusRatio: BINARY_BG_DOT_RADIUS_RATIO,
    },
    fill: BINARY_BG_FILL,
    opacity: BINARY_BG_OPACITY,
  },
  agentLine: {
    targetWidth: AGENT_TARGET_WIDTH,
    defaultFontSize: AGENT_BASE_FONT,
    defaultTextColor: DEFAULT_AGENT_TEXT,
    defaultBgColor: "none",
    defaultFrameColor: DEFAULT_AGENT_FRAME,
    bg: AGENT_BG,
    clip: AGENT_CLIP,
    frameStrokeWidth: AGENT_FRAME_STROKE_WIDTH,
    text: {
      x: AGENT_X,
      y: AGENT_TEXT_Y,
      textAnchor: "middle",
      dominantBaseline: "middle",
    },
  },
  promptLine: {
    targetWidth: PROMPT_TARGET_WIDTH,
    defaultFontSize: PROMPT_BASE_FONT,
    defaultTextColor: DEFAULT_PROMPT_TEXT,
    bg: PROMPT_BG,
    clip: PROMPT_CLIP,
    text: {
      x: PROMPT_X,
      y: PROMPT_TEXT_Y,
      textAnchor: "middle",
      dominantBaseline: "middle",
    },
  },
  carousel: {
    minGap: CAROUSEL_MIN_GAP,
    fontGapMultiplier: CAROUSEL_FONT_GAP_MULTIPLIER,
    minDurationSeconds: 14,
    pixelsPerSecond: 80,
  },
} as const;

export const THOUGHT_V2_LIMITS = {
  promptMaxBytes: PROMPT_MAX_BYTES,
  agentMaxBytes: AGENT_MAX_BYTES,
  promptMaxUnits: PROMPT_MAX_UNITS,
  agentMaxUnits: AGENT_MAX_UNITS,
} as const;

export const escapeXml = (value: string): string =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");

const escapeXmlAttribute = (value: string): string =>
  value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");

const isRejectedSpace = (codepoint: number): boolean =>
  codepoint === 0x00a0 ||
  codepoint === 0x1680 ||
  codepoint === 0x180e ||
  (codepoint >= 0x2000 && codepoint <= 0x200a) ||
  codepoint === 0x2028 ||
  codepoint === 0x2029 ||
  codepoint === 0x202f ||
  codepoint === 0x205f ||
  codepoint === 0x3000;

const isInvisibleControl = (codepoint: number): boolean =>
  (codepoint >= 0x200b && codepoint <= 0x200f) ||
  (codepoint >= 0x202a && codepoint <= 0x202e) ||
  (codepoint >= 0x2060 && codepoint <= 0x206f) ||
  codepoint === 0xfeff;

const displayUnitsOf = (codepoint: number): number => {
  if (codepoint >= 0x21 && codepoint <= 0x7e) return 6;
  if (
    (codepoint >= 0x1100 && codepoint <= 0x11ff) ||
    (codepoint >= 0x2e80 && codepoint <= 0xa4cf) ||
    (codepoint >= 0xac00 && codepoint <= 0xd7af) ||
    (codepoint >= 0xf900 && codepoint <= 0xfaff) ||
    (codepoint >= 0xfe10 && codepoint <= 0xfe6f) ||
    (codepoint >= 0xff00 && codepoint <= 0xffef) ||
    (codepoint >= 0x20000 && codepoint <= 0x3fffd)
  ) {
    return 10;
  }
  return 8;
};

export const measureThoughtV2Line = (value: string, kind: ThoughtV2LineKind): ThoughtV2Measure => {
  const errors: string[] = [];
  const byteLength = encoder.encode(value).length;
  const maxBytes = kind === "prompt" ? PROMPT_MAX_BYTES : AGENT_MAX_BYTES;
  const maxUnits = kind === "prompt" ? PROMPT_MAX_UNITS : AGENT_MAX_UNITS;

  if (byteLength === 0) errors.push(`${kind} line is empty`);
  if (byteLength > maxBytes) errors.push(`${kind} line is ${byteLength}/${maxBytes} bytes`);

  let displayUnits = 0;
  let index = 0;
  let previousWasSpace = false;
  for (const char of value) {
    const codepoint = char.codePointAt(0);
    if (codepoint === undefined) continue;

    if (codepoint >= 0xd800 && codepoint <= 0xdfff) {
      errors.push(`${kind} line contains an invalid surrogate`);
      index += char.length;
      continue;
    }

    if (codepoint === 0x20) {
      if (index === 0 || index + char.length === value.length || previousWasSpace) {
        errors.push(`${kind} line has invalid spacing`);
      }
      previousWasSpace = true;
      displayUnits += 4;
      index += char.length;
      continue;
    }

    previousWasSpace = false;
    if (codepoint <= 0x1f || codepoint === 0x7f || (codepoint >= 0x80 && codepoint <= 0x9f)) {
      errors.push(`${kind} line contains a control character U+${codepoint.toString(16).toUpperCase()}`);
    }
    if (isRejectedSpace(codepoint) || isInvisibleControl(codepoint)) {
      errors.push(`${kind} line contains disallowed character U+${codepoint.toString(16).toUpperCase()}`);
    }
    displayUnits += displayUnitsOf(codepoint);
    index += char.length;
  }

  if (displayUnits > maxUnits) errors.push(`${kind} line is ${displayUnits}/${maxUnits} display units`);

  return { byteLength, displayUnits, errors };
};

const fontSize = (
  displayUnits: number,
  targetWidth: number,
  baseFont: number,
  minFont: number,
): { size: number; squeezed: boolean } => {
  const fit = Math.floor((targetWidth * 10) / displayUnits);
  if (fit >= baseFont) return { size: baseFont, squeezed: false };
  if (fit < minFont) return { size: minFont, squeezed: true };
  return { size: fit, squeezed: true };
};

const explicitFontSize = (
  displayUnits: number,
  targetWidth: number,
  explicitSize: number | undefined,
): { size: number; squeezed: boolean } | null => {
  if (explicitSize === undefined || !Number.isFinite(explicitSize) || explicitSize <= 0) return null;
  const size = Math.floor(explicitSize);
  return {
    size,
    squeezed: (displayUnits * size) / 10 > targetWidth,
  };
};

const normalizePaint = (value: string | undefined, fallback: string): string => {
  if (!value) return fallback;
  const trimmed = value.trim();
  if (/^#[0-9a-f]{6}$/i.test(trimmed)) return trimmed;
  return fallback;
};

const rawLineVisualWidth = (displayUnits: number, fontSizeValue: number) =>
  Math.ceil((displayUnits * fontSizeValue) / 10);

const rectNumber = (value: number): string => {
  if (Number.isInteger(value)) return String(value);
  return value.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
};

const indentLines = (value: string, spaces: string): string =>
  value
    .split("\n")
    .map((line) => `${spaces}${line}`)
    .join("\n");

const binaryBytesOf = (value: string): string[] =>
  Array.from(encoder.encode(value)).map((byte) => byte.toString(2).padStart(8, "0"));

const binaryBitStreamOf = (promptLine: string, agentLine: string): string =>
  [...binaryBytesOf(promptLine), ...binaryBytesOf(agentLine)].join("");

const binaryGridColumns = (bitLength: number): number => {
  const areaFit = Math.ceil(Math.sqrt((bitLength * BINARY_BG_WIDTH) / BINARY_BG_HEIGHT));
  const rows = Math.ceil(bitLength / areaFit);
  if (rows <= BINARY_BG_ROWS) return areaFit;
  return Math.ceil(bitLength / BINARY_BG_ROWS);
};

const binaryBackgroundLayout = (
  promptLine: string,
  agentLine: string,
): {
  cells: Array<{ cx: number; cy: number; r: number; isOne: boolean }>;
  columns: number;
  rows: number;
  cellSize: number;
  originX: number;
  originY: number;
  radius: number;
} => {
  const bits = binaryBitStreamOf(promptLine, agentLine);
  if (bits.length === 0) {
    return {
      cells: [],
      columns: 0,
      rows: 0,
      cellSize: 0,
      originX: BINARY_BG_X,
      originY: BINARY_BG_Y,
      radius: 0,
    };
  }

  const columns = binaryGridColumns(bits.length);
  const rows = Math.ceil(bits.length / columns);
  const cellSize = Math.max(1, Math.floor(Math.min(BINARY_BG_WIDTH / columns, BINARY_BG_HEIGHT / rows)));
  const originX = BINARY_BG_X + Math.floor((BINARY_BG_WIDTH - columns * cellSize) / 2);
  const originY = BINARY_BG_Y + Math.floor((BINARY_BG_HEIGHT - rows * cellSize) / 2);
  const radius = Math.ceil(cellSize * BINARY_BG_DOT_RADIUS_RATIO);
  const cells: Array<{ cx: number; cy: number; r: number; isOne: boolean }> = [];
  for (let bitIndex = 0; bitIndex < bits.length; bitIndex += 1) {
    const column = bitIndex % columns;
    const row = Math.floor(bitIndex / columns);
    cells.push({
      cx: originX + column * cellSize + Math.floor(cellSize / 2),
      cy: originY + row * cellSize + Math.floor(cellSize / 2),
      r: radius,
      isOne: bits[bitIndex] === "1",
    });
  }

  return { cells, columns, rows, cellSize, originX, originY, radius };
};

const binaryBackground = (promptLine: string, agentLine: string): string => {
  const { cells, columns, rows, cellSize, originX, originY, radius } = binaryBackgroundLayout(promptLine, agentLine);
  return [
    `<g id="binary-background" opacity="${BINARY_BG_OPACITY_ATTR}" fill="${BINARY_BG_FILL}" aria-label="UTF-8 binary background: prompt line bytes then agent line bytes; filled green circles are one bits and hollow green circles are zero bits" data-grid-columns="${columns}" data-grid-rows="${rows}" data-cell-size="${cellSize}" data-origin-x="${originX}" data-origin-y="${originY}" data-dot-radius="${radius}" data-zero="hollow-circle">`,
    ...cells.map((cell) =>
      cell.isOne
        ? `  <circle cx="${cell.cx}" cy="${cell.cy}" r="${cell.r}"/>`
        : `  <circle cx="${cell.cx}" cy="${cell.cy}" r="${cell.r}" fill="none" stroke="${BINARY_BG_FILL}" stroke-width="1"/>`,
    ),
    `</g>`,
  ].join("\n");
};

const carouselTextLine = (
  baseId: string,
  displayUnits: number,
  x: number,
  y: number,
  targetWidth: number,
  clipId: string,
  clipX: number,
  font: { size: number },
  fill: string,
  value: string,
  dominantBaseline = "middle",
): string => {
  const textWidth = rawLineVisualWidth(displayUnits, font.size);
  if (textWidth <= targetWidth) {
    return textLine(baseId, x, y, clipId, font, fill, value, dominantBaseline);
  }

  const gap = Math.max(CAROUSEL_MIN_GAP, font.size * CAROUSEL_FONT_GAP_MULTIPLIER);
  const travel = textWidth + gap;
  const duration = Math.max(14, Math.ceil(travel / 80));
  const textAttrs = `y="${rectNumber(y)}" dominant-baseline="${dominantBaseline}" font-family="${escapeXmlAttribute(
    FONT_STACK,
  )}" font-size="${font.size}" fill="${escapeXml(fill)}" clip-path="url(#${clipId})"`;
  const escapedValue = escapeXml(value);
  const startX = rectNumber(clipX);
  const endX = rectNumber(clipX - travel);
  const copyX = rectNumber(clipX + travel);
  return [
    `<g id="${baseId.replace("-text", "-carousel")}">`,
    `  <text id="${baseId}" x="${startX}" ${textAttrs}>${escapedValue}<animate attributeName="x" values="${startX};${endX}" dur="${duration}s" repeatCount="indefinite"/></text>`,
    `  <text id="${baseId}-copy" x="${copyX}" ${textAttrs}>${escapedValue}<animate attributeName="x" values="${copyX};${startX}" dur="${duration}s" repeatCount="indefinite"/></text>`,
    `</g>`,
  ].join("\n");
};

const textLine = (
  id: string,
  x: number,
  y: number,
  clipId: string,
  font: { size: number },
  fill: string,
  value: string,
  dominantBaseline = "middle",
): string =>
  `<text id="${id}" x="${rectNumber(x)}" y="${rectNumber(
    y,
  )}" text-anchor="middle" dominant-baseline="${dominantBaseline}" font-family="${escapeXmlAttribute(
    FONT_STACK,
  )}" font-size="${font.size}" fill="${escapeXml(fill)}" clip-path="url(#${clipId})">${escapeXml(value)}</text>`;

export const buildThoughtV2Svg = ({
  promptLine,
  agentLine,
  agentFontSize,
  promptFontSize,
  agentFrameColor,
  canvasBgColor,
  agentTextColor,
  promptTextColor,
}: ThoughtV2SvgInput): string => {
  const promptMeasure = measureThoughtV2Line(promptLine, "prompt");
  const agentMeasure = measureThoughtV2Line(agentLine, "agent");
  const errors = [...promptMeasure.errors, ...agentMeasure.errors];
  if (errors.length > 0) {
    throw new Error(errors.join("; "));
  }

  const agentFont =
    explicitFontSize(agentMeasure.displayUnits, AGENT_TARGET_WIDTH, agentFontSize) ??
    fontSize(agentMeasure.displayUnits, AGENT_TARGET_WIDTH, AGENT_BASE_FONT, AGENT_MIN_FONT);
  const promptFont =
    explicitFontSize(promptMeasure.displayUnits, PROMPT_TARGET_WIDTH, promptFontSize) ??
    fontSize(promptMeasure.displayUnits, PROMPT_TARGET_WIDTH, PROMPT_BASE_FONT, PROMPT_MIN_FONT);
  const agentFrame = normalizePaint(agentFrameColor, DEFAULT_AGENT_FRAME);
  const canvasBg = normalizePaint(canvasBgColor, DEFAULT_CANVAS_BG);
  const agentText = normalizePaint(agentTextColor, DEFAULT_AGENT_TEXT);
  const promptText = normalizePaint(promptTextColor, DEFAULT_PROMPT_TEXT);

  const agentLineSvg = carouselTextLine(
    "agent-line-text",
    agentMeasure.displayUnits,
    AGENT_X,
    AGENT_TEXT_Y,
    AGENT_TARGET_WIDTH,
    "agent-line-clip",
    AGENT_CLIP.x,
    agentFont,
    agentText,
    agentLine,
  );
  const promptLineSvg = carouselTextLine(
    "prompt-line-text",
    promptMeasure.displayUnits,
    PROMPT_X,
    PROMPT_TEXT_Y,
    PROMPT_TARGET_WIDTH,
    "prompt-line-clip",
    PROMPT_CLIP.x,
    promptFont,
    promptText,
    promptLine,
  );
  const binaryBackgroundSvg = binaryBackground(promptLine, agentLine);

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${SVG_WIDTH}" height="${SVG_HEIGHT}" viewBox="0 0 ${SVG_WIDTH} ${SVG_HEIGHT}">`,
    `  <rect id="work-frame" width="${SVG_WIDTH}" height="${SVG_HEIGHT}" fill="${escapeXml(WORK_FRAME_COLOR)}"/>`,
    `  <g id="work-canvas" transform="${escapeXmlAttribute(WORK_FRAME_TRANSFORM)}">`,
    `    <rect id="canvas-bg" width="${SVG_WIDTH}" height="${SVG_HEIGHT}" fill="${escapeXml(canvasBg)}"/>`,
    indentLines(binaryBackgroundSvg, "    "),
    ``,
    `    <defs>`,
    `      <clipPath id="agent-line-clip">`,
    `        <rect x="${AGENT_CLIP.x}" y="${AGENT_CLIP.y}" width="${AGENT_CLIP.width}" height="${AGENT_CLIP.height}" rx="${AGENT_CLIP.radius}"/>`,
    `      </clipPath>`,
    `      <clipPath id="prompt-line-clip">`,
    `        <rect x="${PROMPT_CLIP.x}" y="${PROMPT_CLIP.y}" width="${PROMPT_CLIP.width}" height="${PROMPT_CLIP.height}" rx="${PROMPT_CLIP.radius}"/>`,
    `      </clipPath>`,
    `    </defs>`,
    ``,
    `    <g id="agent-line-area">`,
    `      <rect id="agent-line-bg" x="${AGENT_BG.x}" y="${AGENT_BG.y}" width="${AGENT_BG.width}" height="${AGENT_BG.height}" rx="${AGENT_BG.radius}" fill="none" stroke="${escapeXml(agentFrame)}" stroke-width="${AGENT_FRAME_STROKE_WIDTH}"/>`,
    indentLines(agentLineSvg, "      "),
    `    </g>`,
    ``,
    `    <g id="prompt-line-area">`,
    `      <rect id="prompt-line-bg" x="${PROMPT_BG.x}" y="${PROMPT_BG.y}" width="${PROMPT_BG.width}" height="${PROMPT_BG.height}" rx="${PROMPT_BG.radius}" fill="none" stroke="${escapeXml(promptText)}" stroke-width="1"/>`,
    indentLines(promptLineSvg, "      "),
    `    </g>`,
    `  </g>`,
    `</svg>`,
  ].join("\n");
};
