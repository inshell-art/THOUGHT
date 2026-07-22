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
    expect(assertThoughtV2Context("Inshell THOUGHT App", "declaredAgent").byteLength).toBe(19);
    expect(assertThoughtV2Context("モデル A", "declaredModel").byteLength).toBe(11);
    expect(assertThoughtV2Context("Model  A", "declaredModel").byteLength).toBe(8);
  });

  it("rejects empty, oversized, outer-space, invisible, and malformed labels", () => {
    expect(measureThoughtV2Context("", "declaredAgent").errors).toContain("declaredAgent is empty");
    expect(measureThoughtV2Context("A".repeat(65), "declaredModel").errors)
      .toContain("declaredModel is 65/64 bytes");
    expect(measureThoughtV2Context(" Agent", "declaredAgent").errors)
      .toContain("declaredAgent has an outer space");
    expect(measureThoughtV2Context("Model\u00a0A", "declaredModel").errors)
      .toContain("declaredModel contains unsupported U+00A0");
    expect(measureThoughtV2Context("Agent\u200b", "declaredAgent").errors)
      .toContain("declaredAgent contains unsupported U+200B");
    expect(measureThoughtV2Context("\ud800", "declaredAgent").errors)
      .toContain("declaredAgent contains unsupported U+D800");
  });
});
