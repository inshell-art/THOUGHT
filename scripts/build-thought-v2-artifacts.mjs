import { execFileSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import ts from "typescript";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const defaultOutRoot = path.join(root, "artifacts", "thought-v2");
const tempDir = path.join(root, ".tmp", "thought-v2-artifact-build");
const validChannels = new Set(["experimental", "candidate", "stable", "latest"]);

const argValue = (name) => {
  const index = process.argv.indexOf(name);
  if (index === -1) return undefined;
  const value = process.argv[index + 1];
  if (!value || value.startsWith("--")) throw new Error(`Missing value for ${name}`);
  return value;
};

const hasFlag = (name) => process.argv.includes(name);

const write = (file, text) => {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, text, "utf8");
};

const writeJson = (file, value) => {
  write(file, `${JSON.stringify(value, null, 2)}\n`);
};

const readJson = (file) => JSON.parse(fs.readFileSync(file, "utf8"));

const sha256Bytes = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");
const sha256File = (file) => sha256Bytes(fs.readFileSync(file));

const run = (command, args) => execFileSync(command, args, { cwd: root, encoding: "utf8" }).trim();

const tryRun = (command, args, fallback = null) => {
  try {
    return run(command, args);
  } catch {
    return fallback;
  }
};

const gitBranch = () => tryRun("git", ["branch", "--show-current"], "unknown");
const gitCommit = () => tryRun("git", ["rev-parse", "HEAD"], null);
const gitRemote = () => tryRun("git", ["remote", "get-url", "origin"], null);
const gitStatus = () =>
  tryRun("git", ["status", "--short"], "")
    .split("\n")
    .filter((line) => line.trim() && !line.includes("artifacts/thought-v2/"))
    .join("\n");

const slug = (value) =>
  value
    .toLowerCase()
    .replace(/^codex\//, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);

const compactStamp = (date) => date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");

const transpileTsFile = (src, dst) => {
  const source = fs.readFileSync(src, "utf8");
  const output = ts.transpileModule(source, {
    fileName: src,
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ES2022,
      moduleResolution: ts.ModuleResolutionKind.Bundler,
      verbatimModuleSyntax: true,
    },
  });
  write(dst, output.outputText);
};

const loadThoughtV2Modules = async () => {
  fs.rmSync(tempDir, { recursive: true, force: true });
  fs.mkdirSync(tempDir, { recursive: true });
  transpileTsFile(path.join(root, "src", "thought-v2-protocol.ts"), path.join(tempDir, "thought-v2-protocol.mjs"));
  transpileTsFile(path.join(root, "src", "thought-v2-renderer.ts"), path.join(tempDir, "thought-v2-renderer.mjs"));
  transpileTsFile(path.join(root, "src", "thought-v2-fixtures.ts"), path.join(tempDir, "thought-v2-fixtures.mjs"));
  const rendererFile = path.join(tempDir, "thought-v2-renderer.mjs");
  fs.writeFileSync(
    rendererFile,
    fs.readFileSync(rendererFile, "utf8").replaceAll('"./thought-v2-protocol"', '"./thought-v2-protocol.mjs"'),
    "utf8",
  );

  const renderer = await import(pathToFileURL(path.join(tempDir, "thought-v2-renderer.mjs")).href);
  const fixtures = await import(pathToFileURL(path.join(tempDir, "thought-v2-fixtures.mjs")).href);
  return { renderer, fixtures };
};

