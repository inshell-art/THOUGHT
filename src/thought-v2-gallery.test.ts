import { describe, expect, it } from "vitest";
import { keccak256, toUtf8Bytes } from "ethers";

import tokenVectors from "../protocol/releases/v2/conformance/token-uri-vectors.json";
import { verifyProvenance } from "./thought-v2-provenance";

import {
  buildThoughtGalleryFilterGroups,
  decodeDataUriText,
  filterAndSortThoughtGalleryTokens,
  loomSupportingText,
  parseThoughtTokenUri,
  provenanceFileForToken,
  type ThoughtGallerySort,
  type ThoughtGalleryToken,
} from "./thought-v2-gallery";

type FilterFixtureOptions = {
  prompt?: string;
  agentResponse?: string;
  declaredAgent?: string;
  declaredModel?: string;
  creationAttestation?: string;
  textureDensity?: string;
  loomWeight?: number;
};

const filterFixture = (
  tokenId: number,
  {
    prompt = `prompt ${tokenId}`,
    agentResponse = `response ${tokenId}`,
    declaredAgent = "Fixture Agent",
    declaredModel = "Fixture Model",
    creationAttestation = "Unattested",
    textureDensity = "Balanced",
    loomWeight = 500,
  }: FilterFixtureOptions = {},
): ThoughtGalleryToken => {
  const base = parseThoughtTokenUri(tokenVectors.vectors[0]!.tokenURI);
  return {
    tokenId,
    metadata: {
      ...base,
      name: `THOUGHT #${tokenId}`,
      attributes: [
        { trait_type: "Prompt", value: prompt },
        { trait_type: "Agent Response", value: agentResponse },
        { trait_type: "Declared Agent", value: declaredAgent },
        { trait_type: "Declared Model", value: declaredModel },
        { trait_type: "Creation Attestation", value: creationAttestation },
        { trait_type: "Texture Density", value: textureDensity },
      ],
      properties: { ...base.properties, loomWeight },
      thought: {
        ...base.thought,
        pathId: String(tokenId),
        declaredAgent,
        declaredModel,
        creationAttestation,
      },
    },
  };
};

const filteredIds = (
  tokens: readonly ThoughtGalleryToken[],
  selectedTraits: Readonly<Record<string, readonly string[]>>,
  query = "",
  sort: ThoughtGallerySort = "token-asc",
) =>
  filterAndSortThoughtGalleryTokens(tokens, { query, selectedTraits, sort }).map(
    (token) => token.tokenId,
  );

