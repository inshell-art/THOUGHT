import "./thought-v2-chat-lab.css";

import {
  loadThoughtV2AnvilGallery,
  optionalTraitValue,
  traitValue,
  type ThoughtV2AnvilRuntime,
  type ThoughtV2OnchainToken,
} from "./thought-v2-anvil-gallery";
import { thoughtChatWorkDetailHref } from "./thought-v2-chat-work";
import {
  THOUGHT_V2_ALLOWED_CHARACTERS,
  THOUGHT_V2_MAX_LINE_BYTES,
} from "./thought-v2-terminal-work-profile";
import { THOUGHT_V2_METADATA_FILTER_TRAIT_ORDER } from "./thought-v2-terminal-study-metadata";

type ThemeMode = "light" | "dark";
type ViewMode = "grid" | "list";
type SortMode = "number-asc" | "prompt-desc" | "agent-desc";

const THEME_STORAGE_KEY = "thought-v2-chat-theme";
const app = document.getElementById("thought-chat-lab");
if (!app) throw new Error("missing #thought-chat-lab");

let themeMode: ThemeMode = document.documentElement.dataset.theme === "light" ? "light" : "dark";
let viewMode: ViewMode = "grid";
let sortMode: SortMode = "number-asc";
let runtime: ThoughtV2AnvilRuntime;
let tokens: ThoughtV2OnchainToken[] = [];

const selectedTraits = new Map<string, Set<string>>(
  THOUGHT_V2_METADATA_FILTER_TRAIT_ORDER.map((traitType) => [traitType, new Set<string>()]),
);

const escapeHtml = (value: string): string => value
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;")
  .replaceAll("'", "&#39;");

const shortHash = (value: string): string => `${value.slice(0, 10)}…${value.slice(-6)}`;

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

const countBy = (values: string[]): Map<string, number> => {
  const counts = new Map<string, number>();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  return counts;
};

