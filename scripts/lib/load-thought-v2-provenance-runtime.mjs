import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import ts from "typescript";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const outputDir = path.join(rootDir, ".tmp", "thought-v2-provenance-runtime");

const transpile = async (sourceName, outputName, replacements = []) => {
  const sourceFile = path.join(rootDir, "src", sourceName);
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
  let compiled = output.outputText;
  for (const [from, to] of replacements) compiled = compiled.replaceAll(from, to);
  await fs.writeFile(path.join(outputDir, outputName), compiled, "utf8");
};

export const loadThoughtV2ProvenanceRuntime = async () => {
  await fs.mkdir(outputDir, { recursive: true });
  await transpile("thought-v2-protocol.ts", "thought-v2-protocol.mjs");
  await transpile(
    "thought-v2-provenance.ts",
    "thought-v2-provenance.mjs",
    [["./thought-v2-protocol", "./thought-v2-protocol.mjs"]],
  );
  const cacheKey = Date.now();
  const [protocol, provenance] = await Promise.all([
    import(`${pathToFileURL(path.join(outputDir, "thought-v2-protocol.mjs")).href}?compiled=${cacheKey}`),
    import(`${pathToFileURL(path.join(outputDir, "thought-v2-provenance.mjs")).href}?compiled=${cacheKey}`),
  ]);
  return { protocol, provenance };
};

export { rootDir };
