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
      cellSize: Number(background.match(/data-cell-size="(\d+)"/)?.[1]),
      originX: Number(background.match(/data-origin-x="(\d+)"/)?.[1]),
      originY: Number(background.match(/data-origin-y="(\d+)"/)?.[1]),
      dotRadius: Number(background.match(/data-dot-radius="(\d+)"/)?.[1]),
    };
    const circles = Array.from(background.matchAll(/<circle cx="(\d+)" cy="(\d+)" r="(\d+)"\/>/g)).map((match) => ({
      cx: Number(match[1]),
      cy: Number(match[2]),
      r: Number(match[3]),
    }));
    const rings = Array.from(
      background.matchAll(/<circle cx="(\d+)" cy="(\d+)" r="(\d+)" fill="none" stroke="#006100" stroke-width="1"\/>/g),
    ).map((match) => ({
      cx: Number(match[1]),
      cy: Number(match[2]),
      r: Number(match[3]),
    }));
    const expectedBinary = "011000010110001001000011";
    const expectedOneCount = expectedBinary.match(/1/g)?.length ?? 0;
    const expectedZeroCount = expectedBinary.length - expectedOneCount;
    const expectedFirstOneIndex = expectedBinary.indexOf("1");
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

    expect(THOUGHT_V2_RENDER_CONTRACT.binaryBackground.sourceOrder).toEqual(["promptLine", "agentLine"]);
    expect(THOUGHT_V2_RENDER_CONTRACT.binaryBackground.layout).toBe("one-pass-square-cell-grid");
    expect(THOUGHT_V2_RENDER_CONTRACT.binaryBackground.maxRows).toBe(48);
    expect(THOUGHT_V2_RENDER_CONTRACT.binaryBackground.width).toBe(864);
    expect(THOUGHT_V2_RENDER_CONTRACT.binaryBackground.height).toBe(846);
    expect(THOUGHT_V2_RENDER_CONTRACT.binaryBackground.glyphs).toMatchObject({
      one: "circle",
      zero: "hollow circle",
    });
    expect(THOUGHT_V2_RENDER_CONTRACT.binaryBackground.cell).toMatchObject({
      mode: "square-grid-fit",
      radiusMode: "percentage-of-square-cell",
      radiusFormula: "ceil(cellSize * dotRadiusRatio)",
      dotRadiusRatio: 0.32,
    });
    expect(THOUGHT_V2_RENDER_CONTRACT.binaryBackground.fill).toBe("#006100");
    expect(THOUGHT_V2_RENDER_CONTRACT.binaryBackground.opacity).toBe(0.5);
    expect(background).toContain('opacity="0.50"');
    expect(background).toContain('data-zero="hollow-circle"');
    expect(canvasIndex).toBeGreaterThan(-1);
    expect(backgroundIndex).toBeGreaterThan(canvasIndex);
    expect(agentIndex).toBeGreaterThan(backgroundIndex);
    expect(svg).toContain('id="agent-line-bg"');
    expect(svg).toContain('id="prompt-line-bg"');
    expect(svg).toContain('fill="none" stroke="#ffffff"');
    expect(grid).toMatchObject({ columns: 5, rows: 5, cellSize: 169, originX: 57, originY: 57, dotRadius: 55 });
    expect(circles).toHaveLength(expectedOneCount);
    expect(rings).toHaveLength(expectedZeroCount);
    expect(Array.from(background.matchAll(/<circle /g))).toHaveLength(expectedBinary.length);
    expect(firstCircleIndex).toBe(expectedFirstOneIndex);
    expect(denseCellSize).toBeLessThan(grid.cellSize);
    expect(background).toContain("<circle ");
    expect(background).not.toContain('xml:space="preserve"');
    expect(background).not.toContain("&#9679;");
    expect(background).not.toMatch(/[01]{8}/);
  });
});
