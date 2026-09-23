import { describe, expect, it } from "vitest";

import { thoughtV2TextFixtures } from "./thought-v2-fixtures";
import {
  binaryFieldPackedHex,
  buildThoughtV2Svg,
  fixedBinaryFieldOf,
  MAX_AGENT_LINE_BYTES,
  MAX_PROMPT_LINE_BYTES,
  measureThoughtV2Line,
  THOUGHT_V2_RENDER_CONTRACT,
} from "./thought-v2-renderer";

describe("THOUGHT binary-weave attempt renderer", () => {
  it("renders the canonical 32x32 orthogonal binary weave", () => {
    const svg = buildThoughtV2Svg({ promptLine: "ab", agentLine: "C" });
    const bits = fixedBinaryFieldOf("ab", "C");
    const isCleared = (index: number): boolean => {
      const row = Math.floor(index / 32);
      const column = index % 32;
      return (
        (row >= 12 && row <= 14 && column >= 2 && column <= 29) ||
        (row >= 28 && row <= 29 && column >= 4 && column <= 27)
      );
    };
    const visibleBits = bits.split("").filter((_, index) => !isCleared(index));
    const oneCount = visibleBits.filter((bit) => bit === "1").length;
    const zeroCount = visibleBits.length - oneCount;

    expect(THOUGHT_V2_RENDER_CONTRACT.rendererId).toBe("inshell.thought.svg.v2.binary-weave-32");
    expect(THOUGHT_V2_RENDER_CONTRACT.binaryBackground).toMatchObject({
      sourceOrder: ["promptLine", "agentLine"],
      sourceFit: "cycle-exact-utf8-to-64-bytes-msb-first",
      interleave: "checkerboard-prompt-horizontal-agent-vertical",
      packedBytes: 128,
      layout: "fixed-32x32-row-major",
      x: 32,
      y: 32,
      width: 896,
      height: 896,
      side: 32,
      capacity: 1024,
      fill: "#006100",
      opacity: 1,
      cell: { width: 28, height: 28, oneRadius: 10, zeroRadius: 10, zeroStroke: 1 },
    });
    expect(svg).toContain('data-prompt-bit-positions="512"');
    expect(svg).toContain('data-agent-bit-positions="512"');
    expect(svg).toContain('data-pack="msb-first-128-bytes"');
    expect(svg).toContain(`data-one-cells="${oneCount}"`);
    expect(svg.match(/<use href="#binary-one"/g)).toHaveLength(oneCount);
    expect(svg).toContain(`data-zero-cells="${zeroCount}"`);
    expect(svg).toContain('data-rendered-cells="892"');
    expect(svg).toContain('data-cleared-cells="132"');
    expect(svg).toContain('<rect id="binary-zero-field" x="32" y="32" width="896" height="896"');
    expect(svg).toContain('<rect id="agent-text-clear" x="92" y="372" width="776" height="76"');
    expect(svg).toContain('<rect id="prompt-text-clear" x="148" y="820" width="664" height="48"');
    expect(svg).not.toMatch(/[01]{8}/);
  });

  it("places prompt bits horizontally and Agent bits vertically", () => {
    const field = fixedBinaryFieldOf("a", "b");
    const promptCycle = "01100001";
    const agentCycle = "01100010";
    let expected = "";
    for (let row = 0; row < 32; row += 1) {
      for (let column = 0; column < 32; column += 1) {
        expected += (row + column) % 2 === 0
          ? promptCycle[(row * 16 + Math.floor(column / 2)) % 8]
          : agentCycle[(column * 16 + Math.floor(row / 2)) % 8];
      }
    }

    expect(field).toBe(expected);
    expect(field).toHaveLength(1024);
    expect(binaryFieldPackedHex("a", "b")).toHaveLength(258);

    expect(() => fixedBinaryFieldOf("a".repeat(65), "b")).toThrow("prompt line is 65/64 bytes");
  });

  it("uses canonical line geometry and carousels valid overflow without rewriting text", () => {
    expect(THOUGHT_V2_RENDER_CONTRACT.agentLine).toMatchObject({
      targetWidth: 772,
      carouselActivationWidth: 672,
      defaultFontSize: 44,
      clip: { x: 94, y: 373, width: 772, height: 74, radius: 9 },
      text: { x: 480, y: 410, textAnchor: "middle", dominantBaseline: "middle" },
    });
    expect(THOUGHT_V2_RENDER_CONTRACT.promptLine).toMatchObject({
      targetWidth: 660,
      defaultFontSize: 16,
      clip: { x: 150, y: 821, width: 660, height: 46, radius: 9 },
      text: { x: 480, y: 844, textAnchor: "middle", dominantBaseline: "middle" },
    });

    const svg = buildThoughtV2Svg({ promptLine: "a".repeat(64), agentLine: "A".repeat(64) });
    expect(svg).toContain('<g id="agent-line-carousel">');
    expect(svg).not.toContain('<g id="prompt-line-carousel">');
    expect(svg).toContain('<animate attributeName="x"');
    expect(svg).not.toContain("textLength=");
  });

  it("keeps short Agent lines static while making legal long Agent lines move", () => {
    const shortSvg = buildThoughtV2Svg({ promptLine: "short", agentLine: "A".repeat(25) });
    const longSvg = buildThoughtV2Svg({ promptLine: "short", agentLine: "A".repeat(27) });

    expect(shortSvg).not.toContain('<g id="agent-line-carousel">');
    expect(longSvg).toContain('<g id="agent-line-carousel">');
    expect(longSvg).not.toContain('<g id="prompt-line-carousel">');
  });

  it("enforces exact visible UTF-8 line limits without normalization", () => {
    expect({
      promptBytes: MAX_PROMPT_LINE_BYTES,
      agentBytes: MAX_AGENT_LINE_BYTES,
    }).toEqual({ promptBytes: 64, agentBytes: 64 });
    expect(measureThoughtV2Line("a".repeat(64), "prompt")).toMatchObject({
      byteLength: 64,
      displayUnits: 384,
      errors: [],
    });
    expect(measureThoughtV2Line("A".repeat(64), "agent")).toMatchObject({
      byteLength: 64,
      displayUnits: 384,
      errors: [],
    });
    expect(measureThoughtV2Line("a".repeat(65), "prompt").errors).toContain(
      "prompt line is 65/64 bytes",
    );
    expect(measureThoughtV2Line("A".repeat(65), "agent").errors).toContain(
      "agent line is 65/64 bytes",
    );
    expect(measureThoughtV2Line("A  B", "agent").errors).toEqual([]);
    expect(() => buildThoughtV2Svg({ promptLine: " leading", agentLine: "valid" })).toThrow(
      "invalid spacing",
    );
  });

  it("keeps the boundary fixture works exactly at the 64-byte limits", () => {
    const boundaryFixtures = thoughtV2TextFixtures.filter(
      (fixture) => fixture.corpusId === "exact-64-byte-limits",
    );

    expect(boundaryFixtures).toHaveLength(3);
    boundaryFixtures.forEach((fixture) => {
      expect(measureThoughtV2Line(fixture.promptLine, "prompt")).toMatchObject({
        byteLength: MAX_PROMPT_LINE_BYTES,
        errors: [],
      });
      expect(measureThoughtV2Line(fixture.agentLine, "agent")).toMatchObject({
        byteLength: MAX_AGENT_LINE_BYTES,
        errors: [],
      });
      expect(() => buildThoughtV2Svg(fixture)).not.toThrow();
    });
  });
});
