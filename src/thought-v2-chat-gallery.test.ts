import { describe, expect, it } from "vitest";

import {
  thoughtChatGalleryFixtures,
  THOUGHT_CHAT_GALLERY_RECORD_PAIRS,
  THOUGHT_CHAT_MOCK_ATTESTED_TOKEN_NUMBERS,
} from "./thought-v2-chat-gallery";
import { THOUGHT_CHAT_SOURCE_MAX_BYTES } from "./thought-v2-chat-svg";
import { THOUGHT_ENGLISH_WORK_PROFILE_ID } from "./thought-v2-english-work-profile";

describe("THOUGHT English renderer study gallery", () => {
  it("uses all 66 studies with stable ordered-pair identities", () => {
    expect(thoughtChatGalleryFixtures).toHaveLength(66);
    expect(thoughtChatGalleryFixtures[0]).toMatchObject({
      tokenNumber: 1,
      id: "profile-letter-case",
      studyKind: "profile-baseline",
      fontProfile: "source-code-pro",
      promptLine: "THOUGHT WILL AWA",
      agentLine: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
      workProfileId: THOUGHT_ENGLISH_WORK_PROFILE_ID,
    });
    expect(new Set(thoughtChatGalleryFixtures.map(({ id }) => id)).size).toBe(66);
    expect(new Set(thoughtChatGalleryFixtures.map(({ pairIdentityKey }) => pairIdentityKey)).size)
      .toBe(66);
  });

  it("keeps every exact ASCII source line within the profile byte limit", () => {
    for (const fixture of thoughtChatGalleryFixtures) {
      expect(new TextEncoder().encode(fixture.promptLine).length, fixture.id).toBe(
        fixture.promptBytes,
      );
      expect(new TextEncoder().encode(fixture.agentLine).length, fixture.id).toBe(
        fixture.agentBytes,
      );
      expect(fixture.promptBytes, fixture.id).toBeLessThanOrEqual(
        THOUGHT_CHAT_SOURCE_MAX_BYTES,
      );
      expect(fixture.agentBytes, fixture.id).toBeLessThanOrEqual(
        THOUGHT_CHAT_SOURCE_MAX_BYTES,
      );
    }
  });

  it("uses realistic manually declared Agent/model pairs across the gallery", () => {
    const expectedAgents = new Set(
      THOUGHT_CHAT_GALLERY_RECORD_PAIRS.map(({ agent }) => agent),
    );
    const expectedModels = new Set(
      THOUGHT_CHAT_GALLERY_RECORD_PAIRS.map(({ model }) => model),
    );
    const agentCounts = new Map<string, number>();

    expect(new Set(thoughtChatGalleryFixtures.map(({ agent }) => agent)))
      .toEqual(expectedAgents);
    expect(new Set(thoughtChatGalleryFixtures.map(({ model }) => model)))
      .toEqual(expectedModels);
    expect(thoughtChatGalleryFixtures.every(
      ({ agent, model }) =>
        agent !== "Not applicable" && model !== "Not applicable",
    )).toBe(true);

    for (const fixture of thoughtChatGalleryFixtures) {
      agentCounts.set(fixture.agent, (agentCounts.get(fixture.agent) ?? 0) + 1);
      expect(fixture.provenance.process.agentDeclaration).toMatchObject({
        label: fixture.agent,
        source: "manual",
        status: "declared-unverified",
      });
      expect(fixture.provenance.process.modelDeclaration).toMatchObject({
        label: fixture.model,
        source: "manual",
        status: "declared-unverified",
      });
    }

    expect([...agentCounts.values()]).toEqual([11, 11, 11, 11, 11, 11]);
  });

  it("selects one distributed mock-attested fixture for every declaration pair", () => {
    const attested = thoughtChatGalleryFixtures.filter(
      ({ creationAttestationFixture }) => creationAttestationFixture === "mock-attested",
    );

    expect(attested.map(({ tokenNumber }) => tokenNumber)).toEqual([
      ...THOUGHT_CHAT_MOCK_ATTESTED_TOKEN_NUMBERS,
    ]);
    expect(new Set(attested.map(({ agent }) => agent))).toEqual(
      new Set(THOUGHT_CHAT_GALLERY_RECORD_PAIRS.map(({ agent }) => agent)),
    );
    expect(thoughtChatGalleryFixtures.filter(
      ({ creationAttestationFixture }) => creationAttestationFixture === "unattested",
    )).toHaveLength(60);
  });

  it("includes four renderer-native wrapping studies at the exact source maximum", () => {
    const maxWorks = thoughtChatGalleryFixtures.filter(
      ({ promptBytes, agentBytes }) =>
        promptBytes === THOUGHT_CHAT_SOURCE_MAX_BYTES
        && agentBytes === THOUGHT_CHAT_SOURCE_MAX_BYTES,
    );
    expect(maxWorks.map(({ id }) => id)).toEqual([
      "length-repeated-maximum",
      "length-weight-maximum",
      "length-punctuation-maximum",
      "length-alphabet-maximum",
    ]);
  });
});
