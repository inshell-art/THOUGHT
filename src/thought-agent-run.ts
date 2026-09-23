import {
  requireVerifiedArtifact,
  verifyProtocolRelease,
  type OnchainReleaseFacts,
  type ThoughtProtocolReleaseBundle,
  type VerifiedRelease,
} from "./thought-v2-release";
import {
  assertThoughtLine,
  isThoughtModelSource,
  THOUGHT_AGENT_DECLARATION_ID,
  THOUGHT_AGENT_RESULT_ID,
  THOUGHT_AGENT_RUN_ID,
  type ThoughtDeclaredModel,
} from "./thought-v2-protocol";

export type ThoughtAgentRunState =
  | "created"
  | "claimed"
  | "running"
  | "returned"
  | "failed"
  | "cancelled"
  | "expired";

export type ThoughtAgentTaskBinding = {
  protocolReleaseId: `0x${string}`;
  manifestKeccak256: `0x${string}`;
  creativeSpecKeccak256: `0x${string}`;
  agentResultSchemaKeccak256: `0x${string}`;
  workProfileKeccak256: `0x${string}`;
};

export type ThoughtAgentResult = {
  schema: typeof THOUGHT_AGENT_RESULT_ID;
  release: {
    protocolReleaseId: `0x${string}`;
    manifestKeccak256: `0x${string}`;
  };
  agentLine: string;
  agent: {
    label: string;
    model: ThoughtDeclaredModel;
  };
  declaration?: {
    schema: typeof THOUGHT_AGENT_DECLARATION_ID;
    status: "declared-unverified";
    label: string;
    declaredOneCreativeResult: true;
  };
};

export type ThoughtAgentRun = {
  schema: typeof THOUGHT_AGENT_RUN_ID;
  runId: string;
  state: ThoughtAgentRunState;
  promptLine: string;
  taskBinding: ThoughtAgentTaskBinding;
  expiresAt: number;
  resultBytes?: string;
  result?: ThoughtAgentResult;
};

export type ThoughtRunCredentials = {
  viewCredential: string;
  writeCredential: string;
};

const exactKeys = (value: unknown, required: readonly string[], optional: readonly string[] = []): boolean => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const keys = Object.keys(value);
  return required.every((key) => Object.hasOwn(value, key)) &&
    keys.every((key) => required.includes(key) || optional.includes(key));
};

const taskBindingFromRelease = (release: VerifiedRelease): ThoughtAgentTaskBinding => ({
  protocolReleaseId: release.protocolReleaseId,
  manifestKeccak256: release.manifestHash,
  creativeSpecKeccak256: requireVerifiedArtifact(release, "creative-spec").keccak256,
  agentResultSchemaKeccak256: requireVerifiedArtifact(release, "agent-result-schema").keccak256,
  workProfileKeccak256: requireVerifiedArtifact(release, "work-profile").keccak256,
});

export const createThoughtAgentRun = (input: {
  runId: string;
  promptLine: string;
  release: VerifiedRelease;
  expiresAt: number;
}): ThoughtAgentRun => {
  assertThoughtLine(input.promptLine, "prompt");
  if (!input.runId) throw new Error("runId is required");
  return {
    schema: THOUGHT_AGENT_RUN_ID,
    runId: input.runId,
    state: "created",
    promptLine: input.promptLine,
    taskBinding: taskBindingFromRelease(input.release),
    expiresAt: input.expiresAt,
  };
};

export const prepareThoughtAgentRun = async (input: {
  runId: string;
  promptLine: string;
  bundle: ThoughtProtocolReleaseBundle;
  onchain: OnchainReleaseFacts;
  expiresAt: number;
}): Promise<ThoughtAgentRun> => createThoughtAgentRun({
  runId: input.runId,
  promptLine: input.promptLine,
  release: await verifyProtocolRelease(input.bundle, input.onchain),
  expiresAt: input.expiresAt,
});

const assertActive = (run: ThoughtAgentRun, now: number): void => {
  if (now >= run.expiresAt) throw new Error("run expired");
  if (run.state === "cancelled" || run.state === "expired" || run.state === "failed") {
    throw new Error(`run is ${run.state}`);
  }
};

const assertDeclaredModel: (value: unknown) => asserts value is ThoughtDeclaredModel = (value) => {
  if (!exactKeys(value, ["label", "source"], ["identifier"])) {
    throw new Error("Agent model shape mismatch");
  }
  const model = value as Record<string, unknown>;
  if (typeof model.label !== "string") throw new Error("Agent model label mismatch");
  assertThoughtLine(model.label, "model");
  if (!isThoughtModelSource(model.source)) throw new Error("Agent model source mismatch");
  if (model.identifier !== undefined && (typeof model.identifier !== "string" || model.identifier.length < 1)) {
    throw new Error("Agent model identifier mismatch");
  }
};

