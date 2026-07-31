import "./thought-v2-source-code-pro-weight-lab.css";

import {
  THOUGHT_CHAT_STUDY_KINDS,
  thoughtChatStudyWorks,
  type ThoughtChatStudyKind,
  type ThoughtChatStudyWork,
} from "./thought-v2-chat-study-corpus";

type ThemeMode = "light" | "dark";
type ThemePreference = ThemeMode | "auto";
type FixtureFilter = ThoughtChatStudyKind | "all";

type GeneratedStudyManifest = {
  schema: string;
  fixtureCount: number;
  package: {
    face: string;
    family: string;
    manifestSha256: string;
    releaseCommit: string;
    releaseTag: string;
    version: string;
    weight: number;
  };
  renderer: {
    id: string;
    maxColumns: number;
    maxRows: number;
    wrapProfile: string;
  };
  works: Array<{
    file: string;
    id: string;
    svgSha256: string;
  }>;
};

const PACKAGE_VERSION = "0.1.0";
const PACKAGE_RELEASE_TAG = "v0.1.0";
const PACKAGE_RELEASE_COMMIT = "6fefbfaf762dce0148fe275baafb8e7dd2077beb";
const PACKAGE_MANIFEST_SHA256 =
  "14d734495a8bdc99a98fecbc4f9d76d315c9e2b9fc9b032d5a1fda567258ce11";
const GENERATED_ASSET_ROOT = `/generated/inshell-mono-76/${PACKAGE_VERSION}`;
const GENERATED_MANIFEST_URL = `${GENERATED_ASSET_ROOT}/study-manifest.json`;
const THEME_STORAGE_KEY = "thought-inshell-mono-76-study-theme";

const THUMBNAIL_MIN_SIZE = 96;
const THUMBNAIL_MAX_SIZE = 360;
const THUMBNAIL_DEFAULT_SIZE = 220;
const THUMBNAIL_PRESETS = [96, 160, 240, 320] as const;
const FIXTURE_FILTERS: Array<{
  id: FixtureFilter;
  label: string;
}> = [
  { id: "all", label: "All" },
  { id: "profile-baseline", label: "Profile" },
  { id: "punctuation", label: "Punctuation" },
  { id: "length-boundary", label: "Boundary" },
  { id: "conversation", label: "Conversation" },
];

const systemThemeQuery = window.matchMedia("(prefers-color-scheme: dark)");
const app = document.getElementById("source-code-pro-weight-lab");
if (!app) throw new Error("missing #source-code-pro-weight-lab");

const samples = thoughtChatStudyWorks;
const parameters = new URLSearchParams(window.location.search);
let selectedSampleId = parameters.get("sample") ?? "missing-detail";
if (!samples.some(({ id }) => id === selectedSampleId)) selectedSampleId = samples[0].id;

const normalizeThumbnailSize = (candidate: string | null): number => {
  const parsed = Number(candidate);
  if (!Number.isFinite(parsed)) return THUMBNAIL_DEFAULT_SIZE;
  return Math.min(THUMBNAIL_MAX_SIZE, Math.max(THUMBNAIL_MIN_SIZE, Math.round(parsed)));
};

let thumbnailSize = normalizeThumbnailSize(parameters.get("thumbnailSize"));
const requestedFilter = parameters.get("fixtureFilter");
let fixtureFilter: FixtureFilter =
  requestedFilter === "all" || THOUGHT_CHAT_STUDY_KINDS.some((kind) => kind === requestedFilter)
    ? requestedFilter as FixtureFilter
    : "all";
let themePreference: ThemePreference =
  document.documentElement.dataset.themeMode === "light"
  || document.documentElement.dataset.themeMode === "dark"
    ? document.documentElement.dataset.themeMode
    : "auto";
let themeMode: ThemeMode =
  document.documentElement.dataset.theme === "light" ? "light" : "dark";

const escapeHtml = (value: string): string => value
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;")
  .replaceAll("'", "&#39;");

const selectedSample = (): ThoughtChatStudyWork => {
  const sample = samples.find(({ id }) => id === selectedSampleId);
  if (!sample) throw new Error(`missing selected sample ${selectedSampleId}`);
  return sample;
};

