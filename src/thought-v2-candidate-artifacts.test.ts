import { describe, expect, it } from "vitest";

import agentDeclarationSchema from "../protocol/current/v2/agent/thought.agent-declaration.v1.schema.json";
import contextProfile from "../protocol/current/v2/context/thought.context.v2.profile.json";
import mintInputSchema from "../protocol/current/v2/contract/thought.mint-input.v2.schema.json";
import metadataProfile from "../protocol/current/v2/metadata/thought.metadata.v2.profile.json";
import provenanceSchema from "../protocol/current/v2/provenance/thought.provenance.v2.schema.json";
import releaseInput from "../protocol/current/v2/release-input.json";
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
  });

  it("freezes declaration trait order and exact typed/provenance parity", () => {
    expect(metadataProfile.attributeOrder).toEqual(THOUGHT_V2_METADATA_ATTRIBUTE_ORDER);
    expect(metadataProfile.traitExclusions).toEqual({
      conversationForm: "fixture-only",
      workProfileId: "technical-property",
    });
    expect(metadataProfile.declarations).toMatchObject({
      assurance: "declared-unverified",
      attestationBindsExactHashes: true,
      contextProfileId: THOUGHT_V2_CONTEXT_PROFILE_ID,
      traitTypes: ["Declared Agent", "Declared Model"],
      typedStateAuthoritative: true,
      workIdentityInput: false,
    });
    expect(workProfile.declarations).toMatchObject({
      assurance: "declared-unverified",
      contextProfileId: THOUGHT_V2_CONTEXT_PROFILE_ID,
      metadataTraits: ["Declared Agent", "Declared Model"],
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
      expect.objectContaining({ role: "contract-abi" }),
      expect.objectContaining({ role: "creation-attestation-verifier-abi" }),
      expect.objectContaining({ role: "work-hash-vectors" }),
    ]));
  });
});
