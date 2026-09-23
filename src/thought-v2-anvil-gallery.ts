import { Contract, JsonRpcProvider, keccak256, toUtf8Bytes } from "ethers";

import { deriveThoughtV2WorkHashes } from "./thought-v2-terminal-work-profile";
import {
  THOUGHT_V2_METADATA_PROFILE_ID,
  THOUGHT_V2_PROVENANCE_PROFILE_ID,
  thoughtV2MetadataAttributeOrder,
  type ThoughtV2MetadataAttribute,
} from "./thought-v2-terminal-study-metadata";
import { verifyThoughtV2Provenance } from "./thought-v2-terminal-provenance";

export const THOUGHT_V2_ANVIL_RUNTIME_PATH = "/thought-v2-gallery.anvil.json";

export type ThoughtV2AnvilRuntime = {
  attestation: {
    authority: string;
    authorityEpoch: number;
    profileId: string;
    status: "mock-valid-eip712";
    verifier: string;
  };
  chainId: 31337;
  contracts: {
    creationAttestationVerifier: string;
    pathNft: string;
    protocolRegistry: string;
    thoughtNft: string;
    thoughtRenderer: string;
    thoughtSpecRegistry: string;
  };
  gallery: {
    attested: number;
    mintedSupply: number;
    source: "ThoughtNFTV2.tokenURI()";
    unattested: number;
  };
  generatedAt: string;
  protocolRelease: {
    id: string;
    manifest: Record<string, unknown>;
    manifestHash: string;
    manifestJson: string;
    manifestUri: string;
    status: "registered-disposable-anvil";
  };
  renderer: {
    canonicalRendererId: string;
    glyphDefinitionsHash: string;
    glyphPackedBytes: number;
    glyphPackedHash: string;
    glyphDefinitionsIndexPointer: string;
    glyphDefinitionsPointer1: string;
    glyphDefinitionsPointer2: string;
    glyphLibraryMemberId: "inshell.mono-76";
    implementationId: string;
    releaseReady: true;
  };
  rpcUrl: string;
  schema: "inshell.thought.v2.anvil-gallery-runtime.v1";
  selectedSpec: {
    hash: string;
    id: string;
    name: string;
    ref: string;
  };
  status: "ready";
  telemetry: {
    averageMintGas: string;
    maxProvenanceBytes: number;
    minProvenanceBytes: number;
    totalMintGas: string;
  };
};

export type ThoughtV2TokenMetadata = {
  attributes: ThoughtV2MetadataAttribute[];
  background_color: "000000";
  description: string;
  external_url: string;
  image: string;
  name: string;
  properties: Record<string, unknown>;
  thought: {
    agentLine: string;
    agentLineKeccak256: string;
    conversationIdentityHash: string;
    creationAttestation: {
      digest: string;
      profileId: string;
      status: "Inshell THOUGHT App" | "Unattested";
      verifier: string;
    };
    records: {
      agent: { keccak256: string; label: string };
      model: { keccak256: string; label: string };
      workIdentityInput: false;
    };
    metadataProfileId: string;
    metadataProfileIdHash: string;
    mint: {
      chainId: string;
      contract: string;
      minter: string;
      mintedAt: string;
      pathId: string;
      pathSerial: string;
      status: "minted";
      tokenId: string;
    };
    promptLine: string;
    promptLineKeccak256: string;
    protocol: {
      manifestKeccak256: string;
      protocolReleaseId: string;
      releaseStatus: "registered";
      thoughtSpecHash: string;
      thoughtSpecId: string;
    };
    provenanceHash: string;
    provenanceJson: string;
    provenanceProfileId: string;
    rendererId: string;
    rendererIdHash: string;
    rendererImplementationId: string;
    rendererReleaseReady: true;
    status: "minted";
    workHash: string;
    workProfileId: string;
  };
};

export type ThoughtV2OnchainToken = {
  metadata: ThoughtV2TokenMetadata;
  metadataJson: string;
  tokenId: number;
  tokenUri: string;
  traits: Map<string, ThoughtV2MetadataAttribute>;
};