const fixtureKindLabel = (kind: ThoughtChatStudyKind): string =>
  FIXTURE_FILTERS.find(({ id }) => id === kind)?.label ?? kind;

const visibleFixtures = (): ThoughtChatStudyWork[] =>
  fixtureFilter === "all"
    ? samples
    : samples.filter(({ studyKind }) => studyKind === fixtureFilter);

const renderSampleOptions = (): string => THOUGHT_CHAT_STUDY_KINDS.map((kind) => `
  <optgroup label="${fixtureKindLabel(kind)}">
    ${samples.filter(({ studyKind }) => studyKind === kind).map((sample) => `
      <option value="${escapeHtml(sample.id)}"${sample.id === selectedSampleId ? " selected" : ""}>${escapeHtml(sample.name)}</option>
    `).join("")}
  </optgroup>
`).join("");

const artworkUrl = (work: ThoughtChatStudyWork): string =>
  `${GENERATED_ASSET_ROOT}/${encodeURIComponent(work.id)}.svg`;

const artwork = (
  work: ThoughtChatStudyWork,
  label: string,
): string => `
  <img
    class="source-study__artwork"
    src="${artworkUrl(work)}"
    alt="${escapeHtml(label)}"
    width="1024"
    height="1024"
    loading="eager"
    decoding="async"
    draggable="false"
    data-artwork
    data-font-family="Inshell Mono 76"
    data-font-weight="400"
    data-native-svg-paths="true"
  />
`;

const syncUrl = (): void => {
  const next = new URL(window.location.href);
  next.searchParams.set("sample", selectedSampleId);
  next.searchParams.set("thumbnailSize", String(thumbnailSize));
  next.searchParams.set("fixtureFilter", fixtureFilter);
  next.searchParams.delete("promptWeight");
  next.searchParams.delete("agentWeight");
  window.history.replaceState(null, "", next);
};

const applyThemePreference = (
  nextPreference: ThemePreference,
  persist: boolean,
): void => {
  themePreference = nextPreference;
  themeMode = themePreference === "auto"
    ? systemThemeQuery.matches ? "dark" : "light"
    : themePreference;
  document.documentElement.dataset.themeMode = themePreference;
  document.documentElement.dataset.theme = themeMode;
  document.documentElement.style.colorScheme = themeMode;
  app.dataset.pageThemeMode = themePreference;
  app.dataset.pageTheme = themeMode;
  for (const button of app.querySelectorAll<HTMLButtonElement>("button[data-theme]")) {
    button.setAttribute("aria-pressed", button.dataset.theme === themePreference ? "true" : "false");
  }
  if (persist) {
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, themePreference);
    } catch {
      // Theme still applies when storage is unavailable.
    }
  }
};

