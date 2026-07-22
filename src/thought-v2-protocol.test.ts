import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { getBytes, hexlify, keccak256, toUtf8Bytes } from "ethers";

import {
  binaryFieldBits,
  binaryFieldPacked,
  binaryFieldPackedHex,
  canonicalJsonStringify,
  fitBinarySource64,
  fitBinarySource512,
  measureThoughtLine,
  measureThoughtLineBytes,
  thoughtWorkHashes,
  verifyPackedField,
} from "./thought-v2-protocol";
import { buildThoughtV2Svg } from "./thought-v2-renderer";

const fixtureRoot = path.join(process.cwd(), "protocol/releases/v2/renderer/fixtures");

const validFixtureIds = [
  "one-byte-cycle",
  "source-63-bytes",
  "source-64-bytes",
  "direction-diagnostic-64-bytes",
  "ascii",
  "ascii-punctuation",
  "internal-repeated-spaces",
  "cjk",
  "thai-combining",
  "arabic",
  "arabic-vowel-marks",
  "mixed-scripts",
  "utf8-two-byte",
  "utf8-three-byte",
  "utf8-four-byte",
  "emoji-skin-tone",
  "regional-indicator-flag",
  "combining-sequence",
  "unicode-precomposed",
  "xml-escaping",
  "shortest",
  "maximum-valid-ascii",
] as const;

const frozenRejectedCodepoints = [
  0x0009, 0x000d, 0x0085, 0x00a0, 0x1680, 0x2000, 0x200a, 0x2028, 0x2029,
  0x202f, 0x205f, 0x3000, 0x00ad, 0x034f, 0x061c, 0x115f, 0x1160, 0x17b4,
  0x17b5, 0x180b, 0x180f, 0x200b, 0x200c, 0x200d, 0x200e, 0x200f, 0x202a,
  0x202e, 0x2060, 0x2066, 0x2069, 0x206f, 0x3164, 0xfe00, 0xfe0f, 0xfeff,
  0xffa0, 0xfff0, 0xfff8, 0x1bca0, 0x1bca3, 0x1d173, 0x1d17a, 0xe0000,
  0xe0fff, 0xfdd0, 0xfdef,
  ...Array.from({ length: 17 }, (_, plane) => [plane * 0x10000 + 0xfffe, plane * 0x10000 + 0xffff]).flat(),
];

