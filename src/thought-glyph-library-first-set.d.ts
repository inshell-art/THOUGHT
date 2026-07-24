declare module "@inshell/thought-glyph-library-first-set" {
  export type FirstSetFontRecord = {
    familyId: string;
    file: string;
    fixture: string;
    fixtureSha256: string;
    glyphCount: 76;
    legacyBlindId: string;
    memberId: string;
    name: string;
    sha256: string;
    slug: string;
  };

  export type FirstSetGlyph = {
    advanceWidth: 6;
    character: string;
    codepoint: number;
    d: string;
  };

  export type FirstSetFont = {
    canonicalOrder: string;
    family: {
      name: string;
      slug: string;
    };
    glyphs: FirstSetGlyph[];
    librarySet: {
      id: string;
      memberId: string;
      name: string;
      qualificationStatus: string;
      version: number;
    };
    metrics: {
      emSquare: 8;
      fillRule: "evenodd";
      fixedAdvanceWidth: 6;
    };
    schema: string;
  };

  export type FirstSetFontEntry = {
    record: FirstSetFontRecord;
    font: FirstSetFont;
  };

  export const listFirstSetFonts: () => Promise<FirstSetFontRecord[]>;
  export const loadFirstSetFont: (slug: string) => Promise<FirstSetFont>;
  export const loadAllFirstSetFonts: () => Promise<FirstSetFontEntry[]>;
}
