import "./thought-v2-chat-work.css";

import {
  loadThoughtV2AnvilTokenDetail,
  type ThoughtV2AnvilRuntime,
  type ThoughtV2OnchainTokenDetail,
} from "./thought-v2-anvil-gallery";
import {
  parseThoughtChatWorkTokenId,
  thoughtChatWorkDetailHref,
} from "./thought-v2-chat-work";

type ThemeMode = "light" | "dark";

const THEME_STORAGE_KEY = "thought-v2-chat-theme";
const app = document.getElementById("thought-chat-work");
if (!app) throw new Error("missing #thought-chat-work");
let themeMode: ThemeMode = document.documentElement.dataset.theme === "light" ? "light" : "dark";

const escapeHtml = (value: string): string => value
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;")
  .replaceAll("'", "&#39;");

const shortHash = (value: string): string => `${value.slice(0, 14)}…${value.slice(-10)}`;
const byteLength = (value: string): number => new TextEncoder().encode(value).length;

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

const downloadText = (filename: string, text: string, type: string): void => {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
};

const fact = (label: string, value: string): string => `
  <div><dt>${escapeHtml(label)}</dt><dd title="${escapeHtml(value)}">${escapeHtml(value)}</dd></div>
`;

const renderLoading = (): void => {
  app.innerHTML = `
    <section class="chat-work-error" role="status">
      <p>ANVIL / THOUGHTNFTV2.TOKENURI()</p>
      <h1>LOADING ON-CHAIN TOKEN</h1>
      <p>Checking direct typed state against metadata, SVG, and provenance.</p>
    </section>
  `;
  app.dataset.workReady = "loading";
};

