import { Buffer } from "node:buffer";

import { describe, expect, it } from "vitest";

import {
  parseEmbeddedJsonDataUri,
  parseEmbeddedSvgDataUri,
  traitValue,
  type ThoughtV2OnchainToken,
} from "./thought-v2-anvil-gallery";

const base64 = (value: string): string => Buffer.from(value, "utf8").toString("base64");

describe("THOUGHT V2 Anvil gallery decoding", () => {
  it("decodes exact UTF-8 metadata and SVG data URIs", () => {
    const json = '{"line":"Agent says hello."}';
    const svg = '<svg xmlns="http://www.w3.org/2000/svg"><text>THOUGHT</text></svg>';

    expect(parseEmbeddedJsonDataUri(`data:application/json;base64,${base64(json)}`))
      .toEqual({ json, value: { line: "Agent says hello." } });
    expect(parseEmbeddedSvgDataUri(`data:image/svg+xml;base64,${base64(svg)}`)).toBe(svg);
  });

  it("fails closed on external, malformed UTF-8, and invalid JSON payloads", () => {
    expect(() => parseEmbeddedJsonDataUri("https://example.test/token/1")).toThrow(
      "embedded base64 JSON",
    );
    expect(() => parseEmbeddedSvgDataUri("https://example.test/image.svg")).toThrow(
      "embedded base64 SVG",
    );
    expect(() => parseEmbeddedJsonDataUri("data:application/json;base64,/w==")).toThrow();
    expect(() => parseEmbeddedJsonDataUri(
      `data:application/json;base64,${base64("not JSON")}`,
    )).toThrow();
  });

  it("reads string and numeric canonical traits and rejects missing facets", () => {
    const token = {
      tokenId: 4,
      traits: new Map([
        ["Declared Agent", { trait_type: "Declared Agent", value: "Inshell THOUGHT App" }],
        ["Prompt Bytes", {
          display_type: "number" as const,
          max_value: 64,
          trait_type: "Prompt Bytes",
          value: 13,
        }],
      ]),
    } as ThoughtV2OnchainToken;

    expect(traitValue(token, "Declared Agent")).toBe("Inshell THOUGHT App");
    expect(traitValue(token, "Prompt Bytes")).toBe(13);
    expect(() => traitValue(token, "Conversation Form")).toThrow(
      "THOUGHT #4 is missing Conversation Form",
    );
  });
});
