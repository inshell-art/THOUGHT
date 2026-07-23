import "./thought-v2-frame-study-lab.css";

import {
  loadThoughtV2AnvilGallery,
  parseEmbeddedSvgDataUri,
  type ThoughtV2AnvilRuntime,
  type ThoughtV2OnchainToken,
} from "./thought-v2-anvil-gallery";
import {
  normalizeThoughtV2FrameColor,
  renderThoughtV2OuterFrameStudySvg,
  THOUGHT_V2_FRAME_STUDY_CANVAS_SIZE,
  THOUGHT_V2_FRAME_STUDY_COLOR_PRESET_GROUPS,
  THOUGHT_V2_FRAME_STUDY_DEFAULT_COLOR,
  THOUGHT_V2_FRAME_STUDY_DEFAULT_WIDTH,
  THOUGHT_V2_FRAME_STUDY_MAX_WIDTH,
  thoughtV2FrameContrastOnBlack,
  thoughtV2FrameStudyGeometry,
} from "./thought-v2-frame-study";

type ThemeMode = "light" | "dark";

const THEME_STORAGE_KEY = "thought-v2-chat-theme";
const app = document.getElementById("thought-frame-lab");
if (!app) throw new Error("missing #thought-frame-lab");

const parameters = new URLSearchParams(window.location.search);
const initialWidth = Number(parameters.get("frame") ?? THOUGHT_V2_FRAME_STUDY_DEFAULT_WIDTH);
const initialColorCandidate = `#${(parameters.get("color") ?? THOUGHT_V2_FRAME_STUDY_DEFAULT_COLOR.slice(1))}`;

let frameWidth = thoughtV2FrameStudyGeometry(initialWidth).frameWidth;
let frameColor: string;
try {
  frameColor = normalizeThoughtV2FrameColor(initialColorCandidate);
} catch {
  frameColor = THOUGHT_V2_FRAME_STUDY_DEFAULT_COLOR;
}
let themeMode: ThemeMode = document.documentElement.dataset.theme === "light" ? "light" : "dark";
let focusedTokenId = Number(parameters.get("token") ?? 1);
let runtime: ThoughtV2AnvilRuntime;
let tokens: ThoughtV2OnchainToken[] = [];
const sourceSvgs = new Map<number, string>();
let pendingRender = 0;

const escapeHtml = (value: string): string => value
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;")
  .replaceAll("'", "&#39;");

const shortHash = (value: string): string => `${value.slice(0, 10)}…${value.slice(-6)}`;

const svgDataUri = (svg: string): string => {
  const bytes = new TextEncoder().encode(svg);
  let binary = "";
  const chunkSize = 0x8000;
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize));
  }
  return `data:image/svg+xml;base64,${btoa(binary)}`;
};

const studyImage = (tokenId: number): string => {
  const source = sourceSvgs.get(tokenId);
  if (!source) throw new Error(`missing SVG source for THOUGHT ${tokenId}`);
  return svgDataUri(renderThoughtV2OuterFrameStudySvg(source, frameWidth, frameColor));
};

const applyTheme = (nextTheme: ThemeMode, persist: boolean): void => {
  themeMode = nextTheme;
  document.documentElement.dataset.theme = themeMode;
  document.documentElement.style.colorScheme = themeMode;
  app.dataset.pageTheme = themeMode;
  for (const button of app.querySelectorAll<HTMLButtonElement>("button[data-theme]")) {
    button.setAttribute("aria-pressed", button.dataset.theme === themeMode ? "true" : "false");
  }
  if (persist) window.localStorage.setItem(THEME_STORAGE_KEY, themeMode);
};

const syncUrl = (): void => {
  const next = new URL(window.location.href);
  next.searchParams.set("frame", String(frameWidth));
  next.searchParams.set("color", frameColor.slice(1));
  next.searchParams.set("token", String(focusedTokenId));
  window.history.replaceState(null, "", next);
};

const focusedToken = (): ThoughtV2OnchainToken => {
  const token = tokens.find(({ tokenId }) => tokenId === focusedTokenId);
  if (!token) throw new Error(`missing focused THOUGHT ${focusedTokenId}`);
  return token;
};

