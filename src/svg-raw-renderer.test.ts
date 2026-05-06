import { describe, expect, it } from "vitest";

import { buildThoughtRawSvg, canonicalThoughtText } from "./svg-raw-renderer";

describe("svg raw renderer", () => {
  it("canonicalizes input like the contract preview rules", () => {
    expect(canonicalThoughtText("  c,a!! t  ")).toBe("C A T");
  });

  it("renders contract-faithful Source Code Pro SVG for three letters", () => {
    const svg = buildThoughtRawSvg({ text: "CAT", tokenId: 1 });

    expect(svg).toContain('viewBox="0 0 960 960"');
    expect(svg).toContain('preserveAspectRatio="xMidYMid meet"');
    expect(svg).toContain('<title>THOUGHT 1</title>');
    expect(svg).toContain('<rect id="background" x="0" y="0" width="960" height="960" fill="#050505"/>');
    expect(svg).toContain('<g id="rects">');
    expect(svg).toContain('<g id="text">');
    expect(svg).toContain('fill="#fff"');
    expect(svg).toContain('fill-opacity=".72"');
    expect(svg).toContain('font-family="Source Code Pro, monospace"');
    expect(svg).toContain('font-weight="200"');
    expect(svg).toContain('<rect x="430" y="465" width="29" height="29" fill="#6f4e37"/>');
    expect(svg).toContain('<rect x="465" y="465" width="29" height="29" fill="#00ffff"/>');
    expect(svg).toContain('<rect x="500" y="465" width="29" height="29" fill="#008080"/>');
    expect(svg).toContain(">CAT</text>");
  });
});
