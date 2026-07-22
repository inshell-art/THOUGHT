import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

import { thoughtChatGalleryFixtures } from "../src/thought-v2-chat-gallery";
import { buildThoughtChatSvg } from "../src/thought-v2-chat-svg";

const [studyId, outputArg] = process.argv.slice(2);
if (!studyId || !outputArg) {
  throw new Error(
    "usage: npm run chat:svg:export -- <study-id> <output.svg>",
  );
}

const fixture = thoughtChatGalleryFixtures.find(({ id }) => id === studyId);
if (!fixture) throw new Error(`unknown THOUGHT chat study: ${studyId}`);

const outputPath = resolve(outputArg);
const svg = buildThoughtChatSvg({
  promptLine: fixture.promptLine,
  agentLine: fixture.agentLine,
  fontProfile: fixture.fontProfile,
});

await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, svg, "utf8");

console.log(JSON.stringify({
  studyId: fixture.id,
  outputPath,
  bytes: new TextEncoder().encode(svg).length,
  renderer: "foreign-object-text-fields",
}));
