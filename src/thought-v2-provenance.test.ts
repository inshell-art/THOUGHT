import { describe, expect, it } from "vitest";

import {
  buildThoughtProvenance,
  packedFieldBytes,
  serializeThoughtProvenance,
  thoughtProvenanceKeccak256,
  verifyThoughtProvenance,
  type ThoughtProtocolAnchor,
} from "./thought-v2-provenance";

const anchor = (id: string): ThoughtProtocolAnchor => ({
  id,
  keccak256: `0x${"11".repeat(32)}`,
  ref: `protocol/${id}.md`,
});

const base = {
  protocol: anchor("inshell.thought.protocol.v2"),
  spec: anchor("THOUGHT.v2.md"),
  workProfile: anchor("inshell.thought.work.v2"),
  renderer: anchor("inshell.thought.svg.v2.binary-interleave-32"),
  promptLine: "quiet signal",
  agentLine: "quiet return",
};

describe("thought v2 provenance", () => {
  it("builds deterministic manual provenance without unknown post-mint facts", () => {
    const provenance = buildThoughtProvenance({ ...base, transport: { kind: "manual" } });
    const first = serializeThoughtProvenance(provenance);
    const second = serializeThoughtProvenance({ ...provenance });

    expect(first).toBe(second);
    expect(first.endsWith("\n")).toBe(false);
    expect(first.indexOf('"agentLine"')).toBeLessThan(first.indexOf('"promptLine"'));
    expect(packedFieldBytes(provenance)).toHaveLength(128);
    expect(thoughtProvenanceKeccak256(first)).toMatch(/^0x[0-9a-f]{64}$/);
    expect(verifyThoughtProvenance(provenance)).toEqual([]);
    expect(first).not.toContain("tokenId");
    expect(first).not.toContain("transactionHash");
  });

  it("supports run transport while keeping raw response outside Agent-authored JSON", () => {
    const provenance = buildThoughtProvenance({
      ...base,
      transport: { kind: "run", runId: "run-1", rawResponseSha256: "22".repeat(32) },
    });
    expect(provenance.transport).toEqual({
      kind: "run",
      runId: "run-1",
      rawResponseSha256: "22".repeat(32),
    });
    expect(serializeThoughtProvenance(provenance)).not.toContain("rawAgentReturn");
  });

  it("rejects one-bit field changes and exact-line hash changes", () => {
    const provenance = buildThoughtProvenance({ ...base, transport: { kind: "manual" } });
    const changedBit = provenance.binaryFieldPacked.slice(0, -1) +
      (provenance.binaryFieldPacked.endsWith("0") ? "1" : "0");
    expect(verifyThoughtProvenance({ ...provenance, binaryFieldPacked: changedBit })).toContain(
      "binaryFieldPacked mismatch",
    );
    expect(verifyThoughtProvenance({ ...provenance, promptLine: "quiet signal " })).not.toEqual([]);
  });
});
