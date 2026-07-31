import {
  thoughtChatStudyWorks,
  type ThoughtChatStudyKind,
} from "./thought-v2-chat-study-corpus";
import {
  THOUGHT_CHAT_FONT_PROFILES,
  type ThoughtChatFontProfile,
} from "./thought-v2-chat-svg";
import {
  THOUGHT_ENGLISH_WORK_PROFILE_ID,
} from "./thought-v2-english-work-profile";
import {
  buildThoughtV2StudyRecord,
  type ThoughtV2StudyDeclarations,
  type ThoughtV2StudyDerivedRecord,
} from "./thought-v2-terminal-study-metadata";

export const THOUGHT_CHAT_GALLERY_RECORD_PAIRS = [
  { agent: "Inshell THOUGHT App", model: "OpenAI GPT-5" },
  { agent: "OpenAI Codex", model: "OpenAI GPT-5" },
  { agent: "ChatGPT", model: "OpenAI GPT-5" },
  { agent: "Claude", model: "Anthropic Claude Sonnet 4" },
  { agent: "Gemini", model: "Google Gemini 2.5 Pro" },
  { agent: "Qwen Code", model: "Qwen3-Coder" },
] as const;

export const THOUGHT_CHAT_MOCK_ATTESTED_TOKEN_NUMBERS = [1, 14, 27, 40, 53, 66] as const;

const mockAttestedTokenNumbers = new Set<number>(THOUGHT_CHAT_MOCK_ATTESTED_TOKEN_NUMBERS);

const declarationsForFixture = (index: number): ThoughtV2StudyDeclarations => {
  const pair = THOUGHT_CHAT_GALLERY_RECORD_PAIRS[
    index % THOUGHT_CHAT_GALLERY_RECORD_PAIRS.length
  ];
  if (!pair) throw new Error(`missing declaration pair for fixture ${index + 1}`);
  return {
    agentDeclaration: {
      label: pair.agent,
      source: "manual",
      status: "declared-unverified",
    },
    kind: "manual",
    modelDeclaration: {
      label: pair.model,
      source: "manual",
      status: "declared-unverified",
    },
  };
};

export type ThoughtChatGalleryFixture = ThoughtV2StudyDerivedRecord & {
  creationAttestationFixture: "mock-attested" | "unattested";
  tokenNumber: number;
  sourceNumber: number;
  id: string;
  name: string;
  corpusId: string;
  corpusName: string;
  studyKind: ThoughtChatStudyKind;
  fontProfile: ThoughtChatFontProfile;
  fontLabel: string;
  promptLine: string;
  agentLine: string;
  pairIdentityKey: string;
  workProfileId: string;
};

const buildThoughtChatGalleryFixtures = (): ThoughtChatGalleryFixture[] => {
  const seenPairIdentities = new Set<string>();
  return thoughtChatStudyWorks.map((fixture, index) => {
    const record = buildThoughtV2StudyRecord(
      fixture.promptLine,
      fixture.agentLine,
      declarationsForFixture(index),
    );
    if (seenPairIdentities.has(record.conversationIdentityHash)) {
      throw new Error(`duplicate English chat pair in fixture ${fixture.id}`);
    }
    seenPairIdentities.add(record.conversationIdentityHash);

    return {
      creationAttestationFixture: mockAttestedTokenNumbers.has(index + 1)
        ? "mock-attested"
        : "unattested",
      tokenNumber: index + 1,
      sourceNumber: index + 1,
      id: fixture.id,
      name: fixture.name,
      corpusId: fixture.corpusId,
      corpusName: fixture.corpusName,
      studyKind: fixture.studyKind,
      fontProfile: fixture.fontProfile,
      fontLabel: THOUGHT_CHAT_FONT_PROFILES[fixture.fontProfile].label,
      promptLine: fixture.promptLine,
      agentLine: fixture.agentLine,
      ...record,
      pairIdentityKey: record.conversationIdentityHash,
      workProfileId: THOUGHT_ENGLISH_WORK_PROFILE_ID,
    };
  });
};

export const thoughtChatGalleryFixtures = buildThoughtChatGalleryFixtures();
