#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";
import { Contract, NonceManager, Wallet, ethers } from "ethers";

import {
  loadThoughtV2GalleryFixtures,
  rootDir,
} from "./lib/load-thought-v2-gallery-fixtures.mjs";
import { loadThoughtV2ProvenanceRuntime } from "./lib/load-thought-v2-provenance-runtime.mjs";

const rpcUrl = process.env.RPC_URL ?? "http://127.0.0.1:8545";
const privateKey =
  process.env.PRIVATE_KEY ??
  "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
const addressesFile = path.resolve(
  rootDir,
  process.env.ADDRESSES_FILE ?? path.join("public", "thought-v2-gallery.anvil.json"),
);
const consumeAuthorizationTypehash = ethers.id(
  "ConsumeAuthorization(address pathNft,uint256 chainId,uint256 pathId,bytes32 movement,address claimer,address executor,uint256 nonce,uint256 deadline)",
);
const thoughtMovement = ethers.encodeBytes32String("THOUGHT");
const zeroBytes32 = `0x${"00".repeat(32)}`;

const readJson = async (file) => JSON.parse(await fs.readFile(file, "utf8"));

const assertContract = async (provider, address, label) => {
  if (!ethers.isAddress(address) || (await provider.getCode(address)) === "0x") {
    throw new Error(`${label} is not deployed at ${address}`);
  }
};

const pathSignature = async ({
  wallet,
  pathAddress,
  chainId,
  pathId,
  thoughtAddress,
  nonce,
  deadline,
}) => {
  const structHash = ethers.keccak256(
    ethers.AbiCoder.defaultAbiCoder().encode(
      ["bytes32", "address", "uint256", "uint256", "bytes32", "address", "address", "uint256", "uint256"],
      [
        consumeAuthorizationTypehash,
        pathAddress,
        chainId,
        pathId,
        thoughtMovement,
        wallet.address,
        thoughtAddress,
        nonce,
        deadline,
      ],
    ),
  );
  return wallet.signMessage(ethers.getBytes(structHash));
};

const protocolBinding = (manifestHash, releaseId, selectedPair) => ({
  manifestKeccak256: manifestHash,
  protocolReleaseId: releaseId,
  thoughtSpecHash: selectedPair.thoughtSpecHash,
  thoughtSpecId: selectedPair.thoughtSpecId,
});

const fixtureProcess = (fixture, index, protocol, protocolBinding) => {
  const kind = index % 2 === 0 ? "manual" : "agent-run";
  const source = kind === "manual" ? "manual" : "runtime_configured";
  return {
    agentDeclaration: {
      label: fixture.declaredAgent,
      source,
      status: "declared-unverified",
    },
    kind,
    modelDeclaration: {
      label: fixture.declaredModel,
      source,
      status: "declared-unverified",
    },
    ...(kind === "agent-run"
      ? {
        transport: {
          adapter: "anvil-gallery",
          provider: "deterministic-mock",
          resultEnvelope: {
            agent: {
              label: fixture.declaredAgent,
              model: { label: fixture.declaredModel, source },
            },
            agentLine: fixture.agentLine,
            release: {
              manifestKeccak256: protocolBinding.manifestKeccak256,
              protocolReleaseId: protocolBinding.protocolReleaseId,
            },
            schema: protocol.THOUGHT_AGENT_RESULT_ID,
          },
          route: "gallery/mock-agent-run",
          runReference: `public-safe-run-${String(index + 1).padStart(4, "0")}`,
        },
      }
      : {}),
  };
};