export type ThoughtV2OnchainTokenDetail = ThoughtV2OnchainToken & {
  direct: {
    agentLine: string;
    author: string;
    creationAttestationDigest: string;
    agent: string;
    model: string;
    mintedAt: bigint;
    owner: string;
    pathId: bigint;
    pathSerial: bigint;
    promptLine: string;
    protocolManifestHash: string;
    protocolManifestUri: string;
    provenanceHash: string;
    provenanceJson: string;
    specHash: string;
    specId: string;
    specName: string;
    specRef: string;
    svg: string;
    workHash: string;
  };
};

export const THOUGHT_V2_TOKEN_READ_ABI = [
  "function totalSupply() view returns (uint256)",
  "function tokenURI(uint256 tokenId) view returns (string)",
  "function pathNft() view returns (address)",
  "function thoughtSpecRegistry() view returns (address)",
  "function thoughtRenderer() view returns (address)",
  "function creationAttestationVerifier() view returns (address)",
  "function protocolRegistry() view returns (address)",
  "function protocolReleaseId() view returns (bytes32)",
  "function WORK_PROFILE_ID() view returns (string)",
  "function CONTEXT_PROFILE_ID() view returns (string)",
  "function METADATA_PROFILE_ID() view returns (string)",
  "function RENDERER_ID() view returns (string)",
  "function CREATION_ATTESTATION_PROFILE_ID() view returns (bytes32)",
  "function MAX_PROMPT_LINE_BYTES() view returns (uint256)",
  "function MAX_AGENT_LINE_BYTES() view returns (uint256)",
  "function MAX_AGENT_RECORD_BYTES() view returns (uint256)",
  "function MAX_MODEL_RECORD_BYTES() view returns (uint256)",
  "function MAX_PROVENANCE_BYTES() view returns (uint256)",
  "function ownerOf(uint256 tokenId) view returns (address)",
  "function promptLineOf(uint256 tokenId) view returns (string)",
  "function agentLineOf(uint256 tokenId) view returns (string)",
  "function agentOf(uint256 tokenId) view returns (string)",
  "function modelOf(uint256 tokenId) view returns (string)",
  "function provenanceOf(uint256 tokenId) view returns (string)",
  "function provenanceHashOf(uint256 tokenId) view returns (bytes32)",
  "function workHashOf(uint256 tokenId) view returns (bytes32)",
  "function creationAttestationDigestOf(uint256 tokenId) view returns (bytes32)",
  "function pathIdOf(uint256 tokenId) view returns (uint256)",
  "function pathSerialOf(uint256 tokenId) view returns (uint256)",
  "function authorOf(uint256 tokenId) view returns (address)",
  "function mintedAtOf(uint256 tokenId) view returns (uint64)",
  "function thoughtSpecOf(uint256 tokenId) view returns (bytes32 specId, bytes32 specHash, string specName, string ref)",
  "function protocolManifestHash() view returns (bytes32)",
  "function protocolManifestURI() view returns (string)",
  "function svgOf(uint256 tokenId) view returns (string)",
] as const;

const bytes32Pattern = /^0x[0-9a-f]{64}$/;

