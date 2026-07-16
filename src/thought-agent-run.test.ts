import { beforeAll, describe, expect, it } from "vitest";

import {
  authorizeThoughtRunRead,
  authorizeThoughtRunWrite,
  cancelThoughtAgentRun,
  claimThoughtAgentRun,
  createThoughtAgentRun,
  expireThoughtAgentRun,
  failThoughtAgentRun,
  prepareThoughtAgentRun,
  startThoughtAgentRun,
  submitThoughtAgentResult,
  thoughtRunPublicUrl,
} from "./thought-agent-run";
import {
  embeddedThoughtV2ReleaseBundle,
  verifyEmbeddedThoughtV2Release,
  type VerifiedRelease,
} from "./thought-v2-release";

let release: VerifiedRelease;

beforeAll(async () => {
  release = await verifyEmbeddedThoughtV2Release();
});

const create = () => createThoughtAgentRun({
  runId: "run-1",
  promptLine: "MiXeD é prompt",
  release,
  expiresAt: 100,
});

const resultBytes = (agentLine = "result"): string => JSON.stringify({
  schema: "inshell.thought.agent-result.v2",
  release: {
    protocolReleaseId: release.protocolReleaseId,
    manifestKeccak256: release.manifestHash,
  },
  agentLine,
});

describe("THOUGHT Agent run", () => {
  it("seals the exact verified release and allows only legal state transitions", () => {
    const created = create();
    expect(created.promptLine).toBe("MiXeD é prompt");
    expect(created.taskBinding.protocolReleaseId).toBe(release.protocolReleaseId);
    expect(created.taskBinding.agentResultSchemaKeccak256).toMatch(/^0x[0-9a-f]{64}$/);
    const claimed = claimThoughtAgentRun(created, 1);
    const running = startThoughtAgentRun(claimed, 2);
    const returned = submitThoughtAgentResult(running, resultBytes(), 3);
    expect(returned.state).toBe("returned");
    expect(returned.result?.agentLine).toBe("result");
    expect(() => cancelThoughtAgentRun(returned)).toThrow("final");
  });

  it("fails closed on release drift, unknown fields, and invalid Agent lines", () => {
    const running = startThoughtAgentRun(claimThoughtAgentRun(create(), 1), 2);
    const wrongRelease = JSON.parse(resultBytes()) as Record<string, unknown>;
    wrongRelease.release = { protocolReleaseId: `0x${"ff".repeat(32)}`, manifestKeccak256: release.manifestHash };
    expect(() => submitThoughtAgentResult(running, JSON.stringify(wrongRelease), 3)).toThrow("release ID mismatch");
    expect(() => submitThoughtAgentResult(running, JSON.stringify({
      ...JSON.parse(resultBytes()),
      extra: true,
    }), 3)).toThrow("shape mismatch");
    expect(() => submitThoughtAgentResult(running, resultBytes(" bad"), 3)).toThrow();
    expect(running.state).toBe("running");
    expect(running.resultBytes).toBeUndefined();
  });

  it("accepts identical result retries and rejects conflicting second results", () => {
    const running = startThoughtAgentRun(claimThoughtAgentRun(create(), 1), 2);
    const exact = resultBytes();
    const returned = submitThoughtAgentResult(running, exact, 3);
    expect(submitThoughtAgentResult(returned, exact, 4)).toBe(returned);
    expect(() => submitThoughtAgentResult(returned, resultBytes("different"), 4)).toThrow("conflicting result");
  });

  it("prepares from the embedded bundle without a remote protocol fetch", async () => {
    let fetched = false;
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (() => { fetched = true; throw new Error("network disabled"); }) as typeof fetch;
    try {
      const prepared = await prepareThoughtAgentRun({
        runId: "offline",
        promptLine: "offline release",
        bundle: embeddedThoughtV2ReleaseBundle,
        onchain: { protocolReleaseId: release.protocolReleaseId, manifestHash: release.manifestHash },
        expiresAt: 100,
      });
      expect(prepared.taskBinding.protocolReleaseId).toBe(release.protocolReleaseId);
      expect(fetched).toBe(false);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("supports cancellation and expiry without reviving terminal runs", () => {
    expect(cancelThoughtAgentRun(create()).state).toBe("cancelled");
    expect(failThoughtAgentRun(claimThoughtAgentRun(create(), 1), 2).state).toBe("failed");
    const expired = expireThoughtAgentRun(create(), 100);
    expect(expired.state).toBe("expired");
    expect(() => claimThoughtAgentRun(expired, 101)).toThrow("expired");
  });

  it("separates read and write credentials and never puts write credentials in URLs", () => {
    const credentials = { viewCredential: "view-secret", writeCredential: "write-secret" };
    expect(authorizeThoughtRunRead("view-secret", credentials)).toBe(true);
    expect(authorizeThoughtRunRead("write-secret", credentials)).toBe(true);
    expect(authorizeThoughtRunWrite("view-secret", credentials)).toBe(false);
    expect(authorizeThoughtRunWrite("write-secret", credentials)).toBe(true);
    const url = thoughtRunPublicUrl("https://inshell.art", "run-1", credentials.viewCredential);
    expect(url).toBe("https://inshell.art/thought/runs/run-1#view=view-secret");
    expect(url).not.toContain(credentials.writeCredential);
  });
});