const render = (): void => {
  const work = selectedSample();
  const fixtureWorks = visibleFixtures();
  const promptBytes = new TextEncoder().encode(work.promptLine).length;
  const agentBytes = new TextEncoder().encode(work.agentLine).length;

  app.innerHTML = `
    <header class="source-study__header">
      <div>
        <p class="source-study__eyebrow">THOUGHT / DETERMINISTIC GLYPH STUDY</p>
        <h1>Inshell Mono 76</h1>
        <p class="source-study__intro">The artwork now uses the pinned Inshell Mono 76 Regular 400 release as native SVG paths. It preserves the exact Source Code Pro Regular geometry for THOUGHT’s closed 76-character table without a browser font, fallback, <code>&lt;text&gt;</code>, or <code>foreignObject</code>.</p>
      </div>
      <div class="source-study__header-tools">
        <div class="source-study__themes" role="group" aria-label="Page color theme">
          <button type="button" data-theme="auto" aria-pressed="${themePreference === "auto"}">AUTO</button>
          <button type="button" data-theme="light" aria-pressed="${themePreference === "light"}">LIGHT</button>
          <button type="button" data-theme="dark" aria-pressed="${themePreference === "dark"}">DARK</button>
        </div>
        <div class="source-study__font-state" aria-live="polite">
          <strong>PINNED NATIVE PATHS</strong>
          <span data-font-status>Checking generated fixture manifest…</span>
        </div>
      </div>
    </header>

    <dl class="source-study__source">
      <div><dt>FACE</dt><dd>Inshell Mono 76 Regular 400</dd></div>
      <div><dt>RELEASE</dt><dd>${PACKAGE_RELEASE_TAG} / ${PACKAGE_RELEASE_COMMIT.slice(0, 12)}</dd></div>
      <div><dt>ART GEOMETRY</dt><dd>48 / 64 / 1024 native-path SVG</dd></div>
      <div><dt>FIXTURES</dt><dd>${samples.length} deterministic works</dd></div>
    </dl>

    <section class="source-study__section" aria-labelledby="focus-title">
      <div class="source-study__section-heading">
        <h2 id="focus-title">Regular 400</h2>
        <p class="source-study__section-copy">This package intentionally contains one reviewed face. There are no prompt/Agent weight controls: synthesizing other weights would no longer be the pinned glyph geometry.</p>
      </div>

      <div class="source-study__mixer">
        <div class="source-study__controls">
          <div class="source-study__control">
            <label for="source-study-sample">CONVERSATION SAMPLE</label>
            <select id="source-study-sample">
              ${renderSampleOptions()}
            </select>
          </div>

          <div class="source-study__identity">
            <div>
              <span>PROMPT / UPPER RIGHT</span>
              <strong>400 Regular</strong>
            </div>
            <div>
              <span>AGENT / LOWER LEFT</span>
              <strong>400 Regular</strong>
            </div>
            <div>
              <span>ADVANCE / WRAP</span>
              <strong>28.8 / 29 cells</strong>
            </div>
            <div>
              <span>RENDERING</span>
              <strong>Native SVG paths</strong>
            </div>
          </div>

          <div class="source-study__pin">
            <span>PACKAGE MANIFEST SHA-256</span>
            <code>${PACKAGE_MANIFEST_SHA256}</code>
          </div>

          <div class="source-study__dialogue">
            <div>
              <span>PROMPT · ${promptBytes} B</span>
              <p>${escapeHtml(work.promptLine)}</p>
            </div>
            <div>
              <span>AGENT · ${agentBytes} B</span>
              <p>${escapeHtml(work.agentLine)}</p>
            </div>
          </div>
        </div>

        <div class="source-study__focus">
          ${artwork(work, `${work.name}, rendered with Inshell Mono 76 Regular 400 native SVG paths`)}
          <div class="source-study__canvas-meta">
            <strong>${escapeHtml(work.name)}</strong>
            <span>${promptBytes} B prompt / ${agentBytes} B Agent</span>
          </div>
        </div>
      </div>
    </section>

    <section
      class="source-study__section"
      aria-labelledby="thumbnail-title"
      style="--fixture-thumbnail-size:${thumbnailSize}px"
    >
      <div class="source-study__section-heading">
        <h2 id="thumbnail-title">Fixture thumbnails</h2>
        <p class="source-study__section-copy">All ${samples.length} works use pre-rendered native-path SVGs from the same pinned face. Scale changes only the displayed image size; glyph geometry, wrapping, and SVG bytes remain fixed.</p>
      </div>

      <div class="source-study__gallery-controls">
        <div class="source-study__scale-control">
          <label for="source-study-thumbnail-size">THUMBNAIL SIZE</label>
          <input
            id="source-study-thumbnail-size"
            type="range"
            min="${THUMBNAIL_MIN_SIZE}"
            max="${THUMBNAIL_MAX_SIZE}"
            step="1"
            value="${thumbnailSize}"
          />
          <output for="source-study-thumbnail-size" data-thumbnail-size-output>${thumbnailSize} PX</output>
        </div>
        <div class="source-study__thumbnail-presets" role="group" aria-label="Thumbnail size presets">
          ${THUMBNAIL_PRESETS.map((size) => `
            <button
              type="button"
              data-thumbnail-preset="${size}"
              aria-pressed="${thumbnailSize === size}"
            >${size}</button>
          `).join("")}
        </div>
        <div class="source-study__fixture-filters" role="group" aria-label="Fixture kind filter">
          ${FIXTURE_FILTERS.map(({ id, label }) => {
            const count = id === "all"
              ? samples.length
              : samples.filter(({ studyKind }) => studyKind === id).length;
            return `
              <button
                type="button"
                data-fixture-filter="${id}"
                aria-pressed="${fixtureFilter === id}"
              >${label} ${count}</button>
            `;
          }).join("")}
        </div>
      </div>

      <div class="source-study__fixture-summary">
        <strong>${fixtureWorks.length} visible works</strong>
        <span>${thumbnailSize} × ${thumbnailSize}px / Inshell Mono 76 / 400</span>
      </div>

      <div class="source-study__fixture-gallery" data-fixture-gallery>
        ${fixtureWorks.map((fixture) => {
          const fixturePromptBytes = new TextEncoder().encode(fixture.promptLine).length;
          const fixtureAgentBytes = new TextEncoder().encode(fixture.agentLine).length;
          const fixtureNumber = samples.findIndex(({ id }) => id === fixture.id) + 1;
          return `
            <article
              class="source-study__fixture-card"
              data-fixture-card="${escapeHtml(fixture.id)}"
              data-fixture-kind="${fixture.studyKind}"
            >
              <button
                type="button"
                class="source-study__fixture-select"
                data-fixture-id="${escapeHtml(fixture.id)}"
                aria-label="Inspect ${escapeHtml(fixture.name)}"
                aria-pressed="${fixture.id === selectedSampleId}"
              >
                ${artwork(fixture, `${fixture.name}, Inshell Mono 76 fixture thumbnail`)}
              </button>
              <div class="source-study__fixture-meta">
                <strong>THOUGHT ${String(fixtureNumber).padStart(2, "0")}</strong>
                <span>${escapeHtml(fixture.name)}</span>
                <small>${fixtureKindLabel(fixture.studyKind)} / P ${fixturePromptBytes} B / A ${fixtureAgentBytes} B</small>
              </div>
            </article>
          `;
        }).join("")}
      </div>
    </section>

    <section class="source-study__section source-study__release" aria-labelledby="release-title">
      <div class="source-study__section-heading">
        <h2 id="release-title">What is fixed</h2>
        <p class="source-study__section-copy">The browser only scales complete SVG files. The release identity, repertoire, outlines, 600-unit advance, Regular 400 weight, line wrapping, frame, and colors are already encoded before the page loads.</p>
      </div>
      <dl class="source-study__release-grid">
        <div><dt>FAMILY</dt><dd>Inshell Mono 76</dd></div>
        <div><dt>UPSTREAM GEOMETRY</dt><dd>Source Code Pro Regular v2.042</dd></div>
        <div><dt>REPERTOIRE</dt><dd>76 exact Terminal English characters</dd></div>
        <div><dt>BROWSER FONT LOOKUP</dt><dd>None inside artwork</dd></div>
        <div><dt>SVG TEXT ELEMENTS</dt><dd>None</dd></div>
        <div><dt>FALLBACK DRIFT</dt><dd>Not possible inside generated artwork</dd></div>
      </dl>
    </section>
  `;

  bindControls();
  syncUrl();
  applyThemePreference(themePreference, false);
  void verifyGeneratedAssets();
};

