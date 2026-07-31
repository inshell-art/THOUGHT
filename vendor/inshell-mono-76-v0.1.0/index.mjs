import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import {
  assertFace,
  assertSupportedText,
  renderNativeLine,
  unsupportedCharacters
} from "./src/render-core.mjs";

export const MONO_76_REPERTOIRE =
  " ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789.,?!:;'\"-()/&";
export const MONO_76_WEIGHTS = Object.freeze([400]);

const readJson = async (relativePath) =>
  JSON.parse(
    await readFile(
      fileURLToPath(new URL(relativePath, import.meta.url)),
      "utf8"
    )
  );

export const loadMono76Manifest = () => readJson("./manifest.json");

export const listMono76Weights = async () => {
  const manifest = await loadMono76Manifest();
  return manifest.weights.map((record) => structuredClone(record));
};

const resolveWeight = (value) => {
  const normalized = String(value).toLowerCase();
  const aliases = new Map([
    ["400", 400],
    ["regular", 400]
  ]);
  const weight = aliases.get(normalized);
  if (!weight) {
    throw new RangeError(
      `Unknown Inshell Mono 76 weight ${JSON.stringify(value)}; this package contains Regular 400 only`
    );
  }
  return weight;
};

export const loadMono76Weight = async (weight) => {
  const resolved = resolveWeight(weight);
  return assertFace(await readJson(`./fonts/${resolved}/glyphs.json`));
};

export const loadAllMono76Weights = async () =>
  Promise.all(MONO_76_WEIGHTS.map(loadMono76Weight));

export const supportsMono76Text = (face, text) =>
  unsupportedCharacters(face, text).length === 0;

export const assertMono76Text = (face, text) =>
  assertSupportedText(face, text);

export const renderMono76Line = (face, text, options = {}) =>
  renderNativeLine(face, text, options);

export const renderMono76Text = async (
  text,
  { weight = 400, ...options } = {}
) => renderNativeLine(await loadMono76Weight(weight), text, options);
