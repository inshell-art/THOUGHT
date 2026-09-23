#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ContractFactory, NonceManager, Wallet, ethers } from "ethers";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const rpcUrl = process.env.RPC_URL ?? "http://127.0.0.1:8545";
const privateKey =
  process.env.PRIVATE_KEY ??
  "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
const pathEvmDir = process.env.PATH_EVM_DIR ?? "/Users/bigu/Projects/path/evm";
const externalPathNftAddress = process.env.PATH_NFT_ADDRESS?.trim() ?? "";
const pathPulseAdapterAddress = process.env.PATH_PULSE_ADAPTER_ADDRESS?.trim() ?? "";
const pulseAuctionAddress = process.env.PULSE_AUCTION_ADDRESS?.trim() ?? "";
const addressesFile = path.resolve(
  rootDir,
  process.env.ADDRESSES_FILE ?? path.join("evm", "addresses.anvil.json"),
);
const thoughtSpecName = process.env.THOUGHT_SPEC_NAME ?? "THOUGHT.v2.md";
const thoughtSpecFile = path.resolve(rootDir, process.env.THOUGHT_SPEC_FILE ?? path.join("specs", thoughtSpecName));
const thoughtSpecRef = process.env.THOUGHT_SPEC_REF ?? thoughtSpecName;
const maxThoughtSpecBytes = 20_000;
const devPathCount = BigInt(process.env.DEV_PATH_COUNT ?? "10");
const pathReservedCap = BigInt(process.env.PATH_RESERVED_CAP ?? "0");
const pathSparkClaimDuration = BigInt(process.env.PATH_SPARK_CLAIM_DURATION ?? "604800");
const explorerUrl = (process.env.THOUGHT_EXPLORER_URL ?? process.env.THOUGHT_INDEXER_URL ?? "").trim();
const protocolManifestFile = path.resolve(
  rootDir,
  process.env.THOUGHT_PROTOCOL_MANIFEST_FILE ??
    path.join("protocol", "releases", "v2", "release.manifest.draft.json"),
);

const readArtifact = async (artifactPath) => {
  const artifact = JSON.parse(await fs.readFile(artifactPath, "utf8"));
  const bytecode =
    typeof artifact.bytecode === "string" ? artifact.bytecode : artifact.bytecode?.object;
  if (!artifact.abi || !bytecode) {
    throw new Error(`invalid artifact: ${artifactPath}`);
  }
  return { abi: artifact.abi, bytecode };
};

const deploy = async (signer, artifactPath, args = []) => {
  const artifact = await readArtifact(artifactPath);
  const factory = new ContractFactory(artifact.abi, artifact.bytecode, signer);
  const contract = await factory.deploy(...args);
  await contract.waitForDeployment();
  return contract;
};

const readThoughtSpecBytes = async () => {
  const filename = path.basename(thoughtSpecFile);
  const match = /^THOUGHT\.v([1-9][0-9]*)\.md$/.exec(thoughtSpecName);
  if (!match) {
    throw new Error(`invalid THOUGHT spec name: ${thoughtSpecName}`);
  }
  if (filename !== thoughtSpecName) {
    throw new Error(`THOUGHT spec filename/name mismatch: ${filename} != ${thoughtSpecName}`);
  }

  const bytes = await fs.readFile(thoughtSpecFile);
  if (bytes.length === 0) {
    throw new Error("THOUGHT spec file is empty");
  }
  if (bytes.length > maxThoughtSpecBytes) {
    throw new Error(`THOUGHT spec file exceeds ${maxThoughtSpecBytes} bytes`);
  }
  if (bytes.length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
    throw new Error("THOUGHT spec file has UTF-8 BOM");
  }
  if (bytes.includes(0x0d)) {
    throw new Error("THOUGHT spec file contains CR/CRLF line endings");
  }

  const text = bytes.toString("utf8");
  if (!text.includes(`Version: v${match[1]}`)) {
    throw new Error(`THOUGHT spec file must contain Version: v${match[1]}`);
  }
  return bytes;
};

