import { describe, expect, it } from "vitest";

import {
  flattenThoughtProvenance,
  parseThoughtWorkTokenId,
  provenanceSectionTitle,
  thoughtWorkDetailHref,
} from "./thought-v2-work";

describe("THOUGHT work detail routing", () => {
  it("builds and parses a stable token-scoped detail URL", () => {
    expect(thoughtWorkDetailHref(42)).toBe("/thought-v2-work.html?token=42");
    expect(parseThoughtWorkTokenId("?token=42")).toBe(42);
  });

  it("rejects absent, malformed, zero, and unsafe token IDs", () => {
    for (const search of ["", "?token=", "?token=0", "?token=01", "?token=-1", "?token=1.5"]) {
      expect(() => parseThoughtWorkTokenId(search)).toThrow();
    }
    expect(() => parseThoughtWorkTokenId("?token=9007199254740992")).toThrow(
      "safe integer range",
    );
    expect(() => thoughtWorkDetailHref(0)).toThrow("positive safe integer");
  });
});

describe("THOUGHT work detail provenance presentation", () => {
  it("flattens every nested provenance leaf without shortening values", () => {
    const longHash = `0x${"ab".repeat(32)}`;
    const leaves = flattenThoughtProvenance({
      mintContext: { chainId: "31337" },
      process: { kind: "agent-run", transport: { runIdHash: longHash } },
      schema: "inshell.thought.provenance.v2",
    });

    expect(leaves).toEqual([
      { path: "provenance.mintContext.chainId", value: "31337" },
      { path: "provenance.process.kind", value: "agent-run" },
      { path: "provenance.process.transport.runIdHash", value: longHash },
      { path: "provenance.schema", value: "inshell.thought.provenance.v2" },
    ]);
    expect(leaves[2]!.value).toHaveLength(66);
  });

  it("turns canonical property keys into display headings", () => {
    expect(provenanceSectionTitle("mintContext")).toBe("MINT CONTEXT");
    expect(provenanceSectionTitle("resultEnvelopeKeccak256")).toBe(
      "RESULT ENVELOPE KECCAK256",
    );
  });
});
