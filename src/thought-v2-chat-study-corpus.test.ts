import { describe, expect, it } from "vitest";

import {
  thoughtChatStudyWorks,
  type ThoughtChatStudyKind,
} from "./thought-v2-chat-study-corpus";
import {
  measureThoughtEnglishLine,
  THOUGHT_ENGLISH_MAX_BYTES,
  thoughtEnglishPairIdentityKey,
} from "./thought-v2-english-work-profile";

const byKind = (kind: ThoughtChatStudyKind) =>
  thoughtChatStudyWorks.filter((work) => work.studyKind === kind);

describe("THOUGHT English renderer study corpus", () => {
  it("combines profile, punctuation, length, and conversation studies", () => {
    expect(thoughtChatStudyWorks).toHaveLength(66);
    expect(byKind("profile-baseline")).toHaveLength(5);
    expect(byKind("punctuation")).toHaveLength(8);
    expect(byKind("length-boundary")).toHaveLength(5);
    expect(byKind("conversation")).toHaveLength(48);
    expect(new Set(thoughtChatStudyWorks.map(({ id }) => id)).size).toBe(66);
  });

  it("uses Source Code Pro as the only study font", () => {
    expect(new Set(thoughtChatStudyWorks.map(({ fontProfile }) => fontProfile))).toEqual(
      new Set(["source-code-pro"]),
    );
  });

  it("keeps punctuation-only works and permits repeated Agent lines across distinct prompts", () => {
    const works = byKind("punctuation");
    for (const work of works) {
      expect(work.promptLine, work.id).not.toMatch(/[A-Za-z0-9]/);
      expect(work.agentLine, work.id).not.toMatch(/[A-Za-z0-9]/);
    }
    expect(new Set(works.map(({ agentLine }) => agentLine)).size).toBeLessThan(works.length);
    expect(new Set(works.map(({ promptLine, agentLine }) =>
      thoughtEnglishPairIdentityKey(promptLine, agentLine))).size).toBe(works.length);
  });

  it("includes one-byte and exact 64-byte ASCII boundaries", () => {
    const works = byKind("length-boundary");
    const bytePairs = works.map(({ promptLine, agentLine }) => [
      new TextEncoder().encode(promptLine).length,
      new TextEncoder().encode(agentLine).length,
    ]);
    expect(bytePairs).toContainEqual([1, 1]);
    expect(bytePairs.filter(([prompt, agent]) =>
      prompt === THOUGHT_ENGLISH_MAX_BYTES && agent === THOUGHT_ENGLISH_MAX_BYTES)).toHaveLength(4);
  });

  it("keeps every line valid and every ordered pair unique", () => {
    const pairIdentities = new Set<string>();
    for (const work of thoughtChatStudyWorks) {
      expect(measureThoughtEnglishLine(work.promptLine, "prompt").errors, `${work.id} prompt`)
        .toEqual([]);
      expect(measureThoughtEnglishLine(work.agentLine, "agent").errors, `${work.id} Agent`)
        .toEqual([]);
      const identity = thoughtEnglishPairIdentityKey(work.promptLine, work.agentLine);
      expect(pairIdentities.has(identity), work.id).toBe(false);
      pairIdentities.add(identity);
    }
  });
});
