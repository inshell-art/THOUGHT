export type ThoughtRunRoute = "connect" | "direct" | "local";

export type ThoughtRunProvider = "openrouter" | "openai" | "anthropic" | "ollama";

export type ThoughtRunProvenanceRequestConfig = {
  maxOutputTokens: "128";
};

export type ThoughtRunWebConfig = {
  enabled: boolean;
  tool: string;
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
    request: {
      maxOutputTokens: 128;
    };
    web: ThoughtRunWebConfig;
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

export const supportsProviderWebSearch = (provider: ThoughtRunProvider) =>
  provider === "openrouter" || provider === "openai" || provider === "anthropic";

export const thoughtRunWebConfig = (input: {
  route: ThoughtRunRoute;
  provider: ThoughtRunProvider;
}): ThoughtRunWebConfig => {
  const enabled = input.route !== "local" && supportsProviderWebSearch(input.provider);
  return {
    enabled,
    tool: enabled
      ? input.provider === "openrouter"
        ? "openrouter:web_search"
        : `${input.provider}:web_search`
      : "unavailable",
  };
};

export const buildThoughtRunPayload = (input: {
  route: ThoughtRunRoute;
  provider: ThoughtRunProvider;
  model: string;
  prompt: string;
  thoughtSpec: ThoughtRunSpec;
}): ThoughtRunPayload => {
  return {
    config: {
      route: input.route,
      provider: input.provider,
      model: input.model,
      request: {
        maxOutputTokens: THOUGHT_MAX_OUTPUT_TOKENS,
      },
      web: thoughtRunWebConfig(input),
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
  request: {
    maxOutputTokens: String(payload.config.request.maxOutputTokens) as "128",
  },
  web: payload.config.web,
  thoughtSpec: thoughtRunSpecAnchor(payload),
});

export const toOpenRouterChatPayload = (payload: ThoughtRunPayload) => ({
  model: payload.config.model,
  messages: [
    { role: "system", content: payload.input.thoughtSpec.text },
    { role: "user", content: payload.input.prompt },
  ],
  max_tokens: payload.config.request.maxOutputTokens,
  ...(payload.config.web.enabled
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
  store: false,
  ...(payload.config.web.enabled
    ? { tools: [{ type: "web_search" }], tool_choice: "auto" }
    : {}),
});

export const toAnthropicMessagesPayload = (payload: ThoughtRunPayload) => ({
  model: payload.config.model,
  system: payload.input.thoughtSpec.text,
  max_tokens: payload.config.request.maxOutputTokens,
  messages: [{ role: "user", content: payload.input.prompt }],
  ...(payload.config.web.enabled
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
  },
});
