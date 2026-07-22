import { describe, expect, it } from "vitest";

import {
  embeddedThoughtV2ReleaseBundle,
  hashExactBytes,
  requireVerifiedArtifact,
  verifyProtocolRelease,
} from "./thought-v2-release";
import { deriveProtocolReleaseId } from "./thought-v2-protocol";

const cloneBundle = () => structuredClone(embeddedThoughtV2ReleaseBundle);

describe("THOUGHT binary-weave attempt exact bundle", () => {
  it("verifies every embedded byte offline and exposes immutable release facts", async () => {
    const release = await verifyProtocolRelease(cloneBundle(), {
      protocolReleaseId: embeddedThoughtV2ReleaseBundle.expectedProtocolReleaseId,
      manifestHash: embeddedThoughtV2ReleaseBundle.expectedManifestHash,
      rendererProfileKeccak256: embeddedThoughtV2ReleaseBundle.artifacts
        .find((artifact) => artifact.role === "renderer-profile")!.keccak256,
      workProfileKeccak256: embeddedThoughtV2ReleaseBundle.artifacts
        .find((artifact) => artifact.role === "work-profile")!.keccak256,
    });
    expect(release.verified).toBe(true);
    expect(release.status).toBe("draft");
    expect(release.protocolReleaseId).toBe(deriveProtocolReleaseId(release.manifestHash));
    expect(release.artifacts.size).toBe(release.manifest.artifacts.length);
    expect(requireVerifiedArtifact(release, "creative-spec").bytes.length).toBeGreaterThan(0);
    expect(Object.isFrozen(release)).toBe(true);
  });

  it("fails closed on missing or one-byte-corrupt embedded artifacts", async () => {
    const missing = cloneBundle();
    missing.artifacts.pop();
    await expect(verifyProtocolRelease(missing)).rejects.toThrow("artifact count mismatch");

    const corrupt = cloneBundle();
    const bytes = Buffer.from(corrupt.artifacts[0]!.bytesBase64, "base64");
    bytes[0] ^= 1;
    corrupt.artifacts[0]!.bytesBase64 = bytes.toString("base64");
    await expect(verifyProtocolRelease(corrupt)).rejects.toThrow("artifact hash mismatch");
  });

  it("fails closed on manifest, release, profile, and shape drift", async () => {
    const manifestDrift = cloneBundle();
    const bytes = Buffer.from(manifestDrift.manifestBytesBase64, "base64");
    bytes[0] ^= 1;
    manifestDrift.manifestBytesBase64 = bytes.toString("base64");
    await expect(verifyProtocolRelease(manifestDrift)).rejects.toThrow("manifest hash mismatch");

    await expect(verifyProtocolRelease(cloneBundle(), {
      protocolReleaseId: `0x${"ff".repeat(32)}`,
      manifestHash: embeddedThoughtV2ReleaseBundle.expectedManifestHash,
    })).rejects.toThrow("onchain protocol release ID mismatch");
    await expect(verifyProtocolRelease(cloneBundle(), {
      protocolReleaseId: embeddedThoughtV2ReleaseBundle.expectedProtocolReleaseId,
      manifestHash: embeddedThoughtV2ReleaseBundle.expectedManifestHash,
      workProfileKeccak256: `0x${"ff".repeat(32)}`,
    })).rejects.toThrow("work profile hash mismatch");

    const extra = cloneBundle();
    (extra.artifacts[0] as unknown as Record<string, unknown>).extra = true;
    await expect(verifyProtocolRelease(extra)).rejects.toThrow("artifact shape mismatch");
  });

  it("hashes exact bytes rather than parsed semantics", () => {
    const lf = new TextEncoder().encode("{\"a\":1}\n");
    const crlf = new TextEncoder().encode("{\"a\":1}\r\n");
    const noFinalLf = new TextEncoder().encode("{\"a\":1}");
    const bom = Uint8Array.from([0xef, 0xbb, 0xbf, ...lf]);
    expect(new Set([lf, crlf, noFinalLf, bom].map(hashExactBytes)).size).toBe(4);
  });
});
