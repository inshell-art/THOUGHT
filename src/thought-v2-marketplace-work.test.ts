import { describe, expect, it } from "vitest";

import {
  parseThoughtV2MarketplaceWorkTokenId,
  thoughtV2MarketplaceWorkHref,
} from "./thought-v2-marketplace-work";

describe("THOUGHT V2 marketplace work route", () => {
  it("builds and parses positive token routes", () => {
    expect(thoughtV2MarketplaceWorkHref(3)).toBe(
      "/thought-v2-marketplace-work.html?token=3",
    );
    expect(parseThoughtV2MarketplaceWorkTokenId("?token=66")).toBe(66);
  });

  it("rejects missing, zero, negative, fractional, and unsafe token IDs", () => {
    for (const search of [
      "",
      "?token=0",
      "?token=-1",
      "?token=1.5",
      "?token=9007199254740992",
    ]) {
      expect(() => parseThoughtV2MarketplaceWorkTokenId(search)).toThrow();
    }
    expect(() => thoughtV2MarketplaceWorkHref(0)).toThrow();
  });
});
