import "./svg-lab.css";

import { buildThoughtRawSvg, canonicalThoughtText } from "./svg-raw-renderer";

const $ = <T extends HTMLElement>(id: string) => {
  const element = document.getElementById(id);
  if (!element) {
    throw new Error(`missing #${id}`);
  }
  return element as T;
};

const preview = $("svg-preview");
const raw = $("svg-raw");
const meta = $("svg-meta");
const fontCompare = $("svg-font-compare");
const textInput = $<HTMLTextAreaElement>("svg-text");
const tokenIdInput = $<HTMLInputElement>("svg-token-id");
const blockSizeInput = $<HTMLInputElement>("svg-block-size");
const blockGapInput = $<HTMLInputElement>("svg-block-gap");
const blockYInput = $<HTMLInputElement>("svg-block-y");
const textYInput = $<HTMLInputElement>("svg-text-y");
const fontSizeInput = $<HTMLInputElement>("svg-font-size");
const textColorInput = $<HTMLInputElement>("svg-text-color");
const textColorPicker = $<HTMLInputElement>("svg-text-color-picker");
const textOpacityInput = $<HTMLInputElement>("svg-text-opacity");
const copyButton = $<HTMLButtonElement>("svg-copy");
const resetButton = $<HTMLButtonElement>("svg-reset");

const defaults = {
  text: "CAT",
  tokenId: "1",
  blockSize: "29",
  blockGap: "6",
  blockY: "",
  textY: "932",
  fontSize: "18",
  textColor: "#ffffff",
  textOpacity: "0.72",
};

const compactFontStack = ["Source Code Pro, monospace"];

const readNumber = (input: HTMLInputElement, fallback: number) => {
  const parsed = Number(input.value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const render = () => {
  const svg = buildThoughtRawSvg({
    text: textInput.value,
    tokenId: tokenIdInput.value || "dev",
    blockSize: readNumber(blockSizeInput, Number(defaults.blockSize)),
    blockGap: readNumber(blockGapInput, Number(defaults.blockGap)),
    blockY: blockYInput.value.trim() ? readNumber(blockYInput, 465) : undefined,
    textY: readNumber(textYInput, Number(defaults.textY)),
    fontSize: readNumber(fontSizeInput, Number(defaults.fontSize)),
    textFill: textColorInput.value.trim() || defaults.textColor,
    textOpacity: textOpacityInput.value.trim() || defaults.textOpacity,
  });

  preview.innerHTML = svg;
  raw.textContent = svg;
  const canonical = canonicalThoughtText(textInput.value);
  meta.textContent = `${canonical.length} chars. ${new TextEncoder().encode(svg).length} svg bytes. canonical: "${canonical}"`;
  fontCompare.replaceChildren(
    ...compactFontStack.map((font) => {
      const row = document.createElement("div");
      row.className = "svg-lab__font-row";

      const name = document.createElement("span");
      name.className = "svg-lab__font-name";
      name.textContent = font;

      const sample = document.createElement("span");
      sample.className = "svg-lab__font-sample";
      sample.textContent = canonical || "THOUGHT";
      sample.style.fontFamily = font;
      sample.style.fontSize = `${readNumber(fontSizeInput, Number(defaults.fontSize))}px`;
      sample.style.fontWeight = "200";
      sample.style.color = textColorInput.value.trim() || defaults.textColor;
      sample.style.opacity = textOpacityInput.value.trim() || defaults.textOpacity;

      row.replaceChildren(name, sample);
      return row;
    }),
  );
};

const reset = () => {
  textInput.value = defaults.text;
  tokenIdInput.value = defaults.tokenId;
  blockSizeInput.value = defaults.blockSize;
  blockGapInput.value = defaults.blockGap;
  blockYInput.value = defaults.blockY;
  textYInput.value = defaults.textY;
  fontSizeInput.value = defaults.fontSize;
  textColorInput.value = defaults.textColor;
  textColorPicker.value = defaults.textColor;
  textOpacityInput.value = defaults.textOpacity;
  render();
};

[
  textInput,
  tokenIdInput,
  blockSizeInput,
  blockGapInput,
  blockYInput,
  textYInput,
  fontSizeInput,
  textColorInput,
  textOpacityInput,
].forEach((input) => input.addEventListener("input", render));

textColorPicker.addEventListener("input", () => {
  textColorInput.value = textColorPicker.value;
  render();
});

textColorInput.addEventListener("input", () => {
  const value = textColorInput.value.trim();
  if (/^#[0-9a-f]{6}$/i.test(value)) {
    textColorPicker.value = value;
  }
});

copyButton.addEventListener("click", async () => {
  const text = raw.textContent ?? "";
  await navigator.clipboard.writeText(text);
  copyButton.textContent = "[ copied ]";
  window.setTimeout(() => {
    copyButton.textContent = "[ copy raw ]";
  }, 1000);
});

resetButton.addEventListener("click", reset);

reset();