const readProtocolRelease = async () => {
  const bytes = await fs.readFile(protocolManifestFile);
  if (bytes.length === 0) throw new Error("protocol manifest is empty");
  if (bytes.length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
    throw new Error("protocol manifest has UTF-8 BOM");
  }
  if (bytes.includes(0x0d)) throw new Error("protocol manifest contains CR/CRLF line endings");
  if (bytes.at(-1) !== 0x0a || bytes.at(-2) === 0x0a) {
    throw new Error("protocol manifest must have exactly one final LF");
  }

  const manifest = JSON.parse(bytes.toString("utf8"));
  const artifactHash = (role) => {
    const matches = manifest.artifacts?.filter((artifact) => artifact.role === role) ?? [];
    if (matches.length !== 1 || !ethers.isHexString(matches[0].keccak256, 32)) {
      throw new Error(`protocol manifest must contain exactly one valid ${role} hash`);
    }
    return matches[0].keccak256;
  };
  const manifestHash = ethers.keccak256(bytes);
  const protocolReleaseId = ethers.keccak256(
    ethers.AbiCoder.defaultAbiCoder().encode(
      ["bytes32", "bytes32"],
      [ethers.id("INSHELL_THOUGHT_PROTOCOL_RELEASE"), manifestHash],
    ),
  );
  const manifestURI =
    process.env.THOUGHT_PROTOCOL_MANIFEST_URI ?? `dev://thought/protocol/v2/${manifestHash}`;
  const uriBytes = Buffer.byteLength(manifestURI, "utf8");
  if (uriBytes < 1 || uriBytes > 200) throw new Error(`invalid protocol manifest URI length: ${uriBytes}`);

  const rendererProfileHash = artifactHash("renderer-profile");
  const workProfileHash = artifactHash("work-profile");
  const creationAttestationProfileHash = artifactHash("creation-attestation-profile");
  const generatedConstants = await fs.readFile(
    path.join(rootDir, "evm", "src", "ThoughtReleaseConstants.sol"),
    "utf8",
  );
  const compactGeneratedConstants = generatedConstants.replace(/\s+/g, "");
  if (!compactGeneratedConstants.includes(`RENDERER_PROFILE_KECCAK256=${rendererProfileHash};`)) {
    throw new Error("compiled renderer profile constant does not match protocol manifest");
  }
  if (!compactGeneratedConstants.includes(`WORK_PROFILE_KECCAK256=${workProfileHash};`)) {
    throw new Error("compiled work profile constant does not match protocol manifest");
  }
  if (
    !compactGeneratedConstants.includes(
      `CREATION_ATTESTATION_PROFILE_KECCAK256=${creationAttestationProfileHash};`,
    )
  ) {
    throw new Error("compiled creation-attestation profile constant does not match protocol manifest");
  }

  return {
    manifest,
    manifestHash,
    manifestURI,
    protocolReleaseId,
    rendererProfileHash,
    workProfileHash,
    creationAttestationProfileHash,
  };
};