const bindControls = (): void => {
  app.querySelector<HTMLSelectElement>("#source-study-sample")?.addEventListener("change", (event) => {
    selectedSampleId = (event.currentTarget as HTMLSelectElement).value;
    render();
  });

  for (const button of app.querySelectorAll<HTMLButtonElement>("button[data-theme]")) {
    button.addEventListener("click", () => {
      const nextTheme = button.dataset.theme;
      if (nextTheme === "auto" || nextTheme === "light" || nextTheme === "dark") {
        applyThemePreference(nextTheme, true);
      }
    });
  }

  const thumbnailSlider = app.querySelector<HTMLInputElement>("#source-study-thumbnail-size");
  thumbnailSlider?.addEventListener("input", () => {
    thumbnailSize = normalizeThumbnailSize(thumbnailSlider.value);
    const section = thumbnailSlider.closest<HTMLElement>(".source-study__section");
    section?.style.setProperty("--fixture-thumbnail-size", `${thumbnailSize}px`);
    const output = app.querySelector<HTMLOutputElement>("[data-thumbnail-size-output]");
    if (output) output.value = `${thumbnailSize} PX`;
    const summary = app.querySelector<HTMLElement>(".source-study__fixture-summary span");
    if (summary) {
      summary.textContent = `${thumbnailSize} × ${thumbnailSize}px / Inshell Mono 76 / 400`;
    }
    for (const preset of app.querySelectorAll<HTMLButtonElement>("button[data-thumbnail-preset]")) {
      preset.setAttribute(
        "aria-pressed",
        Number(preset.dataset.thumbnailPreset) === thumbnailSize ? "true" : "false",
      );
    }
    syncUrl();
  });

  for (const button of app.querySelectorAll<HTMLButtonElement>("button[data-thumbnail-preset]")) {
    button.addEventListener("click", () => {
      thumbnailSize = normalizeThumbnailSize(button.dataset.thumbnailPreset ?? null);
      render();
    });
  }

  for (const button of app.querySelectorAll<HTMLButtonElement>("button[data-fixture-filter]")) {
    button.addEventListener("click", () => {
      const nextFilter = button.dataset.fixtureFilter;
      if (nextFilter === "all" || THOUGHT_CHAT_STUDY_KINDS.some((kind) => kind === nextFilter)) {
        fixtureFilter = nextFilter as FixtureFilter;
        render();
      }
    });
  }

  for (const button of app.querySelectorAll<HTMLButtonElement>("button[data-fixture-id]")) {
    button.addEventListener("click", () => {
      const nextFixtureId = button.dataset.fixtureId;
      if (nextFixtureId && samples.some(({ id }) => id === nextFixtureId)) {
        selectedSampleId = nextFixtureId;
        render();
        document.querySelector("#focus-title")?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }
    });
  }
};

