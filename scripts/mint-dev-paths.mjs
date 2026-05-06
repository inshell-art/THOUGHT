#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Contract, NonceManager, Wallet, ethers } from "ethers";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const addressesFile = path.join(rootDir, "evm", "addresses.anvil.json");
const rpcUrl = process.env.RPC_URL ?? "http://127.0.0.1:8545";
const privateKey =
  process.env.PRIVATE_KEY ??
  "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
const pathEvmDir = process.env.PATH_EVM_DIR ?? "/Users/bigu/Projects/path/evm";
const firstPathId = BigInt(process.env.FIRST_PATH_ID ?? "1");
const lastPathId = BigInt(process.env.LAST_PATH_ID ?? process.env.DEV_PATH_COUNT ?? "10");

const readArtifactAbi = async (artifactPath) => {
  const artifact = JSON.parse(await fs.readFile(artifactPath, "utf8"));
  if (!artifact.abi) {
    throw new Error(`invalid artifact: ${artifactPath}`);
  }
  return artifact.abi;
};

const tokenExists = async (pathNft, tokenId) => {
  try {
    await pathNft.ownerOf(tokenId);
    return true;
  } catch {
    return false;
  }
};

const main = async () => {
  const addresses = JSON.parse(await fs.readFile(addressesFile, "utf8"));
  const pathNftAddress = addresses.pathNft?.address;
  if (!pathNftAddress) {
    throw new Error("evm/addresses.anvil.json has no pathNft.address");
  }

  if (lastPathId < firstPathId) {
    throw new Error("LAST_PATH_ID must be greater than or equal to FIRST_PATH_ID");
  }

  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const wallet = new Wallet(privateKey, provider);
  const signer = new NonceManager(wallet);
  const minter = await signer.getAddress();
  const owner = process.env.PATH_OWNER ?? minter;
  const abi = await readArtifactAbi(
    path.join(pathEvmDir, "artifacts", "src", "PathNFT.sol", "PathNFT.json"),
  );
  const pathNft = new Contract(pathNftAddress, abi, signer);
  const minterRole = ethers.id("MINTER_ROLE");

  if (!(await pathNft.hasRole(minterRole, minter))) {
    await (await pathNft.grantRole(minterRole, minter)).wait();
  }

  const minted = [];
  const skipped = [];
  for (let tokenId = firstPathId; tokenId <= lastPathId; tokenId++) {
    if (await tokenExists(pathNft, tokenId)) {
      skipped.push(tokenId.toString());
      continue;
    }
    await (await pathNft.safeMint(owner, tokenId, "0x")).wait();
    minted.push(tokenId.toString());
  }

  console.log(JSON.stringify({
    rpcUrl,
    pathNft: pathNftAddress,
    minter,
    owner,
    range: `${firstPathId}-${lastPathId}`,
    minted,
    skipped,
  }, null, 2));
};

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
