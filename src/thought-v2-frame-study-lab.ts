import "./thought-v2-frame-study-lab.css";

import {
  loadAllFirstSetFonts,
} from "@inshell/thought-glyph-library-first-set";
import {
  loadAllSecondSetFonts,
} from "@inshell/thought-glyph-library-second-set";
import {
  loadAllThirdSetFonts,
} from "@inshell/thought-glyph-library-third-set";
import {
  loadAllFourthSetFonts,
} from "@inshell/thought-glyph-library-fourth-set";
import {
  loadAllFifthSetFonts,
} from "@inshell/thought-glyph-library-fifth-set";

import {
  loadThoughtV2AnvilGallery,
  type ThoughtV2AnvilRuntime,
  type ThoughtV2OnchainToken,
} from "./thought-v2-anvil-gallery";
import {
  loadThoughtV2ClassicBookCurrentCandidate,
} from "./thought-v2-classic-book-current-candidate";
import {
  thoughtChatStudyWorks,
} from "./thought-v2-chat-study-corpus";
import {
  normalizeThoughtV2GlyphStudyStrokeWidth,
  renderThoughtV2GlyphLibraryFrameStudySvg,
  THOUGHT_V2_GLYPH_STUDY_DEFAULT_FOREGROUND,
  THOUGHT_V2_GLYPH_STUDY_MAX_STROKE_WIDTH,
  THOUGHT_V2_GLYPH_STUDY_MIN_STROKE_WIDTH,
  THOUGHT_V2_GLYPH_STUDY_STROKE_WIDTH_STEP,
  type ThoughtV2GlyphStudyFont,
} from "./thought-v2-glyph-library-frame-study";
import {
  normalizeThoughtV2FrameColor,
  THOUGHT_V2_FRAME_STUDY_CANVAS_SIZE,
  THOUGHT_V2_FRAME_STUDY_COLOR_PRESET_GROUPS,
  THOUGHT_V2_FRAME_STUDY_DEFAULT_COLOR,
  THOUGHT_V2_FRAME_STUDY_DEFAULT_WIDTH,
  THOUGHT_V2_FRAME_STUDY_MAX_WIDTH,
  thoughtV2FrameContrastOnBlack,
  thoughtV2FrameStudyGeometry,
} from "./thought-v2-frame-study";

type ThemeMode = "light" | "dark";
type ThemePreference = ThemeMode | "auto";
type GlyphSetId =
  | "set-01"
  | "set-02"
  | "set-03"
  | "set-04"
  | "set-05"
  | "candidate";
type GlyphStudyEntry = {
  font: ThoughtV2GlyphStudyFont;
  record: {
    classification?: string;
    construction?: "block-run" | "segment-mask" | "conventional-outline";
    glyphCount: 76;
    memberId: string;
    name: string;
    review?: {
      combined?: "dual-pass-candidate" | "hold";
      foregroundContrast?: "pass";
      metricContract?: "hold";
      sourceGeometry?: "preserved";
      tightProfile?: "approved";
      tileBackgrounds?: "pass";
      visual?: "pass";
    };
    slug: string;
    sourceCandidate?: string;
    sourceGeometry?: {
      memberId: string;
      name: string;
      setId: string;
      slug: string;
    };
    studyContractBaseline?: number;
    type?: "segment-mask" | "stroke-graph" | "routed-path";
    visualBaseline?: number;
  };
  setId: GlyphSetId;
};

const THEME_STORAGE_KEY = "thought-v2-frame-study-theme-mode";
const systemThemeQuery = window.matchMedia("(prefers-color-scheme: dark)");
const app = document.getElementById("thought-frame-lab");
if (!app) throw new Error("missing #thought-frame-lab");

const parameters = new URLSearchParams(window.location.search);
const initialWidth = Number(parameters.get("frame") ?? THOUGHT_V2_FRAME_STUDY_DEFAULT_WIDTH);
const initialColorCandidate = `#${(parameters.get("color") ?? THOUGHT_V2_FRAME_STUDY_DEFAULT_COLOR.slice(1))}`;
const initialTextColorCandidate = `#${(parameters.get("text") ?? THOUGHT_V2_GLYPH_STUDY_DEFAULT_FOREGROUND.slice(1))}`;
const initialGlyphSet = parameters.get("set") ?? "set-03";
const initialGlyphSlug = parameters.get("glyph") ?? "humanist-smooth";
const initialStrokeWidthCandidate = parameters.get("weight");

let frameWidth = thoughtV2FrameStudyGeometry(initialWidth).frameWidth;
let frameColor: string;
let textColor: string;
try {
  frameColor = normalizeThoughtV2FrameColor(initialColorCandidate);
} catch {
  frameColor = THOUGHT_V2_FRAME_STUDY_DEFAULT_COLOR;
}
try {
  textColor = normalizeThoughtV2FrameColor(initialTextColorCandidate);
} catch {
  textColor = THOUGHT_V2_GLYPH_STUDY_DEFAULT_FOREGROUND;
}
let themePreference: ThemePreference =
  document.documentElement.dataset.themeMode === "light"
  || document.documentElement.dataset.themeMode === "dark"
    ? document.documentElement.dataset.themeMode
    : "auto";
let themeMode: ThemeMode = document.documentElement.dataset.theme === "light" ? "light" : "dark";
let focusedTokenId = Number(parameters.get("token") ?? 1);
let runtime: ThoughtV2AnvilRuntime;
let tokens: ThoughtV2OnchainToken[] = [];
let glyphEntries: GlyphStudyEntry[] = [];
let glyphSetId: GlyphSetId = "set-01";
let glyphSlug = "";
let strokeWidthOverride =
  initialStrokeWidthCandidate !== null
  && Number.isFinite(Number(initialStrokeWidthCandidate))
  && Number(initialStrokeWidthCandidate) >= THOUGHT_V2_GLYPH_STUDY_MIN_STROKE_WIDTH
  && Number(initialStrokeWidthCandidate) <= THOUGHT_V2_GLYPH_STUDY_MAX_STROKE_WIDTH
    ? Number(Number(initialStrokeWidthCandidate).toFixed(2))
    : null;
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