const main = async () => {
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const wallet = new Wallet(privateKey, provider);
  const deployer = new NonceManager(wallet);
  const deployerAddress = await deployer.getAddress();
  const network = await provider.getNetwork();
  const thoughtSpecBytes = await readThoughtSpecBytes();
  const protocolRelease = await readProtocolRelease();
  const thoughtSpecId = ethers.id(thoughtSpecName);
  const thoughtSpecHash = ethers.keccak256(thoughtSpecBytes);

  const pathNftArtifact = await readArtifact(
    path.join(pathEvmDir, "artifacts", "src", "PathNFT.sol", "PathNFT.json"),
  );
  const pathNft = externalPathNftAddress
    ? new ethers.Contract(externalPathNftAddress, pathNftArtifact.abi, deployer)
    : await deploy(
        deployer,
        path.join(pathEvmDir, "artifacts", "src", "PathNFT.sol", "PathNFT.json"),
        [
          deployerAddress,
          "PATH",
          "PATH",
          "",
          pathReservedCap,
          pathSparkClaimDuration,
        ],
      );
  const pathNftAddress = await pathNft.getAddress();
  const minterRole = ethers.id("MINTER_ROLE");
  if (externalPathNftAddress) {
    if ((await provider.getCode(pathNftAddress)) === "0x") {
      throw new Error(`external PATH_NFT_ADDRESS has no code: ${pathNftAddress}`);
    }
    if (!pathPulseAdapterAddress || !pulseAuctionAddress) {
      throw new Error("external PATH_NFT_ADDRESS requires PATH_PULSE_ADAPTER_ADDRESS and PULSE_AUCTION_ADDRESS");
    }
    const adapterArtifact = await readArtifact(
      path.join(pathEvmDir, "artifacts", "src", "PathPulseAdapter.sol", "PathPulseAdapter.json"),
    );
    const auctionArtifact = await readArtifact(
      path.join(pathEvmDir, "artifacts", "src", "PulseAuction.sol", "PulseAuction.json"),
    );
    const adapter = new ethers.Contract(pathPulseAdapterAddress, adapterArtifact.abi, provider);
    const auction = new ethers.Contract(pulseAuctionAddress, auctionArtifact.abi, provider);
    const [adapterPathNft, adapterAuction, wiringFrozen, auctionAdapter, publicMinter, publicMinterFrozen] =
      await Promise.all([
        adapter.pathNft(),
        adapter.auction(),
        adapter.wiringFrozen(),
        auction.mintAdapter(),
        pathNft.publicMinter(),
        pathNft.publicMinterFrozen(),
      ]);
    if (
      adapterPathNft.toLowerCase() !== pathNftAddress.toLowerCase() ||
      adapterAuction.toLowerCase() !== pulseAuctionAddress.toLowerCase() ||
      auctionAdapter.toLowerCase() !== pathPulseAdapterAddress.toLowerCase() ||
      publicMinter.toLowerCase() !== pathPulseAdapterAddress.toLowerCase() ||
      !wiringFrozen ||
      !publicMinterFrozen
    ) {
      throw new Error("external PATH auction wiring does not match the THOUGHT deployment");
    }
  } else {
    await (await pathNft.grantRole(minterRole, deployerAddress)).wait();
    await (await pathNft.freezePublicMinter(deployerAddress)).wait();
    for (let tokenId = 1n; tokenId <= devPathCount; tokenId++) {
      await (await pathNft.safeMint(deployerAddress, tokenId, "0x")).wait();
    }
  }

  const thoughtSpecRegistry = await deploy(
    deployer,
    path.join(rootDir, "evm", "out", "ThoughtSpecRegistry.sol", "ThoughtSpecRegistry.json"),
    [deployerAddress],
  );
  const [registeredSpecId, registeredSpecHash, specPointer] =
    await thoughtSpecRegistry.registerThoughtSpec.staticCall(
      thoughtSpecName,
      thoughtSpecRef,
      thoughtSpecBytes,
    );
  if (registeredSpecId !== thoughtSpecId || registeredSpecHash !== thoughtSpecHash) {
    throw new Error("THOUGHT spec static registration hash/id mismatch");
  }
  await (
    await thoughtSpecRegistry.registerThoughtSpec(
      thoughtSpecName,
      thoughtSpecRef,
      thoughtSpecBytes,
    )
  ).wait();
  const [, metaName, metaHash, metaRef, metaPointer, metaByteLength] =
    await thoughtSpecRegistry.thoughtSpecMeta(thoughtSpecId);
  if (metaName !== thoughtSpecName || metaHash !== thoughtSpecHash || metaRef !== thoughtSpecRef) {
    throw new Error("THOUGHT spec registry metadata mismatch");
  }
  if (metaPointer !== specPointer || Number(metaByteLength) !== thoughtSpecBytes.length) {
    throw new Error("THOUGHT spec registry pointer/length mismatch");
  }
  const readbackSpecBytes = await thoughtSpecRegistry.thoughtSpecBytes(thoughtSpecId);
  if (ethers.keccak256(readbackSpecBytes) !== thoughtSpecHash) {
    throw new Error("THOUGHT spec readback hash mismatch");
  }
  const thoughtSpecRegistryAddress = await thoughtSpecRegistry.getAddress();
  const protocolRegistry = await deploy(
    deployer,
    path.join(rootDir, "evm", "out", "ThoughtSpecRegistryV2.sol", "ThoughtSpecRegistryV2.json"),
    [deployerAddress],
  );
  const protocolRegistryAddress = await protocolRegistry.getAddress();
  const staticProtocolReleaseId = await protocolRegistry.registerRelease.staticCall(
    protocolRelease.manifestHash,
    protocolRelease.manifestURI,
  );
  if (staticProtocolReleaseId !== protocolRelease.protocolReleaseId) {
    throw new Error("protocol registry release ID mismatch before registration");
  }
  await (
    await protocolRegistry.registerRelease(
      protocolRelease.manifestHash,
      protocolRelease.manifestURI,
    )
  ).wait();
  const registeredRelease = await protocolRegistry.getRelease(protocolRelease.protocolReleaseId);
  if (
    registeredRelease.manifestHash !== protocolRelease.manifestHash ||
    registeredRelease.manifestURI !== protocolRelease.manifestURI
  ) {
    throw new Error("protocol registry readback mismatch");
  }
  const thoughtRenderer = await deploy(
    deployer,
    path.join(rootDir, "evm", "out", "ThoughtRenderer.sol", "ThoughtRenderer.json"),
  );
  const thoughtRendererAddress = await thoughtRenderer.getAddress();
  const creationAttestationVerifier = await deploy(
    deployer,
    path.join(
      rootDir,
      "evm",
      "out",
      "CreationAttestationVerifier.sol",
      "CreationAttestationVerifier.json",
    ),
    [deployerAddress, deployerAddress],
  );
  const creationAttestationVerifierAddress = await creationAttestationVerifier.getAddress();
  const thoughtNft = await deploy(
    deployer,
    path.join(rootDir, "evm", "out", "ThoughtNFT.sol", "ThoughtNFT.json"),
    [
      pathNftAddress,
      thoughtSpecRegistryAddress,
      thoughtRendererAddress,
      protocolRegistryAddress,
      protocolRelease.protocolReleaseId,
      creationAttestationVerifierAddress,
    ],
  );
  const thoughtNftAddress = await thoughtNft.getAddress();
  if ((await thoughtNft.protocolManifestHash()) !== protocolRelease.manifestHash) {
    throw new Error("ThoughtNFT protocol manifest hash mismatch");
  }
  if ((await thoughtNft.protocolManifestURI()) !== protocolRelease.manifestURI) {
    throw new Error("ThoughtNFT protocol manifest URI mismatch");
  }
  if ((await thoughtNft.RENDERER_PROFILE_KECCAK256()) !== protocolRelease.rendererProfileHash) {
    throw new Error("ThoughtNFT renderer profile hash does not match manifest");
  }
  if ((await thoughtNft.WORK_PROFILE_KECCAK256()) !== protocolRelease.workProfileHash) {
    throw new Error("ThoughtNFT work profile hash does not match manifest");
  }
  if ((await thoughtNft.creationAttestationVerifier()) !== creationAttestationVerifierAddress) {
    throw new Error("ThoughtNFT creation-attestation verifier mismatch");
  }
  if ((await creationAttestationVerifier.profileId()) !== await thoughtNft.CREATION_ATTESTATION_PROFILE_ID()) {
    throw new Error("creation-attestation profile ID mismatch");
  }

  await (
    await pathNft.setMovementConfig(
      ethers.encodeBytes32String("THOUGHT"),
      thoughtNftAddress,
      1,
    )
  ).wait();
  await (
    await pathNft.freezeMovementConfig(ethers.encodeBytes32String("THOUGHT"))
  ).wait();

  const payload = {
    rpcUrl,
    chainId: Number(network.chainId),
    ...(explorerUrl ? { explorerUrl } : {}),
    path: { address: pathNftAddress },
    pathNft: { address: pathNftAddress },
    ...(pathPulseAdapterAddress ? { pathPulseAdapter: { address: pathPulseAdapterAddress } } : {}),
    ...(pulseAuctionAddress ? { pulseAuction: { address: pulseAuctionAddress } } : {}),
    ...(pulseAuctionAddress ? { paymentToken: { address: ethers.ZeroAddress } } : {}),
    pathMovement: { name: "THOUGHT", quota: 1, frozen: true },
    ...(!externalPathNftAddress
      ? {
          devPathToken: { id: 1, owner: deployerAddress },
          devPathTokens: {
            firstId: 1,
            lastId: Number(devPathCount),
            owner: deployerAddress,
          },
        }
      : {}),
    thoughtSpecRegistry: { address: thoughtSpecRegistryAddress, owner: deployerAddress },
    protocolRegistry: { address: protocolRegistryAddress, owner: deployerAddress },
    thoughtRenderer: {
      address: thoughtRendererAddress,
      id: await thoughtRenderer.RENDERER_ID(),
      idHash: await thoughtRenderer.RENDERER_ID_HASH(),
    },
    creationAttestationVerifier: {
      address: creationAttestationVerifierAddress,
      authority: await creationAttestationVerifier.authority(),
      authorityEpoch: Number(await creationAttestationVerifier.authorityEpoch()),
      owner: deployerAddress,
      profileId: await creationAttestationVerifier.profileId(),
    },
    thoughtSpecs: [
      {
        specName: thoughtSpecName,
        specId: thoughtSpecId,
        specHash: thoughtSpecHash,
        ref: thoughtSpecRef,
        pointer: specPointer,
        byteLength: thoughtSpecBytes.length,
      },
    ],
    recommendedThoughtSpecName: thoughtSpecName,
    recommendedThoughtSpecId: thoughtSpecId,
    recommendedThoughtSpecHash: thoughtSpecHash,
    protocolRelease: {
      id: protocolRelease.protocolReleaseId,
      manifestFile: path.relative(rootDir, protocolManifestFile),
      manifestHash: protocolRelease.manifestHash,
      manifestURI: protocolRelease.manifestURI,
      rendererProfileHash: protocolRelease.rendererProfileHash,
      workProfileHash: protocolRelease.workProfileHash,
      creationAttestationProfileHash: protocolRelease.creationAttestationProfileHash,
      status: protocolRelease.manifest.status ?? "draft-local",
    },
    thoughtSpec: {
      specName: thoughtSpecName,
      id: thoughtSpecId,
      hash: thoughtSpecHash,
      ref: thoughtSpecRef,
    },
    thought: { address: thoughtNftAddress },
    thoughtNft: { address: thoughtNftAddress },
  };

  await fs.mkdir(path.dirname(addressesFile), { recursive: true });
  await fs.writeFile(addressesFile, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  console.log(JSON.stringify(payload, null, 2));
};

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
