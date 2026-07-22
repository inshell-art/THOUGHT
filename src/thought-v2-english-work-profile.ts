// Compatibility facade for the pre-contract chat study. The canonical rules
// now live in the V3 reference module; the active V2 protocol remains unchanged.
import {
  assertThoughtV2Line,
  assertThoughtV2Work,
  measureThoughtV2Line,
  THOUGHT_V2_ALLOWED_CHARACTERS,
  THOUGHT_V2_MAX_LINE_BYTES,
  THOUGHT_V2_PUNCTUATION,
  THOUGHT_V2_WORK_PROFILE_ID,
  thoughtV2ConversationIdentityHashForLines,
  type ThoughtV2LineKind,
  type ThoughtV2LineMeasure,
  type ThoughtV2WorkMeasure,
} from "./thought-v2-terminal-work-profile";

export const THOUGHT_ENGLISH_WORK_PROFILE_ID = THOUGHT_V2_WORK_PROFILE_ID;
export const THOUGHT_ENGLISH_MAX_BYTES = THOUGHT_V2_MAX_LINE_BYTES;
export const THOUGHT_ENGLISH_STUDY_FONT = "Source Code Pro 400";
export const THOUGHT_ENGLISH_PUNCTUATION = THOUGHT_V2_PUNCTUATION;
export const THOUGHT_ENGLISH_ALLOWED_CHARACTERS = THOUGHT_V2_ALLOWED_CHARACTERS;

export type ThoughtEnglishLineKind = ThoughtV2LineKind;
export type ThoughtEnglishLineMeasure = ThoughtV2LineMeasure;
export type ThoughtEnglishWorkMeasure = ThoughtV2WorkMeasure;

export const measureThoughtEnglishLine = measureThoughtV2Line;
export const assertThoughtEnglishLine = assertThoughtV2Line;
export const thoughtEnglishPairIdentityKey = thoughtV2ConversationIdentityHashForLines;
export const assertThoughtEnglishWork = assertThoughtV2Work;
