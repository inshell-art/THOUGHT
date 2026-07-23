export const THOUGHT_V2_FRAME_STUDY_CANVAS_SIZE = 960;
export const THOUGHT_V2_FRAME_STUDY_DEFAULT_WIDTH = 32;
export const THOUGHT_V2_FRAME_STUDY_MAX_WIDTH = 128;
export const THOUGHT_V2_FRAME_STUDY_DEFAULT_COLOR = "#404040";

export type ThoughtV2FrameStudyGeometry = {
  artboardSize: number;
  canvasSize: typeof THOUGHT_V2_FRAME_STUDY_CANVAS_SIZE;
  canvasTransform: string;
  frameWidth: number;
};

const clampFrameWidth = (value: number): number => {
  if (!Number.isFinite(value)) return THOUGHT_V2_FRAME_STUDY_DEFAULT_WIDTH;
  return Math.min(
    THOUGHT_V2_FRAME_STUDY_MAX_WIDTH,
    Math.max(0, Math.round(value)),
  );
};

export const normalizeThoughtV2FrameColor = (value: string): string => {
  const normalized = value.trim().toLowerCase();
  if (!/^#[0-9a-f]{6}$/.test(normalized)) {
    throw new Error("THOUGHT frame color must be a six-digit hex color");
  }
  return normalized;
};

export const thoughtV2FrameStudyGeometry = (
  requestedWidth: number,
): ThoughtV2FrameStudyGeometry => {
  const frameWidth = clampFrameWidth(requestedWidth);
  return {
    artboardSize: THOUGHT_V2_FRAME_STUDY_CANVAS_SIZE + (frameWidth * 2),
    canvasSize: THOUGHT_V2_FRAME_STUDY_CANVAS_SIZE,
    canvasTransform: `translate(${frameWidth} ${frameWidth})`,
    frameWidth,
  };
};

const replaceSvgAttribute = (
  openTag: string,
  name: string,
  value: string,
): string => {
  const pattern = new RegExp(`\\s${name}="[^"]*"`);
  if (pattern.test(openTag)) return openTag.replace(pattern, ` ${name}="${value}"`);
  return openTag.replace(/>$/, ` ${name}="${value}">`);
};

const removeExistingWorkFrame = (value: string): string =>
  value.replace(/[\t ]*<rect\b(?=[^>]*\bid="work-frame")[^>]*\/>\s*/g, "");

export const renderThoughtV2OuterFrameStudySvg = (
  sourceSvg: string,
  requestedWidth: number,
  requestedColor: string,
): string => {
  const geometry = thoughtV2FrameStudyGeometry(requestedWidth);
  const color = normalizeThoughtV2FrameColor(requestedColor);
  const rootMatch = sourceSvg.match(/<svg\b[^>]*>/);
  const closingIndex = sourceSvg.lastIndexOf("</svg>");
  if (!rootMatch || rootMatch.index === undefined || closingIndex < 0) {
    throw new Error("THOUGHT frame study requires a complete SVG source");
  }

  let root = rootMatch[0];
  root = replaceSvgAttribute(root, "viewBox", `0 0 ${geometry.artboardSize} ${geometry.artboardSize}`);
  root = replaceSvgAttribute(root, "width", String(geometry.artboardSize));
  root = replaceSvgAttribute(root, "height", String(geometry.artboardSize));
  root = replaceSvgAttribute(root, "data-frame-study", "outer-canvas");
  root = replaceSvgAttribute(root, "data-frame-width", String(geometry.frameWidth));
  root = replaceSvgAttribute(root, "data-canvas-size", String(geometry.canvasSize));

  const beforeRoot = sourceSvg.slice(0, rootMatch.index);
  const body = sourceSvg.slice(rootMatch.index + rootMatch[0].length, closingIndex);
  const afterRoot = sourceSvg.slice(closingIndex + "</svg>".length);
  const groupMatch = body.match(/<g\b(?=[^>]*\bid="work-canvas")[^>]*>/);
  if (!groupMatch || groupMatch.index === undefined) {
    throw new Error("THOUGHT frame study source is missing #work-canvas");
  }
  const groupCloseIndex = body.lastIndexOf("</g>");
  if (groupCloseIndex < groupMatch.index + groupMatch[0].length) {
    throw new Error("THOUGHT frame study source has an incomplete #work-canvas");
  }

  const prefix = removeExistingWorkFrame(body.slice(0, groupMatch.index));
  const canvasContents = body.slice(
    groupMatch.index + groupMatch[0].length,
    groupCloseIndex,
  );
  const suffix = body.slice(groupCloseIndex + "</g>".length);
  const rebuiltBody = `${prefix}
  <rect id="work-frame" width="${geometry.artboardSize}" height="${geometry.artboardSize}" fill="${color}"/>
  <g id="work-canvas" transform="${geometry.canvasTransform}">
${canvasContents}
  </g>${suffix}`;

  return `${beforeRoot}${root}${rebuiltBody}</svg>${afterRoot}`;
};

const srgbChannelToLinear = (channel: number): number => {
  const encoded = channel / 255;
  return encoded <= 0.04045
    ? encoded / 12.92
    : ((encoded + 0.055) / 1.055) ** 2.4;
};

export const thoughtV2FrameContrastOnBlack = (color: string): number => {
  const normalized = normalizeThoughtV2FrameColor(color);
  const red = Number.parseInt(normalized.slice(1, 3), 16);
  const green = Number.parseInt(normalized.slice(3, 5), 16);
  const blue = Number.parseInt(normalized.slice(5, 7), 16);
  const luminance =
    (0.2126 * srgbChannelToLinear(red))
    + (0.7152 * srgbChannelToLinear(green))
    + (0.0722 * srgbChannelToLinear(blue));
  return (luminance + 0.05) / 0.05;
};
