#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const baselineId = "thought-v2-canonical-portable-release-20260801-r1";
const nextId = "thought-v2-canonical-portable-release-20260807-r2";
const baselineDir = path.join(
  root,
  "artifacts/thought-v2-contract-release/releases",
  baselineId,
);

const fail = (message) => {
  throw new Error(`THOUGHT V2 production-readiness check failed: ${message}`);
};
const readJson = (relative) => JSON.parse(fs.readFileSync(path.join(root, relative), "utf8"));
const sha256 = (value) => crypto.createHash("sha256").update(value).digest("hex");
const baselineManifest = JSON.parse(
  fs.readFileSync(path.join(baselineDir, "manifest.json"), "utf8"),
);

if (
  baselineManifest.artifactId !== baselineId
  || sha256(fs.readFileSync(path.join(baselineDir, "manifest.json")))
    !== "4d60feba36165c19a3cf3680078cc6baa7ba066c147ca607e5c82d0306f65b1a"
) fail("canonical r1 baseline is unavailable or drifted");

const releaseInput = readJson("protocol/current/v2/release-input.json");
const pathDependency = readJson("protocol/current/v2/integration/path-nft.v0.5.0.json");
const appBoundary = readJson(
  "protocol/current/v2/integration/thought.app-contract-boundary.v1.json",
);

if (
  releaseInput.status !== "canonical-portable-release"
  || releaseInput.productionConsumable !== true
  || releaseInput.externalDependencies?.pathNft?.lock
    !== "integration/path-nft.v0.5.0.json"
  || releaseInput.externalDependencies?.pathNft?.releaseTag !== "v0.5.0"
  || Object.values(releaseInput.deploymentAuthorization ?? {}).some((value) => value !== false)
) fail("release-input policy or deployment authorization drifted");

if (
  pathDependency.schema !== "inshell.thought.path-dependency-lock.v1"
  || pathDependency.releaseTag !== "v0.5.0"
  || pathDependency.releasePublicationCommit !== "085cfc084b0e568740e0da639e968eb535f7e5c8"
  || pathDependency.manifestSha256
    !== "a81355b459b40faea894cf1dfb7f484765a7ec62672039dd62d58a3a52849921"
  || pathDependency.pathNft?.abiSha256
    !== "c66d840e88064753923668e6107ab9de8ce62130fa798de6f159540a14e899fe"
  || pathDependency.pathNft?.redeploymentRequired !== true
  || pathDependency.consumeAuthorization?.schema !== "permission-epoch-v1"
  || pathDependency.consumeAuthorization?.requiredReturnType !== "uint32"
  || pathDependency.deployment?.addressesIncluded !== false
) fail("PATH v0.5.0 lock drifted");

if (
  appBoundary.currentExecutableBoundary?.pathDependency?.lock !== "path-nft.v0.5.0.json"
  || appBoundary.currentExecutableBoundary?.pathDependency?.releaseTag !== "v0.5.0"
  || appBoundary.currentExecutableBoundary?.pathDependency?.consumeAuthorizationSchema
    !== "permission-epoch-v1"
  || appBoundary.currentExecutableBoundary?.pathDependency?.pathNftRedeploymentRequired !== true
  || appBoundary.productionAuthorization !== false
) fail("App/Contract boundary drifted");

const compiledContracts = [
  ["ThoughtNFTV2", "evm/out/ThoughtNFTV2.sol/ThoughtNFTV2.json"],
  ["IThoughtRendererV2", "evm/out/IThoughtRendererV2.sol/IThoughtRendererV2.json"],
  ["IThoughtSvgRendererV2", "evm/out/IThoughtSvgRendererV2.sol/IThoughtSvgRendererV2.json"],
  ["ThoughtRendererV2", "evm/out/ThoughtRendererV2.sol/ThoughtRendererV2.json"],
  ["ThoughtSvgRendererV2", "evm/out/ThoughtSvgRendererV2.sol/ThoughtSvgRendererV2.json"],
  ["ThoughtRendererV2Split", "evm/out/ThoughtRendererV2Split.sol/ThoughtRendererV2Split.json"],
  ["ICreationAttestationVerifierV2", "evm/out/ICreationAttestationVerifierV2.sol/ICreationAttestationVerifierV2.json"],
  ["CreationAttestationVerifierV2", "evm/out/CreationAttestationVerifierV2.sol/CreationAttestationVerifierV2.json"],
  ["ThoughtSpecRegistry", "evm/out/ThoughtSpecRegistry.sol/ThoughtSpecRegistry.json"],
  ["ThoughtSpecRegistryV2", "evm/out/ThoughtSpecRegistryV2.sol/ThoughtSpecRegistryV2.json"],
];

for (const [name, relative] of compiledContracts) {
  const foundry = readJson(relative);
  const baseline = JSON.parse(
    fs.readFileSync(path.join(baselineDir, `contract/compiled/${name}.json`), "utf8"),
  );
  if (
    JSON.stringify(foundry.abi) !== JSON.stringify(baseline.abi)
    || foundry.bytecode?.object !== baseline.bytecode
    || foundry.deployedBytecode?.object !== baseline.deployedBytecode
  ) fail(`${name} ABI or bytecode drifted from canonical r1`);
}

console.log(JSON.stringify({
  artifactPublicationReady: true,
  baselineArtifactId: baselineId,
  contractParity: "exact-r1-abi-and-bytecode",
  deploymentAuthorized: false,
  nextArtifactId: nextId,
  pathDependency: "PATH/v0.5.0",
  persistentDeploymentReady: false,
  productionFrontendActivationReady: false,
  registrationApplicable: false,
}, null, 2));
