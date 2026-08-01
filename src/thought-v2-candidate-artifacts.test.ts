import { describe, expect, it } from "vitest";

import agentDeclarationSchema from "../protocol/current/v2/agent/thought.agent-declaration.v1.schema.json";
import contextProfile from "../protocol/current/v2/context/thought.context.v2.profile.json";
import mintInputSchema from "../protocol/current/v2/contract/thought.mint-input.v2.schema.json";
import metadataProfile from "../protocol/current/v2/metadata/thought.metadata.v2.profile.json";
import provenanceSchema from "../protocol/current/v2/provenance/thought.provenance.v2.schema.json";
import releaseInput from "../protocol/current/v2/release-input.json";
import rendererProfile from "../protocol/current/v2/renderer/thought.renderer.v2.profile.json";
import workProfile from "../protocol/current/v2/work/thought.work.v2.profile.json";
import {
  THOUGHT_V2_CONTEXT_PROFILE_ID,
} from "./thought-v2-context-profile";
import {
  THOUGHT_V2_METADATA_ATTRIBUTE_ORDER,
  THOUGHT_V2_METADATA_PROFILE_ID,
  THOUGHT_V2_PROVENANCE_PROFILE_ID,
} from "./thought-v2-terminal-study-metadata";
import {
  THOUGHT_V2_RENDERER_ID,
  THOUGHT_V2_WORK_PROFILE_ID,
} from "./thought-v2-terminal-work-profile";