const renderShell = (): void => {
  app.innerHTML = `
    <header class="frame-lab__header">
      <div>
        <p class="frame-lab__eyebrow">ANVIL TOKENURI() / FE-ONLY COMPOSITION STUDY</p>
        <h1>OUTER FRAME</h1>
        <p class="frame-lab__intro">The black THOUGHT canvas remains exactly 960 × 960. The selected matte expands the SVG artboard around it; no canvas scale is applied.</p>
      </div>
      <div class="frame-lab__themes" role="group" aria-label="Page color theme">
        <button type="button" data-theme="light" aria-pressed="${themeMode === "light"}">LIGHT</button>
        <button type="button" data-theme="dark" aria-pressed="${themeMode === "dark"}">DARK</button>
      </div>
    </header>

    <section class="frame-lab__notice">
      <strong>STUDY BOUNDARY</strong>
      <p>Every source work is decoded from <code>ThoughtNFTV2.tokenURI()</code> on disposable Anvil. This page changes only its preview wrapper. It does not alter the token, renderer contract, metadata, or provenance.</p>
      <p title="${runtime.contracts.thoughtNft}">CONTRACT ${shortHash(runtime.contracts.thoughtNft)} / ${tokens.length} TOKENS</p>
    </section>

    <section class="frame-lab__controls" aria-label="Outer frame controls">
      <div class="frame-control frame-control--width">
        <label for="frame-width">FRAME WIDTH</label>
        <input id="frame-width" type="range" min="0" max="${THOUGHT_V2_FRAME_STUDY_MAX_WIDTH}" step="1" value="${frameWidth}" />
        <input class="frame-control__number" id="frame-width-number" type="number" min="0" max="${THOUGHT_V2_FRAME_STUDY_MAX_WIDTH}" step="1" value="${frameWidth}" aria-label="Frame width in SVG units" />
        <span>SVG UNITS / SIDE</span>
      </div>
      <div class="frame-control frame-control--color">
        <label for="frame-color">FRAME COLOR</label>
        <input id="frame-color" type="color" value="${frameColor}" />
        <input class="frame-control__hex" id="frame-color-hex" type="text" value="${frameColor}" maxlength="7" spellcheck="false" aria-label="Six-digit frame hex color" />
      </div>
      <div class="frame-control__presets" role="group" aria-label="Frame color presets">
        ${THOUGHT_V2_FRAME_STUDY_COLOR_PRESET_GROUPS.map((group) => `
          <div class="frame-control__preset-group" data-preset-group="${group.id}">
            <span class="frame-control__preset-label">${group.label}</span>
            <div class="frame-control__preset-grid">
              ${group.colors.map((color) => `
                <button type="button" data-frame-color="${color}" title="${color}" aria-label="Use frame color ${color}" aria-pressed="${color === frameColor}">
                  <span style="background:${color}"></span>${color}
                </button>
              `).join("")}
            </div>
          </div>
        `).join("")}
      </div>
    </section>

    <section class="frame-lab__metrics" aria-label="Frame geometry">
      <div><span>INNER CANVAS</span><strong data-metric="canvas">${THOUGHT_V2_FRAME_STUDY_CANVAS_SIZE} × ${THOUGHT_V2_FRAME_STUDY_CANVAS_SIZE}</strong><small>FIXED</small></div>
      <div><span>OUTER ARTBOARD</span><strong data-metric="artboard"></strong><small>DYNAMIC</small></div>
      <div><span>FRAME</span><strong data-metric="frame"></strong><small>NO SCALE</small></div>
      <div><span>CONTRAST / BLACK</span><strong data-metric="contrast"></strong><small>FRAME SEPARATION</small></div>
    </section>

    <section class="frame-lab__focus" aria-label="Full-size frame study">
      <div class="frame-lab__focus-heading">
        <div>
          <p>FOCUSED PREVIEW</p>
          <h2 data-focus="name"></h2>
        </div>
        <dl>
          <div><dt>PROMPT</dt><dd data-focus="prompt"></dd></div>
          <div><dt>AGENT</dt><dd data-focus="agent"></dd></div>
        </dl>
      </div>
      <div class="frame-lab__focus-stage">
        <img data-focus="image" alt="" />
      </div>
    </section>

    <section class="frame-lab__gallery" aria-label="Anvil corpus frame studies">
      <div class="frame-lab__gallery-heading">
        <h2>ANVIL CORPUS</h2>
        <p>CLICK A WORK TO FOCUS IT</p>
      </div>
      <div class="frame-lab__grid"></div>
    </section>
  `;
};