const listFiles = (dir) => {
  const files = [];
  const walk = (current) => {
    for (const entry of fs.readdirSync(current, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else if (entry.isFile()) {
        files.push(path.relative(dir, full));
      }
    }
  };
  walk(dir);
  return files;
};

const copySourceFile = (fromRel, toRel, releaseDir) => {
  const from = path.join(root, fromRel);
  if (!fs.existsSync(from)) throw new Error(`Missing source file: ${fromRel}`);
  fs.mkdirSync(path.dirname(path.join(releaseDir, toRel)), { recursive: true });
  fs.copyFileSync(from, path.join(releaseDir, toRel));
};

const renderBundleReadme = ({ artifactId, channel, sourceBranch }) => `# THOUGHT Artifact Bundle

Artifact ID: \`${artifactId}\`
Channel: \`${channel}\`
Source branch: \`${sourceBranch}\`

This bundle is a repo-published bridge artifact for FE and downstream agents.

## Files

- \`manifest.json\`: authoritative machine-readable manifest.
- \`handoff.md\`: human handoff for FE agents.
- \`render-contract.json\`: machine-readable geometry, font, and overflow contract.
- \`fixtures.json\`: default text and prepared prompt/agent corpuses.
- \`reference/\`: exact TypeScript renderer and fixture source.
- \`samples/default.svg\`: default generated artifact.
- \`samples/works/*.svg\`: generated fixture SVGs.
- \`samples/index.json\`: sample SVG index.
- \`SHA256SUMS.txt\`: sha256 for every bundle file except itself.

Consumers should resolve a channel file such as \`artifacts/thought-v2/latest.json\`, read \`manifest_path\`, fetch that manifest, and verify hashes before use.
`;

const renderBridgeReadme = () => `# THOUGHT Artifact Bridge

This directory publishes render artifacts for downstream repos.

\`docs/agent/THOUGHT_ARTIFACT_CONSUMPTION_BOOK.md\` is authoritative for channel policy, integrity verification, consumer pinning, umbrella releases, rollout, and rollback. This render bridge is one component of that larger artifact model.

## Channels

- \`latest.json\`: most recently built artifact from this repo.
- \`experimental.json\`: branch trials and design experiments.
- \`candidate.json\`: FE-ready candidate contract.
- \`stable.json\`: production-approved render contract.

Each channel file points to an immutable release under \`releases/<artifact_id>/manifest.json\`.

## Build

\`\`\`bash
npm run artifact:build -- --channel experimental
npm run artifact:build -- --channel candidate
npm run artifact:build -- --channel stable
\`\`\`

Use \`--artifact-id <id>\` to pin a human-readable release id.

## Consumer Flow

1. Fetch \`artifacts/thought-v2/latest.json\` or a specific channel file from the THOUGHT repo.
2. Fetch the referenced \`manifest_path\`.
3. Fetch files listed in \`manifest.files\`.
4. Verify each sha256 before using renderer code, fixtures, or samples.
5. Production consumers should pin \`artifact_id\` plus hashes, not a moving channel.
`;

const buildArtifact = async () => {
  const channel = argValue("--channel") ?? "experimental";
  if (!validChannels.has(channel)) {
    throw new Error(`Invalid --channel ${channel}. Expected one of: ${Array.from(validChannels).join(", ")}`);
  }

  const outRoot = path.resolve(argValue("--out-root") ?? defaultOutRoot);
  const createdAt = argValue("--created-at") ?? new Date().toISOString();
  const stamp = compactStamp(new Date(createdAt));
  const sourceBranch = gitBranch();
  const sourceCommit = gitCommit();
  const sourceRemote = gitRemote();
  const sourceStatus = gitStatus();
  const sourceDirty = sourceStatus.trim().length > 0;
  const packageJson = readJson(path.join(root, "package.json"));
  const sourceSlug = slug(sourceBranch || "artifact") || "artifact";
  const artifactSlug = sourceSlug.startsWith("thought-v2-") ? sourceSlug : `thought-v2-${sourceSlug}`;
  const artifactId = argValue("--artifact-id") ?? `${artifactSlug}-${stamp}`;
  const releaseDir = path.join(outRoot, "releases", artifactId);

  const { renderer, fixtures } = await loadThoughtV2Modules();
  const {
    buildThoughtV2Svg,
    THOUGHT_V2_LIMITS,
    THOUGHT_V2_RENDER_CONTRACT,
    measureThoughtV2Line,
  } = renderer;
  const { thoughtV2DefaultText, thoughtV2TextCorpuses, thoughtV2TextFixtures } = fixtures;

  fs.rmSync(releaseDir, { recursive: true, force: true });
  fs.mkdirSync(releaseDir, { recursive: true });

  copySourceFile("THOUGHT_V2_FE_TIGHTENING_ARTIFACT.md", "handoff.md", releaseDir);
  copySourceFile("src/thought-v2-renderer.ts", "reference/thought-v2-renderer.ts", releaseDir);
  copySourceFile("src/thought-v2-fixtures.ts", "reference/thought-v2-fixtures.ts", releaseDir);

  const fixturesPayload = {
    schema_version: 1,
    defaultText: thoughtV2DefaultText,
    corpuses: thoughtV2TextCorpuses,
    fixtures: thoughtV2TextFixtures,
  };
  writeJson(path.join(releaseDir, "fixtures.json"), fixturesPayload);
  writeJson(path.join(releaseDir, "render-contract.json"), {
    schema_version: 1,
    renderContract: THOUGHT_V2_RENDER_CONTRACT,
    limits: THOUGHT_V2_LIMITS,
  });
  write(path.join(releaseDir, "README.md"), renderBundleReadme({ artifactId, channel, sourceBranch }));

  const samples = [];
  const writeSample = (name, textPair, fixture = null) => {
    const promptMeasure = measureThoughtV2Line(textPair.promptLine, "prompt");
    const agentMeasure = measureThoughtV2Line(textPair.agentLine, "agent");
    const svg = buildThoughtV2Svg(textPair);
    const rel = path.join("samples", fixture ? "works" : "", `${name}.svg`);
    write(path.join(releaseDir, rel), svg);
    samples.push({
      file: rel,
      fixtureId: fixture?.id ?? null,
      fixtureName: fixture?.name ?? "default preview",
      corpusId: fixture?.corpusId ?? null,
      corpusName: fixture?.corpusName ?? null,
      promptLine: textPair.promptLine,
      agentLine: textPair.agentLine,
      prompt: {
        byteLength: promptMeasure.byteLength,
        displayUnits: promptMeasure.displayUnits,
      },
      agent: {
        byteLength: agentMeasure.byteLength,
        displayUnits: agentMeasure.displayUnits,
      },
      animated: false,
    });
  };

  writeSample("default", thoughtV2DefaultText);
  thoughtV2TextFixtures.forEach((fixture, index) => {
    const fileBase = `${String(index + 1).padStart(2, "0")}-${fixture.id}`;
    writeSample(fileBase, fixture, fixture);
  });
  writeJson(path.join(releaseDir, "samples", "index.json"), {
    schema_version: 1,
    samples,
  });

  const contentFiles = listFiles(releaseDir).filter((file) => file !== "manifest.json" && file !== "SHA256SUMS.txt");
  const files = contentFiles.map((file) => ({
    path: file,
    bytes: fs.statSync(path.join(releaseDir, file)).size,
    sha256: sha256File(path.join(releaseDir, file)),
  }));

  const manifest = {
    schema_version: 1,
    artifact_kind: "thought-v2-render-artifact",
    artifact_id: artifactId,
    channel,
    package: {
      name: packageJson.name,
      version: packageJson.version,
    },
    generated_at: createdAt,
    source: {
      repo_remote: sourceRemote,
      branch: sourceBranch,
      commit: sourceCommit,
      dirty: sourceDirty,
      status: sourceStatus ? sourceStatus.split("\n") : [],
    },
    entrypoints: {
      handoff: "handoff.md",
      render_contract: "render-contract.json",
      fixtures: "fixtures.json",
      renderer_source: "reference/thought-v2-renderer.ts",
      fixture_source: "reference/thought-v2-fixtures.ts",
      default_svg: "samples/default.svg",
      samples_index: "samples/index.json",
    },
    files,
  };
  writeJson(path.join(releaseDir, "manifest.json"), manifest);

  const checksummedFiles = listFiles(releaseDir).filter((file) => file !== "SHA256SUMS.txt");
  const checksumText = checksummedFiles
    .map((file) => `${sha256File(path.join(releaseDir, file))}  ${file}`)
    .join("\n");
  write(path.join(releaseDir, "SHA256SUMS.txt"), `${checksumText}\n`);

  const manifestPath = path.relative(root, path.join(releaseDir, "manifest.json"));
  const channelPayload = {
    schema_version: 1,
    artifact_kind: "thought-v2-render-artifact-channel",
    channel,
    artifact_id: artifactId,
    generated_at: createdAt,
    manifest_path: manifestPath,
    manifest_sha256: sha256File(path.join(releaseDir, "manifest.json")),
    release_base_path: path.relative(root, releaseDir),
    source: manifest.source,
  };

  fs.mkdirSync(outRoot, { recursive: true });
  writeJson(path.join(outRoot, `${channel}.json`), channelPayload);
  if (!hasFlag("--no-latest")) {
    writeJson(path.join(outRoot, "latest.json"), { ...channelPayload, channel: "latest", source_channel: channel });
  }
  write(path.join(outRoot, "README.md"), renderBridgeReadme());

  const summary = {
    artifact_id: artifactId,
    channel,
    release_dir: path.relative(root, releaseDir),
    manifest_path: manifestPath,
    file_count: listFiles(releaseDir).length,
    sample_count: samples.length,
    source_dirty: sourceDirty,
  };
  process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
};

buildArtifact().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
