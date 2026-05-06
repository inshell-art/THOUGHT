#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const statePath = process.env.DEVNODE_STATE_PATH
  ? path.resolve(process.env.DEVNODE_STATE_PATH)
  : path.join(rootDir, "evm", "devnode-state", "anvil-state.json");
const host = process.env.DEVNODE_HOST ?? "0.0.0.0";
const port = process.env.DEVNODE_PORT ?? "8545";
const stateInterval = process.env.DEVNODE_STATE_INTERVAL ?? "5";
const chainId = process.env.DEVNODE_CHAIN_ID ?? "31337";

await fs.mkdir(path.dirname(statePath), { recursive: true });

const args = [
  "--host",
  host,
  "--port",
  port,
  "--chain-id",
  chainId,
  "--state",
  statePath,
  "--state-interval",
  stateInterval,
];

console.log(`Starting persistent Anvil devnode on ${host}:${port}`);
console.log(`State file: ${statePath}`);
console.log("If the state file exists, Anvil loads it. While running, Anvil persists it periodically and on exit.");

const child = spawn("anvil", args, { stdio: "inherit" });
child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 0);
});
