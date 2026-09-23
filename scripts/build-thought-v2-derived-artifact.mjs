import { execFileSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import ts from "typescript";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const artifactRoot = path.join(root, "artifacts", "thought-v2");
const tempDir = path.join(root, ".tmp", "thought-v2-derived-artifact-build");

const argValue = (name) => {
  const index = process.argv.indexOf(name);
  if (index === -1) return undefined;
  const value = process.argv[index + 1];
  if (!value || value.startsWith("--")) throw new Error(`Missing value for ${name}`);
  return value;
};

const requiredArg = (name) => {
  const value = argValue(name);
  if (!value) throw new Error(`Required argument missing: ${name}`);
  return value;
};

const hasFlag = (name) => process.argv.includes(name);

const write = (file, value) => {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, value, "utf8");
};

const writeJson = (file, value) => write(file, `${JSON.stringify(value, null, 2)}\n`);
const readJson = (file) => JSON.parse(fs.readFileSync(file, "utf8"));
const sha256Bytes = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");
const sha256File = (file) => sha256Bytes(fs.readFileSync(file));

const tryRun = (command, args, fallback = null) => {
  try {
    return execFileSync(command, args, { cwd: root, encoding: "utf8" }).trim();
  } catch {
    return fallback;
  }
};

const sourceStatus = () =>
  (tryRun("git", ["status", "--short"], "") ?? "")
    .split("\n")
    .filter((line) => line.trim() && !line.includes("artifacts/thought-v2/"))
    .join("\n");

const listFiles = (dir) => {
  const files = [];
  const walk = (current) => {
    for (const entry of fs.readdirSync(current, { withFileTypes: true }).sort((a, b) =>
      a.name.localeCompare(b.name),
    )) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) walk(full);
      if (entry.isFile()) files.push(path.relative(dir, full));
    }
  };
  walk(dir);
  return files;
};

