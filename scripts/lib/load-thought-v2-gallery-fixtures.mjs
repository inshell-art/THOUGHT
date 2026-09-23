import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import ts from "typescript";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const sourceFile = path.join(rootDir, "src", "thought-v2-fixtures.ts");
const outputFile = path.join(
  rootDir,
  ".tmp",
  "thought-v2-gallery-fixtures",
  "thought-v2-fixtures.mjs",
);

const compileFixtureModule = async () => {
  const source = await fs.readFile(sourceFile, "utf8");
  const output = ts.transpileModule(source, {
    fileName: sourceFile,
    reportDiagnostics: true,
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ES2022,
      moduleResolution: ts.ModuleResolutionKind.Bundler,
      verbatimModuleSyntax: true,
    },
  });
  const errors = (output.diagnostics ?? []).filter(
    (diagnostic) => diagnostic.category === ts.DiagnosticCategory.Error,
  );
  if (errors.length > 0) {
    throw new Error(
      errors
        .map((diagnostic) => ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n"))
        .join("\n"),
    );
  }

  await fs.mkdir(path.dirname(outputFile), { recursive: true });
  await fs.writeFile(outputFile, output.outputText, "utf8");
  return import(`${pathToFileURL(outputFile).href}?compiled=${Date.now()}`);
};

const assertDisplayLine = (line, label) => {
  const byteLength = Buffer.byteLength(line, "utf8");
  if (byteLength < 1 || byteLength > 64) {
    throw new Error(`${label} must be 1 through 64 UTF-8 bytes; received ${byteLength}`);
  }
};

export const loadThoughtV2GalleryFixtures = async () => {
  const fixtureModule = await compileFixtureModule();
  const sourceFixtures = [
    {
      id: "default",
      name: "default text",
      corpusId: "default",
      corpusName: "default",
      ...fixtureModule.thoughtV2DefaultText,
    },
    ...fixtureModule.thoughtV2TextFixtures,
  ];

  const agentLines = new Map();
  const fixtures = [];
  const omittedDuplicates = [];
  sourceFixtures.forEach((fixture, index) => {
    const label = `fixture ${index + 1} (${fixture.id})`;
    assertDisplayLine(fixture.promptLine, `${label} promptLine`);
    assertDisplayLine(fixture.agentLine, `${label} agentLine`);
    assertDisplayLine(fixtureModule.thoughtV2FixtureDeclaredAgent, `${label} declaredAgent`);
    assertDisplayLine(fixtureModule.thoughtV2FixtureDeclaredModel, `${label} declaredModel`);
    const duplicate = agentLines.get(fixture.agentLine);
    if (duplicate) {
      omittedDuplicates.push({
        sourceNumber: index + 1,
        id: fixture.id,
        name: fixture.name,
        duplicatesSourceNumber: duplicate.sourceNumber,
        duplicatesId: duplicate.id,
      });
      return;
    }
    agentLines.set(fixture.agentLine, { sourceNumber: index + 1, id: fixture.id });
    fixtures.push({
      ...fixture,
      declaredAgent: fixtureModule.thoughtV2FixtureDeclaredAgent,
      declaredModel: fixtureModule.thoughtV2FixtureDeclaredModel,
    });
  });

  return { fixtures, sourceFixtureCount: sourceFixtures.length, omittedDuplicates };
};

export { rootDir };
