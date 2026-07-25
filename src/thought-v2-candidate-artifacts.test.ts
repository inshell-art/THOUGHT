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
  THOUGHT_V2_METADATA_ATTESTED_ATTRIBUTE_ORDER,
  THOUGHT_V2_METADATA_PROFILE_ID,
  THOUGHT_V2_PROVENANCE_PROFILE_ID,
  THOUGHT_V2_METADATA_UNATTESTED_ATTRIBUTE_ORDER,
} from "./thought-v2-terminal-study-metadata";
import {
  THOUGHT_V2_RENDERER_ID,
  THOUGHT_V2_WORK_PROFILE_ID,
} from "./thought-v2-terminal-work-profile";

describe("THOUGHT V2 declaration-aware candidate artifacts", () => {
  it("pins declaration, context, metadata, provenance, work, and renderer identities", () => {
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
        familyId: "S301",
        libraryMemberId: "inshell.thought.glyph-library.set-03.humanist-smooth",
        librarySetId: "inshell.thought.glyph-library.set-03",
        pathDefinitionIndex: {
          byteLength: 375,
          entryCount: 75,
          entryEncoding: "uint8-part,uint16be-offset,uint16be-length",
          keccak256: "0x113d43ed0e3a6ce486779bca9734801493dd9c5c629e4816b8be3d445f1b9825",
        },
      },
      id: THOUGHT_V2_RENDERER_ID,
      implementationId:
        "inshell.thought.renderer.v2.humanist-smooth-native-paths-frame-32-006100-green-00ff00-prompt-top-agent-bottom",
      metrics: {
        fixedAdvance: 6,
        glyphScale: 4.8,
        maxColumns: 29,
        maxRows: 4,
        visualBaseline: 5.58,
      },
      restrictions: {
        embeddedFont: false,
        fallbackFonts: false,
        foreignObject: false,
        svgText: false,
        systemFontLookup: false,
      },
    });
    expect(rendererProfile.glyphSource.pathDefinitions).toHaveLength(2);
    expect(rendererProfile.qualification).toMatchObject({
      adoptedByThoughtV2: true,
      rendererReleaseReady: true,
      visualReview: "pass",
    });
  });

  it("freezes the attestation-gated trait orders and exact typed/provenance parity", () => {
    expect(metadataProfile.attributeOrder).toEqual({
      attested: THOUGHT_V2_METADATA_ATTESTED_ATTRIBUTE_ORDER,
      unattested: THOUGHT_V2_METADATA_UNATTESTED_ATTRIBUTE_ORDER,
    });
    expect(metadataProfile.traitExclusions).toEqual({
      conversationForm: "fixture-only",
      workProfileId: "technical-property",
    });
    expect(metadataProfile.declarations).toMatchObject({
      assurance: "declared-unverified",
      attestationBindsExactHashes: true,
      attestedTraitTypes: ["Attested Agent", "Attested Model"],
      contextProfileId: THOUGHT_V2_CONTEXT_PROFILE_ID,
      marketplaceTraitGate: "nonzero-creation-attestation-digest",
      typedStateAuthoritative: true,
      unattestedTraitTypes: [],
      workIdentityInput: false,
    });
    expect(workProfile.declarations).toMatchObject({
      assurance: "declared-unverified",
      contextProfileId: THOUGHT_V2_CONTEXT_PROFILE_ID,
      metadataTraits: {
        attested: ["Attested Agent", "Attested Model"],
        gate: "nonzero-creation-attestation-digest",
        unattested: [],
      },
      provenanceRequired: true,
      workIdentityInput: false,
    });
    expect(releaseInput.declarations).toMatchObject({
      attestationClaimFields: ["declaredAgentHash", "declaredModelHash"],
      contractGetters: [
        "declaredAgentOf",
        "declaredAgentHashOf",
        "declaredModelOf",
        "declaredModelHashOf",
      ],
      metadataTraits: {
        attested: ["Attested Agent", "Attested Model"],
        gate: "nonzero-creation-attestation-digest",
        unattested: [],
      },
      typedMintFields: ["declaredAgent", "declaredModel"],
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

  it("uses the context profile for mint and Agent declaration labels", () => {
    expect(mintInputSchema.properties.declaredAgent.$ref).toBe("#/$defs/contextLine");
    expect(mintInputSchema.properties.declaredModel.$ref).toBe("#/$defs/contextLine");
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
      expect.objectContaining({ role: "renderer-glyph-definitions-1" }),
      expect.objectContaining({ role: "renderer-glyph-definitions-2" }),
      expect.objectContaining({ role: "renderer-glyph-definition-index" }),
      expect.objectContaining({ role: "renderer-glyph-license" }),
      expect.objectContaining({ role: "renderer-glyph-notice" }),
      expect.objectContaining({ role: "contract-abi" }),
      expect.objectContaining({ role: "creation-attestation-verifier-abi" }),
      expect.objectContaining({ role: "work-hash-vectors" }),
    ]));
  });
});