const transpileTsFile = (src, dst) => {
  const output = ts.transpileModule(fs.readFileSync(src, "utf8"), {
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

const loadModule = async (src, name) => {
  const dst = path.join(tempDir, `${name}.mjs`);
  transpileTsFile(src, dst);
  return import(`${pathToFileURL(dst).href}?v=${Date.now()}`);
};

const deriveRendererSource = (source) => {
  const replacements = [
    ["export const MAX_PROMPT_LINE_BYTES = 320;", "export const MAX_PROMPT_LINE_BYTES = 64;"],
    ["export const MAX_AGENT_LINE_BYTES = 180;", "export const MAX_AGENT_LINE_BYTES = 64;"],
    [
      "export const MAX_PROMPT_LINE_DISPLAY_UNITS = 433;",
      "export const MAX_PROMPT_LINE_DISPLAY_UNITS = 256;",
    ],
    [
      "export const MAX_AGENT_LINE_DISPLAY_UNITS = 162;",
      "export const MAX_AGENT_LINE_DISPLAY_UNITS = 256;",
    ],
  ];
  return replacements.reduce((result, [before, after]) => {
    if (!result.includes(before)) throw new Error(`Base renderer limit not found: ${before}`);
    return result.replace(before, after);
  }, source);
};

const fixtureSource = (payload) => `export type ThoughtV2TextPair = {
  promptLine: string;
  agentLine: string;
};

export type ThoughtV2TextFixtureDefinition = ThoughtV2TextPair & {
  id: string;
  name: string;
};

export type ThoughtV2TextCorpus = {
  id: string;
  name: string;
  fixtures: ThoughtV2TextFixtureDefinition[];
};

export type ThoughtV2TextFixture = ThoughtV2TextFixtureDefinition & {
  corpusId: string;
  corpusName: string;
};

export const thoughtV2DefaultText: ThoughtV2TextPair = ${JSON.stringify(payload.defaultText, null, 2)};

export const thoughtV2TextCorpuses: ThoughtV2TextCorpus[] = ${JSON.stringify(payload.corpuses, null, 2)};

export const thoughtV2TextFixtures: ThoughtV2TextFixture[] = thoughtV2TextCorpuses.flatMap((corpus) =>
  corpus.fixtures.map((fixture) => ({
    ...fixture,
    corpusId: corpus.id,
    corpusName: corpus.name,
  })),
);
`;

const build = async () => {
  const baseArtifactId = requiredArg("--base-artifact-id");
  const artifactId = requiredArg("--artifact-id");
  const createdAt = argValue("--created-at") ?? new Date().toISOString();
  const selectedCorpusIds = new Set(
    (argValue("--append-corpuses") ?? "emoji,exact-64-byte-limits").split(",").filter(Boolean),
  );
  const baseDir = path.join(artifactRoot, "releases", baseArtifactId);
  const releaseDir = path.join(artifactRoot, "releases", artifactId);

  if (!fs.existsSync(baseDir)) throw new Error(`Base artifact does not exist: ${baseArtifactId}`);
  if (fs.existsSync(releaseDir) && !hasFlag("--replace")) {
    throw new Error(`Derived artifact already exists: ${artifactId}`);
  }
  if (fs.existsSync(releaseDir)) fs.rmSync(releaseDir, { recursive: true, force: true });

  const status = sourceStatus();
  const source = {
    repo_remote: tryRun("git", ["remote", "get-url", "origin"]),
    branch: tryRun("git", ["branch", "--show-current"], "unknown"),
    commit: tryRun("git", ["rev-parse", "HEAD"]),
    dirty: Boolean(status),
    status: status ? status.split("\n") : [],
  };

  fs.rmSync(tempDir, { recursive: true, force: true });
  fs.mkdirSync(tempDir, { recursive: true });

  const baseManifest = readJson(path.join(baseDir, "manifest.json"));
  const baseFixtures = readJson(path.join(baseDir, "fixtures.json"));
  const baseSampleIndex = readJson(path.join(baseDir, "samples", "index.json"));
  const baseRendererFile = path.join(baseDir, "reference", "thought-v2-renderer.ts");
  const derivedRendererFile = path.join(tempDir, "derived-renderer.ts");
  const derivedRendererSource = deriveRendererSource(fs.readFileSync(baseRendererFile, "utf8"));
  write(derivedRendererFile, derivedRendererSource);
  const renderer = await loadModule(derivedRendererFile, "derived-renderer");
  const currentFixtures = await loadModule(
    path.join(root, "src", "thought-v2-fixtures.ts"),
    "current-fixtures",
  );

  const appendedCorpuses = currentFixtures.thoughtV2TextCorpuses.filter((corpus) =>
    selectedCorpusIds.has(corpus.id),
  );
  if (appendedCorpuses.length !== selectedCorpusIds.size) {
    const found = new Set(appendedCorpuses.map((corpus) => corpus.id));
    const missing = [...selectedCorpusIds].filter((id) => !found.has(id));
    throw new Error(`Append corpuses not found: ${missing.join(", ")}`);
  }

  const baseFixtureIds = new Set(baseFixtures.fixtures.map((fixture) => fixture.id));
  const appendedFixtures = appendedCorpuses.flatMap((corpus) =>
    corpus.fixtures.map((fixture) => ({
      ...fixture,
      corpusId: corpus.id,
      corpusName: corpus.name,
    })),
  );
  const duplicate = appendedFixtures.find((fixture) => baseFixtureIds.has(fixture.id));
  if (duplicate) throw new Error(`Fixture already exists in base artifact: ${duplicate.id}`);

  fs.cpSync(baseDir, releaseDir, { recursive: true, errorOnExist: true });
  write(
    path.join(releaseDir, "reference", "thought-v2-renderer.ts"),
    derivedRendererSource,
  );
  writeJson(path.join(releaseDir, "render-contract.json"), {
    schema_version: 1,
    renderContract: renderer.THOUGHT_V2_RENDER_CONTRACT,
    limits: renderer.THOUGHT_V2_LIMITS,
  });
  fs.appendFileSync(
    path.join(releaseDir, "handoff.md"),
    `\n\n## Derived fixture release\n\nThis experimental derivative preserves the base renderer geometry and styling while setting both visible lines to 64 UTF-8 bytes and 256 display units for exact boundary-fixture coverage.\n`,
    "utf8",
  );

  const fixtures = {
    schema_version: 1,
    defaultText: baseFixtures.defaultText,
    corpuses: [...baseFixtures.corpuses, ...appendedCorpuses],
    fixtures: [...baseFixtures.fixtures, ...appendedFixtures],
  };
  writeJson(path.join(releaseDir, "fixtures.json"), fixtures);
  write(
    path.join(releaseDir, "reference", "thought-v2-fixtures.ts"),
    fixtureSource(fixtures),
  );

  const samples = [...baseSampleIndex.samples];
  appendedFixtures.forEach((fixture, index) => {
    const workNumber = baseFixtures.fixtures.length + index + 1;
    const file = path.join(
      "samples",
      "works",
      `${String(workNumber).padStart(2, "0")}-${fixture.id}.svg`,
    );
    const prompt = renderer.measureThoughtV2Line(fixture.promptLine, "prompt");
    const agent = renderer.measureThoughtV2Line(fixture.agentLine, "agent");
    const svg = renderer.buildThoughtV2Svg(fixture);
    write(path.join(releaseDir, file), svg);
    samples.push({
      file,
      fixtureId: fixture.id,
      fixtureName: fixture.name,
      corpusId: fixture.corpusId,
      corpusName: fixture.corpusName,
      promptLine: fixture.promptLine,
      agentLine: fixture.agentLine,
      prompt: {
        byteLength: prompt.byteLength,
        displayUnits: prompt.displayUnits,
      },
      agent: {
        byteLength: agent.byteLength,
        displayUnits: agent.displayUnits,
      },
      animated: svg.includes("<animate "),
    });
  });
  writeJson(path.join(releaseDir, "samples", "index.json"), {
    schema_version: 1,
    samples,
  });

  write(
    path.join(releaseDir, "README.md"),
    `# THOUGHT Derived Artifact Bundle\n\nArtifact ID: \`${artifactId}\`\nChannel: \`experimental\`\nBase artifact: \`${baseArtifactId}\`\n\nThis bundle preserves the exact base renderer and adds fixture-only coverage for works #54-#60.\n`,
  );

  const contentFiles = listFiles(releaseDir).filter(
    (file) => file !== "manifest.json" && file !== "SHA256SUMS.txt",
  );
  const files = contentFiles.map((file) => ({
    path: file,
    bytes: fs.statSync(path.join(releaseDir, file)).size,
    sha256: sha256File(path.join(releaseDir, file)),
  }));
  const manifest = {
    ...baseManifest,
    artifact_id: artifactId,
    channel: "experimental",
    generated_at: createdAt,
    source,
    derived_from: {
      artifact_id: baseArtifactId,
      manifest_sha256: sha256File(path.join(baseDir, "manifest.json")),
      renderer_source_sha256: sha256File(
        path.join(baseDir, "reference", "thought-v2-renderer.ts"),
      ),
      preserved_renderer_geometry: true,
      renderer_limit_overrides: {
        prompt_max_bytes: 64,
        agent_max_bytes: 64,
        prompt_max_units: 256,
        agent_max_units: 256,
      },
      appended_corpuses: [...selectedCorpusIds],
    },
    files,
  };
  writeJson(path.join(releaseDir, "manifest.json"), manifest);

  const checksummedFiles = listFiles(releaseDir).filter((file) => file !== "SHA256SUMS.txt");
  write(
    path.join(releaseDir, "SHA256SUMS.txt"),
    `${checksummedFiles
      .map((file) => `${sha256File(path.join(releaseDir, file))}  ${file}`)
      .join("\n")}\n`,
  );

  const manifestPath = path.relative(root, path.join(releaseDir, "manifest.json"));
  const channelPayload = {
    schema_version: 1,
    artifact_kind: "thought-v2-render-artifact-channel",
    channel: "experimental",
    artifact_id: artifactId,
    generated_at: createdAt,
    manifest_path: manifestPath,
    manifest_sha256: sha256File(path.join(releaseDir, "manifest.json")),
    release_base_path: path.relative(root, releaseDir),
    source,
    derived_from: manifest.derived_from,
  };
  writeJson(path.join(artifactRoot, "experimental.json"), channelPayload);
  writeJson(path.join(artifactRoot, "latest.json"), {
    ...channelPayload,
    channel: "latest",
    source_channel: "experimental",
  });

  process.stdout.write(
    `${JSON.stringify(
      {
        artifact_id: artifactId,
        base_artifact_id: baseArtifactId,
        sample_count: samples.length,
        appended_fixture_count: appendedFixtures.length,
        manifest_sha256: channelPayload.manifest_sha256,
        source_dirty: source.dirty,
      },
      null,
      2,
    )}\n`,
  );
};

build().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
