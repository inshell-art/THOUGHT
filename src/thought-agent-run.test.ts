import { describe, expect, it } from "vitest";

import {
  authorizeThoughtRunRead,
  authorizeThoughtRunWrite,
  cancelThoughtAgentRun,
  claimThoughtAgentRun,
  createThoughtAgentRun,
  expireThoughtAgentRun,
  failThoughtAgentRun,
  startThoughtAgentRun,
  submitThoughtAgentResult,
  thoughtRunPublicUrl,
} from "./thought-agent-run";

const create = () => createThoughtAgentRun({
  runId: "run-1",
  promptLine: "MiXeD é prompt",
  spec: { id: "spec", hash: `0x${"11".repeat(32)}`, ref: "THOUGHT.v2.md" },
  expiresAt: 100,
});

describe("THOUGHT Agent run", () => {
  it("preserves exact prompt and allows only legal state transitions", () => {
    const created = create();
    expect(created.promptLine).toBe("MiXeD é prompt");
    const claimed = claimThoughtAgentRun(created, 1);
    const running = startThoughtAgentRun(claimed, 2);
    const returned = submitThoughtAgentResult(running, '{"agentLine":"result"}', 3);
    expect(returned.state).toBe("returned");
    expect(() => cancelThoughtAgentRun(returned)).toThrow("final");
  });

  it("accepts identical result retries and rejects conflicting second results", () => {
    const running = startThoughtAgentRun(claimThoughtAgentRun(create(), 1), 2);
    const returned = submitThoughtAgentResult(running, "exact bytes", 3);
    expect(submitThoughtAgentResult(returned, "exact bytes", 4)).toBe(returned);
    expect(() => submitThoughtAgentResult(returned, "different bytes", 4)).toThrow("conflicting result");
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
