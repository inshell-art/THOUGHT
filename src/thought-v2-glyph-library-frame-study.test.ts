import {
  listFirstSetFonts,
  loadAllFirstSetFonts,
  loadFirstSetFont,
} from "@inshell/thought-glyph-library-first-set";
import {
  listSecondSetFonts,
  loadAllSecondSetFonts,
  loadSecondSetFont,
} from "@inshell/thought-glyph-library-second-set";
import {
  listThirdSetFonts,
  loadAllThirdSetFonts,
  loadThirdSetFont,
} from "@inshell/thought-glyph-library-third-set";
import {
  listFourthSetFonts,
  loadAllFourthSetFonts,
  loadFourthSetFont,
  resolveFourthSetTilePaint,
} from "@inshell/thought-glyph-library-fourth-set";
import {
  listFifthSetFonts,
  loadAllFifthSetFonts,
  loadFifthSetFont,
} from "@inshell/thought-glyph-library-fifth-set";
import {
  CLASSIC_BOOK_76_REPERTOIRE,
  loadCurrentCandidateFont,
  renderCurrentCandidateLine,
  supportsCurrentCandidateText,
} from "@inshell/classic-book-76-current-candidate";
import { beforeAll, describe, expect, it } from "vitest";

import {
  loadThoughtV2ClassicBookCurrentCandidate,
  THOUGHT_V2_CLASSIC_BOOK_CANDIDATE_GLYPHS_SHA256,
  THOUGHT_V2_CLASSIC_BOOK_CANDIDATE_PACKED_KECCAK256,
  THOUGHT_V2_CLASSIC_BOOK_CANDIDATE_PACKED_SHA256,
  THOUGHT_V2_CLASSIC_BOOK_CANDIDATE_PACKAGE_VERSION,
} from "./thought-v2-classic-book-current-candidate";
import {
  renderThoughtV2GlyphLibraryFrameStudySvg,
  THOUGHT_V2_GLYPH_STUDY_DEFAULT_FOREGROUND,
  THOUGHT_V2_GLYPH_STUDY_MAX_COLUMNS,
  THOUGHT_V2_GLYPH_STUDY_TIGHT_TILE_MAX_COLUMNS,
  THOUGHT_V2_GLYPH_STUDY_WRAP,
  wrapThoughtV2GlyphStudyLine,
} from "./thought-v2-glyph-library-frame-study";

type LoadedFont = Awaited<ReturnType<typeof loadFirstSetFont>>;

let font: LoadedFont;

beforeAll(async () => {
  font = await loadFirstSetFont("diamond-lattice");
});