const renderFailure = (error: unknown): void => {
  const message = error instanceof Error ? error.message : "The token could not be loaded.";
  app.classList.add("thought-chat-work--error");
  app.innerHTML = `
    <section class="chat-work-error" role="alert">
      <p>ANVIL / ON-CHAIN TOKEN</p>
      <h1>WORK NOT AVAILABLE</h1>
      <p class="chat-work-error__message"></p>
      <a href="/thought-v2-chat-lab.html">RETURN TO GALLERY</a>
    </section>
  `;
  const node = app.querySelector(".chat-work-error__message");
  if (node) node.textContent = message;
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
  const number = String(token.tokenId).padStart(2, "0");
  const metadataPretty = JSON.stringify(token.metadata, null, 2);
  const provenance = JSON.parse(direct.provenanceJson) as Record<string, unknown>;
  const provenancePretty = JSON.stringify(provenance, null, 2);
  const manifestPretty = JSON.stringify(runtime.protocolRelease.manifest, null, 2);
  const process = provenance.process as {
    agentDeclaration?: { source?: string };
    kind?: string;
    modelDeclaration?: { source?: string };
  } | undefined;
  const mintedDate = new Date(Number(direct.mintedAt) * 1000).toISOString();

  document.title = `THOUGHT ${number} — On-chain V2 Token`;
  app.innerHTML = `
    <header class="chat-work-header">
      <a class="chat-work-header__back" href="/thought-v2-chat-lab.html">← GALLERY</a>
      <p class="chat-work-header__position">THOUGHT ${number} / ${total}</p>
      <nav class="chat-work-header__paging" aria-label="Token navigation">
        ${previous ? `<a href="${thoughtChatWorkDetailHref(previous)}">← PREVIOUS</a>` : "<span>← PREVIOUS</span>"}
        ${next ? `<a href="${thoughtChatWorkDetailHref(next)}">NEXT →</a>` : "<span>NEXT →</span>"}
      </nav>
    </header>

    <section class="chat-work-identity">
      <div>
        <p>ANVIL TOKEN / ONCHAIN TOKENURI()</p>
        <h1>THOUGHT ${number}</h1>
      </div>
      <dl>
        ${fact("CHAIN", String(runtime.chainId))}
        ${fact("CONTRACT", shortHash(runtime.contracts.thoughtNft))}
        ${fact("OWNER", shortHash(direct.owner))}
        ${fact("STATUS", thought.creationAttestation.status)}
      </dl>
    </section>

    <section class="chat-work-controls" aria-label="Page controls">
      <div class="chat-work-controls__body">
        <div class="chat-work-control-group">
          <span>PAGE THEME</span>
          <div class="chat-work-themes">
            <button type="button" data-theme="light" aria-pressed="${themeMode === "light"}">LIGHT</button>
            <button type="button" data-theme="dark" aria-pressed="${themeMode === "dark"}">DARK</button>
          </div>
        </div>
        <p>The artwork is the exact contract image at canonical #00ba00. This page does not reconstruct or recolor it.</p>
      </div>
    </section>

    <figure class="chat-work-artwork">
      <img src="${token.metadata.image}" width="960" height="960" alt="THOUGHT ${token.tokenId}: ${escapeHtml(thought.promptLine)} / ${escapeHtml(thought.agentLine)}" />
    </figure>

    <section class="chat-work-lines" aria-label="Exact work lines">
      <article>
        <header><span>PROMPT LINE</span><span>${byteLength(thought.promptLine)} BYTES</span></header>
        <pre>${escapeHtml(thought.promptLine)}</pre>
      </article>
      <article>
        <header><span>AGENT LINE</span><span>${byteLength(thought.agentLine)} BYTES</span></header>
        <pre>${escapeHtml(thought.agentLine)}</pre>
      </article>
    </section>

    <section class="chat-work-section chat-work-traits">
      <header><div><p>MARKETPLACE METADATA</p><h2>TRAITS / ATTRIBUTES</h2></div><p>${token.metadata.attributes.length} CANONICAL TRAITS</p></header>
      <dl>
        ${token.metadata.attributes.map((attribute) => `
          <div><dt>${escapeHtml(attribute.trait_type)}</dt><dd>${escapeHtml(String(attribute.value))}</dd></div>
        `).join("")}
      </dl>
    </section>

    <section class="chat-work-section">
      <header><div><p>AUTHORITATIVE CONTRACT READBACK</p><h2>TYPED STATE</h2></div><p>PARITY CHECKED</p></header>
      <dl class="chat-work-facts">
        ${fact("Token ID", String(token.tokenId))}
        ${fact("Owner", direct.owner)}
        ${fact("Author / minter", direct.author)}
        ${fact("Minted at", `${direct.mintedAt} / ${mintedDate}`)}
        ${fact("PATH ID", direct.pathId.toString())}
        ${fact("PATH serial", direct.pathSerial.toString())}
        ${fact("Declared Agent", direct.declaredAgent)}
        ${fact("Declared Agent hash", thought.declarations.agent.keccak256)}
        ${fact("Declared Model", direct.declaredModel)}
        ${fact("Declared Model hash", thought.declarations.model.keccak256)}
        ${fact("Declaration status", "declared-unverified")}
        ${fact("Work identity input", "false")}
        ${fact("Prompt hash", thought.promptLineKeccak256)}
        ${fact("Agent hash", thought.agentLineKeccak256)}
        ${fact("Conversation identity", thought.conversationIdentityHash)}
        ${fact("Work hash", direct.workHash)}
        ${fact("Attestation status", thought.creationAttestation.status)}
        ${fact("Attestation digest", direct.creationAttestationDigest)}
        ${fact("Attestation profile", thought.creationAttestation.profileId)}
        ${fact("Attestation verifier", thought.creationAttestation.verifier)}
        ${fact("Current mock authority", runtime.attestation.authority)}
        ${fact("Current authority epoch", String(runtime.attestation.authorityEpoch))}
      </dl>
    </section>

    <section class="chat-work-section">
      <header><div><p>REGISTERED SELECTION</p><h2>PROTOCOL + SPEC + RENDERER</h2></div><p>DISPOSABLE ANVIL</p></header>
      <dl class="chat-work-facts">
        ${fact("Protocol release ID", runtime.protocolRelease.id)}
        ${fact("Manifest hash", direct.protocolManifestHash)}
        ${fact("Manifest URI", direct.protocolManifestUri)}
        ${fact("Release status", runtime.protocolRelease.status)}
        ${fact("Spec name", direct.specName)}
        ${fact("Spec ref", direct.specRef)}
        ${fact("Spec ID", direct.specId)}
        ${fact("Spec hash", direct.specHash)}
        ${fact("Renderer ID", thought.rendererId)}
        ${fact("Renderer implementation", thought.rendererImplementationId)}
        ${fact("Renderer release ready", String(thought.rendererReleaseReady))}
        ${fact("Font hash", runtime.renderer.fontHash)}
        ${fact("Metadata profile", thought.metadataProfileId)}
        ${fact("Work profile", thought.workProfileId)}
      </dl>
      <details class="chat-work-json">
        <summary>COMPLETE DISPOSABLE ANVIL MANIFEST</summary>
        <pre data-json="manifest"></pre>
      </details>
    </section>

    <section class="chat-work-section">
      <header><div><p>EXACT CONTRACT TOKENURI()</p><h2>METADATA</h2></div><p>${byteLength(token.metadataJson)} BYTES</p></header>
      <dl class="chat-work-facts">
        ${fact("Name", token.metadata.name)}
        ${fact("Background", `#${token.metadata.background_color}`)}
        ${fact("Image", "embedded data:image/svg+xml;base64")}
        ${fact("Source", runtime.gallery.source)}
      </dl>
      <div class="chat-work-downloads">
        <button type="button" data-download="metadata">DOWNLOAD METADATA JSON</button>
        <button type="button" data-download="svg">DOWNLOAD CONTRACT SVG</button>
        <button type="button" data-download="manifest">DOWNLOAD DEV MANIFEST</button>
      </div>
      <details class="chat-work-json">
        <summary>COMPLETE TOKEN METADATA JSON</summary>
        <pre data-json="metadata"></pre>
      </details>
    </section>

    <section class="chat-work-section">
      <header><div><p>OPAQUE EXACT BYTES STORED BY THOUGHTNFTV2</p><h2>CANONICAL PROVENANCE</h2></div><p>${byteLength(direct.provenanceJson)} BYTES / JCS VERIFIED</p></header>
      <div class="chat-work-provenance__status">
        <div><span>SCHEMA</span><strong>${escapeHtml(String(provenance.schema))}</strong></div>
        <div><span>KECCAK-256</span><strong>${escapeHtml(direct.provenanceHash)}</strong></div>
        <div><span>PROCESS</span><strong>${escapeHtml(process?.kind ?? "unknown")}</strong></div>
        <div><span>DECLARATION SOURCES</span><strong>${escapeHtml(`${process?.agentDeclaration?.source ?? "unknown"} / ${process?.modelDeclaration?.source ?? "unknown"}`)}</strong></div>
      </div>
      <div class="chat-work-downloads">
        <button type="button" data-download="provenance">DOWNLOAD EXACT PROVENANCE JSON</button>
      </div>
      <details class="chat-work-json" open>
        <summary>COMPLETE PROVENANCE RECORD</summary>
        <pre data-json="provenance"></pre>
      </details>
      <p class="chat-work-section__note">Fixture ID, corpus name, local source file, PATH authorization, PATH ID, token ID, transaction, and mint-success claims are intentionally outside canonical pre-mint provenance.</p>
    </section>
  `;

  const metadataNode = app.querySelector<HTMLElement>('[data-json="metadata"]');
  const provenanceNode = app.querySelector<HTMLElement>('[data-json="provenance"]');
  const manifestNode = app.querySelector<HTMLElement>('[data-json="manifest"]');
  if (metadataNode) metadataNode.textContent = metadataPretty;
  if (provenanceNode) provenanceNode.textContent = provenancePretty;
  if (manifestNode) manifestNode.textContent = manifestPretty;

  app.querySelector(".chat-work-themes")?.addEventListener("click", (event) => {
    const button = (event.target as HTMLElement).closest<HTMLButtonElement>("button[data-theme]");
    if (button) applyTheme(button.dataset.theme === "light" ? "light" : "dark", true);
  });
  app.addEventListener("click", (event) => {
    const button = (event.target as HTMLElement).closest<HTMLButtonElement>("button[data-download]");
    if (!button) return;
    const prefix = `THOUGHT-${token.tokenId}`;
    if (button.dataset.download === "metadata") {
      downloadText(`${prefix}.metadata.json`, token.metadataJson, "application/json;charset=utf-8");
    } else if (button.dataset.download === "provenance") {
      downloadText(`${prefix}.provenance.json`, direct.provenanceJson, "application/json;charset=utf-8");
    } else if (button.dataset.download === "svg") {
      downloadText(`${prefix}.svg`, direct.svg, "image/svg+xml;charset=utf-8");
    } else if (button.dataset.download === "manifest") {
      downloadText("THOUGHT-V2.disposable-anvil-manifest.json", runtime.protocolRelease.manifestJson, "application/json;charset=utf-8");
    }
  });
  window.addEventListener("storage", (event) => {
    if (event.key === THEME_STORAGE_KEY && (event.newValue === "light" || event.newValue === "dark")) {
      applyTheme(event.newValue, false);
    }
  });
  applyTheme(themeMode, false);
  app.dataset.workReady = "true";
  app.dataset.tokenId = String(token.tokenId);
  app.dataset.metadataAttributes = String(token.metadata.attributes.length);
  app.dataset.provenanceBytes = String(byteLength(direct.provenanceJson));
  app.dataset.source = runtime.gallery.source;
  app.dataset.rendererReleaseReady = String(thought.rendererReleaseReady);
};

const main = async (): Promise<void> => {
  renderLoading();
  const tokenId = parseThoughtChatWorkTokenId(window.location.search);
  const { runtime, token } = await loadThoughtV2AnvilTokenDetail(tokenId);
  renderToken(token, runtime);
};

void main().catch(renderFailure);
