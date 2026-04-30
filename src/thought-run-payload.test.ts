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
      capabilities: {
        webSearch: true,
        structuredOutput: false,
        stream: false,
      },
      request: {
        maxOutputTokens: THOUGHT_MAX_OUTPUT_TOKENS,
        temperature: 0.7,
        topP: 1,
        topK: null,
        seed: null,
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
      temperature: 0.7,
      top_p: 1,
      tools: [{ type: "openrouter:web_search" }],
    });

    expect(toOpenAIResponsesPayload({ ...payload, config: { ...payload.config, provider: "openai" } })).toMatchObject({
      model: "model-a",
      instructions: thoughtSpec.text,
      input: [{ role: "user", content: [{ type: "input_text", text: "user prompt" }] }],
      max_output_tokens: 128,
      temperature: 0.7,
      top_p: 1,
      tools: [{ type: "web_search" }],
      tool_choice: "auto",
    });

    expect(toAnthropicMessagesPayload({ ...payload, config: { ...payload.config, provider: "anthropic" } })).toMatchObject({
      model: "model-a",
      system: thoughtSpec.text,
      messages: [{ role: "user", content: "user prompt" }],
      max_tokens: 128,
      temperature: 0.7,
      top_p: 1,
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

    expect(payload.config.capabilities.webSearch).toBe(false);
    expect(toOllamaGeneratePayload(payload)).toEqual({
      model: "llama3.2:1b",
      system: thoughtSpec.text,
      prompt: "local prompt",
      stream: false,
      options: {
        num_predict: 128,
        temperature: 0.7,
        top_p: 1,
        seed: null,
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
      capabilities: {
        webSearch: true,
        structuredOutput: false,
        stream: false,
      },
      request: {
        maxOutputTokens: 128,
        temperature: 0.7,
        topP: 1,
        topK: null,
        seed: null,
      },
      thoughtSpec: {
        id: "thought.md.v1",
        ref: "THOUGHT.md@v1",
        hash: "0xspec",
      },
    });
  });
});
