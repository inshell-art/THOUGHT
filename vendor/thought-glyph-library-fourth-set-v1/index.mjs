import {
  COLOR_FONT_V1,
  COLOR_FONT_V1_ENTRIES,
  COLOR_FONT_V1_TEXT,
  FOURTH_SET_COLOR_POLICY,
  FOURTH_SET_COLOR_REPERTOIRE,
  FOURTH_SET_NONLETTER_REPERTOIRE,
  backgroundForCharacter,
  colorForCharacter,
  getColorFontV1Entry,
  resolveFourthSetColor
} from "./color-font-v1.mjs";
import {
  FOURTH_SET_PAINT_PROFILES,
  FOURTH_SET_TILE_PROFILES,
  FOURTH_SET_TIGHT_PROFILE,
  contrastRatio,
  getFourthSetPaintProfile,
  getFourthSetTileProfile,
  maximumContrastForeground,
  relativeLuminance,
  resolveFourthSetPaint,
  resolveFourthSetTilePaint
} from "./fourth-set-paint.mjs";

export {
  COLOR_FONT_V1,
  COLOR_FONT_V1_ENTRIES,
  COLOR_FONT_V1_TEXT,
  FOURTH_SET_COLOR_POLICY,
  FOURTH_SET_COLOR_REPERTOIRE,
  FOURTH_SET_NONLETTER_REPERTOIRE,
  FOURTH_SET_PAINT_PROFILES,
  FOURTH_SET_TILE_PROFILES,
  FOURTH_SET_TIGHT_PROFILE,
  backgroundForCharacter,
  colorForCharacter,
  contrastRatio,
  getColorFontV1Entry,
  getFourthSetPaintProfile,
  getFourthSetTileProfile,
  maximumContrastForeground,
  relativeLuminance,
  resolveFourthSetColor,
  resolveFourthSetPaint,
  resolveFourthSetTilePaint
};

const readJsonUrl = async (url) => {
  if (url.protocol === "file:") {
    const { readFile } = await import("node:fs/promises");
    return JSON.parse(await readFile(url, "utf8"));
  }
  const response = await fetch(url);
  if (!response.ok) throw new Error(`failed to load ${url}: ${response.status}`);
  return response.json();
};

const escapeXml = (value) =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");

const formatNumber = (value, precision = 6) =>
  Number(value.toFixed(precision)).toString();

const matrixText = (matrix) =>
  `matrix(${matrix.map((value) => formatNumber(value)).join(" ")})`;

let manifestPromise;

export const loadFourthSetManifest = () => {
  manifestPromise ??= readJsonUrl(new URL("./manifest.json", import.meta.url));
  return manifestPromise;
};

export const loadColorFontV1 = () => ({
  ...COLOR_FONT_V1,
  policy: { ...FOURTH_SET_COLOR_POLICY },
  entries: COLOR_FONT_V1_ENTRIES.map((entry) => ({ ...entry }))
});

export const listFourthSetTileProfiles = () =>
  FOURTH_SET_TILE_PROFILES.map((profile) => ({
    ...profile,
    foregroundCandidates: [...profile.foregroundCandidates]
  }));

export const listFourthSetPaintProfiles = listFourthSetTileProfiles;

export const listFourthSetFonts = async ({ construction = null } = {}) => {
  const manifest = await loadFourthSetManifest();
  if (
    construction !== null
    && !manifest.constructionTypes.some((entry) => entry.id === construction)
  ) {
    throw new Error(`unknown Fourth Set construction: ${construction}`);
  }
  return manifest.fonts
    .filter((font) =>
      construction === null || font.construction === construction
    )
    .map((font) => structuredClone(font));
};