describe("THOUGHT V2 neutral-record candidate artifacts", () => {
  it("pins record, context, metadata, provenance, work, and renderer identities", () => {
    expect(releaseInput.identifiers).toMatchObject({
      agentDeclaration: "inshell.thought.agent-declaration.v1",
      contextProfile: THOUGHT_V2_CONTEXT_PROFILE_ID,
      metadataProfile: THOUGHT_V2_METADATA_PROFILE_ID,
      provenance: THOUGHT_V2_PROVENANCE_PROFILE_ID,
      renderer: THOUGHT_V2_RENDERER_ID,
      workProfile: THOUGHT_V2_WORK_PROFILE_ID,
    });
    expect(contextProfile.id).toBe(THOUGHT_V2_CONTEXT_PROFILE_ID);
    expect(metadataProfile.id).toBe(THOUGHT_V2_METADATA_PROFILE_ID);
    expect(metadataProfile.marketplaceRequired).toEqual([
      "name",
      "description",
      "image",
      "external_url",
      "background_color",
      "attributes",
    ]);
    expect(workProfile.id).toBe(THOUGHT_V2_WORK_PROFILE_ID);
    expect(releaseInput.registrationAuthorized).toBe(false);
    expect(workProfile.renderGeometry).toEqual({
      artboard: { height: 1024, width: 1024 },
      canvas: {
        color: "#000000",
        height: 960,
        scale: 1,
        width: 960,
        x: 32,
        y: 32,
      },
      frame: { color: "#006100", unitsPerSide: 32 },
      glyphColor: "#00ff00",
    });
    expect(releaseInput.rendererGeometry).toMatchObject({
      artboard: "1024x1024",
      canvas: "960x960@32,32",
      canvasScale: 1,
      fields: {
        agent: {
          bottom: 832,
          horizontalAlign: "left",
          verticalAlign: "bottom",
        },
        prompt: {
          bottom: 384,
          horizontalAlign: "right",
          verticalAlign: "top",
        },
      },
      frameColor: "#006100",
      frameUnitsPerSide: 32,
      glyphColor: "#00ff00",
    });
    expect(rendererProfile).toMatchObject({
      colors: { canvas: "#000000", frame: "#006100", glyph: "#00ff00" },
      geometry: {
        fields: {
          agent: {
            bottom: 832,
            height: 256,
            horizontalAlign: "left",
            verticalAlign: "bottom",
            width: 844.8,
            x: 57.6,
            y: 576,
          },
          prompt: {
            bottom: 384,
            height: 256,
            horizontalAlign: "right",
            verticalAlign: "top",
            width: 844.8,
            x: 57.6,
            y: 128,
          },
        },
      },
      glyphSource: {
        faceSha256: "7ed61ed6335fce2c1e58184916f5d344b8384fc05d4c616e83c35ad4fa9ed47f",
        familyId: "inshell.mono-76",
        libraryMemberId: "inshell.mono-76",
        manualEditPayloadSha256:
          "755f16a8f70d9141a8b2175bc1bafeaef93ead366179d85f3597bc3dfc9ddc56",
        packageName: "@inshell/mono-76",
        packageVersion: "1.0.0",
        releaseTag: "v1.0.0",
      },
      format: {
        headerBytes: 162,
        id: "IM76",
        packedKeccak256: "0xba37d00bb395b84f0487791300a29cdd2b1712b078fa218c6ed74fa11d74a081",
        packedSha256: "3acc0a9cf60c00aa2d512356386d1e2a999499896e25661e8e631d53d5e10926",
        pathBytes: 4_438,
        totalBytes: 4_600,
        version: 1,
      },
      id: THOUGHT_V2_RENDERER_ID,
      implementationId:
        "inshell.thought.renderer.v2.mono-76-v1-im76-native-paths-frame-32-006100-green-00ff00-prompt-top-agent-bottom",
      metrics: {
        fixedAdvance: 10,
        glyphScale: 2.88,
        maxColumns: 29,
        maxRows: 4,
        originShiftX: 1,
        svgBaselineY: 12,
      },
      paint: {
        fill: "none",
        stroke: "#00ff00",
        strokeLinecap: "round",
        strokeLinejoin: "round",
        strokeWidth: 1.23,
      },
      restrictions: {
        embeddedFont: false,
        fallbackFonts: false,
        foreignObject: false,
        svgText: false,
        systemFontLookup: false,
      },
    });
    expect(rendererProfile.qualification).toMatchObject({
      adoptedByThoughtV2: true,
      packageStatus: "sealed",
      rendererReleaseReady: true,
      visualReview: "pass",
    });
  });

  it("freezes neutral trait order and exact typed/provenance parity", () => {
    expect(metadataProfile.attributeOrder).toEqual(THOUGHT_V2_METADATA_ATTRIBUTE_ORDER);
    expect(metadataProfile.traitExclusions).toEqual({
      conversationForm: "fixture-only",
      workProfileId: "technical-property",
    });
    expect(metadataProfile.records).toMatchObject({
      attestationBindsExactHashes: true,
      contextProfileId: THOUGHT_V2_CONTEXT_PROFILE_ID,
      traitTypes: ["Agent", "Model"],
      typedStateAuthoritative: true,
      workIdentityInput: false,
    });
    expect(workProfile.records).toMatchObject({
      contextProfileId: THOUGHT_V2_CONTEXT_PROFILE_ID,
      metadataTraits: ["Agent", "Model"],
      provenanceRequired: true,
      workIdentityInput: false,
    });
    expect(releaseInput.records).toMatchObject({
      attestationClaimFields: ["agentHash", "modelHash"],
      contractGetters: [
        "agentOf",
        "agentHashOf",
        "modelOf",
        "modelHashOf",
      ],
      metadataTraits: ["Agent", "Model"],
      typedMintFields: ["agent", "model"],
      workIdentityInput: false,
    });
  });

  it("keeps production provenance pre-mint and declaration-complete", () => {
    const serialized = JSON.stringify(provenanceSchema);
    const process = provenanceSchema.properties.process.oneOf;
    const manual = provenanceSchema.$defs.manualProcess;
    const agentRun = provenanceSchema.$defs.agentRunProcess;

    expect(provenanceSchema.properties.schema.const).toBe(THOUGHT_V2_PROVENANCE_PROFILE_ID);
    expect(process).toHaveLength(2);
    expect(manual.required).toEqual(["agentDeclaration", "kind", "modelDeclaration"]);
    expect(agentRun.required).toEqual([
      "agentDeclaration",
      "kind",
      "modelDeclaration",
      "transport",
    ]);
    expect(provenanceSchema.$defs.agentRunSource.enum).toEqual([
      "agent_declared",
      "connector_observed",
      "runtime_configured",
      "unknown",
    ]);
    expect(serialized).not.toContain('"verification"');
    expect(serialized).not.toContain('"pathId"');
    expect(serialized).not.toContain('"fixtureId"');
  });

  it("uses the context profile for neutral mint records and provenance labels", () => {
    expect(mintInputSchema.properties.agent.$ref).toBe("#/$defs/contextLine");
    expect(mintInputSchema.properties.model.$ref).toBe("#/$defs/contextLine");
    expect(mintInputSchema.$defs.contextLine["x-thought-context-profile"])
      .toBe(THOUGHT_V2_CONTEXT_PROFILE_ID);
    expect(agentDeclarationSchema.properties.label["x-thought-context-profile"])
      .toBe(THOUGHT_V2_CONTEXT_PROFILE_ID);
    expect(agentDeclarationSchema.properties.status.const).toBe("declared-unverified");
  });

  it("requires declaration-aware artifacts in the eventual manifest", () => {
    expect(releaseInput.requiredArtifactRoles).toEqual(expect.arrayContaining([
      expect.objectContaining({ role: "agent-declaration-schema" }),
      expect.objectContaining({ role: "creation-attestation-profile" }),
      expect.objectContaining({ role: "creation-attestation-vectors" }),
      expect.objectContaining({ role: "context-profile" }),
      expect.objectContaining({ role: "metadata-profile" }),
      expect.objectContaining({ role: "mint-input-schema" }),
      expect.objectContaining({ role: "provenance-schema" }),
      expect.objectContaining({ role: "renderer-profile" }),
      expect.objectContaining({ role: "renderer-glyph-packed-im76" }),
      expect.objectContaining({ role: "contract-abi" }),
      expect.objectContaining({ role: "creation-attestation-verifier-abi" }),
      expect.objectContaining({ role: "work-hash-vectors" }),
    ]));
  });
});
