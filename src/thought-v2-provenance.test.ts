import { id, keccak256, toUtf8Bytes } from "ethers";
import { beforeAll, describe, expect, it } from "vitest";

import provenanceVectors from "../protocol/releases/v2/conformance/provenance-vectors.json";
import provenanceSchema from "../protocol/releases/v2/provenance/thought.provenance.v2.schema.json";

import {
  PROVENANCE_PUBLIC_IDENTIFIER_MAX_BYTES,
  PROVENANCE_PUBLIC_STRING_MAX_BYTES,
  buildThoughtProvenance,
  buildVerifiedCanonicalProvenance,
  serializeThoughtProvenance,
  thoughtProvenanceKeccak256,
  verifyProvenance,
  verifyThoughtProvenance,
  type ThoughtAgentRunProcessEvidence,
  type ThoughtManualProcessEvidence,
  type ThoughtProtocolBinding,
  type ThoughtProvenanceAttestationFacts,
  type ThoughtSelectedSpecEvidence,
  type VerifiedCanonicalThoughtProvenance,
} from "./thought-v2-provenance";
import {
  MAX_PROVENANCE_BYTES,
  THOUGHT_AGENT_RESULT_ID,
  canonicalJsonStringify,
  type CanonicalJson,
} from "./thought-v2-protocol";
import { requireVerifiedArtifact, verifyEmbeddedThoughtV2Release } from "./thought-v2-release";

let protocol: ThoughtProtocolBinding;
let selectedSpec: ThoughtSelectedSpecEvidence;

beforeAll(async () => {
  const release = await verifyEmbeddedThoughtV2Release();
  const creativeSpec = requireVerifiedArtifact(release, "creative-spec");
  const pair = {
    thoughtSpecId: keccak256(toUtf8Bytes("THOUGHT.v2.md")) as `0x${string}`,
    thoughtSpecHash: creativeSpec.keccak256,
  };
  protocol = {
    manifestKeccak256: release.manifestHash,
    protocolReleaseId: release.protocolReleaseId,
    thoughtSpecHash: pair.thoughtSpecHash,
    thoughtSpecId: pair.thoughtSpecId,
  };
  selectedSpec = {
    specName: "THOUGHT.v2.md",
    exactSpecBytes: creativeSpec.bytes,
    registeredPair: pair,
    mintPair: pair,
  };
});

const mintContext = {
  chainId: "31337",
  intendedMinter: `0x${"33".repeat(20)}` as const,
  thoughtNft: `0x${"11".repeat(20)}` as const,
};

const manualProcess = (
  declaredAgent = "Codex",
  declaredModel = "Model A",
  identifier?: string,
): ThoughtManualProcessEvidence => ({
  agentDeclaration: {
    label: declaredAgent,
    source: "manual",
    status: "declared-unverified",
  },
  kind: "manual",
  modelDeclaration: {
    ...(identifier === undefined ? {} : { identifier }),
    label: declaredModel,
    source: "manual",
    status: "declared-unverified",
  },
});

const resultEnvelope = (input: {
  agentLine: string;
  declaredAgent: string;
  declaredModel: string;
  identifier?: string;
  source?: "runtime_configured" | "connector_observed" | "agent_declared" | "unknown";
  binding?: ThoughtProtocolBinding;
}): CanonicalJson => {
  const source = input.source ?? "runtime_configured";
  const binding = input.binding ?? protocol;
  return {
    agent: {
      label: input.declaredAgent,
      model: {
        ...(input.identifier === undefined ? {} : { identifier: input.identifier }),
        label: input.declaredModel,
        source,
      },
    },
    agentLine: input.agentLine,
    release: {
      manifestKeccak256: binding.manifestKeccak256,
      protocolReleaseId: binding.protocolReleaseId,
    },
    schema: THOUGHT_AGENT_RESULT_ID,
  };
};

