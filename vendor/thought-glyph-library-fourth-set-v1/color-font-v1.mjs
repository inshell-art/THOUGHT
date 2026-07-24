export const COLOR_FONT_V1 = Object.freeze({
  id: "inshell.colorfont.v1",
  version: "1",
  format: "LETTER:INDEX:ALIAS_TERM:HEX",
  canonicalByteLength: 510,
  canonicalSha256:
    "640800ed78bee95fa828d7219ab1711a8fc8177f0af18fa590af85602e297107",
  canonicalKeccak256:
    "0x5d16e42e857c3d93524b679426a87d59ec414466b581a904a72992d64c21a12f",
  sourceStatus: "archived-v1-palette-source",
  currentProtocolDependency: false,
  uppercaseRepertoire: "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
});

export const FOURTH_SET_COLOR_POLICY = Object.freeze({
  id: "inshell.thought.glyph-library.set-04.tile-color-policy.v1",
  paletteRole: "tile-background",
  uppercase: "direct Color Font v1 tile background",
  lowercase: "uppercase-alias tile background",
  nonletters: "neutral white tile background",
  nonletterBackground: "#ffffff",
  space: "metrics-only; advances without tile or glyph paint",
  foreground:
    "black or white, whichever has the higher WCAG 2.x contrast ratio",
  authoritativeMapExtension: true
});

export const FOURTH_SET_NONLETTER_REPERTOIRE = `0123456789.,?!:;'"-()/&`;
export const FOURTH_SET_COLOR_REPERTOIRE =
  ` ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz${FOURTH_SET_NONLETTER_REPERTOIRE}`;

const CANONICAL_ROWS = Object.freeze([
  "A:1:aqua:#00ffff",
  "B:2:blue:#0000ff",
  "C:3:coffee:#6f4e37",
  "D:4:denim:#6699ff",
  "E:5:eggshell:#fff9e3",
  "F:6:fuchsia:#ff00ff",
  "G:7:green:#008000",
  "H:8:honey:#ffcc00",
  "I:9:indigo:#4b0082",
  "J:10:jade green:#00a86b",
  "K:11:khaki:#c3b091",
  "L:12:lime:#00ff00",
  "M:13:maroon:#800000",
  "N:14:navy:#0a1172",
  "O:15:orange:#ffa500",
  "P:16:pink:#ffaadd",
  "Q:17:quicksilver:#a6a6a6",
  "R:18:red:#ff0000",
  "S:19:salmon:#fa8072",
  "T:20:teal:#008080",
  "U:21:ultramarine:#5533ff",
  "V:22:violet:#aa55ff",
  "W:23:wheat:#f5deb3",
  "X:24:xray:#bbcccc",
  "Y:25:yellow:#ffff00",
  "Z:26:zombie gray:#778877"
]);

export const COLOR_FONT_V1_TEXT = CANONICAL_ROWS.join("\n");

export const COLOR_FONT_V1_ENTRIES = Object.freeze(
  CANONICAL_ROWS.map((row, offset) => {
    const [letter, indexSource, aliasTerm, hex] = row.split(":");
    const index = Number(indexSource);
    if (
      letter !== String.fromCharCode(65 + offset)
      || index !== offset + 1
      || !/^[a-z][a-z ]*$/.test(aliasTerm)
      || !/^#[0-9a-f]{6}$/.test(hex)
    ) {
      throw new Error(`invalid Color Font v1 row: ${row}`);
    }
    return Object.freeze({ letter, index, aliasTerm, hex });
  })
);

if (COLOR_FONT_V1_ENTRIES.length !== 26) {
  throw new Error("Color Font v1 requires exactly 26 A-Z entries");
}
if (new TextEncoder().encode(COLOR_FONT_V1_TEXT).byteLength !== 510) {
  throw new Error("Color Font v1 canonical text must be exactly 510 bytes");
}

const ENTRIES_BY_LETTER = new Map(
  COLOR_FONT_V1_ENTRIES.map((entry) => [entry.letter, entry])
);

const assertSingleCharacter = (character) => {
  if (typeof character !== "string" || [...character].length !== 1) {
    throw new Error("Color Font v1 lookup requires exactly one character");
  }
};

export const getColorFontV1Entry = (letter) => {
  assertSingleCharacter(letter);
  if (!/^[A-Z]$/.test(letter)) {
    throw new Error("Color Font v1 defines uppercase A-Z only");
  }
  return { ...ENTRIES_BY_LETTER.get(letter) };
};

export const resolveFourthSetColor = (character) => {
  assertSingleCharacter(character);
  if (!FOURTH_SET_COLOR_REPERTOIRE.includes(character)) {
    const codepoint = character.codePointAt(0)
      .toString(16)
      .toUpperCase()
      .padStart(4, "0");
    throw new Error(`unsupported Fourth Set color character U+${codepoint}`);
  }
  if (character === " ") {
    return {
      inputCharacter: character,
      resolvedLetter: null,
      index: null,
      aliasTerm: null,
      hex: null,
      backgroundHex: null,
      resolution: "metrics-only-space",
      paletteBacked: false
    };
  }
  const direct = /^[A-Z]$/.test(character);
  const lowercase = /^[a-z]$/.test(character);
  if (!direct && !lowercase) {
    return {
      inputCharacter: character,
      resolvedLetter: null,
      index: null,
      aliasTerm: null,
      hex: FOURTH_SET_COLOR_POLICY.nonletterBackground,
      backgroundHex: FOURTH_SET_COLOR_POLICY.nonletterBackground,
      resolution: "nonletter-white",
      paletteBacked: false
    };
  }
  const resolvedLetter = direct ? character : character.toUpperCase();
  const entry = ENTRIES_BY_LETTER.get(resolvedLetter);
  return {
    inputCharacter: character,
    resolvedLetter,
    index: entry.index,
    aliasTerm: entry.aliasTerm,
    hex: entry.hex,
    backgroundHex: entry.hex,
    resolution: direct ? "direct" : "uppercase-alias",
    paletteBacked: true
  };
};

export const colorForCharacter = (character) =>
  resolveFourthSetColor(character).backgroundHex;

export const backgroundForCharacter = colorForCharacter;
