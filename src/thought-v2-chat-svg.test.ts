import { describe, expect, it } from "vitest";

import {
  buildThoughtChatSvg,
  THOUGHT_CHAT_AGENT_FIELD_Y,
  THOUGHT_CHAT_ARTBOARD,
  THOUGHT_CHAT_BACKGROUND,
  THOUGHT_CHAT_CANVAS,
  THOUGHT_CHAT_CANVAS_TRANSFORM,
  THOUGHT_CHAT_CHARACTER_ADVANCE,
  THOUGHT_CHAT_FIELD_HEIGHT,
  THOUGHT_CHAT_FIELD_WIDTH,
  THOUGHT_CHAT_FIELD_X,
  THOUGHT_CHAT_FRAME_COLOR,
  THOUGHT_CHAT_FRAME_SIZE,
  THOUGHT_CHAT_FONT_PROFILES,
  THOUGHT_CHAT_FONT_SIZE,
  THOUGHT_CHAT_GREEN,
  THOUGHT_CHAT_GREEN_CHANNEL,
  THOUGHT_CHAT_GREEN_MAX_CHANNEL,
  THOUGHT_CHAT_GREEN_MIN_CHANNEL,
  THOUGHT_CHAT_PROMPT_FIELD_Y,
  THOUGHT_CHAT_SIDE_INSET,
  THOUGHT_CHAT_SIDE_INSET_CHARACTERS,
  THOUGHT_CHAT_SOURCE_MAX_BYTES,
  thoughtChatGreenContrastOnBlack,
  thoughtChatGreenFromChannel,
  thoughtChatSvgDataUri,
} from "./thought-v2-chat-svg";

