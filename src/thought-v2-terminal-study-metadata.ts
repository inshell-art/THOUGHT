import { id, keccak256, toUtf8Bytes } from "ethers";

import {
  canonicalJsonStringify,
  type CanonicalJson,
} from "./thought-v2-canonical-json";
import { assertThoughtV2Context } from "./thought-v2-context-profile";
import {
  THOUGHT_CREATION_ATTESTATION_PROFILE as THOUGHT_V2_CREATION_ATTESTATION_PROFILE,
  THOUGHT_CREATION_ATTESTATION_PROFILE_ID as THOUGHT_V2_CREATION_ATTESTATION_PROFILE_ID,
} from "./thought-v2-creation-attestation";
import {
  deriveThoughtV2WorkHashes,
  THOUGHT_V2_RENDERER_ID,
  THOUGHT_V2_RENDERER_ID_HASH,
  THOUGHT_V2_WORK_PROFILE_ID,
  THOUGHT_V2_WORK_PROFILE_ID_HASH,
  type ThoughtV2WorkHashes,
} from "./thought-v2-terminal-work-profile";

export const THOUGHT_V2_STUDY_PROVENANCE_SCHEMA =
  "inshell.thought.provenance.v2.study-candidate.v1" as const;
export const THOUGHT_V2_PROVENANCE_PROFILE_ID = "inshell.thought.provenance.v2" as const;
export const THOUGHT_V2_METADATA_PROFILE_ID =
  "inshell.thought.metadata.v2.terminal-chat" as const;
export const THOUGHT_V2_METADATA_PROFILE_ID_HASH = id(THOUGHT_V2_METADATA_PROFILE_ID);
export {
  THOUGHT_V2_CREATION_ATTESTATION_PROFILE,
  THOUGHT_V2_CREATION_ATTESTATION_PROFILE_ID,
};

export type ThoughtV2LengthClass = "Minimum" | "Compact" | "Standard" | "Extended" | "Maximum";
export type ThoughtV2ConversationForm = "Dialogue" | "Punctuation Only";
export type ThoughtV2DeclarationSource =
  | "agent_declared"
  | "connector_observed"
  | "manual"
  | "runtime_configured"
  | "unknown";

export type ThoughtV2Declaration = {
  label: string;
  source: ThoughtV2DeclarationSource;
  status: "declared-unverified";
};

export type ThoughtV2StudyDeclarations = {
  agentDeclaration: ThoughtV2Declaration & { source: "manual" };
  kind: "manual";
  modelDeclaration: ThoughtV2Declaration & { source: "manual" };
};

export const THOUGHT_V2_STUDY_DECLARATIONS: ThoughtV2StudyDeclarations = {
  agentDeclaration: {
    label: "Not applicable",
    source: "manual",
    status: "declared-unverified",
  },
  kind: "manual",
  modelDeclaration: {
    label: "Not applicable",
    source: "manual",
    status: "declared-unverified",
  },
};

export const THOUGHT_V2_METADATA_ATTRIBUTE_ORDER = [
  "Declared Agent",
  "Declared Model",
  "Creation Attestation",
  "Prompt Bytes",
  "Agent Bytes",
  "Pair Bytes",
  "Prompt Length",
  "Agent Length",
] as const;

export type ThoughtV2MetadataAttribute = {
  trait_type: string;
  value: string | number;
  display_type?: "number";
  max_value?: number;
};

export type ThoughtV2StudyProvenance = {
  mintContext: {
    chainId: null;
    contract: null;
    intendedMinter: null;
    pathId: null;
    pathSerial: null;
    status: "not-minted";
  };
  process: ThoughtV2StudyDeclarations;
  protocol: {
    manifestKeccak256: null;
    protocolReleaseId: null;
    rendererId: typeof THOUGHT_V2_RENDERER_ID;
    rendererIdHash: string;
    releaseStatus: "candidate-unregistered";
    thoughtSpecHash: null;
    thoughtSpecId: null;
    workProfileId: typeof THOUGHT_V2_WORK_PROFILE_ID;
    workProfileIdHash: string;
  };
  schema: typeof THOUGHT_V2_STUDY_PROVENANCE_SCHEMA;
  verification: {
    creationAttestationDigest: null;
    creationAttestationProfileId: string;
    status: "Unattested";
  };
  work: ThoughtV2WorkHashes & {
    agentLine: string;
    promptLine: string;
  };
};

