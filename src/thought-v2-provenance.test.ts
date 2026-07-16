import { beforeAll, describe, expect, it } from "vitest";

import {
  buildCanonicalProvenance,
  buildThoughtProvenance,
  serializeThoughtProvenance,
  thoughtProvenanceKeccak256,
  verifyProvenance,
  verifyThoughtProvenance,
  type ThoughtProtocolBinding,
  type ThoughtProvenanceV2,
} from "./thought-v2-provenance";
import { requireVerifiedArtifact, verifyEmbeddedThoughtV2Release } from "./thought-v2-release";

let protocol: ThoughtProtocolBinding;

beforeAll(async () => {
  const release = await verifyEmbeddedThoughtV2Release();
  const artifact = (role: string, id: string) => {
    const value = requireVerifiedArtifact(release, role);
    return { id, path: value.path, keccak256: value.keccak256 };
  };
  protocol = {
    protocolReleaseId: release.protocolReleaseId,
    manifestKeccak256: release.manifestHash,
    creativeSpec: artifact("creative-spec", "inshell.thought.v2"),
    agentResultSchema: artifact("agent-result-schema", "inshell.thought.agent-result.v2"),
    workProfile: artifact("work-profile", "inshell.thought.work.v2"),
    rendererProfile: artifact("renderer-profile", "inshell.thought.svg.v2.binary-weave-32"),
  };
});

const mintContext = {
  chainId: "31337",
  thoughtNft: `0x${"11".repeat(20)}` as const,
  pathNft: `0x${"22".repeat(20)}` as const,
  minter: `0x${"33".repeat(20)}` as const,
  movement: "THOUGHT" as const,
  pathId: "12",
};

const base = () => ({
  protocol,
  promptLine: "quiet signal",
  agentLine: "quiet return",
  mintContext,
});

describe("thought v2 provenance", () => {
  it("builds strict deterministic manual JCS without post-mint facts", () => {
    const provenance = buildThoughtProvenance({ ...base(), process: { kind: "manual" } });
    const first = serializeThoughtProvenance(provenance);
    const second = serializeThoughtProvenance({ ...provenance });

    expect(first).toBe(second);
    expect(first.endsWith("\n")).toBe(false);
    expect(first.indexOf('"mintContext"')).toBeLessThan(first.indexOf('"process"'));
    expect(provenance.work.binaryFieldPacked).toMatch(/^0x[0-9a-f]{256}$/);
    expect(thoughtProvenanceKeccak256(first)).toMatch(/^0x[0-9a-f]{64}$/);
    expect(verifyThoughtProvenance(provenance)).toEqual([]);
    expect(first).not.toContain("tokenId");
    expect(first).not.toContain("transactionHash");
  });

  it("supports an Agent-run declaration while labeling it unverified", () => {
    const provenance = buildThoughtProvenance({
      ...base(),
      process: {
        kind: "agent-run",
        agentDeclaration: {
          schema: "inshell.thought.agent-declaration.v1",
          status: "declared-unverified",
          agentLabel: "Codex",
          declaredOneCreativeResult: true,
        },
        transport: { adapter: "codex", runId: "run-1", rawResponseSha256: "22".repeat(32) },
      },
    });
    const exact = buildCanonicalProvenance({
      protocol,
      promptLine: provenance.work.promptLine,
      agentLine: provenance.work.agentLine,
      process: provenance.process,
      mintContext,
    });
    const verification = verifyProvenance(exact, protocol);
    expect(verification.conforming).toBe(true);
    expect(verification.declarations).toContain("Declared Agent: Codex (unverified)");
    expect(new TextDecoder().decode(exact)).not.toContain("rawAgentReturn");
  });

  it("rejects deterministic-field changes, typed conflicts, and non-JCS bytes", () => {
    const provenance = buildThoughtProvenance({ ...base(), process: { kind: "manual" } });
    const changedBit = provenance.work.binaryFieldPacked.slice(0, -1) +
      (provenance.work.binaryFieldPacked.endsWith("0") ? "1" : "0");
    const changed = {
      ...provenance,
      work: { ...provenance.work, binaryFieldPacked: changedBit },
    } as ThoughtProvenanceV2;
    expect(verifyThoughtProvenance(changed)).toContain("work.binaryFieldPacked mismatch");

    const exact = new TextEncoder().encode(serializeThoughtProvenance(provenance));
    expect(verifyProvenance(exact, protocol, {
      promptLine: "different",
      agentLine: provenance.work.agentLine,
    }).errors).toContain("typed promptLine mismatch");
    const newline = new TextEncoder().encode(`${new TextDecoder().decode(exact)}\n`);
    expect(verifyProvenance(newline).errors).toContain("provenance is not RFC 8785 canonical JSON");
  });
});