const main = async () => {
  const config = await readJson(addressesFile);
  if (typeof config.protocolRelease?.manifestFile !== "string") {
    throw new Error(`missing protocol manifest file in ${addressesFile}`);
  }
  if (typeof config.recommendedThoughtSpecName !== "string") {
    throw new Error(`missing recommended THOUGHT spec name in ${addressesFile}`);
  }
  const manifestFile = path.resolve(rootDir, config.protocolRelease.manifestFile);
  const selectedSpecFile = path.join(rootDir, "specs", config.recommendedThoughtSpecName);
  const [fixtureSet, thoughtArtifact, attestationVectors, provenanceRuntime, manifestBytes, selectedSpecBytes] = await Promise.all([
    loadThoughtV2GalleryFixtures(),
    readJson(path.join(rootDir, "evm", "out", "ThoughtNFT.sol", "ThoughtNFT.json")),
    readJson(path.join(
      rootDir,
      "protocol",
      "releases",
      "v2",
      "attestation",
      "fixtures",
      "creation-attestation-vectors.json",
    )),
    loadThoughtV2ProvenanceRuntime(),
    fs.readFile(manifestFile),
    fs.readFile(selectedSpecFile),
  ]);
  const manifest = JSON.parse(manifestBytes.toString("utf8"));
  const { fixtures, sourceFixtureCount, omittedDuplicates } = fixtureSet;
  const pathAddress = config.pathNft?.address ?? config.path?.address;
  const thoughtAddress = config.thoughtNft?.address ?? config.thought?.address;
  const verifierAddress = config.creationAttestationVerifier?.address;
  if (!pathAddress || !thoughtAddress || !verifierAddress) {
    throw new Error(`missing PATH, THOUGHT, or attestation-verifier address in ${addressesFile}`);
  }
  const manifestHash = ethers.keccak256(manifestBytes);
  if (manifestHash !== config.protocolRelease.manifestHash) {
    throw new Error(`protocol manifest hash mismatch: config ${config.protocolRelease.manifestHash}, file ${manifestHash}`);
  }
  const derivedReleaseId = provenanceRuntime.protocol.deriveProtocolReleaseId(manifestHash);
  if (derivedReleaseId !== config.protocolRelease.id) {
    throw new Error(`protocol release ID mismatch: config ${config.protocolRelease.id}, file ${derivedReleaseId}`);
  }
  const selectedPair = {
    thoughtSpecId: ethers.keccak256(ethers.toUtf8Bytes(config.recommendedThoughtSpecName)),
    thoughtSpecHash: ethers.keccak256(selectedSpecBytes),
  };
  if (
    selectedPair.thoughtSpecId !== config.recommendedThoughtSpecId ||
    selectedPair.thoughtSpecHash !== config.recommendedThoughtSpecHash
  ) {
    throw new Error("recommended THOUGHT spec pair does not match the exact local spec bytes");
  }
  const configuredRegistration = config.thoughtSpecs?.find(
    (item) => item.specId === selectedPair.thoughtSpecId && item.specHash === selectedPair.thoughtSpecHash,
  );
  if (!configuredRegistration) throw new Error("selected THOUGHT spec pair is missing from deployment config");
  const creativeSpecArtifact = manifest.artifacts?.find((artifact) => artifact.role === "creative-spec");
  if (creativeSpecArtifact?.keccak256 !== selectedPair.thoughtSpecHash) {
    throw new Error("selected THOUGHT spec bytes do not match the release manifest creative-spec artifact");
  }
  const provenanceProtocol = protocolBinding(manifestHash, derivedReleaseId, selectedPair);

  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const network = await provider.getNetwork();
  if (Number(network.chainId) !== config.chainId) {
    throw new Error(`chain mismatch: config ${config.chainId}, RPC ${network.chainId}`);
  }
  await Promise.all([
    assertContract(provider, pathAddress, "PATH"),
    assertContract(provider, thoughtAddress, "THOUGHT"),
    assertContract(provider, verifierAddress, "CreationAttestationVerifier"),
    assertContract(provider, config.thoughtSpecRegistry?.address, "ThoughtSpecRegistry"),
  ]);
  const specRegistry = new Contract(
    config.thoughtSpecRegistry.address,
    ["function isRegisteredThoughtSpec(bytes32 specId, bytes32 specHash) view returns (bool)"],
    provider,
  );
  if (!await specRegistry.isRegisteredThoughtSpec(selectedPair.thoughtSpecId, selectedPair.thoughtSpecHash)) {
    throw new Error("selected THOUGHT spec pair is not registered on the active Anvil registry");
  }

  const wallet = new Wallet(privateKey, provider);
  const signer = new NonceManager(wallet);
  const pathNft = new Contract(
    pathAddress,
    ["function getConsumeNonce(address claimer) view returns (uint256)"],
    provider,
  );
  const thoughtNft = new Contract(thoughtAddress, thoughtArtifact.abi, signer);
  if (config.creationAttestationVerifier.authority.toLowerCase() !== wallet.address.toLowerCase()) {
    throw new Error("gallery signer is not the configured creation-attestation authority");
  }
  const canonicalProvenanceFor = (fixture, index, { claim = false, tokenStatePair } = {}) =>
    provenanceRuntime.provenance.buildVerifiedCanonicalProvenance({
      protocol: provenanceProtocol,
      selectedSpec: {
        specName: config.recommendedThoughtSpecName,
        exactSpecBytes: selectedSpecBytes,
        registeredPair: selectedPair,
        mintPair: selectedPair,
        ...(claim ? { claimPair: selectedPair } : {}),
        ...(tokenStatePair ? { tokenStatePair } : {}),
      },
      promptLine: fixture.promptLine,
      agentLine: fixture.agentLine,
      process: fixtureProcess(
        fixture,
        index,
        provenanceRuntime.protocol,
        provenanceProtocol,
      ),
      mintContext: {
        chainId: network.chainId.toString(),
        intendedMinter: wallet.address.toLowerCase(),
        thoughtNft: thoughtAddress.toLowerCase(),
      },
    }, {
      declaredAgent: fixture.declaredAgent,
      declaredModel: fixture.declaredModel,
    });
  const assertTokenUriParity = async (tokenId, fixture, expectedProvenance, expectedAttestationDigest) => {
    const tokenUri = await thoughtNft.tokenURI(tokenId);
    const prefix = "data:application/json;base64,";
    if (!tokenUri.startsWith(prefix)) {
      throw new Error(`THOUGHT #${tokenId} tokenURI is not embedded base64 JSON`);
    }
    const metadata = JSON.parse(Buffer.from(tokenUri.slice(prefix.length), "base64").toString("utf8"));
    const thought = metadata.thought;
    if (
      thought?.promptLine !== fixture.promptLine ||
      thought?.agentLine !== fixture.agentLine ||
      thought?.declaredAgent !== fixture.declaredAgent ||
      thought?.declaredModel !== fixture.declaredModel ||
      thought?.pathId !== String(tokenId) ||
      thought?.workHash !== expectedProvenance.provenance.work.workHash ||
      thought?.provenance !== expectedProvenance.canonicalJson ||
      thought?.provenanceHash !== expectedProvenance.provenanceHash ||
      thought?.thoughtSpecId !== selectedPair.thoughtSpecId ||
      thought?.thoughtSpecHash !== selectedPair.thoughtSpecHash ||
      metadata.properties?.provenanceKeccak256 !== expectedProvenance.provenanceHash ||
      metadata.properties?.creationAttestationDigest !== expectedAttestationDigest
    ) {
      throw new Error(`THOUGHT #${tokenId} tokenURI canonical provenance parity mismatch`);
    }
  };
  const startingSupply = await thoughtNft.totalSupply();
  if (startingSupply > BigInt(fixtures.length)) {
    throw new Error(
      `THOUGHT already has ${startingSupply} tokens, more than the ${fixtures.length} gallery fixtures`,
    );
  }

  for (let tokenId = 1n; tokenId <= startingSupply; tokenId += 1n) {
    const index = Number(tokenId - 1n);
    const fixture = fixtures[index];
    const shouldAttest = index % 2 === 1;
    const [
      promptLine,
      agentLine,
      declaredAgent,
      declaredModel,
      pathId,
      attestationDigest,
      storedProvenance,
      storedProvenanceHash,
      storedWorkHash,
      storedSpec,
    ] = await Promise.all([
      thoughtNft.promptLineOf(tokenId),
      thoughtNft.agentLineOf(tokenId),
      thoughtNft.declaredAgentOf(tokenId),
      thoughtNft.declaredModelOf(tokenId),
      thoughtNft.pathIdOf(tokenId),
      thoughtNft.creationAttestationDigestOf(tokenId),
      thoughtNft.provenanceOf(tokenId),
      thoughtNft.provenanceHashOf(tokenId),
      thoughtNft.workHashOf(tokenId),
      thoughtNft.thoughtSpecOf(tokenId),
    ]);
    const tokenStatePair = { thoughtSpecId: storedSpec[0], thoughtSpecHash: storedSpec[1] };
    const expectedProvenance = canonicalProvenanceFor(fixture, index, { claim: shouldAttest, tokenStatePair });
    if (
      promptLine !== fixture.promptLine ||
      agentLine !== fixture.agentLine ||
      declaredAgent !== fixture.declaredAgent ||
      declaredModel !== fixture.declaredModel ||
      pathId !== tokenId ||
      storedProvenance !== expectedProvenance.canonicalJson ||
      storedProvenanceHash !== expectedProvenance.provenanceHash ||
      storedWorkHash !== expectedProvenance.provenance.work.workHash ||
      (shouldAttest ? attestationDigest === zeroBytes32 : attestationDigest !== zeroBytes32)
    ) {
      throw new Error(`existing THOUGHT #${tokenId} does not match its gallery fixture`);
    }
    await assertTokenUriParity(tokenId, fixture, expectedProvenance, attestationDigest);
  }

  for (let index = Number(startingSupply); index < fixtures.length; index += 1) {
    const fixture = fixtures[index];
    const tokenId = BigInt(index + 1);
    const nonce = await pathNft.getConsumeNonce(wallet.address);
    const block = await provider.getBlock("latest");
    if (!block) throw new Error("latest Anvil block is unavailable");
    const deadline = BigInt(block.timestamp + 3_600);
    const signature = await pathSignature({
      wallet,
      pathAddress,
      chainId: network.chainId,
      pathId: tokenId,
      thoughtAddress,
      nonce,
      deadline,
    });
    const shouldAttest = index % 2 === 1;
    const provenance = canonicalProvenanceFor(fixture, index, { claim: shouldAttest });
    let creationAttestation = {
      runIdHash: zeroBytes32,
      deadline: 0n,
      authorityEpoch: 0,
      signature: "0x",
    };
    let expectedAttestationDigest = zeroBytes32;
    if (shouldAttest) {
      const packedField = await thoughtNft.binaryField(fixture.promptLine, fixture.agentLine);
      const workHash = await thoughtNft.workHash(
        ethers.keccak256(ethers.toUtf8Bytes(fixture.promptLine)),
        ethers.keccak256(ethers.toUtf8Bytes(fixture.agentLine)),
        ethers.keccak256(packedField),
      );
      if (workHash !== provenance.provenance.work.workHash) {
        throw new Error(`canonical provenance work hash mismatch for THOUGHT #${tokenId}`);
      }
      if (provenance.provenance.process.kind !== "agent-run") {
        throw new Error(`mock-attested THOUGHT #${tokenId} lacks canonical Agent-run provenance`);
      }
      const runIdHash = provenance.provenance.process.transport.runIdHash;
      const authorityEpoch = Number(config.creationAttestationVerifier.authorityEpoch);
      const claim = {
        profileId: config.creationAttestationVerifier.profileId,
        thoughtNft: thoughtAddress,
        protocolReleaseId: config.protocolRelease.id,
        thoughtSpecId: selectedPair.thoughtSpecId,
        thoughtSpecHash: selectedPair.thoughtSpecHash,
        workHash,
        provenanceHash: provenance.provenanceHash,
        declaredAgentHash: ethers.keccak256(ethers.toUtf8Bytes(fixture.declaredAgent)),
        declaredModelHash: ethers.keccak256(ethers.toUtf8Bytes(fixture.declaredModel)),
        runIdHash,
        intendedMinter: wallet.address,
        deadline,
        authorityEpoch,
      };
      const preSignVerification = provenanceRuntime.provenance.verifyProvenance(
        provenance.exactBytes,
        provenanceProtocol,
        {
          declaredAgent: fixture.declaredAgent,
          declaredModel: fixture.declaredModel,
          attestationClaim: {
            chainId: network.chainId.toString(),
            declaredAgentHash: claim.declaredAgentHash,
            declaredModelHash: claim.declaredModelHash,
            intendedMinter: claim.intendedMinter.toLowerCase(),
            protocolReleaseId: claim.protocolReleaseId,
            provenanceHash: claim.provenanceHash,
            runIdHash: claim.runIdHash,
            thoughtNft: claim.thoughtNft.toLowerCase(),
            thoughtSpecHash: claim.thoughtSpecHash,
            thoughtSpecId: claim.thoughtSpecId,
            workHash: claim.workHash,
          },
        },
        {
          specName: config.recommendedThoughtSpecName,
          exactSpecBytes: selectedSpecBytes,
          registeredPair: selectedPair,
          mintPair: selectedPair,
          claimPair: selectedPair,
        },
      );
      if (!preSignVerification.conforming) {
        throw new Error(
          `mock signer rejected THOUGHT #${tokenId}: ${preSignVerification.errors.join("; ")}`,
        );
      }
      const domain = {
        name: attestationVectors.domainName,
        version: attestationVectors.domainVersion,
        chainId: network.chainId,
        verifyingContract: verifierAddress,
      };
      const attestationSignature = await wallet.signTypedData(
        domain,
        attestationVectors.types,
        claim,
      );
      expectedAttestationDigest = ethers.TypedDataEncoder.hash(
        domain,
        attestationVectors.types,
        claim,
      );
      creationAttestation = { runIdHash, deadline, authorityEpoch, signature: attestationSignature };
    }
    const input = {
      promptLine: fixture.promptLine,
      agentLine: fixture.agentLine,
      declaredAgent: fixture.declaredAgent,
      declaredModel: fixture.declaredModel,
      pathId: tokenId,
      thoughtSpecId: selectedPair.thoughtSpecId,
      thoughtSpecHash: selectedPair.thoughtSpecHash,
      provenanceJson: provenance.canonicalJson,
      deadline,
      pathSignature: signature,
      creationAttestation,
    };
    const estimatedGas = await thoughtNft.mint.estimateGas(input);
    const transaction = await thoughtNft.mint(input, {
      gasLimit: (estimatedGas * 125n) / 100n,
    });
    const receipt = await transaction.wait();
    if (receipt?.status !== 1) throw new Error(`mint failed for THOUGHT #${tokenId}`);
    if ((await thoughtNft.creationAttestationDigestOf(tokenId)) !== expectedAttestationDigest) {
      throw new Error(`creation-attestation digest mismatch for THOUGHT #${tokenId}`);
    }
    const [storedProvenance, storedProvenanceHash, storedWorkHash, storedSpec] = await Promise.all([
      thoughtNft.provenanceOf(tokenId),
      thoughtNft.provenanceHashOf(tokenId),
      thoughtNft.workHashOf(tokenId),
      thoughtNft.thoughtSpecOf(tokenId),
    ]);
    const tokenStatePair = { thoughtSpecId: storedSpec[0], thoughtSpecHash: storedSpec[1] };
    const postMintProvenance = canonicalProvenanceFor(fixture, index, { claim: shouldAttest, tokenStatePair });
    if (
      storedProvenance !== provenance.canonicalJson ||
      storedProvenanceHash !== provenance.provenanceHash ||
      storedWorkHash !== provenance.provenance.work.workHash ||
      postMintProvenance.provenanceHash !== provenance.provenanceHash
    ) {
      throw new Error(`stored canonical provenance parity mismatch for THOUGHT #${tokenId}`);
    }
    await assertTokenUriParity(tokenId, fixture, provenance, expectedAttestationDigest);
    if (tokenId === 1n || tokenId % 10n === 0n || tokenId === BigInt(fixtures.length)) {
      console.error(`Minted THOUGHT ${tokenId}/${fixtures.length}`);
    }
  }

  const finalSupply = await thoughtNft.totalSupply();
  if (finalSupply !== BigInt(fixtures.length)) {
    throw new Error(`gallery supply mismatch: expected ${fixtures.length}, received ${finalSupply}`);
  }
  config.gallery = {
    schema: "inshell.thought.anvil-gallery.v1",
    fixtureSource: "src/thought-v2-fixtures.ts",
    sourceFixtureCount,
    fixtureCount: fixtures.length,
    mintedSupply: Number(finalSupply),
    mintedBy: wallet.address,
    omittedDuplicates,
    attestedSupply: Math.floor(fixtures.length / 2),
    unattestedSupply: Math.ceil(fixtures.length / 2),
  };
  await fs.writeFile(addressesFile, `${JSON.stringify(config, null, 2)}\n`, "utf8");
  console.log(
    JSON.stringify(
      {
        rpcUrl,
        chainId: Number(network.chainId),
        thoughtNft: thoughtAddress,
        sourceFixtureCount,
        fixtureCount: fixtures.length,
        omittedDuplicates,
        startingSupply: Number(startingSupply),
        finalSupply: Number(finalSupply),
      },
      null,
      2,
    ),
  );
};

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
