import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const EXTRACTOR = path.join(ROOT, "src", "extract-native.swift");
const REFERENCE = path.join(ROOT, "reference");
const upstream = JSON.parse(
  await readFile(path.join(ROOT, "upstream.json"), "utf8")
);

const normalize = (value) => {
  if (Array.isArray(value)) return value.map(normalize);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value).sort().map((key) => [key, normalize(value[key])])
    );
  }
  return value;
};
const canonicalJson = (value) => `${JSON.stringify(normalize(value), null, 2)}\n`;
const sha256 = (value) => createHash("sha256").update(value).digest("hex");

const parseArgs = () => {
  const args = new Map();
  for (let index = 2; index < process.argv.length; index += 2) {
    const key = process.argv[index];
    const value = process.argv[index + 1];
    if (!key?.startsWith("--") || !value) {
      throw new Error(
        "usage: node refresh-sources.mjs --400 /absolute/path/SourceCodePro-Regular.ttf"
      );
    }
    args.set(key.slice(2), path.resolve(value));
  }
  return args;
};

const inputs = parseArgs();
for (const record of upstream.weights) {
  if (!inputs.has(String(record.weight))) {
    throw new Error(`missing --${record.weight} input`);
  }
}
if (inputs.size !== upstream.weights.length) {
  throw new Error("only the declared Regular 400 input is accepted");
}

await mkdir(REFERENCE, { recursive: true });
const moduleCache = path.join(os.tmpdir(), "inshell-mono-76-swift-cache");

for (const record of upstream.weights) {
  const fontPath = inputs.get(String(record.weight));
  if (path.extname(fontPath).toLowerCase() !== ".ttf") {
    throw new Error(`${record.weight} input must be a .ttf`);
  }
  const sourceBytes = await readFile(fontPath);
  const sourceSha256 = sha256(sourceBytes);
  if (sourceSha256 !== record.sha256) {
    throw new Error(
      `${record.weight} SHA-256 differs: expected ${record.sha256}, received ${sourceSha256}`
    );
  }

  const extraction = spawnSync(
    "swift",
    [
      "-Xfrontend",
      "-downgrade-typecheck-interface-error",
      EXTRACTOR,
      fontPath
    ],
    {
      cwd: ROOT,
      encoding: "utf8",
      maxBuffer: 8 * 1024 * 1024,
      env: {
        ...process.env,
        CLANG_MODULE_CACHE_PATH: moduleCache,
        SWIFT_MODULECACHE_PATH: moduleCache
      }
    }
  );
  if (extraction.status !== 0) {
    throw new Error(
      `Swift extraction failed for ${record.weight}:\n${
        extraction.stderr || extraction.stdout
      }`
    );
  }

  const reference = JSON.parse(extraction.stdout);
  if (reference.canonicalOrder !== upstream.canonicalOrder) {
    throw new Error(`${record.weight} canonical order differs`);
  }
  if (reference.source.postScriptName !== record.postScriptName) {
    throw new Error(
      `${record.weight} PostScript name differs: ${reference.source.postScriptName}`
    );
  }
  if (
    reference.source.unitsPerEm !== 1000
    || reference.metrics.fixedAdvanceWidth !== 600
    || reference.glyphs.length !== 76
    || reference.glyphs.some((glyph) => glyph.advanceWidth !== 600)
  ) {
    throw new Error(`${record.weight} native metric contract differs`);
  }

  reference.familyName = "Inshell Mono 76";
  reference.faceName = `Inshell Mono 76 ${record.style}`;
  reference.style = record.style;
  reference.weight = record.weight;
  reference.source.sha256 = sourceSha256;
  reference.source.officialRepository = upstream.repository;
  reference.source.releaseCommit = upstream.releaseCommit;
  reference.source.releasePackageVersion = upstream.packageVersion;
  reference.source.downloadUrl = record.url;
  reference.source.license = "OFL-1.1";
  reference.source.modifiedVersionReason =
    "Restricted 76-character extraction and conversion to native SVG path data";
  reference.source.pathStreamSha256 = sha256(
    reference.glyphs.map((glyph) => glyph.d).join("")
  );
  for (const glyph of reference.glyphs) {
    glyph.pathSha256 = sha256(glyph.d);
  }

  const outputPath = path.join(REFERENCE, `${record.weight}.json`);
  await writeFile(outputPath, canonicalJson(reference), "utf8");
  process.stdout.write(
    `${record.weight} ${record.style}: ${reference.totals.pathBytes} path bytes · ${reference.source.pathStreamSha256}\n`
  );
}