const renderMetrics = (): void => {
  const geometry = thoughtV2FrameStudyGeometry(frameWidth);
  const contrast = thoughtV2FrameContrastOnBlack(frameColor);
  const artboard = app.querySelector<HTMLElement>('[data-metric="artboard"]');
  const frame = app.querySelector<HTMLElement>('[data-metric="frame"]');
  const contrastOutput = app.querySelector<HTMLElement>('[data-metric="contrast"]');
  if (artboard) artboard.textContent = `${geometry.artboardSize} × ${geometry.artboardSize}`;
  if (frame) frame.textContent = `${geometry.frameWidth} UNITS`;
  if (contrastOutput) contrastOutput.textContent = `${contrast.toFixed(2)} : 1`;
  app.dataset.canvasSize = String(geometry.canvasSize);
  app.dataset.artboardSize = String(geometry.artboardSize);
  app.dataset.frameWidth = String(geometry.frameWidth);
  app.dataset.frameColor = frameColor;
};

const renderFocused = (): void => {
  const token = focusedToken();
  const name = app.querySelector<HTMLElement>('[data-focus="name"]');
  const prompt = app.querySelector<HTMLElement>('[data-focus="prompt"]');
  const agent = app.querySelector<HTMLElement>('[data-focus="agent"]');
  const image = app.querySelector<HTMLImageElement>('[data-focus="image"]');
  if (!name || !prompt || !agent || !image) throw new Error("focused preview is incomplete");
  name.textContent = `THOUGHT ${String(token.tokenId).padStart(2, "0")}`;
  prompt.textContent = token.metadata.thought.promptLine;
  agent.textContent = token.metadata.thought.agentLine;
  image.src = studyImage(token.tokenId);
  image.alt = `Outer-frame study for THOUGHT ${token.tokenId}`;
};

const renderGrid = (): void => {
  const grid = app.querySelector<HTMLElement>(".frame-lab__grid");
  if (!grid) throw new Error("missing frame-study grid");
  const fragment = document.createDocumentFragment();
  for (const token of tokens) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "frame-card";
    button.dataset.tokenId = String(token.tokenId);
    button.setAttribute("aria-pressed", token.tokenId === focusedTokenId ? "true" : "false");
    const image = document.createElement("img");
    image.src = studyImage(token.tokenId);
    image.alt = "";
    image.loading = "lazy";
    image.decoding = "async";
    const label = document.createElement("span");
    label.textContent = `THOUGHT ${String(token.tokenId).padStart(2, "0")}`;
    button.append(image, label);
    fragment.append(button);
  }
  grid.replaceChildren(fragment);
};

const renderStudy = (): void => {
  renderMetrics();
  renderFocused();
  renderGrid();
  syncUrl();
  app.dataset.galleryReady = "true";
};

const scheduleStudyRender = (): void => {
  window.cancelAnimationFrame(pendingRender);
  pendingRender = window.requestAnimationFrame(renderStudy);
};

const setFrameWidth = (value: number): void => {
  frameWidth = thoughtV2FrameStudyGeometry(value).frameWidth;
  const slider = app.querySelector<HTMLInputElement>("#frame-width");
  const number = app.querySelector<HTMLInputElement>("#frame-width-number");
  if (slider) slider.value = String(frameWidth);
  if (number) number.value = String(frameWidth);
  scheduleStudyRender();
};

