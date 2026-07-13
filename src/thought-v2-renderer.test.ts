import { describe, expect, it } from "vitest";

import {
  binaryFieldPackedHex,
  buildThoughtV2Svg,
  fixedBinaryFieldOf,
  MAX_AGENT_LINE_BYTES,
  MAX_AGENT_LINE_DISPLAY_UNITS,
  MAX_PROMPT_LINE_BYTES,
  MAX_PROMPT_LINE_DISPLAY_UNITS,
  measureThoughtV2Line,
  THOUGHT_V2_RENDER_CONTRACT,
} from "./thought-v2-renderer";

describe("thought v2 renderer", () => {
  it("renders the canonical 32x32 independently fitted interleaved field", () => {
    const svg = buildThoughtV2Svg({ promptLine: "ab", agentLine: "C" });
    const bits = fixedBinaryFieldOf("ab", "C");
    const oneCount = bits.match(/1/g)?.length ?? 0;

    expect(THOUGHT_V2_RENDER_CONTRACT.rendererId).toBe("inshell.thought.svg.v2.binary-interleave-32");
    expect(THOUGHT_V2_RENDER_CONTRACT.binaryBackground).toMatchObject({
      sourceOrder: ["promptLine", "agentLine"],
      sourceFit: "cycle-or-truncate-each-to-512-msb-first",
      interleave: "P0-A0-through-P511-A511",
      packedBytes: 128,
      layout: "fixed-32x32-row-major",
      x: 96,
      y: 96,
      width: 768,
      height: 768,
      side: 32,
      capacity: 1024,
      fill: "#006100",
      opacity: 1,
      cell: { width: 24, height: 24, oneRadius: 6, zeroRadius: 7, zeroStroke: 2 },
    });
    expect(svg).toContain('data-prompt-bit-positions="512"');
    expect(svg).toContain('data-agent-bit-positions="512"');
    expect(svg).toContain('data-pack="msb-first-128-bytes"');
    expect(svg).toContain(`data-one-cells="${oneCount}"`);
    expect(svg.match(/<use href="#binary-one"/g)).toHaveLength(oneCount);
    expect(svg).toContain('<rect id="binary-zero-field" x="96" y="96" width="768" height="768"');
    expect(svg).toContain('<rect id="agent-text-clear" x="96" y="384" width="768" height="72"');
    expect(svg).toContain('<rect id="prompt-text-clear" x="144" y="816" width="672" height="48"');
    expect(svg).not.toMatch(/[01]{8}/);
  });

  it("allocates 512 bits to each source before row-major packing", () => {
    const field = fixedBinaryFieldOf("a", "b");
    const promptCycle = "01100001";
    const agentCycle = "01100010";
    const expected = Array.from(
      { length: 512 },
      (_, index) => `${promptCycle[index % 8]}${agentCycle[index % 8]}`,
    ).join("");

    expect(field).toBe(expected);
    expect(field).toHaveLength(1024);
    expect(binaryFieldPackedHex("a", "b")).toHaveLength(258);

    const truncatedPrompt = "a".repeat(65);
    const truncated = fixedBinaryFieldOf(truncatedPrompt, "b");
    expect(truncated.slice(0, 1024).length).toBe(1024);
    expect(truncated).toBe(field);
  });

  it("uses canonical line geometry and carousels valid overflow without rewriting text", () => {
    expect(THOUGHT_V2_RENDER_CONTRACT.agentLine).toMatchObject({
      targetWidth: 768,
      defaultFontSize: 44,
      clip: { x: 96, y: 384, width: 768, height: 72, radius: 9 },
      text: { x: 480, y: 420, textAnchor: "middle", dominantBaseline: "middle" },
    });
    expect(THOUGHT_V2_RENDER_CONTRACT.promptLine).toMatchObject({
      targetWidth: 672,
      defaultFontSize: 16,
      clip: { x: 144, y: 816, width: 672, height: 48, radius: 9 },
      text: { x: 480, y: 840, textAnchor: "middle", dominantBaseline: "middle" },
    });

    const svg = buildThoughtV2Svg({ promptLine: "a".repeat(72), agentLine: "A".repeat(27) });
    expect(svg).toContain('<g id="prompt-line-carousel">');
    expect(svg).toContain('id="agent-line-text" x="480" y="420" text-anchor="middle"');
    expect(svg).toContain('<animate attributeName="x"');
    expect(svg).not.toContain("textLength=");
  });

  it("enforces exact visible UTF-8 line limits without normalization", () => {
    expect({
      promptBytes: MAX_PROMPT_LINE_BYTES,
      agentBytes: MAX_AGENT_LINE_BYTES,
      promptUnits: MAX_PROMPT_LINE_DISPLAY_UNITS,
      agentUnits: MAX_AGENT_LINE_DISPLAY_UNITS,
    }).toEqual({ promptBytes: 320, agentBytes: 180, promptUnits: 433, agentUnits: 162 });
    expect(measureThoughtV2Line("a".repeat(72), "prompt")).toMatchObject({
      byteLength: 72,
      displayUnits: 432,
      errors: [],
    });
    expect(measureThoughtV2Line("A".repeat(27), "agent")).toMatchObject({
      byteLength: 27,
      displayUnits: 162,
      errors: [],
    });
    expect(measureThoughtV2Line("a".repeat(73), "prompt").errors).toContain(
      "prompt line is 438/433 display units",
    );
    expect(measureThoughtV2Line("A".repeat(28), "agent").errors).toContain(
      "agent line is 168/162 display units",
    );
    expect(() => buildThoughtV2Svg({ promptLine: " leading", agentLine: "valid" })).toThrow(
      "invalid spacing",
    );
  });
});
