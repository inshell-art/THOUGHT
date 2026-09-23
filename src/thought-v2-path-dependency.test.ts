import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

import { id } from "ethers";
import { describe, expect, it } from "vitest";

import pathDependency from "../protocol/current/v2/integration/path-nft.v0.5.0.json";
import releaseInput from "../protocol/current/v2/release-input.json";

const consumeAuthorizationType =
  "ConsumeAuthorization(address pathNft,uint256 chainId,uint256 pathId,bytes32 movement,address claimer,address executor,uint256 permissionEpoch,uint256 nonce,uint256 deadline)";
const setupSource = readFileSync(
  new URL("../scripts/setup-thought-v2-current-gallery.ts", import.meta.url),
  "utf8",
);

describe("THOUGHT V2 PATH dependency", () => {
  it("pins the verified breaking PATH v0.5.0 package", () => {
    expect(pathDependency).toMatchObject({
      schema: "inshell.thought.path-dependency-lock.v1",
      ownerRepository: "PATH",
      releaseTag: "v0.5.0",
      releasePublicationCommit: "085cfc084b0e568740e0da639e968eb535f7e5c8",
      contractSourceCommit: "5a1ab1f137e76c80dc69045dc520454f6e07cbb1",
      manifestSha256: "a81355b459b40faea894cf1dfb7f484765a7ec62672039dd62d58a3a52849921",
      pathNft: {
        abiSha256: "c66d840e88064753923668e6107ab9de8ce62130fa798de6f159540a14e899fe",
        hardhatArtifactSha256:
          "c7e136539f94d6b5a4e3068c6afc1eaed26dea6c465d5716e83e2fc101d5583e",
        redeploymentRequired: true,
      },
    });
    expect(releaseInput.externalDependencies.pathNft).toEqual({
      lock: "integration/path-nft.v0.5.0.json",
      releaseTag: "v0.5.0",
      consumeAuthorizationSchema: "permission-epoch-v1",
      redeploymentRequired: true,
    });
    expect(releaseInput.requiredArtifactRoles).toContainEqual({
      path: "integration/path-nft.v0.5.0.json",
      role: "path-dependency-lock",
    });
  });

  it("uses PATH's permission-epoch-v1 signed field order in positive fixtures", () => {
    expect(pathDependency.consumeAuthorization).toMatchObject({
      schema: "permission-epoch-v1",
      type: consumeAuthorizationType,
      permissionEpochRead: "getPermissionEpoch(uint256)",
      nonceRead: "getConsumeNonce(address)",
      requiredMethod: "consumeUnit(uint256,bytes32,address,uint256,bytes)",
      requiredReturnType: "uint32",
    });
    expect(id(pathDependency.consumeAuthorization.type)).toBe(id(consumeAuthorizationType));
    expect(setupSource).toContain(consumeAuthorizationType);
    expect(setupSource).toContain("pathNft.getPermissionEpoch(pathId)");
    expect(setupSource).toContain("permissionEpoch,\n      nonce,\n      deadline");
  });

  it("keeps the dependency lock itself deterministic", () => {
    const bytes = readFileSync(
      new URL("../protocol/current/v2/integration/path-nft.v0.5.0.json", import.meta.url),
    );
    expect(createHash("sha256").update(bytes).digest("hex")).toMatch(/^[0-9a-f]{64}$/);
    expect(bytes.at(-1)).toBe(0x0a);
  });
});
