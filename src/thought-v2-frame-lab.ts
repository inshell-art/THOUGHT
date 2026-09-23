import "./thought-v2-frame-lab.css";

import {
  loadThoughtV2AnvilGallery,
  optionalTraitValue,
  parseEmbeddedSvgDataUri,
  traitValue,
  type ThoughtV2AnvilRuntime,
  type ThoughtV2OnchainToken,
} from "./thought-v2-anvil-gallery";
import {
  renderThoughtV2OuterFrameStudySvg,
  THOUGHT_V2_FRAME_STUDY_CANVAS_SIZE,
  THOUGHT_V2_FRAME_STUDY_DEFAULT_COLOR,
  THOUGHT_V2_FRAME_STUDY_DEFAULT_WIDTH,
  thoughtV2FrameContrastOnBlack,
  thoughtV2FrameStudyGeometry,
} from "./thought-v2-frame-study";
import { thoughtV2MarketplaceWorkHref } from "./thought-v2-marketplace-work";
import { THOUGHT_V2_METADATA_FILTER_TRAIT_ORDER } from "./thought-v2-terminal-study-metadata";

type DensityMode = "large" | "medium" | "small";
type SortMode =
  | "number-asc"
  | "number-desc"
  | "prompt-desc"
  | "agent-desc";
type ThemeMode = "light" | "dark";

const THEME_STORAGE_KEY = "thought-v2-chat-theme";
const FRAME_WIDTH = THOUGHT_V2_FRAME_STUDY_DEFAULT_WIDTH;
const FRAME_COLOR = THOUGHT_V2_FRAME_STUDY_DEFAULT_COLOR;
const FRAME_GEOMETRY = thoughtV2FrameStudyGeometry(FRAME_WIDTH);
const app = document.getElementById("thought-frame-lab");
if (!app) throw new Error("missing #thought-frame-lab");

const parameters = new URLSearchParams(window.location.search);
let densityMode: DensityMode = parameters.get("density") === "large"
  ? "large"
  : parameters.get("density") === "small"
    ? "small"
    : "medium";
let sortMode: SortMode = "number-asc";
let themeMode: ThemeMode = document.documentElement.dataset.theme === "light" ? "light" : "dark";
let runtime: ThoughtV2AnvilRuntime;
let tokens: ThoughtV2OnchainToken[] = [];
const marketplaceImages = new Map<number, string>();
const selectedTraits = new Map<string, Set<string>>(
  THOUGHT_V2_METADATA_FILTER_TRAIT_ORDER.map((traitType) => [traitType, new Set<string>()]),
);

const escapeHtml = (value: string): string => value
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;")
  .replaceAll("'", "&#39;");

const shortHash = (value: string): string => `${value.slice(0, 8)}…${value.slice(-6)}`;

const svgDataUri = (svg: string): string => {
  const bytes = new TextEncoder().encode(svg);
  let binary = "";
  const chunkSize = 0x8000;
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize));
  }
  return `data:image/svg+xml;base64,${btoa(binary)}`;
};

const marketplaceImage = (tokenId: number): string => {
  const image = marketplaceImages.get(tokenId);
  if (!image) throw new Error(`missing marketplace image for THOUGHT ${tokenId}`);
  return image;
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
  next.searchParams.set("frame", String(FRAME_WIDTH));
  next.searchParams.set("color", FRAME_COLOR.slice(1));
  next.searchParams.set("density", densityMode);
  next.searchParams.delete("token");
  window.history.replaceState(null, "", next);
};

const countBy = (values: string[]): Map<string, number> => {
  const counts = new Map<string, number>();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  return counts;
};