const setFrameColor = (value: string): void => {
  try {
    frameColor = normalizeThoughtV2FrameColor(value);
  } catch {
    return;
  }
  const picker = app.querySelector<HTMLInputElement>("#frame-color");
  const hex = app.querySelector<HTMLInputElement>("#frame-color-hex");
  if (picker) picker.value = frameColor;
  if (hex) hex.value = frameColor;
  for (const button of app.querySelectorAll<HTMLButtonElement>("button[data-frame-color]")) {
    button.setAttribute("aria-pressed", button.dataset.frameColor === frameColor ? "true" : "false");
  }
  scheduleStudyRender();
};

const bindControls = (): void => {
  const slider = app.querySelector<HTMLInputElement>("#frame-width");
  const number = app.querySelector<HTMLInputElement>("#frame-width-number");
  const picker = app.querySelector<HTMLInputElement>("#frame-color");
  const hex = app.querySelector<HTMLInputElement>("#frame-color-hex");
  const grid = app.querySelector<HTMLElement>(".frame-lab__grid");
  if (!slider || !number || !picker || !hex || !grid) throw new Error("frame controls are incomplete");

  slider.addEventListener("input", () => setFrameWidth(Number(slider.value)));
  number.addEventListener("input", () => setFrameWidth(Number(number.value)));
  picker.addEventListener("input", () => setFrameColor(picker.value));
  hex.addEventListener("change", () => setFrameColor(hex.value));
  app.querySelector(".frame-control__presets")?.addEventListener("click", (event) => {
    const button = (event.target as HTMLElement).closest<HTMLButtonElement>("button[data-frame-color]");
    if (button?.dataset.frameColor) setFrameColor(button.dataset.frameColor);
  });
  app.querySelector(".frame-lab__themes")?.addEventListener("click", (event) => {
    const button = (event.target as HTMLElement).closest<HTMLButtonElement>("button[data-theme]");
    if (button) applyTheme(button.dataset.theme === "light" ? "light" : "dark", true);
  });
  grid.addEventListener("click", (event) => {
    const button = (event.target as HTMLElement).closest<HTMLButtonElement>(".frame-card[data-token-id]");
    if (!button) return;
    focusedTokenId = Number(button.dataset.tokenId);
    renderFocused();
    for (const candidate of grid.querySelectorAll<HTMLButtonElement>(".frame-card")) {
      candidate.setAttribute("aria-pressed", candidate === button ? "true" : "false");
    }
    syncUrl();
    app.querySelector(".frame-lab__focus")?.scrollIntoView({ behavior: "smooth", block: "start" });
  });
  window.addEventListener("storage", (event) => {
    if (event.key === THEME_STORAGE_KEY && (event.newValue === "light" || event.newValue === "dark")) {
      applyTheme(event.newValue, false);
    }
  });
};

const renderLoading = (): void => {
  app.innerHTML = `
    <section class="frame-lab__loading" role="status">
      <p>ANVIL / THOUGHTNFTV2.TOKENURI()</p>
      <h1>LOADING FRAME STUDY</h1>
      <p>Reading the on-chain corpus without changing it.</p>
    </section>
  `;
  app.dataset.galleryReady = "loading";
};

const renderFailure = (error: unknown): void => {
  const message = error instanceof Error ? error.message : "Unknown frame-lab error";
  app.innerHTML = `
    <section class="frame-lab__loading frame-lab__loading--error" role="alert">
      <p>ANVIL GALLERY NOT READY</p>
      <h1>ON-CHAIN READ FAILED</h1>
      <pre>${escapeHtml(message)}</pre>
      <p>Start a fresh Anvil node, then run <strong>npm run devnode:v2:gallery</strong>.</p>
    </section>
  `;
  app.dataset.galleryReady = "error";
};

const main = async (): Promise<void> => {
  renderLoading();
  ({ runtime, tokens } = await loadThoughtV2AnvilGallery());
  if (tokens.length === 0) throw new Error("Anvil gallery has no THOUGHT tokens");
  if (!tokens.some(({ tokenId }) => tokenId === focusedTokenId)) focusedTokenId = tokens[0]?.tokenId ?? 1;
  for (const token of tokens) sourceSvgs.set(token.tokenId, parseEmbeddedSvgDataUri(token.metadata.image));
  renderShell();
  bindControls();
  applyTheme(themeMode, false);
  renderStudy();
};

void main().catch(renderFailure);
