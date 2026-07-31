import { id, keccak256, toUtf8Bytes } from "ethers";
import { describe, expect, it } from "vitest";

import {
  buildVerifiedCanonicalThoughtV2Provenance,
  THOUGHT_V2_PROVENANCE_SCHEMA,
  verifyThoughtV2Provenance,
  type ThoughtV2ProvenanceInput,
} from "./thought-v2-terminal-provenance";

const specName = "THOUGHT.v2.md";
const exactSpecBytes = toUtf8Bytes("# THOUGHT.v2.md\n\nVersion: v2\n\nTerminal English.\n");
const protocol = {
  manifestKeccak256: keccak256(toUtf8Bytes("disposable manifest")) as `0x${string}`,
  protocolReleaseId: keccak256(toUtf8Bytes("disposable release")) as `0x${string}`,
  thoughtSpecHash: keccak256(exactSpecBytes) as `0x${string}`,
  thoughtSpecId: id(specName) as `0x${string}`,
} as const;

const manualInput = (): ThoughtV2ProvenanceInput => ({
  agentLine: "I am here.",
  mintContext: {
    chainId: "31337",
    intendedMinter: "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266",
    thoughtNft: "0x1000000000000000000000000000000000000001",
  },
  process: {
    agentDeclaration: {
      label: "Not applicable",
      source: "manual",
      status: "declared-unverified",
    },
    kind: "manual",
    modelDeclaration: {
      label: "Not applicable",
      source: "manual",
      status: "declared-unverified",
    },
  },
  promptLine: "Are you there?",
  protocol,
  selectedSpec: { exactSpecBytes, specName },
});