const agentRunProcess = (input: {
  agentLine: string;
  declaredAgent?: string;
  declaredModel?: string;
  identifier?: string;
  runReference?: string;
  source?: "runtime_configured" | "connector_observed" | "agent_declared" | "unknown";
  binding?: ThoughtProtocolBinding;
  adapter?: string;
  provider?: string;
  route?: string;
}): ThoughtAgentRunProcessEvidence => {
  const declaredAgent = input.declaredAgent ?? "Codex";
  const declaredModel = input.declaredModel ?? "Model A";
  const source = input.source ?? "runtime_configured";
  return {
    agentDeclaration: { label: declaredAgent, source, status: "declared-unverified" },
    kind: "agent-run",
    modelDeclaration: {
      ...(input.identifier === undefined ? {} : { identifier: input.identifier }),
      label: declaredModel,
      source,
      status: "declared-unverified",
    },
    transport: {
      ...(input.adapter === undefined ? {} : { adapter: input.adapter }),
      ...(input.provider === undefined ? {} : { provider: input.provider }),
      resultEnvelope: resultEnvelope({
        agentLine: input.agentLine,
        declaredAgent,
        declaredModel,
        identifier: input.identifier,
        source,
        binding: input.binding,
      }),
      ...(input.route === undefined ? {} : { route: input.route }),
      runReference: input.runReference ?? "run-1",
    },
  };
};

const base = () => ({
  protocol,
  selectedSpec,
  promptLine: "quiet signal",
  agentLine: "quiet return",
  mintContext,
});

const buildManual = () => buildVerifiedCanonicalProvenance({
  ...base(),
  process: manualProcess(),
});

const buildAgentRun = (runReference = "run-1") => buildVerifiedCanonicalProvenance({
  ...base(),
  process: agentRunProcess({
    adapter: "codex",
    agentLine: base().agentLine,
    declaredModel: "GPT-5.6",
    identifier: "gpt-5.6-2026-07-15",
    provider: "openai-fixture",
    route: "fixture/agent-run",
    runReference,
  }),
});

const attestationFacts = (
  built: VerifiedCanonicalThoughtProvenance,
): ThoughtProvenanceAttestationFacts => {
  if (built.provenance.process.kind !== "agent-run") {
    throw new Error("test attestation facts require Agent-run provenance");
  }
  return {
    chainId: built.provenance.mintContext.chainId,
    declaredAgentHash: keccak256(toUtf8Bytes(built.provenance.process.agentDeclaration.label)) as `0x${string}`,
    declaredModelHash: keccak256(toUtf8Bytes(built.provenance.process.modelDeclaration.label)) as `0x${string}`,
    intendedMinter: built.provenance.mintContext.intendedMinter,
    protocolReleaseId: built.provenance.protocol.protocolReleaseId,
    provenanceHash: built.provenanceHash,
    runIdHash: built.provenance.process.transport.runIdHash,
    thoughtNft: built.provenance.mintContext.thoughtNft,
    thoughtSpecHash: built.provenance.protocol.thoughtSpecHash,
    thoughtSpecId: built.provenance.protocol.thoughtSpecId,
    workHash: built.provenance.work.workHash as `0x${string}`,
  };
};