export const loadFourthSetFont = async (slug) => {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    throw new Error(`invalid Fourth Set slug: ${slug}`);
  }
  const manifest = await loadFourthSetManifest();
  const record = manifest.fonts.find((font) => font.slug === slug);
  if (!record) throw new Error(`unknown Fourth Set font: ${slug}`);
  const font = await readJsonUrl(new URL(record.file, import.meta.url));
  if (font.family?.slug !== slug || font.family?.id !== record.familyId) {
    throw new Error(`${slug} font payload has a mismatched family identity`);
  }
  if (
    font.librarySet?.id !== manifest.id
    || font.librarySet?.memberId !== record.memberId
    || font.librarySet?.qualificationStatus !== manifest.qualificationStatus
  ) {
    throw new Error(`${slug} font payload has a mismatched Fourth Set identity`);
  }
  if (
    font.family?.construction?.approach !== record.construction
    || font.colorBinding?.paletteId !== COLOR_FONT_V1.id
    || font.colorBinding?.canonicalSha256 !== COLOR_FONT_V1.canonicalSha256
    || font.colorBinding?.paletteRole !== "tile-background"
    || font.tilePresentation?.profileId !== FOURTH_SET_TIGHT_PROFILE.id
    || font.tilePresentation?.monospaced !== true
  ) {
    throw new Error(`${slug} font payload has a mismatched tile binding`);
  }
  return font;
};

export const loadAllFourthSetFonts = async ({ construction = null } = {}) => {
  const records = await listFourthSetFonts({ construction });
  return Promise.all(records.map(async (record) => ({
    record: structuredClone(record),
    font: await loadFourthSetFont(record.slug)
  })));
};

const pathId = (font, character) =>
  `glyph-${font.family.slug}-${character.codePointAt(0)
    .toString(16)
    .toUpperCase()
    .padStart(4, "0")}`;

const normalizationFor = (font, character) => {
  const normalization = font.tilePresentation?.normalization;
  if (
    !normalization
    || !Array.isArray(normalization.ordinaryMatrix)
    || !Array.isArray(normalization.safeMatrix)
  ) {
    throw new Error("Fourth Set font is missing tile normalization");
  }
  return normalization.safeCharacters.includes(character)
    ? normalization.safeMatrix
    : normalization.ordinaryMatrix;
};

