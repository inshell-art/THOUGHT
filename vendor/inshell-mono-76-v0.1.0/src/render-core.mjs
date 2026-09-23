const DEFAULT_LINE_BOX = Object.freeze({
  top: 760,
  bottom: -240,
  height: 1000
});

const escapeAttribute = (value) =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");

const number = (value) => {
  if (!Number.isFinite(value)) {
    throw new TypeError("SVG dimensions must be finite numbers");
  }
  const rounded = Math.round((value + Number.EPSILON) * 1_000_000) / 1_000_000;
  return String(Object.is(rounded, -0) ? 0 : rounded);
};

export const assertFace = (face) => {
  if (
    !face
    || face.schema !== "inshell.mono-76.face.v1"
    || face.canonicalOrder?.length !== 76
    || face.glyphs?.length !== 76
    || face.metrics?.unitsPerEm !== 1000
    || face.metrics?.fixedAdvanceWidth !== 600
  ) {
    throw new TypeError("expected an Inshell Mono 76 face payload");
  }
  return face;
};

export const unsupportedCharacters = (face, text) => {
  assertFace(face);
  const supported = new Set([...face.canonicalOrder]);
  return [...new Set(
    [...String(text)].filter((character) => !supported.has(character))
  )];
};

export const assertSupportedText = (face, text) => {
  const unsupported = unsupportedCharacters(face, text);
  if (unsupported.length > 0) {
    const labels = unsupported.map((character) => {
      const codepoint = character.codePointAt(0).toString(16).toUpperCase();
      return `${JSON.stringify(character)} (U+${codepoint.padStart(4, "0")})`;
    });
    throw new RangeError(
      `Inshell Mono 76 does not contain: ${labels.join(", ")}`
    );
  }
  return String(text);
};

export const renderNativeLine = (
  face,
  text,
  {
    fontSize = 100,
    letterSpacing = 0,
    padding = 0,
    fill = "#007a18",
    fills = null,
    background = null,
    ariaLabel = text,
    lineBox = DEFAULT_LINE_BOX,
    className = null
  } = {}
) => {
  assertFace(face);
  const value = assertSupportedText(face, text);
  if (fontSize <= 0 || padding < 0) {
    throw new RangeError("fontSize must be positive and padding non-negative");
  }
  if (
    lineBox.height !== lineBox.top - lineBox.bottom
    || lineBox.height <= 0
  ) {
    throw new RangeError("lineBox must have a positive coherent height");
  }

  const characters = [...value];
  if (fills !== null && fills.length !== characters.length) {
    throw new RangeError("fills must contain one entry per character");
  }
  const glyphs = new Map(face.glyphs.map((glyph) => [glyph.character, glyph]));
  const scale = fontSize / face.metrics.unitsPerEm;
  const advance = face.metrics.fixedAdvanceWidth * scale;
  const contentWidth = characters.length === 0
    ? 0
    : characters.length * advance
      + Math.max(0, characters.length - 1) * letterSpacing;
  const width = contentWidth + padding * 2;
  const height = lineBox.height * scale + padding * 2;
  const baseline = padding + lineBox.top * scale;

  const paths = [];
  let x = padding;
  for (const [index, character] of characters.entries()) {
    const glyph = glyphs.get(character);
    if (glyph.d) {
      const glyphFill = fills?.[index] ?? fill;
      paths.push(
        `<path d="${glyph.d}" fill="${escapeAttribute(glyphFill)}" transform="translate(${number(x)} ${number(baseline)}) scale(${number(scale)} ${number(-scale)})"/>`
      );
    }
    x += advance + letterSpacing;
  }

  const classAttribute = className
    ? ` class="${escapeAttribute(className)}"`
    : "";
  const backgroundRect = background === null
    ? ""
    : `<rect width="${number(width)}" height="${number(height)}" fill="${escapeAttribute(background)}"/>`;

  return [
    `<svg xmlns="http://www.w3.org/2000/svg"${classAttribute} viewBox="0 0 ${number(width)} ${number(height)}" width="${number(width)}" height="${number(height)}" role="img" aria-label="${escapeAttribute(ariaLabel)}" data-family="Inshell Mono 76" data-weight="${face.weight}">`,
    backgroundRect,
    `<g fill-rule="${face.metrics.fillRule}">${paths.join("")}</g>`,
    "</svg>"
  ].join("");
};

export { DEFAULT_LINE_BOX };
