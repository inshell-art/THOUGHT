declare module "@inshell/thought-glyph-library-third-set" {
  export type ThirdSetReview = {
    metricContract: "hold";
    visual: "pass";
  };

  export type ThirdSetFontRecord = {
    byteReport: string;
    byteReportSha256: string;
    classification: "conventional-outline";
    compactDataFloorBits: number;
    compactDataFloorBytes: number;
    familyId: string;
    file: string;
    fixture: string;
    fixtureSha256: string;
    glyphCount: 76;
    gzipBytesInformational: number;
    memberId: string;
    name: string;
    quantizationStep: number | null;
    rawPathBits: number;
    rawPathBytes: number;
    review: ThirdSetReview;
    sha256: string;
    slug: string;
    studyContractBaseline: 7;
    visualBaseline: number;
  };

  export type ThirdSetGlyph = {
    advanceWidth: 6;
    character: string;
    codepoint: number;
    d: string;
  };

  export type ThirdSetFont = {
    canonicalOrder: string;
    family: {
      classification: "conventional-outline";
      construction: {
        approach: "conventional-outline";
        coordinateTreatment: string;
        curveModel: string;
        fixedAdvanceWidth: 6;
        quantizationStep: number | null;
        sourceWeight: string;
      };
      id: string;
      name: string;
      review: {
        metricContract: "hold";
        metricException: {
          studyBaseline: 7;
          visualBaseline: number;
        };
        visual: "pass";
      };
      slug: string;
      thesis: string;
    };
    glyphs: ThirdSetGlyph[];
    librarySet: {
      id: "inshell.thought.glyph-library.set-03";
      memberId: string;
      name: string;
      qualificationStatus: "declared-with-metric-exception";
      version: 1;
    };
    metrics: {
      baselineContractStatus: "experimental-mismatch-disclosed";
      emSquare: 8;
      fillRule: "evenodd";
      fixedAdvanceWidth: 6;
      quantizationStep: number | null;
      studyContractBaseline: 7;
      visualBaseline: number;
    };
    schema: string;
  };

  export type ThirdSetFontEntry = {
    record: ThirdSetFontRecord;
    font: ThirdSetFont;
  };

  export const listThirdSetFonts: () => Promise<ThirdSetFontRecord[]>;
  export const loadThirdSetFont: (slug: string) => Promise<ThirdSetFont>;
  export const loadAllThirdSetFonts: () => Promise<ThirdSetFontEntry[]>;
}
