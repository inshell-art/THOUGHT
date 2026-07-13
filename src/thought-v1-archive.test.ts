import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { keccak256 } from "ethers";

const root = process.cwd();
const history = path.join(root, "protocol", "history", "v1");

describe("THOUGHT V1 archive", () => {
  it("preserves exact registered spec bytes and deployment identity", () => {
    const spec = fs.readFileSync(path.join(history, "THOUGHT.v1.md"));
    const record = JSON.parse(fs.readFileSync(path.join(history, "registry-record.json"), "utf8"));
    const deployment = JSON.parse(fs.readFileSync(path.join(history, "deployments.json"), "utf8"));

    expect(spec).toHaveLength(8549);
    expect(crypto.createHash("sha256").update(spec).digest("hex")).toBe(record.specSha256);
    expect(keccak256(spec)).toBe(record.specKeccak256);
    expect(record).toMatchObject({
      chainId: 11155111,
      registry: "0xBB8FD738b01b4a14F5E9bCFE408239a05d84621D",
      specName: "THOUGHT.v1.md",
    });
    expect(deployment.contracts).toMatchObject({
      thought_nft: "0x413efb5C95Bf3158F0E563FB9E19CB650Fc3760a",
      thought_spec_registry: record.registry,
      color_font_v1: "0xC223507ab7801Fdf234766fa1A87F09eae3494af",
    });
    expect(deployment.recommended_thought_spec.hash).toBe(record.specKeccak256);
  });
});
