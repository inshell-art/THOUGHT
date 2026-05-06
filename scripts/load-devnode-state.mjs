#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const addressesFile = path.join(rootDir, "evm", "addresses.anvil.json");
const stateFile = process.env.DEVNODE_STATE_DUMP
  ? path.resolve(process.env.DEVNODE_STATE_DUMP)
  : path.join(rootDir, "evm", "devnode-state", "latest.json");

const state = JSON.parse(await fs.readFile(stateFile, "utf8"));
const rpcUrl = process.env.RPC_URL ?? state.rpcUrl ?? "http://127.0.0.1:8545";

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
  if (typeof state.dumpState !== "string" || !state.dumpState.startsWith("0x")) {
    throw new Error(`invalid devnode state dump: ${stateFile}`);
  }

  const loaded = await rpc("anvil_loadState", [state.dumpState]);
  if (loaded !== true) {
    throw new Error(`anvil_loadState returned ${JSON.stringify(loaded)}`);
  }

  if (state.addresses && typeof state.addresses === "object") {
    const addresses = {
      ...state.addresses,
      rpcUrl,
    };
    await fs.writeFile(addressesFile, `${JSON.stringify(addresses, null, 2)}\n`, "utf8");
  }

  const [chainId, blockNumber] = await Promise.all([
    rpc("eth_chainId"),
    rpc("eth_blockNumber"),
  ]);

  console.log(JSON.stringify({
    loaded: true,
    stateFile,
    rpcUrl,
    chainId,
    blockNumber,
    restoredAddresses: Boolean(state.addresses),
  }, null, 2));
};

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