describe("THOUGHT binary-weave attempt protocol", () => {
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
    expect(measureThoughtLine("double  space", "prompt").errors).toEqual([]);
    expect(measureThoughtLine("😀 👋🏽", "prompt").errors).toEqual([]);
    expect(measureThoughtLine("🇺🇸", "prompt").errors).toEqual([]);
    expect(measureThoughtLine("e\u0301", "prompt").errors).toEqual([]);
    expect(measureThoughtLine("ภาษาไทย้", "prompt").errors).toEqual([]);
    expect(measureThoughtLine("مَرْحَبًا", "prompt").errors).toEqual([]);
    expect(measureThoughtLine("\ud800", "prompt").errors).toContain(
      "prompt line contains an invalid surrogate",
    );
  });

  it("replays every generated valid and invalid declaration vector", () => {
    const validation = JSON.parse(
      fs.readFileSync(
        path.join(process.cwd(), "protocol/releases/v2/conformance/text-validation.json"),
        "utf8",
      ),
    );
    for (const fixture of validation.validModels) {
      expect(measureThoughtLine(fixture.declaredModel, "model"), fixture.id).toEqual(fixture.model);
    }
    for (const fixture of validation.invalidModels) {
      expect(measureThoughtLine(fixture.declaredModel, "model").errors, fixture.id).toEqual(
        fixture.errors,
      );
      expect(fixture.errors.length, fixture.id).toBeGreaterThan(0);
    }
    for (const fixture of validation.validDeclaredAgents) {
      expect(measureThoughtLine(fixture.declaredAgent, "declaredAgent"), fixture.id).toEqual(
        fixture.measurement,
      );
    }
    for (const fixture of validation.invalidDeclaredAgents) {
      expect(
        measureThoughtLine(fixture.declaredAgent, "declaredAgent").errors,
        fixture.id,
      ).toEqual(fixture.errors);
      expect(fixture.errors.length, fixture.id).toBeGreaterThan(0);
    }

    const rawValidation = JSON.parse(
      fs.readFileSync(
        path.join(process.cwd(), "protocol/releases/v2/conformance/raw-utf8-vectors.json"),
        "utf8",
      ),
    );
    for (const fixture of rawValidation.invalid) {
      expect(
        measureThoughtLineBytes(getBytes(fixture.inputHex), "model").errors,
        fixture.id,
      ).toEqual(fixture.modelErrors);
      expect(
        measureThoughtLineBytes(getBytes(fixture.inputHex), "declaredAgent").errors,
        fixture.id,
      ).toEqual(fixture.declaredAgentErrors);
    }
  });

  it("rejects every frozen whitespace, default-ignorable, and noncharacter boundary", () => {
    for (const codepoint of frozenRejectedCodepoints) {
      expect(measureThoughtLine(String.fromCodePoint(codepoint), "prompt").errors.length).toBeGreaterThan(0);
    }
  });

  it("rejects unpaired UTF-16 surrogates before encoding", () => {
    expect(measureThoughtLine("\ud800", "prompt")).toMatchObject({ byteLength: 0, errors: [
      "prompt line contains an invalid surrogate",
    ] });
    expect(measureThoughtLine("\udc00", "prompt")).toMatchObject({ byteLength: 0, errors: [
      "prompt line contains an invalid surrogate",
    ] });
    expect(measureThoughtLine("💭", "prompt").errors).toEqual([]);
    expect(measureThoughtLine("a\ud800", "prompt").errors).toContain(
      "prompt line contains an invalid surrogate",
    );
    expect(measureThoughtLine("\udc00a", "prompt").errors).toContain(
      "prompt line contains an invalid surrogate",
    );
  });

  it("rejects every frozen malformed raw UTF-8 fixture", () => {
    const fixtures = JSON.parse(
      fs.readFileSync(path.join(fixtureRoot, "invalid-raw-utf8.json"), "utf8"),
    );
    for (const fixture of fixtures) {
      const measured = measureThoughtLineBytes(getBytes(fixture.inputHex), fixture.kind);
      expect(measured.errors, fixture.id).toEqual(fixture.errors);
      expect(measured.errors.some((error) => error.includes("malformed UTF-8")), fixture.id).toBe(true);
    }
  });

  it("never throws while fuzzing raw byte sequences from zero through 65 bytes", () => {
    const decoder = new TextDecoder("utf-8", { fatal: true });
    let state = 0x6d2b79f5;
    for (let length = 0; length <= 65; length += 1) {
      for (let sample = 0; sample < 24; sample += 1) {
        const raw = Uint8Array.from({ length }, () => {
          state = Math.imul(state ^ (state >>> 15), 1 | state);
          state ^= state + Math.imul(state ^ (state >>> 7), 61 | state);
          return (state ^ (state >>> 14)) & 0xff;
        });
        const measured = measureThoughtLineBytes(raw, "prompt");
        if (measured.errors.length !== 0) continue;
        const decoded = decoder.decode(raw);
        expect(toUtf8Bytes(decoded)).toEqual(raw);
        expect(raw.length).toBeGreaterThanOrEqual(1);
        expect(raw.length).toBeLessThanOrEqual(64);
        expect(binaryFieldPacked(decoded, "A")).toHaveLength(128);
      }
    }
  });

  it("matches every normative valid fixture including exact source bytes and sampled cells", () => {
    for (const id of validFixtureIds) {
      const fixture = JSON.parse(fs.readFileSync(path.join(fixtureRoot, `${id}.json`), "utf8"));
      expect(measureThoughtLine(fixture.promptLine, "prompt").errors, `${id}: prompt`).toEqual([]);
      expect(measureThoughtLine(fixture.agentLine, "agent").errors, `${id}: agent`).toEqual([]);
      expect(hexlify(toUtf8Bytes(fixture.promptLine)), `${id}: prompt utf8`).toBe(fixture.promptLineUtf8);
      expect(hexlify(toUtf8Bytes(fixture.agentLine)), `${id}: agent utf8`).toBe(fixture.agentLineUtf8);
      expect(hexlify(fitBinarySource64(fixture.promptLine)), `${id}: P64`).toBe(fixture.prompt64);
      expect(hexlify(fitBinarySource64(fixture.agentLine)), `${id}: A64`).toBe(fixture.agent64);
      expect(fitBinarySource512(fixture.promptLine), `${id}: P512`).toBe(fixture.prompt512);
      expect(fitBinarySource512(fixture.agentLine), `${id}: A512`).toBe(fixture.agent512);
      expect(binaryFieldPackedHex(fixture.promptLine, fixture.agentLine), `${id}: packed`).toBe(
        fixture.binaryFieldPacked,
      );
      expect(verifyPackedField(fixture.promptLine, fixture.agentLine, fixture.binaryFieldPacked)).toBe(true);
      const bits = binaryFieldBits(fixture.promptLine, fixture.agentLine);
      for (const sample of fixture.sampledGridPositions) {
        expect(bits[sample.fieldIndex], `${id}: sample ${sample.row},${sample.column}`).toBe(
          String(sample.bit),
        );
      }
      const hashes = thoughtWorkHashes(fixture.promptLine, fixture.agentLine);
      expect(hashes, `${id}: hashes`).toMatchObject({
        agentIdentityHash: fixture.agentIdentityHash,
        agentLineKeccak256: fixture.agentLineKeccak256,
        binaryFieldKeccak256: fixture.binaryFieldKeccak256,
        binaryFieldPacked: fixture.binaryFieldPacked,
        promptLineKeccak256: fixture.promptLineKeccak256,
        workHash: fixture.workHash,
      });
      const svg = buildThoughtV2Svg({ promptLine: fixture.promptLine, agentLine: fixture.agentLine });
      expect(svg, `${id}: SVG`).toBe(fixture.expectedSvg);
      expect(keccak256(toUtf8Bytes(svg)), `${id}: SVG hash`).toBe(fixture.expectedSvgKeccak256);
    }
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

  it("matches the normative capital A and B packed-field vector", () => {
    expect(binaryFieldPackedHex("A", "B")).toBe(
      "0x200220021001100175577557baabbaab200220021001100120022002100110012002200210011001200220021001100175577557baabbaab2002200210011001200220021001100175577557baabbaab200220021001100120022002100110012002200210011001200220021001100175577557baabbaab2002200210011001",
    );
  });

  it("keeps exact line hashes authoritative when cycling fields collide", () => {
    const first = thoughtWorkHashes("a", "b");
    const second = thoughtWorkHashes("aa", "bb");
    expect(second.binaryFieldPacked).toBe(first.binaryFieldPacked);
    expect(second.binaryFieldKeccak256).toBe(first.binaryFieldKeccak256);
    expect(second.agentIdentityHash).not.toBe(first.agentIdentityHash);
    expect(second.workHash).not.toBe(first.workHash);
  });

  it("preserves the documented A/AA and AB/ABAB cycling collisions", () => {
    const fixture = JSON.parse(
      fs.readFileSync(path.join(fixtureRoot, "cycling-collisions.json"), "utf8"),
    );
    for (const collision of fixture.collisions) {
      const first = thoughtWorkHashes(collision.first.promptLine, collision.first.agentLine);
      const second = thoughtWorkHashes(collision.second.promptLine, collision.second.agentLine);
      expect(first.binaryFieldPacked).toBe(collision.binaryFieldPacked);
      expect(second.binaryFieldPacked).toBe(collision.binaryFieldPacked);
      expect(first.workHash).not.toBe(second.workHash);
      expect(first.agentIdentityHash).not.toBe(second.agentIdentityHash);
    }
  });

  it("proves orthogonal ownership, direction, parity isolation, and exact packing", () => {
    const promptIndexes: number[] = [];
    const agentIndexes: number[] = [];
    for (let row = 0; row < 32; row += 1) {
      for (let column = 0; column < 32; column += 1) {
        if ((row + column) % 2 === 0) {
          promptIndexes.push(row * 16 + Math.floor(column / 2));
        } else {
          agentIndexes.push(column * 16 + Math.floor(row / 2));
        }
      }
    }
    expect(promptIndexes).toHaveLength(512);
    expect(agentIndexes).toHaveLength(512);
    expect([...promptIndexes].sort((a, b) => a - b)).toEqual(Array.from({ length: 512 }, (_, i) => i));
    expect([...agentIndexes].sort((a, b) => a - b)).toEqual(Array.from({ length: 512 }, (_, i) => i));

    const base = binaryFieldBits("A", "B");
    const promptChanged = binaryFieldBits("C", "B");
    const agentChanged = binaryFieldBits("A", "D");
    let promptDifferences = 0;
    let agentDifferences = 0;
    for (let index = 0; index < 1024; index += 1) {
      const row = Math.floor(index / 32);
      const column = index % 32;
      if (base[index] !== promptChanged[index]) {
        promptDifferences += 1;
        expect((row + column) % 2).toBe(0);
      }
      if (base[index] !== agentChanged[index]) {
        agentDifferences += 1;
        expect((row + column) % 2).toBe(1);
      }
    }
    expect(promptDifferences).toBeGreaterThan(0);
    expect(agentDifferences).toBeGreaterThan(0);

    const packedHex = binaryFieldPackedHex("A", "B");
    expect(packedHex).toMatch(/^0x[0-9a-f]{256}$/);
    const unpacked = Array.from(getBytes(packedHex), (byte) => byte.toString(2).padStart(8, "0")).join("");
    expect(unpacked).toBe(base);
    expect(getBytes(packedHex)).toHaveLength(128);
    expect(thoughtWorkHashes("A", "B").binaryFieldKeccak256).toBe(keccak256(getBytes(packedHex)));
  });

  it("serializes compact canonical JSON and preserves archived attempt manifest bytes", () => {
    expect(canonicalJsonStringify({ z: 1, a: { y: 2, b: 3 } })).toBe(
      '{"a":{"b":3,"y":2},"z":1}',
    );
    const manifest = fs.readFileSync(
      path.join("protocol", "releases/v2/release-manifest.json"),
    );
    expect(manifest).toHaveLength(13_185);
    expect(keccak256(manifest))
      .toBe("0x4fb509061538e6dc87bde4a8a4cfbfa34ff26c089409d55de5ba8bfdfa17a0b8");
    expect(crypto.createHash("sha256").update(manifest).digest("hex"))
      .toBe("490da98199b64cbc67956d695deb6766cd4c0046f49b99e10e2728c77976bb46");
  });
});