describe("THOUGHT V2 glyph-library frame study", () => {
  it("loads the frozen ordered 24-family bundle", async () => {
    const records = await listFirstSetFonts();
    expect(records).toHaveLength(24);
    expect(records[0]).toMatchObject({
      glyphCount: 76,
      name: "Diamond Lattice",
      slug: "diamond-lattice",
    });
    expect(records[23]).toMatchObject({
      glyphCount: 76,
      name: "Offset Stack",
      slug: "offset-stack",
    });
  });

  it("renders every First Set family through the same path-only composition", async () => {
    const entries = await loadAllFirstSetFonts();
    for (const { record, font: candidate } of entries) {
      const svg = renderThoughtV2GlyphLibraryFrameStudySvg(
        candidate,
        "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
        "abcdefghijklmnopqrstuvwxyz 0123456789.,?!",
        32,
        "#006100",
        THOUGHT_V2_GLYPH_STUDY_DEFAULT_FOREGROUND,
      );
      expect(svg).toContain(`data-glyph-family="${record.slug}"`);
      expect(svg).toContain(`data-library-member-id="${record.memberId}"`);
      expect(svg).not.toMatch(/<text[\s>]/);
      expect(svg).not.toContain("<foreignObject");
    }
  });

  it("loads and renders the ordered exploratory 36-family Second Set bundle", async () => {
    const records = await listSecondSetFonts();
    expect(records).toHaveLength(36);
    expect(records.filter(({ review }) => review.combined === "dual-pass-candidate")).toHaveLength(9);
    expect(records[0]).toMatchObject({
      glyphCount: 76,
      name: "Row Ledger",
      slug: "row-ledger",
      type: "segment-mask",
    });
    expect(records[35]).toMatchObject({
      glyphCount: 76,
      name: "Perimeter Relay",
      slug: "perimeter-relay",
      type: "routed-path",
    });

    const entries = await loadAllSecondSetFonts();
    for (const { record, font: candidate } of entries) {
      const svg = renderThoughtV2GlyphLibraryFrameStudySvg(
        candidate,
        "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
        "abcdefghijklmnopqrstuvwxyz 0123456789.,?!",
        32,
        "#006100",
        THOUGHT_V2_GLYPH_STUDY_DEFAULT_FOREGROUND,
      );
      expect(svg).toContain(`data-glyph-family="${record.slug}"`);
      expect(svg).toContain(`data-library-member-id="${record.memberId}"`);
      expect(svg).not.toMatch(/<text[\s>]/);
      expect(svg).not.toContain("<foreignObject");
    }
  });

  it("uses the bundle's deterministic 29-cell wrap", () => {
    expect(wrapThoughtV2GlyphStudyLine("ONE TWO THREE", 7)).toEqual([
      "ONE TWO",
      "THREE",
    ]);
    expect(wrapThoughtV2GlyphStudyLine("ABCDEFGHIJK", 5)).toEqual([
      "ABCDE",
      "FGHIJ",
      "K",
    ]);
    expect(wrapThoughtV2GlyphStudyLine("A".repeat(64))).toEqual([
      "A".repeat(THOUGHT_V2_GLYPH_STUDY_MAX_COLUMNS),
      "A".repeat(THOUGHT_V2_GLYPH_STUDY_MAX_COLUMNS),
      "A".repeat(6),
    ]);
  });

  it("loads and renders the ordered two-family Third Set with disclosed metric exceptions", async () => {
    const records = await listThirdSetFonts();
    expect(records).toHaveLength(2);
    expect(records[0]).toMatchObject({
      classification: "conventional-outline",
      name: "Humanist Smooth",
      review: {
        metricContract: "hold",
        visual: "pass",
      },
      slug: "humanist-smooth",
      studyContractBaseline: 7,
      visualBaseline: 5.58,
    });
    expect(records[1]).toMatchObject({
      name: "Humanist Quantized",
      slug: "humanist-quantized",
      visualBaseline: 5.63,
    });

    const entries = await loadAllThirdSetFonts();
    for (const { record, font: candidate } of entries) {
      const svg = renderThoughtV2GlyphLibraryFrameStudySvg(
        candidate,
        "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
        "abcdefghijklmnopqrstuvwxyz 0123456789.,?!",
        32,
        "#006100",
        THOUGHT_V2_GLYPH_STUDY_DEFAULT_FOREGROUND,
      );
      expect(svg).toContain(`data-glyph-family="${record.slug}"`);
      expect(svg).toContain(`data-library-member-id="${record.memberId}"`);
      expect(svg).toContain(`data-visual-baseline="${record.visualBaseline}"`);
      expect(svg).toContain('data-study-contract-baseline="7"');
      expect(svg).toContain('data-baseline-contract-status="experimental-mismatch-disclosed"');
      expect(svg).toContain('data-metric-adjustment="none"');
      expect(svg).not.toMatch(/<text[\s>]/);
      expect(svg).not.toContain("<foreignObject");
    }
  });

  it("renders only native path definitions and explicit path uses", () => {
    const prompt = "Can an Agent hear silence?";
    const agent = "Only after the signal ends.";
    const svg = renderThoughtV2GlyphLibraryFrameStudySvg(
      font,
      prompt,
      agent,
      32,
      "#006100",
      THOUGHT_V2_GLYPH_STUDY_DEFAULT_FOREGROUND,
    );

    expect(svg).toContain('width="1024" height="1024" viewBox="0 0 1024 1024"');
    expect(svg).toContain('data-frame-width="32"');
    expect(svg).toContain('data-canvas-size="960"');
    expect(svg).toContain('data-glyph-family="diamond-lattice"');
    expect(svg).toContain('data-library-member-id="inshell.thought.glyph-library.set-01.diamond-lattice"');
    expect(svg).toContain(`data-wrap="${THOUGHT_V2_GLYPH_STUDY_WRAP}"`);
    expect(svg).toContain('<rect id="work-frame" width="1024" height="1024" fill="#006100"/>');
    expect(svg).toContain('<g id="work-canvas" transform="translate(32 32)">');
    expect(svg).toContain('<rect id="canvas-bg" width="960" height="960" fill="#000000"/>');
    expect(svg).toContain('data-frame-color="#006100"');
    expect(svg).toContain('data-text-color="#00ff00"');
    expect(svg).toContain('<g id="prompt-line" fill="#00ff00"');
    expect(svg).toContain('<g id="agent-line" fill="#00ff00"');
    expect(svg).toContain('data-prompt-vertical-align="top"');
    expect(svg).toContain('data-agent-vertical-align="bottom"');
    expect(svg).toContain('data-field-bottom="384"');
    expect(svg).toContain('data-field-bottom="832"');
    expect(svg).toContain('transform="translate(153.6 140.8) scale(4.8)"');
    expect(svg).toContain('transform="translate(57.6 780.8) scale(4.8)"');
    expect(svg).not.toMatch(/<text[\s>]/);
    expect(svg).not.toContain("<foreignObject");
    expect(svg).not.toContain("@font-face");
    expect(svg).not.toContain("<style");

    const usedCharacters = new Set(
      [...`${prompt}${agent}`].filter((character) => character !== " "),
    );
    expect(svg.match(/<defs><path /g)).toHaveLength(1);
    expect(svg.match(/<path id=/g)).toHaveLength(usedCharacters.size);
    expect(svg.match(/<use href=/g)).toHaveLength(
      [...`${prompt}${agent}`].filter((character) => character !== " ").length,
    );
  });

  it("top-aligns the fixed prompt field and bottom-aligns the fixed Agent field", () => {
    const lines = [
      { rows: 1, value: "A" },
      { rows: 2, value: "A".repeat(15) + " " + "B".repeat(15) },
      {
        rows: 3,
        value: ["A", "B", "C"].map((character) => character.repeat(20)).join(" "),
      },
      {
        rows: 4,
        value: ["A", "B", "C", "D"].map((character) => character.repeat(15)).join(" "),
      },
    ];

    for (const { rows, value } of lines) {
      const svg = renderThoughtV2GlyphLibraryFrameStudySvg(
        font,
        value,
        value,
        32,
        "#006100",
        THOUGHT_V2_GLYPH_STUDY_DEFAULT_FOREGROUND,
      );
      const prompt = /<g id="prompt-line"[^>]*>(.*?)<\/g>/.exec(svg)?.[1];
      const agent = /<g id="agent-line"[^>]*>(.*?)<\/g>/.exec(svg)?.[1];
      expect(prompt).toBeTruthy();
      expect(agent).toBeTruthy();

      const yPositions = (group: string | undefined): number[] =>
        [...(group ?? "").matchAll(/translate\([^ ]+ ([0-9.]+)\) scale\(4\.8\)/g)]
          .map((match) => Number(match[1]));
      const promptYs = yPositions(prompt);
      const agentYs = yPositions(agent);

      expect(Math.min(...promptYs)).toBe(140.8);
      expect(Math.max(...promptYs)).toBe(140.8 + ((rows - 1) * 64));
      expect(Math.max(...agentYs)).toBe(780.8);
      expect(Math.min(...agentYs)).toBe(780.8 - ((rows - 1) * 64));
    }
  });

  it("rejects text outside the shared Terminal English profile", () => {
    expect(() => renderThoughtV2GlyphLibraryFrameStudySvg(
      font,
      "unsupported_underscore",
      "Valid response.",
      32,
      "#006100",
      THOUGHT_V2_GLYPH_STUDY_DEFAULT_FOREGROUND,
    )).toThrow("unsupported U+005F");
    expect(() => renderThoughtV2GlyphLibraryFrameStudySvg(
      font,
      "Repeated  spaces",
      "Valid response.",
      32,
      "#006100",
      THOUGHT_V2_GLYPH_STUDY_DEFAULT_FOREGROUND,
    )).toThrow("spacing profile");
  });

  it("renders one Second Set member with the same deterministic composition", async () => {
    const secondSetFont = await loadSecondSetFont("row-ledger");
    const svg = renderThoughtV2GlyphLibraryFrameStudySvg(
      secondSetFont,
      "Which path remains?",
      "The one that returns.",
      32,
      "#006100",
      "#00ba00",
    );
    expect(svg).toContain('data-library-set-id="inshell.thought.glyph-library.set-02"');
    expect(svg).toContain('data-glyph-family="row-ledger"');
  });

  it("preserves Third Set native outline geometry without metric correction", async () => {
    const thirdSetFont = await loadThirdSetFont("humanist-quantized");
    const svg = renderThoughtV2GlyphLibraryFrameStudySvg(
      thirdSetFont,
      "Which path remains?",
      "The one that returns.",
      32,
      "#006100",
      "#00ba00",
    );
    expect(svg).toContain('data-library-set-id="inshell.thought.glyph-library.set-03"');
    expect(svg).toContain('data-visual-baseline="5.63"');
    expect(svg).toContain('data-metric-adjustment="none"');
  });

  it("loads the exact ordered three-family Fourth Set", async () => {
    const records = await listFourthSetFonts();
    expect(records).toHaveLength(3);
    expect(records.map(({ memberId, name, slug, sourceGeometry }) => ({
      memberId,
      name,
      slug,
      sourceMemberId: sourceGeometry.memberId,
    }))).toEqual([
      {
        memberId: "inshell.thought.glyph-library.set-04.tile-vertical-ledger",
        name: "Tile Vertical Ledger",
        slug: "tile-vertical-ledger",
        sourceMemberId: "inshell.thought.glyph-library.set-01.vertical-ledger",
      },
      {
        memberId: "inshell.thought.glyph-library.set-04.tile-column-relay",
        name: "Tile Column Relay",
        slug: "tile-column-relay",
        sourceMemberId: "inshell.thought.glyph-library.set-02.column-relay",
      },
      {
        memberId: "inshell.thought.glyph-library.set-04.tile-humanist-smooth",
        name: "Tile Humanist Smooth",
        slug: "tile-humanist-smooth",
        sourceMemberId: "inshell.thought.glyph-library.set-03.humanist-smooth",
      },
    ]);
    for (const record of records) {
      expect(record.review).toEqual({
        foregroundContrast: "pass",
        sourceGeometry: "preserved",
        tightProfile: "approved",
        tileBackgrounds: "pass",
      });
    }
  });

  it("renders all Fourth Set families with canonical tight tiles and no browser text", async () => {
    const entries = await loadAllFourthSetFonts();
    for (const { record, font: candidate } of entries) {
      const svg = renderThoughtV2GlyphLibraryFrameStudySvg(
        candidate,
        "AB 1?",
        "ba 2!",
        32,
        "#006100",
        "#ff00ff",
      );
      expect(svg).toContain('data-library-set-id="inshell.thought.glyph-library.set-04"');
      expect(svg).toContain(`data-glyph-family="${record.slug}"`);
      expect(svg).toContain(`data-library-member-id="${record.memberId}"`);
      expect(svg).toContain('data-text-color="canonical-per-tile"');
      expect(svg).toContain('data-text-color-policy="canonical-per-tile"');
      expect(svg).toContain('data-tile-profile="tight-v1"');
      expect(svg).toContain('data-advance-width="6.5"');
      expect(svg).toContain(`data-max-columns="${THOUGHT_V2_GLYPH_STUDY_TIGHT_TILE_MAX_COLUMNS}"`);
      expect(svg).toContain('data-minimum-selected-contrast="4.7734"');
      expect(svg.match(/class="tile-cell"/g)).toHaveLength(8);
      expect(svg).not.toContain("#ff00ff");
      expect(svg).not.toMatch(/<text[\s>]/);
      expect(svg).not.toContain("<foreignObject");
      expect(svg).not.toContain("@font-face");
    }
  });

  it("uses Color Font v1 tiles, automatic contrast paint, and metrics-only spaces", async () => {
    const fourthSetFont = await loadFourthSetFont("tile-humanist-smooth");
    const svg = renderThoughtV2GlyphLibraryFrameStudySvg(
      fourthSetFont,
      "AB 1?",
      "A B",
      32,
      "#006100",
      "#00ff00",
    );
    const paintA = resolveFourthSetTilePaint("A");
    const paintB = resolveFourthSetTilePaint("B");
    const paintDigit = resolveFourthSetTilePaint("1");
    expect(paintA).toMatchObject({
      background: "#00ffff",
      foreground: "#000000",
      paletteBacked: true,
    });
    expect(paintB).toMatchObject({
      background: "#0000ff",
      foreground: "#ffffff",
      paletteBacked: true,
    });
    expect(paintDigit).toMatchObject({
      background: "#ffffff",
      foreground: "#000000",
      paletteBacked: false,
    });
    expect(svg).toContain('data-character="A" data-tile-profile="tight-v1" data-color-resolution="direct" data-palette-letter="A"');
    expect(svg).toContain('fill="#00ffff" data-background="#00ffff"');
    expect(svg).toContain('fill="#0000ff" data-background="#0000ff"');
    expect(svg).toContain('fill="#ffffff" data-foreground="#ffffff"');
    expect(svg).toContain('data-character="1" data-tile-profile="tight-v1" data-color-resolution="nonletter-white"');
    expect(svg.match(/class="tile-cell"/g)).toHaveLength(6);
    expect(svg).not.toContain('data-character=" "');

    const glyphA = fourthSetFont.glyphs.find(({ character }) => character === "A");
    expect(glyphA).toBeDefined();
    expect(svg).toContain(`<path id="tile-humanist-smooth-g0041" d="${glyphA?.d}" fill-rule="evenodd"/>`);
    expect(svg).toContain(`data-normalization="matrix(${fourthSetFont.tilePresentation.normalization.ordinaryMatrix.join(" ")})"`);
  });

  it("loads the exact ordered four-family Fifth Set", async () => {
    const records = await listFifthSetFonts();
    expect(records).toHaveLength(4);
    expect(records.map((record) => ({
      familyId: record.familyId,
      memberId: record.memberId,
      name: record.name,
      order: record.order,
      slug: record.slug,
      sourceCandidate: record.sourceCandidate,
    }))).toEqual([
      {
        familyId: "S501",
        memberId: "inshell.thought.glyph-library.set-05.classic-line",
        name: "Classic Line 76",
        order: 1,
        slug: "classic-line",
        sourceCandidate: "C01",
      },
      {
        familyId: "S502",
        memberId: "inshell.thought.glyph-library.set-05.classic-book",
        name: "Classic Book 76",
        order: 2,
        slug: "classic-book",
        sourceCandidate: "C02",
      },
      {
        familyId: "S503",
        memberId: "inshell.thought.glyph-library.set-05.classic-round",
        name: "Classic Round 76",
        order: 3,
        slug: "classic-round",
        sourceCandidate: "C04",
      },
      {
        familyId: "S504",
        memberId: "inshell.thought.glyph-library.set-05.classic-compact",
        name: "Classic Compact 76",
        order: 4,
        slug: "classic-compact",
        sourceCandidate: "C06",
      },
    ]);
  });

  it("renders every Fifth Set family as exact no-fill centerlines", async () => {
    const entries = await loadAllFifthSetFonts();
    for (const { record, font: candidate } of entries) {
      const svg = renderThoughtV2GlyphLibraryFrameStudySvg(
        candidate,
        "AB 1?",
        "ba 2!",
        32,
        "#006100",
        "#00ff00",
      );
      const glyphA = candidate.glyphs.find(({ character }) => character === "A");
      expect(glyphA).toBeDefined();
      expect(svg).toContain('data-library-set-id="inshell.thought.glyph-library.set-05"');
      expect(svg).toContain('data-library-set-version="8"');
      expect(svg).toContain(`data-glyph-family="${record.slug}"`);
      expect(svg).toContain(`data-library-member-id="${record.memberId}"`);
      expect(svg).toContain(`data-source-candidate="${record.sourceCandidate}"`);
      expect(svg).toContain('data-qualification-status="declared"');
      expect(svg).toContain('data-path-model="centerline"');
      expect(svg).toContain('data-coordinate-system="logical units, y-up"');
      expect(svg).toContain('data-fixed-advance-width="10"');
      expect(svg).toContain('data-font-style="Regular"');
      expect(svg).toContain('data-font-weight="400"');
      expect(svg).toContain('data-render-fill="none"');
      expect(svg).toContain(`data-authored-stroke-width="${record.renderStyle.strokeWidth}"`);
      expect(svg).toContain(`data-stroke-width="${record.renderStyle.strokeWidth}"`);
      expect(svg).toContain('data-weight-mode="authored-regular"');
      expect(svg).toContain(`data-stroke-linecap="${record.renderStyle.strokeLinecap}"`);
      expect(svg).toContain(`data-stroke-linejoin="${record.renderStyle.strokeLinejoin}"`);
      expect(svg).toContain(
        `<path id="${record.slug}-g0041" d="${glyphA?.d}"/>`,
      );
      expect(svg).toContain(
        `fill="none" stroke="#00ff00" stroke-width="${record.renderStyle.strokeWidth}" stroke-linecap="${record.renderStyle.strokeLinecap}" stroke-linejoin="${record.renderStyle.strokeLinejoin}" data-paint-policy="canonical-centerline-stroke"`,
      );
      expect(svg).toContain('transform="translate(758.4 171.52) scale(2.88 -2.88)"');
      expect(svg).toContain('transform="translate(57.6 811.52) scale(2.88 -2.88)"');
      expect(svg).not.toContain("fill-rule=");
      expect(svg).not.toMatch(/<text[\s>]/);
      expect(svg).not.toContain("<foreignObject");
      expect(svg).not.toContain("@font-face");
    }
  });

  it("applies a synthetic Set 5 visual weight without changing glyph geometry or metrics", async () => {
    const fifthSetFont = await loadFifthSetFont("classic-book");
    const authored = renderThoughtV2GlyphLibraryFrameStudySvg(
      fifthSetFont,
      "Question?",
      "The one that returns.",
      32,
      "#006100",
      "#00ff00",
    );
    const synthetic = renderThoughtV2GlyphLibraryFrameStudySvg(
      fifthSetFont,
      "Question?",
      "The one that returns.",
      32,
      "#006100",
      "#00ff00",
      1.2,
    );

    expect(synthetic).toContain('data-font-weight="400"');
    expect(synthetic).toContain('data-authored-stroke-width="0.82"');
    expect(synthetic).toContain('data-stroke-width="1.2"');
    expect(synthetic).toContain('data-weight-mode="synthetic-stroke-study"');
    expect(synthetic).toContain(
      `fill="none" stroke="#00ff00" stroke-width="1.2" stroke-linecap="${fifthSetFont.renderStyle?.strokeLinecap}" stroke-linejoin="${fifthSetFont.renderStyle?.strokeLinejoin}" data-paint-policy="synthetic-centerline-weight-study"`,
    );
    expect(synthetic.match(/transform="[^"]+"/g)).toEqual(authored.match(/transform="[^"]+"/g));
  });

  it("uses the approved Set 5 v8 Classic Book revision paths", async () => {
    const fifthSetFont = await loadFifthSetFont("classic-book");
    const svg = renderThoughtV2GlyphLibraryFrameStudySvg(
      fifthSetFont,
      "AG?2",
      "fk-",
      32,
      "#006100",
      "#00ff00",
    );

    expect(svg).toContain('<path id="classic-book-g0041" d="M1 0L4 10L7 0M2.3 4L5.7 4"/>');
    expect(svg).toContain('<path id="classic-book-g0047" d="M7 8Q6 10 4 10Q1 10 1 5Q1 0 4 0Q7 0 7 2L7 5L4 5"/>');
    expect(svg).toContain('<path id="classic-book-g003f" d="M1 8Q2 10 4 10Q7 10 7 7Q7 5 4 4L4 3M4 0L4 1"/>');
    expect(svg).toContain('<path id="classic-book-g0032" d="M1 8Q2 10 4 10Q7 10 7 7Q7 6 5 4L1 0L7 0"/>');
    expect(svg).toContain('<path id="classic-book-g0066" d="M3 0L3 8Q3 11 5 11Q6 11 7 10M1 7L7 7"/>');
    expect(svg).toContain('<path id="classic-book-g006b" d="M1 0L1 10M7 7L1 2M3.18 3.82L7 0"/>');
    expect(svg).toContain('<path id="classic-book-g002d" d="M1 5L7 5"/>');
  });

  it("installs the separate Classic Book V19 candidate without replacing released Set 5 V8", async () => {
    const released = await loadFifthSetFont("classic-book");
    const { font: candidate } = await loadThoughtV2ClassicBookCurrentCandidate();

    expect(THOUGHT_V2_CLASSIC_BOOK_CANDIDATE_PACKAGE_VERSION)
      .toBe("0.19.0-candidate.20260731");
    expect(THOUGHT_V2_CLASSIC_BOOK_CANDIDATE_GLYPHS_SHA256)
      .toBe("0069b4bcc764bb1ffd9707b06a1bdd70a17e523c06dc8b50922e67c21016f0a6");
    expect(THOUGHT_V2_CLASSIC_BOOK_CANDIDATE_PACKED_SHA256)
      .toBe("7ccb7fc26c0f7d8a25a70b85acea02ef270f7c10f1bb851eb68301dfadb24567");
    expect(THOUGHT_V2_CLASSIC_BOOK_CANDIDATE_PACKED_KECCAK256)
      .toBe("0x4ea6450fce37dc4079370ee798f5bb29f7ed677dcd1300c7fd9b3e27bb4b273e");
    expect(candidate.candidate?.revision).toBe("c02-current-study-v19-20260731");
    expect(candidate.candidate?.baseSetVersion).toBe(8);
    expect(candidate.composition).toMatchObject({
      appliedPerGlyphOffsets: {},
      defaultOriginShiftX: 1,
      kerning: false,
      mechanicalCenterReferenceApplied: false,
    });
    expect(candidate.renderStyle).toMatchObject({
      fill: "none",
      strokeLinecap: "round",
      strokeLinejoin: "round",
      strokeWidth: 1.23,
    });
    expect(candidate.glyphs.find(({ character }) => character === "G")?.d)
      .toBe("M7.1 9Q6.1 10.1 4 10.1Q.75 10.1 .75 5.25Q.75 .4 4 .4Q7.2 .4 7.2 1.35L7.2 4.9L4.2 4.9");
    expect(released.glyphs.find(({ character }) => character === "G")?.d)
      .toBe("M7 8Q6 10 4 10Q1 10 1 5Q1 0 4 0Q7 0 7 2L7 5L4 5");
  });

  it("renders the candidate with its +1 origin, exact paint, and no spacing offsets", async () => {
    const { font: candidate } = await loadThoughtV2ClassicBookCurrentCandidate();
    const svg = renderThoughtV2GlyphLibraryFrameStudySvg(
      candidate,
      "A",
      "A",
      32,
      "#006100",
      "#00ff00",
    );

    expect(svg).toContain('data-candidate-revision="c02-current-study-v19-20260731"');
    expect(svg).toContain('data-candidate-status="installable-candidate-snapshot"');
    expect(svg).toContain('data-base-set-version="8"');
    expect(svg).toContain('data-origin-shift-x="1"');
    expect(svg).toContain('data-kerning="false"');
    expect(svg).toContain('data-per-glyph-offsets-applied="false"');
    expect(svg).toContain(
      'fill="none" stroke="#00ff00" stroke-width="1.23" stroke-linecap="round" stroke-linejoin="round" data-paint-policy="candidate-centerline-stroke"',
    );
    expect(svg).toContain(
      '<use href="#classic-book-current-candidate-g0041" transform="translate(876.48 171.52) scale(2.88 -2.88)"/>',
    );
    expect(svg).toContain(
      '<use href="#classic-book-current-candidate-g0041" transform="translate(60.48 811.52) scale(2.88 -2.88)"/>',
    );
    expect(svg).not.toMatch(/<text[\s>]/);
    expect(svg).not.toContain("<foreignObject");
  });

  it("covers the complete candidate repertoire without fallback substitution", async () => {
    const candidate = await loadCurrentCandidateFont();
    expect(supportsCurrentCandidateText(candidate, CLASSIC_BOOK_76_REPERTOIRE)).toBe(true);
    expect(supportsCurrentCandidateText(candidate, "é")).toBe(false);

    const specimen = renderCurrentCandidateLine(
      candidate,
      CLASSIC_BOOK_76_REPERTOIRE,
      {
        background: "#000000",
        stroke: "#00ff00",
      },
    );
    expect(specimen).toContain('data-candidate-revision="c02-current-study-v19-20260731"');
    expect(specimen.match(/<path /g)).toHaveLength(75);
    expect(() => renderCurrentCandidateLine(candidate, "é")).toThrow(
      /unsupported Classic Book 76 characters/,
    );
  });

  it("preserves the Fifth Set source path data and family-specific stroke contract", async () => {
    const fifthSetFont = await loadFifthSetFont("classic-compact");
    const svg = renderThoughtV2GlyphLibraryFrameStudySvg(
      fifthSetFont,
      "Question?",
      "The one that returns.",
      32,
      "#006100",
      "#00ba00",
    );
    const glyphQ = fifthSetFont.glyphs.find(({ character }) => character === "Q");
    expect(glyphQ).toBeDefined();
    expect(svg).toContain(`<path id="classic-compact-g0051" d="${glyphQ?.d}"/>`);
    expect(svg).toContain('stroke="#00ba00" stroke-width="0.78" stroke-linecap="butt" stroke-linejoin="miter"');
  });
});
