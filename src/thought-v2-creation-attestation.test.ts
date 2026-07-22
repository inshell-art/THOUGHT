import { AbiCoder, TypedDataEncoder, Wallet, id, keccak256, toUtf8Bytes, verifyTypedData } from "ethers";
import { describe, expect, it } from "vitest";

import fixtureVectors from "../protocol/releases/v2/attestation/fixtures/creation-attestation-vectors.json";

import {
  CREATION_ATTESTATION_DOMAIN_NAME,
  CREATION_ATTESTATION_DOMAIN_VERSION,
  CREATION_ATTESTATION_PRIMARY_TYPE,
  CREATION_ATTESTATION_TYPES,
  CREATION_ATTESTATION_TYPEHASH,
  CREATION_ATTESTATION_TYPE_STRING,
  assertCreationAttestationProof,
  creationAttestationDomain,
  hashCreationAttestationClaim,
  hashCreationAttestationStruct,
  isEmptyCreationAttestationProof,
  THOUGHT_CREATION_ATTESTATION_PROFILE_ID,
  type ThoughtCreationAttestationClaim,
} from "./thought-v2-creation-attestation";
import { verifyProvenance } from "./thought-v2-provenance";

const verifier = `0x${"22".repeat(20)}` as const;
const thoughtNft = `0x${"11".repeat(20)}` as const;
const minter = `0x${"33".repeat(20)}` as const;
const chainId = 31_337n;
const wallet = new Wallet(`0x${"44".repeat(32)}`);
const claim = (): ThoughtCreationAttestationClaim => ({
  profileId: THOUGHT_CREATION_ATTESTATION_PROFILE_ID,
  thoughtNft,
  protocolReleaseId: id("release") as `0x${string}`,
  thoughtSpecId: id("THOUGHT.v2.md") as `0x${string}`,
  thoughtSpecHash: id("exact THOUGHT.v2.md bytes") as `0x${string}`,
  workHash: id("work") as `0x${string}`,
  provenanceHash: id("provenance") as `0x${string}`,
  declaredAgentHash: keccak256(toUtf8Bytes("Fixture Agent")) as `0x${string}`,
  declaredModelHash: keccak256(toUtf8Bytes("Fixture Model")) as `0x${string}`,
  runIdHash: id("public-safe-run") as `0x${string}`,
  intendedMinter: minter,
  deadline: 1_700_000_000n,
  authorityEpoch: 1n,
});

