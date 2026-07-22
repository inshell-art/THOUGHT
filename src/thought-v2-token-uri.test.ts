import { describe, expect, it } from "vitest";

import tokenVectors from "../protocol/releases/v2/conformance/token-uri-vectors.json";
import { keccak256, toUtf8Bytes } from "ethers";

import { deriveProtocolReleaseId } from "./thought-v2-protocol";
import { buildVerifiedCanonicalProvenance, type ThoughtProtocolBinding } from "./thought-v2-provenance";
import { buildThoughtV2Metadata, buildThoughtV2TokenUri } from "./thought-v2-token-uri";

describe("THOUGHT binary-weave attempt tokenURI", () => {
  const emptyDigest = `0x${"00".repeat(32)}` as const;
  const verifier = `0x${"44".repeat(20)}` as const;

  it("reproduces the frozen one-byte metadata and tokenURI vector exactly", () => {
    const manifestKeccak256 = `0x${"11".repeat(32)}` as const;
    const expected = tokenVectors.vectors[0]!;
    const tokenProvenance = JSON.parse(expected.provenance.canonicalJson);
    const protocol = tokenProvenance.protocol;
    const metadata = JSON.parse(expected.metadata);
    const input = {
      agentLine: "b",
      declaredAgent: "Codex",
      declaredModel: "Model A",
      creationAttestationDigest: emptyDigest,
      creationAttestationVerifier: verifier,
      manifestKeccak256,
      minter: `0x${"33".repeat(20)}` as const,
      mintedAt: 1_700_000_000n,
      pathId: 1n,
      pathSerial: 0n,
      promptLine: "a",
      protocolReleaseId: deriveProtocolReleaseId(manifestKeccak256),
      provenanceJson: expected.provenance.canonicalJson,
      rendererProfileKeccak256: metadata.properties.rendererProfileKeccak256 as `0x${string}`,
      thoughtSpecHash: protocol.thoughtSpecHash as `0x${string}`,
      thoughtSpecId: protocol.thoughtSpecId as `0x${string}`,
      tokenId: 1n,
      workProfileKeccak256: metadata.properties.workProfileKeccak256 as `0x${string}`,
    };
    expect(buildThoughtV2Metadata(input)).toBe(expected.metadata);
    expect(buildThoughtV2TokenUri(input)).toBe(expected.tokenURI);
  });

  it("freezes exact observer attribute and technical property order", () => {
    const metadata = tokenVectors.vectors[0]!.metadata;
    const order = [
      '"trait_type":"Prompt"',
      '"trait_type":"Agent Response"',
      '"trait_type":"Declared Agent"',
      '"trait_type":"Declared Model"',
      '"trait_type":"Creation Attestation"',
      '"trait_type":"Texture Density"',
    ].map((value) => metadata.indexOf(value));
    expect(order).toEqual([...order].sort((a, b) => a - b));
    expect(metadata).not.toContain('"trait_type":"Protocol"');
    expect(metadata).not.toContain('"trait_type":"Binary Contrast"');
    for (const key of ["promptWeight", "agentWeight", "loomWeight", "bitDistance"]) {
      expect(metadata).toContain(`"${key}":`);
    }
  });

  it("freezes the exact Solidity parity context tokenURI hash", () => {
    const manifestKeccak256 = keccak256(
      toUtf8Bytes("inshell.thought.protocol.v2.test"),
    ) as `0x${string}`;
    const protocolReleaseId = deriveProtocolReleaseId(manifestKeccak256);
    const rendererProfileKeccak256 = "0xc68ec09234f316cfdb19b96456e04f76f4f4674b3bb6596117cc39d124d1f6e1";
    const workProfileKeccak256 = "0xfaa37b147f7ea37a790f35b67707d895e1b4b11481434289d444faace3d72674";
    const thoughtSpecHash = keccak256(
      toUtf8Bytes("# THOUGHT.v2.md\n\nVersion: v2\n\nThe contract mints final visible V2 lines only.\n"),
    ) as `0x${string}`;
    const thoughtNft = "0xa0cb889707d426a7a386870a03bc70d1b0697598" as const;
    const minter = "0xe05fcc23807536bee418f142d19fa0d21bb0cff7" as const;
    const protocol: ThoughtProtocolBinding = {
      manifestKeccak256,
      protocolReleaseId,
      thoughtSpecHash,
      thoughtSpecId: keccak256(toUtf8Bytes("THOUGHT.v2.md")) as `0x${string}`,
    };
    const exactSpecBytes = toUtf8Bytes(
      "# THOUGHT.v2.md\n\nVersion: v2\n\nThe contract mints final visible V2 lines only.\n",
    );
    const selectedPair = { thoughtSpecId: protocol.thoughtSpecId, thoughtSpecHash };
    const provenance = buildVerifiedCanonicalProvenance({
      protocol,
      selectedSpec: {
        specName: "THOUGHT.v2.md",
        exactSpecBytes,
        registeredPair: selectedPair,
        mintPair: selectedPair,
        tokenStatePair: selectedPair,
      },
      promptLine: "a",
      agentLine: "b",
      process: {
        agentDeclaration: {
          label: "Fixture Agent",
          source: "manual",
          status: "declared-unverified",
        },
        kind: "manual",
        modelDeclaration: {
          label: "Fixture Model",
          source: "manual",
          status: "declared-unverified",
        },
      },
      mintContext: {
        chainId: "31337",
        intendedMinter: minter,
        thoughtNft,
      },
    }, {
      declaredAgent: "Fixture Agent",
      declaredModel: "Fixture Model",
    });
    const tokenURI = buildThoughtV2TokenUri({
      tokenId: 1n,
      promptLine: "a",
      agentLine: "b",
      declaredAgent: "Fixture Agent",
      declaredModel: "Fixture Model",
      creationAttestationDigest: emptyDigest,
      creationAttestationVerifier: "0xc7183455a4c133ae270771860664b6b7ec320bb1",
      provenanceJson: provenance.canonicalJson,
      protocolReleaseId,
      manifestKeccak256,
      rendererProfileKeccak256,
      workProfileKeccak256,
      thoughtSpecId: keccak256(toUtf8Bytes("THOUGHT.v2.md")) as `0x${string}`,
      thoughtSpecHash,
      pathId: 1n,
      pathSerial: 0n,
      minter,
      mintedAt: 1_700_000_000n,
    });

    expect(keccak256(toUtf8Bytes(tokenURI))).toBe(
      "0xc7029a29c4fcf3e0f28627a8017a119f7a363cebbe7891a5f2ace0de5bf57796",
    );
  });
});
