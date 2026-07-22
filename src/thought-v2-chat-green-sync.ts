import {
  THOUGHT_CHAT_GREEN_CHANNEL,
  THOUGHT_CHAT_GREEN_MAX_CHANNEL,
  THOUGHT_CHAT_GREEN_MIN_CHANNEL,
} from "./thought-v2-chat-svg";

export const THOUGHT_CHAT_GREEN_QUERY_KEY = "green";
export const THOUGHT_CHAT_GREEN_STORAGE_KEY = "thought-v2-chat-green-channel";

const GREEN_UPDATE_EVENT = "thought-chat:green:update";
const GREEN_GET_EVENT = "thought-chat:green:get";
const GREEN_SET_EVENT = "thought-chat:green:set";

export type ThoughtChatInitialGreen = {
  channel: number;
  source: "url" | "storage" | "default";
};

export const parseThoughtChatGreenChannel = (value: unknown): number | null => {
  const parsed = typeof value === "number"
    ? value
    : typeof value === "string" && /^\d{1,3}$/.test(value)
      ? Number(value)
      : Number.NaN;
  if (
    !Number.isInteger(parsed)
    || parsed < THOUGHT_CHAT_GREEN_MIN_CHANNEL
    || parsed > THOUGHT_CHAT_GREEN_MAX_CHANNEL
  ) return null;
  return parsed;
};

export const clampThoughtChatGreenChannel = (value: number): number =>
  Math.min(
    THOUGHT_CHAT_GREEN_MAX_CHANNEL,
    Math.max(THOUGHT_CHAT_GREEN_MIN_CHANNEL, Math.round(value)),
  );

export const thoughtChatGreenFromSearch = (search: string): number | null =>
  parseThoughtChatGreenChannel(
    new URLSearchParams(search).get(THOUGHT_CHAT_GREEN_QUERY_KEY),
  );

export const resolveThoughtChatInitialGreen = (
  search: string,
  storage: Pick<Storage, "getItem">,
): ThoughtChatInitialGreen => {
  const fromUrl = thoughtChatGreenFromSearch(search);
  if (fromUrl !== null) return { channel: fromUrl, source: "url" };

  try {
    const fromStorage = parseThoughtChatGreenChannel(
      storage.getItem(THOUGHT_CHAT_GREEN_STORAGE_KEY),
    );
    if (fromStorage !== null) return { channel: fromStorage, source: "storage" };
  } catch {
    // Fall through to the renderer default.
  }
  return { channel: THOUGHT_CHAT_GREEN_CHANNEL, source: "default" };
};

export const thoughtChatHrefWithGreen = (href: string, channel: number): string => {
  const url = new URL(href, "https://thought.invalid");
  url.searchParams.set(
    THOUGHT_CHAT_GREEN_QUERY_KEY,
    String(clampThoughtChatGreenChannel(channel)),
  );
  return `${url.pathname}${url.search}${url.hash}`;
};

export const replaceCurrentThoughtChatGreen = (channel: number): void => {
  const url = new URL(window.location.href);
  url.searchParams.set(
    THOUGHT_CHAT_GREEN_QUERY_KEY,
    String(clampThoughtChatGreenChannel(channel)),
  );
  window.history.replaceState(
    window.history.state,
    "",
    `${url.pathname}${url.search}${url.hash}`,
  );
};

export const publishThoughtChatGreen = (channel: number): void => {
  import.meta.hot?.send(GREEN_SET_EVENT, {
    greenChannel: clampThoughtChatGreenChannel(channel),
  });
};

export const startThoughtChatGreenSync = (
  initial: ThoughtChatInitialGreen,
  onChannel: (channel: number) => void,
): (() => void) => {
  const hot = import.meta.hot;
  if (!hot) return () => undefined;

  const handleUpdate = (payload: { greenChannel?: unknown }): void => {
    const channel = parseThoughtChatGreenChannel(payload.greenChannel);
    if (channel !== null) onChannel(channel);
  };
  hot.on(GREEN_UPDATE_EVENT, handleUpdate);

  if (initial.source === "url") {
    hot.send(GREEN_SET_EVENT, { greenChannel: initial.channel });
  } else {
    hot.send(GREEN_GET_EVENT);
  }

  return () => hot.off(GREEN_UPDATE_EVENT, handleUpdate);
};
