const readJsonUrl = async (url) => {
  if (url.protocol === "file:") {
    const { readFile } = await import("node:fs/promises");
    return JSON.parse(await readFile(url, "utf8"));
  }
  const response = await fetch(url);
  if (!response.ok) throw new Error(`failed to load ${url}: ${response.status}`);
  return response.json();
};

const readBytesUrl = async (url) => {
  if (url.protocol === "file:") {
    const { readFile } = await import("node:fs/promises");
    return new Uint8Array(await readFile(url));
  }
  const response = await fetch(url);
  if (!response.ok) throw new Error(`failed to load ${url}: ${response.status}`);
  return new Uint8Array(await response.arrayBuffer());
};

const escapeXml = (value) =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");

export const CLASSIC_BOOK_76_REPERTOIRE =
  " ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789.,?!:;'\"-()/&";
export const CLASSIC_BOOK_76_CANDIDATE_REVISION =
  "c02-current-study-v19-20260731";
export const CLASSIC_BOOK_76_DEFAULT_ORIGIN_SHIFT_X =
  1;
let fontPromise;

export const assertCurrentCandidateFont = (font) => {
  if (
    !font
    || font.schema !== "inshell.thought.glyph-library.classic-book-76.current-candidate.v1"
    || font.candidate?.revision !== CLASSIC_BOOK_76_CANDIDATE_REVISION
    || font.repertoire !== CLASSIC_BOOK_76_REPERTOIRE
    || font.glyphs?.length !== 76
    || font.glyphs.map(({ character }) => character).join("")
      !== CLASSIC_BOOK_76_REPERTOIRE
    || font.metrics?.fixedAdvanceWidth !== 10
    || font.renderStyle?.fill !== "none"
  ) {
    throw new TypeError("invalid Classic Book 76 current candidate");
  }
  return font;
};

export const loadCurrentCandidateFont = () => {
  fontPromise ??= readJsonUrl(new URL("./glyphs.json", import.meta.url))
    .then(assertCurrentCandidateFont);
  return fontPromise;
};

export const loadCurrentCandidatePacked = () =>
  readBytesUrl(new URL("./onchain/packed.bin", import.meta.url));

export const unsupportedCurrentCandidateCharacters = (font, text) => {
  assertCurrentCandidateFont(font);
  if (typeof text !== "string") throw new TypeError("text must be a string");
  const supported = new Set(font.glyphs.map(({ character }) => character));
  return [...new Set([...text].filter((character) => !supported.has(character)))];
};

export const supportsCurrentCandidateText = (font, text) =>
  unsupportedCurrentCandidateCharacters(font, text).length === 0;

export const renderCurrentCandidateLine = (
  font,
  text,
  {
    background = null,
    className = "",
    glyphOffsets = null,
    height = null,
    originShiftX = font.composition.defaultOriginShiftX,
    padding = 2,
    stroke = "#00ff35",
    strokes = null,
    title = text,
    width = null
  } = {}
) => {
  assertCurrentCandidateFont(font);
  const unsupported = unsupportedCurrentCandidateCharacters(font, text);
  if (unsupported.length > 0) {
    throw new RangeError(
      `unsupported Classic Book 76 characters: ${unsupported.join(" ")}`
    );
  }
  if (!Number.isFinite(padding) || padding < 0) {
    throw new RangeError("padding must be a non-negative finite number");
  }
  if (!Number.isFinite(originShiftX)) {
    throw new RangeError("originShiftX must be finite");
  }
  const characters = [...text];
  if (strokes !== null && strokes.length !== characters.length) {
    throw new RangeError("strokes must contain one color per character");
  }
  const offsets = glyphOffsets ?? {};
  const glyphs = new Map(font.glyphs.map((glyph) => [glyph.character, glyph]));
  const advance = font.metrics.fixedAdvanceWidth;
  const viewHeight = font.metrics.svgViewBoxHeight;
  const baselineY = font.metrics.svgBaselineY;
  const viewWidth = Math.max(1, characters.length * advance + padding * 2);
  const paths = characters.map((character, index) => {
    const glyph = glyphs.get(character);
    if (!glyph.d) return "";
    const offset = Number(offsets[character] ?? 0);
    if (!Number.isFinite(offset)) {
      throw new RangeError(`invalid glyph offset for ${character}`);
    }
    const color = strokes?.[index] ?? stroke;
    const x = padding + originShiftX + index * advance + offset;
    return `<path d="${glyph.d}" stroke="${escapeXml(color)}" transform="translate(${x} ${baselineY}) scale(1 -1)"/>`;
  }).join("");
  const backgroundRect = background === null
    ? ""
    : `<rect width="${viewWidth}" height="${viewHeight}" fill="${escapeXml(background)}"/>`;
  const titleElement = title === null ? "" : `<title>${escapeXml(title)}</title>`;
  const classAttribute = className
    ? ` class="${escapeXml(className)}"`
    : "";
  const widthAttribute = width === null ? "" : ` width="${escapeXml(width)}"`;
  const heightAttribute =
    height === null ? "" : ` height="${escapeXml(height)}"`;
  const style = font.renderStyle;
  return `<svg xmlns="http://www.w3.org/2000/svg"${classAttribute}${widthAttribute}${heightAttribute} viewBox="0 0 ${viewWidth} ${viewHeight}" role="img" aria-label="${escapeXml(text)}" data-candidate-revision="${CLASSIC_BOOK_76_CANDIDATE_REVISION}">${titleElement}${backgroundRect}<g fill="none" stroke-width="${style.strokeWidth}" stroke-linecap="${style.strokeLinecap}" stroke-linejoin="${style.strokeLinejoin}">${paths}</g></svg>\n`;
};
