import { describe, expect, it } from "vitest";

import { buildThoughtV2Svg, THOUGHT_V2_RENDER_CONTRACT } from "./thought-v2-renderer";

describe("thought v2 renderer", () => {
  it("lays out prompt bytes before agent bytes in the binary canvas background", () => {
    const svg = buildThoughtV2Svg({
      promptLine: "ab",
      agentLine: "C",
    });

    const canvasIndex = svg.indexOf('id="canvas-bg"');
    const backgroundIndex = svg.indexOf('id="binary-background"');
    const agentIndex = svg.indexOf('id="agent-line-area"');
    const background = svg.slice(backgroundIndex, agentIndex);
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
    const rings = Array.from(
      background.matchAll(/<use href="#binary-zero" x="(\d+)" y="(\d+)"\/>/g),
    ).map((match) => ({
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
    const denseSvg = buildThoughtV2Svg({
      promptLine: "a".repeat(120),
      agentLine: "B".repeat(40),
    });
    const denseBackground = denseSvg.slice(
      denseSvg.indexOf('id="binary-background"'),
      denseSvg.indexOf('id="agent-line-area"'),
    );
    const denseCellSize = Number(denseBackground.match(/data-cell-size="(\d+)"/)?.[1]);
    const longSvg = buildThoughtV2Svg({
      promptLine: "a".repeat(140),
      agentLine: "B".repeat(20),
    });
    const longBackground = longSvg.slice(
      longSvg.indexOf('id="binary-background"'),
      longSvg.indexOf('id="agent-line-area"'),
    );
    const longSourceBitCount = Number(longBackground.match(/data-source-bit-count="(\d+)"/)?.[1]);
    const longCellSize = Number(longBackground.match(/data-cell-size="(\d+)"/)?.[1]);

    expect(THOUGHT_V2_RENDER_CONTRACT.binaryBackground.sourceOrder).toEqual(["promptLine", "agentLine"]);
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
    expect(THOUGHT_V2_RENDER_CONTRACT.binaryBackground.cell).toMatchObject({
      mode: "square-grid-fit",
      radiusMode: "percentage-of-square-cell",
      radiusFormula: "ceil(cellSize * dotRadiusRatio)",
      dotRadiusRatio: 5 / 14,
    });
    expect(THOUGHT_V2_RENDER_CONTRACT.binaryBackground.fill).toBe("#006100");
    expect(THOUGHT_V2_RENDER_CONTRACT.binaryBackground.opacity).toBe(1);
    expect(background).toContain('opacity="1.00"');
    expect(background).toContain('data-zero="hollow-circle"');
    expect(background).toContain('data-fill-rule="repeat-short-truncate-long"');
    expect(background).toContain('data-rendered-cells="892"');
    expect(background).toContain('data-cleared-cells="132"');
    expect(canvasIndex).toBeGreaterThan(-1);
    expect(backgroundIndex).toBeGreaterThan(canvasIndex);
    expect(agentIndex).toBeGreaterThan(backgroundIndex);
    expect(svg).not.toContain('id="work-frame"');
    expect(svg).not.toContain('id="work-canvas"');
    expect(svg).not.toContain('id="agent-line-bg"');
    expect(svg).not.toContain('id="prompt-line-bg"');
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
    expect(rings).toHaveLength(expectedZeroCount);
    expect(Array.from(background.matchAll(/<use href="#binary-/g))).toHaveLength(892);
    expect(firstCircleIndex).toBe(expectedFirstOneIndex);
    expect(denseCellSize).toBe(grid.cellSize);
    expect(longCellSize).toBe(grid.cellSize);
    expect(longSourceBitCount).toBeGreaterThan(1024);
    expect(Array.from(longBackground.matchAll(/<use href="#binary-/g))).toHaveLength(892);
    expect(background).toContain("<use ");
    expect(background).not.toContain('xml:space="preserve"');
    expect(background).not.toContain("&#9679;");
    expect(background).not.toMatch(/[01]{8}/);
  });
});
