#!/usr/bin/env node
import { createHash } from "node:crypto";
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
} from "../src/thought-v2-current-creation-attestation";
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
const pathDependencyLockFile = path.join(
  rootDir,
  "protocol/current/v2/integration/path-nft.v0.5.0.json",
);
const defaultPathReleaseDir = path.resolve(rootDir, "../path/releases/v0.5.0");
const pathReleaseDir = path.resolve(
  process.env.PATH_RELEASE_DIR ?? defaultPathReleaseDir,
);
const pathArtifactFile = process.env.PATH_ARTIFACT
  ?? path.join(pathReleaseDir, "hardhat/PathNFT.json");
const runtimeConfigFile = path.resolve(
  rootDir,
  process.env.THOUGHT_V2_RUNTIME_CONFIG ?? "public/thought-v2-gallery.anvil.json",
);
const tokenUriFixtureFile = path.resolve(
  rootDir,
  process.env.THOUGHT_V2_TOKEN_URI_FIXTURES
    ?? "artifacts/thought-v2-integration-preview/runtime-fixtures/neutral-agent-model-token-uri-examples.anvil.json",
);
const rendererExperiment = process.env.THOUGHT_V2_RENDERER_EXPERIMENT ?? "";
const set5RendererExperiments = {
  "classic-book": {
    contractName: "ThoughtSvgRendererV2ClassicBook",
    familyName: "Classic Book 76",
    implementationId: "inshell.thought.renderer.v2.classic-book-76-im76-native-paths-frame-32-006100-green-00ff00-prompt-top-agent-bottom",
    packedBytes: 2_540,
    packedKeccak256: "0xa1505ed49c1e2b8d78d088de1a6b0b1cefcd6087cd47415bb29c39b4a3394430",
    packedSha256: "3ab51d7dcdce7e358e7c76002b8f78ddaa448a99de2116a238f7e22209f2bd60",
  },
  "classic-compact": {
    contractName: "ThoughtSvgRendererV2ClassicCompact",
    familyName: "Classic Compact 76",
    implementationId: "inshell.thought.renderer.v2.classic-compact-76-im76-native-paths-frame-32-006100-green-00ff00-prompt-top-agent-bottom",
    packedBytes: 2_631,
    packedKeccak256: "0x14c2bf9e9c2c5638980db8fd101c296e42fa8031fa59529b71b48e3fe9b027ea",
    packedSha256: "204bf9e84103b57175e1dc0be06b3f42e91a4d0f8fb5b8b7457b52ff63c79393",
  },
  "classic-line": {
    contractName: "ThoughtSvgRendererV2ClassicLine",
    familyName: "Classic Line 76",
    implementationId: "inshell.thought.renderer.v2.classic-line-76-im76-native-paths-frame-32-006100-green-00ff00-prompt-top-agent-bottom",
    packedBytes: 2_514,
    packedKeccak256: "0x139753d435a99bff61fd410929e57f9038ab5772ccc7a35a26a76ee03545fb77",
    packedSha256: "d06f7403b4963d8f46e6e8559c7ab0e4a21a65aa3681b210bfe433d74ea56b42",
  },
  "classic-round": {
    contractName: "ThoughtSvgRendererV2ClassicRound",
    familyName: "Classic Round 76",
    implementationId: "inshell.thought.renderer.v2.classic-round-76-im76-native-paths-frame-32-006100-green-00ff00-prompt-top-agent-bottom",
    packedBytes: 2_696,
    packedKeccak256: "0x55bf4234750664a8fc608d089e3f59074e3e1ae15f7082029888a6291d0de323",
    packedSha256: "72ea88523caf278828b833368c4a3a289f7b80866ac464325d04f031c48e3a01",
  },
} as const;
type Set5RendererSlug = keyof typeof set5RendererExperiments;
const set5Experiment = rendererExperiment === ""
  ? undefined
  : set5RendererExperiments[rendererExperiment as Set5RendererSlug];
if (rendererExperiment !== "" && !set5Experiment) {
  throw new Error(`unsupported THOUGHT V2 renderer experiment ${rendererExperiment}`);
}
const specName = "THOUGHT.v2.md";
const specFile = path.join(rootDir, "protocol/current/v2/THOUGHT.v2.md");
const specRef = "dev://thought/v2/current/THOUGHT.v2.md";
const mono76PackedFile = path.join(
  rootDir,
  "protocol/current/v2/renderer/mono-76.im76.bin",
);
const mono76RendererImplementationId =
  "inshell.thought.renderer.v2.mono-76-v1-im76-native-paths-frame-32-006100-green-00ff00-prompt-top-agent-bottom";
