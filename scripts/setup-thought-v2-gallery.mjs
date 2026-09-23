#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";

import {
  loadThoughtV2GalleryFixtures,
  rootDir,
} from "./lib/load-thought-v2-gallery-fixtures.mjs";

const rpcUrl = process.env.RPC_URL ?? "http://127.0.0.1:8545";
const addressesFile = path.resolve(
  rootDir,
  process.env.ADDRESSES_FILE ?? path.join("public", "thought-v2-gallery.anvil.json"),
);

const run = (command, args, env = process.env) =>
  execFileSync(command, args, {
    cwd: rootDir,
    env,
    stdio: "inherit",
  });

const assertAnvil = async () => {
  let response;
  try {
    response = await fetch(rpcUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "eth_chainId", params: [] }),
    });
  } catch (error) {
    throw new Error(`Anvil is not reachable at ${rpcUrl}: ${error.message}`);
  }
  if (!response.ok) throw new Error(`Anvil returned HTTP ${response.status} at ${rpcUrl}`);
};

const main = async () => {
  const { fixtures, sourceFixtureCount, omittedDuplicates } =
    await loadThoughtV2GalleryFixtures();
  await assertAnvil();
  await fs.rm(addressesFile, { force: true });
  const env = {
    ...process.env,
    RPC_URL: rpcUrl,
    ADDRESSES_FILE: addressesFile,
    DEV_PATH_COUNT: String(fixtures.length),
  };

  console.log(
    `Preparing ${fixtures.length} mintable THOUGHT works from ${sourceFixtureCount} fixtures on ${rpcUrl}`,
  );
  if (omittedDuplicates.length > 0) {
    console.log(
      `Omitting ${omittedDuplicates.length} duplicate Agent-line fixture required by ThoughtNFT uniqueness`,
    );
  }
  run("npm", ["run", "protocol:build"], env);
  run(process.execPath, ["scripts/deploy-devnode.mjs"], env);
  run(process.execPath, ["scripts/mint-thought-v2-gallery.mjs"], env);
  console.log(`Gallery runtime config: ${path.relative(rootDir, addressesFile)}`);
};

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