export const assertThoughtV2AnvilRuntime = (value: unknown): ThoughtV2AnvilRuntime => {
  if (!value || typeof value !== "object") throw new Error("Anvil runtime config is not an object");
  const runtime = value as ThoughtV2AnvilRuntime;
  if (
    runtime.schema !== "inshell.thought.v2.anvil-gallery-runtime.v1"
    || runtime.status !== "ready"
    || runtime.chainId !== 31337
    || runtime.gallery?.source !== "ThoughtNFTV2.tokenURI()"
    || !Number.isSafeInteger(runtime.gallery?.mintedSupply)
    || runtime.gallery.mintedSupply < 1
    || runtime.attestation?.status !== "mock-valid-eip712"
    || !Number.isSafeInteger(runtime.attestation?.authorityEpoch)
    || runtime.attestation.authorityEpoch < 1
    || runtime.attestation.verifier?.toLowerCase() !== runtime.contracts?.creationAttestationVerifier?.toLowerCase()
    || typeof runtime.rpcUrl !== "string"
    || typeof runtime.contracts?.thoughtNft !== "string"
    || runtime.renderer?.releaseReady !== true
    || runtime.renderer?.glyphLibraryMemberId
      !== "inshell.mono-76"
    || !bytes32Pattern.test(runtime.renderer?.glyphDefinitionsHash ?? "")
    || !bytes32Pattern.test(runtime.renderer?.glyphPackedHash ?? "")
    || runtime.renderer.glyphDefinitionsHash !== runtime.renderer.glyphPackedHash
    || runtime.renderer.glyphPackedBytes !== 4_600
    || typeof runtime.renderer?.glyphDefinitionsPointer1 !== "string"
    || typeof runtime.renderer?.glyphDefinitionsPointer2 !== "string"
    || typeof runtime.renderer?.glyphDefinitionsIndexPointer !== "string"
  ) {
    throw new Error("Anvil runtime config does not describe a ready current-V2 gallery");
  }
  return runtime;
};

export const parseEmbeddedJsonDataUri = (uri: string): {
  json: string;
  value: unknown;
} => {
  const prefix = "data:application/json;base64,";
  if (!uri.startsWith(prefix)) throw new Error("tokenURI must be embedded base64 JSON");
  const binary = atob(uri.slice(prefix.length));
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  const json = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  return { json, value: JSON.parse(json) };
};

export const parseEmbeddedSvgDataUri = (uri: string): string => {
  const prefix = "data:image/svg+xml;base64,";
  if (!uri.startsWith(prefix)) throw new Error("image must be embedded base64 SVG");
  const binary = atob(uri.slice(prefix.length));
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
};

