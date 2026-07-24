import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { Contract, getAddress, id } from "ethers";

import boundary from "../protocol/current/v2/integration/thought.app-contract-boundary.v1.json";
import {
  createThoughtV2AnvilClientFromRuntime,
  loadThoughtV2AnvilToken,
  loadThoughtV2AnvilTokenDetailFromClient,
  type ThoughtV2OnchainToken,
} from "../src/thought-v2-anvil-gallery";
import {
  THOUGHT_CREATION_ATTESTATION_PROFILE_ID,
} from "../src/thought-v2-creation-attestation";
import {
  THOUGHT_V2_CONTEXT_PROFILE_ID,
} from "../src/thought-v2-context-profile";
import {
  THOUGHT_V2_METADATA_PROFILE_ID,
} from "../src/thought-v2-terminal-study-metadata";
import {
  THOUGHT_V2_RENDERER_ID,
  THOUGHT_V2_WORK_PROFILE_ID,
} from "../src/thought-v2-terminal-work-profile";

const zeroBytes32 = `0x${"00".repeat(32)}`;

const fail = (message: string): never => {
  throw new Error(`App-contract boundary conformance failed: ${message}`);
};

const equal = (actual: unknown, expected: unknown, label: string): void => {
  if (actual !== expected) fail(`${label}: expected ${String(expected)}, received ${String(actual)}`);
};

const equalAddress = (actual: string, expected: string, label: string): void => {
  if (getAddress(actual) !== getAddress(expected)) fail(`${label}: address mismatch`);
};

const runtimePath = resolve(
  process.env.THOUGHT_V2_RUNTIME_CONFIG ?? "public/thought-v2-gallery.anvil.json",
);
const runtimeJson = await readFile(runtimePath, "utf8");
const client = await createThoughtV2AnvilClientFromRuntime(JSON.parse(runtimeJson));
const { contract, provider, runtime } = client;

