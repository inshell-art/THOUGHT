declare module "@inshell/classic-book-76-current-candidate" {
  export type ClassicBook76CurrentCandidateGlyph = {
    character: string;
    codepoint: number;
    d: string;
    pathSha256: string;
  };

  export type ClassicBook76CurrentCandidateFont = {
    candidate: {
      baseFaceSha256: string;
      basePackageVersion: "1.7.0";
      basePackedSha256: string;
      baseSetVersion: 8;
      baseSourceCommit: string;
      comparisonReportSchema: string;
      comparisonReportSha256: string;
      createdOn: "2026-07-31";
      pairSpacingAuditSha256: string;
      revision: "c02-current-study-v19-20260731";
      status: "installable-candidate-snapshot";
    };
    composition: {
      appliedPerGlyphOffsets: Record<string, number>;
      defaultOriginShiftX: 1;
      fixedAdvanceWidth: 10;
      kerning: false;
      mechanicalCenterReference: Record<string, number>;
      mechanicalCenterReferenceApplied: false;
      note: string;
    };
    family: {
      classification: "monospaced conventional centerline candidate";
      id: "S502-CURRENT-CANDIDATE-20260731";
      name: "Classic Book 76 — current candidate";
      slug: "classic-book-current-candidate";
      sourceCandidate: "C02";
      style: "Regular";
      weight: 400;
    };
    glyphs: ClassicBook76CurrentCandidateGlyph[];
    metrics: {
      ascender: number;
      baseline: 0;
      capHeight: number;
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
      xHeight: number;
    };
    renderStyle: {
      fill: "none";
      strokeLinecap: "round";
      strokeLinejoin: "round";
      strokeWidth: 1.23;
    };
    repertoire: string;
    schema: "inshell.thought.glyph-library.classic-book-76.current-candidate.v1";
  };

  export const CLASSIC_BOOK_76_REPERTOIRE: string;
  export const CLASSIC_BOOK_76_CANDIDATE_REVISION:
    "c02-current-study-v19-20260731";
  export const CLASSIC_BOOK_76_DEFAULT_ORIGIN_SHIFT_X: 1;

  export const assertCurrentCandidateFont: (
    font: unknown,
  ) => ClassicBook76CurrentCandidateFont;
  export const loadCurrentCandidateFont: (
  ) => Promise<ClassicBook76CurrentCandidateFont>;
  export const loadCurrentCandidatePacked: () => Promise<Uint8Array>;
  export const unsupportedCurrentCandidateCharacters: (
    font: ClassicBook76CurrentCandidateFont,
    text: string,
  ) => string[];
  export const supportsCurrentCandidateText: (
    font: ClassicBook76CurrentCandidateFont,
    text: string,
  ) => boolean;
  export const renderCurrentCandidateLine: (
    font: ClassicBook76CurrentCandidateFont,
    text: string,
    options?: {
      background?: string | null;
      className?: string;
      glyphOffsets?: Record<string, number> | null;
      height?: number | string | null;
      originShiftX?: number;
      padding?: number;
      stroke?: string;
      strokes?: string[] | null;
      title?: string | null;
      width?: number | string | null;
    },
  ) => string;
}
