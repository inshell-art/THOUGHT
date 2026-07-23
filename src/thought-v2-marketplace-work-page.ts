import "./thought-v2-marketplace-work.css";

import {
  loadThoughtV2AnvilTokenDetail,
  type ThoughtV2AnvilRuntime,
  type ThoughtV2OnchainTokenDetail,
} from "./thought-v2-anvil-gallery";
import {
  renderThoughtV2OuterFrameStudySvg,
  THOUGHT_V2_FRAME_STUDY_DEFAULT_COLOR,
  THOUGHT_V2_FRAME_STUDY_DEFAULT_WIDTH,
  thoughtV2FrameStudyGeometry,
} from "./thought-v2-frame-study";
import {
  parseThoughtV2MarketplaceWorkTokenId,
  thoughtV2MarketplaceWorkHref,
} from "./thought-v2-marketplace-work";

type ThemeMode = "light" | "dark";

const THEME_STORAGE_KEY = "thought-v2-chat-theme";
const FRAME_WIDTH = THOUGHT_V2_FRAME_STUDY_DEFAULT_WIDTH;
const FRAME_COLOR = THOUGHT_V2_FRAME_STUDY_DEFAULT_COLOR;
const FRAME_GEOMETRY = thoughtV2FrameStudyGeometry(FRAME_WIDTH);
const COLLECTION_HREF = `/thought-v2-frame-lab.html?frame=${FRAME_WIDTH}&color=${FRAME_COLOR.slice(1)}&density=medium`;
const app = document.getElementById("thought-marketplace-work");
if (!app) throw new Error("missing #thought-marketplace-work");

let themeMode: ThemeMode = document.documentElement.dataset.theme === "light" ? "light" : "dark";

const escapeHtml = (value: string): string => value
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;")
  .replaceAll("'", "&#39;");

const shortAddress = (value: string): string => `${value.slice(0, 8)}…${value.slice(-6)}`;
const byteLength = (value: string): number => new TextEncoder().encode(value).length;

const svgDataUri = (svg: string): string => {
  const bytes = new TextEncoder().encode(svg);
  let binary = "";
  const chunkSize = 0x8000;
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize));
  }
  return `data:image/svg+xml;base64,${btoa(binary)}`;
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

const fact = (label: string, value: string): string => `
  <div>
    <dt>${escapeHtml(label)}</dt>
    <dd title="${escapeHtml(value)}">${escapeHtml(value)}</dd>
  </div>
`;

const renderLoading = (): void => {
  app.innerHTML = `
    <section class="market-work-loading" role="status">
      <p>ANVIL / THOUGHTNFTV2.TOKENURI()</p>
      <h1>LOADING MARKETPLACE ITEM</h1>
      <p>Checking typed state, metadata, SVG, traits, and provenance parity.</p>
    </section>
  `;
  app.dataset.workReady = "loading";
};

const renderFailure = (error: unknown): void => {
  const message = error instanceof Error ? error.message : "The marketplace item could not be loaded.";
  app.innerHTML = `
    <section class="market-work-loading market-work-loading--error" role="alert">
      <p>ANVIL / MARKETPLACE ITEM</p>
      <h1>ITEM NOT AVAILABLE</h1>
      <pre>${escapeHtml(message)}</pre>
      <a href="${COLLECTION_HREF}">RETURN TO COLLECTION</a>
    </section>
  `;
  app.dataset.workReady = "error";
};

