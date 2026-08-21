#!/usr/bin/env node
// Test-only compatibility harness. Production CAMPAIGN-PHASE.json never references this file.
import fs from "node:fs";
import path from "node:path";

import {
  makeThoughtReceiptEnvelope,
  parseJsonStrict,
  sha256Bytes,
  validatePathEnvelopeFile,
  validateThoughtEnvelope,
} from "./lib/thought-integrated-deployment.mjs";

const arg = (name) => {
  const index = process.argv.indexOf(name);
  if (index < 0 || !process.argv[index + 1]) throw new Error(`required argument missing: ${name}`);
  return process.argv[index + 1];
};
const inputFile = path.resolve(arg("--path-envelope"));
const payloadFile = path.resolve(arg("--thought-payload"));
const outputFile = path.resolve(arg("--out"));
const inputBytes = fs.readFileSync(inputFile);
parseJsonStrict(inputBytes.toString("utf8"), "synthetic PATH envelope");
const payload = parseJsonStrict(fs.readFileSync(payloadFile, "utf8"), "synthetic THOUGHT payload");
const pathEnvelopeSha256 = sha256Bytes(inputBytes);
const pathExpected = {
  campaignId: arg("--campaign-id"),
  environment: arg("--environment"),
  chainId: Number(arg("--chain-id")),
  pathBundleDigest: arg("--path-bundle-digest"),
  retainedAuthority: arg("--path-retained-authority"),
  pathNft: arg("--path-nft"),
};
const prior = validatePathEnvelopeFile(inputFile, pathEnvelopeSha256, pathExpected);
const thoughtExpected = {
  ...pathExpected,
  pathPhaseAEnvelopeSha256: pathEnvelopeSha256,
  pathPhaseAPayloadSha256: prior.payloadSha256,
  thoughtBundleDigest: arg("--thought-bundle-digest"),
  registryOwner: arg("--registry-owner"),
  attestationAuthority: arg("--attestation-authority"),
  protocolReleaseId: payload.registry?.protocolReleaseId,
  protocolManifestHash: payload.registry?.protocolManifestHash,
};
const thoughtEnvelope = makeThoughtReceiptEnvelope(payload, thoughtExpected);
validateThoughtEnvelope(thoughtEnvelope, thoughtExpected);
fs.writeFileSync(outputFile, `${JSON.stringify(thoughtEnvelope, null, 2)}\n`, { flag: "wx" });
process.stdout.write(JSON.stringify({
  pathEnvelopeSha256,
  pathPayloadSha256: prior.payloadSha256,
  thoughtEnvelopeSha256: sha256Bytes(fs.readFileSync(outputFile)),
  thoughtPayloadSha256: thoughtEnvelope.protocol_payload.sha256,
}) + "\n");