const filterFacet = (traitType: string): string => {
  const rawValues = tokens.flatMap((token) => {
    const value = optionalTraitValue(token, traitType);
    return value === undefined ? [] : [value];
  });
  const counts = countBy(rawValues.map(String));
  const numeric = rawValues.length > 0 && rawValues.every((value) => typeof value === "number");
  const values = [...new Set(rawValues.map(String))]
    .sort(numeric ? (a, b) => Number(a) - Number(b) : (a, b) => a.localeCompare(b));
  if (values.length === 0) return "";
  const open = [
    "Creation Attestation",
    "Agent",
    "Model",
  ].includes(traitType) ? " open" : "";
  return `
    <details class="market-filter"${open}>
      <summary>
        <span>${escapeHtml(traitType)}</span>
        <span aria-hidden="true">⌄</span>
      </summary>
      <div class="market-filter__options">
        ${values.map((value) => `
          <label>
            <input type="checkbox" data-trait="${escapeHtml(traitType)}" value="${escapeHtml(value)}" />
            <span>${escapeHtml(value)}</span>
            <output>${counts.get(value) ?? 0}</output>
          </label>
        `).join("")}
      </div>
    </details>
  `;
};

const renderShell = (): void => {
  const firstImage = marketplaceImage(tokens[0]?.tokenId ?? 1);
  const attested = tokens.filter(
    ({ metadata }) => metadata.thought.creationAttestation.status === "Inshell THOUGHT App",
  ).length;
  const contrast = thoughtV2FrameContrastOnBlack(FRAME_COLOR);
  app.innerHTML = `
    <header class="market-topbar">
      <a class="market-brand" href="/thought-v2-frame-lab.html" aria-label="THOUGHT marketplace preview home">
        <span class="market-brand__mark">T</span>
        <span>MARKETPLACE PREVIEW</span>
      </a>
      <label class="market-global-search">
        <span aria-hidden="true">⌕</span>
        <input type="search" placeholder="Search collections and items" disabled />
        <kbd>/</kbd>
      </label>
      <div class="market-topbar__actions">
        <span>ANVIL</span>
        <button type="button" data-theme="light" aria-pressed="${themeMode === "light"}">LIGHT</button>
        <button type="button" data-theme="dark" aria-pressed="${themeMode === "dark"}">DARK</button>
      </div>
    </header>

    <section class="market-cover" aria-label="THOUGHT collection cover">
      <div class="market-cover__terminal">HUMAN → THOUGHT ← AGENT</div>
    </section>

    <section class="market-collection">
      <img class="market-collection__avatar" src="${firstImage}" alt="" />
      <div class="market-collection__identity">
        <p>DISPOSABLE ANVIL / MARKETPLACE RENDER STUDY</p>
        <h1>THOUGHT <span title="Verified candidate preview">✓</span></h1>
        <p>By <strong>INSHELL</strong> · The narrow terminal channel where a human and an Agent meet.</p>
      </div>
      <div class="market-collection__stats">
        <div><strong>${tokens.length}</strong><span>Items</span></div>
        <div><strong>—</strong><span>Floor price</span></div>
        <div><strong>—</strong><span>Total volume</span></div>
        <div><strong>0%</strong><span>Listed</span></div>
        <div><strong>${attested}</strong><span>App attested</span></div>
      </div>
      <div class="market-collection__rule">
        <span>ARTBOARD ${FRAME_GEOMETRY.artboardSize}²</span>
        <span>CANVAS ${THOUGHT_V2_FRAME_STUDY_CANVAS_SIZE}²</span>
        <span>FRAME ${FRAME_WIDTH} / ${FRAME_COLOR}</span>
        <span>CONTRAST ${contrast.toFixed(2)}:1</span>
        <span title="${runtime.contracts.thoughtNft}">CONTRACT ${shortHash(runtime.contracts.thoughtNft)}</span>
      </div>
    </section>

    <nav class="market-tabs" aria-label="Collection sections">
      <button type="button" aria-current="page">ITEMS</button>
      <button type="button" disabled>OFFERS</button>
      <button type="button" disabled>ACTIVITY</button>
      <button type="button" disabled>ANALYTICS</button>
      <button type="button" disabled>ABOUT</button>
    </nav>

    <section class="market-toolbar" aria-label="Marketplace item controls">
      <button class="market-filter-toggle" type="button" aria-expanded="true" title="Toggle filters">
        <span aria-hidden="true">☷</span><span>FILTERS</span>
      </button>
      <label class="market-item-search">
        <span aria-hidden="true">⌕</span>
        <input type="search" autocomplete="off" placeholder="Search by name, prompt, Agent, or declaration" />
      </label>
      <label class="market-sort">
        <span class="sr-only">Sort items</span>
        <select>
          <option value="number-asc">TOKEN ID: LOW TO HIGH</option>
          <option value="number-desc">TOKEN ID: HIGH TO LOW</option>
          <option value="prompt-desc">PROMPT BYTES: HIGH TO LOW</option>
          <option value="agent-desc">AGENT BYTES: HIGH TO LOW</option>
        </select>
      </label>
      <div class="market-density" role="group" aria-label="Item card size">
        <button type="button" data-density="large" aria-label="Large cards" aria-pressed="${densityMode === "large"}"><span>▦</span></button>
        <button type="button" data-density="medium" aria-label="Medium cards" aria-pressed="${densityMode === "medium"}"><span>▦</span></button>
        <button type="button" data-density="small" aria-label="Small cards" aria-pressed="${densityMode === "small"}"><span>▦</span></button>
      </div>
    </section>

    <div class="market-body">
      <aside class="market-sidebar" aria-label="Marketplace filters">
        <div class="market-sidebar__heading">
          <strong>FILTERS</strong>
          <button type="button" class="market-clear">CLEAR</button>
        </div>
        <details class="market-filter" open>
          <summary><span>Status</span><span aria-hidden="true">⌄</span></summary>
          <div class="market-status">
            <button type="button" aria-pressed="true">ALL <span>${tokens.length}</span></button>
            <button type="button" disabled>LISTED <span>0</span></button>
            <button type="button" disabled>NOT LISTED <span>${tokens.length}</span></button>
          </div>
        </details>
        ${THOUGHT_V2_METADATA_FILTER_TRAIT_ORDER.map(filterFacet).join("")}
      </aside>
      <main class="market-results">
        <div class="market-result-line">
          <p class="market-result" role="status" aria-live="polite"></p>
          <p>IMAGES ARE 1024² FE PREVIEWS DERIVED FROM ON-CHAIN TOKENURI()</p>
        </div>
        <div class="market-grid"></div>
      </main>
    </div>
  `;
};

