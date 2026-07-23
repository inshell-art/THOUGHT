#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  AbiCoder,
  Contract,
  ContractFactory,
  NonceManager,
  concat,
  encodeBytes32String,
  getBytes,
  id,
  isAddress,
  keccak256,
  toBeHex,
  toUtf8Bytes,
  zeroPadValue,
  JsonRpcProvider,
  type Signer,
} from "ethers";

import {
  canonicalJsonStringify,
  type CanonicalJson,
} from "../src/thought-v2-canonical-json";
import {
  assertCreationAttestationProof,
  creationAttestationDomain,
  CREATION_ATTESTATION_TYPES,
  hashCreationAttestationClaim,
  type ThoughtCreationAttestationClaim,
  type ThoughtCreationAttestationProof,
} from "../src/thought-v2-creation-attestation";
import { thoughtChatGalleryFixtures } from "../src/thought-v2-chat-gallery";
import {
  buildVerifiedCanonicalThoughtV2Provenance,
  verifyThoughtV2Provenance,
  type ThoughtV2ProvenanceAttestationFacts,
} from "../src/thought-v2-terminal-provenance";
import {
  THOUGHT_V2_RENDERER_ID,
  THOUGHT_V2_RENDERER_ID_HASH,
  THOUGHT_V2_WORK_PROFILE_ID,
  THOUGHT_V2_WORK_PROFILE_ID_HASH,
} from "../src/thought-v2-terminal-work-profile";
import {
  THOUGHT_V2_CONTEXT_PROFILE_ID,
  THOUGHT_V2_CONTEXT_PROFILE_ID_HASH,
} from "../src/thought-v2-context-profile";
import {
  THOUGHT_V2_METADATA_PROFILE_ID,
  THOUGHT_V2_METADATA_PROFILE_ID_HASH,
  THOUGHT_V2_CREATION_ATTESTATION_PROFILE_ID,
  THOUGHT_V2_PROVENANCE_PROFILE_ID,
  thoughtV2MetadataAttributeOrder,
} from "../src/thought-v2-terminal-study-metadata";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const rpcUrl = process.env.RPC_URL ?? "http://127.0.0.1:8545";
const pathArtifactFile = process.env.PATH_ARTIFACT
  ?? "/Users/bigu/Projects/path/evm/artifacts/src/PathNFT.sol/PathNFT.json";
const runtimeConfigFile = path.resolve(
  rootDir,
  process.env.THOUGHT_V2_RUNTIME_CONFIG ?? "public/thought-v2-gallery.anvil.json",
);
const specName = "THOUGHT.v2.md";
const specFile = path.join(rootDir, "protocol/current/v2/THOUGHT.v2.md");
const specRef = "dev://thought/v2/current/THOUGHT.v2.md";
const fontFile = path.join(
  rootDir,
  "node_modules/@fontsource/source-code-pro/files/source-code-pro-latin-400-normal.woff2",
);
const rendererImplementationId =
  "inshell.thought.renderer.v2.dev-source-code-pro-foreign-object-outer-frame-32-404040";
const thoughtMovement = encodeBytes32String("THOUGHT");
const zeroBytes32 = `0x${"00".repeat(32)}`;
const consumeAuthorizationTypehash = id(
  "ConsumeAuthorization(address pathNft,uint256 chainId,uint256 pathId,bytes32 movement,address claimer,address executor,uint256 nonce,uint256 deadline)",
);
const abiCoder = AbiCoder.defaultAbiCoder();

type Artifact = { abi: unknown[]; bytecode: string };

const outFile = (contract: string): string =>
  path.join(rootDir, "evm/out", `${contract}.sol`, `${contract}.json`);

const readArtifact = async (filename: string): Promise<Artifact> => {
  const parsed = JSON.parse(await fs.readFile(filename, "utf8")) as {
    abi?: unknown[];
    bytecode?: string | { object?: string };
  };
  const bytecode = typeof parsed.bytecode === "string"
    ? parsed.bytecode
    : parsed.bytecode?.object;
  if (!parsed.abi || !bytecode || bytecode === "0x") throw new Error(`invalid artifact ${filename}`);
  return { abi: parsed.abi, bytecode };
};

const deploy = async (
  signer: NonceManager,
  artifactFile: string,
  args: readonly unknown[] = [],
): Promise<Contract> => {
  const artifact = await readArtifact(artifactFile);
  const contract = await new ContractFactory(artifact.abi, artifact.bytecode, signer).deploy(...args);
  await contract.waitForDeployment();
  return contract as unknown as Contract;
};