export type ThoughtV2StudyDerivedRecord = ThoughtV2WorkHashes & {
  agentBytes: number;
  declaredAgent: string;
  declaredAgentKeccak256: string;
  declaredModel: string;
  declaredModelKeccak256: string;
  agentLengthClass: ThoughtV2LengthClass;
  attributes: ThoughtV2MetadataAttribute[];
  conversationForm: ThoughtV2ConversationForm;
  pairBytes: number;
  promptBytes: number;
  promptLengthClass: ThoughtV2LengthClass;
  provenance: ThoughtV2StudyProvenance;
  provenanceHash: string;
  provenanceJson: string;
};

export type ThoughtV2StudyTokenMetadata = {
  attributes: ThoughtV2MetadataAttribute[];
  background_color: "000000";
  description: string;
  image: string;
  name: "THOUGHT";
  thought: {
    agentLine: string;
    agentLineKeccak256: string;
    conversationIdentityHash: string;
    creationAttestation: {
      digest: null;
      profileId: string;
      status: "Unattested";
    };
    declarations: {
      agent: Omit<ThoughtV2Declaration, "source"> & { keccak256: string };
      model: Omit<ThoughtV2Declaration, "source"> & { keccak256: string };
      workIdentityInput: false;
    };
    mint: {
      chainId: null;
      contract: null;
      pathId: null;
      pathSerial: null;
      status: "not-minted";
      tokenId: null;
    };
    promptLine: string;
    promptLineKeccak256: string;
    protocol: {
      manifestKeccak256: null;
      protocolReleaseId: null;
      releaseStatus: "candidate-unregistered";
      thoughtSpecHash: null;
      thoughtSpecId: null;
    };
    provenanceHash: string;
    provenanceJson: string;
    provenanceProfileId: typeof THOUGHT_V2_PROVENANCE_PROFILE_ID;
    metadataProfileId: typeof THOUGHT_V2_METADATA_PROFILE_ID;
    metadataProfileIdHash: string;
    rendererId: typeof THOUGHT_V2_RENDERER_ID;
    rendererIdHash: string;
    status: "study-candidate";
    workHash: string;
    workProfileId: typeof THOUGHT_V2_WORK_PROFILE_ID;
    workProfileIdHash: string;
  };
};

const encoder = new TextEncoder();

export const thoughtV2LengthClass = (byteLength: number): ThoughtV2LengthClass => {
  if (!Number.isInteger(byteLength) || byteLength < 1 || byteLength > 64) {
    throw new Error("THOUGHT V2 length class requires 1 through 64 bytes");
  }
  if (byteLength === 1) return "Minimum";
  if (byteLength <= 16) return "Compact";
  if (byteLength <= 32) return "Standard";
  if (byteLength < 64) return "Extended";
  return "Maximum";
};

const isPunctuationOnly = (value: string): boolean =>
  !/[A-Za-z0-9]/.test(value);

export const thoughtV2ConversationForm = (
  promptLine: string,
  agentLine: string,
): ThoughtV2ConversationForm =>
  isPunctuationOnly(promptLine) && isPunctuationOnly(agentLine)
    ? "Punctuation Only"
    : "Dialogue";