const selectedTraitCount = (): number =>
  [...selectedTraits.values()].reduce((total, values) => total + values.size, 0);

const visibleTokens = (): ThoughtV2OnchainToken[] => {
  const query = app.querySelector<HTMLInputElement>(".market-item-search input")
    ?.value.trim().toLocaleLowerCase() ?? "";
  return tokens.filter((token) => {
    for (const [traitType, selectedValues] of selectedTraits) {
      if (selectedValues.size === 0) continue;
      const value = optionalTraitValue(token, traitType);
      if (value === undefined || !selectedValues.has(String(value))) return false;
    }
    if (!query) return true;
    const thought = token.metadata.thought;
    return [
      token.metadata.name,
      thought.promptLine,
      thought.agentLine,
      thought.records.agent.label,
      thought.records.model.label,
    ].some((value) => value.toLocaleLowerCase().includes(query));
  }).sort((left, right) => {
    if (sortMode === "number-desc") return right.tokenId - left.tokenId;
    if (sortMode === "prompt-desc") {
      return Number(traitValue(right, "Prompt Bytes"))
        - Number(traitValue(left, "Prompt Bytes"))
        || left.tokenId - right.tokenId;
    }
    if (sortMode === "agent-desc") {
      return Number(traitValue(right, "Agent Bytes"))
        - Number(traitValue(left, "Agent Bytes"))
        || left.tokenId - right.tokenId;
    }
    return left.tokenId - right.tokenId;
  });
};

