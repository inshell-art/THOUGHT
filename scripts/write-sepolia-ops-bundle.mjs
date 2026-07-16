#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const authoritativeGenerator = path.join(here, "write-thought-signing-os-pack.mjs");

console.error(
  "ops:bundle:sepolia is a compatibility alias; generating the authoritative THOUGHT Signing OS pack",
);
const result = spawnSync(process.execPath, [authoritativeGenerator, ...process.argv.slice(2)], {
  stdio: "inherit",
});
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
