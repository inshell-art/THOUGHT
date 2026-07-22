export type ThoughtChatConversationDefinition = {
  id: string;
  name: string;
  promptLine: string;
  agentLine: string;
};

export type ThoughtChatConversationCorpus = {
  id: string;
  name: string;
  conversations: ThoughtChatConversationDefinition[];
};

export type ThoughtChatConversation = ThoughtChatConversationDefinition & {
  corpusId: string;
  corpusName: string;
};

export const thoughtChatConversationCorpuses: ThoughtChatConversationCorpus[] = [
  {
    id: "opening-a-channel",
    name: "opening a channel",
    conversations: [
      {
        id: "are-you-there",
        name: "are you there",
        promptLine: "Are you there?",
        agentLine: "I am here. What do you need?",
      },
      {
        id: "hearing-rain",
        name: "hearing rain",
        promptLine: "Can you hear the rain?",
        agentLine: "Yes. It softens the room.",
      },
      {
        id: "one-moment",
        name: "one moment",
        promptLine: "Do you have a moment?",
        agentLine: "I have this moment with you.",
      },
      {
        id: "smallest-truth",
        name: "smallest truth",
        promptLine: "Should I begin?",
        agentLine: "Begin with the smallest true thing.",
      },
      {
        id: "good-time",
        name: "a good time",
        promptLine: "Is this a good time to talk?",
        agentLine: "Yes. Take the time you need.",
      },
      {
        id: "start-again",
        name: "start again",
        promptLine: "Can we start again?",
        agentLine: "Yes. Start where it still matters.",
      },
      {
        id: "finding-words",
        name: "finding words",
        promptLine: "What if I do not know the words?",
        agentLine: "Say the part you can name.",
      },
      {
        id: "wait-for-thought",
        name: "wait for thought",
        promptLine: "Will you wait while I think?",
        agentLine: "I will stay until the thought arrives.",
      },
    ],
  },
  {
    id: "attention-and-feeling",
    name: "attention and feeling",
    conversations: [
      {
        id: "why-difficult",
        name: "why difficult",
        promptLine: "Why does this feel difficult?",
        agentLine: "Because it matters to you.",
      },
      {
        id: "overthinking",
        name: "overthinking",
        promptLine: "Am I overthinking this?",
        agentLine: "You may be trying to protect something.",
      },
      {
        id: "missing-detail",
        name: "missing detail",
        promptLine: "What am I missing?",
        agentLine: "Perhaps the detail you keep avoiding.",
      },
      {
        id: "uncertain",
        name: "uncertain",
        promptLine: "Why am I still uncertain?",
        agentLine: "Certainty has not earned your trust yet.",
      },
      {
        id: "small-fear",
        name: "small fear",
        promptLine: "Can a small fear change a choice?",
        agentLine: "Yes. Ask what the fear is guarding.",
      },
      {
        id: "what-i-want",
        name: "what I want",
        promptLine: "How do I know what I really want?",
        agentLine: "Notice what leaves you more alive.",
      },
      {
        id: "answer-hurt",
        name: "the answer hurt",
        promptLine: "Why did that answer hurt?",
        agentLine: "It touched a truth before you were ready.",
      },
      {
        id: "beneath-anger",
        name: "beneath anger",
        promptLine: "What should I do with this anger?",
        agentLine: "Listen for the boundary beneath it.",
      },
    ],
  },
  {
    id: "memory-and-time",
    name: "memory and time",
    conversations: [
      {
        id: "first-question",
        name: "first question",
        promptLine: "Do you remember our first question?",
        agentLine: "I remember where it led us.",
      },
      {
        id: "yesterday-close",
        name: "yesterday close",
        promptLine: "Why does yesterday feel so close?",
        agentLine: "Some moments do not leave on schedule.",
      },
      {
        id: "memory-revisited",
        name: "memory revisited",
        promptLine: "Can memory change when we revisit it?",
        agentLine: "The facts stay; their meaning can move.",
      },
      {
        id: "keep-this-year",
        name: "keep this year",
        promptLine: "What should I keep from this year?",
        agentLine: "Keep what made you more honest.",
      },
      {
        id: "change-direction",
        name: "change direction",
        promptLine: "Is it too late to change direction?",
        agentLine: "Not while you can still choose a step.",
      },
      {
        id: "missing-a-place",
        name: "missing a place",
        promptLine: "Why do I miss a place I left?",
        agentLine: "Part of you is still speaking from there.",
      },
      {
        id: "feeling-pass",
        name: "the feeling passes",
        promptLine: "Will this feeling pass?",
        agentLine: "It will change before it disappears.",
      },
      {
        id: "unclear-future",
        name: "unclear future",
        promptLine: "What if the future stays unclear?",
        agentLine: "Then choose the next visible kindness.",
      },
    ],
  },
  {
    id: "making-and-choice",
    name: "making and choice",
    conversations: [
      {
        id: "build-first",
        name: "build first",
        promptLine: "Which idea should I build first?",
        agentLine: "Build the one that teaches you fastest.",
      },
      {
        id: "first-version",
        name: "first version",
        promptLine: "How simple can the first version be?",
        agentLine: "Simple enough to reveal the real problem.",
      },
      {
        id: "polish-or-share",
        name: "polish or share",
        promptLine: "Should I polish it or share it?",
        agentLine: "Share the part that can survive attention.",
      },
      {
        id: "good-constraint",
        name: "good constraint",
        promptLine: "What makes a good constraint?",
        agentLine: "It removes noise without removing possibility.",
      },
      {
        id: "when-finished",
        name: "when finished",
        promptLine: "How do I know when it is finished?",
        agentLine: "When another change would hide the point.",
      },
      {
        id: "experiment-fails",
        name: "experiment fails",
        promptLine: "What if the experiment fails?",
        agentLine: "Then make the failure answer one question.",
      },
      {
        id: "change-the-plan",
        name: "change the plan",
        promptLine: "Can I change the plan halfway through?",
        agentLine: "Yes, if the evidence changed with you.",
      },
      {
        id: "what-remains",
        name: "what remains",
        promptLine: "What deserves to remain?",
        agentLine: "Keep only what the work cannot lose.",
      },
    ],
  },
  {
    id: "repair-and-understanding",
    name: "repair and understanding",
    conversations: [
      {
        id: "explained-clearly",
        name: "explained clearly",
        promptLine: "Did I explain it clearly?",
        agentLine: "I heard both the fact and the feeling.",
      },
      {
        id: "same-thing",
        name: "the same thing",
        promptLine: "Are we talking about the same thing?",
        agentLine: "Let us name the difference together.",
      },
      {
        id: "need-from-me",
        name: "need from me",
        promptLine: "What do you need from me now?",
        agentLine: "One honest answer, without rushing.",
      },
      {
        id: "disagree-and-continue",
        name: "disagree and continue",
        promptLine: "Can we disagree and still continue?",
        agentLine: "Yes. Respect can hold the tension.",
      },
      {
        id: "apologize-again",
        name: "apologize again",
        promptLine: "Should I apologize again?",
        agentLine: "Apologize once, then repair what you can.",
      },
      {
        id: "say-it-gently",
        name: "say it gently",
        promptLine: "How can I say this more gently?",
        agentLine: "Keep the truth and remove the weapon.",
      },
      {
        id: "conversation-helped",
        name: "conversation helped",
        promptLine: "Did this conversation help?",
        agentLine: "It gave the question a clearer shape.",
      },
      {
        id: "where-to-leave-it",
        name: "where to leave it",
        promptLine: "Where should we leave this?",
        agentLine: "At the next step we both understand.",
      },
    ],
  },
  {
    id: "wonder-and-perspective",
    name: "wonder and perspective",
    conversations: [
      {
        id: "silence-and-absence",
        name: "silence and absence",
        promptLine: "Does silence always mean absence?",
        agentLine: "Sometimes it means attention without display.",
      },
      {
        id: "machine-and-pause",
        name: "machine and pause",
        promptLine: "Can a machine understand a pause?",
        agentLine: "It can measure one; meaning needs context.",
      },
      {
        id: "stars-and-distance",
        name: "stars and distance",
        promptLine: "Why do stars make distance feel close?",
        agentLine: "Light turns old journeys into presence.",
      },
      {
        id: "question-worth-keeping",
        name: "question worth keeping",
        promptLine: "What makes a question worth keeping?",
        agentLine: "It continues working after the answer.",
      },
      {
        id: "wonder-useful",
        name: "wonder is useful",
        promptLine: "Is wonder useful?",
        agentLine: "It keeps certainty from becoming a cage.",
      },
      {
        id: "two-truths",
        name: "two truths",
        promptLine: "Can two truths point different ways?",
        agentLine: "Yes, when they begin from different lives.",
      },
      {
        id: "someone-listens",
        name: "someone listens",
        promptLine: "What changes when someone listens?",
        agentLine: "A private thought becomes shared ground.",
      },
      {
        id: "smallest-hope",
        name: "smallest hope",
        promptLine: "What is the smallest form of hope?",
        agentLine: "Acting as if another future can answer.",
      },
    ],
  },
];

export const thoughtChatConversations: ThoughtChatConversation[] =
  thoughtChatConversationCorpuses.flatMap((corpus) =>
    corpus.conversations.map((conversation) => ({
      ...conversation,
      corpusId: corpus.id,
      corpusName: corpus.name,
    })),
  );