try {
  if (boundary.authoritative || boundary.productionAuthorization) {
    fail("review draft must not claim authority or production authorization");
  }
  equal(
    boundary.implementationBaseline,
    "current-v2-registry-bound-candidate",
    "boundary implementation baseline",
  );
  if (boundary.proposedTarget.implementationAuthorized) {
    fail("unapproved registry-removal target became authorized");
  }

  for (const [name, address] of Object.entries(runtime.contracts)) {
    if (await provider.getCode(address) === "0x") fail(`${name} has no bytecode`);
  }

  const [
    pathNft,
    thoughtSpecRegistry,
    thoughtRenderer,
    creationAttestationVerifier,
    protocolRegistry,
    protocolReleaseId,
    workProfileId,
    contextProfileId,
    metadataProfileId,
    rendererId,
    creationAttestationProfileId,
    maxPromptLineBytes,
    maxAgentLineBytes,
    maxDeclaredAgentBytes,
    maxDeclaredModelBytes,
    maxProvenanceBytes,
    supplyValue,
    manifestHash,
    manifestUri,
  ] = await Promise.all([
    contract.pathNft(),
    contract.thoughtSpecRegistry(),
    contract.thoughtRenderer(),
    contract.creationAttestationVerifier(),
    contract.protocolRegistry(),
    contract.protocolReleaseId(),
    contract.WORK_PROFILE_ID(),
    contract.CONTEXT_PROFILE_ID(),
    contract.METADATA_PROFILE_ID(),
    contract.RENDERER_ID(),
    contract.CREATION_ATTESTATION_PROFILE_ID(),
    contract.MAX_PROMPT_LINE_BYTES(),
    contract.MAX_AGENT_LINE_BYTES(),
    contract.MAX_DECLARED_AGENT_BYTES(),
    contract.MAX_DECLARED_MODEL_BYTES(),
    contract.MAX_PROVENANCE_BYTES(),
    contract.totalSupply(),
    contract.protocolManifestHash(),
    contract.protocolManifestURI(),
  ]);

  equalAddress(pathNft, runtime.contracts.pathNft, "PATH dependency");
  equalAddress(thoughtSpecRegistry, runtime.contracts.thoughtSpecRegistry, "spec registry dependency");
  equalAddress(thoughtRenderer, runtime.contracts.thoughtRenderer, "renderer dependency");
  equalAddress(
    creationAttestationVerifier,
    runtime.contracts.creationAttestationVerifier,
    "attestation verifier dependency",
  );
  equalAddress(protocolRegistry, runtime.contracts.protocolRegistry, "protocol registry dependency");
  equal(protocolReleaseId, runtime.protocolRelease.id, "protocol release ID");
  equal(manifestHash, runtime.protocolRelease.manifestHash, "protocol manifest hash");
  equal(manifestUri, runtime.protocolRelease.manifestUri, "protocol manifest URI");

  equal(workProfileId, THOUGHT_V2_WORK_PROFILE_ID, "work profile");
  equal(contextProfileId, THOUGHT_V2_CONTEXT_PROFILE_ID, "context profile");
  equal(metadataProfileId, THOUGHT_V2_METADATA_PROFILE_ID, "metadata profile");
  equal(rendererId, THOUGHT_V2_RENDERER_ID, "renderer ID");
  equal(
    creationAttestationProfileId,
    THOUGHT_CREATION_ATTESTATION_PROFILE_ID,
    "Creation Attestation profile ID",
  );
  equal(Number(maxPromptLineBytes), boundary.currentExecutableBoundary.limits.promptLineUtf8Bytes, "prompt byte limit");
  equal(Number(maxAgentLineBytes), boundary.currentExecutableBoundary.limits.agentLineUtf8Bytes, "Agent byte limit");
  equal(
    Number(maxDeclaredAgentBytes),
    boundary.currentExecutableBoundary.limits.declaredAgentUtf8Bytes,
    "declared Agent byte limit",
  );
  equal(
    Number(maxDeclaredModelBytes),
    boundary.currentExecutableBoundary.limits.declaredModelUtf8Bytes,
    "declared model byte limit",
  );
  equal(
    Number(maxProvenanceBytes),
    boundary.currentExecutableBoundary.limits.provenanceUtf8Bytes,
    "provenance byte limit",
  );

  const verifier = new Contract(runtime.contracts.creationAttestationVerifier, [
    "function profileId() view returns (bytes32)",
    "function authority() view returns (address)",
    "function authorityEpoch() view returns (uint32)",
    "function paused() view returns (bool)",
  ], provider);
  const [verifierProfileId, authority, authorityEpoch, paused] = await Promise.all([
    verifier.profileId(),
    verifier.authority(),
    verifier.authorityEpoch(),
    verifier.paused(),
  ]);
  equal(verifierProfileId, runtime.attestation.profileId, "verifier profile ID");
  equal(verifierProfileId, THOUGHT_CREATION_ATTESTATION_PROFILE_ID, "shared verifier profile ID");
  equalAddress(authority, runtime.attestation.authority, "mock authority");
  equal(Number(authorityEpoch), runtime.attestation.authorityEpoch, "authority epoch");
  equal(paused, false, "verifier pause state");

  const renderer = new Contract(runtime.contracts.thoughtRenderer, [
    "function RENDERER_ID() view returns (string)",
    "function METADATA_PROFILE_ID() view returns (string)",
    "function IMPLEMENTATION_ID() view returns (string)",
    "function GLYPH_LIBRARY_MEMBER_ID() view returns (string)",
    "function glyphDefinitionsPointer1() view returns (address)",
    "function glyphDefinitionsPointer2() view returns (address)",
    "function glyphDefinitionsIndexPointer() view returns (address)",
    "function glyphDefinitionsKeccak256() view returns (bytes32)",
    "function GLYPH_DEFINITIONS_INDEX_KECCAK256() view returns (bytes32)",
  ], provider);
  const [
    rendererProfileId,
    rendererMetadataProfileId,
    rendererImplementationId,
    glyphLibraryMemberId,
    glyphDefinitionsPointer1,
    glyphDefinitionsPointer2,
    glyphDefinitionsIndexPointer,
    glyphDefinitionsHash,
    glyphDefinitionsIndexHash,
  ] = await Promise.all([
    renderer.RENDERER_ID(),
    renderer.METADATA_PROFILE_ID(),
    renderer.IMPLEMENTATION_ID(),
    renderer.GLYPH_LIBRARY_MEMBER_ID(),
    renderer.glyphDefinitionsPointer1(),
    renderer.glyphDefinitionsPointer2(),
    renderer.glyphDefinitionsIndexPointer(),
    renderer.glyphDefinitionsKeccak256(),
    renderer.GLYPH_DEFINITIONS_INDEX_KECCAK256(),
  ]);
  equal(rendererProfileId, runtime.renderer.canonicalRendererId, "renderer canonical ID");
  equal(rendererMetadataProfileId, THOUGHT_V2_METADATA_PROFILE_ID, "renderer metadata profile");
  equal(rendererImplementationId, runtime.renderer.implementationId, "renderer implementation ID");
  equal(glyphLibraryMemberId, runtime.renderer.glyphLibraryMemberId, "renderer glyph-library member");
  equalAddress(
    glyphDefinitionsPointer1,
    runtime.renderer.glyphDefinitionsPointer1,
    "glyph definitions pointer 1",
  );
  equalAddress(
    glyphDefinitionsPointer2,
    runtime.renderer.glyphDefinitionsPointer2,
    "glyph definitions pointer 2",
  );
  equalAddress(
    glyphDefinitionsIndexPointer,
    runtime.renderer.glyphDefinitionsIndexPointer,
    "glyph definitions index pointer",
  );
  equal(glyphDefinitionsHash, runtime.renderer.glyphDefinitionsHash, "glyph definitions hash");
  equal(glyphDefinitionsIndexHash, runtime.renderer.glyphDefinitionsIndexHash, "glyph definitions index hash");
  if (!runtime.renderer.releaseReady) fail("canonical Humanist Smooth renderer must be release-ready");

  const supply = Number(supplyValue);
  equal(supply, runtime.gallery.mintedSupply, "gallery supply");
  if (!Number.isSafeInteger(supply) || supply < 1) fail("gallery supply is invalid");

  const tokens: ThoughtV2OnchainToken[] = [];
  const batchSize = 4;
  for (let start = 1; start <= supply; start += batchSize) {
    const ids = Array.from(
      { length: Math.min(batchSize, supply - start + 1) },
      (_, index) => start + index,
    );
    tokens.push(...await Promise.all(
      ids.map((tokenId) => loadThoughtV2AnvilToken(contract, runtime, tokenId)),
    ));
  }

  const attestedTokens = tokens.filter(
    ({ metadata }) => metadata.thought.creationAttestation.digest !== zeroBytes32,
  );
  const unattestedTokens = tokens.filter(
    ({ metadata }) => metadata.thought.creationAttestation.digest === zeroBytes32,
  );
  equal(attestedTokens.length, runtime.gallery.attested, "attested gallery count");
  equal(unattestedTokens.length, runtime.gallery.unattested, "Unattested gallery count");

  const attestedAgentValues = new Set<string>();
  const attestedModelValues = new Set<string>();
  for (const token of tokens) {
    const thought = token.metadata.thought;
    const agentTrait = token.traits.get("Attested Agent");
    const modelTrait = token.traits.get("Attested Model");
    if (thought.creationAttestation.digest === zeroBytes32) {
      if (agentTrait || modelTrait) fail(`THOUGHT #${token.tokenId} exposes unattested Agent/model traits`);
      continue;
    }
    equal(agentTrait?.value, thought.declarations.agent.label, `THOUGHT #${token.tokenId} Agent trait`);
    equal(modelTrait?.value, thought.declarations.model.label, `THOUGHT #${token.tokenId} model trait`);
    attestedAgentValues.add(thought.declarations.agent.label);
    attestedModelValues.add(thought.declarations.model.label);
  }
  if (attestedAgentValues.size < 2 || attestedModelValues.size < 2) {
    fail("mock-attested corpus does not exercise multiple real Agent/model labels");
  }

  const directParityIds = new Set([
    1,
    attestedTokens[0]?.tokenId,
    unattestedTokens[0]?.tokenId,
    supply,
  ].filter((tokenId): tokenId is number => tokenId !== undefined));
  for (const tokenId of directParityIds) {
    await loadThoughtV2AnvilTokenDetailFromClient(contract, runtime, tokenId);
  }

  const firstSpec = await contract.thoughtSpecOf(1);
  equal(firstSpec[0], runtime.selectedSpec.id, "stored selected spec ID");
  equal(firstSpec[1], runtime.selectedSpec.hash, "stored selected spec hash");
  equal(firstSpec[2], runtime.selectedSpec.name, "registered selected spec name");
  equal(firstSpec[3], runtime.selectedSpec.ref, "registered selected spec ref");
  equal(id(currentProfileName()), runtime.attestation.profileId, "boundary attestation profile hash");

  console.log("THOUGHT V2 App-contract boundary conformance: PASS");
  console.log(`runtime: ${runtimePath}`);
  console.log(`ThoughtNFTV2: ${runtime.contracts.thoughtNft}`);
  console.log(`tokens: ${supply} (${attestedTokens.length} attested, ${unattestedTokens.length} Unattested)`);
  console.log(`direct typed-state parity samples: ${[...directParityIds].join(", ")}`);
  console.log("baseline: current registry-bound V2 candidate");
  console.log("proposed registry removal: unapproved and unimplemented");
} finally {
  provider.destroy();
}

function currentProfileName(): string {
  return boundary.currentExecutableBoundary.profiles.creationAttestation;
}