describe("THOUGHT English chat SVG foreignObject experiment", () => {
  it("renders an artifact-owned canvas frame and two frameless XHTML text fields", () => {
    const svg = buildThoughtChatSvg({
      promptLine: "Can silence carry a thought?",
      agentLine: "Only if someone listens.",
    });

    expect(svg.match(/<rect\b/g)).toHaveLength(2);
    expect(svg.match(/<foreignObject\b/g)).toHaveLength(2);
    expect(svg.match(/xmlns="http:\/\/www\.w3\.org\/1999\/xhtml"/g)).toHaveLength(2);
    expect(svg).not.toContain("<text");
    expect(svg).not.toContain("<tspan");
    expect(svg).not.toContain("<circle");
    expect(svg).not.toContain("stroke=");
    expect(svg).toContain(
      `<rect id="work-frame" width="${THOUGHT_CHAT_ARTBOARD}" height="${THOUGHT_CHAT_ARTBOARD}" fill="${THOUGHT_CHAT_FRAME_COLOR}"/>`,
    );
    expect(svg).toContain(
      `<g id="work-canvas" transform="${THOUGHT_CHAT_CANVAS_TRANSFORM}">`,
    );
    expect(svg).toContain(
      `<rect id="canvas-bg" width="${THOUGHT_CHAT_CANVAS}" height="${THOUGHT_CHAT_CANVAS}" fill="${THOUGHT_CHAT_BACKGROUND}"/>`,
    );
    expect(svg).toContain(`fill="${THOUGHT_CHAT_BACKGROUND}"`);
    expect(svg.match(new RegExp(`color:${THOUGHT_CHAT_GREEN}`, "g"))).toHaveLength(2);
    expect(svg.match(new RegExp(`font-size:${THOUGHT_CHAT_FONT_SIZE}px`, "g"))).toHaveLength(2);
  });

  it("places the unchanged 960-unit canvas inside a 32-unit outer frame", () => {
    expect(THOUGHT_CHAT_CANVAS).toBe(960);
    expect(THOUGHT_CHAT_FRAME_SIZE).toBe(32);
    expect(THOUGHT_CHAT_FRAME_COLOR).toBe("#006100");
    expect(THOUGHT_CHAT_ARTBOARD).toBe(1024);
    expect(THOUGHT_CHAT_CANVAS_TRANSFORM).toBe("translate(32 32)");
    expect(buildThoughtChatSvg({ promptLine: "Prompt", agentLine: "Agent" }))
      .not.toContain("scale(");
  });

  it("positions equal text fields at the top right and bottom left", () => {
    const svg = buildThoughtChatSvg({ promptLine: "Prompt", agentLine: "Response" });
    expect(svg).toContain(
      `<foreignObject data-line="prompt" data-font-profile="source-code-pro" x="${THOUGHT_CHAT_FIELD_X}" y="${THOUGHT_CHAT_PROMPT_FIELD_Y}" width="${THOUGHT_CHAT_FIELD_WIDTH}" height="${THOUGHT_CHAT_FIELD_HEIGHT}">`,
    );
    expect(svg).toContain(
      `<foreignObject data-line="agent" data-font-profile="source-code-pro" x="${THOUGHT_CHAT_FIELD_X}" y="${THOUGHT_CHAT_AGENT_FIELD_Y}" width="${THOUGHT_CHAT_FIELD_WIDTH}" height="${THOUGHT_CHAT_FIELD_HEIGHT}">`,
    );
    expect(svg).toContain("justify-content:flex-start");
    expect(svg).toContain("text-align:right");
    expect(svg).toContain("justify-content:flex-end");
    expect(svg).toContain("text-align:left");
  });

  it("uses two Source Code Pro character advances as each horizontal edge inset", () => {
    expect(THOUGHT_CHAT_CHARACTER_ADVANCE).toBeCloseTo(28.8, 10);
    expect(THOUGHT_CHAT_SIDE_INSET_CHARACTERS).toBe(2);
    expect(THOUGHT_CHAT_SIDE_INSET).toBeCloseTo(57.6, 10);
    expect(THOUGHT_CHAT_FIELD_X).toBe(THOUGHT_CHAT_SIDE_INSET);
    expect(THOUGHT_CHAT_FIELD_WIDTH).toBeCloseTo(844.8, 10);
    expect(THOUGHT_CHAT_FIELD_WIDTH).toBe(
      THOUGHT_CHAT_CANVAS - (2 * THOUGHT_CHAT_SIDE_INSET),
    );
  });

  it("keeps exact 64-byte plain text and delegates wrapping to CSS", () => {
    const promptLine = "p".repeat(THOUGHT_CHAT_SOURCE_MAX_BYTES);
    const agentLine = "A".repeat(THOUGHT_CHAT_SOURCE_MAX_BYTES);
    const svg = buildThoughtChatSvg({ promptLine, agentLine });

    expect(svg).toContain(`>${promptLine}</span>`);
    expect(svg).toContain(`>${agentLine}</span>`);
    expect(svg.match(/white-space:break-spaces/g)).toHaveLength(2);
    expect(svg.match(/overflow-wrap:anywhere/g)).toHaveLength(2);
    expect(svg.match(/word-break:normal/g)).toHaveLength(2);
    expect(svg.match(/hyphens:none/g)).toHaveLength(2);
  });

  it("escapes exact approved text into valid XHTML inside SVG", () => {
    const svg = buildThoughtChatSvg({ promptLine: "A & B", agentLine: `"yes"` });
    expect(svg).toContain("A &amp; B");
    expect(svg).toContain("&quot;yes&quot;");
  });

  it("fixes and embeds Source Code Pro into both XHTML fields", () => {
    const svg = buildThoughtChatSvg({
      promptLine: "Can you hear me?",
      agentLine: "Yes. The words stay the same.",
    });
    expect(svg).toContain('data-font-profile="source-code-pro"');
    expect(
      svg.match(new RegExp(`font-family:${THOUGHT_CHAT_FONT_PROFILES["source-code-pro"].family}`, "g")),
    ).toHaveLength(2);
    expect(svg).toContain("@font-face{font-family:'THOUGHT Source Code Pro'");
    expect(svg).toMatch(/src:url\('data:font\/woff2;base64,/);
  });

  it("renders a deterministic pure-green contrast range", () => {
    expect(thoughtChatGreenFromChannel(THOUGHT_CHAT_GREEN_MIN_CHANNEL)).toBe("#006100");
    expect(thoughtChatGreenFromChannel(THOUGHT_CHAT_GREEN_CHANNEL)).toBe(THOUGHT_CHAT_GREEN);
    expect(thoughtChatGreenFromChannel(THOUGHT_CHAT_GREEN_MAX_CHANNEL)).toBe("#00ff00");
    expect(thoughtChatGreenContrastOnBlack(THOUGHT_CHAT_GREEN_MIN_CHANNEL)).toBeCloseTo(2.71, 2);
    expect(thoughtChatGreenContrastOnBlack(THOUGHT_CHAT_GREEN_CHANNEL)).toBeCloseTo(8.02, 2);
    expect(thoughtChatGreenContrastOnBlack(THOUGHT_CHAT_GREEN_MAX_CHANNEL)).toBeCloseTo(15.3, 1);

    const svg = buildThoughtChatSvg({
      promptLine: "Raise the contrast?",
      agentLine: "Keep the green pure.",
      greenChannel: 0xc0,
    });
    expect(svg).toContain('data-green="#00c000"');
    expect(svg.match(/color:#00c000/g)).toHaveLength(2);
    expect(() => thoughtChatGreenFromChannel(256)).toThrow("integer from 0 through 255");
  });

  it("encodes the exact raw SVG as a contract-like base64 data image", () => {
    const svg = buildThoughtChatSvg({ promptLine: "...?", agentLine: "...!" });
    const uri = thoughtChatSvgDataUri(svg);
    expect(uri).toMatch(/^data:image\/svg\+xml;base64,/);
    const decoded = new TextDecoder().decode(
      Uint8Array.from(atob(uri.slice(uri.indexOf(",") + 1)), (character) => character.charCodeAt(0)),
    );
    expect(decoded).toBe(svg);
  });

  it("rejects empty, Unicode, invalid spacing, and over-64-byte source lines", () => {
    expect(() => buildThoughtChatSvg({ promptLine: "", agentLine: "Agent" })).toThrow(
      "prompt line is empty",
    );
    expect(() => buildThoughtChatSvg({ promptLine: " Prompt", agentLine: "Agent" })).toThrow(
      "prompt line has an outer space",
    );
    expect(() => buildThoughtChatSvg({ promptLine: "Two  spaces", agentLine: "Agent" })).toThrow(
      "prompt line has repeated internal spaces",
    );
    expect(() => buildThoughtChatSvg({ promptLine: "café", agentLine: "Agent" })).toThrow(
      "prompt line contains unsupported U+00E9",
    );
    expect(() =>
      buildThoughtChatSvg({ promptLine: "a".repeat(65), agentLine: "Agent" }),
    ).toThrow("prompt line is 65/64 bytes");
  });
});
