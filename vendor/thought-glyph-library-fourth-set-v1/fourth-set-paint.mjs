import {
  COLOR_FONT_V1_ENTRIES,
  resolveFourthSetColor
} from "./color-font-v1.mjs";

const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;

const assertHexColor = (value, label) => {
  if (typeof value !== "string" || !HEX_COLOR.test(value)) {
    throw new Error(`${label} must be a six-digit hex color`);
  }
  return value.toLowerCase();
};

const linearChannel = (channel) => {
  const value = channel / 255;
  return value <= 0.04045
    ? value / 12.92
    : ((value + 0.055) / 1.055) ** 2.4;
};

export const relativeLuminance = (hex) => {
  const normalized = assertHexColor(hex, "color");
  const red = Number.parseInt(normalized.slice(1, 3), 16);
  const green = Number.parseInt(normalized.slice(3, 5), 16);
  const blue = Number.parseInt(normalized.slice(5, 7), 16);
  return (
    0.2126 * linearChannel(red)
    + 0.7152 * linearChannel(green)
    + 0.0722 * linearChannel(blue)
  );
};

export const contrastRatio = (foreground, background) => {
  const foregroundLuminance = relativeLuminance(foreground);
  const backgroundLuminance = relativeLuminance(background);
  const light = Math.max(foregroundLuminance, backgroundLuminance);
  const dark = Math.min(foregroundLuminance, backgroundLuminance);
  return (light + 0.05) / (dark + 0.05);
};

export const FOURTH_SET_TIGHT_PROFILE = Object.freeze({
  id: "tight-v1",
  label: "Tight",
  glyphScale: 0.96,
  tileWidth: 6.5,
  tileHeight: 8,
  tileGap: 0.2,
  edgeStyle: "square",
  cornerRadius: 0.15,
  effectiveCornerRadius: 0,
  advanceWidth: 6.5,
  spaceAdvanceWidth: 6.5,
  monospaced: true,
  foregroundCandidates: Object.freeze(["#000000", "#ffffff"]),
  foregroundRule: "higher WCAG 2.x contrast; exact ties choose black",
  blackLuminanceCutoff: 0.1791287847,
  whiteForegroundLetters: "BCGIMNTU",
  blackForegroundLetters: "ADEFHJKLOPQRSVWXYZ",
  minimumChosenContrast: 4.7734,
  outlineRequired: false
});

export const FOURTH_SET_TILE_PROFILES = Object.freeze([
  FOURTH_SET_TIGHT_PROFILE
]);

// Kept as an API alias for consumers of the preliminary study bundle.
export const FOURTH_SET_PAINT_PROFILES = FOURTH_SET_TILE_PROFILES;

export const getFourthSetTileProfile = (profileOrId = "tight-v1") => {
  const id = typeof profileOrId === "string" ? profileOrId : profileOrId?.id;
  const profile = FOURTH_SET_TILE_PROFILES.find((entry) => entry.id === id);
  if (!profile) throw new Error(`unknown Set 4 tile profile: ${String(id)}`);
  return profile;
};

export const getFourthSetPaintProfile = getFourthSetTileProfile;

export const maximumContrastForeground = (background) => {
  const normalized = assertHexColor(background, "background");
  const blackContrast = contrastRatio("#000000", normalized);
  const whiteContrast = contrastRatio("#ffffff", normalized);
  const foreground = blackContrast >= whiteContrast ? "#000000" : "#ffffff";
  return {
    background: normalized,
    foreground,
    blackContrast,
    whiteContrast,
    chosenContrast:
      foreground === "#000000" ? blackContrast : whiteContrast
  };
};

export const resolveFourthSetTilePaint = (
  character,
  { tileProfile = "tight-v1" } = {}
) => {
  const profile = getFourthSetTileProfile(tileProfile);
  const color = resolveFourthSetColor(character);
  if (color.resolution === "metrics-only-space") {
    return {
      ...color,
      tileProfile: profile.id,
      background: null,
      foreground: null,
      blackContrast: null,
      whiteContrast: null,
      chosenContrast: null,
      drawsTile: false,
      drawsGlyph: false,
      outlined: false
    };
  }
  const contrast = maximumContrastForeground(color.backgroundHex);
  return {
    ...color,
    tileProfile: profile.id,
    ...contrast,
    drawsTile: true,
    drawsGlyph: true,
    outlined: false
  };
};

export const resolveFourthSetPaint = resolveFourthSetTilePaint;

const computedWhiteLetters = COLOR_FONT_V1_ENTRIES
  .filter((entry) =>
    maximumContrastForeground(entry.hex).foreground === "#ffffff"
  )
  .map((entry) => entry.letter)
  .join("");
const computedBlackLetters = COLOR_FONT_V1_ENTRIES
  .filter((entry) =>
    maximumContrastForeground(entry.hex).foreground === "#000000"
  )
  .map((entry) => entry.letter)
  .join("");
const computedMinimum = Math.min(
  ...COLOR_FONT_V1_ENTRIES.map(
    (entry) => maximumContrastForeground(entry.hex).chosenContrast
  )
);

if (
  computedWhiteLetters !== FOURTH_SET_TIGHT_PROFILE.whiteForegroundLetters
  || computedBlackLetters !== FOURTH_SET_TIGHT_PROFILE.blackForegroundLetters
) {
  throw new Error("Set 4 black/white foreground groups differ");
}
if (
  Math.abs(computedMinimum - FOURTH_SET_TIGHT_PROFILE.minimumChosenContrast)
  > 0.0001
) {
  throw new Error("Set 4 minimum foreground contrast differs");
}