const mono76PackedKeccak256 =
  "0xba37d00bb395b84f0487791300a29cdd2b1712b078fa218c6ed74fa11d74a081";
const rendererImplementationId =
  set5Experiment?.implementationId ?? mono76RendererImplementationId;
const thoughtMovement = encodeBytes32String("THOUGHT");
const zeroBytes32 = `0x${"00".repeat(32)}`;
const consumeAuthorizationTypehash = id(
  "ConsumeAuthorization(address pathNft,uint256 chainId,uint256 pathId,bytes32 movement,address claimer,address executor,uint256 permissionEpoch,uint256 nonce,uint256 deadline)",
);
const abiCoder = AbiCoder.defaultAbiCoder();

type Artifact = { abi: unknown[]; bytecode: string };

type PathDependencyLock = {
  contractSourceCommit: string;
  manifestSha256: string;
  pathNft: { hardhatArtifactSha256: string; redeploymentRequired: boolean };
  releaseTag: string;
  schema: string;
  consumeAuthorization: {
    schema: string;
    type: string;
  };
};

type GalleryMintFixture = {
  agentLine: string;
  creationAttestationFixture: "mock-attested" | "unattested";
  agent: string;
  model: string;
  promptLine: string;
  tokenNumber: number;
};

const set5BoundaryFixtures: GalleryMintFixture[] = [
  {
    agentLine: "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!?",
    creationAttestationFixture: "unattested",
    agent: "Boundary fixture",
    model: "Maximum distinct 64",
    promptLine: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789?!",
    tokenNumber: thoughtChatGalleryFixtures.length + 1,
  },
  {
    agentLine: "?!:;'\"-()/&ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0",
    creationAttestationFixture: "unattested",
    agent: "Boundary fixture",
    model: "All visible glyphs",
    promptLine: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789.,",
    tokenNumber: thoughtChatGalleryFixtures.length + 2,
  },
];

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

const sha256 = (bytes: Uint8Array): string =>
  createHash("sha256").update(bytes).digest("hex");

const verifyPathRelease = async (): Promise<PathDependencyLock> => {
  const [lockBytes, manifestBytes, artifactBytes] = await Promise.all([
    fs.readFile(pathDependencyLockFile),
    fs.readFile(path.join(pathReleaseDir, "manifest.json")),
    fs.readFile(pathArtifactFile),
  ]);
  const lock = JSON.parse(lockBytes.toString("utf8")) as PathDependencyLock;
  const manifest = JSON.parse(manifestBytes.toString("utf8")) as {
    compatibility?: { consumeAuthorizationSchema?: string; pathNftRedeploymentRequired?: boolean };
    contractSourceCommit?: string;
    contracts?: { PathNFT?: { hardhatArtifactSha256?: string } };
    releaseTag?: string;
    schema?: string;
  };
  if (
    lock.schema !== "inshell.thought.path-dependency-lock.v1"
    || lock.releaseTag !== "v0.5.0"
    || lock.consumeAuthorization.schema !== "permission-epoch-v1"
    || lock.consumeAuthorization.type
      !== "ConsumeAuthorization(address pathNft,uint256 chainId,uint256 pathId,bytes32 movement,address claimer,address executor,uint256 permissionEpoch,uint256 nonce,uint256 deadline)"
    || lock.pathNft.redeploymentRequired !== true
    || sha256(manifestBytes) !== lock.manifestSha256
    || manifest.schema !== "path.downstream-artifacts.v1"
    || manifest.releaseTag !== lock.releaseTag
    || manifest.contractSourceCommit !== lock.contractSourceCommit
    || manifest.compatibility?.consumeAuthorizationSchema !== lock.consumeAuthorization.schema
    || manifest.compatibility?.pathNftRedeploymentRequired !== true
    || manifest.contracts?.PathNFT?.hardhatArtifactSha256
      !== lock.pathNft.hardhatArtifactSha256
    || sha256(artifactBytes) !== lock.pathNft.hardhatArtifactSha256
  ) {
    throw new Error(`PATH ${lock.releaseTag ?? "release"} dependency lock mismatch`);
  }
  return lock;
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
  if (runtimeLength > 24_576) throw new Error(`data pointer runtime is ${runtimeLength}/24576 bytes`);
  const creation = concat([
    "0x61",
    zeroPadValue(toBeHex(runtimeLength), 2),
    "0x80600c6000396000f3",
    runtime,
  ]);
  const receipt = await (await signer.sendTransaction({ data: creation })).wait();
  if (!receipt?.contractAddress) throw new Error("renderer data pointer deployment failed");
  return receipt.contractAddress;
};

