import {
  cp,
  lstat,
  mkdir,
  rm
} from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const argumentsAfterScript = process.argv.slice(2);
const outIndex = argumentsAfterScript.indexOf("--out");
const requested = outIndex < 0 ? null : argumentsAfterScript[outIndex + 1];

if (!requested || !path.isAbsolute(requested)) {
  throw new Error(
    "usage: npm run export -- --out /absolute/destination"
  );
}

const destination = path.resolve(requested);
const filesystemRoot = path.parse(destination).root;
if (
  destination === filesystemRoot
  || destination === ROOT
  || ROOT.startsWith(`${destination}${path.sep}`)
) {
  throw new Error("refusing unsafe Fifth Set export destination");
}

try {
  await lstat(destination);
  throw new Error(`export destination already exists: ${destination}`);
} catch (error) {
  if (error.code !== "ENOENT") throw error;
}

const runVerifier = (directory) => new Promise((resolve, reject) => {
  const child = spawn(
    process.execPath,
    [path.join(directory, "verify.mjs")],
    { cwd: directory, stdio: "inherit" }
  );
  child.once("error", reject);
  child.once("exit", (code) => {
    if (code === 0) resolve();
    else reject(new Error(`Fifth Set verifier exited with ${code}`));
  });
});

await runVerifier(ROOT);
await mkdir(path.dirname(destination), { recursive: true });
await cp(ROOT, destination, {
  recursive: true,
  filter: (source) => {
    const relative = path.relative(ROOT, source);
    return relative !== "node_modules"
      && !relative.startsWith(`node_modules${path.sep}`)
      && !relative.endsWith(".tgz");
  }
});

try {
  await runVerifier(destination);
} catch (error) {
  await rm(destination, { recursive: true, force: true });
  throw error;
}

process.stdout.write(`Fifth Set exported and verified: ${destination}\n`);