const deployDataPointer = async (
  signer: NonceManager,
  payload: Uint8Array,
): Promise<string> => {
  const runtime = concat(["0x00", payload]);
  const runtimeLength = getBytes(runtime).length;
  if (runtimeLength > 24_576) throw new Error(`font pointer runtime is ${runtimeLength}/24576 bytes`);
  const creation = concat([
    "0x61",
    zeroPadValue(toBeHex(runtimeLength), 2),
    "0x80600c6000396000f3",
    runtime,
  ]);
  const receipt = await (await signer.sendTransaction({ data: creation })).wait();
  if (!receipt?.contractAddress) throw new Error("font data pointer deployment failed");
  return receipt.contractAddress;
};

const pathSignature = async (
  signer: Signer,
  chainId: bigint,
  pathAddress: string,
  thoughtAddress: string,
  pathId: bigint,
  nonce: bigint,
  deadline: bigint,
): Promise<string> => {
  const claimer = await signer.getAddress();
  const structHash = keccak256(abiCoder.encode(
    ["bytes32", "address", "uint256", "uint256", "bytes32", "address", "address", "uint256", "uint256"],
    [
      consumeAuthorizationTypehash,
      pathAddress,
      chainId,
      pathId,
      thoughtMovement,
      claimer,
      thoughtAddress,
      nonce,
      deadline,
    ],
  ));
  return signer.signMessage(getBytes(structHash));
};

const hashFile = async (relativePath: string): Promise<`0x${string}`> =>
  keccak256(await fs.readFile(path.join(rootDir, relativePath))) as `0x${string}`;

const decodeMetadata = (tokenUri: string): Record<string, unknown> => {
  const prefix = "data:application/json;base64,";
  if (!tokenUri.startsWith(prefix)) throw new Error("tokenURI is not embedded base64 JSON");
  return JSON.parse(Buffer.from(tokenUri.slice(prefix.length), "base64").toString("utf8"));
};

