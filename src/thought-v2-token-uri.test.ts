import { describe, expect, it } from "vitest";

import tokenVectors from "../protocol/releases/v2/conformance/token-uri-vectors.json";
import provenanceVectors from "../protocol/releases/v2/conformance/provenance-vectors.json";
import { keccak256, toUtf8Bytes } from "ethers";

import { deriveProtocolReleaseId } from "./thought-v2-protocol";
import { buildThoughtV2Metadata, buildThoughtV2TokenUri } from "./thought-v2-token-uri";

describe("THOUGHT V2 canonical tokenURI", () => {
  it("reproduces the frozen one-byte metadata and tokenURI vector exactly", () => {
    const manifestKeccak256 = `0x${"11".repeat(32)}` as const;
    const protocol = provenanceVectors.valid[0]!.record.protocol;
    const input = {
      agentLine: "b",
      manifestKeccak256,
      minter: `0x${"33".repeat(20)}` as const,
      mintedAt: 1_700_000_000n,
      pathId: 1n,
      pathSerial: 0n,
      promptLine: "a",
      protocolReleaseId: deriveProtocolReleaseId(manifestKeccak256),
      provenanceJson: provenanceVectors.valid[0]!.canonicalJson,
      rendererProfileKeccak256: protocol.rendererProfile.keccak256 as `0x${string}`,
      thoughtSpecHash: keccak256(toUtf8Bytes("fixture thought spec")) as `0x${string}`,
      thoughtSpecId: keccak256(toUtf8Bytes("THOUGHT.v2.md")) as `0x${string}`,
      tokenId: 1n,
      workProfileKeccak256: protocol.workProfile.keccak256 as `0x${string}`,
    };
    const expected = tokenVectors.vectors[0]!;
    expect(buildThoughtV2Metadata(input)).toBe(expected.metadata);
    expect(buildThoughtV2TokenUri(input)).toBe(expected.tokenURI);
  });

  it("freezes exact observer attribute and technical property order", () => {
    const metadata = tokenVectors.vectors[0]!.metadata;
    const order = [
      '"trait_type":"Prompt"',
      '"trait_type":"Agent Response"',
      '"trait_type":"Texture Density"',
      '"trait_type":"Binary Contrast"',
      '"trait_type":"Protocol"',
    ].map((value) => metadata.indexOf(value));
    expect(order).toEqual([...order].sort((a, b) => a - b));
    expect(metadata).not.toContain("Declared Agent");
    for (const key of ["promptWeight", "agentWeight", "loomWeight", "bitDistance"]) {
      expect(metadata).toContain(`"${key}":`);
    }
  });

  it("freezes the exact Solidity parity context tokenURI hash", () => {
    const manifestKeccak256 = keccak256(
      toUtf8Bytes("inshell.thought.protocol.v2.test"),
    ) as `0x${string}`;
    const tokenURI = buildThoughtV2TokenUri({
      tokenId: 1n,
      promptLine: "a",
      agentLine: "b",
      provenanceJson: '{"app":"THOUGHT","version":"v2","route":"codex","agentVerified":false}',
      protocolReleaseId: deriveProtocolReleaseId(manifestKeccak256),
      manifestKeccak256,
      rendererProfileKeccak256: "0x6c124e260dcbfe801614b89da24bb31d407303e7cd93cc3e6a6ac372c862de88",
      workProfileKeccak256: "0x8b590ab95432b0dd5002a4fb1419475751bdf0210a73338bf633533005d182bb",
      thoughtSpecId: keccak256(toUtf8Bytes("THOUGHT.v2.md")) as `0x${string}`,
      thoughtSpecHash: keccak256(
        toUtf8Bytes("# THOUGHT.v2.md\n\nVersion: v2\n\nThe contract mints final visible V2 lines only.\n"),
      ) as `0x${string}`,
      pathId: 1n,
      pathSerial: 0n,
      minter: "0xe05fcc23807536bee418f142d19fa0d21bb0cff7",
      mintedAt: 1_700_000_000n,
    });

    expect(keccak256(toUtf8Bytes(tokenURI))).toBe(
      "0x8565890ca125fd9feb741173fde3383dbced208c3d20b8002790ddee660a8522",
    );
  });
});