const MONO_76_STUDY_ASSET_ROOT = "/generated/inshell-mono-76/0.1.0";

const mono76StudyImage = (token: ThoughtV2OnchainToken): string => {
  const fixture = thoughtChatStudyWorks[token.tokenId - 1];
  if (!fixture) throw new Error(`missing Mono 76 fixture for THOUGHT ${token.tokenId}`);
  if (
    fixture.promptLine !== token.metadata.thought.promptLine
    || fixture.agentLine !== token.metadata.thought.agentLine
  ) {
    throw new Error(`Mono 76 fixture parity failed for THOUGHT ${token.tokenId}`);
  }
  return `${MONO_76_STUDY_ASSET_ROOT}/${encodeURIComponent(fixture.id)}.svg`;
};

const studyImage = (tokenId: number): string => {
  const token = tokens.find((candidate) => candidate.tokenId === tokenId);
  if (!token) throw new Error(`missing THOUGHT ${tokenId}`);
  const glyph = focusedGlyph();
  return svgDataUri(renderThoughtV2GlyphLibraryFrameStudySvg(
    glyph.font,
    token.metadata.thought.promptLine,
    token.metadata.thought.agentLine,
    frameWidth,
    frameColor,
    textColor,
    syntheticStrokeWidth(glyph),
  ));
};

const applyThemePreference = (nextPreference: ThemePreference, persist: boolean): void => {
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
  if (persist) window.localStorage.setItem(THEME_STORAGE_KEY, themePreference);
};

const syncUrl = (): void => {
  const next = new URL(window.location.href);
  next.searchParams.set("frame", String(frameWidth));
  next.searchParams.set("color", frameColor.slice(1));
  next.searchParams.set("text", textColor.slice(1));
  next.searchParams.set("token", String(focusedTokenId));
  next.searchParams.set("set", glyphSetId);
  next.searchParams.set("glyph", glyphSlug);
  if (strokeWidthOverride === null) {
    next.searchParams.delete("weight");
  } else {
    next.searchParams.set("weight", String(strokeWidthOverride));
  }
  window.history.replaceState(null, "", next);
};

const activeGlyphEntries = (): GlyphStudyEntry[] =>
  glyphEntries.filter((entry) => entry.setId === glyphSetId);

const focusedGlyph = (): GlyphStudyEntry => {
  const glyph = activeGlyphEntries().find(({ record }) => record.slug === glyphSlug);
  if (!glyph) throw new Error(`missing ${glyphSetId} glyph family ${glyphSlug}`);
  return glyph;
};

const effectiveStrokeWidth = (glyph: GlyphStudyEntry): number | undefined => {
  if (
    (glyph.setId !== "set-05" && glyph.setId !== "candidate")
    || !glyph.font.renderStyle
  ) return undefined;
  return normalizeThoughtV2GlyphStudyStrokeWidth(
    strokeWidthOverride ?? undefined,
    glyph.font.renderStyle.strokeWidth,
  );
};

const syntheticStrokeWidth = (glyph: GlyphStudyEntry): number | undefined => {
  if (
    strokeWidthOverride === null
    || !glyph.font.renderStyle
    || (
      glyph.setId !== "set-05"
      && glyph.setId !== "candidate"
    )
    || strokeWidthOverride === glyph.font.renderStyle.strokeWidth
  ) return undefined;
  return strokeWidthOverride;
};

const focusedToken = (): ThoughtV2OnchainToken => {
  const token = tokens.find(({ tokenId }) => tokenId === focusedTokenId);
  if (!token) throw new Error(`missing focused THOUGHT ${focusedTokenId}`);
  return token;
};

const renderColorPresets = (
  target: "frame" | "text",
  selectedColor: string,
): string => `
  <div class="frame-control__palette" data-color-palette="${target}">
    <strong>${target.toUpperCase()} PALETTE</strong>
    <div class="frame-control__presets">
      ${THOUGHT_V2_FRAME_STUDY_COLOR_PRESET_GROUPS.map((group) => `
        <div class="frame-control__preset-group" data-preset-group="${group.id}">
          <span class="frame-control__preset-label">${group.label}</span>
          <div class="frame-control__preset-grid">
            ${group.colors.map((color) => `
              <button type="button" data-color-target="${target}" data-color-value="${color}" title="${color}" aria-label="Use ${target} color ${color}" aria-pressed="${color === selectedColor}">
                <span style="background:${color}"></span>${color}
              </button>
            `).join("")}
          </div>
        </div>
      `).join("")}
    </div>
  </div>
`;

const glyphSetLabel = (setId: GlyphSetId): string => {
  if (setId === "set-01") return "SET 1 / 24 FAMILIES";
  if (setId === "set-02") return "SET 2 / 36 FAMILIES / EXPLORATORY";
  if (setId === "set-03") return "SET 3 / 2 FAMILIES / METRIC EXCEPTION";
  if (setId === "set-04") return "SET 4 / 3 FAMILIES / TIGHT TILE";
  if (setId === "set-05") return "SET 5 / 4 FAMILIES / CENTERLINE";
  return "CANDIDATE / CLASSIC BOOK 76 / V19";
};

