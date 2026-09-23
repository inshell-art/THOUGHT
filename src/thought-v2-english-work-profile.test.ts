import { describe, expect, it } from "vitest";

import {
  assertThoughtEnglishWork,
  measureThoughtEnglishLine,
  THOUGHT_ENGLISH_ALLOWED_CHARACTERS,
  THOUGHT_ENGLISH_MAX_BYTES,
  thoughtEnglishPairIdentityKey,
} from "./thought-v2-english-work-profile";

describe("THOUGHT English chat study work profile", () => {
  it("accepts its complete closed character table", () => {
    for (const character of THOUGHT_ENGLISH_ALLOWED_CHARACTERS) {
      if (character === " ") continue;
      expect(measureThoughtEnglishLine(character, "prompt").errors, character).toEqual([]);
    }
  });

  it("keeps punctuation-only works valid", () => {
    expect(assertThoughtEnglishWork("...", "!!!").pairIdentityKey).toBe(
      thoughtEnglishPairIdentityKey("...", "!!!"),
    );
  });

  it("rejects Unicode, unsupported symbols, outer spaces, repeated spaces, and overflow", () => {
    expect(measureThoughtEnglishLine("café", "prompt").errors).toContain(
      "prompt line contains unsupported U+00E9",
    );
    expect(measureThoughtEnglishLine("agent@example", "agent").errors).toContain(
      "agent line contains unsupported U+0040",
    );
    expect(measureThoughtEnglishLine(" outer", "prompt").errors).toContain(
      "prompt line has an outer space",
    );
    expect(measureThoughtEnglishLine("two  spaces", "prompt").errors).toContain(
      "prompt line has repeated internal spaces",
    );
    expect(measureThoughtEnglishLine("a".repeat(THOUGHT_ENGLISH_MAX_BYTES + 1), "agent").errors)
      .toContain("agent line is 65/64 bytes");
  });

  it("defines uniqueness by the exact ordered prompt and Agent pair", () => {
    const first = thoughtEnglishPairIdentityKey("First?", "Same answer.");
    const second = thoughtEnglishPairIdentityKey("Second?", "Same answer.");
    const reversed = thoughtEnglishPairIdentityKey("Same answer.", "First?");
    expect(first).not.toBe(second);
    expect(first).not.toBe(reversed);
    expect(first).toBe(thoughtEnglishPairIdentityKey("First?", "Same answer."));
  });
});
