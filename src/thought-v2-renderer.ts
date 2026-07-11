export type ThoughtV2LineKind = "prompt" | "agent";

export type ThoughtV2Measure = {
  byteLength: number;
  displayUnits: number;
  errors: string[];
};

export type ThoughtV2SvgInput = {
  promptLine: string;
  agentLine: string;
};

const SVG_WIDTH = 960;
const SVG_HEIGHT = 960;
const AGENT_X = 480;
const AGENT_Y = 420;
const AGENT_TARGET_WIDTH = 820;
const AGENT_BASE_FONT = 118;
const AGENT_MIN_FONT = 48;
const AGENT_CLEAR_AREA = { x: 93, y: 373, width: 774, height: 74 };
const PROMPT_X = 480;
const PROMPT_Y = 830;
const PROMPT_TARGET_WIDTH = 820;
const PROMPT_BASE_FONT = 34;
const PROMPT_MIN_FONT = 18;
const PROMPT_CLEAR_AREA = { x: 149, y: 821, width: 662, height: 46 };
const DEFAULT_CANVAS_BG = "#050505";
const DEFAULT_AGENT_TEXT = "#f4f4f4";
const DEFAULT_PROMPT_TEXT = "#b8b8b8";
const BINARY_BG_X = 32;
const BINARY_BG_Y = 32;
const BINARY_BG_WIDTH = 896;
const BINARY_BG_HEIGHT = 896;
const BINARY_BG_SIDE = 32;
const BINARY_BG_CAPACITY = BINARY_BG_SIDE * BINARY_BG_SIDE;
const BINARY_BG_DOT_RADIUS_RATIO = 5 / 14;
const BINARY_BG_FILL = "#006100";
const BINARY_BG_OPACITY = 1;
const BINARY_BG_OPACITY_ATTR = "1.00";
const PROMPT_MAX_BYTES = 320;
const AGENT_MAX_BYTES = 180;
const PROMPT_MAX_UNITS = 433;
const AGENT_MAX_UNITS = 162;

const FONT_STACK =
  "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Noto Sans Mono', 'Noto Sans Mono CJK SC', 'Noto Sans Mono CJK JP', 'Noto Sans Mono CJK KR', 'Noto Sans', monospace, sans-serif";

const encoder = new TextEncoder();

