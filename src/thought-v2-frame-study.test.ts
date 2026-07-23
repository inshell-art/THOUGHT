import { describe, expect, it } from "vitest";

import {
  normalizeThoughtV2FrameColor,
  renderThoughtV2OuterFrameStudySvg,
  THOUGHT_V2_FRAME_STUDY_CANVAS_SIZE,
  THOUGHT_V2_FRAME_STUDY_DEFAULT_COLOR,
  THOUGHT_V2_FRAME_STUDY_DEFAULT_WIDTH,
  thoughtV2FrameContrastOnBlack,
  thoughtV2FrameStudyGeometry,
} from "./thought-v2-frame-study";

const sourceSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 960 960" width="960" height="960">
  <style>.line{color:#00ba00}</style>
  <rect id="work-frame" width="960" height="960" fill="#202020"/>
  <g id="work-canvas" transform="translate(16 16) scale(0.9666666666666667)">
    <rect id="canvas-bg" width="960" height="960" fill="#000000"/>
    <foreignObject class="line" width="100" height="100"/>
  </g>
</svg>`;

describe("THOUGHT V2 outside-frame study", () => {
  it("keeps the inner canvas at exactly 960 while expanding the artboard", () => {
    const geometry = thoughtV2FrameStudyGeometry(32);
    expect(geometry).toEqual({
      artboardSize: 1024,
      canvasSize: THOUGHT_V2_FRAME_STUDY_CANVAS_SIZE,
      canvasTransform: "translate(32 32)",
      frameWidth: 32,
    });
  });

  it("rebuilds the current inner frame as an outer frame without scale", () => {
    const svg = renderThoughtV2OuterFrameStudySvg(
      sourceSvg,
      THOUGHT_V2_FRAME_STUDY_DEFAULT_WIDTH,
      THOUGHT_V2_FRAME_STUDY_DEFAULT_COLOR,
    );

    expect(svg).toContain('viewBox="0 0 1024 1024"');
    expect(svg).toContain('width="1024" height="1024"');
    expect(svg).toContain('data-frame-study="outer-canvas"');
    expect(svg).toContain('data-frame-width="32"');
    expect(svg).toContain('data-canvas-size="960"');
    expect(svg).toContain(
      '<rect id="work-frame" width="1024" height="1024" fill="#404040"/>',
    );
    expect(svg).toContain('<g id="work-canvas" transform="translate(32 32)">');
    expect(svg).toContain(
      '<rect id="canvas-bg" width="960" height="960" fill="#000000"/>',
    );
    expect(svg).not.toContain("scale(");
    expect(svg.match(/id="work-frame"/g)).toHaveLength(1);
    expect(svg).toContain("<style>.line{color:#00ba00}</style>");
  });

  it("clamps the study width but never changes the 960 canvas", () => {
    expect(thoughtV2FrameStudyGeometry(-10).frameWidth).toBe(0);
    expect(thoughtV2FrameStudyGeometry(900)).toEqual({
      artboardSize: 1216,
      canvasSize: 960,
      canvasTransform: "translate(128 128)",
      frameWidth: 128,
    });
  });

  it("accepts exact hex colors and reports their contrast against black", () => {
    expect(normalizeThoughtV2FrameColor(" #4D4D4D ")).toBe("#4d4d4d");
    expect(thoughtV2FrameContrastOnBlack("#202020")).toBeCloseTo(1.288, 2);
    expect(thoughtV2FrameContrastOnBlack("#4d4d4d")).toBeCloseTo(2.485, 2);
    expect(() => normalizeThoughtV2FrameColor("#fff")).toThrow(
      "six-digit hex color",
    );
  });
});
