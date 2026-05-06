#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const addressesFile = path.join(rootDir, "evm", "addresses.anvil.json");
const stateDir = path.join(rootDir, "evm", "devnode-state");
const stateFile = process.env.DEVNODE_STATE_DUMP
  ? path.resolve(process.env.DEVNODE_STATE_DUMP)
  : path.join(stateDir, "latest.json");

const readAddresses = async () => {
  try {
    return JSON.parse(await fs.readFile(addressesFile, "utf8"));
  } catch {
    return {};
  }
};

const rpcUrl = process.env.RPC_URL ?? (await readAddresses()).rpcUrl ?? "http://127.0.0.1:8545";

const rpc = async (method, params = []) => {
  const response = await fetch(rpcUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  const payload = await response.json();
  if (payload.error) {
    const message = payload.error.message ?? JSON.stringify(payload.error);
    const error = new Error(`${method} failed: ${message}`);
    error.payload = payload.error;
    throw error;
  }
  return payload.result;
};

const main = async () => {
  const addresses = await readAddresses();
  let dumpState;
  try {
    dumpState = await rpc("anvil_dumpState");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (/not supported|method not found|does not exist/i.test(message)) {
      throw new Error(
        [
          "Current node does not support anvil_dumpState.",
          "Exact devnode state persistence requires Anvil.",
          "Start future devnodes with: npm run devnode:start",
        ].join("\n"),
      );
    }
    throw error;
  }

  const [chainId, blockNumber] = await Promise.all([
    rpc("eth_chainId"),
    rpc("eth_blockNumber"),
  ]);
  const output = {
    savedAt: new Date().toISOString(),
    rpcUrl,
    chainId,
    blockNumber,
    addresses,
    dumpState,
  };

  await fs.mkdir(path.dirname(stateFile), { recursive: true });
  await fs.writeFile(stateFile, `${JSON.stringify(output, null, 2)}\n`, "utf8");
  console.log(JSON.stringify({
    stateFile,
    rpcUrl,
    chainId,
    blockNumber,
    bytes: dumpState.length,
  }, null, 2));
};

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