export const validateThoughtV2TokenMetadata = (
  metadataValue: unknown,
  tokenId: number,
  runtime: ThoughtV2AnvilRuntime,
): ThoughtV2TokenMetadata => {
  if (!metadataValue || typeof metadataValue !== "object") throw new Error(`THOUGHT #${tokenId} metadata is not an object`);
  const metadata = metadataValue as ThoughtV2TokenMetadata;
  const thought = metadata.thought;
  const attestationDigest = thought?.creationAttestation?.digest;
  const expectedAttestationStatus = attestationDigest === `0x${"00".repeat(32)}`
    ? "Unattested"
    : "Inshell THOUGHT App";
  const expectedAttributeOrder = thoughtV2MetadataAttributeOrder(expectedAttestationStatus);
  if (
    metadata.name !== `THOUGHT #${tokenId}`
    || metadata.external_url !== `https://inshell.art/thought/${tokenId}`
    || metadata.background_color !== "000000"
    || !metadata.image?.startsWith("data:image/svg+xml;base64,")
    || !Array.isArray(metadata.attributes)
    || metadata.attributes.length !== expectedAttributeOrder.length
    || metadata.attributes.some((attribute, index) => attribute.trait_type !== expectedAttributeOrder[index])
    || thought?.metadataProfileId !== THOUGHT_V2_METADATA_PROFILE_ID
    || thought?.provenanceProfileId !== THOUGHT_V2_PROVENANCE_PROFILE_ID
    || thought?.rendererImplementationId !== runtime.renderer.implementationId
    || thought?.rendererReleaseReady !== true
    || thought?.mint?.tokenId !== String(tokenId)
    || thought?.mint?.chainId !== String(runtime.chainId)
    || thought?.mint?.contract.toLowerCase() !== runtime.contracts.thoughtNft.toLowerCase()
    || thought?.protocol?.manifestKeccak256 !== runtime.protocolRelease.manifestHash
    || thought?.protocol?.protocolReleaseId !== runtime.protocolRelease.id
    || thought?.protocol?.thoughtSpecId !== runtime.selectedSpec.id
    || thought?.protocol?.thoughtSpecHash !== runtime.selectedSpec.hash
    || thought?.creationAttestation?.profileId !== runtime.attestation.profileId
    || thought?.creationAttestation?.verifier.toLowerCase() !== runtime.attestation.verifier.toLowerCase()
    || !bytes32Pattern.test(attestationDigest ?? "")
    || !bytes32Pattern.test(thought?.workHash ?? "")
  ) {
    throw new Error(`THOUGHT #${tokenId} tokenURI canonical metadata parity failed`);
  }
  const hashes = deriveThoughtV2WorkHashes(thought.promptLine, thought.agentLine);
  if (
    thought.promptLineKeccak256 !== hashes.promptLineKeccak256
    || thought.agentLineKeccak256 !== hashes.agentLineKeccak256
    || thought.conversationIdentityHash !== hashes.conversationIdentityHash
    || thought.workHash !== hashes.workHash
    || keccak256(toUtf8Bytes(thought.provenanceJson)) !== thought.provenanceHash
  ) {
    throw new Error(`THOUGHT #${tokenId} tokenURI work/provenance commitments drifted`);
  }
  const provenance = verifyThoughtV2Provenance(toUtf8Bytes(thought.provenanceJson), {
    agentLine: thought.agentLine,
    chainId: thought.mint.chainId,
    agent: thought.records.agent.label,
    model: thought.records.model.label,
    intendedMinter: thought.mint.minter.toLowerCase() as `0x${string}`,
    manifestKeccak256: thought.protocol.manifestKeccak256 as `0x${string}`,
    promptLine: thought.promptLine,
    protocolReleaseId: thought.protocol.protocolReleaseId as `0x${string}`,
    provenanceHash: thought.provenanceHash as `0x${string}`,
    thoughtNft: thought.mint.contract.toLowerCase() as `0x${string}`,
    thoughtSpecHash: thought.protocol.thoughtSpecHash as `0x${string}`,
    thoughtSpecId: thought.protocol.thoughtSpecId as `0x${string}`,
    workHash: thought.workHash as `0x${string}`,
  });
  if (!provenance.conforming) {
    throw new Error(`THOUGHT #${tokenId} provenance failed shared verification: ${provenance.issues[0]?.message ?? "unknown issue"}`);
  }
  const attestationTrait = metadata.attributes.find(
    ({ trait_type }) => trait_type === "Creation Attestation",
  );
  const agentTrait = metadata.attributes.find(
    ({ trait_type }) => trait_type === "Agent",
  );
  const modelTrait = metadata.attributes.find(
    ({ trait_type }) => trait_type === "Model",
  );
  if (
    thought.creationAttestation.status !== expectedAttestationStatus
    || attestationTrait?.value !== expectedAttestationStatus
  ) {
    throw new Error(`THOUGHT #${tokenId} creation-attestation metadata parity failed`);
  }
  if (
    agentTrait?.value !== thought.records.agent.label
    || modelTrait?.value !== thought.records.model.label
  ) {
    throw new Error(`THOUGHT #${tokenId} neutral Agent/model traits drifted`);
  }
  if (expectedAttestationStatus === "Inshell THOUGHT App") {
    if (provenance.parsed?.process.kind !== "agent-run") {
      throw new Error(`THOUGHT #${tokenId} attested provenance is not an Agent run`);
    }
    const attestationVerification = verifyThoughtV2Provenance(toUtf8Bytes(thought.provenanceJson), {
      attestationClaim: {
        chainId: thought.mint.chainId,
        agentHash: thought.records.agent.keccak256 as `0x${string}`,
        modelHash: thought.records.model.keccak256 as `0x${string}`,
        intendedMinter: thought.mint.minter.toLowerCase() as `0x${string}`,
        protocolReleaseId: thought.protocol.protocolReleaseId as `0x${string}`,
        provenanceHash: thought.provenanceHash as `0x${string}`,
        runIdHash: provenance.parsed.process.transport.runIdHash,
        thoughtNft: thought.mint.contract.toLowerCase() as `0x${string}`,
        thoughtSpecHash: thought.protocol.thoughtSpecHash as `0x${string}`,
        thoughtSpecId: thought.protocol.thoughtSpecId as `0x${string}`,
        workHash: thought.workHash as `0x${string}`,
      },
    });
    if (!attestationVerification.conforming) {
      throw new Error(`THOUGHT #${tokenId} creation-attestation binding drifted`);
    }
  }
  return metadata;
};