const renderGlyphFamilyOptions = (): string =>
  activeGlyphEntries().map(({ record, font, setId }, index) => {
    const review = record.review?.combined === "dual-pass-candidate"
      ? " / DUAL PASS"
      : record.review?.combined === "hold"
        ? " / HOLD"
        : record.review?.metricContract === "hold"
          ? " / VISUAL PASS / METRIC HOLD"
          : setId === "set-04"
            ? " / TIGHT V1 / PALETTE"
            : setId === "set-05"
              ? ` / ${record.sourceCandidate ?? "SOURCE"} / CENTERLINE / 400 / V${font.librarySet.version}`
              : setId === "candidate"
                ? ` / ${record.sourceCandidate ?? "SOURCE"} / CURRENT STUDY / V${font.librarySet.version}`
          : "";
    return `<option value="${escapeHtml(record.slug)}"${record.slug === glyphSlug ? " selected" : ""}>${String(index + 1).padStart(2, "0")} / ${escapeHtml(record.name)}${review}</option>`;
  }).join("");

const renderShell = (): void => {
  app.innerHTML = `
    <header class="frame-lab__header">
      <div>
        <p class="frame-lab__eyebrow">ANVIL TOKENURI() INPUT / NATIVE SVG GLYPH STUDY</p>
        <h1>GLYPH SETS 1 + 2 + 3 + 4 + 5 + CANDIDATE</h1>
        <p class="frame-lab__intro">Seventy deterministic native-path glyph families render the exact on-chain prompt and Agent lines: 24 qualified Set 1 families, 36 exploratory Set 2 families, 2 visually accepted conventional-outline Set 3 families with disclosed metric exceptions, 3 Set 4 tight-tile families with canonical Color Font v1 backgrounds and automatic black-or-white glyph paint, 4 released Set 5 conventional monospaced centerline families, and the separately pinned Classic Book 76 current candidate. The black canvas remains 960 × 960; the selected matte expands the artboard without scaling it.</p>
      </div>
      <div class="frame-lab__themes" role="group" aria-label="Page color theme">
        <button type="button" data-theme="auto" aria-pressed="${themePreference === "auto"}">AUTO</button>
        <button type="button" data-theme="light" aria-pressed="${themePreference === "light"}">LIGHT</button>
        <button type="button" data-theme="dark" aria-pressed="${themePreference === "dark"}">DARK</button>
      </div>
    </header>

    <section class="frame-lab__notice">
      <strong>STUDY BOUNDARY</strong>
      <p>Every source line and token fact comes from <code>ThoughtNFTV2.tokenURI()</code> on disposable Anvil. This page replaces the temporary font layer with a selected Set 1 through Set 5 path family or the separately installed Classic Book 76 candidate and applies the adjustable outer frame. Set 3 keeps its native 8-unit geometry and disclosed baseline; no metric correction is applied. Set 4 preserves source paths and optical-normalization matrices while applying its approved tight-v1 tile profile and canonical per-character paint. Released Set 5 remains available unchanged for rollback. The candidate is a private V19 study snapshot, not a formal Set 5 release; it applies its renderer-wide +1 x-origin shift, authored 1.23 stroke, fixed advance 10, round cap/join, no kerning, and no per-glyph spacing offsets. This page does not alter the token, renderer contract, metadata, or provenance.</p>
      <p title="${runtime.contracts.thoughtNft}">CONTRACT ${shortHash(runtime.contracts.thoughtNft)} / ${tokens.length} TOKENS</p>
    </section>

    <section class="frame-lab__controls" aria-label="Outer frame controls">
      <div class="frame-control frame-control--width">
        <label for="frame-width">FRAME WIDTH</label>
        <input id="frame-width" type="range" min="0" max="${THOUGHT_V2_FRAME_STUDY_MAX_WIDTH}" step="1" value="${frameWidth}" />
        <input class="frame-control__number" id="frame-width-number" type="number" min="0" max="${THOUGHT_V2_FRAME_STUDY_MAX_WIDTH}" step="1" value="${frameWidth}" aria-label="Frame width in SVG units" />
        <span>SVG UNITS / SIDE</span>
      </div>
      <div class="frame-control__color-section" data-color-section="frame">
        <div class="frame-control frame-control--color">
          <label for="frame-color">FRAME COLOR</label>
          <input id="frame-color" type="color" value="${frameColor}" />
          <input class="frame-control__hex" id="frame-color-hex" type="text" value="${frameColor}" maxlength="7" spellcheck="false" aria-label="Six-digit frame hex color" />
        </div>
        ${renderColorPresets("frame", frameColor)}
      </div>
      <div class="frame-control__color-section" data-color-section="text">
        <div class="frame-control frame-control--color">
          <label for="text-color">TEXT COLOR</label>
          <input id="text-color" type="color" value="${textColor}" />
          <input class="frame-control__hex" id="text-color-hex" type="text" value="${textColor}" maxlength="7" spellcheck="false" aria-label="Six-digit canvas text hex color" />
        </div>
        <p class="frame-control__policy" data-text-color-policy hidden></p>
        ${renderColorPresets("text", textColor)}
      </div>
    </section>

    <section class="frame-lab__metrics" aria-label="Frame geometry">
      <div><span>INNER CANVAS</span><strong data-metric="canvas">${THOUGHT_V2_FRAME_STUDY_CANVAS_SIZE} × ${THOUGHT_V2_FRAME_STUDY_CANVAS_SIZE}</strong><small>FIXED</small></div>
      <div><span>OUTER ARTBOARD</span><strong data-metric="artboard"></strong><small>DYNAMIC</small></div>
      <div><span>FRAME</span><strong data-metric="frame"></strong><small>NO SCALE</small></div>
      <div><span>FRAME COLOR</span><strong data-metric="frame-color"></strong><small>INDEPENDENT</small></div>
      <div><span>TEXT COLOR</span><strong data-metric="text-color"></strong><small data-metric-note="text-color">INDEPENDENT</small></div>
      <div><span>TEXT CONTRAST / BLACK</span><strong data-metric="contrast"></strong><small data-metric-note="contrast">READABILITY</small></div>
    </section>

    <section class="frame-lab__focus" aria-label="Full-size frame study">
      <div class="frame-lab__focus-heading">
        <div>
          <p>FOCUSED PREVIEW</p>
          <h2 data-focus="name"></h2>
        </div>
        <div class="frame-lab__focus-glyph">
          <label for="glyph-set">GLYPH SET</label>
          <select id="glyph-set">
            <option value="set-01"${glyphSetId === "set-01" ? " selected" : ""}>SET 1 / 24 / QUALIFIED</option>
            <option value="set-02"${glyphSetId === "set-02" ? " selected" : ""}>SET 2 / 36 / EXPLORATORY</option>
            <option value="set-03"${glyphSetId === "set-03" ? " selected" : ""}>SET 3 / 2 / METRIC EXCEPTION</option>
            <option value="set-04"${glyphSetId === "set-04" ? " selected" : ""}>SET 4 / 3 / TIGHT TILE</option>
            <option value="set-05"${glyphSetId === "set-05" ? " selected" : ""}>SET 5 / 4 / CENTERLINE</option>
            <option value="candidate"${glyphSetId === "candidate" ? " selected" : ""}>CANDIDATE / CLASSIC BOOK 76 / V19</option>
          </select>
          <label for="glyph-family">GLYPH FAMILY</label>
          <select id="glyph-family">
            ${renderGlyphFamilyOptions()}
          </select>
          <div class="frame-lab__weight-control" data-glyph-weight-control hidden>
            <label for="glyph-stroke-width">VISUAL WEIGHT / STROKE WIDTH</label>
            <div class="frame-lab__weight-row">
              <input id="glyph-stroke-width" type="range" min="${THOUGHT_V2_GLYPH_STUDY_MIN_STROKE_WIDTH}" max="${THOUGHT_V2_GLYPH_STUDY_MAX_STROKE_WIDTH}" step="${THOUGHT_V2_GLYPH_STUDY_STROKE_WIDTH_STEP}" value="0.82" aria-describedby="glyph-stroke-width-note" />
              <input id="glyph-stroke-width-number" class="frame-control__number" type="number" min="${THOUGHT_V2_GLYPH_STUDY_MIN_STROKE_WIDTH}" max="${THOUGHT_V2_GLYPH_STUDY_MAX_STROKE_WIDTH}" step="${THOUGHT_V2_GLYPH_STUDY_STROKE_WIDTH_STEP}" value="0.82" aria-label="Centerline stroke width" />
              <button type="button" data-reset-glyph-weight>AUTHORED</button>
            </div>
            <small id="glyph-stroke-width-note" data-glyph="weight-note"></small>
          </div>
          <strong data-glyph="name"></strong>
          <span data-glyph="member"></span>
          <small data-glyph="summary"></small>
          <p class="frame-lab__metric-note" data-glyph="metric-note" hidden></p>
        </div>
        <dl>
          <div><dt>PROMPT</dt><dd data-focus="prompt"></dd></div>
          <div><dt>AGENT</dt><dd data-focus="agent"></dd></div>
        </dl>
      </div>
    </section>

    <section class="frame-lab__full-size" aria-label="One-to-one full-size font comparison">
      <div class="frame-lab__full-size-heading">
        <div>
          <p>ONE-TO-ONE VIEW / SIDE BY SIDE</p>
          <h2>FULL-SIZE FONT COMPARISON</h2>
        </div>
        <p><strong data-focus="full-size-dimensions">MONO 1024 × 1024 / BOOK 1024 × 1024</strong><br />1 SVG UNIT = 1 CSS PX</p>
      </div>
      <div class="frame-lab__full-size-viewport">
        <div class="frame-lab__full-size-pair">
          <figure data-full-size-family="mono-76">
            <figcaption>
              <strong>INSHELL MONO 76</strong>
              <span>REGULAR 400 / SOURCE CODE PRO GEOMETRY</span>
            </figcaption>
            <img data-focus="full-size-mono-image" width="1024" height="1024" alt="" />
          </figure>
          <figure data-full-size-family="selected">
            <figcaption>
              <strong data-focus="full-size-selected-family"></strong>
              <span data-focus="full-size-selected-weight"></span>
            </figcaption>
            <img data-focus="full-size-image" width="1024" height="1024" alt="" />
          </figure>
        </div>
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
  const contrast = thoughtV2FrameContrastOnBlack(textColor);
  const glyph = focusedGlyph();
  const usesCanonicalTilePaint = glyph.setId === "set-04";
  const usesCenterlinePaint =
    glyph.setId === "set-05" || glyph.setId === "candidate";
  const artboard = app.querySelector<HTMLElement>('[data-metric="artboard"]');
  const frame = app.querySelector<HTMLElement>('[data-metric="frame"]');
  const contrastOutput = app.querySelector<HTMLElement>('[data-metric="contrast"]');
  const frameColorOutput = app.querySelector<HTMLElement>('[data-metric="frame-color"]');
  const textColorOutput = app.querySelector<HTMLElement>('[data-metric="text-color"]');
  const textColorMetricNote = app.querySelector<HTMLElement>('[data-metric-note="text-color"]');
  const contrastMetricNote = app.querySelector<HTMLElement>('[data-metric-note="contrast"]');
  const textColorSection = app.querySelector<HTMLElement>('[data-color-section="text"]');
  const textColorPolicy = app.querySelector<HTMLElement>("[data-text-color-policy]");
  const textColorPicker = app.querySelector<HTMLInputElement>("#text-color");
  const textColorHex = app.querySelector<HTMLInputElement>("#text-color-hex");
  const glyphName = app.querySelector<HTMLElement>('[data-glyph="name"]');
  const glyphMember = app.querySelector<HTMLElement>('[data-glyph="member"]');
  const glyphSummary = app.querySelector<HTMLElement>('[data-glyph="summary"]');
  const glyphMetricNote = app.querySelector<HTMLElement>('[data-glyph="metric-note"]');
  const weightControl = app.querySelector<HTMLElement>("[data-glyph-weight-control]");
  const weightSlider = app.querySelector<HTMLInputElement>("#glyph-stroke-width");
  const weightNumber = app.querySelector<HTMLInputElement>("#glyph-stroke-width-number");
  const weightReset = app.querySelector<HTMLButtonElement>("[data-reset-glyph-weight]");
  const weightNote = app.querySelector<HTMLElement>('[data-glyph="weight-note"]');
  const authoredStrokeWidth = glyph.font.renderStyle?.strokeWidth;
  const selectedStrokeWidth = effectiveStrokeWidth(glyph);
  const usesSyntheticStroke = syntheticStrokeWidth(glyph) !== undefined;
  if (artboard) artboard.textContent = `${geometry.artboardSize} × ${geometry.artboardSize}`;
  if (frame) frame.textContent = `${geometry.frameWidth} UNITS`;
  if (contrastOutput) {
    contrastOutput.textContent = usesCanonicalTilePaint
      ? "≥ 4.77 : 1"
      : `${contrast.toFixed(2)} : 1`;
  }
  if (frameColorOutput) frameColorOutput.textContent = frameColor;
  if (textColorOutput) {
    textColorOutput.textContent = usesCanonicalTilePaint ? "CANONICAL TILES" : textColor;
  }
  if (textColorMetricNote) {
    textColorMetricNote.textContent = usesCanonicalTilePaint ? "SET 4 FIXED" : "INDEPENDENT";
  }
  if (contrastMetricNote) {
    contrastMetricNote.textContent = usesCanonicalTilePaint ? "PER TILE" : "READABILITY";
  }
  if (textColorSection) textColorSection.dataset.disabled = String(usesCanonicalTilePaint);
  if (textColorPolicy) {
    textColorPolicy.hidden = !usesCanonicalTilePaint;
    textColorPolicy.textContent = usesCanonicalTilePaint
      ? "SET 4 USES CANONICAL COLOR FONT V1 TILE BACKGROUNDS AND AUTOMATIC BLACK-OR-WHITE GLYPHS. MANUAL TEXT COLOR IS RETAINED FOR THE OTHER SETS."
      : "";
  }
  if (textColorPicker) textColorPicker.disabled = usesCanonicalTilePaint;
  if (textColorHex) textColorHex.disabled = usesCanonicalTilePaint;
  for (const button of app.querySelectorAll<HTMLButtonElement>('button[data-color-target="text"]')) {
    button.disabled = usesCanonicalTilePaint;
  }
  if (weightControl) weightControl.hidden = !usesCenterlinePaint;
  if (usesCenterlinePaint && authoredStrokeWidth !== undefined && selectedStrokeWidth !== undefined) {
    if (weightSlider) weightSlider.value = String(selectedStrokeWidth);
    if (weightNumber) weightNumber.value = String(selectedStrokeWidth);
    if (weightReset) {
      weightReset.disabled = strokeWidthOverride === null;
      weightReset.setAttribute("aria-pressed", strokeWidthOverride === null ? "true" : "false");
    }
    if (weightNote) {
      weightNote.textContent = !usesSyntheticStroke
        ? `AUTHORED ${authoredStrokeWidth} / REGULAR 400 / SOURCE WIDTH`
        : `STUDY ${selectedStrokeWidth} / SYNTHETIC WEIGHT / AUTHORED ${authoredStrokeWidth}`;
    }
  }
  if (glyphName) glyphName.textContent = glyph.record.name;
  if (glyphMember) glyphMember.textContent = glyph.record.memberId;
  if (glyphSummary) {
    const review = glyph.record.review?.combined
      ? ` / ${glyph.record.review.combined.toUpperCase().replaceAll("-", " ")}`
      : glyph.record.review?.metricContract === "hold"
        ? " / VISUAL PASS / METRIC HOLD"
        : "";
    const constructionValue = glyph.record.construction ?? glyph.record.type;
    const construction = constructionValue
      ? ` / ${constructionValue.toUpperCase().replaceAll("-", " ")}`
      : glyph.record.classification
        ? ` / ${glyph.record.classification.toUpperCase().replaceAll("-", " ")}`
      : "";
    const sourceGeometry = glyph.setId === "set-04" ? " / SOURCE GEOMETRY PRESERVED" : "";
    const centerline = usesCenterlinePaint
      ? glyph.setId === "candidate"
        ? ` / ${glyph.record.sourceCandidate ?? "SOURCE"} / CANDIDATE V${glyph.font.librarySet.version} / REGULAR 400 / VISUAL WEIGHT ${selectedStrokeWidth} / FILL NONE`
        : ` / ${glyph.record.sourceCandidate ?? "SOURCE"} / SET V${glyph.font.librarySet.version} / REGULAR 400 / VISUAL WEIGHT ${selectedStrokeWidth} / FILL NONE`
      : "";
    glyphSummary.textContent = `${glyphSetLabel(glyph.setId)}${construction}${review}${sourceGeometry}${centerline} / 76 GLYPHS / ↑ ↓ SWITCH`;
  }
  if (glyphMetricNote) {
    const hasMetricException =
      glyph.record.visualBaseline !== undefined
      && glyph.record.studyContractBaseline !== undefined;
    glyphMetricNote.hidden = !usesCanonicalTilePaint && !usesCenterlinePaint && !hasMetricException;
    glyphMetricNote.textContent = usesCanonicalTilePaint
      ? "CANONICAL TILE PAINT / TIGHT V1 / COLOR FONT V1 BACKGROUNDS / AUTO BLACK-WHITE GLYPHS / MANUAL TEXT COLOR DISABLED"
      : usesCenterlinePaint && glyph.font.renderStyle
        ? `CENTERLINE PATHS / ${glyph.setId === "candidate" ? `CANDIDATE V${glyph.font.librarySet.version} / ORIGIN +${glyph.font.composition?.defaultOriginShiftX ?? 0} / NO KERNING / NO GLYPH OFFSETS` : `SET V${glyph.font.librarySet.version}`} / FILL NONE / ${usesSyntheticStroke ? "SYNTHETIC STUDY" : "AUTHORED"} STROKE ${selectedStrokeWidth} / SOURCE ${glyph.font.renderStyle.strokeWidth} / ${glyph.font.renderStyle.strokeLinecap.toUpperCase()} CAP / ${glyph.font.renderStyle.strokeLinejoin.toUpperCase()} JOIN / FIXED ADVANCE ${glyph.font.metrics.fixedAdvanceWidth}`
      : hasMetricException
        ? `METRIC EXCEPTION / NATIVE VISUAL BASELINE ${glyph.record.visualBaseline} / STUDY CONTRACT ${glyph.record.studyContractBaseline} / NO CORRECTION APPLIED`
        : "";
  }
  app.dataset.canvasSize = String(geometry.canvasSize);
  app.dataset.artboardSize = String(geometry.artboardSize);
  app.dataset.frameWidth = String(geometry.frameWidth);
  app.dataset.frameColor = frameColor;
  app.dataset.textColor = usesCanonicalTilePaint ? "canonical-per-tile" : textColor;
  app.dataset.savedTextColor = textColor;
  app.dataset.textColorPolicy = usesCanonicalTilePaint ? "canonical-per-tile" : "manual";
  app.dataset.glyphSet = glyph.setId;
  app.dataset.glyphFamily = glyph.record.slug;
  app.dataset.glyphMemberId = glyph.record.memberId;
  app.dataset.glyphSetVersion = String(glyph.font.librarySet.version);
  if (glyph.font.candidate) {
    app.dataset.glyphCandidateRevision = glyph.font.candidate.revision;
    app.dataset.glyphCandidateStatus = glyph.font.candidate.status;
  } else {
    delete app.dataset.glyphCandidateRevision;
    delete app.dataset.glyphCandidateStatus;
  }
  if (usesCenterlinePaint && authoredStrokeWidth !== undefined && selectedStrokeWidth !== undefined) {
    app.dataset.authoredStrokeWidth = String(authoredStrokeWidth);
    app.dataset.effectiveStrokeWidth = String(selectedStrokeWidth);
    app.dataset.weightMode = usesSyntheticStroke
      ? "synthetic-stroke-study"
      : "authored-regular";
  } else {
    delete app.dataset.authoredStrokeWidth;
    delete app.dataset.effectiveStrokeWidth;
    delete app.dataset.weightMode;
  }
};

const renderFocused = (): void => {
  const token = focusedToken();
  const glyph = focusedGlyph();
  const name = app.querySelector<HTMLElement>('[data-focus="name"]');
  const prompt = app.querySelector<HTMLElement>('[data-focus="prompt"]');
  const agent = app.querySelector<HTMLElement>('[data-focus="agent"]');
  const fullSizeMonoImage = app.querySelector<HTMLImageElement>('[data-focus="full-size-mono-image"]');
  const fullSizeImage = app.querySelector<HTMLImageElement>('[data-focus="full-size-image"]');
  const fullSizeSelectedFamily = app.querySelector<HTMLElement>('[data-focus="full-size-selected-family"]');
  const fullSizeSelectedWeight = app.querySelector<HTMLElement>('[data-focus="full-size-selected-weight"]');
  const fullSizeDimensions = app.querySelector<HTMLElement>('[data-focus="full-size-dimensions"]');
  if (
    !name
    || !prompt
    || !agent
    || !fullSizeMonoImage
    || !fullSizeImage
    || !fullSizeSelectedFamily
    || !fullSizeSelectedWeight
    || !fullSizeDimensions
  ) {
    throw new Error("focused preview is incomplete");
  }
  name.textContent = `THOUGHT ${String(token.tokenId).padStart(2, "0")}`;
  prompt.textContent = token.metadata.thought.promptLine;
  agent.textContent = token.metadata.thought.agentLine;
  const geometry = thoughtV2FrameStudyGeometry(frameWidth);
  fullSizeMonoImage.src = mono76StudyImage(token);
  fullSizeMonoImage.alt = `Inshell Mono 76 Regular 400 one-to-one full-size reference for THOUGHT ${token.tokenId}`;
  fullSizeMonoImage.width = 1024;
  fullSizeMonoImage.height = 1024;
  fullSizeMonoImage.style.width = "1024px";
  fullSizeMonoImage.style.height = "1024px";
  fullSizeMonoImage.dataset.fullSizePixels = "1024";
  fullSizeImage.src = studyImage(token.tokenId);
  fullSizeImage.alt = `${glyph.record.name} one-to-one full-size view for THOUGHT ${token.tokenId}`;
  fullSizeImage.width = geometry.artboardSize;
  fullSizeImage.height = geometry.artboardSize;
  fullSizeImage.style.width = `${geometry.artboardSize}px`;
  fullSizeImage.style.height = `${geometry.artboardSize}px`;
  fullSizeDimensions.textContent =
    `MONO 1024 × 1024 / ${glyph.record.name.toUpperCase()} ${geometry.artboardSize} × ${geometry.artboardSize}`;
  fullSizeImage.dataset.fullSizePixels = String(geometry.artboardSize);
  fullSizeSelectedFamily.textContent = glyph.record.name.toUpperCase();
  const focusedStrokeWidth = effectiveStrokeWidth(glyph);
  const focusedWeightMode = syntheticStrokeWidth(glyph) === undefined
    ? "AUTHORED"
    : "SYNTHETIC";
  fullSizeSelectedWeight.textContent = glyph.setId === "candidate"
    && focusedStrokeWidth !== undefined
    ? `V${glyph.font.librarySet.version} / STROKE ${focusedStrokeWidth} / ORIGIN +${glyph.font.composition?.defaultOriginShiftX ?? 0} / ${focusedWeightMode}`
    : glyph.setId === "set-05" && focusedStrokeWidth !== undefined
      ? `CENTERLINE / SET V${glyph.font.librarySet.version} / STROKE ${focusedStrokeWidth} / ${focusedWeightMode}`
      : glyphSetLabel(glyph.setId);
  app.dataset.focusComparison = "mono-76-vs-selected-full-size";
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
  for (const button of app.querySelectorAll<HTMLButtonElement>('button[data-color-target="frame"]')) {
    button.setAttribute("aria-pressed", button.dataset.colorValue === frameColor ? "true" : "false");
  }
  scheduleStudyRender();
};

const setTextColor = (value: string): void => {
  if (glyphSetId === "set-04") return;
  try {
    textColor = normalizeThoughtV2FrameColor(value);
  } catch {
    return;
  }
  const picker = app.querySelector<HTMLInputElement>("#text-color");
  const hex = app.querySelector<HTMLInputElement>("#text-color-hex");
  if (picker) picker.value = textColor;
  if (hex) hex.value = textColor;
  for (const button of app.querySelectorAll<HTMLButtonElement>('button[data-color-target="text"]')) {
    button.setAttribute("aria-pressed", button.dataset.colorValue === textColor ? "true" : "false");
  }
  scheduleStudyRender();
};

const setGlyphStrokeWidth = (value: number): void => {
  const glyph = focusedGlyph();
  if (
    (glyph.setId !== "set-05" && glyph.setId !== "candidate")
    || !glyph.font.renderStyle
  ) return;
  try {
    strokeWidthOverride = normalizeThoughtV2GlyphStudyStrokeWidth(
      value,
      glyph.font.renderStyle.strokeWidth,
    );
  } catch {
    return;
  }
  const slider = app.querySelector<HTMLInputElement>("#glyph-stroke-width");
  const number = app.querySelector<HTMLInputElement>("#glyph-stroke-width-number");
  if (slider) slider.value = String(strokeWidthOverride);
  if (number) number.value = String(strokeWidthOverride);
  scheduleStudyRender();
};

const resetGlyphStrokeWidth = (): void => {
  if (strokeWidthOverride === null) return;
  strokeWidthOverride = null;
  scheduleStudyRender();
};

const setGlyphFamily = (value: string): void => {
  if (!activeGlyphEntries().some(({ record }) => record.slug === value)) return;
  glyphSlug = value;
  const select = app.querySelector<HTMLSelectElement>("#glyph-family");
  if (select) select.value = glyphSlug;
  scheduleStudyRender();
};

const setGlyphSet = (value: string): void => {
  if (
    value !== "set-01"
    && value !== "set-02"
    && value !== "set-03"
    && value !== "set-04"
    && value !== "set-05"
    && value !== "candidate"
  ) return;
  glyphSetId = value;
  glyphSlug = activeGlyphEntries()[0]?.record.slug ?? "";
  const setSelect = app.querySelector<HTMLSelectElement>("#glyph-set");
  const familySelect = app.querySelector<HTMLSelectElement>("#glyph-family");
  if (setSelect) setSelect.value = glyphSetId;
  if (familySelect) familySelect.innerHTML = renderGlyphFamilyOptions();
  scheduleStudyRender();
};

const cycleGlyphFamily = (direction: -1 | 1): void => {
  const entries = activeGlyphEntries();
  const currentIndex = entries.findIndex(({ record }) => record.slug === glyphSlug);
  if (currentIndex < 0 || entries.length === 0) return;
  const nextIndex = (currentIndex + direction + entries.length) % entries.length;
  const next = entries[nextIndex];
  if (next) setGlyphFamily(next.record.slug);
};

const bindControls = (): void => {
  const slider = app.querySelector<HTMLInputElement>("#frame-width");
  const number = app.querySelector<HTMLInputElement>("#frame-width-number");
  const picker = app.querySelector<HTMLInputElement>("#frame-color");
  const hex = app.querySelector<HTMLInputElement>("#frame-color-hex");
  const textPicker = app.querySelector<HTMLInputElement>("#text-color");
  const textHex = app.querySelector<HTMLInputElement>("#text-color-hex");
  const glyphSet = app.querySelector<HTMLSelectElement>("#glyph-set");
  const glyphFamily = app.querySelector<HTMLSelectElement>("#glyph-family");
  const glyphStrokeWidth = app.querySelector<HTMLInputElement>("#glyph-stroke-width");
  const glyphStrokeWidthNumber = app.querySelector<HTMLInputElement>("#glyph-stroke-width-number");
  const resetGlyphWeight = app.querySelector<HTMLButtonElement>("[data-reset-glyph-weight]");
  const grid = app.querySelector<HTMLElement>(".frame-lab__grid");
  if (
    !slider
    || !number
    || !picker
    || !hex
    || !textPicker
    || !textHex
    || !glyphSet
    || !glyphFamily
    || !glyphStrokeWidth
    || !glyphStrokeWidthNumber
    || !resetGlyphWeight
    || !grid
  ) {
    throw new Error("frame controls are incomplete");
  }

  slider.addEventListener("input", () => setFrameWidth(Number(slider.value)));
  number.addEventListener("input", () => setFrameWidth(Number(number.value)));
  picker.addEventListener("input", () => setFrameColor(picker.value));
  hex.addEventListener("change", () => setFrameColor(hex.value));
  textPicker.addEventListener("input", () => setTextColor(textPicker.value));
  textHex.addEventListener("change", () => setTextColor(textHex.value));
  glyphSet.addEventListener("change", () => setGlyphSet(glyphSet.value));
  glyphFamily.addEventListener("change", () => setGlyphFamily(glyphFamily.value));
  glyphStrokeWidth.addEventListener("input", () => setGlyphStrokeWidth(Number(glyphStrokeWidth.value)));
  glyphStrokeWidthNumber.addEventListener("input", () => setGlyphStrokeWidth(Number(glyphStrokeWidthNumber.value)));
  resetGlyphWeight.addEventListener("click", resetGlyphStrokeWidth);
  app.querySelector(".frame-lab__controls")?.addEventListener("click", (event) => {
    const button = (event.target as HTMLElement).closest<HTMLButtonElement>("button[data-color-target][data-color-value]");
    if (!button?.dataset.colorValue) return;
    if (button.dataset.colorTarget === "text") setTextColor(button.dataset.colorValue);
    if (button.dataset.colorTarget === "frame") setFrameColor(button.dataset.colorValue);
  });
  app.querySelector(".frame-lab__themes")?.addEventListener("click", (event) => {
    const button = (event.target as HTMLElement).closest<HTMLButtonElement>("button[data-theme]");
    const requestedTheme = button?.dataset.theme;
    if (requestedTheme === "auto" || requestedTheme === "light" || requestedTheme === "dark") {
      applyThemePreference(requestedTheme, true);
    }
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
    if (
      event.key === THEME_STORAGE_KEY
      && (event.newValue === "auto" || event.newValue === "light" || event.newValue === "dark")
    ) {
      applyThemePreference(event.newValue, false);
    }
  });
  systemThemeQuery.addEventListener("change", () => {
    if (themePreference === "auto") applyThemePreference("auto", false);
  });
  window.addEventListener("keydown", (event) => {
    if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) return;
    if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return;
    const target = event.target;
    if (
      target instanceof HTMLInputElement
      || target instanceof HTMLSelectElement
      || target instanceof HTMLTextAreaElement
      || (target instanceof HTMLElement && target.isContentEditable)
    ) {
      return;
    }
    event.preventDefault();
    cycleGlyphFamily(event.key === "ArrowUp" ? -1 : 1);
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
  const [
    gallery,
    loadedFirstSet,
    loadedSecondSet,
    loadedThirdSet,
    loadedFourthSet,
    loadedFifthSet,
    loadedClassicBookCandidate,
  ] = await Promise.all([
    loadThoughtV2AnvilGallery(),
    loadAllFirstSetFonts(),
    loadAllSecondSetFonts(),
    loadAllThirdSetFonts(),
    loadAllFourthSetFonts(),
    loadAllFifthSetFonts(),
    loadThoughtV2ClassicBookCurrentCandidate(),
  ]);
  ({ runtime, tokens } = gallery);
  glyphEntries = [
    ...loadedFirstSet.map(({ record, font }) => ({ record, font, setId: "set-01" as const })),
    ...loadedSecondSet.map(({ record, font }) => ({ record, font, setId: "set-02" as const })),
    ...loadedThirdSet.map(({ record, font }) => ({ record, font, setId: "set-03" as const })),
    ...loadedFourthSet.map(({ record, font }) => ({ record, font, setId: "set-04" as const })),
    ...loadedFifthSet.map(({ record, font }) => ({ record, font, setId: "set-05" as const })),
    { ...loadedClassicBookCandidate, setId: "candidate" as const },
  ];
  if (tokens.length === 0) throw new Error("Anvil gallery has no THOUGHT tokens");
  if (
    loadedFirstSet.length !== 24
    || loadedSecondSet.length !== 36
    || loadedThirdSet.length !== 2
    || loadedFourthSet.length !== 3
    || loadedFifthSet.length !== 4
  ) {
    throw new Error(`glyph sets must contain 24 + 36 + 2 + 3 + 4 released families plus 1 candidate, received ${loadedFirstSet.length} + ${loadedSecondSet.length} + ${loadedThirdSet.length} + ${loadedFourthSet.length} + ${loadedFifthSet.length} + 1`);
  }
  const inferredSet = loadedClassicBookCandidate.record.slug === initialGlyphSlug
    ? "candidate"
    : loadedFifthSet.some(({ record }) => record.slug === initialGlyphSlug)
    ? "set-05"
    : loadedFourthSet.some(({ record }) => record.slug === initialGlyphSlug)
      ? "set-04"
      : loadedThirdSet.some(({ record }) => record.slug === initialGlyphSlug)
        ? "set-03"
        : loadedSecondSet.some(({ record }) => record.slug === initialGlyphSlug)
          ? "set-02"
          : "set-01";
  glyphSetId = initialGlyphSet === "set-01"
    || initialGlyphSet === "set-02"
    || initialGlyphSet === "set-03"
    || initialGlyphSet === "set-04"
    || initialGlyphSet === "set-05"
    || initialGlyphSet === "candidate"
    ? initialGlyphSet
    : inferredSet;
  const initialEntries = activeGlyphEntries();
  glyphSlug = initialEntries.some(({ record }) => record.slug === initialGlyphSlug)
    ? initialGlyphSlug ?? initialEntries[0]?.record.slug ?? ""
    : initialEntries[0]?.record.slug ?? "";
  if (!tokens.some(({ tokenId }) => tokenId === focusedTokenId)) focusedTokenId = tokens[0]?.tokenId ?? 1;
  renderShell();
  bindControls();
  applyThemePreference(themePreference, false);
  renderStudy();
};

void main().catch(renderFailure);