const renderCard = (token: ThoughtV2OnchainToken): HTMLElement => {
  const thought = token.metadata.thought;
  const article = document.createElement("article");
  article.className = "market-card";
  article.dataset.tokenId = String(token.tokenId);
  const link = document.createElement("a");
  link.className = "market-card__link";
  link.href = thoughtV2MarketplaceWorkHref(token.tokenId);
  link.setAttribute("aria-label", `Open THOUGHT ${token.tokenId} marketplace detail`);

  const artwork = document.createElement("div");
  artwork.className = "market-card__artwork";
  const image = document.createElement("img");
  image.src = marketplaceImage(token.tokenId);
  image.alt = `THOUGHT ${token.tokenId}: ${thought.promptLine} / ${thought.agentLine}`;
  image.width = FRAME_GEOMETRY.artboardSize;
  image.height = FRAME_GEOMETRY.artboardSize;
  image.loading = "lazy";
  image.decoding = "async";
  const network = document.createElement("span");
  network.className = "market-card__network";
  network.textContent = "ANVIL";
  artwork.append(image, network);

  const body = document.createElement("div");
  body.className = "market-card__body";
  const collection = document.createElement("p");
  collection.className = "market-card__collection";
  collection.textContent = "THOUGHT ✓";
  const title = document.createElement("h2");
  title.textContent = `THOUGHT #${token.tokenId}`;
  const market = document.createElement("div");
  market.className = "market-card__market";
  const price = document.createElement("div");
  const priceLabel = document.createElement("span");
  priceLabel.textContent = "PRICE";
  const priceValue = document.createElement("strong");
  priceValue.textContent = "NOT LISTED";
  price.append(priceLabel, priceValue);
  const offer = document.createElement("div");
  const offerLabel = document.createElement("span");
  offerLabel.textContent = "TOP OFFER";
  const offerValue = document.createElement("strong");
  offerValue.textContent = "—";
  offer.append(offerLabel, offerValue);
  market.append(price, offer);
  const footer = document.createElement("div");
  footer.className = "market-card__footer";
  const path = document.createElement("span");
  path.textContent = `PATH ${thought.mint.pathId}:${thought.mint.pathSerial}`;
  const attestation = document.createElement("span");
  attestation.textContent = thought.creationAttestation.status === "Inshell THOUGHT App"
    ? "APP ATTESTED"
    : "UNATTESTED";
  footer.append(path, attestation);
  body.append(collection, title, market, footer);
  link.append(artwork, body);
  article.append(link);
  return article;
};

const renderGrid = (): void => {
  const grid = app.querySelector<HTMLElement>(".market-grid");
  const result = app.querySelector<HTMLElement>(".market-result");
  const filterToggle = app.querySelector<HTMLButtonElement>(".market-filter-toggle");
  if (!grid || !result || !filterToggle) return;
  const visible = visibleTokens();
  grid.replaceChildren(...visible.map(renderCard));
  result.textContent = `${visible.length} ITEMS${selectedTraitCount() > 0 ? ` / ${selectedTraitCount()} TRAIT FILTERS` : ""}`;
  app.dataset.galleryReady = "true";
  app.dataset.visibleCount = String(visible.length);
  app.dataset.tokenCount = String(tokens.length);
  app.dataset.density = densityMode;
  app.dataset.canvasSize = String(FRAME_GEOMETRY.canvasSize);
  app.dataset.artboardSize = String(FRAME_GEOMETRY.artboardSize);
  app.dataset.frameWidth = String(FRAME_GEOMETRY.frameWidth);
  app.dataset.frameColor = FRAME_COLOR;
  app.dataset.source = runtime.gallery.source;
  app.dataset.imageMode = "marketplace-preview-from-contract-token-uri";
  syncUrl();
};

