import { describe, expect, it } from "vitest";

import {
  assertThoughtV2Context,
  measureThoughtV2Context,
  THOUGHT_V2_CONTEXT_PROFILE_ID_HASH,
} from "./thought-v2-context-profile";

describe("THOUGHT V2 declaration context profile", () => {
  it("pins the context profile identity", () => {
    expect(THOUGHT_V2_CONTEXT_PROFILE_ID_HASH)
      .toBe("0x9894359f9294f4b3a871442b19d851203138fad4a648c16f62fc04f55dff02b8");
  });

  it("accepts exact visible Unicode labels independently of Terminal English", () => {
    expect(assertThoughtV2Context("Inshell THOUGHT App", "agent").byteLength).toBe(19);
    expect(assertThoughtV2Context("モデル A", "model").byteLength).toBe(11);
    expect(assertThoughtV2Context("Model  A", "model").byteLength).toBe(8);
  });

  it("rejects empty, oversized, outer-space, invisible, and malformed labels", () => {
    expect(measureThoughtV2Context("", "agent").errors).toContain("agent is empty");
    expect(measureThoughtV2Context("A".repeat(65), "model").errors)
      .toContain("model is 65/64 bytes");
    expect(measureThoughtV2Context(" Agent", "agent").errors)
      .toContain("agent has an outer space");
    expect(measureThoughtV2Context("Model\u00a0A", "model").errors)
      .toContain("model contains unsupported U+00A0");
    expect(measureThoughtV2Context("Agent\u200b", "agent").errors)
      .toContain("agent contains unsupported U+200B");
    expect(measureThoughtV2Context("\ud800", "agent").errors)
      .toContain("agent contains unsupported U+D800");
  });
});
