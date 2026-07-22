import { keccak256, toUtf8Bytes } from "ethers";
import { describe, expect, it } from "vitest";

import { thoughtChatGalleryFixtures } from "./thought-v2-chat-gallery";
import {
  buildThoughtV2StudyRecord,
  buildThoughtV2StudyTokenMetadata,
  thoughtV2ConversationForm,
  thoughtV2LengthClass,
  thoughtV2StudyProvenanceBytes,
  THOUGHT_V2_METADATA_ATTRIBUTE_ORDER,
  THOUGHT_V2_STUDY_PROVENANCE_SCHEMA,
} from "./thought-v2-terminal-study-metadata";

describe("THOUGHT V2 study metadata and provenance", () => {
  it("derives objective length traits and fixture-only conversation classifications", () => {
    expect(thoughtV2LengthClass(1)).toBe("Minimum");
    expect(thoughtV2LengthClass(2)).toBe("Compact");
    expect(thoughtV2LengthClass(17)).toBe("Standard");
    expect(thoughtV2LengthClass(33)).toBe("Extended");
    expect(thoughtV2LengthClass(64)).toBe("Maximum");

    expect(thoughtChatGalleryFixtures.find(({ id }) => id === "punctuation-ellipsis"))
      .toMatchObject({ conversationForm: "Punctuation Only" });
    expect(thoughtChatGalleryFixtures.find(({ id }) => id === "are-you-there"))
      .toMatchObject({ conversationForm: "Dialogue" });

    expect(thoughtV2ConversationForm("...", "?!")).toBe("Punctuation Only");
    expect(thoughtV2ConversationForm("...", "No.")).toBe("Dialogue");
    for (const invalid of [0, 65, 1.5, Number.NaN]) {
      expect(() => thoughtV2LengthClass(invalid)).toThrow(
        "requires 1 through 64 bytes",
      );
    }
  });

  it("exposes all and only canonical metadata traits for gallery filtering", () => {
    const expectedNumericTraits = new Map<string, number>([
      ["Prompt Bytes", 64],
      ["Agent Bytes", 64],
      ["Pair Bytes", 128],
    ]);

    for (const fixture of thoughtChatGalleryFixtures) {
      expect(fixture.attributes.map(({ trait_type }) => trait_type), fixture.id)
        .toEqual(THOUGHT_V2_METADATA_ATTRIBUTE_ORDER);
      expect(new Set(fixture.attributes.map(({ trait_type }) => trait_type)).size, fixture.id)
        .toBe(THOUGHT_V2_METADATA_ATTRIBUTE_ORDER.length);

      for (const attribute of fixture.attributes) {
        const maxValue = expectedNumericTraits.get(attribute.trait_type);
        if (maxValue === undefined) {
          expect(attribute.display_type, `${fixture.id}:${attribute.trait_type}`).toBeUndefined();
          expect(attribute.max_value, `${fixture.id}:${attribute.trait_type}`).toBeUndefined();
        } else {
          expect(attribute.display_type, `${fixture.id}:${attribute.trait_type}`).toBe("number");
          expect(attribute.max_value, `${fixture.id}:${attribute.trait_type}`).toBe(maxValue);
          expect(typeof attribute.value, `${fixture.id}:${attribute.trait_type}`).toBe("number");
        }
      }
    }

    expect(THOUGHT_V2_METADATA_ATTRIBUTE_ORDER).not.toContain("Conversation Form");
    expect(THOUGHT_V2_METADATA_ATTRIBUTE_ORDER).not.toContain("Work Profile");
  });

  it("builds deterministic canonical provenance for every study work", () => {
    for (const fixture of thoughtChatGalleryFixtures) {
      const parsed = JSON.parse(fixture.provenanceJson) as Record<string, unknown>;
      const keys = collectKeys(parsed);
      expect(fixture.provenance.schema).toBe(THOUGHT_V2_STUDY_PROVENANCE_SCHEMA);
      expect(fixture.provenance.work.conversationIdentityHash).toBe(
        fixture.conversationIdentityHash,
      );
      expect(fixture.provenance.work.workHash).toBe(fixture.workHash);
      expect(fixture.provenance.process.agentDeclaration.label).toBe(fixture.declaredAgent);
      expect(fixture.provenance.process.modelDeclaration.label).toBe(fixture.declaredModel);
      expect(keccak256(toUtf8Bytes(fixture.provenanceJson))).toBe(fixture.provenanceHash);
      expect(thoughtV2StudyProvenanceBytes(fixture.provenanceJson)).toBeLessThan(20_000);
      expect(keys).not.toContain("fixtureId");
      expect(keys).not.toContain("corpusId");
      expect(keys).not.toContain("corpusName");
      expect(keys).not.toContain("sourceFile");
    }
  });

  it("keeps local fixture and corpus bookkeeping outside token metadata", () => {
    const fixture = thoughtChatGalleryFixtures[10]!;
    const metadata = buildThoughtV2StudyTokenMetadata(fixture, "data:image/svg+xml;base64,PHN2Zy8+");
    const serialized = JSON.stringify(metadata);

    expect(metadata.thought.provenanceHash).toBe(fixture.provenanceHash);
    expect(metadata.attributes).toHaveLength(8);
    expect(metadata.attributes.map(({ trait_type }) => trait_type))
      .toEqual(THOUGHT_V2_METADATA_ATTRIBUTE_ORDER);
    expect(metadata.attributes.map(({ trait_type }) => trait_type))
      .not.toContain("Conversation Form");
    expect(metadata.attributes.map(({ trait_type }) => trait_type))
      .not.toContain("Work Profile");
    expect(metadata.thought.declarations).toMatchObject({
      agent: {
        label: fixture.declaredAgent,
        keccak256: fixture.declaredAgentKeccak256,
        status: "declared-unverified",
      },
      model: {
        label: fixture.declaredModel,
        keccak256: fixture.declaredModelKeccak256,
        status: "declared-unverified",
      },
      workIdentityInput: false,
    });
    expect(serialized).not.toContain(fixture.id);
    expect(serialized).not.toContain(fixture.corpusId);
    expect(serialized).not.toContain(fixture.corpusName);
    expect(metadata.thought.mint).toEqual({
      chainId: null,
      contract: null,
      pathId: null,
      pathSerial: null,
      status: "not-minted",
      tokenId: null,
    });
  });

  it("keeps exact declaration labels in provenance and metadata without changing work identity", () => {
    const first = buildThoughtV2StudyRecord("Are you there?", "I am here.", {
      agentDeclaration: {
        label: "Inshell THOUGHT App",
        source: "manual",
        status: "declared-unverified",
      },
      kind: "manual",
      modelDeclaration: {
        label: "Example Model",
        source: "manual",
        status: "declared-unverified",
      },
    });
    const second = buildThoughtV2StudyRecord("Are you there?", "I am here.");

    expect(first.conversationIdentityHash).toBe(second.conversationIdentityHash);
    expect(first.workHash).toBe(second.workHash);
    expect(first.provenance.process.agentDeclaration.label).toBe("Inshell THOUGHT App");
    expect(first.provenance.process.modelDeclaration.label).toBe("Example Model");
    expect(first.attributes.slice(0, 2)).toEqual([
      { trait_type: "Declared Agent", value: "Inshell THOUGHT App" },
      { trait_type: "Declared Model", value: "Example Model" },
    ]);
  });
});

const collectKeys = (value: unknown): string[] => {
  if (!value || typeof value !== "object") return [];
  if (Array.isArray(value)) return value.flatMap(collectKeys);
  return Object.entries(value as Record<string, unknown>)
    .flatMap(([key, child]) => [key, ...collectKeys(child)]);
};
