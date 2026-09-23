declare module "@inshell/thought-glyph-library-second-set" {
  export type SecondSetReview = {
    combined: "dual-pass-candidate" | "hold";
    compactStorage: "unmeasured-hold";
    expandedProtocol: "pass";
    identity: "pass" | "hold";
    legibility: "pass" | "hold";
  };

  export type SecondSetFontRecord = {
    approachNumber: 2 | 3 | 4;
    byteReport: string;
    familyId: string;
    file: string;
    fixture: string;
    fixtureSha256: string;
    glyphCount: 76;
    memberId: string;
    name: string;
    normalizedPathBytes: number;
    pathCommands: number;
    review: SecondSetReview;
    sha256: string;
    slug: string;
    type: "segment-mask" | "stroke-graph" | "routed-path";
  };

  export type SecondSetGlyph = {
    advanceWidth: 6;
    character: string;
    codepoint: number;
    d: string;
  };

  export type SecondSetFont = {
    canonicalOrder: string;
    family: {
      construction: {
        approach: SecondSetFontRecord["type"];
        approachNumber: SecondSetFontRecord["approachNumber"];
        grammar: string;
      };
      id: string;
      name: string;
      slug: string;
      thesis: string;
    };
    glyphs: SecondSetGlyph[];
    librarySet: {
      id: "inshell.thought.glyph-library.set-02";
      memberId: string;
      name: string;
      qualificationStatus: "exploratory-complete";
      version: 1;
    };
    metrics: {
      emSquare: 8;
      fillRule: "evenodd";
      fixedAdvanceWidth: 6;
    };
    schema: string;
  };

  export type SecondSetFontEntry = {
    record: SecondSetFontRecord;
    font: SecondSetFont;
  };

  export const listSecondSetFonts: (
    options?: { type?: SecondSetFontRecord["type"] | null },
  ) => Promise<SecondSetFontRecord[]>;
  export const loadSecondSetFont: (slug: string) => Promise<SecondSetFont>;
  export const loadAllSecondSetFonts: (
    options?: { type?: SecondSetFontRecord["type"] | null },
  ) => Promise<SecondSetFontEntry[]>;
}