export const buildThoughtV2StudyRecord = (
  promptLine: string,
  agentLine: string,
  declarations: ThoughtV2StudyDeclarations = THOUGHT_V2_STUDY_DECLARATIONS,
): ThoughtV2StudyDerivedRecord => {
  const hashes = deriveThoughtV2WorkHashes(promptLine, agentLine);
  assertThoughtV2Context(declarations.agentDeclaration.label, "declaredAgent");
  assertThoughtV2Context(declarations.modelDeclaration.label, "declaredModel");
  const declaredAgent = declarations.agentDeclaration.label;
  const declaredModel = declarations.modelDeclaration.label;
  const declaredAgentKeccak256 = keccak256(toUtf8Bytes(declaredAgent));
  const declaredModelKeccak256 = keccak256(toUtf8Bytes(declaredModel));
  const promptBytes = encoder.encode(promptLine).length;
  const agentBytes = encoder.encode(agentLine).length;
  const pairBytes = promptBytes + agentBytes;
  const promptLengthClass = thoughtV2LengthClass(promptBytes);
  const agentLengthClass = thoughtV2LengthClass(agentBytes);
  const conversationForm = thoughtV2ConversationForm(promptLine, agentLine);
  const attributes: ThoughtV2MetadataAttribute[] = [
    { trait_type: "Declared Agent", value: declaredAgent },
    { trait_type: "Declared Model", value: declaredModel },
    { trait_type: "Creation Attestation", value: "Unattested" },
    { display_type: "number", max_value: 64, trait_type: "Prompt Bytes", value: promptBytes },
    { display_type: "number", max_value: 64, trait_type: "Agent Bytes", value: agentBytes },
    { display_type: "number", max_value: 128, trait_type: "Pair Bytes", value: pairBytes },
    { trait_type: "Prompt Length", value: promptLengthClass },
    { trait_type: "Agent Length", value: agentLengthClass },
  ];

  const provenance: ThoughtV2StudyProvenance = {
    mintContext: {
      chainId: null,
      contract: null,
      intendedMinter: null,
      pathId: null,
      pathSerial: null,
      status: "not-minted",
    },
    process: {
      agentDeclaration: { ...declarations.agentDeclaration },
      kind: "manual",
      modelDeclaration: { ...declarations.modelDeclaration },
    },
    protocol: {
      manifestKeccak256: null,
      protocolReleaseId: null,
      rendererId: THOUGHT_V2_RENDERER_ID,
      rendererIdHash: THOUGHT_V2_RENDERER_ID_HASH,
      releaseStatus: "candidate-unregistered",
      thoughtSpecHash: null,
      thoughtSpecId: null,
      workProfileId: THOUGHT_V2_WORK_PROFILE_ID,
      workProfileIdHash: THOUGHT_V2_WORK_PROFILE_ID_HASH,
    },
    schema: THOUGHT_V2_STUDY_PROVENANCE_SCHEMA,
    verification: {
      creationAttestationDigest: null,
      creationAttestationProfileId: THOUGHT_V2_CREATION_ATTESTATION_PROFILE_ID,
      status: "Unattested",
    },
    work: {
      agentLine,
      promptLine,
      ...hashes,
    },
  };
  const provenanceJson = canonicalJsonStringify(provenance as unknown as CanonicalJson);
  const provenanceHash = keccak256(toUtf8Bytes(provenanceJson));

  return {
    ...hashes,
    agentBytes,
    agentLengthClass,
    attributes,
    conversationForm,
    declaredAgent,
    declaredAgentKeccak256,
    declaredModel,
    declaredModelKeccak256,
    pairBytes,
    promptBytes,
    promptLengthClass,
    provenance,
    provenanceHash,
    provenanceJson,
  };
};

export const buildThoughtV2StudyTokenMetadata = (
  record: ThoughtV2StudyDerivedRecord & { agentLine: string; promptLine: string },
  image: string,
): ThoughtV2StudyTokenMetadata => ({
  attributes: record.attributes.map((attribute) => ({ ...attribute })),
  background_color: "000000",
  description: "A human prompt and Agent response composed as a THOUGHT V2 study candidate.",
  image,
  name: "THOUGHT",
  thought: {
    agentLine: record.agentLine,
    agentLineKeccak256: record.agentLineKeccak256,
    conversationIdentityHash: record.conversationIdentityHash,
    creationAttestation: {
      digest: null,
      profileId: THOUGHT_V2_CREATION_ATTESTATION_PROFILE_ID,
      status: "Unattested",
    },
    declarations: {
      agent: {
        keccak256: record.declaredAgentKeccak256,
        label: record.provenance.process.agentDeclaration.label,
        status: record.provenance.process.agentDeclaration.status,
      },
      model: {
        keccak256: record.declaredModelKeccak256,
        label: record.provenance.process.modelDeclaration.label,
        status: record.provenance.process.modelDeclaration.status,
      },
      workIdentityInput: false,
    },
    mint: {
      chainId: null,
      contract: null,
      pathId: null,
      pathSerial: null,
      status: "not-minted",
      tokenId: null,
    },
    promptLine: record.promptLine,
    promptLineKeccak256: record.promptLineKeccak256,
    protocol: {
      manifestKeccak256: null,
      protocolReleaseId: null,
      releaseStatus: "candidate-unregistered",
      thoughtSpecHash: null,
      thoughtSpecId: null,
    },
    provenanceHash: record.provenanceHash,
    provenanceJson: record.provenanceJson,
    provenanceProfileId: THOUGHT_V2_PROVENANCE_PROFILE_ID,
    metadataProfileId: THOUGHT_V2_METADATA_PROFILE_ID,
    metadataProfileIdHash: THOUGHT_V2_METADATA_PROFILE_ID_HASH,
    rendererId: THOUGHT_V2_RENDERER_ID,
    rendererIdHash: THOUGHT_V2_RENDERER_ID_HASH,
    status: "study-candidate",
    workHash: record.workHash,
    workProfileId: THOUGHT_V2_WORK_PROFILE_ID,
    workProfileIdHash: THOUGHT_V2_WORK_PROFILE_ID_HASH,
  },
});

export const serializeThoughtV2StudyMetadata = (
  metadata: ThoughtV2StudyTokenMetadata,
): string => JSON.stringify(metadata, null, 2);

export const thoughtV2StudyProvenanceBytes = (
  provenanceJson: string,
): number => encoder.encode(provenanceJson).length;
