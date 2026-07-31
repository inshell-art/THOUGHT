import {
  thoughtChatConversations,
  type ThoughtChatConversation,
} from "./thought-v2-chat-corpus";
import { type ThoughtChatFontProfile } from "./thought-v2-chat-svg";

export const THOUGHT_CHAT_STUDY_KINDS = [
  "profile-baseline",
  "punctuation",
  "length-boundary",
  "conversation",
] as const;

export type ThoughtChatStudyKind = typeof THOUGHT_CHAT_STUDY_KINDS[number];

export type ThoughtChatStudyWork = ThoughtChatConversation & {
  studyKind: ThoughtChatStudyKind;
  fontProfile: ThoughtChatFontProfile;
};

type StudyDefinition = Omit<ThoughtChatStudyWork, "fontProfile">;

const withSourceCodePro = (work: StudyDefinition): ThoughtChatStudyWork => ({
  ...work,
  fontProfile: "source-code-pro",
});

const profileBaselineDefinitions: StudyDefinition[] = [
  {
    id: "profile-letter-case",
    name: "uppercase signal",
    corpusId: "english-profile",
    corpusName: "English profile · character repertoire",
    studyKind: "profile-baseline",
    promptLine: "THOUGHT WILL AWA",
    agentLine: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
  },
  {
    id: "profile-digits",
    name: "digits",
    corpusId: "english-profile",
    corpusName: "English profile · character repertoire",
    studyKind: "profile-baseline",
    promptLine: "Can you count from 0 to 9?",
    agentLine: "0123456789.",
  },
  {
    id: "profile-contractions",
    name: "contractions and quotes",
    corpusId: "english-profile",
    corpusName: "English profile · character repertoire",
    studyKind: "profile-baseline",
    promptLine: `"Don't stop?"`,
    agentLine: `"I won't."`,
  },
  {
    id: "profile-common-marks",
    name: "common marks",
    corpusId: "english-profile",
    corpusName: "English profile · character repertoire",
    studyKind: "profile-baseline",
    promptLine: "Human & Agent: one work?",
    agentLine: "Yes - prompt/answer, held together.",
  },
  {
    id: "profile-parenthetical",
    name: "parenthetical pause",
    corpusId: "english-profile",
    corpusName: "English profile · character repertoire",
    studyKind: "profile-baseline",
    promptLine: "Can a pause become visible?",
    agentLine: "(It already has.)",
  },
];

const profileBaselineWorks: ThoughtChatStudyWork[] =
  profileBaselineDefinitions.map(withSourceCodePro);

const punctuationWorks: ThoughtChatStudyWork[] = [
  ["punctuation-ellipsis", "ellipsis", "...", "..."],
  ["punctuation-question-answer", "question and answer", "?", "!"],
  ["punctuation-wait", "waiting", "???", "..."],
  ["punctuation-emphasis", "emphasis", "!", "!!"],
  ["punctuation-reversal", "reversal", "?!", "!?"],
  ["punctuation-parenthesis", "held silence", "(...)", "..."],
  ["punctuation-quoted", "quoted marks", `"?"`, `"!"`],
  ["punctuation-divider", "division", "---", "..."],
].map(([id, name, promptLine, agentLine]) => withSourceCodePro({
  id: id!,
  name: name!,
  promptLine: promptLine!,
  agentLine: agentLine!,
  corpusId: "punctuation-only",
  corpusName: "English profile · punctuation-only works",
  studyKind: "punctuation",
}));

const lengthBoundaryWorks: ThoughtChatStudyWork[] = [
  {
    id: "length-minimum",
    name: "one byte per line",
    promptLine: ".",
    agentLine: "!",
  },
  {
    id: "length-repeated-maximum",
    name: "exact 64 · repeated",
    promptLine: "p".repeat(64),
    agentLine: "A".repeat(64),
  },
  {
    id: "length-weight-maximum",
    name: "exact 64 · weight",
    promptLine: "What remains when every available character carries real weight?",
    agentLine: "Every character carries weight, and nothing is allowed to drift.",
  },
  {
    id: "length-punctuation-maximum",
    name: "exact 64 · punctuation",
    promptLine: "Does punctuation alone have enough force to become a clear work?",
    agentLine: "Only the words this conversation cannot afford to lose stay now.",
  },
  {
    id: "length-alphabet-maximum",
    name: "exact 64 · alphabet",
    promptLine: "abcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyzabcdefghijkl",
    agentLine: "ABCDEFGHIJKLMNOPQRSTUVWXYZABCDEFGHIJKLMNOPQRSTUVWXYZABCDEFGHIJKL",
  },
].map((work) => withSourceCodePro({
  ...work,
  corpusId: "length-boundaries",
  corpusName: "English profile · one to 64 ASCII bytes",
  studyKind: "length-boundary",
}));

const conversationWorks: ThoughtChatStudyWork[] = thoughtChatConversations.map(
  (conversation) => withSourceCodePro({
    ...conversation,
    studyKind: "conversation",
  }),
);

export const thoughtChatStudyWorks: ThoughtChatStudyWork[] = [
  ...profileBaselineWorks,
  ...punctuationWorks,
  ...lengthBoundaryWorks,
  ...conversationWorks,
];
