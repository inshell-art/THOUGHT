declare module "@inshell/thought-glyph-library-fifth-set" {
  export type FifthSetFontSlug =
    | "classic-line"
    | "classic-book"
    | "classic-round"
    | "classic-compact";

  export type FifthSetRenderStyle = {
    fill: "none";
    strokeLinecap: "butt" | "round";
    strokeLinejoin: "miter" | "round";
    strokeWidth: number;
  };

  export type FifthSetFontRecord = {
    familyId: "S501" | "S502" | "S503" | "S504";
    glyphCount: 76;
    memberId: string;
    name: string;
    order: 1 | 2 | 3 | 4;
    renderStyle: FifthSetRenderStyle;
    slug: FifthSetFontSlug;
    sourceCandidate: "C01" | "C02" | "C04" | "C06";
  };

  export type FifthSetGlyph = {
    character: string;
    codepoint: number;
    d: string;
    pathSha256: string;
  };

  export type FifthSetFont = {
    family: {
      classification: "monospaced conventional centerline";
      id: "S501" | "S502" | "S503" | "S504";
      name: string;
      slug: FifthSetFontSlug;
      sourceCandidate: "C01" | "C02" | "C04" | "C06";
      style: "Regular";
      weight: 400;
    };
    glyphs: FifthSetGlyph[];
    librarySet: {
      id: "inshell.thought.glyph-library.set-05";
      memberId: string;
      name: "THOUGHT Glyph Library — Fifth Set";
      order: 1 | 2 | 3 | 4;
      ordinal: 5;
      version: 8;
    };
    metrics: {
      ascender: 10 | 11;
      baseline: 0;
      capHeight: 10;
      coordinateSystem: "logical units, y-up";
      descender: -3;
      fixedAdvanceWidth: 10;
      space: {
        advanceWidth: 10;
        drawsPath: false;
      };
      svgBaselineY: 12;
      svgViewBoxHeight: 16;
      unitsPerEm: 13;
      xHeight: 7;
    };
    renderStyle: FifthSetRenderStyle;
    repertoire: string;
    schema: "inshell.thought.glyph-library.set-05.face.v1";
  };

  export type FifthSetFontEntry = {
    record: FifthSetFontRecord;
    font: FifthSetFont;
  };

  export const FIFTH_SET_ID: "inshell.thought.glyph-library.set-05";
  export const FIFTH_SET_NAME: "THOUGHT Glyph Library — Fifth Set";
  export const FIFTH_SET_VERSION: 8;
  export const FIFTH_SET_REPERTOIRE: string;
  export const FIFTH_SET_FONT_SLUGS: readonly FifthSetFontSlug[];

  export const listFifthSetFonts: () => Promise<FifthSetFontRecord[]>;
  export const loadFifthSetFont: (slug: FifthSetFontSlug | string) => Promise<FifthSetFont>;
  export const loadAllFifthSetFonts: () => Promise<FifthSetFontEntry[]>;
}
