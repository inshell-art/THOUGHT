import { describe, expect, it } from "vitest";

import {
  buildThoughtV2Svg,
  fixedBinaryFieldOf,
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
    expect(THOUGHT_V2_RENDER_CONTRACT.binaryBackground.zeroRendering).toBe("static-pattern-with-one-overlays");
    expect(THOUGHT_V2_RENDER_CONTRACT.binaryBackground.clearStrategy).toBe("canvas-color-text-rectangles");
    expect(THOUGHT_V2_RENDER_CONTRACT.binaryBackground.cell).toMatchObject({
      mode: "square-grid-fit",
      radiusMode: "percentage-of-square-cell",
      radiusFormula: "ceil(cellSize * dotRadiusRatio)",
      dotRadiusRatio: 5 / 14,
    });
    expect(THOUGHT_V2_RENDER_CONTRACT.binaryBackground.fill).toBe("#006100");
    expect(THOUGHT_V2_RENDER_CONTRACT.binaryBackground.opacity).toBe(1);
    expect(THOUGHT_V2_RENDER_CONTRACT.canvas.defaultBg).toBe("#050505");
    expect(THOUGHT_V2_RENDER_CONTRACT.agentLine).toMatchObject({
      targetWidth: 820,
      defaultFontSize: 118,
      minFontSize: 48,
      text: { x: 480, y: 420 },
    });
    expect(THOUGHT_V2_RENDER_CONTRACT.promptLine).toMatchObject({
      targetWidth: 820,
      defaultFontSize: 34,
      minFontSize: 18,
      text: { x: 480, y: 830 },
    });
    expect(background).toContain('opacity="1.00"');
    expect(background).toContain('data-zero="hollow-circle"');
    expect(background).toContain('data-fill-rule="repeat-short-truncate-long"');
    expect(background).toContain('data-rendered-cells="892"');
    expect(background).toContain('data-cleared-cells="132"');
    expect(background).toContain(`data-one-cells="${expectedOneCount}"`);
    expect(background).toContain(`data-zero-cells="${expectedZeroCount}"`);
    expect(canvasIndex).toBeGreaterThan(-1);
    expect(backgroundIndex).toBeGreaterThan(canvasIndex);
    expect(svg).not.toContain('id="work-frame"');
    expect(svg).not.toContain('id="work-canvas"');
    expect(svg).not.toContain('id="agent-line-bg"');
    expect(svg).not.toContain('id="prompt-line-bg"');
    expect(svg).not.toContain("<clipPath");
    expect(svg).not.toContain("<animate");
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
    expect(background).toContain('id="binary-zero-pattern" x="32" y="32" width="28" height="28"');
    expect(background).toContain('<circle id="binary-zero" cx="14" cy="14" r="10" fill="none" stroke="#006100" stroke-width="1"/>');
    expect(background).toContain('<rect id="binary-zero-field" x="32" y="32" width="896" height="896" fill="url(#binary-zero-pattern)"/>');
    expect(background).toContain('<rect id="agent-text-clear" x="93" y="373" width="774" height="74" fill="#050505"/>');
    expect(background).toContain('<rect id="prompt-text-clear" x="149" y="821" width="662" height="46" fill="#050505"/>');
    expect(circles).toHaveLength(expectedOneCount);
    expect(Array.from(background.matchAll(/<use href="#binary-one/g))).toHaveLength(expectedOneCount);
    expect(firstCircleIndex).toBe(expectedFirstOneIndex);
    expect(longCellSize).toBe(grid.cellSize);
    expect(longSourceBitCount).toBe(576);
    expect(longBackground).toContain('data-rendered-cells="892"');
    expect(longBackground).toContain('data-one-cells="');
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
});