const bindControls = (): void => {
  const sidebar = app.querySelector<HTMLElement>(".market-sidebar");
  const clear = app.querySelector<HTMLButtonElement>(".market-clear");
  const search = app.querySelector<HTMLInputElement>(".market-item-search input");
  const sort = app.querySelector<HTMLSelectElement>(".market-sort select");
  const filterToggle = app.querySelector<HTMLButtonElement>(".market-filter-toggle");
  if (!sidebar || !clear || !search || !sort || !filterToggle) {
    throw new Error("marketplace controls are incomplete");
  }
  const filtersInitiallyCollapsed = window.matchMedia("(max-width: 720px)").matches;
  app.dataset.filtersCollapsed = filtersInitiallyCollapsed ? "true" : "false";
  filterToggle.setAttribute("aria-expanded", filtersInitiallyCollapsed ? "false" : "true");

  sidebar.addEventListener("change", (event) => {
    const input = (event.target as HTMLElement).closest<HTMLInputElement>("input[data-trait]");
    if (!input) return;
    const set = selectedTraits.get(input.dataset.trait ?? "");
    if (!set) throw new Error(`unknown trait filter: ${input.dataset.trait ?? ""}`);
    if (input.checked) set.add(input.value);
    else set.delete(input.value);
    renderGrid();
  });
  clear.addEventListener("click", () => {
    for (const set of selectedTraits.values()) set.clear();
    for (const input of sidebar.querySelectorAll<HTMLInputElement>("input[data-trait]")) {
      input.checked = false;
    }
    search.value = "";
    renderGrid();
  });
  search.addEventListener("input", renderGrid);
  sort.addEventListener("change", () => {
    sortMode = sort.value as SortMode;
    renderGrid();
  });
  filterToggle.addEventListener("click", () => {
    const collapsed = app.dataset.filtersCollapsed === "true";
    app.dataset.filtersCollapsed = collapsed ? "false" : "true";
    filterToggle.setAttribute("aria-expanded", collapsed ? "true" : "false");
  });
  app.querySelector(".market-density")?.addEventListener("click", (event) => {
    const button = (event.target as HTMLElement).closest<HTMLButtonElement>("button[data-density]");
    if (!button) return;
    densityMode = button.dataset.density === "large"
      ? "large"
      : button.dataset.density === "small"
        ? "small"
        : "medium";
    for (const candidate of app.querySelectorAll<HTMLButtonElement>("button[data-density]")) {
      candidate.setAttribute("aria-pressed", candidate === button ? "true" : "false");
    }
    renderGrid();
  });
  app.querySelector(".market-topbar__actions")?.addEventListener("click", (event) => {
    const button = (event.target as HTMLElement).closest<HTMLButtonElement>("button[data-theme]");
    if (button) applyTheme(button.dataset.theme === "light" ? "light" : "dark", true);
  });
  window.addEventListener("storage", (event) => {
    if (event.key === THEME_STORAGE_KEY && (event.newValue === "light" || event.newValue === "dark")) {
      applyTheme(event.newValue, false);
    }
  });
};

const renderLoading = (): void => {
  app.innerHTML = `
    <section class="market-loading" role="status">
      <p>ANVIL / THOUGHTNFTV2.TOKENURI()</p>
      <h1>LOADING MARKETPLACE PREVIEW</h1>
      <p>Applying the fixed 32-unit outer frame to the on-chain corpus.</p>
    </section>
  `;
  app.dataset.galleryReady = "loading";
};

const renderFailure = (error: unknown): void => {
  const message = error instanceof Error ? error.message : "Unknown marketplace-lab error";
  app.innerHTML = `
    <section class="market-loading market-loading--error" role="alert">
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
  for (const token of tokens) {
    const source = parseEmbeddedSvgDataUri(token.metadata.image);
    marketplaceImages.set(
      token.tokenId,
      svgDataUri(renderThoughtV2OuterFrameStudySvg(source, FRAME_WIDTH, FRAME_COLOR)),
    );
  }
  renderShell();
  bindControls();
  applyTheme(themeMode, false);
  renderGrid();
};

void main().catch(renderFailure);
