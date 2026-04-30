export type ThoughtRunRoute = "connect" | "direct" | "local";

export type ThoughtRunProvider = "openrouter" | "openai" | "anthropic" | "ollama";

export type ThoughtRunCapabilities = {
  webSearch: boolean;
  structuredOutput: boolean;
  stream: boolean;
};

export type ThoughtRunRequestConfig = {
  maxOutputTokens: 128;
  temperature: number;
  topP: number;
  topK: number | null;
  seed: number | null;
};

export type ThoughtRunSpec = {
  id: string;
  ref: string;
  hash: string;
  text: string;
};

export type ThoughtRunPayload = {
  config: {
    route: ThoughtRunRoute;
    provider: ThoughtRunProvider;
    model: string;
    capabilities: ThoughtRunCapabilities;
    request: ThoughtRunRequestConfig;
  };
  input: {
    thoughtSpec: ThoughtRunSpec;
    prompt: string;
  };
  outputContract: {
    oneRoundOnly: true;
    normalize: true;
    validate: true;
  };
};

export const THOUGHT_MAX_OUTPUT_TOKENS = 128 as const;
export const THOUGHT_RUN_TEMPERATURE = 0.7;
export const THOUGHT_RUN_TOP_P = 1;

export const supportsProviderWebSearch = (provider: ThoughtRunProvider) =>
  provider === "openrouter" || provider === "openai" || provider === "anthropic";

export const buildThoughtRunPayload = (input: {
  route: ThoughtRunRoute;
  provider: ThoughtRunProvider;
  model: string;
  prompt: string;
  thoughtSpec: ThoughtRunSpec;
}): ThoughtRunPayload => {
  const webSearch = input.route !== "local" && supportsProviderWebSearch(input.provider);

  return {
    config: {
      route: input.route,
      provider: input.provider,
      model: input.model,
      capabilities: {
        webSearch,
        structuredOutput: false,
        stream: false,
      },
      request: {
        maxOutputTokens: THOUGHT_MAX_OUTPUT_TOKENS,
        temperature: THOUGHT_RUN_TEMPERATURE,
        topP: THOUGHT_RUN_TOP_P,
        topK: null,
        seed: null,
      },
    },
    input: {
      thoughtSpec: input.thoughtSpec,
      prompt: input.prompt,
    },
    outputContract: {
      oneRoundOnly: true,
      normalize: true,
      validate: true,
    },
  };
};

export const thoughtRunSpecAnchor = (payload: ThoughtRunPayload) => {
  const { id, ref, hash } = payload.input.thoughtSpec;
  return { id, ref, hash };
};

export const thoughtRunProvenanceConfig = (payload: ThoughtRunPayload) => ({
  route: payload.config.route,
  provider: payload.config.provider,
  model: payload.config.model,
  capabilities: payload.config.capabilities,
  request: payload.config.request,
  thoughtSpec: thoughtRunSpecAnchor(payload),
});

export const toOpenRouterChatPayload = (payload: ThoughtRunPayload) => ({
  model: payload.config.model,
  messages: [
    { role: "system", content: payload.input.thoughtSpec.text },
    { role: "user", content: payload.input.prompt },
  ],
  max_tokens: payload.config.request.maxOutputTokens,
  temperature: payload.config.request.temperature,
  top_p: payload.config.request.topP,
  ...(payload.config.capabilities.webSearch
    ? { tools: [{ type: "openrouter:web_search" }] }
    : {}),
});

export const toOpenAIResponsesPayload = (payload: ThoughtRunPayload) => ({
  model: payload.config.model,
  instructions: payload.input.thoughtSpec.text,
  input: [
    {
      role: "user",
      content: [
        {
          type: "input_text",
          text: payload.input.prompt,
        },
      ],
    },
  ],
  max_output_tokens: payload.config.request.maxOutputTokens,
  temperature: payload.config.request.temperature,
  top_p: payload.config.request.topP,
  store: false,
  ...(payload.config.capabilities.webSearch
    ? { tools: [{ type: "web_search" }], tool_choice: "auto" }
    : {}),
});

export const toAnthropicMessagesPayload = (payload: ThoughtRunPayload) => ({
  model: payload.config.model,
  system: payload.input.thoughtSpec.text,
  max_tokens: payload.config.request.maxOutputTokens,
  temperature: payload.config.request.temperature,
  top_p: payload.config.request.topP,
  messages: [{ role: "user", content: payload.input.prompt }],
  ...(payload.config.capabilities.webSearch
    ? {
        tools: [
          {
            type: "web_search_20250305",
            name: "web_search",
          },
        ],
      }
    : {}),
});

export const toOllamaGeneratePayload = (payload: ThoughtRunPayload) => ({
  model: payload.config.model.replace(/^ollama:/, "").trim(),
  system: payload.input.thoughtSpec.text,
  prompt: payload.input.prompt,
  stream: false,
  options: {
    num_predict: payload.config.request.maxOutputTokens,
    temperature: payload.config.request.temperature,
    top_p: payload.config.request.topP,
    seed: payload.config.request.seed,
  },
});