const verifyGeneratedAssets = async (): Promise<void> => {
  try {
    const response = await fetch(GENERATED_MANIFEST_URL, { cache: "no-store" });
    if (!response.ok) throw new Error(`manifest HTTP ${response.status}`);
    const manifest = await response.json() as GeneratedStudyManifest;
    const workIds = new Set(manifest.works.map(({ id }) => id));
    const valid = (
      manifest.schema === "inshell.thought.inshell-mono-76-study-assets.v1"
      && manifest.package.version === PACKAGE_VERSION
      && manifest.package.releaseTag === PACKAGE_RELEASE_TAG
      && manifest.package.releaseCommit === PACKAGE_RELEASE_COMMIT
      && manifest.package.manifestSha256 === PACKAGE_MANIFEST_SHA256
      && manifest.package.family === "Inshell Mono 76"
      && manifest.package.face === "Inshell Mono 76 Regular"
      && manifest.package.weight === 400
      && manifest.fixtureCount === samples.length
      && manifest.works.length === samples.length
      && samples.every(({ id }) => workIds.has(id))
      && manifest.renderer.maxColumns === 29
      && manifest.renderer.maxRows === 4
      && manifest.renderer.wrapProfile === "greedy-space-then-fixed-cell-overlong-word"
    );
    if (!valid) throw new Error("generated manifest identity mismatch");

    app.dataset.fontState = "ready";
    app.dataset.loadedWeights = "1";
    app.dataset.fixtureAssets = String(manifest.fixtureCount);
    app.dataset.rendererId = manifest.renderer.id;
    const status = app.querySelector<HTMLElement>("[data-font-status]");
    if (status) {
      status.textContent = `${PACKAGE_RELEASE_TAG} / Regular 400 / ${manifest.fixtureCount} SVGs verified`;
    }
  } catch (error) {
    app.dataset.fontState = "failed";
    const status = app.querySelector<HTMLElement>("[data-font-status]");
    if (status) {
      status.textContent = error instanceof Error ? error.message : "Generated asset verification failed";
    }
  }
};

systemThemeQuery.addEventListener("change", () => {
  if (themePreference === "auto") applyThemePreference("auto", false);
});

render();
