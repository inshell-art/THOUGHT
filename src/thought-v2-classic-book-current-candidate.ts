import {
  CLASSIC_BOOK_76_CANDIDATE_REVISION,
  CLASSIC_BOOK_76_DEFAULT_ORIGIN_SHIFT_X,
  CLASSIC_BOOK_76_REPERTOIRE,
  loadCurrentCandidateFont,
} from "@inshell/classic-book-76-current-candidate";

import {
  type ThoughtV2GlyphStudyFont,
} from "./thought-v2-glyph-library-frame-study";

export const THOUGHT_V2_CLASSIC_BOOK_CANDIDATE_SET_ID =
  "inshell.thought.glyph-library.classic-book-76.current-candidate";
export const THOUGHT_V2_CLASSIC_BOOK_CANDIDATE_MEMBER_ID =
  `${THOUGHT_V2_CLASSIC_BOOK_CANDIDATE_SET_ID}.c02-v19`;
export const THOUGHT_V2_CLASSIC_BOOK_CANDIDATE_VERSION = 19;
export const THOUGHT_V2_CLASSIC_BOOK_CANDIDATE_PACKAGE_VERSION =
  "0.19.0-candidate.20260731";
export const THOUGHT_V2_CLASSIC_BOOK_CANDIDATE_GLYPHS_SHA256 =
  "0069b4bcc764bb1ffd9707b06a1bdd70a17e523c06dc8b50922e67c21016f0a6";
export const THOUGHT_V2_CLASSIC_BOOK_CANDIDATE_PACKED_SHA256 =
  "7ccb7fc26c0f7d8a25a70b85acea02ef270f7c10f1bb851eb68301dfadb24567";
export const THOUGHT_V2_CLASSIC_BOOK_CANDIDATE_PACKED_KECCAK256 =
  "0x4ea6450fce37dc4079370ee798f5bb29f7ed677dcd1300c7fd9b3e27bb4b273e";

export type ThoughtV2ClassicBookCandidateEntry = {
  font: ThoughtV2GlyphStudyFont;
  record: {
    classification: "monospaced conventional centerline candidate";
    glyphCount: 76;
    memberId: string;
    name: string;
    slug: string;
    sourceCandidate: "C02";
  };
};

export const loadThoughtV2ClassicBookCurrentCandidate =
  async (): Promise<ThoughtV2ClassicBookCandidateEntry> => {
    const candidate = await loadCurrentCandidateFont();
    if (
      candidate.candidate.revision !== CLASSIC_BOOK_76_CANDIDATE_REVISION
      || candidate.candidate.basePackageVersion !== "1.7.0"
      || candidate.candidate.baseSetVersion !== 8
      || candidate.repertoire !== CLASSIC_BOOK_76_REPERTOIRE
      || candidate.composition.defaultOriginShiftX
        !== CLASSIC_BOOK_76_DEFAULT_ORIGIN_SHIFT_X
      || candidate.composition.kerning
      || candidate.composition.mechanicalCenterReferenceApplied
      || Object.keys(candidate.composition.appliedPerGlyphOffsets).length !== 0
      || candidate.metrics.fixedAdvanceWidth !== 10
      || candidate.renderStyle.fill !== "none"
      || candidate.renderStyle.strokeWidth !== 1.23
      || candidate.renderStyle.strokeLinecap !== "round"
      || candidate.renderStyle.strokeLinejoin !== "round"
      || candidate.glyphs.length !== 76
    ) {
      throw new Error("Classic Book 76 current candidate pin drift");
    }

    const font: ThoughtV2GlyphStudyFont = {
      ...candidate,
      librarySet: {
        id: THOUGHT_V2_CLASSIC_BOOK_CANDIDATE_SET_ID,
        memberId: THOUGHT_V2_CLASSIC_BOOK_CANDIDATE_MEMBER_ID,
        name: "Classic Book 76 Current Candidate",
        qualificationStatus: candidate.candidate.status,
        version: THOUGHT_V2_CLASSIC_BOOK_CANDIDATE_VERSION,
      },
    };

    return {
      font,
      record: {
        classification: candidate.family.classification,
        glyphCount: 76,
        memberId: THOUGHT_V2_CLASSIC_BOOK_CANDIDATE_MEMBER_ID,
        name: "Classic Book 76 — Current Candidate",
        slug: candidate.family.slug,
        sourceCandidate: candidate.family.sourceCandidate,
      },
    };
  };
