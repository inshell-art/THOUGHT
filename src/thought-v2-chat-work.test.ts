import { describe, expect, it } from "vitest";

import {
  parseThoughtChatWorkTokenId,
  thoughtChatWorkDetailHref,
} from "./thought-v2-chat-work";

describe("THOUGHT V2 on-chain work detail routing", () => {
  it("builds and parses a token-scoped detail URL", () => {
    expect(thoughtChatWorkDetailHref(39)).toBe("/thought-v2-chat-work.html?token=39");
    expect(parseThoughtChatWorkTokenId("?token=39")).toBe(39);
  });

  it("rejects missing, zero, malformed, and unsafe token IDs", () => {
    for (const search of ["", "?token=", "?token=0", "?token=-1", "?token=1.5", "?token=work"]) {
      expect(() => parseThoughtChatWorkTokenId(search)).toThrow();
    }
    expect(() => thoughtChatWorkDetailHref(0)).toThrow("positive token ID");
  });
});