describe("THOUGHT binary-weave attempt creation attestation", () => {
  it("replays every generated ASCII, Unicode, one-byte, and boundary claim vector", () => {
    expect(fixtureVectors.profileId).toBe(THOUGHT_CREATION_ATTESTATION_PROFILE_ID);
    expect(fixtureVectors.typeString).toBe(CREATION_ATTESTATION_TYPE_STRING);
    expect(fixtureVectors.typeHash).toBe(CREATION_ATTESTATION_TYPEHASH);
    for (const rawVector of fixtureVectors.vectors) {
      const vector = rawVector as typeof rawVector & {
        agentLine: string;
        promptLine: string;
        provenance: { canonicalJson: string; keccak256: `0x${string}`; processKind: string };
      };
      const value = {
        ...vector.claim,
        deadline: BigInt(vector.claim.deadline),
        authorityEpoch: BigInt(vector.claim.authorityEpoch),
      } as ThoughtCreationAttestationClaim;
      const domain = creationAttestationDomain(BigInt(vector.domain.chainId), vector.domain.verifyingContract as `0x${string}`);
      const provenanceVerification = verifyProvenance(
        new TextEncoder().encode(vector.provenance.canonicalJson),
        undefined,
        {
          promptLine: vector.promptLine,
          agentLine: vector.agentLine,
          declaredAgent: vector.declaredAgent,
          declaredModel: vector.declaredModel,
          workHash: value.workHash,
          provenanceHash: value.provenanceHash,
          protocolReleaseId: value.protocolReleaseId,
          thoughtSpecId: value.thoughtSpecId,
          thoughtSpecHash: value.thoughtSpecHash,
          thoughtNft: value.thoughtNft,
          intendedMinter: value.intendedMinter.toLowerCase() as `0x${string}`,
          attestationClaim: {
            chainId: vector.domain.chainId,
            declaredAgentHash: value.declaredAgentHash,
            declaredModelHash: value.declaredModelHash,
            intendedMinter: value.intendedMinter.toLowerCase() as `0x${string}`,
            protocolReleaseId: value.protocolReleaseId,
            provenanceHash: value.provenanceHash,
            runIdHash: value.runIdHash,
            thoughtNft: value.thoughtNft.toLowerCase() as `0x${string}`,
            thoughtSpecHash: value.thoughtSpecHash,
            thoughtSpecId: value.thoughtSpecId,
            workHash: value.workHash,
          },
        },
      );
      expect(provenanceVerification.conforming, vector.id).toBe(true);
      expect(provenanceVerification.provenanceHash, vector.id).toBe(vector.provenance.keccak256);
      expect(value.provenanceHash, vector.id).toBe(vector.provenance.keccak256);
      expect(provenanceVerification.parsed?.process.kind, vector.id).toBe(vector.provenance.processKind);
      expect(provenanceVerification.parsed?.process.kind, vector.id).toBe("agent-run");
      if (provenanceVerification.parsed?.process.kind === "agent-run") {
        expect(provenanceVerification.parsed.process.transport.runIdHash, vector.id).toBe(value.runIdHash);
      }
      expect(vector.provenance.canonicalJson, vector.id).not.toContain("gallery-fixture");
      expect(vector.provenance.canonicalJson, vector.id).not.toContain("corpus");
      expect(vector.provenance.canonicalJson, vector.id).not.toContain("src/thought-v2-fixtures.ts");
      expect(TypedDataEncoder.hashDomain(domain), vector.id).toBe(vector.domainSeparator);
      expect(hashCreationAttestationStruct(value), vector.id).toBe(vector.structHash);
      expect(hashCreationAttestationClaim(BigInt(vector.domain.chainId), vector.domain.verifyingContract as `0x${string}`, value), vector.id)
        .toBe(vector.digest);
      expect(verifyTypedData(domain, CREATION_ATTESTATION_TYPES, value, vector.signature).toLowerCase(), vector.id)
        .toBe(vector.authority);
    }
    const safeNonAscii = fixtureVectors.vectors.filter((vector) => vector.promptLine === "你好");
    expect(safeNonAscii).toHaveLength(2);
    expect(new Set(safeNonAscii.map((vector) => vector.claim.thoughtSpecId)).size).toBe(2);
    expect(new Set(safeNonAscii.map((vector) => vector.claim.thoughtSpecHash)).size).toBe(2);
  });

  it("freezes the exact profile, domain, primary type, field order, struct hash, and digest", () => {
    expect(CREATION_ATTESTATION_PRIMARY_TYPE).toBe("CreationAttestation");
    expect(CREATION_ATTESTATION_TYPEHASH).toBe(id(CREATION_ATTESTATION_TYPE_STRING));
    expect(CREATION_ATTESTATION_TYPES.CreationAttestation?.map(({ name, type }) => `${type} ${name}`))
      .toEqual([
        "bytes32 profileId", "address thoughtNft", "bytes32 protocolReleaseId",
        "bytes32 thoughtSpecId", "bytes32 thoughtSpecHash", "bytes32 workHash",
        "bytes32 provenanceHash", "bytes32 declaredAgentHash", "bytes32 declaredModelHash",
        "bytes32 runIdHash", "address intendedMinter", "uint64 deadline", "uint32 authorityEpoch",
      ]);
    expect(creationAttestationDomain(chainId, verifier)).toEqual({
      name: CREATION_ATTESTATION_DOMAIN_NAME,
      version: CREATION_ATTESTATION_DOMAIN_VERSION,
      chainId,
      verifyingContract: "0x2222222222222222222222222222222222222222",
    });

    const value = claim();
    const manualStruct = keccak256(AbiCoder.defaultAbiCoder().encode(
      ["bytes32", ...CREATION_ATTESTATION_TYPES.CreationAttestation!.map(({ type }) => type)],
      [CREATION_ATTESTATION_TYPEHASH, ...CREATION_ATTESTATION_TYPES.CreationAttestation!.map(({ name }) =>
        value[name as keyof ThoughtCreationAttestationClaim])],
    ));
    expect(hashCreationAttestationStruct(value)).toBe(manualStruct);
    expect(hashCreationAttestationClaim(chainId, verifier, value)).toBe(
      TypedDataEncoder.hash(creationAttestationDomain(chainId, verifier), CREATION_ATTESTATION_TYPES, value),
    );
  });

  it("signs and recovers exact claims while every committed-field change changes the digest", async () => {
    const value = claim();
    const signature = await wallet.signTypedData(
      creationAttestationDomain(chainId, verifier),
      CREATION_ATTESTATION_TYPES,
      value,
    );
    expect(signature).toMatch(/^0x[0-9a-f]{130}$/);
    expect(verifyTypedData(
      creationAttestationDomain(chainId, verifier),
      CREATION_ATTESTATION_TYPES,
      value,
      signature,
    )).toBe(wallet.address);

    for (const changed of [
      { ...value, thoughtNft: verifier },
      { ...value, protocolReleaseId: id("other release") as `0x${string}` },
      { ...value, thoughtSpecId: id("other spec id") as `0x${string}` },
      { ...value, thoughtSpecHash: id("other spec hash") as `0x${string}` },
      { ...value, workHash: id("other work") as `0x${string}` },
      { ...value, provenanceHash: id("other provenance") as `0x${string}` },
      { ...value, declaredAgentHash: id("other agent") as `0x${string}` },
      { ...value, declaredModelHash: id("other model") as `0x${string}` },
      { ...value, runIdHash: id("other run") as `0x${string}` },
      { ...value, intendedMinter: verifier },
      { ...value, deadline: value.deadline + 1n },
      { ...value, authorityEpoch: 2n },
    ]) {
      expect(hashCreationAttestationClaim(chainId, verifier, changed)).not.toBe(
        hashCreationAttestationClaim(chainId, verifier, value),
      );
    }
    expect(hashCreationAttestationClaim(chainId + 1n, verifier, value)).not.toBe(
      hashCreationAttestationClaim(chainId, verifier, value),
    );
  });

  it("invalidates the previous draft type and one-byte provenance substitutions", async () => {
    const value = claim();
    const oldTypes = {
      CreationAttestation: CREATION_ATTESTATION_TYPES.CreationAttestation!
        .filter(({ name }) => name !== "thoughtSpecId" && name !== "thoughtSpecHash"),
    };
    const oldSignature = await wallet.signTypedData(
      creationAttestationDomain(chainId, verifier),
      oldTypes,
      value,
    );
    expect(verifyTypedData(
      creationAttestationDomain(chainId, verifier),
      CREATION_ATTESTATION_TYPES,
      value,
      oldSignature,
    )).not.toBe(wallet.address);

    const canonical = new TextEncoder().encode('{"schema":"inshell.thought.provenance.v2"}');
    const mutated = Uint8Array.from(canonical);
    mutated[mutated.length - 2] ^= 1;
    const originalHash = keccak256(canonical) as `0x${string}`;
    const mutatedHash = keccak256(mutated) as `0x${string}`;
    expect(mutatedHash).not.toBe(originalHash);
    expect(hashCreationAttestationClaim(chainId, verifier, { ...value, provenanceHash: mutatedHash }))
      .not.toBe(hashCreationAttestationClaim(chainId, verifier, { ...value, provenanceHash: originalHash }));

    expect(fixtureVectors.previousDraftProof.typeHash).not.toBe(CREATION_ATTESTATION_TYPEHASH);
    expect(fixtureVectors.previousDraftProof.recoveredAuthority)
      .toBe(fixtureVectors.vectors[0]!.authority);
    expect(fixtureVectors.selectedPairSubstitution.substitutedDigest)
      .not.toBe(fixtureVectors.selectedPairSubstitution.originalDigest);
    expect(fixtureVectors.selectedPairSubstitution.recoveredFromReusedSignature)
      .not.toBe(fixtureVectors.vectors[0]!.authority);
    expect(fixtureVectors.oneByteProvenanceMutation.mutatedProvenanceHash)
      .not.toBe(fixtureVectors.oneByteProvenanceMutation.originalProvenanceHash);
    expect(fixtureVectors.oneByteProvenanceMutation.mutatedDigest)
      .not.toBe(fixtureVectors.oneByteProvenanceMutation.originalDigest);
  });

  it("accepts only all-zero empty proof or a complete 65-byte proof shape", () => {
    const empty = {
      runIdHash: `0x${"00".repeat(32)}` as const,
      deadline: 0n,
      authorityEpoch: 0n,
      signature: "0x" as const,
    };
    expect(isEmptyCreationAttestationProof(empty)).toBe(true);
    expect(() => assertCreationAttestationProof(empty)).not.toThrow();
    expect(() => assertCreationAttestationProof({ ...empty, runIdHash: id("run") as `0x${string}` }))
      .toThrow("partially empty");
    expect(() => assertCreationAttestationProof({
      runIdHash: id("run") as `0x${string}`,
      deadline: 1n,
      authorityEpoch: 1n,
      signature: "0x01",
    })).toThrow("65-byte");
  });
});