export const renderFourthSetLine = (
  font,
  text,
  {
    tileProfile = "tight-v1",
    title = text,
    width = null,
    height = null
  } = {}
) => {
  if (!font || !Array.isArray(font.glyphs) || !font.metrics) {
    throw new Error("a Fourth Set glyph manifest is required");
  }
  if (typeof text !== "string") throw new Error("text must be a string");
  if (
    font.colorBinding?.paletteId !== COLOR_FONT_V1.id
    || font.colorBinding?.canonicalSha256 !== COLOR_FONT_V1.canonicalSha256
    || font.colorBinding?.paletteRole !== "tile-background"
  ) {
    throw new Error("Fourth Set glyph manifest has a mismatched tile binding");
  }
  const profile = getFourthSetTileProfile(tileProfile);
  if (font.tilePresentation?.profileId !== profile.id) {
    throw new Error(
      `${font.family?.slug ?? "font"} does not support tile profile ${profile.id}`
    );
  }

  const glyphs = new Map(font.glyphs.map((glyph) => [glyph.character, glyph]));
  const definitions = new Map();
  const cells = [];
  let cursor = 0;
  let visibleCount = 0;
  let paletteTileCount = 0;
  let whiteTileCount = 0;
  let blackGlyphCount = 0;
  let whiteGlyphCount = 0;

  for (const character of text) {
    const glyph = glyphs.get(character);
    if (!glyph) {
      const codepoint = character.codePointAt(0)
        .toString(16)
        .toUpperCase()
        .padStart(4, "0");
      throw new Error(`unsupported Fourth Set character U+${codepoint}`);
    }
    if (!glyph.d) {
      cursor += profile.spaceAdvanceWidth;
      continue;
    }

    const id = pathId(font, character);
    if (!definitions.has(id)) {
      definitions.set(
        id,
        `<path id="${id}" d="${glyph.d}" fill-rule="${font.metrics.fillRule}"/>`
      );
    }
    const paint = resolveFourthSetTilePaint(character, {
      tileProfile: profile.id
    });
    const tileX = profile.tileGap / 2;
    const tileY = profile.tileGap / 2;
    const tileWidth = profile.tileWidth - profile.tileGap;
    const tileHeight = profile.tileHeight - profile.tileGap;
    const paletteAttributes = paint.paletteBacked
      ? ` data-palette-letter="${paint.resolvedLetter}" data-palette-index="${paint.index}" data-palette-alias="${escapeXml(paint.aliasTerm)}"`
      : "";
    const normalization = matrixText(normalizationFor(font, character));
    const outerTransform =
      `translate(${formatNumber(profile.tileWidth / 2)} 4) `
      + `scale(${formatNumber(profile.glyphScale)}) translate(-4 -4)`;
    cells.push(
      `<g class="tile-cell" transform="translate(${formatNumber(cursor)} 0)" data-character="${escapeXml(character)}" data-tile-profile="${profile.id}" data-color-resolution="${paint.resolution}"${paletteAttributes}><rect x="${formatNumber(tileX)}" y="${formatNumber(tileY)}" width="${formatNumber(tileWidth)}" height="${formatNumber(tileHeight)}" rx="${formatNumber(profile.effectiveCornerRadius)}" fill="${paint.background}" data-background="${paint.background}" data-edge-style="${profile.edgeStyle}"/><g class="normalized-glyph" transform="${outerTransform}"><use href="#${id}" transform="${normalization}" fill="${paint.foreground}" data-foreground="${paint.foreground}" data-contrast-ratio="${formatNumber(paint.chosenContrast, 4)}" data-normalization="${escapeXml(normalization)}"/></g></g>`
    );
    visibleCount += 1;
    if (paint.paletteBacked) paletteTileCount += 1;
    else whiteTileCount += 1;
    if (paint.foreground === "#000000") blackGlyphCount += 1;
    else whiteGlyphCount += 1;
    cursor += profile.advanceWidth;
  }

  const viewWidth = Math.max(profile.advanceWidth, cursor);
  const widthAttribute = width === null ? "" : ` width="${escapeXml(width)}"`;
  const heightAttribute = height === null ? "" : ` height="${escapeXml(height)}"`;
  const titleElement = title === null
    ? ""
    : `<title>${escapeXml(title)}</title>`;
  const metadata =
    `<metadata data-library-set-id="${escapeXml(font.librarySet.id)}" data-library-set-name="${escapeXml(font.librarySet.name)}" data-library-member-id="${escapeXml(font.librarySet.memberId)}" data-library-set-version="${font.librarySet.version}" data-qualification-status="${escapeXml(font.librarySet.qualificationStatus)}" data-color-font-id="${COLOR_FONT_V1.id}" data-color-font-sha256="${COLOR_FONT_V1.canonicalSha256}" data-color-font-status="${COLOR_FONT_V1.sourceStatus}" data-current-protocol-dependency="false" data-palette-role="tile-background" data-tile-profile="${profile.id}" data-edge-style="${profile.edgeStyle}" data-monospaced="true" data-advance-width="${formatNumber(profile.advanceWidth)}" data-visible-count="${visibleCount}" data-palette-tile-count="${paletteTileCount}" data-white-tile-count="${whiteTileCount}" data-black-glyph-count="${blackGlyphCount}" data-white-glyph-count="${whiteGlyphCount}"/>`;
  const defs = definitions.size
    ? `<defs>${[...definitions.values()].join("")}</defs>`
    : "";
  return `<svg xmlns="http://www.w3.org/2000/svg"${widthAttribute}${heightAttribute} viewBox="0 0 ${formatNumber(viewWidth)} ${formatNumber(profile.tileHeight)}" role="img" aria-label="${escapeXml(text)}">${titleElement}${metadata}${defs}<g class="tile-cells">${cells.join("")}</g></svg>\n`;
};

export const renderFourthSetGlyph = (font, character, options = {}) =>
  renderFourthSetLine(font, character, options);

export const renderAllFourthSetLines = async (text, options = {}) => {
  const entries = await loadAllFourthSetFonts({
    construction: options.construction ?? null
  });
  const renderOptions = { ...options };
  delete renderOptions.construction;
  return entries.map(({ record, font }) => ({
    slug: record.slug,
    name: record.name,
    memberId: record.memberId,
    construction: record.construction,
    svg: renderFourthSetLine(font, text, renderOptions)
  }));
};
