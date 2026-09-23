#!/usr/bin/env node

import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const variants = [
  ["classic-line", 8551],
  ["classic-book", 8552],
  ["classic-round", 8553],
  ["classic-compact", 8554],
];

const run = (command, args, options = {}) =>
  new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: root,
      stdio: "inherit",
      ...options,
    });
    child.once("error", reject);
    child.once("exit", (code, signal) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} exited with ${code ?? signal}`));
    });
  });

const waitForRpc = async (port) => {
  const endpoint = `http://127.0.0.1:${port}`;
  for (let attempt = 0; attempt < 100; attempt++) {
    try {
      const response = await fetch(endpoint, {
        body: JSON.stringify({
          id: 1,
          jsonrpc: "2.0",
          method: "eth_chainId",
          params: [],
        }),
        headers: { "content-type": "application/json" },
        method: "POST",
      });
      if (response.ok) return;
    } catch {
      // The disposable node is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`Anvil on port ${port} did not become ready`);
};

for (const [slug, port] of variants) {
  console.log(`\n=== Benchmarking Set 5 ${slug} on Anvil :${port} ===`);
  const anvil = spawn("node", ["scripts/start-devnode.mjs"], {
    cwd: root,
    env: {
      ...process.env,
      DEVNODE_EPHEMERAL: "1",
      DEVNODE_PORT: String(port),
      RUST_LOG: "error",
    },
    stdio: "inherit",
  });
  const anvilExited = new Promise((resolve) => anvil.once("exit", resolve));
  try {
    await waitForRpc(port);
    await run(
      path.join(root, "node_modules/.bin/vite-node"),
      ["--script", "scripts/setup-thought-v2-current-gallery.ts"],
      {
        env: {
          ...process.env,
          RPC_URL: `http://127.0.0.1:${port}`,
          THOUGHT_V2_RENDERER_EXPERIMENT: slug,
          THOUGHT_V2_RUNTIME_CONFIG:
            `artifacts/benchmarks/thought-v2-${slug}.anvil.json`,
        },
      },
    );
  } finally {
    if (anvil.exitCode === null && anvil.signalCode === null) {
      anvil.kill("SIGTERM");
    }
    await anvilExited;
  }
}
