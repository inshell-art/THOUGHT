import { describe, expect, it } from "vitest";

import {
  assertThoughtV2Work,
  deriveThoughtV2WorkHashes,
  measureThoughtV2Line,
  THOUGHT_V2_ALLOWED_CHARACTERS,
  THOUGHT_V2_CONVERSATION_IDENTITY_DOMAIN,
  THOUGHT_V2_RENDERER_ID_HASH,
  THOUGHT_V2_WORK_DOMAIN,
  THOUGHT_V2_WORK_PROFILE_ID_HASH,
} from "./thought-v2-terminal-work-profile";

describe("THOUGHT V2 terminal English work profile", () => {
  it("freezes the exact 76-character repertoire", () => {
    expect(THOUGHT_V2_ALLOWED_CHARACTERS).toHaveLength(76);
    expect(new Set(THOUGHT_V2_ALLOWED_CHARACTERS).size).toBe(76);
    for (let byte = 0; byte <= 0xff; byte += 1) {
      const character = String.fromCharCode(byte);
      const expected = THOUGHT_V2_ALLOWED_CHARACTERS.includes(character) && character !== " ";
      expect(measureThoughtV2Line(character, "prompt").errors.length === 0, `byte ${byte}`)
        .toBe(expected);
    }
  });

  it("pins profile, renderer, domain, and cross-language hash vectors", () => {
    expect(THOUGHT_V2_WORK_PROFILE_ID_HASH)
      .toBe("0x2bf311e6034eb35e6d1f7bd92894012ee7e528609830cb3b28df1ce5dd82f85a");
    expect(THOUGHT_V2_RENDERER_ID_HASH)
      .toBe("0x01982604c90acf1ca63020e0c3761b25d8dc8fc3c267d27ace14cb0d2c813d73");
    expect(THOUGHT_V2_CONVERSATION_IDENTITY_DOMAIN)
      .toBe("0x83856e36e7dce724ed9101c7ab12471fedb4bc4478671dd8d135eddd5565ec17");
    expect(THOUGHT_V2_WORK_DOMAIN)
      .toBe("0x067f661d579b55748656bedd022ca2f5e113b78c9f39180ac6926f9bbdcb158f");

    expect(deriveThoughtV2WorkHashes("Are you there?", "I am here.")).toEqual({
      promptLineKeccak256: "0x6852826e419ca7d5b9369dd8a97d9ed72a2412d582f3a7d17e2573f300f89c7a",
      agentLineKeccak256: "0xdbb93d90a556927b3477f5a9812d5f8efd63b755d8216ff1392c6d7d9c8e5b1a",
      conversationIdentityHash: "0x5c33034f3880c9b2c55c39102a9d32e049ac51218d68deb2c1d5c8371f182b3b",
      workHash: "0xae80266ecd2c572d4dcda920bcb6e39f4cd0226137845a92819d37803ab6e2da",
    });
  });

  it("keeps punctuation-only works valid and pair identity ordered", () => {
    expect(assertThoughtV2Work("...", "!!!").prompt.byteLength).toBe(3);
    expect(
      assertThoughtV2Work("First?", "Same answer.").conversationIdentityHash,
    ).not.toBe(
      assertThoughtV2Work("Same answer.", "First?").conversationIdentityHash,
    );
  });

  it("rejects unsupported characters and noncanonical spacing without rewriting", () => {
    expect(measureThoughtV2Line("café", "prompt").errors)
      .toContain("prompt line contains unsupported U+00E9");
    expect(measureThoughtV2Line("agent@example", "agent").errors)
      .toContain("agent line contains unsupported U+0040");
    expect(measureThoughtV2Line(" outer", "prompt").errors)
      .toContain("prompt line has an outer space");
    expect(measureThoughtV2Line("two  spaces", "prompt").errors)
      .toContain("prompt line has repeated internal spaces");
  });
});
