import { describe, expect, it } from "vitest";

import vectors from "../protocol/current/v2/attestation/fixtures/creation-attestation-v2-vectors.json";
import {
  CREATION_ATTESTATION_DOMAIN_VERSION,
  CREATION_ATTESTATION_TYPE_STRING,
  CREATION_ATTESTATION_TYPEHASH,
  THOUGHT_CREATION_ATTESTATION_PROFILE,
  THOUGHT_CREATION_ATTESTATION_PROFILE_ID,
  hashCreationAttestationClaim,
  hashCreationAttestationStruct,
  type ThoughtCreationAttestationClaim,
} from "./thought-v2-current-creation-attestation";

describe("THOUGHT V2 neutral-record creation attestation", () => {
  it("replays the exact shared EIP-712 vector", () => {
    const vector = vectors.vectors[0]!;
    const claim = {
      ...vector.claim,
      authorityEpoch: BigInt(vector.claim.authorityEpoch),
      deadline: BigInt(vector.claim.deadline),
    } as ThoughtCreationAttestationClaim;

    expect(THOUGHT_CREATION_ATTESTATION_PROFILE).toBe(vectors.profile);
    expect(THOUGHT_CREATION_ATTESTATION_PROFILE_ID).toBe(vectors.profileId);
    expect(CREATION_ATTESTATION_DOMAIN_VERSION).toBe(vectors.domain.version);
    expect(CREATION_ATTESTATION_TYPE_STRING).toBe(vectors.typeString);
    expect(CREATION_ATTESTATION_TYPEHASH).toBe(vectors.typeHash);
    expect(hashCreationAttestationStruct(claim)).toBe(vector.structHash);
    expect(hashCreationAttestationClaim(
      BigInt(vectors.domain.chainId),
      vectors.domain.verifyingContract as `0x${string}`,
      claim,
    )).toBe(vector.digest);
  });

  it("binds both neutral record hashes", () => {
    const vector = vectors.vectors[0]!;
    const claim = {
      ...vector.claim,
      authorityEpoch: BigInt(vector.claim.authorityEpoch),
      deadline: BigInt(vector.claim.deadline),
    } as ThoughtCreationAttestationClaim;
    const digest = hashCreationAttestationClaim(
      BigInt(vectors.domain.chainId),
      vectors.domain.verifyingContract as `0x${string}`,
      claim,
    );

    expect(hashCreationAttestationClaim(
      BigInt(vectors.domain.chainId),
      vectors.domain.verifyingContract as `0x${string}`,
      { ...claim, agentHash: `0x${"11".repeat(32)}` },
    )).not.toBe(digest);
    expect(hashCreationAttestationClaim(
      BigInt(vectors.domain.chainId),
      vectors.domain.verifyingContract as `0x${string}`,
      { ...claim, modelHash: `0x${"22".repeat(32)}` },
    )).not.toBe(digest);
  });
});