export const claimThoughtAgentRun = (run: ThoughtAgentRun, now: number): ThoughtAgentRun => {
  assertActive(run, now);
  if (run.state !== "created") throw new Error(`cannot claim from ${run.state}`);
  return { ...run, state: "claimed" };
};

export const startThoughtAgentRun = (run: ThoughtAgentRun, now: number): ThoughtAgentRun => {
  assertActive(run, now);
  if (run.state !== "claimed") throw new Error(`cannot start from ${run.state}`);
  return { ...run, state: "running" };
};

const parseThoughtAgentResult = (exactResultBytes: string, run: ThoughtAgentRun): ThoughtAgentResult => {
  let value: unknown;
  try {
    value = JSON.parse(exactResultBytes);
  } catch {
    throw new Error("Agent result is not valid JSON");
  }
  if (!exactKeys(value, ["schema", "release", "agentLine", "agent"], ["declaration"])) {
    throw new Error("Agent result shape mismatch");
  }
  const result = value as ThoughtAgentResult;
  if (result.schema !== THOUGHT_AGENT_RESULT_ID) throw new Error("Agent result schema mismatch");
  if (!exactKeys(result.release, ["protocolReleaseId", "manifestKeccak256"])) {
    throw new Error("Agent result release shape mismatch");
  }
  if (result.release.protocolReleaseId !== run.taskBinding.protocolReleaseId) {
    throw new Error("Agent result release ID mismatch");
  }
  if (result.release.manifestKeccak256 !== run.taskBinding.manifestKeccak256) {
    throw new Error("Agent result manifest hash mismatch");
  }
  assertThoughtLine(result.agentLine, "agent");
  if (!exactKeys(result.agent, ["label", "model"])) {
    throw new Error("Agent identity shape mismatch");
  }
  if (typeof result.agent.label !== "string") throw new Error("Agent identity label mismatch");
  assertThoughtLine(result.agent.label, "declaredAgent");
  assertDeclaredModel(result.agent.model);
  if (result.declaration !== undefined) {
    if (!exactKeys(result.declaration, ["schema", "status", "label", "declaredOneCreativeResult"])) {
      throw new Error("Agent declaration shape mismatch");
    }
    if (
      result.declaration.schema !== THOUGHT_AGENT_DECLARATION_ID ||
      result.declaration.status !== "declared-unverified" ||
      typeof result.declaration.label !== "string" ||
      result.declaration.label !== result.agent.label ||
      result.declaration.declaredOneCreativeResult !== true
    ) throw new Error("Agent declaration mismatch");
  }
  return result;
};

export const submitThoughtAgentResult = (
  run: ThoughtAgentRun,
  exactResultBytes: string,
  now: number,
): ThoughtAgentRun => {
  if (run.state === "returned") {
    if (run.resultBytes === exactResultBytes) return run;
    throw new Error("conflicting result");
  }
  assertActive(run, now);
  if (run.state !== "claimed" && run.state !== "running") {
    throw new Error(`cannot return from ${run.state}`);
  }
  const result = parseThoughtAgentResult(exactResultBytes, run);
  return { ...run, state: "returned", resultBytes: exactResultBytes, result };
};

export const cancelThoughtAgentRun = (run: ThoughtAgentRun): ThoughtAgentRun => {
  if (run.state === "returned") throw new Error("returned run is final");
  return { ...run, state: "cancelled" };
};

export const failThoughtAgentRun = (run: ThoughtAgentRun, now: number): ThoughtAgentRun => {
  assertActive(run, now);
  if (run.state === "returned") throw new Error("returned run is final");
  return { ...run, state: "failed" };
};

export const expireThoughtAgentRun = (run: ThoughtAgentRun, now: number): ThoughtAgentRun =>
  now >= run.expiresAt && run.state !== "returned" ? { ...run, state: "expired" } : run;

export const authorizeThoughtRunRead = (provided: string, credentials: ThoughtRunCredentials): boolean =>
  provided === credentials.viewCredential || provided === credentials.writeCredential;

export const authorizeThoughtRunWrite = (provided: string, credentials: ThoughtRunCredentials): boolean =>
  provided === credentials.writeCredential;

export const thoughtRunPublicUrl = (origin: string, runId: string, viewCredential?: string): string => {
  const base = `${origin.replace(/\/$/, "")}/thought/runs/${encodeURIComponent(runId)}`;
  return viewCredential ? `${base}#view=${encodeURIComponent(viewCredential)}` : base;
};
