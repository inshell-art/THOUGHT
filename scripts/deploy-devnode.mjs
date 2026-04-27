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
const addressesFile = path.join(rootDir, "evm", "addresses.anvil.json");
const thoughtSpecRef = "THOUGHT.md@v1";

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

const main = async () => {
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const wallet = new Wallet(privateKey, provider);
  const deployer = new NonceManager(wallet);
  const deployerAddress = await deployer.getAddress();
  const network = await provider.getNetwork();
  const thoughtSpecText = await fs.readFile(path.join(rootDir, "THOUGHT.md"), "utf8");
  const thoughtSpecBytes = ethers.toUtf8Bytes(thoughtSpecText);
  const thoughtSpecId = ethers.id("thought.md.v1");
  const thoughtSpecHash = ethers.keccak256(thoughtSpecBytes);

  const pathNft = await deploy(
    deployer,
    path.join(pathEvmDir, "artifacts", "src", "PathNFT.sol", "PathNFT.json"),
    [deployerAddress, "PATH", "PATH", ""],
  );
  const pathNftAddress = await pathNft.getAddress();
  const minterRole = ethers.id("MINTER_ROLE");
  await (await pathNft.grantRole(minterRole, deployerAddress)).wait();
  await (await pathNft.safeMint(deployerAddress, 1n, "0x")).wait();

  const seedGenerator = await deploy(
    deployer,
    path.join(rootDir, "evm", "out", "SeedGenerator.sol", "SeedGenerator.json"),
  );
  const thoughtPreviewer = await deploy(
    deployer,
    path.join(rootDir, "evm", "out", "ThoughtPreviewer.sol", "ThoughtPreviewer.json"),
  );
  const thoughtSpecRegistry = await deploy(
    deployer,
    path.join(rootDir, "evm", "out", "ThoughtSpecRegistry.sol", "ThoughtSpecRegistry.json"),
  );
  await (
    await thoughtSpecRegistry.registerSpec(
      thoughtSpecId,
      thoughtSpecRef,
      thoughtSpecBytes,
      true,
    )
  ).wait();
  const thoughtSpecRegistryAddress = await thoughtSpecRegistry.getAddress();
  const thoughtToken = await deploy(
    deployer,
    path.join(rootDir, "evm", "out", "ThoughtToken.sol", "ThoughtToken.json"),
    [pathNftAddress, thoughtSpecRegistryAddress],
  );
  const thoughtTokenAddress = await thoughtToken.getAddress();

  await (
    await pathNft.setMovementConfig(
      ethers.encodeBytes32String("THOUGHT"),
      thoughtTokenAddress,
      1,
    )
  ).wait();

  const payload = {
    rpcUrl,
    chainId: Number(network.chainId),
    pathNft: { address: pathNftAddress },
    pathMovement: { name: "THOUGHT", quota: 1 },
    devPathToken: { id: 1, owner: deployerAddress },
    seedGenerator: { address: await seedGenerator.getAddress() },
    thoughtPreviewer: { address: await thoughtPreviewer.getAddress() },
    thoughtSpecRegistry: { address: thoughtSpecRegistryAddress },
    thoughtSpec: {
      id: thoughtSpecId,
      hash: thoughtSpecHash,
      ref: thoughtSpecRef,
    },
    thoughtToken: { address: thoughtTokenAddress },
  };

  await fs.writeFile(addressesFile, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  console.log(JSON.stringify(payload, null, 2));
};

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
