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
import { beforeAll, describe, expect, it } from "vitest";

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
});
