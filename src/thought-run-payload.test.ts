import { describe, expect, it } from "vitest";

import {
  THOUGHT_MAX_OUTPUT_TOKENS,
  buildThoughtRunPayload,
  thoughtRunProvenanceConfig,
  toAnthropicMessagesPayload,
  toOllamaGeneratePayload,
  toOpenAIResponsesPayload,
  toOpenRouterChatPayload,
} from "./thought-run-payload";

const thoughtSpec = {
  id: "thought.md.v1",
  ref: "THOUGHT.md@v1",
  hash: "0xspec",
  text: "FULL THOUGHT.md TEXT",
};

describe("thought run payload", () => {
  it("builds a provider-neutral cloud payload with fixed hidden request config", () => {
    const payload = buildThoughtRunPayload({
      route: "connect",
      provider: "openrouter",
      model: "meta-llama/llama-3.3-70b-instruct:free",
      prompt: "when will we be done?",
      thoughtSpec,
    });

    expect(payload.config).toEqual({
      route: "connect",
      provider: "openrouter",
      model: "meta-llama/llama-3.3-70b-instruct:free",
      request: {
        maxOutputTokens: THOUGHT_MAX_OUTPUT_TOKENS,
      },
      web: {
        enabled: true,
        tool: "openrouter:web_search",
      },
    });
    expect(payload.input).toEqual({
      thoughtSpec,
      prompt: "when will we be done?",
    });
  });

  it("maps THOUGHT.md to system/instructions and prompt to user input", () => {
    const payload = buildThoughtRunPayload({
      route: "connect",
      provider: "openrouter",
      model: "model-a",
      prompt: "user prompt",
      thoughtSpec,
    });

    expect(toOpenRouterChatPayload(payload)).toMatchObject({
      model: "model-a",
      messages: [
        { role: "system", content: thoughtSpec.text },
        { role: "user", content: "user prompt" },
      ],
      max_tokens: 128,
      tools: [{ type: "openrouter:web_search" }],
    });

    expect(toOpenAIResponsesPayload({ ...payload, config: { ...payload.config, provider: "openai" } })).toMatchObject({
      model: "model-a",
      instructions: thoughtSpec.text,
      input: [{ role: "user", content: [{ type: "input_text", text: "user prompt" }] }],
      max_output_tokens: 128,
      tools: [{ type: "web_search" }],
      tool_choice: "auto",
    });

    expect(toAnthropicMessagesPayload({ ...payload, config: { ...payload.config, provider: "anthropic" } })).toMatchObject({
      model: "model-a",
      system: thoughtSpec.text,
      messages: [{ role: "user", content: "user prompt" }],
      max_tokens: 128,
      tools: [{ type: "web_search_20250305", name: "web_search" }],
    });
  });

  it("keeps local Ollama honest about web search and maps options", () => {
    const payload = buildThoughtRunPayload({
      route: "local",
      provider: "ollama",
      model: "ollama:llama3.2:1b",
      prompt: "local prompt",
      thoughtSpec,
    });

    expect(payload.config.web).toEqual({ enabled: false, tool: "unavailable" });
    expect(toOllamaGeneratePayload(payload)).toEqual({
      model: "llama3.2:1b",
      system: thoughtSpec.text,
      prompt: "local prompt",
      stream: false,
      options: {
        num_predict: 128,
      },
    });
  });

  it("supports my-brain as a manual model route without web tools", () => {
    const payload = buildThoughtRunPayload({
      route: "my-brain",
      provider: "me",
      model: "my-brain",
      prompt: "manual prompt",
      thoughtSpec,
    });

    expect(payload.config).toEqual({
      route: "my-brain",
      provider: "me",
      model: "my-brain",
      request: {
        maxOutputTokens: THOUGHT_MAX_OUTPUT_TOKENS,
      },
      web: {
        enabled: false,
        tool: "unavailable",
      },
    });
  });

  it("records hidden request config in provenance without full spec text", () => {
    const payload = buildThoughtRunPayload({
      route: "direct",
      provider: "openai",
      model: "gpt-5-mini",
      prompt: "red",
      thoughtSpec,
    });

    expect(thoughtRunProvenanceConfig(payload)).toEqual({
      route: "direct",
      provider: "openai",
      model: "gpt-5-mini",
      request: {
        maxOutputTokens: "128",
      },
      web: {
        enabled: true,
        tool: "openai:web_search",
      },
      thoughtSpec: {
        id: "thought.md.v1",
        ref: "THOUGHT.md@v1",
        hash: "0xspec",
      },
    });
  });
});
