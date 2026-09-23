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

let manifestPromise;

export const loadThirdSetManifest = () => {
  manifestPromise ??= readJsonUrl(new URL("./manifest.json", import.meta.url));
  return manifestPromise;
};

export const listThirdSetFonts = async () => {
  const manifest = await loadThirdSetManifest();
  return manifest.fonts.map((font) => ({ ...font }));
};

export const loadThirdSetFont = async (slug) => {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    throw new Error(`invalid Third Set slug: ${slug}`);
  }
  const manifest = await loadThirdSetManifest();
  const record = manifest.fonts.find((font) => font.slug === slug);
  if (!record) throw new Error(`unknown Third Set font: ${slug}`);
  const font = await readJsonUrl(new URL(record.file, import.meta.url));
  if (font.family?.slug !== slug) {
    throw new Error(`${slug} font payload has a mismatched family slug`);
  }
  if (font.family?.id !== record.familyId) {
    throw new Error(`${slug} font payload has a mismatched Third Set family ID`);
  }
  if (font.family?.classification !== "conventional-outline"
    || (record.classification
      && font.family.classification !== record.classification)) {
    throw new Error(`${slug} font payload has a mismatched classification`);
  }
  if (font.librarySet?.id !== manifest.id
    || font.librarySet?.memberId !== record.memberId) {
    throw new Error(`${slug} font payload has a mismatched Third Set member ID`);
  }
  if (font.librarySet?.qualificationStatus
    !== "declared-with-metric-exception") {
    throw new Error(`${slug} font payload omits its metric exception`);
  }
  if (font.family?.review?.visual !== "pass"
    || font.family?.review?.metricContract !== "hold") {
    throw new Error(`${slug} font payload has a mismatched review declaration`);
  }
  return font;
};

export const loadAllThirdSetFonts = async () => {
  const records = await listThirdSetFonts();
  return Promise.all(records.map(async (record) => ({
    record: { ...record },
    font: await loadThirdSetFont(record.slug)
  })));
};

export const renderThirdSetLine = (
  font,
  text,
  {
    fill = "#00ba00",
    title = text,
    width = null,
    height = null
  } = {}
) => {
  if (!font || !Array.isArray(font.glyphs) || !font.metrics) {
    throw new Error("a Third Set glyph manifest is required");
  }
  if (typeof text !== "string") throw new Error("text must be a string");
  const glyphs = new Map(font.glyphs.map((glyph) => [glyph.character, glyph]));
  const advance = font.metrics.fixedAdvanceWidth;
  const emSquare = font.metrics.emSquare;
  const paths = [];
  let cursor = 0;
  for (const character of text) {
    const glyph = glyphs.get(character);
    if (!glyph) {
      const codepoint = character.codePointAt(0)
        .toString(16)
        .toUpperCase()
        .padStart(4, "0");
      throw new Error(`unsupported Third Set character U+${codepoint}`);
    }
    if (glyph.d) {
      paths.push(
        `<path d="${glyph.d}" transform="translate(${cursor} 0)" fill-rule="${font.metrics.fillRule}"/>`
      );
    }
    cursor += advance;
  }
  const viewWidth = Math.max(advance, cursor);
  const widthAttribute = width === null ? "" : ` width="${escapeXml(width)}"`;
  const heightAttribute = height === null ? "" : ` height="${escapeXml(height)}"`;
  const titleElement = title === null ? "" : `<title>${escapeXml(title)}</title>`;
  const set = font.librarySet;
  const metadata = set
    ? `<metadata data-library-set-id="${escapeXml(set.id)}" data-library-set-name="${escapeXml(set.name)}" data-library-member-id="${escapeXml(set.memberId)}" data-library-set-version="${set.version}" data-qualification-status="${escapeXml(set.qualificationStatus)}" data-metric-contract="${escapeXml(font.family?.review?.metricContract ?? "hold")}"/>`
    : "";
  return `<svg xmlns="http://www.w3.org/2000/svg"${widthAttribute}${heightAttribute} viewBox="0 0 ${viewWidth} ${emSquare}" role="img" aria-label="${escapeXml(text)}">${titleElement}${metadata}<g fill="${escapeXml(fill)}">${paths.join("")}</g></svg>\n`;
};

export const renderAllThirdSetLines = async (text, options = {}) => {
  const entries = await loadAllThirdSetFonts();
  return entries.map(({ record, font }) => ({
    slug: record.slug,
    name: record.name,
    memberId: record.memberId,
    classification: record.classification ?? "conventional-outline",
    svg: renderThirdSetLine(font, text, options)
  }));
};