export const loadThoughtV2AnvilRuntime = async (): Promise<ThoughtV2AnvilRuntime> => {
  const response = await fetch(THOUGHT_V2_ANVIL_RUNTIME_PATH, { cache: "no-store" });
  if (!response.ok) throw new Error(`Anvil runtime config returned HTTP ${response.status}`);
  return assertThoughtV2AnvilRuntime(await response.json());
};

export type ThoughtV2AnvilClient = {
  contract: Contract;
  provider: JsonRpcProvider;
  runtime: ThoughtV2AnvilRuntime;
};

export const createThoughtV2AnvilClientFromRuntime = async (
  runtimeValue: unknown,
): Promise<ThoughtV2AnvilClient> => {
  const runtime = assertThoughtV2AnvilRuntime(runtimeValue);
  const provider = new JsonRpcProvider(runtime.rpcUrl);
  const network = await provider.getNetwork();
  if (Number(network.chainId) !== runtime.chainId) throw new Error("Anvil RPC chain does not match runtime config");
  if ((await provider.getCode(runtime.contracts.thoughtNft)) === "0x") throw new Error("configured ThoughtNFTV2 has no bytecode");
  return {
    contract: new Contract(runtime.contracts.thoughtNft, THOUGHT_V2_TOKEN_READ_ABI, provider),
    provider,
    runtime,
  };
};

export const createThoughtV2AnvilClient = async (): Promise<ThoughtV2AnvilClient> =>
  createThoughtV2AnvilClientFromRuntime(await loadThoughtV2AnvilRuntime());

export const loadThoughtV2AnvilToken = async (
  contract: Contract,
  runtime: ThoughtV2AnvilRuntime,
  tokenId: number,
): Promise<ThoughtV2OnchainToken> => {
  const tokenUri = await contract.tokenURI(tokenId) as string;
  const parsed = parseEmbeddedJsonDataUri(tokenUri);
  const metadata = validateThoughtV2TokenMetadata(parsed.value, tokenId, runtime);
  return {
    metadata,
    metadataJson: parsed.json,
    tokenId,
    tokenUri,
    traits: new Map(metadata.attributes.map((attribute) => [attribute.trait_type, attribute])),
  };
};

export const loadThoughtV2AnvilGallery = async (): Promise<{
  runtime: ThoughtV2AnvilRuntime;
  tokens: ThoughtV2OnchainToken[];
}> => {
  const { contract, runtime } = await createThoughtV2AnvilClient();
  const supply = Number(await contract.totalSupply());
  if (supply !== runtime.gallery.mintedSupply) {
    throw new Error(`Anvil supply/config mismatch: contract ${supply}, config ${runtime.gallery.mintedSupply}`);
  }
  const tokens: ThoughtV2OnchainToken[] = [];
  const batchSize = 4;
  for (let start = 1; start <= supply; start += batchSize) {
    const ids = Array.from({ length: Math.min(batchSize, supply - start + 1) }, (_, index) => start + index);
    tokens.push(...await Promise.all(ids.map((tokenId) => loadThoughtV2AnvilToken(contract, runtime, tokenId))));
  }
  return { runtime, tokens };
};