const main = async (): Promise<void> => {
  const provider = new JsonRpcProvider(rpcUrl);
  const network = await provider.getNetwork();
  if (network.chainId !== 31_337n) throw new Error(`current V2 gallery requires Anvil chain 31337, got ${network.chainId}`);
  const account = await provider.getSigner(0);
  const deployerAddress = await account.getAddress();
  const existingNonce = await provider.getTransactionCount(deployerAddress);
  if (existingNonce !== 0 && process.env.ALLOW_USED_ANVIL !== "1") {
    throw new Error(`Anvil is not fresh: gallery deployer nonce is ${existingNonce}; restart with npm run devnode:v2:start`);
  }
  const signer = new NonceManager(account);
  const minter = deployerAddress.toLowerCase() as `0x${string}`;

  const [pathArtifact, specBytes, fontBytes] = await Promise.all([
    readArtifact(pathArtifactFile),
    fs.readFile(specFile),
    fs.readFile(fontFile),
  ]);
  if (specBytes.includes(0x0d) || specBytes.subarray(0, 3).equals(Buffer.from([0xef, 0xbb, 0xbf]))) {
    throw new Error("current THOUGHT spec must use exact UTF-8 without BOM or CRLF");
  }
  const specText = specBytes.toString("utf8");
  if (!specText.startsWith(`# ${specName}\n`) || !specText.includes("Version: v2")) {
    throw new Error("current THOUGHT spec name/header/version mismatch");
  }
  const thoughtSpecId = id(specName) as `0x${string}`;
  const thoughtSpecHash = keccak256(specBytes) as `0x${string}`;
  const fontHash = keccak256(fontBytes) as `0x${string}`;

  console.log(`Deploying disposable current V2 gallery from ${deployerAddress}...`);
  const pathNft = await deploy(signer, pathArtifactFile, [deployerAddress, "PATH", "PATH", "", 0n, 604_800n]);
  const pathAddress = await pathNft.getAddress();
  await (await pathNft.grantRole(id("MINTER_ROLE"), deployerAddress)).wait();
  await (await pathNft.freezePublicMinter(deployerAddress)).wait();
  for (let pathId = 1n; pathId <= BigInt(thoughtChatGalleryFixtures.length); pathId += 1n) {
    await (await pathNft.safeMint(deployerAddress, pathId, "0x")).wait();
  }

  const specRegistry = await deploy(signer, outFile("ThoughtSpecRegistry"), [deployerAddress]);
  const specRegistryAddress = await specRegistry.getAddress();
  const staticSpec = await specRegistry.registerThoughtSpec.staticCall(specName, specRef, specBytes);
  if (staticSpec[0] !== thoughtSpecId || staticSpec[1] !== thoughtSpecHash) {
    throw new Error("selected THOUGHT spec registration parity failed");
  }
  await (await specRegistry.registerThoughtSpec(specName, specRef, specBytes)).wait();
  if (!await specRegistry.validateThoughtSpec(thoughtSpecId, thoughtSpecHash)) {
    throw new Error("selected THOUGHT spec registry readback failed");
  }

  const protocolRegistry = await deploy(signer, outFile("ThoughtSpecRegistryV2"), [deployerAddress]);
  const protocolRegistryAddress = await protocolRegistry.getAddress();
  const fontPointer = await deployDataPointer(signer, fontBytes);
  if (keccak256(`0x${(await provider.getCode(fontPointer)).slice(4)}`) !== fontHash) {
    throw new Error("Source Code Pro pointer readback failed");
  }
  const renderer = await deploy(
    signer,
    outFile("ThoughtRendererV2DevSourceCodePro"),
    [fontPointer, fontHash],
  );
  const rendererAddress = await renderer.getAddress();

  const manifestArtifacts = await Promise.all([
    ["creative-spec", "protocol/current/v2/THOUGHT.v2.md"],
    ["work-profile", "protocol/current/v2/work/thought.work.v2.profile.json"],
    ["context-profile", "protocol/current/v2/context/thought.context.v2.profile.json"],
    ["metadata-profile", "protocol/current/v2/metadata/thought.metadata.v2.profile.json"],
    ["provenance-schema", "protocol/current/v2/provenance/thought.provenance.v2.schema.json"],
    ["creation-attestation-profile", "protocol/current/v2/attestation/thought.creation-workflow-attestation.v1.md"],
  ].map(async ([role, artifactPath]) => ({
    keccak256: await hashFile(artifactPath!),
    path: artifactPath!,
    role: role!,
  })));
  const manifest = {
    artifacts: manifestArtifacts,
    chainId: network.chainId.toString(),
    font: {
      embeddedByPointer: true,
      family: "Source Code Pro",
      keccak256: fontHash,
      releaseReady: false,
      role: "temporary-anvil-study-font",
    },
    identifiers: {
      contextProfile: THOUGHT_V2_CONTEXT_PROFILE_ID,
      contextProfileHash: THOUGHT_V2_CONTEXT_PROFILE_ID_HASH,
      metadataProfile: THOUGHT_V2_METADATA_PROFILE_ID,
      metadataProfileHash: THOUGHT_V2_METADATA_PROFILE_ID_HASH,
      provenance: THOUGHT_V2_PROVENANCE_PROFILE_ID,
      renderer: THOUGHT_V2_RENDERER_ID,
      rendererHash: THOUGHT_V2_RENDERER_ID_HASH,
      workProfile: THOUGHT_V2_WORK_PROFILE_ID,
      workProfileHash: THOUGHT_V2_WORK_PROFILE_ID_HASH,
    },
    productionRegistrationAuthorized: false,
    rendererImplementation: {
      id: rendererImplementationId,
      releaseReady: false,
      usesForeignObject: true,
    },
    schema: "inshell.thought.protocol.v2.disposable-anvil-manifest.v1",
    selectedSpec: { name: specName, thoughtSpecHash, thoughtSpecId },
    status: "registered-disposable-anvil",
  };
  const manifestJson = canonicalJsonStringify(manifest as unknown as CanonicalJson);
  const manifestHash = keccak256(toUtf8Bytes(manifestJson)) as `0x${string}`;
  const manifestUri = `dev://thought/v2/anvil/${manifestHash}`;
  const releaseId = await protocolRegistry.registerRelease.staticCall(manifestHash, manifestUri) as `0x${string}`;
  await (await protocolRegistry.registerRelease(manifestHash, manifestUri)).wait();

  const verifier = await deploy(
    signer,
    outFile("CreationAttestationVerifier"),
    [deployerAddress, deployerAddress],
  );
  const verifierAddress = await verifier.getAddress();
  const thoughtNft = await deploy(
    signer,
    outFile("ThoughtNFTV2"),
    [
      pathAddress,
      specRegistryAddress,
      rendererAddress,
      protocolRegistryAddress,
      releaseId,
      verifierAddress,
    ],
  );
  const thoughtAddress = await thoughtNft.getAddress();
  const thoughtAddressLower = thoughtAddress.toLowerCase() as `0x${string}`;
  const verifierAddressLower = verifierAddress.toLowerCase() as `0x${string}`;
  const authorityEpoch = BigInt(await verifier.authorityEpoch());
  await (await pathNft.setMovementConfig(thoughtMovement, thoughtAddress, 1)).wait();
  await (await pathNft.freezeMovementConfig(thoughtMovement)).wait();

  const protocol = {
    manifestKeccak256: manifestHash,
    protocolReleaseId: releaseId,
    thoughtSpecHash,
    thoughtSpecId,
  };
  const selectedSpec = { exactSpecBytes: specBytes, specName };
  const provenanceBytes: number[] = [];
  const attestations = new Map<number, {
    digest: `0x${string}`;
    facts: ThoughtV2ProvenanceAttestationFacts;
  }>();
  let totalMintGas = 0n;
  for (const fixture of thoughtChatGalleryFixtures) {
    const pathId = BigInt(fixture.tokenNumber);
    const shouldAttest = fixture.creationAttestationFixture === "mock-attested";
    const process = shouldAttest
      ? {
        agentDeclaration: {
          label: fixture.declaredAgent,
          source: "runtime_configured" as const,
          status: "declared-unverified" as const,
        },
        kind: "agent-run" as const,
        modelDeclaration: {
          label: fixture.declaredModel,
          source: "runtime_configured" as const,
          status: "declared-unverified" as const,
        },
        transport: {
          adapter: "inshell.thought.app",
          resultEnvelope: {
            agentLine: fixture.agentLine,
            status: "complete",
          },
          route: "anvil.mock-agent-run",
          runReference: `public-anvil-run-${String(fixture.tokenNumber).padStart(4, "0")}`,
        },
      }
      : {
        agentDeclaration: {
          label: fixture.declaredAgent,
          source: "manual" as const,
          status: "declared-unverified" as const,
        },
        kind: "manual" as const,
        modelDeclaration: {
          label: fixture.declaredModel,
          source: "manual" as const,
          status: "declared-unverified" as const,
        },
      };
    const provenance = buildVerifiedCanonicalThoughtV2Provenance({
      agentLine: fixture.agentLine,
      mintContext: {
        chainId: network.chainId.toString(),
        intendedMinter: minter,
        thoughtNft: thoughtAddressLower,
      },
      process,
      promptLine: fixture.promptLine,
      protocol,
      selectedSpec,
    });
    provenanceBytes.push(provenance.exactBytes.length);
    const latestBlock = await provider.getBlock("latest");
    if (!latestBlock) throw new Error("latest Anvil block unavailable");
    const deadline = BigInt(latestBlock.timestamp + 3_600);
    let creationAttestation: ThoughtCreationAttestationProof = {
      authorityEpoch: 0n,
      deadline: 0n,
      runIdHash: zeroBytes32 as `0x${string}`,
      signature: "0x",
    };
    if (shouldAttest) {
      if (provenance.provenance.process.kind !== "agent-run") {
        throw new Error(`mock-attested fixture ${fixture.tokenNumber} did not build Agent-run provenance`);
      }
      const claim: ThoughtCreationAttestationClaim = {
        authorityEpoch,
        deadline,
        declaredAgentHash: keccak256(toUtf8Bytes(fixture.declaredAgent)) as `0x${string}`,
        declaredModelHash: keccak256(toUtf8Bytes(fixture.declaredModel)) as `0x${string}`,
        intendedMinter: minter,
        profileId: THOUGHT_V2_CREATION_ATTESTATION_PROFILE_ID as `0x${string}`,
        protocolReleaseId: releaseId,
        provenanceHash: provenance.provenanceHash,
        runIdHash: provenance.provenance.process.transport.runIdHash,
        thoughtNft: thoughtAddressLower,
        thoughtSpecHash,
        thoughtSpecId,
        workHash: provenance.provenance.work.workHash as `0x${string}`,
      };
      const facts: ThoughtV2ProvenanceAttestationFacts = {
        chainId: network.chainId.toString(),
        declaredAgentHash: claim.declaredAgentHash,
        declaredModelHash: claim.declaredModelHash,
        intendedMinter: claim.intendedMinter,
        protocolReleaseId: claim.protocolReleaseId,
        provenanceHash: claim.provenanceHash,
        runIdHash: claim.runIdHash,
        thoughtNft: claim.thoughtNft,
        thoughtSpecHash: claim.thoughtSpecHash,
        thoughtSpecId: claim.thoughtSpecId,
        workHash: claim.workHash,
      };
      const preSignVerification = verifyThoughtV2Provenance(
        provenance.exactBytes,
        {
          agentLine: fixture.agentLine,
          attestationClaim: facts,
          chainId: network.chainId.toString(),
          declaredAgent: fixture.declaredAgent,
          declaredModel: fixture.declaredModel,
          intendedMinter: minter,
          manifestKeccak256: manifestHash,
          promptLine: fixture.promptLine,
          protocolReleaseId: releaseId,
          provenanceHash: provenance.provenanceHash,
          thoughtNft: thoughtAddressLower,
          thoughtSpecHash,
          thoughtSpecId,
          workHash: claim.workHash,
        },
        selectedSpec,
      );
      if (!preSignVerification.conforming) {
        throw new Error(
          `mock signer rejected THOUGHT #${fixture.tokenNumber}: ${preSignVerification.issues.map(({ message }) => message).join("; ")}`,
        );
      }
      const signature = await account.signTypedData(
        creationAttestationDomain(network.chainId, verifierAddressLower),
        CREATION_ATTESTATION_TYPES,
        claim,
      ) as `0x${string}`;
      creationAttestation = {
        authorityEpoch,
        deadline,
        runIdHash: claim.runIdHash,
        signature,
      };
      assertCreationAttestationProof(creationAttestation);
      const digest = hashCreationAttestationClaim(network.chainId, verifierAddressLower, claim);
      if (await verifier.hashClaim(claim) !== digest) {
        throw new Error(`TypeScript/Solidity attestation digest drift for THOUGHT #${fixture.tokenNumber}`);
      }
      attestations.set(fixture.tokenNumber, { digest, facts });
    }
    const nonce = await pathNft.getConsumeNonce(deployerAddress);
    const signature = await pathSignature(
      account,
      network.chainId,
      pathAddress,
      thoughtAddress,
      pathId,
      nonce,
      deadline,
    );
    const transaction = await thoughtNft.mint({
      agentLine: fixture.agentLine,
      creationAttestation,
      deadline,
      declaredAgent: fixture.declaredAgent,
      declaredModel: fixture.declaredModel,
      pathId,
      pathSignature: signature,
      promptLine: fixture.promptLine,
      provenanceJson: provenance.canonicalJson,
      thoughtSpecHash,
      thoughtSpecId,
    });
    const receipt = await transaction.wait();
    totalMintGas += receipt?.gasUsed ?? 0n;
    if (fixture.tokenNumber % 10 === 0 || fixture.tokenNumber === thoughtChatGalleryFixtures.length) {
      console.log(`Minted ${fixture.tokenNumber}/${thoughtChatGalleryFixtures.length}`);
    }
  }

  const totalSupply = Number(await thoughtNft.totalSupply());
  if (totalSupply !== thoughtChatGalleryFixtures.length) throw new Error(`minted supply mismatch: ${totalSupply}`);
  for (const fixture of thoughtChatGalleryFixtures) {
    const tokenId = BigInt(fixture.tokenNumber);
    const [
      promptLine,
      agentLine,
      storedProvenance,
      storedHash,
      workHash,
      creationAttestationDigest,
      tokenUri,
    ] = await Promise.all([
      thoughtNft.promptLineOf(tokenId),
      thoughtNft.agentLineOf(tokenId),
      thoughtNft.provenanceOf(tokenId),
      thoughtNft.provenanceHashOf(tokenId),
      thoughtNft.workHashOf(tokenId),
      thoughtNft.creationAttestationDigestOf(tokenId),
      thoughtNft.tokenURI(tokenId),
    ]);
    const expectedAttestation = attestations.get(fixture.tokenNumber);
    const verification = verifyThoughtV2Provenance(
      toUtf8Bytes(storedProvenance),
      {
        agentLine: fixture.agentLine,
        ...(expectedAttestation ? { attestationClaim: expectedAttestation.facts } : {}),
        chainId: network.chainId.toString(),
        declaredAgent: fixture.declaredAgent,
        declaredModel: fixture.declaredModel,
        intendedMinter: minter,
        manifestKeccak256: manifestHash,
        promptLine: fixture.promptLine,
        protocolReleaseId: releaseId,
        provenanceHash: storedHash,
        thoughtNft: thoughtAddressLower,
        thoughtSpecHash,
        thoughtSpecId,
        workHash,
      },
      selectedSpec,
    );
    const metadata = decodeMetadata(tokenUri);
    const thought = metadata.thought as Record<string, unknown> | undefined;
    const metadataAttestation = thought?.creationAttestation as Record<string, unknown> | undefined;
    const attributes = metadata.attributes as Array<Record<string, unknown>> | undefined;
    const expectedDigest = expectedAttestation?.digest ?? zeroBytes32;
    const expectedStatus = expectedAttestation ? "Inshell THOUGHT App" : "Unattested";
    const expectedAttributeOrder = thoughtV2MetadataAttributeOrder(expectedStatus);
    const attributeTypes = attributes?.map(({ trait_type }) => trait_type);
    const attestedAgent = attributes?.find(({ trait_type }) => trait_type === "Attested Agent");
    const attestedModel = attributes?.find(({ trait_type }) => trait_type === "Attested Model");
    if (
      promptLine !== fixture.promptLine
      || agentLine !== fixture.agentLine
      || !verification.conforming
      || creationAttestationDigest !== expectedDigest
      || metadataAttestation?.digest !== expectedDigest
      || metadataAttestation?.status !== expectedStatus
      || thought?.provenanceJson !== storedProvenance
      || thought?.provenanceHash !== storedHash
      || thought?.workHash !== workHash
      || attributes?.length !== expectedAttributeOrder.length
      || attributeTypes?.some((traitType, index) => traitType !== expectedAttributeOrder[index])
      || (expectedAttestation
        ? attestedAgent?.value !== fixture.declaredAgent || attestedModel?.value !== fixture.declaredModel
        : attestedAgent !== undefined || attestedModel !== undefined)
    ) {
      throw new Error(`on-chain tokenURI/provenance parity failed for THOUGHT #${fixture.tokenNumber}`);
    }
  }

  const runtimeConfig = {
    attestation: {
      authority: deployerAddress,
      authorityEpoch: Number(authorityEpoch),
      profileId: THOUGHT_V2_CREATION_ATTESTATION_PROFILE_ID,
      status: "mock-valid-eip712",
      verifier: verifierAddress,
    },
    chainId: Number(network.chainId),
    contracts: {
      creationAttestationVerifier: verifierAddress,
      pathNft: pathAddress,
      protocolRegistry: protocolRegistryAddress,
      thoughtNft: thoughtAddress,
      thoughtRenderer: rendererAddress,
      thoughtSpecRegistry: specRegistryAddress,
    },
    gallery: {
      attested: attestations.size,
      mintedSupply: totalSupply,
      source: "ThoughtNFTV2.tokenURI()",
      unattested: totalSupply - attestations.size,
    },
    generatedAt: new Date().toISOString(),
    protocolRelease: {
      id: releaseId,
      manifest,
      manifestHash,
      manifestJson,
      manifestUri,
      status: "registered-disposable-anvil",
    },
    renderer: {
      canonicalRendererId: THOUGHT_V2_RENDERER_ID,
      fontHash,
      fontPointer,
      implementationId: rendererImplementationId,
      releaseReady: false,
    },
    rpcUrl,
    schema: "inshell.thought.v2.anvil-gallery-runtime.v1",
    selectedSpec: {
      hash: thoughtSpecHash,
      id: thoughtSpecId,
      name: specName,
      ref: specRef,
    },
    status: "ready",
    telemetry: {
      averageMintGas: (totalMintGas / BigInt(totalSupply)).toString(),
      maxProvenanceBytes: Math.max(...provenanceBytes),
      minProvenanceBytes: Math.min(...provenanceBytes),
      totalMintGas: totalMintGas.toString(),
    },
  };
  await fs.writeFile(runtimeConfigFile, `${JSON.stringify(runtimeConfig, null, 2)}\n`, "utf8");
  if (!isAddress(thoughtAddress)) throw new Error("invalid THOUGHT deployment address");
  console.log(`Ready: ${totalSupply} on-chain THOUGHT tokens at ${thoughtAddress}`);
  console.log(`Runtime config: ${runtimeConfigFile}`);
};

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
