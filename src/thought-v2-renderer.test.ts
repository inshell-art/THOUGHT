import { describe, expect, it } from "vitest";

import {
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
  it("lays out prompt bytes before agent bytes in the binary canvas background", () => {
    const svg = buildThoughtV2Svg({
      promptLine: "ab",
      agentLine: "C",
    });

    const canvasIndex = svg.indexOf('id="canvas-bg"');
    const backgroundIndex = svg.indexOf('id="binary-background"');
    const background = svg.slice(backgroundIndex, svg.indexOf("</g>", backgroundIndex) + 4);
    const grid = {
      columns: Number(background.match(/data-grid-columns="(\d+)"/)?.[1]),
      rows: Number(background.match(/data-grid-rows="(\d+)"/)?.[1]),
      capacity: Number(background.match(/data-bit-capacity="(\d+)"/)?.[1]),
      sourceBitCount: Number(background.match(/data-source-bit-count="(\d+)"/)?.[1]),
      cellSize: Number(background.match(/data-cell-size="(\d+)"/)?.[1]),
      originX: Number(background.match(/data-origin-x="(\d+)"/)?.[1]),
      originY: Number(background.match(/data-origin-y="(\d+)"/)?.[1]),
      dotRadius: Number(background.match(/data-dot-radius="(\d+)"/)?.[1]),
    };
    const circles = Array.from(background.matchAll(/<use href="#binary-one" x="(\d+)" y="(\d+)"\/>/g)).map((match) => ({
      cx: Number(match[1]),
      cy: Number(match[2]),
    }));
    const sourceBinary = "011000010110001001000011";
    const expectedBinary = Array.from({ length: 1024 }, (_, index) => sourceBinary[index % sourceBinary.length]).join("");
    const isCleared = (index: number): boolean => {
      const row = Math.floor(index / 32);
      const column = index % 32;
      return (
        (row >= 12 && row <= 14 && column >= 2 && column <= 29) ||
        (row >= 28 && row <= 29 && column >= 4 && column <= 27)
      );
    };
    const expectedVisibleBinary = expectedBinary
      .split("")
      .filter((_, index) => !isCleared(index))
      .join("");
    const expectedOneCount = expectedVisibleBinary.match(/1/g)?.length ?? 0;
    const expectedZeroCount = expectedVisibleBinary.length - expectedOneCount;
    const expectedFirstOneIndex = sourceBinary.indexOf("1");
    const firstCircle = circles[0];
    const firstCircleIndex =
      Math.floor((firstCircle.cy - grid.originY) / grid.cellSize) * grid.columns +
      Math.floor((firstCircle.cx - grid.originX) / grid.cellSize);
    const longSvg = buildThoughtV2Svg({
      promptLine: "a".repeat(54),
      agentLine: "B".repeat(18),
    });
    const longBackground = longSvg.slice(
      longSvg.indexOf('id="binary-background"'),
      longSvg.indexOf("</g>", longSvg.indexOf('id="binary-background"')) + 4,
    );
    const longSourceBitCount = Number(longBackground.match(/data-source-bit-count="(\d+)"/)?.[1]);
    const longCellSize = Number(longBackground.match(/data-cell-size="(\d+)"/)?.[1]);

    expect(THOUGHT_V2_RENDER_CONTRACT.binaryBackground.sourceOrder).toEqual(["promptLine", "agentLine"]);
    expect(THOUGHT_V2_RENDER_CONTRACT.rendererId).toBe("thought.svg.v2.fixed-a-32");
    expect(THOUGHT_V2_RENDER_CONTRACT.binaryBackground.layout).toBe("fixed-capacity-square-matrix");
    expect(THOUGHT_V2_RENDER_CONTRACT.binaryBackground.width).toBe(896);
    expect(THOUGHT_V2_RENDER_CONTRACT.binaryBackground.height).toBe(896);
    expect(THOUGHT_V2_RENDER_CONTRACT.binaryBackground.side).toBe(32);
    expect(THOUGHT_V2_RENDER_CONTRACT.binaryBackground.capacity).toBe(1024);
    expect(THOUGHT_V2_RENDER_CONTRACT.binaryBackground.fillRule).toBe("repeat-short-truncate-long");
    expect(THOUGHT_V2_RENDER_CONTRACT.binaryBackground.glyphs).toMatchObject({
      one: "circle",
      zero: "hollow circle",
    });
    expect(THOUGHT_V2_RENDER_CONTRACT.binaryBackground.zeroRendering).toBe("individual-circle-uses");
    expect(THOUGHT_V2_RENDER_CONTRACT.binaryBackground.clearStrategy).toBe("omit-text-block-cells");
    expect(THOUGHT_V2_RENDER_CONTRACT.binaryBackground.cell).toMatchObject({
      mode: "square-grid-fit",
      radiusMode: "percentage-of-square-cell",
      radiusFormula: "ceil(cellSize * dotRadiusRatio)",
      dotRadiusRatio: 5 / 14,
    });
    expect(THOUGHT_V2_RENDER_CONTRACT.binaryBackground.fill).toBe("#006100");
    expect(THOUGHT_V2_RENDER_CONTRACT.binaryBackground.opacity).toBe(1);
    expect(THOUGHT_V2_RENDER_CONTRACT.canvas.defaultBg).toBe("#000000");
    expect(THOUGHT_V2_RENDER_CONTRACT.agentLine).toMatchObject({
      targetWidth: 772,
      defaultFontSize: 44,
      minFontSize: 44,
      clip: { x: 94, y: 373, width: 772, height: 74, radius: 9 },
      text: { x: 480, y: 410 },
    });
    expect(THOUGHT_V2_RENDER_CONTRACT.promptLine).toMatchObject({
      targetWidth: 660,
      defaultFontSize: 16,
      minFontSize: 16,
      clip: { x: 150, y: 821, width: 660, height: 46, radius: 9 },
      text: { x: 480, y: 844 },
    });
    expect(background).toContain('opacity="1.00"');
    expect(background).toContain('data-zero="hollow-circle"');
    expect(background).toContain('data-fill-rule="repeat-short-truncate-long"');
    expect(background).toContain('data-rendered-cells="892"');
    expect(background).toContain('data-cleared-cells="132"');
    expect(canvasIndex).toBeGreaterThan(-1);
    expect(backgroundIndex).toBeGreaterThan(canvasIndex);
    expect(svg).not.toContain('id="work-frame"');
    expect(svg).not.toContain('id="work-canvas"');
    expect(svg).not.toContain('id="agent-line-bg"');
    expect(svg).not.toContain('id="prompt-line-bg"');
    expect(svg).toContain('<clipPath id="agent-line-clip">');
    expect(svg).toContain('<clipPath id="prompt-line-clip">');
    expect(grid).toMatchObject({
      columns: 32,
      rows: 32,
      capacity: 1024,
      sourceBitCount: 24,
      cellSize: 28,
      originX: 32,
      originY: 32,
      dotRadius: 10,
    });
    expect(background).toContain('<circle id="binary-one" r="10" fill="#006100"/>');
    expect(background).toContain('<circle id="binary-zero" r="10" fill="none" stroke="#006100" stroke-width="1"/>');
    expect(circles).toHaveLength(expectedOneCount);
    expect(Array.from(background.matchAll(/<use href="#binary-zero/g))).toHaveLength(expectedZeroCount);
    expect(Array.from(background.matchAll(/<use href="#binary-/g))).toHaveLength(892);
    expect(firstCircleIndex).toBe(expectedFirstOneIndex);
    expect(longCellSize).toBe(grid.cellSize);
    expect(longSourceBitCount).toBe(576);
    expect(longBackground).toContain('data-rendered-cells="892"');
    expect(background).toContain("<use ");
    expect(background).not.toContain('xml:space="preserve"');
    expect(background).not.toContain("&#9679;");
    expect(background).not.toMatch(/[01]{8}/);
  });

  it("derives the exact fixed 1024-bit field for provenance and contract verification", () => {
    const cycle = "0110000101100010";
    const field = fixedBinaryFieldOf("a", "b");

    expect(field).toHaveLength(1024);
    expect(field).toBe(cycle.repeat(64));

    const truncated = fixedBinaryFieldOf("a".repeat(128), "b");
    expect(truncated).toHaveLength(1024);
    expect(truncated).toBe("01100001".repeat(128));
  });

  it("enforces the shared visible-line byte and display-unit limits at renderer boundaries", () => {
    const promptAtLimit = measureThoughtV2Line("a".repeat(72), "prompt");
    const agentAtLimit = measureThoughtV2Line("A".repeat(27), "agent");
    const promptTooWide = measureThoughtV2Line("a".repeat(73), "prompt");
    const agentTooWide = measureThoughtV2Line("A".repeat(28), "agent");
    const promptWideScript = measureThoughtV2Line("你".repeat(43), "prompt");
    const agentWideScript = measureThoughtV2Line("好".repeat(16), "agent");

    expect({
      promptBytes: MAX_PROMPT_LINE_BYTES,
      agentBytes: MAX_AGENT_LINE_BYTES,
      promptUnits: MAX_PROMPT_LINE_DISPLAY_UNITS,
      agentUnits: MAX_AGENT_LINE_DISPLAY_UNITS,
    }).toEqual({ promptBytes: 320, agentBytes: 180, promptUnits: 433, agentUnits: 162 });
    expect(promptAtLimit).toMatchObject({ byteLength: 72, displayUnits: 432, errors: [] });
    expect(agentAtLimit).toMatchObject({ byteLength: 27, displayUnits: 162, errors: [] });
    expect(promptTooWide.errors).toContain("prompt line is 438/433 display units");
    expect(agentTooWide.errors).toContain("agent line is 168/162 display units");
    expect(promptWideScript).toMatchObject({ byteLength: 129, displayUnits: 430, errors: [] });
    expect(agentWideScript).toMatchObject({ byteLength: 48, displayUnits: 160, errors: [] });
    expect(measureThoughtV2Line("line\nbreak", "agent").errors).not.toHaveLength(0);
    expect(measureThoughtV2Line("line\tbreak", "prompt").errors).not.toHaveLength(0);

    const svg = buildThoughtV2Svg({ promptLine: "a".repeat(72), agentLine: "A".repeat(27) });
    expect(svg).toContain('font-size="44" fill="#ffffff" clip-path="url(#agent-line-clip)"');
    expect(svg).toContain('font-size="16" fill="#ffffff" clip-path="url(#prompt-line-clip)"');
    expect(svg).toContain('<g id="prompt-line-carousel">');
    expect(svg).toContain('<animate attributeName="x"');
  });
});
