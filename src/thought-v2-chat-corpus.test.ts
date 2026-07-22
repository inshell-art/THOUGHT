import { describe, expect, it } from "vitest";

import {
  thoughtChatConversationCorpuses,
  thoughtChatConversations,
} from "./thought-v2-chat-corpus";
import {
  measureThoughtEnglishLine,
  thoughtEnglishPairIdentityKey,
} from "./thought-v2-english-work-profile";

describe("THOUGHT English chat conversation corpus", () => {
  it("contains six coherent English eight-exchange corpuses", () => {
    expect(thoughtChatConversationCorpuses).toHaveLength(6);
    for (const corpus of thoughtChatConversationCorpuses) {
      expect(corpus.conversations, corpus.id).toHaveLength(8);
    }
    expect(thoughtChatConversations).toHaveLength(48);
  });

  it("uses unique ordered pairs, prompts that ask, and distinct Agent replies", () => {
    expect(new Set(thoughtChatConversations.map(({ id }) => id)).size).toBe(48);
    expect(new Set(thoughtChatConversations.map(({ promptLine, agentLine }) =>
      thoughtEnglishPairIdentityKey(promptLine, agentLine))).size).toBe(48);

    for (const conversation of thoughtChatConversations) {
      expect(conversation.promptLine, conversation.id).toMatch(/\?$/);
      expect(conversation.agentLine, conversation.id).not.toBe(conversation.promptLine);
    }
  });

  it("keeps every complete conversation turn inside the English profile", () => {
    for (const conversation of thoughtChatConversations) {
      expect(measureThoughtEnglishLine(conversation.promptLine, "prompt").errors, conversation.id)
        .toEqual([]);
      expect(measureThoughtEnglishLine(conversation.agentLine, "agent").errors, conversation.id)
        .toEqual([]);
    }
  });
});
