import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import boundary from "../protocol/current/v2/integration/thought.app-contract-boundary.v1.json";
import mintInputSchema from "../protocol/current/v2/contract/thought.mint-input.v2.schema.json";
import pathDependency from "../protocol/current/v2/integration/path-nft.v0.5.0.json";
import {
  CREATION_ATTESTATION_DOMAIN_NAME,
  CREATION_ATTESTATION_DOMAIN_VERSION,
  CREATION_ATTESTATION_PRIMARY_TYPE,
  CREATION_ATTESTATION_TYPES,
  THOUGHT_CREATION_ATTESTATION_PROFILE,
} from "./thought-v2-current-creation-attestation";
import {
  THOUGHT_V2_CONTEXT_PROFILE_ID,
  THOUGHT_V2_MAX_CONTEXT_BYTES,
} from "./thought-v2-context-profile";
import {
  THOUGHT_V2_METADATA_ATTRIBUTE_ORDER,
  THOUGHT_V2_METADATA_PROFILE_ID,
  THOUGHT_V2_PROVENANCE_PROFILE_ID,
} from "./thought-v2-terminal-study-metadata";
import { THOUGHT_V2_MAX_PROVENANCE_BYTES } from "./thought-v2-terminal-provenance";
import {
  THOUGHT_V2_MAX_LINE_BYTES,
  THOUGHT_V2_RENDERER_ID,
  THOUGHT_V2_WORK_PROFILE_ID,
} from "./thought-v2-terminal-work-profile";

const current = boundary.currentExecutableBoundary;
const thoughtNftSource = readFileSync(
  new URL("../evm/src/v2/ThoughtNFTV2.sol", import.meta.url),
  "utf8",
);

describe("THOUGHT V2 App-contract boundary draft", () => {
  it("describes the current executable mint and constructor surface exactly", () => {
    expect(boundary).toMatchObject({
      authoritative: false,
      implementationBaseline: "current-v2-registry-bound-candidate",
      productionAuthorization: false,
      status: "contract-owner-draft-for-joint-review",
    });
    expect(current.mintInputFields).toEqual(mintInputSchema.required);
    expect(current.constructorDependencies).toEqual([
      "pathNft",
      "thoughtSpecRegistry",
      "thoughtRenderer",
      "protocolRegistry",
      "protocolReleaseId",
      "creationAttestationVerifier",
    ]);

    for (const dependency of current.constructorDependencies) {
      expect(thoughtNftSource).toContain(`public immutable ${dependency}`);
    }
    expect(thoughtNftSource).toContain(".isRegisteredThoughtSpec(input.thoughtSpecId, input.thoughtSpecHash)");
    expect(thoughtNftSource).toContain(".isRegistered(protocolReleaseId_)");
  });

  it("pins profiles, byte envelopes, and neutral trait policy", () => {
    expect(current.profiles).toEqual({
      context: THOUGHT_V2_CONTEXT_PROFILE_ID,
      creationAttestation: THOUGHT_CREATION_ATTESTATION_PROFILE,
      metadata: THOUGHT_V2_METADATA_PROFILE_ID,
      provenance: THOUGHT_V2_PROVENANCE_PROFILE_ID,
      renderer: THOUGHT_V2_RENDERER_ID,
      work: THOUGHT_V2_WORK_PROFILE_ID,
    });
    expect(current.limits).toEqual({
      agentLineUtf8Bytes: THOUGHT_V2_MAX_LINE_BYTES,
      agentUtf8Bytes: THOUGHT_V2_MAX_CONTEXT_BYTES,
      modelUtf8Bytes: THOUGHT_V2_MAX_CONTEXT_BYTES,
      promptLineUtf8Bytes: THOUGHT_V2_MAX_LINE_BYTES,
      provenanceUtf8Bytes: THOUGHT_V2_MAX_PROVENANCE_BYTES,
    });
    expect(current.metadataTraits.attested).toEqual(
      THOUGHT_V2_METADATA_ATTRIBUTE_ORDER,
    );
    expect(current.metadataTraits.unattested).toEqual(
      THOUGHT_V2_METADATA_ATTRIBUTE_ORDER,
    );
    expect(current.metadataTraits).toMatchObject({
      agentModelGate: "none",
    });
  });

  it("pins PATH v0.5.0 permission-epoch authorization without changing mint calldata", () => {
    expect(current.pathDependency).toEqual({
      lock: "path-nft.v0.5.0.json",
      releaseTag: "v0.5.0",
      consumeAuthorizationSchema: "permission-epoch-v1",
      signerReads: [
        "getPermissionEpoch(pathId)",
        "getConsumeNonce(claimer)",
      ],
      signedFieldOrder: [
        "pathNft",
        "chainId",
        "pathId",
        "movement",
        "claimer",
        "executor",
        "permissionEpoch",
        "nonce",
        "deadline",
      ],
      pathNftRedeploymentRequired: true,
    });
    expect(pathDependency.consumeAuthorization.schema).toBe(
      current.pathDependency.consumeAuthorizationSchema,
    );
    expect(current.mintInputFields).not.toContain("permissionEpoch");
  });

  it("pins the exact current EIP-712 interface and canonical empty proof", () => {
    expect(current.creationAttestation).toMatchObject({
      domainName: CREATION_ATTESTATION_DOMAIN_NAME,
      domainVersion: CREATION_ATTESTATION_DOMAIN_VERSION,
      primaryType: CREATION_ATTESTATION_PRIMARY_TYPE,
    });
    expect(current.creationAttestation.claimFields).toEqual(
      CREATION_ATTESTATION_TYPES.CreationAttestation.map(({ name }) => name),
    );
    expect(current.creationAttestation.emptyProof).toEqual({
      authorityEpoch: 0,
      deadline: "0",
      result: "Unattested",
      runIdHash: `0x${"00".repeat(32)}`,
      signature: "0x",
    });
  });

  it("keeps the proposed registry-removal target visibly unapproved", () => {
    expect(boundary.proposedTarget).toMatchObject({
      implementationAuthorized: false,
      replacementRegistryAuthorized: false,
      status: "discussion-only-not-authorized",
    });
    expect(boundary.proposedTarget.removeFromActiveMintPath).toEqual([
      "thoughtSpecRegistry",
      "thoughtSpecId",
      "thoughtSpecHash",
      "protocolRegistry",
      "protocolReleaseId",
    ]);
    expect(boundary.knownAuthorityConflict.resolution).toBe(
      "joint-review-required-before-authoritative-document-or-contract-change",
    );
    expect(boundary.openDecisions.map(({ id }) => id)).toEqual([
      "D1",
      "D2",
      "D3",
      "D4",
      "D5",
      "D6",
      "D7",
      "D8",
    ]);
  });
});