describe("THOUGHT binary-weave attempt gallery metadata", () => {
  it("parses the canonical contract tokenURI and embedded SVG", () => {
    const metadata = parseThoughtTokenUri(tokenVectors.vectors[0]!.tokenURI);

    expect(metadata.name).toBe("THOUGHT #1");
    expect(metadata.attributes.map((attribute) => attribute.trait_type)).toEqual([
      "Prompt",
      "Agent Response",
      "Declared Agent",
      "Declared Model",
      "Creation Attestation",
      "Texture Density",
    ]);
    expect(metadata.properties.rendererId).toBe("inshell.thought.svg.v2.binary-weave-32");
    expect(loomSupportingText(metadata.properties)).toMatch(
      /^Loom: \d+ \/ 1,024 underlying cells filled$/,
    );
    expect(metadata.thought.pathId).toBe("1");
    expect(decodeDataUriText(metadata.image, "image/svg+xml")).toContain("<svg");
  });

  it("exposes the exact onchain provenance bytes as a token-scoped JSON file", () => {
    const metadata = parseThoughtTokenUri(tokenVectors.vectors[0]!.tokenURI);
    const file = provenanceFileForToken(1, metadata);
    const downloaded = decodeDataUriText(file.dataUri, "application/json");

    expect(file.filename).toBe("THOUGHT-1.provenance.json");
    expect(file.byteLength).toBe(new TextEncoder().encode(metadata.thought.provenance).byteLength);
    expect(downloaded).toBe(metadata.thought.provenance);
    expect(keccak256(toUtf8Bytes(downloaded))).toBe(metadata.thought.provenanceHash);
    const verification = verifyProvenance(new TextEncoder().encode(downloaded), undefined, {
      promptLine: String(metadata.thought.promptLine),
      agentLine: String(metadata.thought.agentLine),
      declaredAgent: metadata.thought.declaredAgent,
      declaredModel: metadata.thought.declaredModel,
      workHash: metadata.thought.workHash as `0x${string}`,
      provenanceHash: metadata.thought.provenanceHash as `0x${string}`,
      protocolReleaseId: metadata.thought.protocolReleaseId as `0x${string}`,
      manifestKeccak256: metadata.thought.manifestKeccak256 as `0x${string}`,
      thoughtSpecId: metadata.thought.thoughtSpecId as `0x${string}`,
      thoughtSpecHash: metadata.thought.thoughtSpecHash as `0x${string}`,
      intendedMinter: metadata.thought.minter as `0x${string}`,
    });
    expect(verification.conforming).toBe(true);
    expect(verification.parsed?.schema).toBe("inshell.thought.provenance.v2");
    expect(downloaded).not.toContain("inshell.thought.gallery-fixture.v1");
    expect(downloaded).not.toContain("src/thought-v2-fixtures.ts");
    expect(downloaded).not.toContain('"fixture"');
    expect(downloaded).not.toContain('"corpusId"');
    expect(downloaded).not.toContain('"corpusName"');
    expect(downloaded).not.toContain('"creativeSpec"');
    expect(downloaded).not.toContain('"agentResultSchema"');
    expect(downloaded).not.toContain('"rendererProfile"');
    expect(downloaded).not.toContain('"workProfile"');
    expect(downloaded).not.toContain('"movement"');
    expect(downloaded).not.toContain('"pathId"');
    expect(downloaded).not.toContain('"pathNft"');
    expect(downloaded).not.toContain('"declaredOneCreativeResult"');
  });

  it("keeps every positive tokenURI provenance and mock attestation in exact parity", () => {
    const parityCases = new Set<string>();
    for (const rawVector of tokenVectors.vectors) {
      const vector = rawVector as typeof rawVector & {
        mockAttestation?: {
          claim: {
            declaredAgentHash: `0x${string}`;
            declaredModelHash: `0x${string}`;
            intendedMinter: `0x${string}`;
            protocolReleaseId: `0x${string}`;
            provenanceHash: `0x${string}`;
            runIdHash: `0x${string}`;
            thoughtNft: `0x${string}`;
            thoughtSpecId: `0x${string}`;
            thoughtSpecHash: `0x${string}`;
            workHash: `0x${string}`;
          };
          digest: string;
        };
        provenance: { keccak256: string; processKind: string };
      };
      const metadata = parseThoughtTokenUri(vector.tokenURI);
      const exactBytes = new TextEncoder().encode(metadata.thought.provenance);
      const verification = verifyProvenance(exactBytes, undefined, {
        promptLine: String(metadata.thought.promptLine),
        agentLine: String(metadata.thought.agentLine),
        declaredAgent: metadata.thought.declaredAgent,
        declaredModel: metadata.thought.declaredModel,
        workHash: metadata.thought.workHash as `0x${string}`,
        provenanceHash: metadata.thought.provenanceHash as `0x${string}`,
        protocolReleaseId: metadata.thought.protocolReleaseId as `0x${string}`,
        manifestKeccak256: metadata.thought.manifestKeccak256 as `0x${string}`,
        thoughtSpecId: metadata.thought.thoughtSpecId as `0x${string}`,
        thoughtSpecHash: metadata.thought.thoughtSpecHash as `0x${string}`,
        intendedMinter: metadata.thought.minter as `0x${string}`,
      });
      expect(verification.conforming, vector.id).toBe(true);
      expect(verification.parsed?.process.kind, vector.id).toBe(vector.provenance.processKind);
      expect(verification.provenanceHash, vector.id).toBe(vector.provenance.keccak256);
      if (vector.mockAttestation) {
        parityCases.add("agent-run+attested");
        expect(verification.parsed?.process.kind, vector.id).toBe("agent-run");
        expect(vector.mockAttestation.claim.provenanceHash, vector.id).toBe(vector.provenance.keccak256);
        expect(vector.mockAttestation.claim.thoughtSpecId, vector.id).toBe(metadata.thought.thoughtSpecId);
        expect(vector.mockAttestation.claim.thoughtSpecHash, vector.id).toBe(metadata.thought.thoughtSpecHash);
        expect(vector.mockAttestation.digest, vector.id).toBe(metadata.properties.creationAttestationDigest);
        const claimVerification = verifyProvenance(exactBytes, undefined, {
          attestationClaim: {
            chainId: "31337",
            declaredAgentHash: vector.mockAttestation.claim.declaredAgentHash,
            declaredModelHash: vector.mockAttestation.claim.declaredModelHash,
            intendedMinter: vector.mockAttestation.claim.intendedMinter,
            protocolReleaseId: vector.mockAttestation.claim.protocolReleaseId,
            provenanceHash: vector.mockAttestation.claim.provenanceHash,
            runIdHash: vector.mockAttestation.claim.runIdHash,
            thoughtNft: vector.mockAttestation.claim.thoughtNft,
            thoughtSpecHash: vector.mockAttestation.claim.thoughtSpecHash,
            thoughtSpecId: vector.mockAttestation.claim.thoughtSpecId,
            workHash: vector.mockAttestation.claim.workHash,
          },
        });
        expect(claimVerification.conforming, vector.id).toBe(true);
      } else {
        parityCases.add(`${verification.parsed?.process.kind}+unattested`);
        expect(metadata.properties.creationAttestationDigest, vector.id).toBe(`0x${"00".repeat(32)}`);
      }
    }
    expect(parityCases).toEqual(new Set([
      "manual+unattested",
      "agent-run+unattested",
      "agent-run+attested",
    ]));
  });

  it("rejects metadata without the contract's embedded SVG and attributes", () => {
    const malformed = globalThis.btoa(
      JSON.stringify({ name: "THOUGHT #1", image: "/static.svg", attributes: [] }),
    );

    expect(() => parseThoughtTokenUri(`data:application/json;base64,${malformed}`)).toThrow(
      "embedded SVG image is missing",
    );
  });

  it("rejects non-data token URIs", () => {
    expect(() => parseThoughtTokenUri("https://example.invalid/1.json")).toThrow(
      "value is not a data URI",
    );
  });

  it("rejects metadata without downloadable provenance", () => {
    const malformed = globalThis.btoa(
      JSON.stringify({
        name: "THOUGHT #1",
        image: "data:image/svg+xml;base64,PHN2Zy8+",
        attributes: [
          { trait_type: "Prompt", value: "p" },
          { trait_type: "Agent Response", value: "a" },
          { trait_type: "Declared Agent", value: "agent" },
          { trait_type: "Declared Model", value: "m" },
          { trait_type: "Creation Attestation", value: "Unattested" },
          { trait_type: "Texture Density", value: "Open" },
        ],
        properties: {},
        thought: { declaredAgent: "agent", declaredModel: "m" },
      }),
    );

    expect(() => parseThoughtTokenUri(`data:application/json;base64,${malformed}`)).toThrow(
      "provenance is missing",
    );
  });

  it("rejects a stale pre-delta attribute surface", () => {
    const malformed = globalThis.btoa(
      JSON.stringify({
        name: "THOUGHT #1",
        image: "data:image/svg+xml;base64,PHN2Zy8+",
        attributes: [
          { trait_type: "Prompt", value: "p" },
          { trait_type: "Agent Response", value: "a" },
          { trait_type: "Texture Density", value: "Open" },
          { trait_type: "Binary Contrast", value: "Low" },
          { trait_type: "Protocol", value: "V2" },
        ],
        properties: { loomWeight: 0 },
        thought: { provenance: "{}" },
      }),
    );

    expect(() => parseThoughtTokenUri(`data:application/json;base64,${malformed}`)).toThrow(
      "canonical attribute order mismatch",
    );
  });

  it("builds canonical OpenSea-style trait groups with option counts", () => {
    const tokens = [
      filterFixture(1, {
        creationAttestation: "Inshell THOUGHT App",
        textureDensity: "Open",
      }),
      filterFixture(2, { textureDensity: "Balanced" }),
      filterFixture(3, {
        declaredAgent: "Second Agent",
        creationAttestation: "Inshell THOUGHT App",
        textureDensity: "Open",
      }),
    ];
    const groups = buildThoughtGalleryFilterGroups(tokens);

    expect(groups.map((group) => group.traitType)).toEqual([
      "Prompt",
      "Agent Response",
      "Declared Agent",
      "Declared Model",
      "Creation Attestation",
      "Texture Density",
    ]);
    expect(groups.find((group) => group.traitType === "Creation Attestation")?.options).toEqual([
      { value: "Inshell THOUGHT App", count: 2 },
      { value: "Unattested", count: 1 },
    ]);
    expect(groups.find((group) => group.traitType === "Texture Density")?.options).toEqual([
      { value: "Open", count: 2 },
      { value: "Balanced", count: 1 },
    ]);
  });

  it("OR-combines values within a trait and AND-combines different traits", () => {
    const tokens = [
      filterFixture(1, {
        creationAttestation: "Inshell THOUGHT App",
        textureDensity: "Open",
      }),
      filterFixture(2, {
        creationAttestation: "Inshell THOUGHT App",
        textureDensity: "Dense",
      }),
      filterFixture(3, { creationAttestation: "Unattested", textureDensity: "Open" }),
    ];

    expect(
      filteredIds(tokens, {
        "Creation Attestation": ["Inshell THOUGHT App"],
        "Texture Density": ["Open", "Dense"],
      }),
    ).toEqual([1, 2]);
    expect(
      filteredIds(tokens, {
        "Creation Attestation": ["Unattested"],
        "Texture Density": ["Dense"],
      }),
    ).toEqual([]);
  });

  it("searches token identity, PATH identity, and Unicode trait values", () => {
    const tokens = [
      filterFixture(1, { prompt: "Quiet signal 你好" }),
      filterFixture(2, { agentResponse: "صوت هادئ" }),
      filterFixture(3),
    ];

    expect(filteredIds(tokens, {}, "你好")).toEqual([1]);
    expect(filteredIds(tokens, {}, "PATH 2")).toEqual([2]);
    expect(filteredIds(tokens, {}, "#3")).toEqual([3]);
    expect(filteredIds(tokens, {}, "صوت")).toEqual([2]);
  });

  it("sorts by mint recency and deterministic loom weight order", () => {
    const tokens = [
      filterFixture(1, { loomWeight: 400 }),
      filterFixture(2, { loomWeight: 700 }),
      filterFixture(3, { loomWeight: 400 }),
    ];

    expect(filteredIds(tokens, {}, "", "token-desc")).toEqual([3, 2, 1]);
    expect(filteredIds(tokens, {}, "", "loom-desc")).toEqual([2, 1, 3]);
    expect(filteredIds(tokens, {}, "", "loom-asc")).toEqual([1, 3, 2]);
  });
});