const renderToken = (
  token: ThoughtV2OnchainTokenDetail,
  runtime: ThoughtV2AnvilRuntime,
): void => {
  const thought = token.metadata.thought;
  const direct = token.direct;
  const total = runtime.gallery.mintedSupply;
  const previous = token.tokenId > 1 ? token.tokenId - 1 : undefined;
  const next = token.tokenId < total ? token.tokenId + 1 : undefined;
  const isAttested = thought.creationAttestation.status === "Inshell THOUGHT App";
  const previewSvg = renderThoughtV2OuterFrameStudySvg(
    direct.svg,
    FRAME_WIDTH,
    FRAME_COLOR,
  );
  const previewImage = svgDataUri(previewSvg);
  const provenance = JSON.parse(direct.provenanceJson) as Record<string, unknown>;
  const provenancePretty = JSON.stringify(provenance, null, 2);
  const mintedDate = new Date(Number(direct.mintedAt) * 1000).toISOString();
  document.title = `THOUGHT #${token.tokenId} — Marketplace Item`;
  app.innerHTML = `
    <header class="market-work-topbar">
      <a class="market-work-brand" href="${COLLECTION_HREF}">
        <span>T</span>
        <strong>MARKETPLACE PREVIEW</strong>
      </a>
      <label class="market-work-search">
        <span aria-hidden="true">⌕</span>
        <input type="search" placeholder="Search collections and items" disabled />
        <kbd>/</kbd>
      </label>
      <div class="market-work-themes" role="group" aria-label="Page color theme">
        <span>ANVIL</span>
        <button type="button" data-theme="light" aria-pressed="${themeMode === "light"}">LIGHT</button>
        <button type="button" data-theme="dark" aria-pressed="${themeMode === "dark"}">DARK</button>
      </div>
    </header>

    <nav class="market-work-breadcrumb" aria-label="Item navigation">
      <div>
        <a href="${COLLECTION_HREF}">THOUGHT</a>
        <span>/</span>
        <strong>THOUGHT #${token.tokenId}</strong>
      </div>
      <div class="market-work-paging">
        ${previous
          ? `<a href="${thoughtV2MarketplaceWorkHref(previous)}" aria-label="Previous token">←</a>`
          : '<span aria-hidden="true">←</span>'}
        <span>${token.tokenId} / ${total}</span>
        ${next
          ? `<a href="${thoughtV2MarketplaceWorkHref(next)}" aria-label="Next token">→</a>`
          : '<span aria-hidden="true">→</span>'}
      </div>
    </nav>

    <section class="market-work-primary">
      <div class="market-work-media">
        <div class="market-work-media__bar">
          <span>IMAGE</span>
          <span>${FRAME_GEOMETRY.artboardSize} × ${FRAME_GEOMETRY.artboardSize}</span>
        </div>
        <figure>
          <img src="${previewImage}" width="${FRAME_GEOMETRY.artboardSize}" height="${FRAME_GEOMETRY.artboardSize}" alt="THOUGHT ${token.tokenId}: ${escapeHtml(thought.promptLine)} / ${escapeHtml(thought.agentLine)}" />
        </figure>
        <div class="market-work-media__rule">
          <span>FE MARKETPLACE PREVIEW</span>
          <span>960² CANVAS</span>
          <span>32 FRAME / ${FRAME_COLOR}</span>
          <span>NO SCALE</span>
        </div>
      </div>

      <aside class="market-work-summary">
        <p class="market-work-summary__collection"><a href="${COLLECTION_HREF}">THOUGHT</a> <span>✓</span></p>
        <h1>THOUGHT #${token.tokenId}</h1>
        <p class="market-work-summary__owner">Owned by <strong title="${escapeHtml(direct.owner)}">${escapeHtml(shortAddress(direct.owner))}</strong></p>
        <div class="market-work-summary__badges">
          <span>ERC721</span>
          <span>ANVIL ${runtime.chainId}</span>
          <span>TOKEN #${token.tokenId}</span>
        </div>

        <section class="market-work-sale">
          <p>Current price</p>
          <h2>Not listed</h2>
          <div class="market-work-sale__stats">
            <div><span>Top offer</span><strong>—</strong></div>
            <div><span>Collection floor</span><strong>—</strong></div>
            <div><span>Last sale</span><strong>—</strong></div>
          </div>
          <div class="market-work-sale__actions">
            <button type="button" disabled>BUY NOW</button>
            <button type="button" disabled>MAKE OFFER</button>
          </div>
          <p class="market-work-sale__note">Disposable Anvil preview. No marketplace listing or sale data exists.</p>
        </section>

        <section class="market-work-proof">
          <div>
            <span>CREATION ATTESTATION</span>
            <strong class="${isAttested ? "is-attested" : ""}">${escapeHtml(thought.creationAttestation.status)}</strong>
          </div>
          <div>
            <span>PATH</span>
            <strong>${escapeHtml(`${direct.pathId}:${direct.pathSerial}`)}</strong>
          </div>
          <div>
            <span>DECLARED AGENT</span>
            <strong>${escapeHtml(direct.declaredAgent)}</strong>
          </div>
          <div>
            <span>DECLARED MODEL</span>
            <strong>${escapeHtml(direct.declaredModel)}</strong>
          </div>
        </section>

        <details class="market-work-accordion" open>
          <summary><span>Description</span><span>⌄</span></summary>
          <p>${escapeHtml(token.metadata.description)}</p>
        </details>
        <details class="market-work-accordion">
          <summary><span>Blockchain details</span><span>⌄</span></summary>
          <dl>
            ${fact("Contract", runtime.contracts.thoughtNft)}
            ${fact("Token ID", String(token.tokenId))}
            ${fact("Token standard", "ERC721")}
            ${fact("Chain", `Anvil ${runtime.chainId}`)}
            ${fact("Owner", direct.owner)}
            ${fact("Author / minter", direct.author)}
            ${fact("Minted at", `${direct.mintedAt} / ${mintedDate}`)}
          </dl>
        </details>
      </aside>
    </section>

    <section class="market-work-conversation">
      <header>
        <div>
          <p>EXACT WORK</p>
          <h2>Conversation</h2>
        </div>
        <span>${byteLength(thought.promptLine) + byteLength(thought.agentLine)} BYTES</span>
      </header>
      <div>
        <article>
          <p>PROMPT / ${byteLength(thought.promptLine)} BYTES</p>
          <blockquote>${escapeHtml(thought.promptLine)}</blockquote>
        </article>
        <article>
          <p>AGENT / ${byteLength(thought.agentLine)} BYTES</p>
          <blockquote>${escapeHtml(thought.agentLine)}</blockquote>
        </article>
      </div>
    </section>

    <section class="market-work-section">
      <header>
        <div><p>MARKETPLACE ATTRIBUTES</p><h2>Traits</h2></div>
        <span>${token.metadata.attributes.length} TRAITS</span>
      </header>
      <div class="market-work-traits">
        ${token.metadata.attributes.map((attribute) => `
          <div>
            <span>${escapeHtml(attribute.trait_type)}</span>
            <strong>${escapeHtml(String(attribute.value))}</strong>
          </div>
        `).join("")}
      </div>
      <p class="market-work-section__note">${isAttested
        ? "A valid Creation Attestation gates the filterable Agent and Model traits. Their underlying labels remain declared-unverified."
        : "This token is Unattested, so Agent and Model are absent from marketplace traits. The submitted declarations remain visible above and in provenance."}</p>
    </section>

    <section class="market-work-section">
      <header>
        <div><p>VERIFIER BRIDGE</p><h2>Creation attestation</h2></div>
        <span>${escapeHtml(thought.creationAttestation.status.toUpperCase())}</span>
      </header>
      <dl class="market-work-facts">
        ${fact("Status", thought.creationAttestation.status)}
        ${fact("Profile", thought.creationAttestation.profileId)}
        ${fact("Digest", direct.creationAttestationDigest)}
        ${fact("Verifier", thought.creationAttestation.verifier)}
        ${fact("Current mock authority", runtime.attestation.authority)}
        ${fact("Authority epoch", String(runtime.attestation.authorityEpoch))}
        ${fact("Declared Agent status", thought.declarations.agent.status)}
        ${fact("Declared Model status", thought.declarations.model.status)}
      </dl>
    </section>

    <section class="market-work-section">
      <header>
        <div><p>REGISTERED SELECTION</p><h2>Protocol and renderer</h2></div>
        <span>DISPOSABLE ANVIL</span>
      </header>
      <dl class="market-work-facts">
        ${fact("Protocol release ID", runtime.protocolRelease.id)}
        ${fact("Manifest hash", direct.protocolManifestHash)}
        ${fact("Manifest URI", direct.protocolManifestUri)}
        ${fact("Spec name", direct.specName)}
        ${fact("Spec ID", direct.specId)}
        ${fact("Spec hash", direct.specHash)}
        ${fact("Spec ref", direct.specRef)}
        ${fact("Renderer ID", thought.rendererId)}
        ${fact("Renderer implementation", thought.rendererImplementationId)}
        ${fact("Renderer release ready", String(thought.rendererReleaseReady))}
        ${fact("Metadata profile", thought.metadataProfileId)}
        ${fact("Work profile", thought.workProfileId)}
        ${fact("Work hash", direct.workHash)}
      </dl>
    </section>

    <section class="market-work-section">
      <header>
        <div><p>OPAQUE EXACT BYTES / JCS VERIFIED</p><h2>Canonical provenance</h2></div>
        <span>${byteLength(direct.provenanceJson)} BYTES</span>
      </header>
      <dl class="market-work-facts market-work-facts--provenance">
        ${fact("Schema", String(provenance.schema ?? "unknown"))}
        ${fact("Provenance hash", direct.provenanceHash)}
        ${fact("Source", runtime.gallery.source)}
        ${fact("Direct state parity", "verified")}
      </dl>
      <details class="market-work-json">
        <summary><span>Complete provenance record</span><span>⌄</span></summary>
        <pre data-provenance></pre>
      </details>
    </section>

    <section class="market-work-more">
      <header><h2>More from this collection</h2><a href="${COLLECTION_HREF}">VIEW COLLECTION →</a></header>
      <div>
        ${[previous, next].filter((value): value is number => value !== undefined).map((tokenId) => `
          <a href="${thoughtV2MarketplaceWorkHref(tokenId)}">
            <span>THOUGHT</span>
            <strong>THOUGHT #${tokenId}</strong>
            <small>TOKEN ${tokenId} / ANVIL</small>
          </a>
        `).join("")}
      </div>
    </section>
  `;

  const provenanceNode = app.querySelector<HTMLElement>("[data-provenance]");
  if (provenanceNode) provenanceNode.textContent = provenancePretty;

  app.querySelector(".market-work-themes")?.addEventListener("click", (event) => {
    const button = (event.target as HTMLElement).closest<HTMLButtonElement>("button[data-theme]");
    if (button) applyTheme(button.dataset.theme === "light" ? "light" : "dark", true);
  });
  window.addEventListener("storage", (event) => {
    if (event.key === THEME_STORAGE_KEY && (event.newValue === "light" || event.newValue === "dark")) {
      applyTheme(event.newValue, false);
    }
  });
  applyTheme(themeMode, false);
  app.dataset.workReady = "true";
  app.dataset.tokenId = String(token.tokenId);
  app.dataset.source = runtime.gallery.source;
  app.dataset.canvasSize = String(FRAME_GEOMETRY.canvasSize);
  app.dataset.artboardSize = String(FRAME_GEOMETRY.artboardSize);
  app.dataset.frameWidth = String(FRAME_GEOMETRY.frameWidth);
  app.dataset.frameColor = FRAME_COLOR;
  app.dataset.metadataAttributes = String(token.metadata.attributes.length);
  app.dataset.provenanceBytes = String(byteLength(direct.provenanceJson));
  app.dataset.imageMode = "marketplace-preview-from-contract-svg";
};

const main = async (): Promise<void> => {
  renderLoading();
  const tokenId = parseThoughtV2MarketplaceWorkTokenId(window.location.search);
  const { runtime, token } = await loadThoughtV2AnvilTokenDetail(tokenId);
  renderToken(token, runtime);
};

void main().catch(renderFailure);