export const loadThoughtV2AnvilTokenDetailFromClient = async (
  contract: Contract,
  runtime: ThoughtV2AnvilRuntime,
  tokenId: number,
): Promise<ThoughtV2OnchainTokenDetail> => {
  const supply = Number(await contract.totalSupply());
  if (!Number.isSafeInteger(tokenId) || tokenId < 1 || tokenId > supply) {
    throw new Error(`THOUGHT token ID must be between 1 and ${supply}`);
  }
  const token = await loadThoughtV2AnvilToken(contract, runtime, tokenId);
  const [
    owner,
    promptLine,
    agentLine,
    agent,
    model,
    provenanceJson,
    provenanceHash,
    workHash,
    creationAttestationDigest,
    pathId,
    pathSerial,
    author,
    mintedAt,
    thoughtSpec,
    protocolManifestHash,
    protocolManifestUri,
    svg,
  ] = await Promise.all([
    contract.ownerOf(tokenId),
    contract.promptLineOf(tokenId),
    contract.agentLineOf(tokenId),
    contract.agentOf(tokenId),
    contract.modelOf(tokenId),
    contract.provenanceOf(tokenId),
    contract.provenanceHashOf(tokenId),
    contract.workHashOf(tokenId),
    contract.creationAttestationDigestOf(tokenId),
    contract.pathIdOf(tokenId),
    contract.pathSerialOf(tokenId),
    contract.authorOf(tokenId),
    contract.mintedAtOf(tokenId),
    contract.thoughtSpecOf(tokenId),
    contract.protocolManifestHash(),
    contract.protocolManifestURI(),
    contract.svgOf(tokenId),
  ]);
  const thought = token.metadata.thought;
  if (
    promptLine !== thought.promptLine
    || agentLine !== thought.agentLine
    || agent !== thought.records.agent.label
    || model !== thought.records.model.label
    || provenanceJson !== thought.provenanceJson
    || provenanceHash !== thought.provenanceHash
    || workHash !== thought.workHash
    || creationAttestationDigest !== thought.creationAttestation.digest
    || String(pathId) !== thought.mint.pathId
    || String(pathSerial) !== thought.mint.pathSerial
    || author.toLowerCase() !== thought.mint.minter.toLowerCase()
    || String(mintedAt) !== thought.mint.mintedAt
    || thoughtSpec[0] !== thought.protocol.thoughtSpecId
    || thoughtSpec[1] !== thought.protocol.thoughtSpecHash
    || protocolManifestHash !== thought.protocol.manifestKeccak256
    || svg !== parseEmbeddedSvgDataUri(token.metadata.image)
  ) {
    throw new Error(`THOUGHT #${tokenId} direct typed state and tokenURI disagree`);
  }
  return {
    ...token,
    direct: {
      agentLine,
      author,
      creationAttestationDigest,
      agent,
      model,
      mintedAt,
      owner,
      pathId,
      pathSerial,
      promptLine,
      protocolManifestHash,
      protocolManifestUri,
      provenanceHash,
      provenanceJson,
      specHash: thoughtSpec[1],
      specId: thoughtSpec[0],
      specName: thoughtSpec[2],
      specRef: thoughtSpec[3],
      svg,
      workHash,
    },
  };
};

export const loadThoughtV2AnvilTokenDetail = async (
  tokenId: number,
): Promise<{ runtime: ThoughtV2AnvilRuntime; token: ThoughtV2OnchainTokenDetail }> => {
  const { contract, runtime } = await createThoughtV2AnvilClient();
  return {
    runtime,
    token: await loadThoughtV2AnvilTokenDetailFromClient(contract, runtime, tokenId),
  };
};

export const traitValue = (
  token: ThoughtV2OnchainToken,
  traitType: string,
): string | number => {
  const value = token.traits.get(traitType)?.value;
  if (typeof value !== "string" && typeof value !== "number") {
    throw new Error(`THOUGHT #${token.tokenId} is missing ${traitType}`);
  }
  return value;
};

export const optionalTraitValue = (
  token: ThoughtV2OnchainToken,
  traitType: string,
): string | number | undefined => {
  const value = token.traits.get(traitType)?.value;
  return typeof value === "string" || typeof value === "number" ? value : undefined;
};
