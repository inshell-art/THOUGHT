import sourceCodeProLatin400 from "@fontsource/source-code-pro/files/source-code-pro-latin-400-normal.woff2?inline";

import {
  assertThoughtEnglishLine,
  THOUGHT_ENGLISH_MAX_BYTES,
  type ThoughtEnglishLineKind,
} from "./thought-v2-english-work-profile";

export const THOUGHT_CHAT_SOURCE_MAX_BYTES = THOUGHT_ENGLISH_MAX_BYTES;
export const THOUGHT_CHAT_CANVAS = 960;
export const THOUGHT_CHAT_BACKGROUND = "#000000";
export const THOUGHT_CHAT_GREEN_MIN_CHANNEL = 0x61;
export const THOUGHT_CHAT_GREEN_CHANNEL = 0xba;
export const THOUGHT_CHAT_GREEN_MAX_CHANNEL = 0xff;

export const thoughtChatGreenFromChannel = (channel: number): string => {
  if (!Number.isInteger(channel) || channel < 0 || channel > 0xff) {
    throw new Error("THOUGHT green channel must be an integer from 0 through 255");
  }
  return `#00${channel.toString(16).padStart(2, "0")}00`;
};

export const thoughtChatGreenContrastOnBlack = (channel: number): number => {
  thoughtChatGreenFromChannel(channel);
  const encoded = channel / 0xff;
  const linear = encoded <= 0.04045
    ? encoded / 12.92
    : ((encoded + 0.055) / 1.055) ** 2.4;
  const relativeLuminance = 0.7152 * linear;
  return (relativeLuminance + 0.05) / 0.05;
};

export const THOUGHT_CHAT_GREEN = thoughtChatGreenFromChannel(THOUGHT_CHAT_GREEN_CHANNEL);
export const THOUGHT_CHAT_FONT_SIZE = 48;
export const THOUGHT_CHAT_SOURCE_CODE_PRO_ADVANCE_UNITS = 600;
export const THOUGHT_CHAT_SOURCE_CODE_PRO_UNITS_PER_EM = 1000;
export const THOUGHT_CHAT_CHARACTER_ADVANCE =
  (THOUGHT_CHAT_FONT_SIZE * THOUGHT_CHAT_SOURCE_CODE_PRO_ADVANCE_UNITS)
  / THOUGHT_CHAT_SOURCE_CODE_PRO_UNITS_PER_EM;
export const THOUGHT_CHAT_SIDE_INSET_CHARACTERS = 2;
export const THOUGHT_CHAT_LINE_HEIGHT = 64;
export const THOUGHT_CHAT_SIDE_INSET =
  THOUGHT_CHAT_CHARACTER_ADVANCE * THOUGHT_CHAT_SIDE_INSET_CHARACTERS;
export const THOUGHT_CHAT_FIELD_X = THOUGHT_CHAT_SIDE_INSET;
export const THOUGHT_CHAT_FIELD_WIDTH = THOUGHT_CHAT_CANVAS - (2 * THOUGHT_CHAT_SIDE_INSET);
export const THOUGHT_CHAT_FIELD_HEIGHT = 256;
export const THOUGHT_CHAT_PROMPT_FIELD_Y = 128;
export const THOUGHT_CHAT_AGENT_FIELD_Y = 576;

export const THOUGHT_CHAT_FONT_PROFILES = {
  "source-code-pro": {
    label: "Source Code Pro 400",
    family: "'THOUGHT Source Code Pro', monospace",
  },
} as const;

export type ThoughtChatFontProfile = keyof typeof THOUGHT_CHAT_FONT_PROFILES;

const encoder = new TextEncoder();

export type ThoughtChatSvgInput = {
  promptLine: string;
  agentLine: string;
  fontProfile?: ThoughtChatFontProfile;
  greenChannel?: number;
};

export const escapeThoughtChatXml = (value: string): string =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");

const assertLine = (
  value: string,
  kind: ThoughtEnglishLineKind,
): void => {
  assertThoughtEnglishLine(value, kind);
};

const textField = (
  kind: "prompt" | "agent",
  value: string,
  fontProfile: ThoughtChatFontProfile,
  green: string,
): string => {
  const prompt = kind === "prompt";
  const y = prompt ? THOUGHT_CHAT_PROMPT_FIELD_Y : THOUGHT_CHAT_AGENT_FIELD_Y;
  const justifyContent = prompt ? "flex-start" : "flex-end";
  const textAlign = prompt ? "right" : "left";
  const fontFamily = THOUGHT_CHAT_FONT_PROFILES[fontProfile].family;
  const style = [
    "box-sizing:border-box",
    "width:100%",
    "height:100%",
    "display:flex",
    "flex-direction:column",
    `justify-content:${justifyContent}`,
    "overflow:hidden",
    `color:${green}`,
    `font-family:${fontFamily}`,
    `font-size:${THOUGHT_CHAT_FONT_SIZE}px`,
    `line-height:${THOUGHT_CHAT_LINE_HEIGHT}px`,
    "font-weight:400",
    `text-align:${textAlign}`,
    "white-space:break-spaces",
    "overflow-wrap:anywhere",
    "word-break:normal",
    "hyphens:none",
  ].join(";");

  return `<foreignObject data-line="${kind}" data-font-profile="${fontProfile}" x="${THOUGHT_CHAT_FIELD_X}" y="${y}" width="${THOUGHT_CHAT_FIELD_WIDTH}" height="${THOUGHT_CHAT_FIELD_HEIGHT}"><div xmlns="http://www.w3.org/1999/xhtml" dir="auto" style="${style}"><span style="display:block;width:100%">${escapeThoughtChatXml(value)}</span></div></foreignObject>`;
};

export const buildThoughtChatSvg = ({
  promptLine,
  agentLine,
  fontProfile = "source-code-pro",
  greenChannel = THOUGHT_CHAT_GREEN_CHANNEL,
}: ThoughtChatSvgInput): string => {
  assertLine(promptLine, "prompt");
  assertLine(agentLine, "agent");
  const green = thoughtChatGreenFromChannel(greenChannel);
  const prompt = textField("prompt", promptLine, fontProfile, green);
  const agent = textField("agent", agentLine, fontProfile, green);

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${THOUGHT_CHAT_CANVAS} ${THOUGHT_CHAT_CANVAS}" width="${THOUGHT_CHAT_CANVAS}" height="${THOUGHT_CHAT_CANVAS}" role="img" data-renderer="foreign-object-text-fields" data-font-profile="${fontProfile}" data-green="${green}" aria-label="Prompt and Agent response in a chat layout">
  <style>@font-face{font-family:'THOUGHT Source Code Pro';font-style:normal;font-weight:400;src:url('${sourceCodeProLatin400}') format('woff2')}</style>
  <rect width="${THOUGHT_CHAT_CANVAS}" height="${THOUGHT_CHAT_CANVAS}" fill="${THOUGHT_CHAT_BACKGROUND}"/>
  ${prompt}
  ${agent}
</svg>`;
};

export const thoughtChatSvgDataUri = (svg: string): string => {
  const bytes = encoder.encode(svg);
  let binary = "";
  const chunkSize = 0x8000;
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize));
  }
  return `data:image/svg+xml;base64,${btoa(binary)}`;
};