describe("thought v2 canonical provenance correction", () => {
  it("freezes one strict closed schema for the corrected field tree", () => {
    expect(provenanceSchema.required).toEqual(["mintContext", "process", "protocol", "schema", "work"]);
    expect(provenanceSchema.additionalProperties).toBe(false);
    expect(provenanceSchema.$defs.mintContext.required).toEqual([
      "chainId", "intendedMinter", "thoughtNft",
    ]);
    expect(Object.keys(provenanceSchema.$defs.mintContext.properties).sort()).toEqual([
      "chainId", "intendedMinter", "thoughtNft",
    ]);
    expect(provenanceSchema.$defs.agentRunProcess.required).toContain("transport");
    expect(provenanceSchema.$defs.transport.required).toEqual([
      "resultEnvelopeKeccak256", "runIdHash",
    ]);
    expect(provenanceSchema.$defs.manualProcess.additionalProperties).toBe(false);
    expect(provenanceSchema.$defs.agentRunProcess.additionalProperties).toBe(false);
  });

  it("builds exact canonical manual provenance without PATH or legacy fields", () => {
    const built = buildManual();
    const first = serializeThoughtProvenance(built.provenance);
    const second = serializeThoughtProvenance({ ...built.provenance });

    expect(built.canonicalJson).toBe(first);
    expect(new TextDecoder().decode(built.exactBytes)).toBe(first);
    expect(built.provenanceHash).toBe(thoughtProvenanceKeccak256(first));
    expect(first).toBe(second);
    expect(first.endsWith("\n")).toBe(false);
    expect(built.verification.conforming).toBe(true);
    expect(verifyThoughtProvenance(built.provenance)).toEqual([]);
    expect(built.provenance.process).toEqual(manualProcess());
    expect(Object.keys(built.provenance.mintContext).sort()).toEqual([
      "chainId", "intendedMinter", "thoughtNft",
    ]);
    expect(Object.keys(built.provenance.protocol).sort()).toEqual([
      "manifestKeccak256", "protocolReleaseId", "thoughtSpecHash", "thoughtSpecId",
    ]);
    for (const forbidden of [
      '"minter"', '"movement"', '"pathId"', '"pathNft"', '"creativeSpec"',
      '"agentResultSchema"', '"rendererProfile"', '"workProfile"',
      '"declaredOneCreativeResult"', '"schema":"inshell.thought.agent-declaration.v1"',
    ]) {
      expect(first).not.toContain(forbidden);
    }
  });

  it("derives Agent-run commitments from the complete canonical result and exact run reference", () => {
    const runReference = "public-safe-run-0001";
    const process = agentRunProcess({
      adapter: "codex",
      agentLine: base().agentLine,
      declaredModel: "GPT-5.6",
      identifier: "gpt-5.6-2026-07-15",
      provider: "openai-fixture",
      route: "fixture/agent-run",
      runReference,
    });
    const built = buildVerifiedCanonicalProvenance({ ...base(), process });
    expect(built.provenance.process.kind).toBe("agent-run");
    if (built.provenance.process.kind !== "agent-run") throw new Error("unexpected process kind");
    expect(built.provenance.process.transport.resultEnvelopeKeccak256).toBe(
      keccak256(toUtf8Bytes(canonicalJsonStringify(process.transport.resultEnvelope))),
    );
    expect(built.provenance.process.transport.runIdHash).toBe(keccak256(toUtf8Bytes(runReference)));
    expect(built.canonicalJson).not.toContain(runReference);
    expect(built.canonicalJson).not.toContain("rawResponseSha256");
    expect(built.canonicalJson).not.toContain('"runId"');
    expect(built.verification.declarations).toEqual([
      "Declared Agent: Codex (unverified)",
      "Declared Model: GPT-5.6 (unverified; source runtime_configured)",
    ]);
  });

  it("keeps identical multilingual work facts across manual and Agent-run provenance", () => {
    const promptLine = "Quiet signal 你好";
    const agentLine = "quiet Agent مرحبا";
    const manual = buildVerifiedCanonicalProvenance({
      ...base(),
      promptLine,
      agentLine,
      process: manualProcess(),
    });
    const agentRun = buildVerifiedCanonicalProvenance({
      ...base(),
      promptLine,
      agentLine,
      process: agentRunProcess({ agentLine }),
    });

    expect(manual.verification.conforming).toBe(true);
    expect(agentRun.verification.conforming).toBe(true);
    expect(manual.provenance.work).toEqual(agentRun.provenance.work);
    expect(manual.provenance.process.kind).toBe("manual");
    expect(agentRun.provenance.process.kind).toBe("agent-run");
    expect(manual.canonicalJson).not.toBe(agentRun.canonicalJson);
  });

  it("keeps bounded minimum, representative, and maximum manual/Agent-run records below the contract cap", () => {
    const minimumManual = buildVerifiedCanonicalProvenance({
      ...base(),
      promptLine: "p",
      agentLine: "a",
      mintContext: { ...mintContext, chainId: "1" },
      process: manualProcess("A", "M"),
    });
    const representativeManual = buildManual();
    const representativeAgentRun = buildAgentRun();
    const maximumAgentRun = buildVerifiedCanonicalProvenance({
      ...base(),
      promptLine: "p".repeat(64),
      agentLine: "a".repeat(64),
      process: agentRunProcess({
        adapter: "a".repeat(PROVENANCE_PUBLIC_IDENTIFIER_MAX_BYTES),
        agentLine: "a".repeat(64),
        declaredAgent: "A".repeat(64),
        declaredModel: "M".repeat(64),
        identifier: "i".repeat(PROVENANCE_PUBLIC_STRING_MAX_BYTES),
        provider: "p".repeat(PROVENANCE_PUBLIC_IDENTIFIER_MAX_BYTES),
        route: "r".repeat(PROVENANCE_PUBLIC_IDENTIFIER_MAX_BYTES),
        runReference: "x".repeat(PROVENANCE_PUBLIC_IDENTIFIER_MAX_BYTES),
      }),
    });
    for (const built of [minimumManual, representativeManual, representativeAgentRun, maximumAgentRun]) {
      expect(built.exactBytes.length).toBeLessThan(MAX_PROVENANCE_BYTES);
      expect(built.verification.conforming).toBe(true);
    }
    expect(minimumManual.exactBytes.length).toBeLessThan(representativeManual.exactBytes.length);
    expect(representativeManual.exactBytes.length).toBeLessThan(maximumAgentRun.exactBytes.length);
  });

  it("rejects the exact observed legacy hybrid with ordered structured reasons", () => {
    const legacy = provenanceVectors.invalid.find((item) => item.id === "observed-legacy-hybrid") as
      | { canonicalJson?: string }
      | undefined;
    expect(legacy?.canonicalJson).toBeTypeOf("string");
    const verification = verifyProvenance(toUtf8Bytes(legacy!.canonicalJson!));
    expect(verification.conforming).toBe(false);
    const paths = verification.issues.map(({ path }) => path);
    for (const path of [
      "mintContext.minter",
      "mintContext.movement",
      "mintContext.pathId",
      "mintContext.pathNft",
      "mintContext.intendedMinter",
      "protocol.agentResultSchema",
      "protocol.creativeSpec",
      "protocol.rendererProfile",
      "protocol.workProfile",
      "protocol.thoughtSpecId",
      "protocol.thoughtSpecHash",
      "process.agentDeclaration.schema",
      "process.agentDeclaration.declaredOneCreativeResult",
      "process.agentDeclaration.source",
      "process.modelDeclaration.status",
      "process.transport",
    ]) {
      expect(paths, path).toContain(path);
    }
    expect(verification.issues[0]?.code).toBe("schema.missing_property");
  });

  it("rejects BOM, outer whitespace, final LF, invalid UTF-8, and non-JCS bytes", () => {
    const exact = buildManual().exactBytes;
    const text = new TextDecoder().decode(exact);
    const cases: [string, Uint8Array, string][] = [
      ["BOM", Uint8Array.from([0xef, 0xbb, 0xbf, ...exact]), "byte.bom"],
      ["leading", toUtf8Bytes(` ${text}`), "byte.outer_whitespace"],
      ["trailing", toUtf8Bytes(`${text} `), "byte.outer_whitespace"],
      ["final LF", toUtf8Bytes(`${text}\n`), "byte.final_lf"],
      ["invalid UTF-8", Uint8Array.from([0xff]), "json.invalid"],
      [
        "reordered",
        toUtf8Bytes(JSON.stringify({ schema: THOUGHT_AGENT_RESULT_ID, ...JSON.parse(text) })),
        "jcs.noncanonical",
      ],
    ];
    for (const [name, bytes, code] of cases) {
      expect(verifyProvenance(bytes).issues.map((issue) => issue.code), name).toContain(code);
    }
  });

  it("enforces strict process variants, grammars, nonzero values, and public strings", () => {
    const manual = buildManual().provenance;
    const withTransport = structuredClone(manual) as unknown as Record<string, unknown>;
    (withTransport.process as Record<string, unknown>).transport = {
      resultEnvelopeKeccak256: id("result"),
      runIdHash: id("run"),
    };
    expect(verifyProvenance(toUtf8Bytes(canonicalJsonStringify(withTransport as CanonicalJson))).issues)
      .toEqual(expect.arrayContaining([
        expect.objectContaining({ code: "schema.unexpected_property", path: "process.transport" }),
      ]));

    const agent = buildAgentRun().provenance;
    const missingTransport = structuredClone(agent) as unknown as Record<string, unknown>;
    delete (missingTransport.process as Record<string, unknown>).transport;
    expect(verifyProvenance(toUtf8Bytes(canonicalJsonStringify(missingTransport as CanonicalJson))).issues)
      .toEqual(expect.arrayContaining([
        expect.objectContaining({ code: "schema.missing_property", path: "process.transport" }),
      ]));

    const bad = structuredClone(agent) as unknown as Record<string, unknown>;
    const process = bad.process as Record<string, unknown>;
    (process.agentDeclaration as Record<string, unknown>).source = "manual";
    (process.modelDeclaration as Record<string, unknown>).status = "verified";
    (process.transport as Record<string, unknown>).runIdHash = `0x${"00".repeat(32)}`;
    (bad.mintContext as Record<string, unknown>).chainId = "0";
    expect(verifyProvenance(toUtf8Bytes(canonicalJsonStringify(bad as CanonicalJson))).issues)
      .toEqual(expect.arrayContaining([
        expect.objectContaining({ path: "process.agentDeclaration.source" }),
        expect.objectContaining({ path: "process.modelDeclaration.status" }),
        expect.objectContaining({ path: "process.transport.runIdHash" }),
        expect.objectContaining({ path: "mintContext.chainId" }),
      ]));

    expect(() => buildVerifiedCanonicalProvenance({
      ...base(),
      process: agentRunProcess({
        adapter: "contains space",
        agentLine: base().agentLine,
      }),
    })).toThrow("public identifier");
    expect(() => buildVerifiedCanonicalProvenance({
      ...base(),
      process: manualProcess("Codex", "Model A", " bad"),
    })).toThrow("outer U+0020");
    expect(() => buildVerifiedCanonicalProvenance({
      ...base(),
      process: manualProcess("Codex", "Model A", "bad\u00adidentifier"),
    })).toThrow("disallowed scalar");
    expect(() => buildVerifiedCanonicalProvenance({
      ...base(),
      process: manualProcess("Codex", "Model A", "bad\u205fidentifier"),
    })).toThrow("disallowed scalar");
  });

  it("requires selected-spec parity across exact bytes, registry, mint, token, claim, and provenance", () => {
    const pair = selectedSpec.mintPair;
    const allSurfaces = { ...selectedSpec, tokenStatePair: pair, claimPair: pair };
    const built = buildVerifiedCanonicalProvenance({
      ...base(),
      selectedSpec: allSurfaces,
      process: manualProcess(),
    });
    expect(built.verification.conforming).toBe(true);

    const wrongId = { ...pair, thoughtSpecId: `0x${"ff".repeat(32)}` as const };
    const wrongHash = { ...pair, thoughtSpecHash: `0x${"ee".repeat(32)}` as const };
    for (const evidence of [
      { ...allSurfaces, registeredPair: wrongId },
      { ...allSurfaces, mintPair: wrongHash },
      { ...allSurfaces, tokenStatePair: wrongId },
      { ...allSurfaces, claimPair: wrongHash },
    ]) {
      expect(() => buildVerifiedCanonicalProvenance({
        ...base(),
        selectedSpec: evidence,
        process: manualProcess(),
      })).toThrow(/selected spec verification failed/);
    }
    const mutatedSpecBytes = Uint8Array.from(selectedSpec.exactSpecBytes);
    mutatedSpecBytes[0] ^= 1;
    expect(() => buildVerifiedCanonicalProvenance({
      ...base(),
      selectedSpec: { ...selectedSpec, exactSpecBytes: mutatedSpecBytes },
      process: manualProcess(),
    })).toThrow("thoughtSpecHash parity mismatch");
  });

  it("recomputes work, reports typed conflicts, and rejects legacy builder input", () => {
    const manual = buildManual();
    const changed = structuredClone(manual.provenance);
    changed.work.binaryFieldPacked = `${changed.work.binaryFieldPacked.slice(0, -1)}0`;
    expect(verifyThoughtProvenance(changed).some((error) => error.includes("work.binaryFieldPacked mismatch")))
      .toBe(true);
    expect(verifyProvenance(manual.exactBytes, protocol, {
      promptLine: "different",
      declaredAgent: "Different Agent",
      intendedMinter: mintContext.intendedMinter,
    }).errors).toEqual(expect.arrayContaining([
      "typed promptLine mismatch",
      "typed declaredAgent mismatch",
    ]));

    const legacyProcess = {
      agentDeclaration: {
        declaredOneCreativeResult: true,
        label: "Codex",
        schema: "inshell.thought.agent-declaration.v1",
        status: "declared-unverified",
      },
      kind: "manual",
      modelDeclaration: { label: "Model A", source: "manual" },
    };
    expect(() => buildThoughtProvenance({
      ...base(),
      process: legacyProcess as never,
    })).toThrow(/unexpected property process.agentDeclaration/);
  });

  it("checks canonical Agent-run attestation parity and refuses manual or mismatched claims", () => {
    const built = buildAgentRun("public-safe-run-0042");
    const claim = attestationFacts(built);
    const verified = verifyProvenance(
      built.exactBytes,
      protocol,
      { attestationClaim: claim },
      { ...selectedSpec, claimPair: selectedSpec.mintPair },
    );
    expect(verified.conforming).toBe(true);

    const wrongRun = verifyProvenance(built.exactBytes, protocol, {
      attestationClaim: { ...claim, runIdHash: id("wrong-run") as `0x${string}` },
    });
    expect(wrongRun.issues).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: "attestation.mismatch", path: "attestationClaim.runIdHash" }),
    ]));
    const wrongPair = verifyProvenance(built.exactBytes, protocol, {
      attestationClaim: { ...claim, thoughtSpecId: id("other-spec") as `0x${string}` },
    });
    expect(wrongPair.issues).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: "attestation.mismatch", path: "attestationClaim.thoughtSpecId" }),
    ]));

    const manual = buildManual();
    const manualClaim: ThoughtProvenanceAttestationFacts = {
      ...claim,
      declaredAgentHash: keccak256(toUtf8Bytes(manual.provenance.process.agentDeclaration.label)) as `0x${string}`,
      declaredModelHash: keccak256(toUtf8Bytes(manual.provenance.process.modelDeclaration.label)) as `0x${string}`,
      provenanceHash: manual.provenanceHash,
      workHash: manual.provenance.work.workHash as `0x${string}`,
    };
    expect(verifyProvenance(manual.exactBytes, protocol, { attestationClaim: manualClaim }).issues)
      .toEqual(expect.arrayContaining([
        expect.objectContaining({ code: "attestation.process_kind" }),
      ]));

    const mutated = Uint8Array.from(built.exactBytes);
    mutated[mutated.length - 2] ^= 1;
    expect(thoughtProvenanceKeccak256(mutated)).not.toBe(built.provenanceHash);
    expect(verifyProvenance(mutated, protocol, { attestationClaim: claim }).conforming).toBe(false);
  });
});