const facet = (traitType: string): string => {
  const rawValues = tokens.flatMap((token) => {
    const value = optionalTraitValue(token, traitType);
    return value === undefined ? [] : [value];
  });
  const counts = countBy(rawValues.map(String));
  const numeric = rawValues.every((value) => typeof value === "number");
  const values = [...new Set(rawValues.map(String))]
    .sort(numeric ? (a, b) => Number(a) - Number(b) : (a, b) => a.localeCompare(b));
  const open = numeric ? "" : " open";
  return `
    <details class="chat-filter"${open}>
      <summary>${escapeHtml(traitType)}</summary>
      <div class="chat-filter__options">
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
  app.innerHTML = `
    <header class="chat-gallery__header">
      <div class="chat-gallery__heading">
        <p class="chat-gallery__eyebrow">ANVIL / ONCHAIN TOKENURI()</p>
        <h1>THOUGHT</h1>
        <p class="chat-gallery__intro">The narrow terminal channel where a human and an Agent meet.</p>
      </div>
      <dl class="chat-gallery__summary">
        <div><dt>TOKENS</dt><dd>${tokens.length}</dd></div>
        <div><dt>PROFILE</dt><dd>TERMINAL ENGLISH / ${THOUGHT_V2_ALLOWED_CHARACTERS.length} CHARACTERS</dd></div>
        <div><dt>LINE LIMIT</dt><dd>${THOUGHT_V2_MAX_LINE_BYTES} BYTES EACH</dd></div>
        <div><dt>STATUS</dt><dd>${runtime.gallery.unattested} UNATTESTED / ${runtime.gallery.attested} ATTESTED</dd></div>
      </dl>
    </header>

    <section class="chat-gallery__protocol" aria-label="On-chain protocol status">
      <div><span>CONTRACT</span><strong title="${runtime.contracts.thoughtNft}">${shortHash(runtime.contracts.thoughtNft)}</strong></div>
      <div><span>REGISTERED RELEASE</span><strong title="${runtime.protocolRelease.id}">${shortHash(runtime.protocolRelease.id)}</strong></div>
      <div><span>RENDERER</span><strong>${escapeHtml(runtime.renderer.implementationId)}</strong></div>
      <p>Every card is decoded from ThoughtNFTV2.tokenURI(). The current renderer uses the sealed Inshell Mono 76 v1.0.0 native centerline paths and carries no browser-font dependency.</p>
    </section>

    <section class="chat-gallery__toolbar" aria-label="Gallery controls">
      <label class="chat-gallery__search"><span>SEARCH TOKEN TEXT</span><input type="search" autocomplete="off" placeholder="Prompt or Agent response" /></label>
      <label class="chat-gallery__sort">
        <span>SORT</span>
        <select>
          <option value="number-asc">THOUGHT NUMBER</option>
          <option value="prompt-desc">PROMPT BYTES / HIGH TO LOW</option>
          <option value="agent-desc">AGENT BYTES / HIGH TO LOW</option>
        </select>
      </label>
      <div class="chat-gallery__view" role="group" aria-label="Gallery view">
        <button type="button" data-view="grid" aria-pressed="true">GRID</button>
        <button type="button" data-view="list" aria-pressed="false">LIST</button>
      </div>
      <div class="chat-gallery__themes" role="group" aria-label="Page color theme">
        <button type="button" data-theme="light" aria-pressed="${themeMode === "light"}">LIGHT</button>
        <button type="button" data-theme="dark" aria-pressed="${themeMode === "dark"}">DARK</button>
      </div>
    </section>

    <div class="chat-gallery__collection">
      <aside class="chat-gallery__filters" aria-label="On-chain metadata trait filters">
        <div class="chat-gallery__filter-heading"><span>TRAIT FILTERS</span><button type="button" class="chat-gallery__clear">CLEAR</button></div>
        ${THOUGHT_V2_METADATA_FILTER_TRAIT_ORDER.map(facet).join("")}
      </aside>
      <section class="chat-gallery__works" aria-label="On-chain THOUGHT token gallery">
        <div class="chat-gallery__result-line">
          <p class="chat-gallery__result" role="status" aria-live="polite"></p>
          <p>CLICK A TOKEN FOR TYPED STATE + METADATA + PROVENANCE</p>
        </div>
        <div class="chat-gallery__grid"></div>
      </section>
    </div>
  `;
};

const renderCard = (token: ThoughtV2OnchainToken): HTMLElement => {
  const thought = token.metadata.thought;
  const card = document.createElement("article");
  card.className = "chat-card";
  card.dataset.tokenId = String(token.tokenId);

  const link = document.createElement("a");
  link.className = "chat-card__link";
  link.href = thoughtChatWorkDetailHref(token.tokenId);
  link.setAttribute("aria-label", `Open THOUGHT ${token.tokenId} on-chain detail`);

  const artwork = document.createElement("div");
  artwork.className = "chat-card__artwork";
  const image = document.createElement("img");
  image.src = token.metadata.image;
  image.alt = `THOUGHT ${token.tokenId}: ${thought.promptLine} / ${thought.agentLine}`;
  image.width = 1024;
  image.height = 1024;
  image.loading = "lazy";
  image.decoding = "async";
  artwork.append(image);

  const body = document.createElement("div");
  body.className = "chat-card__body";
  const title = document.createElement("div");
  title.className = "chat-card__title";
  const name = document.createElement("strong");
  name.textContent = `THOUGHT ${String(token.tokenId).padStart(2, "0")}`;
  const status = document.createElement("span");
  status.textContent = thought.creationAttestation.status.toUpperCase();
  title.append(name, status);

  const traits = document.createElement("dl");
  traits.className = "chat-card__traits";
  for (const attribute of token.metadata.attributes) {
    const row = document.createElement("div");
    const term = document.createElement("dt");
    const value = document.createElement("dd");
    term.textContent = attribute.trait_type.toUpperCase();
    value.textContent = String(attribute.value);
    row.append(term, value);
    traits.append(row);
  }
  const hash = document.createElement("p");
  hash.className = "chat-card__hash";
  hash.textContent = `WORK ${shortHash(thought.workHash)} / PATH ${thought.mint.pathId}:${thought.mint.pathSerial}`;
  body.append(title, traits, hash);
  link.append(artwork, body);
  card.append(link);
  return card;
};

const matchesSet = (set: Set<string>, value: string): boolean => set.size === 0 || set.has(value);

const visibleTokens = (): ThoughtV2OnchainToken[] => {
  const search = app.querySelector<HTMLInputElement>(".chat-gallery__search input");
  const query = search?.value.trim().toLocaleLowerCase() ?? "";
  return tokens.filter((token) => {
    for (const [traitType, selectedValues] of selectedTraits) {
      if (selectedValues.size === 0) continue;
      const value = optionalTraitValue(token, traitType);
      if (value === undefined || !matchesSet(selectedValues, String(value))) return false;
    }
    if (!query) return true;
    return [token.metadata.thought.promptLine, token.metadata.thought.agentLine]
      .some((value) => value.toLocaleLowerCase().includes(query));
  }).sort((left, right) => {
    if (sortMode === "prompt-desc") return Number(traitValue(right, "Prompt Bytes")) - Number(traitValue(left, "Prompt Bytes")) || left.tokenId - right.tokenId;
    if (sortMode === "agent-desc") return Number(traitValue(right, "Agent Bytes")) - Number(traitValue(left, "Agent Bytes")) || left.tokenId - right.tokenId;
    return left.tokenId - right.tokenId;
  });
};

const renderGallery = (): void => {
  const grid = app.querySelector<HTMLElement>(".chat-gallery__grid");
  const result = app.querySelector<HTMLElement>(".chat-gallery__result");
  if (!grid || !result) return;
  const visible = visibleTokens();
  grid.replaceChildren(...visible.map(renderCard));
  result.textContent = `${visible.length} OF ${tokens.length} ON-CHAIN TOKENS`;
  app.dataset.galleryReady = "true";
  app.dataset.visibleCount = String(visible.length);
  app.dataset.tokenCount = String(tokens.length);
  app.dataset.metadataAttributes = [...new Set(tokens.map(({ metadata }) => metadata.attributes.length))]
    .sort((left, right) => left - right)
    .join(",");
  app.dataset.source = runtime.gallery.source;
  app.dataset.viewMode = viewMode;
  app.dataset.imageMode = "contract-token-uri";
};

const bindControls = (): void => {
  const filterRoot = app.querySelector<HTMLElement>(".chat-gallery__filters");
  const clear = app.querySelector<HTMLButtonElement>(".chat-gallery__clear");
  const search = app.querySelector<HTMLInputElement>(".chat-gallery__search input");
  const sort = app.querySelector<HTMLSelectElement>(".chat-gallery__sort select");
  if (!filterRoot || !clear || !search || !sort) throw new Error("gallery controls are incomplete");

  filterRoot.addEventListener("change", (event) => {
    const input = (event.target as HTMLElement).closest<HTMLInputElement>("input[data-trait]");
    if (!input) return;
    const set = selectedTraits.get(input.dataset.trait ?? "");
    if (!set) throw new Error(`unknown trait filter: ${input.dataset.trait ?? ""}`);
    if (input.checked) set.add(input.value);
    else set.delete(input.value);
    renderGallery();
  });
  clear.addEventListener("click", () => {
    for (const set of selectedTraits.values()) set.clear();
    for (const input of filterRoot.querySelectorAll<HTMLInputElement>("input[type='checkbox']")) input.checked = false;
    search.value = "";
    renderGallery();
  });
  search.addEventListener("input", renderGallery);
  sort.addEventListener("change", () => {
    sortMode = sort.value as SortMode;
    renderGallery();
  });
  app.querySelector(".chat-gallery__view")?.addEventListener("click", (event) => {
    const button = (event.target as HTMLElement).closest<HTMLButtonElement>("button[data-view]");
    if (!button) return;
    viewMode = button.dataset.view === "list" ? "list" : "grid";
    for (const candidate of app.querySelectorAll<HTMLButtonElement>("button[data-view]")) {
      candidate.setAttribute("aria-pressed", candidate === button ? "true" : "false");
    }
    renderGallery();
  });
  app.querySelector(".chat-gallery__themes")?.addEventListener("click", (event) => {
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
    <section class="chat-gallery__loading" role="status">
      <p>ANVIL / THOUGHTNFTV2.TOKENURI()</p>
      <h1>LOADING ON-CHAIN TOKENS</h1>
      <p>Reading contract metadata, SVG, traits, commitments, and canonical provenance.</p>
    </section>
  `;
  app.dataset.galleryReady = "loading";
};

const renderFailure = (error: unknown): void => {
  const message = error instanceof Error ? error.message : "Unknown gallery error";
  app.innerHTML = `
    <section class="chat-gallery__loading chat-gallery__loading--error" role="alert">
      <p>ANVIL GALLERY NOT READY</p>
      <h1>ON-CHAIN READ FAILED</h1>
      <pre></pre>
      <p>Start a fresh Anvil node, then run <strong>npm run devnode:v2:gallery</strong>.</p>
    </section>
  `;
  const pre = app.querySelector("pre");
  if (pre) pre.textContent = message;
  app.dataset.galleryReady = "error";
};

const main = async (): Promise<void> => {
  renderLoading();
  ({ runtime, tokens } = await loadThoughtV2AnvilGallery());
  renderShell();
  bindControls();
  applyTheme(themeMode, false);
  renderGallery();
};

void main().catch(renderFailure);