const pathSignature = async (
  signer: Signer,
  chainId: bigint,
  pathAddress: string,
  thoughtAddress: string,
  pathId: bigint,
  permissionEpoch: bigint,
  nonce: bigint,
  deadline: bigint,
): Promise<string> => {
  const claimer = await signer.getAddress();
  const structHash = keccak256(abiCoder.encode(
    ["bytes32", "address", "uint256", "uint256", "bytes32", "address", "address", "uint256", "uint256", "uint256"],
    [
      consumeAuthorizationTypehash,
      pathAddress,
      chainId,
      pathId,
      thoughtMovement,
      claimer,
      thoughtAddress,
      permissionEpoch,
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
  const galleryFixtures: GalleryMintFixture[] = set5Experiment
    ? [...thoughtChatGalleryFixtures, ...set5BoundaryFixtures]
    : thoughtChatGalleryFixtures;

  const [
    pathDependency,
    specBytes,
    mono76Packed,
    set5Packed,
  ] = await Promise.all([
    verifyPathRelease(),
    fs.readFile(specFile),
    fs.readFile(mono76PackedFile),
    set5Experiment
      ? fs.readFile(path.join(
        rootDir,
        `protocol/current/v2/renderer/experiments/${rendererExperiment}/${rendererExperiment}.im76.bin`,
      ))
      : Promise.resolve(Buffer.alloc(0)),
  ]);
  console.log(
    `Verified PATH ${pathDependency.releaseTag} (${pathDependency.consumeAuthorization.schema})`,
  );
  if (specBytes.includes(0x0d) || specBytes.subarray(0, 3).equals(Buffer.from([0xef, 0xbb, 0xbf]))) {
    throw new Error("current THOUGHT spec must use exact UTF-8 without BOM or CRLF");
  }
  const specText = specBytes.toString("utf8");
  if (!specText.startsWith(`# ${specName}\n`) || !specText.includes("Version: v2")) {
    throw new Error("current THOUGHT spec name/header/version mismatch");
  }
  const thoughtSpecId = id(specName) as `0x${string}`;
  const thoughtSpecHash = keccak256(specBytes) as `0x${string}`;
  const mono76PackedHash = keccak256(mono76Packed) as `0x${string}`;
  if (mono76Packed.length !== 4_600 || mono76PackedHash !== mono76PackedKeccak256) {
    throw new Error("sealed Mono 76 v1.0.0 IM76 payload drifted");
  }
  const set5PackedHash = keccak256(set5Packed) as `0x${string}`;
  if (
    set5Experiment
    && (
      set5Packed.length !== set5Experiment.packedBytes
      || set5PackedHash !== set5Experiment.packedKeccak256
    )
  ) {
    throw new Error(`${set5Experiment.familyName} IM76 payload drifted`);
  }

  console.log(
    `Deploying disposable current V2 ${set5Experiment ? `${set5Experiment.familyName} benchmark` : "gallery"} from ${deployerAddress}...`,
  );
  const pathNft = await deploy(signer, pathArtifactFile, [deployerAddress, "PATH", "PATH", "", 0n, 604_800n]);
  const pathAddress = await pathNft.getAddress();
  await (await pathNft.grantRole(id("MINTER_ROLE"), deployerAddress)).wait();
  await (await pathNft.freezePublicMinter(deployerAddress)).wait();
  for (let pathId = 1n; pathId <= BigInt(galleryFixtures.length); pathId += 1n) {
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
  let glyphDefinitionsPointer1: string;
  let glyphDefinitionsPointer2: string;
  let glyphDefinitionsIndexPointer: string;
  let renderer: Contract;
  let svgRendererAddress: string | null = null;
  if (set5Experiment) {
    glyphDefinitionsPointer1 = await deployDataPointer(signer, set5Packed);
    glyphDefinitionsPointer2 = zeroBytes32.slice(0, 42);
    glyphDefinitionsIndexPointer = zeroBytes32.slice(0, 42);
    if (
      keccak256(`0x${(await provider.getCode(glyphDefinitionsPointer1)).slice(4)}`)
        !== set5PackedHash
    ) {
      throw new Error(`${set5Experiment.familyName} IM76 pointer readback failed`);
    }
    const svgRenderer = await deploy(
      signer,
      outFile(set5Experiment.contractName),
      [glyphDefinitionsPointer1],
    );
    svgRendererAddress = await svgRenderer.getAddress();
    renderer = await deploy(signer, outFile("ThoughtRendererV2Split"), [svgRendererAddress]);
    if (
      await renderer.IMPLEMENTATION_ID() !== set5Experiment.implementationId
      || await renderer.GLYPH_LIBRARY_MEMBER_ID()
        !== `inshell.thought.glyph-library.set-05.${rendererExperiment}`
      || await renderer.glyphDefinitionsKeccak256() !== set5PackedHash
    ) {
      throw new Error(`${set5Experiment.familyName} renderer descriptor readback failed`);
    }
  } else {
    glyphDefinitionsPointer1 = await deployDataPointer(signer, mono76Packed);
    glyphDefinitionsPointer2 = zeroBytes32.slice(0, 42);
    glyphDefinitionsIndexPointer = zeroBytes32.slice(0, 42);
    if (
      keccak256(`0x${(await provider.getCode(glyphDefinitionsPointer1)).slice(4)}`)
        !== mono76PackedHash
    ) {
      throw new Error("Mono 76 packed pointer readback failed");
    }
    renderer = await deploy(
      signer,
      outFile("ThoughtRendererV2"),
      [glyphDefinitionsPointer1],
    );
  }
  const rendererAddress = await renderer.getAddress();

  const rendererManifestArtifacts = set5Experiment
    ? [
      ["renderer-profile", `protocol/current/v2/renderer/experiments/${rendererExperiment}/thought.renderer.v2.${rendererExperiment}.experiment.json`],
      ["renderer-glyph-packed-im76", `protocol/current/v2/renderer/experiments/${rendererExperiment}/${rendererExperiment}.im76.bin`],
      ["renderer-glyph-package-manifest", "vendor/thought-glyph-library-fifth-set-v8/manifest.json"],
      ["renderer-glyph-license", "vendor/thought-glyph-library-fifth-set-v8/UNLICENSED.md"],
      ["renderer-glyph-notice", "vendor/thought-glyph-library-fifth-set-v8/NOTICE.md"],
    ]
    : [
      ["renderer-profile", "protocol/current/v2/renderer/thought.renderer.v2.profile.json"],
      ["renderer-glyph-packed-im76", "protocol/current/v2/renderer/mono-76.im76.bin"],
      ["renderer-glyph-package-manifest", "vendor/mono-76/manifest.json"],
      ["renderer-glyph-provenance", "vendor/mono-76/PROVENANCE.md"],
      ["renderer-glyph-license", "vendor/mono-76/UNLICENSED.md"],
      ["renderer-glyph-notice", "vendor/mono-76/NOTICE.md"],
    ];
  const manifestArtifacts = await Promise.all([
    ["creative-spec", "protocol/current/v2/THOUGHT.v2.md"],
    ["work-profile", "protocol/current/v2/work/thought.work.v2.profile.json"],
    ["context-profile", "protocol/current/v2/context/thought.context.v2.profile.json"],
    ["metadata-profile", "protocol/current/v2/metadata/thought.metadata.v2.profile.json"],
    ["provenance-schema", "protocol/current/v2/provenance/thought.provenance.v2.schema.json"],
    ["creation-attestation-profile", "protocol/current/v2/attestation/thought.creation-workflow-attestation.v2.md"],
    ...rendererManifestArtifacts,
  ].map(async ([role, artifactPath]) => ({
    keccak256: await hashFile(artifactPath!),
    path: artifactPath!,
    role: role!,
  })));
  const manifest = {
    artifacts: manifestArtifacts,
    chainId: network.chainId.toString(),
    glyphLibrary: set5Experiment
      ? {
        family: set5Experiment.familyName,
        libraryMemberId: `inshell.thought.glyph-library.set-05.${rendererExperiment}`,
        librarySetId: "inshell.thought.glyph-library.set-05",
        librarySetVersion: 8,
        packageReleaseCommit: "715487e6a2549f980284cdf7a0c0edca575defa6",
        packageVersion: "1.7.0",
        packedBytes: set5Packed.length,
        packedKeccak256: set5PackedHash,
        packedSha256: `0x${set5Experiment.packedSha256}`,
        releaseReady: false,
        role: "noncanonical-solidity-gas-experiment",
        sourceRepositoryCommit: "a0ac1dafd2bc73ad023fc0e32e9b95b5385f608c",
      }
      : {
        family: "Inshell Mono 76",
        faceSha256: "7ed61ed6335fce2c1e58184916f5d344b8384fc05d4c616e83c35ad4fa9ed47f",
        libraryMemberId: "inshell.mono-76",
        librarySetId: "inshell.mono-76",
        manualEditPayloadSha256: "755f16a8f70d9141a8b2175bc1bafeaef93ead366179d85f3597bc3dfc9ddc56",
        packedBytes: mono76Packed.length,
        packedKeccak256: mono76PackedHash,
        packedSha256: "0x3acc0a9cf60c00aa2d512356386d1e2a999499896e25661e8e631d53d5e10926",
        releaseTag: "v1.0.0",
        releaseReady: true,
        role: "canonical-native-svg-paths",
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
      releaseReady: !set5Experiment,
      ...(svgRendererAddress ? { svgRendererAddress } : {}),
      usesForeignObject: false,
      usesSvgText: false,
    },
    schema: set5Experiment
      ? "inshell.thought.protocol.v2.disposable-anvil-set5-benchmark-manifest.v1"
      : "inshell.thought.protocol.v2.disposable-anvil-manifest.v1",
    selectedSpec: { name: specName, thoughtSpecHash, thoughtSpecId },
    status: set5Experiment
      ? "registered-disposable-anvil-noncanonical-experiment"
      : "registered-disposable-anvil",
  };
  const manifestJson = canonicalJsonStringify(manifest as unknown as CanonicalJson);
  const manifestHash = keccak256(toUtf8Bytes(manifestJson)) as `0x${string}`;
  const manifestUri = `dev://thought/v2/anvil/${manifestHash}`;
  const releaseId = await protocolRegistry.registerRelease.staticCall(manifestHash, manifestUri) as `0x${string}`;
  await (await protocolRegistry.registerRelease(manifestHash, manifestUri)).wait();

  const verifier = await deploy(
    signer,
    outFile("CreationAttestationVerifierV2"),
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
  for (const fixture of galleryFixtures) {
    const pathId = BigInt(fixture.tokenNumber);
    const shouldAttest = fixture.creationAttestationFixture === "mock-attested";
    const process = shouldAttest
      ? {
        agentDeclaration: {
          label: fixture.agent,
          source: "runtime_configured" as const,
          status: "declared-unverified" as const,
        },
        kind: "agent-run" as const,
        modelDeclaration: {
          label: fixture.model,
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
          label: fixture.agent,
          source: "manual" as const,
          status: "declared-unverified" as const,
        },
        kind: "manual" as const,
        modelDeclaration: {
          label: fixture.model,
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
        agentHash: keccak256(toUtf8Bytes(fixture.agent)) as `0x${string}`,
        modelHash: keccak256(toUtf8Bytes(fixture.model)) as `0x${string}`,
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
        agentHash: claim.agentHash,
        modelHash: claim.modelHash,
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
          agent: fixture.agent,
          model: fixture.model,
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
    const [permissionEpoch, nonce] = await Promise.all([
      pathNft.getPermissionEpoch(pathId),
      pathNft.getConsumeNonce(deployerAddress),
    ]);
    const signature = await pathSignature(
      account,
      network.chainId,
      pathAddress,
      thoughtAddress,
      pathId,
      permissionEpoch,
      nonce,
      deadline,
    );
    const transaction = await thoughtNft.mint({
      agentLine: fixture.agentLine,
      creationAttestation,
      deadline,
      agent: fixture.agent,
      model: fixture.model,
      pathId,
      pathSignature: signature,
      promptLine: fixture.promptLine,
      provenanceJson: provenance.canonicalJson,
      thoughtSpecHash,
      thoughtSpecId,
    });
    const receipt = await transaction.wait();
    totalMintGas += receipt?.gasUsed ?? 0n;
    if (fixture.tokenNumber % 10 === 0 || fixture.tokenNumber === galleryFixtures.length) {
      console.log(`Minted ${fixture.tokenNumber}/${galleryFixtures.length}`);
    }
  }

  const totalSupply = Number(await thoughtNft.totalSupply());
  if (totalSupply !== galleryFixtures.length) throw new Error(`minted supply mismatch: ${totalSupply}`);
  const tokenUriGasMeasurements: Array<{
    agentBytes: number;
    gas: number;
    promptBytes: number;
    tokenNumber: number;
  }> = [];
  const tokenUriExamples: Array<{
    creationAttestation: "Inshell THOUGHT App" | "Unattested";
    metadata: Record<string, unknown>;
    tokenId: number;
    tokenUri: string;
  }> = [];
  for (const fixture of galleryFixtures) {
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
    const tokenUriGas = Number(await thoughtNft.tokenURI.estimateGas(tokenId));
    tokenUriGasMeasurements.push({
      agentBytes: Buffer.byteLength(fixture.agentLine, "utf8"),
      gas: tokenUriGas,
      promptBytes: Buffer.byteLength(fixture.promptLine, "utf8"),
      tokenNumber: fixture.tokenNumber,
    });
    const expectedAttestation = attestations.get(fixture.tokenNumber);
    const verification = verifyThoughtV2Provenance(
      toUtf8Bytes(storedProvenance),
      {
        agentLine: fixture.agentLine,
        ...(expectedAttestation ? { attestationClaim: expectedAttestation.facts } : {}),
        chainId: network.chainId.toString(),
        agent: fixture.agent,
        model: fixture.model,
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
    const agentTrait = attributes?.find(({ trait_type }) => trait_type === "Agent");
    const modelTrait = attributes?.find(({ trait_type }) => trait_type === "Model");
    if (
      promptLine !== fixture.promptLine
      || agentLine !== fixture.agentLine
      || !verification.conforming
      || creationAttestationDigest !== expectedDigest
      || metadataAttestation?.digest !== expectedDigest
      || metadataAttestation?.status !== expectedStatus
      || metadata.external_url !== `https://inshell.art/thought/${fixture.tokenNumber}`
      || thought?.provenanceJson !== storedProvenance
      || thought?.provenanceHash !== storedHash
      || thought?.workHash !== workHash
      || attributes?.length !== expectedAttributeOrder.length
      || attributeTypes?.some((traitType, index) => traitType !== expectedAttributeOrder[index])
      || agentTrait?.value !== fixture.agent
      || modelTrait?.value !== fixture.model
    ) {
      throw new Error(`on-chain tokenURI/provenance parity failed for THOUGHT #${fixture.tokenNumber}`);
    }
    if (
      fixture.tokenNumber === 1
      || fixture.tokenNumber === 42
      || !tokenUriExamples.some(({ creationAttestation }) => creationAttestation === expectedStatus)
    ) {
      tokenUriExamples.push({
        creationAttestation: expectedStatus,
        metadata,
        tokenId: fixture.tokenNumber,
        tokenUri,
      });
    }
  }
  if (
    !tokenUriExamples.some(({ creationAttestation }) => creationAttestation === "Inshell THOUGHT App")
    || !tokenUriExamples.some(({ creationAttestation }) => creationAttestation === "Unattested")
  ) {
    throw new Error("neutral Agent/Model tokenURI fixtures require both attested and Unattested examples");
  }
  const hardGasFailures = tokenUriGasMeasurements.filter(({ gas }) => gas >= 10_000_000);
  const preferredGasMisses = tokenUriGasMeasurements.filter(({ gas }) => gas >= 8_000_000);
  if (set5Experiment && hardGasFailures.length > 0) {
    throw new Error(
      `${set5Experiment.familyName} hard tokenURI gas gate failed: ${hardGasFailures.map(({ gas, tokenNumber }) => `#${tokenNumber}=${gas}`).join(", ")}`,
    );
  }
  if (set5Experiment && preferredGasMisses.length > 0) {
    throw new Error(
      `${set5Experiment.familyName} preferred tokenURI gas gate failed: ${preferredGasMisses.map(({ gas, tokenNumber }) => `#${tokenNumber}=${gas}`).join(", ")}`,
    );
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
      status: set5Experiment
        ? "registered-disposable-anvil-noncanonical-experiment"
        : "registered-disposable-anvil",
    },
    renderer: {
      canonicalRendererId: THOUGHT_V2_RENDERER_ID,
      glyphDefinitionsHash: set5Experiment ? set5PackedHash : mono76PackedHash,
      ...(set5Experiment
        ? {
          glyphPackedBytes: set5Packed.length,
          glyphPackedHash: set5PackedHash,
        }
        : {
          glyphPackedBytes: mono76Packed.length,
          glyphPackedHash: mono76PackedHash,
        }),
      glyphDefinitionsIndexPointer,
      glyphDefinitionsPointer1,
      glyphDefinitionsPointer2,
      glyphLibraryMemberId: set5Experiment
        ? `inshell.thought.glyph-library.set-05.${rendererExperiment}`
        : "inshell.mono-76",
      implementationId: rendererImplementationId,
      releaseReady: !set5Experiment,
      ...(svgRendererAddress ? { svgRendererAddress } : {}),
    },
    rpcUrl,
    schema: set5Experiment
      ? "inshell.thought.v2.anvil-set5-benchmark-runtime.v1"
      : "inshell.thought.v2.anvil-gallery-runtime.v1",
    selectedSpec: {
      hash: thoughtSpecHash,
      id: thoughtSpecId,
      name: specName,
      ref: specRef,
    },
    status: set5Experiment ? "ready-noncanonical-benchmark" : "ready",
    telemetry: {
      averageMintGas: (totalMintGas / BigInt(totalSupply)).toString(),
      tokenUriGas: {
        acceptance: {
          hardBelow: 10_000_000,
          hardPass: hardGasFailures.length === 0,
          preferredBelow: 8_000_000,
          preferredPass: preferredGasMisses.length === 0,
        },
        average: Math.round(
          tokenUriGasMeasurements.reduce((sum, { gas }) => sum + gas, 0)
            / tokenUriGasMeasurements.length,
        ),
        maximum: Math.max(...tokenUriGasMeasurements.map(({ gas }) => gas)),
        measurements: tokenUriGasMeasurements,
        minimum: Math.min(...tokenUriGasMeasurements.map(({ gas }) => gas)),
        preferredMissTokenNumbers: preferredGasMisses.map(({ tokenNumber }) => tokenNumber),
      },
      maxProvenanceBytes: Math.max(...provenanceBytes),
      minProvenanceBytes: Math.min(...provenanceBytes),
      totalMintGas: totalMintGas.toString(),
    },
  };
  await fs.mkdir(path.dirname(runtimeConfigFile), { recursive: true });
  await fs.mkdir(path.dirname(tokenUriFixtureFile), { recursive: true });
  await fs.writeFile(tokenUriFixtureFile, `${JSON.stringify({
    chainId: Number(network.chainId),
    contracts: {
      creationAttestationVerifier: verifierAddress,
      thoughtNft: thoughtAddress,
      thoughtRenderer: rendererAddress,
    },
    examples: tokenUriExamples,
    generatedAt: new Date().toISOString(),
    notes: [
      "Exact tokenURI outputs captured from the disposable Anvil deployment.",
      "These fixtures are immutable evidence inside an integration-preview artifact, not production deployment data.",
    ],
    schema: "inshell.thought.v2.neutral-agent-model-token-uri-examples.anvil.v1",
  }, null, 2)}\n`, "utf8");
  await fs.writeFile(runtimeConfigFile, `${JSON.stringify(runtimeConfig, null, 2)}\n`, "utf8");
  if (!isAddress(thoughtAddress)) throw new Error("invalid THOUGHT deployment address");
  console.log(`Ready: ${totalSupply} on-chain THOUGHT tokens at ${thoughtAddress}`);
  console.log(
    `tokenURI gas: min ${runtimeConfig.telemetry.tokenUriGas.minimum}, average ${runtimeConfig.telemetry.tokenUriGas.average}, max ${runtimeConfig.telemetry.tokenUriGas.maximum}; hard ${runtimeConfig.telemetry.tokenUriGas.acceptance.hardPass ? "PASS" : "FAIL"}, preferred ${runtimeConfig.telemetry.tokenUriGas.acceptance.preferredPass ? "PASS" : "MISS"}`,
  );
  console.log(`Runtime config: ${runtimeConfigFile}`);
  console.log(`tokenURI fixtures: ${tokenUriFixtureFile}`);
};

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
