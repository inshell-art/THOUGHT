import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { keccak256, toUtf8Bytes } from "ethers";

import {
  binaryFieldBits,
  binaryFieldPackedHex,
  canonicalJsonStringify,
  fitBinarySource512,
  measureThoughtLine,
  thoughtWorkHashes,
} from "./thought-v2-protocol";
import { buildThoughtV2Svg } from "./thought-v2-renderer";

describe("THOUGHT V2 protocol", () => {
  it("separates Agent identity from complete work identity", () => {
    const first = thoughtWorkHashes("first prompt", "same Agent");
    const changedPrompt = thoughtWorkHashes("second prompt", "same Agent");
    const changedAgent = thoughtWorkHashes("first prompt", "different Agent");

    expect(changedPrompt.agentIdentityHash).toBe(first.agentIdentityHash);
    expect(changedPrompt.workHash).not.toBe(first.workHash);
    expect(changedAgent.agentIdentityHash).not.toBe(first.agentIdentityHash);
    expect(changedAgent.workHash).not.toBe(first.workHash);
    expect(thoughtWorkHashes("first prompt", "Same Agent").agentIdentityHash).not.toBe(
      first.agentIdentityHash,
    );
  });

  it("uses exact Unicode bytes without normalization", () => {
    const composed = thoughtWorkHashes("é", "á");
    const decomposed = thoughtWorkHashes("e\u0301", "a\u0301");
    expect(composed.promptLineKeccak256).not.toBe(decomposed.promptLineKeccak256);
    expect(composed.agentIdentityHash).not.toBe(decomposed.agentIdentityHash);
    expect(measureThoughtLine("MiXeD Case", "prompt").errors).toEqual([]);
  });

  it("matches the reviewed one-byte fixture exactly", () => {
    const fixture = JSON.parse(
      fs.readFileSync(
        path.join(process.cwd(), "protocol/releases/v2/renderer/fixtures/one-byte-cycle.json"),
        "utf8",
      ),
    );
    expect(fitBinarySource512("a")).toBe(fixture.prompt512);
    expect(fitBinarySource512("b")).toBe(fixture.agent512);
    expect(binaryFieldBits("a", "b")).toHaveLength(1024);
    expect(binaryFieldPackedHex("a", "b")).toBe(fixture.binaryFieldPacked);
    const svg = buildThoughtV2Svg({ promptLine: "a", agentLine: "b" });
    expect(svg).toBe(fixture.expectedSvg);
    expect(keccak256(toUtf8Bytes(svg))).toBe(fixture.expectedSvgKeccak256);
  });

  it("serializes compact canonical JSON and verifies current manifest bytes", () => {
    expect(canonicalJsonStringify({ z: 1, a: { y: 2, b: 3 } })).toBe(
      '{"a":{"b":3,"y":2},"z":1}',
    );
    const current = JSON.parse(fs.readFileSync("protocol/CURRENT.json", "utf8"));
    const manifest = fs.readFileSync(path.join("protocol", current.manifest));
    expect(manifest).toHaveLength(current.byteLength);
    expect(keccak256(manifest)).toBe(current.keccak256);
    expect(crypto.createHash("sha256").update(manifest).digest("hex")).toBe(current.sha256);
  });
});
