declare module "@inshell/thought-glyph-library-fourth-set" {
  export type FourthSetConstruction =
    | "block-run"
    | "segment-mask"
    | "conventional-outline";

  export type FourthSetFontRecord = {
    construction: FourthSetConstruction;
    familyId: string;
    glyphCount: 76;
    memberId: string;
    name: string;
    normalization: {
      ordinaryMatrix: [number, number, number, number, number, number];
      safeCharacters: string;
      safeMatrix: [number, number, number, number, number, number];
    };
    review: {
      foregroundContrast: "pass";
      sourceGeometry: "preserved";
      tightProfile: "approved";
      tileBackgrounds: "pass";
    };
    slug: string;
    sourceGeometry: {
      memberId: string;
      name: string;
      setId: string;
      slug: string;
    };
  };

  export type FourthSetGlyph = {
    advanceWidth: 6;
    character: string;
    codepoint: number;
    d: string;
  };

  export type FourthSetFont = {
    canonicalOrder: string;
    colorBinding: {
      canonicalSha256: string;
      currentProtocolDependency: false;
      foreground: {
        minimumChosenContrast: number;
      };
      paletteId: "inshell.colorfont.v1";
      paletteRole: "tile-background";
      sourceStatus: string;
    };
    family: {
      classification: "background-tile-svg-glyphs";
      construction: {
        approach: FourthSetConstruction;
      };
      id: string;
      name: string;
      slug: string;
    };
    glyphs: FourthSetGlyph[];
    librarySet: {
      id: "inshell.thought.glyph-library.set-04";
      memberId: string;
      name: string;
      qualificationStatus: "declared-tight-background-tile";
      version: 1;
    };
    metrics: {
      emSquare: 8;
      fillRule: "evenodd";
      fixedAdvanceWidth: 6;
    };
    tilePresentation: {
      monospaced: true;
      normalization: {
        ordinaryMatrix: [number, number, number, number, number, number];
        safeCharacters: string;
        safeMatrix: [number, number, number, number, number, number];
      };
      profileId: "tight-v1";
      profileLabel: "Tight";
      renderedAdvanceWidth: 6.5;
      sourceFixedAdvanceWidth: 6;
      spaceAdvanceWidth: 6.5;
    };
  };

  export type FourthSetFontEntry = {
    record: FourthSetFontRecord;
    font: FourthSetFont;
  };

  export type FourthSetTilePaint = {
    aliasTerm: string | null;
    background: string;
    chosenContrast: number;
    drawsGlyph: boolean;
    drawsTile: boolean;
    foreground: "#000000" | "#ffffff";
    index: number | null;
    paletteBacked: boolean;
    resolution: string;
    resolvedLetter: string | null;
  };

  export const FOURTH_SET_TIGHT_PROFILE: {
    advanceWidth: 6.5;
    edgeStyle: "square";
    effectiveCornerRadius: 0;
    glyphScale: 0.96;
    id: "tight-v1";
    minimumChosenContrast: 4.7734;
    spaceAdvanceWidth: 6.5;
    tileGap: 0.2;
    tileHeight: 8;
    tileWidth: 6.5;
  };

  export const listFourthSetFonts: (
    options?: { construction?: FourthSetConstruction | null },
  ) => Promise<FourthSetFontRecord[]>;
  export const loadFourthSetFont: (slug: string) => Promise<FourthSetFont>;
  export const loadAllFourthSetFonts: (
    options?: { construction?: FourthSetConstruction | null },
  ) => Promise<FourthSetFontEntry[]>;
  export const resolveFourthSetTilePaint: (
    character: string,
    options?: { tileProfile?: "tight-v1" },
  ) => FourthSetTilePaint;
}
