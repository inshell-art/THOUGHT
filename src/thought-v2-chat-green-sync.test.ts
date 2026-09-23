import { describe, expect, it } from "vitest";

import {
  clampThoughtChatGreenChannel,
  parseThoughtChatGreenChannel,
  resolveThoughtChatInitialGreen,
  thoughtChatGreenFromSearch,
  thoughtChatHrefWithGreen,
} from "./thought-v2-chat-green-sync";

describe("THOUGHT chat global green binding", () => {
  it("accepts only the study's pure-green channel range", () => {
    expect(parseThoughtChatGreenChannel("97")).toBe(97);
    expect(parseThoughtChatGreenChannel(192)).toBe(192);
    expect(parseThoughtChatGreenChannel("255")).toBe(255);
    for (const invalid of ["", "96", "256", "12.5", "green", null]) {
      expect(parseThoughtChatGreenChannel(invalid)).toBeNull();
    }
    expect(clampThoughtChatGreenChannel(20)).toBe(97);
    expect(clampThoughtChatGreenChannel(300)).toBe(255);
  });

  it("uses URL, then local storage, then the renderer default", () => {
    const storage = { getItem: () => "173" };
    expect(resolveThoughtChatInitialGreen("?green=192", storage)).toEqual({
      channel: 192,
      source: "url",
    });
    expect(resolveThoughtChatInitialGreen("", storage)).toEqual({
      channel: 173,
      source: "storage",
    });
    expect(resolveThoughtChatInitialGreen("", { getItem: () => null })).toEqual({
      channel: 186,
      source: "default",
    });
  });

  it("carries the selected channel through gallery and detail URLs", () => {
    expect(thoughtChatGreenFromSearch("?green=192")).toBe(192);
    expect(thoughtChatHrefWithGreen("/thought-v2-chat-lab.html", 192)).toBe(
      "/thought-v2-chat-lab.html?green=192",
    );
    expect(
      thoughtChatHrefWithGreen(
        "/thought-v2-chat-work.html?study=profile-digits",
        173,
      ),
    ).toBe("/thought-v2-chat-work.html?study=profile-digits&green=173");
  });
});
