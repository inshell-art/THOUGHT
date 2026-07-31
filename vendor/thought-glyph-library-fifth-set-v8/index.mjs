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

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
let manifestPromise;

export const FIFTH_SET_ID = "inshell.thought.glyph-library.set-05";
export const FIFTH_SET_NAME = "THOUGHT Glyph Library — Fifth Set";
export const FIFTH_SET_VERSION = 8;
export const FIFTH_SET_REPERTOIRE =
  " ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789.,?!:;'\"-()/&";
export const FIFTH_SET_FONT_SLUGS = Object.freeze([
  "classic-line",
  "classic-book",
  "classic-round",
  "classic-compact"
]);

export const loadFifthSetManifest = () => {
  manifestPromise ??= readJsonUrl(new URL("./manifest.json", import.meta.url));
  return manifestPromise;
};

export const listFifthSetFonts = async () => {
  const manifest = await loadFifthSetManifest();
  return manifest.fonts.map((font) => structuredClone(font));
};

const findRecord = async (slug) => {
  if (!slugPattern.test(String(slug))) {
    throw new TypeError(`invalid Fifth Set slug: ${slug}`);
  }
  const manifest = await loadFifthSetManifest();
  const record = manifest.fonts.find((font) => font.slug === slug);
  if (!record) throw new RangeError(`unknown Fifth Set font: ${slug}`);
  return record;
};

export const assertFifthSetFont = (font) => {
  if (
    !font
    || font.schema !== "inshell.thought.glyph-library.set-05.face.v1"
    || font.librarySet?.id !== FIFTH_SET_ID
    || font.librarySet?.version !== FIFTH_SET_VERSION
    || font.repertoire !== FIFTH_SET_REPERTOIRE
    || font.glyphs?.length !== 76
    || font.glyphs.map(({ character }) => character).join("")
      !== FIFTH_SET_REPERTOIRE
    || font.renderStyle?.fill !== "none"
  ) {
    throw new TypeError("invalid THOUGHT Glyph Library Fifth Set font");
  }
  return font;
};

export const loadFifthSetFont = async (slug) => {
  const record = await findRecord(slug);
  const font = assertFifthSetFont(
    await readJsonUrl(new URL(record.file, import.meta.url))
  );
  if (
    font.family?.slug !== record.slug
    || font.family?.id !== record.familyId
    || font.librarySet?.memberId !== record.memberId
  ) {
    throw new Error(`${slug} font payload differs from the Fifth Set index`);
  }
  return font;
};

export const loadAllFifthSetFonts = async () => {
  const records = await listFifthSetFonts();
  return Promise.all(records.map(async (record) => ({
    record,
    font: await loadFifthSetFont(record.slug)
  })));
};

export const loadFifthSetPacked = async (slug) => {
  const record = await findRecord(slug);
  return readBytesUrl(new URL(record.packed.binary, import.meta.url));
};

export const unsupportedFifthSetCharacters = (font, text) => {
  assertFifthSetFont(font);
  if (typeof text !== "string") throw new TypeError("text must be a string");
  const supported = new Set(font.glyphs.map(({ character }) => character));
  return [...new Set([...text].filter((character) => !supported.has(character)))];
};

export const supportsFifthSetText = (font, text) =>
  unsupportedFifthSetCharacters(font, text).length === 0;

export const assertFifthSetText = (font, text) => {
  const unsupported = unsupportedFifthSetCharacters(font, text);
  if (unsupported.length > 0) {
    const labels = unsupported.map((character) =>
      `U+${character.codePointAt(0).toString(16).toUpperCase().padStart(4, "0")}`
    );
    throw new RangeError(
      `unsupported Fifth Set character${labels.length === 1 ? "" : "s"}: ${labels.join(", ")}`
    );
  }
  return text;
};

export const renderFifthSetLine = (
  font,
  text,
  {
    background = null,
    className = "",
    height = null,
    padding = 2,
    stroke = "#00ff35",
    strokes = null,
    title = text,
    width = null
  } = {}
) => {
  assertFifthSetFont(font);
  assertFifthSetText(font, text);
  if (!Number.isFinite(padding) || padding < 0) {
    throw new RangeError("padding must be a non-negative finite number");
  }

  const characters = [...text];
  if (strokes !== null && strokes.length !== characters.length) {
    throw new RangeError("strokes must contain one color per character");
  }
  const glyphs = new Map(font.glyphs.map((glyph) => [glyph.character, glyph]));
  const advance = font.metrics.fixedAdvanceWidth;
  const viewHeight = font.metrics.svgViewBoxHeight;
  const baselineY = font.metrics.svgBaselineY;
  const viewWidth = Math.max(1, characters.length * advance + padding * 2);
  const paths = characters.map((character, index) => {
    const glyph = glyphs.get(character);
    if (!glyph.d) return "";
    const color = strokes?.[index] ?? stroke;
    const x = padding + index * advance;
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
  const set = font.librarySet;
  return `<svg xmlns="http://www.w3.org/2000/svg"${classAttribute}${widthAttribute}${heightAttribute} viewBox="0 0 ${viewWidth} ${viewHeight}" role="img" aria-label="${escapeXml(text)}" data-library-set-id="${escapeXml(set.id)}" data-library-member-id="${escapeXml(set.memberId)}" data-font-slug="${escapeXml(font.family.slug)}">${titleElement}${backgroundRect}<g fill="none" stroke-width="${style.strokeWidth}" stroke-linecap="${style.strokeLinecap}" stroke-linejoin="${style.strokeLinejoin}">${paths}</g></svg>\n`;
};

export const renderAllFifthSetLines = async (text, options = {}) => {
  const entries = await loadAllFifthSetFonts();
  return entries.map(({ record, font }) => ({
    familyId: record.familyId,
    memberId: record.memberId,
    name: record.name,
    slug: record.slug,
    sourceCandidate: record.sourceCandidate,
    svg: renderFifthSetLine(font, text, options)
  }));
};