describe("THOUGHT V2 canonical production provenance", () => {
  it("builds and re-verifies exact manual provenance without harness bookkeeping", () => {
    const built = buildVerifiedCanonicalThoughtV2Provenance(manualInput());
    const parsed = JSON.parse(built.canonicalJson);

    expect(built.verification.conforming).toBe(true);
    expect(parsed.schema).toBe(THOUGHT_V2_PROVENANCE_SCHEMA);
    expect(parsed.process).toEqual({
      agentDeclaration: {
        label: "Not applicable",
        source: "manual",
        status: "declared-unverified",
      },
      kind: "manual",
      modelDeclaration: {
        label: "Not applicable",
        source: "manual",
        status: "declared-unverified",
      },
    });
    expect(built.provenanceHash).toBe(keccak256(built.exactBytes));
    expect(built.canonicalJson).not.toMatch(/fixture|corpus|sourceFile|pathId|tokenId/);
  });

  it("derives the agent-run transport commitments in the shared builder", () => {
    const input = manualInput();
    input.process = {
      agentDeclaration: {
        label: "Inshell THOUGHT App",
        source: "runtime_configured",
        status: "declared-unverified",
      },
      kind: "agent-run",
      modelDeclaration: {
        identifier: "openai/gpt-example",
        label: "Example Model",
        source: "connector_observed",
        status: "declared-unverified",
      },
      transport: {
        adapter: "inshell.thought",
        provider: "openai",
        resultEnvelope: { agentLine: "I am here.", schema: "example.result.v1" },
        route: "responses",
        runReference: "public-run-reference-1",
      },
    };

    const built = buildVerifiedCanonicalThoughtV2Provenance(input);
    expect(built.provenance.process).toMatchObject({
      kind: "agent-run",
      transport: {
        resultEnvelopeKeccak256: keccak256(toUtf8Bytes(
          '{"agentLine":"I am here.","schema":"example.result.v1"}',
        )),
        runIdHash: keccak256(toUtf8Bytes("public-run-reference-1")),
      },
    });
  });

  it("checks every creation-attestation claim commitment before signing", () => {
    const input = manualInput();
    input.process = {
      agentDeclaration: {
        label: "Inshell THOUGHT App",
        source: "runtime_configured",
        status: "declared-unverified",
      },
      kind: "agent-run",
      modelDeclaration: {
        label: "OpenAI GPT-5",
        source: "runtime_configured",
        status: "declared-unverified",
      },
      transport: {
        adapter: "inshell.thought.app",
        resultEnvelope: { agentLine: input.agentLine, status: "complete" },
        runReference: "public-anvil-run-0001",
      },
    };
    const built = buildVerifiedCanonicalThoughtV2Provenance(input);
    if (built.provenance.process.kind !== "agent-run") throw new Error("expected Agent-run provenance");
    const claim = {
      chainId: input.mintContext.chainId,
      agentHash: keccak256(toUtf8Bytes(input.process.agentDeclaration.label)) as `0x${string}`,
      modelHash: keccak256(toUtf8Bytes(input.process.modelDeclaration.label)) as `0x${string}`,
      intendedMinter: input.mintContext.intendedMinter,
      protocolReleaseId: input.protocol.protocolReleaseId,
      provenanceHash: built.provenanceHash,
      runIdHash: built.provenance.process.transport.runIdHash,
      thoughtNft: input.mintContext.thoughtNft,
      thoughtSpecHash: input.protocol.thoughtSpecHash,
      thoughtSpecId: input.protocol.thoughtSpecId,
      workHash: built.provenance.work.workHash as `0x${string}`,
    };

    expect(verifyThoughtV2Provenance(
      built.exactBytes,
      { attestationClaim: claim },
      input.selectedSpec,
    ).conforming).toBe(true);
    expect(verifyThoughtV2Provenance(
      built.exactBytes,
      { attestationClaim: { ...claim, runIdHash: id("wrong-run") as `0x${string}` } },
      input.selectedSpec,
    ).issues).toEqual(expect.arrayContaining([
      expect.objectContaining({
        code: "attestation.mismatch",
        path: "process.transport.runIdHash",
      }),
    ]));
  });

  it("rejects a creation-attestation claim over manual provenance", () => {
    const input = manualInput();
    const built = buildVerifiedCanonicalThoughtV2Provenance(input);
    const verification = verifyThoughtV2Provenance(built.exactBytes, {
      attestationClaim: {
        chainId: input.mintContext.chainId,
        agentHash: keccak256(toUtf8Bytes(input.process.agentDeclaration.label)) as `0x${string}`,
        modelHash: keccak256(toUtf8Bytes(input.process.modelDeclaration.label)) as `0x${string}`,
        intendedMinter: input.mintContext.intendedMinter,
        protocolReleaseId: input.protocol.protocolReleaseId,
        provenanceHash: built.provenanceHash,
        runIdHash: id("manual-run") as `0x${string}`,
        thoughtNft: input.mintContext.thoughtNft,
        thoughtSpecHash: input.protocol.thoughtSpecHash,
        thoughtSpecId: input.protocol.thoughtSpecId,
        workHash: built.provenance.work.workHash as `0x${string}`,
      },
    });

    expect(verification.issues).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: "attestation.process_kind", path: "process.kind" }),
    ]));
  });

  it("rejects non-JCS bytes and typed-state drift", () => {
    const built = buildVerifiedCanonicalThoughtV2Provenance(manualInput());
    const nonCanonical = toUtf8Bytes(JSON.stringify(JSON.parse(built.canonicalJson), null, 2));
    expect(verifyThoughtV2Provenance(nonCanonical).issues.map(({ code }) => code))
      .toContain("json.jcs");

    const drift = verifyThoughtV2Provenance(built.exactBytes, {
      agent: "A different Agent",
      provenanceHash: built.provenanceHash,
    });
    expect(drift.issues).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: "parity.typed", path: "process.agentDeclaration.label" }),
    ]));
  });

  it("fails closed when exact selected-spec bytes do not match the registered pair", () => {
    const input = manualInput();
    input.selectedSpec = {
      exactSpecBytes: toUtf8Bytes("# THOUGHT.v2.md\n\nVersion: v2\n\nDrifted.\n"),
      specName,
    };
    expect(() => buildVerifiedCanonicalThoughtV2Provenance(input))
      .toThrow(/selected spec exact-byte hash mismatch/);
  });
});