export const THOUGHT_V2_RENDER_CONTRACT = {
  schemaVersion: 1,
  rendererId: "thought.svg.v2.fixed-a-32",
  canvas: {
    width: SVG_WIDTH,
    height: SVG_HEIGHT,
    defaultBg: DEFAULT_CANVAS_BG,
  },
  fontFamily: FONT_STACK,
  binaryBackground: {
    sourceOrder: ["promptLine", "agentLine"],
    encoding: "utf-8",
    layout: "fixed-capacity-square-matrix",
    x: BINARY_BG_X,
    y: BINARY_BG_Y,
    width: BINARY_BG_WIDTH,
    height: BINARY_BG_HEIGHT,
    side: BINARY_BG_SIDE,
    capacity: BINARY_BG_CAPACITY,
    fillRule: "repeat-short-truncate-long",
    glyphs: {
      one: "circle",
      zero: "hollow circle",
    },
    zeroRendering: "static-pattern-with-one-overlays",
    clearStrategy: "canvas-color-text-rectangles",
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
    minFontSize: AGENT_MIN_FONT,
    defaultTextColor: DEFAULT_AGENT_TEXT,
    clearArea: AGENT_CLEAR_AREA,
    text: {
      x: AGENT_X,
      y: AGENT_Y,
      textAnchor: "middle",
      dominantBaseline: "middle",
    },
    overflow: "textLength-spacingAndGlyphs",
  },
  promptLine: {
    targetWidth: PROMPT_TARGET_WIDTH,
    defaultFontSize: PROMPT_BASE_FONT,
    minFontSize: PROMPT_MIN_FONT,
    defaultTextColor: DEFAULT_PROMPT_TEXT,
    clearArea: PROMPT_CLEAR_AREA,
    text: {
      x: PROMPT_X,
      y: PROMPT_Y,
      textAnchor: "middle",
      dominantBaseline: "middle",
    },
    overflow: "textLength-spacingAndGlyphs",
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
  kind: ThoughtV2LineKind,
  displayUnits: number,
  targetWidth: number,
  baseFont: number,
  minFont: number,
): { size: number; squeezed: boolean } => {
  const fit = Math.floor((targetWidth * 10) / displayUnits);
  if (fit >= baseFont) return { size: baseFont, squeezed: false };
  if (fit < minFont) throw new Error(`${kind} line cannot fit the formal renderer`);
  return { size: fit, squeezed: true };
};

const binaryBytesOf = (value: string): string[] =>
  Array.from(encoder.encode(value)).map((byte) => byte.toString(2).padStart(8, "0"));

const binaryBitStreamOf = (promptLine: string, agentLine: string): string =>
  [...binaryBytesOf(promptLine), ...binaryBytesOf(agentLine)].join("");

export const fixedBinaryFieldOf = (promptLine: string, agentLine: string): string => {
  const sourceBits = binaryBitStreamOf(promptLine, agentLine);
  if (sourceBits.length === 0) return "";
  if (sourceBits.length >= BINARY_BG_CAPACITY) return sourceBits.slice(0, BINARY_BG_CAPACITY);

  let fixedBits = "";
  while (fixedBits.length < BINARY_BG_CAPACITY) fixedBits += sourceBits;
  return fixedBits.slice(0, BINARY_BG_CAPACITY);
};

type BinaryCell = { cx: number; cy: number };

const binaryBackground = (promptLine: string, agentLine: string): string => {
  const sourceBits = binaryBitStreamOf(promptLine, agentLine);
  const fixedBits = fixedBinaryFieldOf(promptLine, agentLine);
  if (fixedBits.length === 0) return "";

  const cellSize = Math.max(1, Math.floor(Math.min(BINARY_BG_WIDTH / BINARY_BG_SIDE, BINARY_BG_HEIGHT / BINARY_BG_SIDE)));
  const originX = BINARY_BG_X + Math.floor((BINARY_BG_WIDTH - BINARY_BG_SIDE * cellSize) / 2);
  const originY = BINARY_BG_Y + Math.floor((BINARY_BG_HEIGHT - BINARY_BG_SIDE * cellSize) / 2);
  const radius = Math.ceil(cellSize * BINARY_BG_DOT_RADIUS_RATIO);
  const oneCells: BinaryCell[] = [];
  let renderedCellCount = 0;

  for (let bitIndex = 0; bitIndex < fixedBits.length; bitIndex += 1) {
    const column = bitIndex % BINARY_BG_SIDE;
    const row = Math.floor(bitIndex / BINARY_BG_SIDE);
    const cx = originX + column * cellSize + Math.floor(cellSize / 2);
    const cy = originY + row * cellSize + Math.floor(cellSize / 2);
    if (isInClearArea(cx, cy)) continue;
    renderedCellCount += 1;
    if (fixedBits[bitIndex] === "1") oneCells.push({ cx, cy });
  }
  const zeroCellCount = renderedCellCount - oneCells.length;

  return [
    `<g id="binary-background" opacity="${BINARY_BG_OPACITY_ATTR}" fill="${BINARY_BG_FILL}" aria-label="UTF-8 binary background: prompt line bytes then agent line bytes; filled green circles are one bits and hollow green circles are zero bits" data-grid-columns="${BINARY_BG_SIDE}" data-grid-rows="${BINARY_BG_SIDE}" data-bit-capacity="${BINARY_BG_CAPACITY}" data-rendered-cells="${renderedCellCount}" data-cleared-cells="${fixedBits.length - renderedCellCount}" data-one-cells="${oneCells.length}" data-zero-cells="${zeroCellCount}" data-source-bit-count="${sourceBits.length}" data-fill-rule="repeat-short-truncate-long" data-cell-size="${cellSize}" data-origin-x="${originX}" data-origin-y="${originY}" data-dot-radius="${radius}" data-zero="hollow-circle">`,
    `  <defs>`,
    `    <circle id="binary-one" r="${radius}" fill="${BINARY_BG_FILL}"/>`,
    `    <pattern id="binary-zero-pattern" x="${originX}" y="${originY}" width="${cellSize}" height="${cellSize}" patternUnits="userSpaceOnUse">`,
    `      <circle id="binary-zero" cx="${Math.floor(cellSize / 2)}" cy="${Math.floor(cellSize / 2)}" r="${radius}" fill="none" stroke="${BINARY_BG_FILL}" stroke-width="1"/>`,
    `    </pattern>`,
    `  </defs>`,
    `  <rect id="binary-zero-field" x="${originX}" y="${originY}" width="${BINARY_BG_SIDE * cellSize}" height="${BINARY_BG_SIDE * cellSize}" fill="url(#binary-zero-pattern)"/>`,
    `  <rect id="agent-text-clear" x="${AGENT_CLEAR_AREA.x}" y="${AGENT_CLEAR_AREA.y}" width="${AGENT_CLEAR_AREA.width}" height="${AGENT_CLEAR_AREA.height}" fill="${DEFAULT_CANVAS_BG}"/>`,
    `  <rect id="prompt-text-clear" x="${PROMPT_CLEAR_AREA.x}" y="${PROMPT_CLEAR_AREA.y}" width="${PROMPT_CLEAR_AREA.width}" height="${PROMPT_CLEAR_AREA.height}" fill="${DEFAULT_CANVAS_BG}"/>`,
    ...oneCells.map((cell) => `  <use href="#binary-one" x="${cell.cx}" y="${cell.cy}"/>`),
    `</g>`,
  ].join("\n");
};

const isInClearArea = (x: number, y: number): boolean =>
  isInsideRect(x, y, AGENT_CLEAR_AREA) || isInsideRect(x, y, PROMPT_CLEAR_AREA);

const isInsideRect = (
  x: number,
  y: number,
  rect: { x: number; y: number; width: number; height: number },
): boolean => x >= rect.x && x <= rect.x + rect.width && y >= rect.y && y <= rect.y + rect.height;

const staticTextLine = (
  x: number,
  y: number,
  targetWidth: number,
  font: { size: number; squeezed: boolean },
  fill: string,
  value: string,
): string =>
  `<text x="${x}" y="${y}" text-anchor="middle" dominant-baseline="middle" font-family="${FONT_STACK}" font-size="${font.size}" fill="${fill}"${
    font.squeezed ? ` textLength="${targetWidth}" lengthAdjust="spacingAndGlyphs"` : ""
  }>${escapeXml(value)}</text>`;

export const buildThoughtV2Svg = ({ promptLine, agentLine }: ThoughtV2SvgInput): string => {
  const promptMeasure = measureThoughtV2Line(promptLine, "prompt");
  const agentMeasure = measureThoughtV2Line(agentLine, "agent");
  const errors = [...promptMeasure.errors, ...agentMeasure.errors];
  if (errors.length > 0) throw new Error(errors.join("; "));

  const agentFont = fontSize("agent", agentMeasure.displayUnits, AGENT_TARGET_WIDTH, AGENT_BASE_FONT, AGENT_MIN_FONT);
  const promptFont = fontSize("prompt", promptMeasure.displayUnits, PROMPT_TARGET_WIDTH, PROMPT_BASE_FONT, PROMPT_MIN_FONT);

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${SVG_WIDTH}" height="${SVG_HEIGHT}" viewBox="0 0 ${SVG_WIDTH} ${SVG_HEIGHT}">`,
    `  <rect id="canvas-bg" width="${SVG_WIDTH}" height="${SVG_HEIGHT}" fill="${DEFAULT_CANVAS_BG}"/>`,
    binaryBackground(promptLine, agentLine),
    `  ${staticTextLine(AGENT_X, AGENT_Y, AGENT_TARGET_WIDTH, agentFont, DEFAULT_AGENT_TEXT, agentLine)}`,
    `  ${staticTextLine(PROMPT_X, PROMPT_Y, PROMPT_TARGET_WIDTH, promptFont, DEFAULT_PROMPT_TEXT, promptLine)}`,
    `</svg>`,
  ].join("\n");
};
