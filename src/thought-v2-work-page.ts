import { Contract, JsonRpcProvider } from "ethers";

import "./thought-v2-lab.css";
import "./thought-v2-work.css";
import {
  loomSupportingText,
  parseThoughtTokenUri,
  provenanceFileForToken,
  type ThoughtTokenAttribute,
  type ThoughtTokenMetadata,
} from "./thought-v2-gallery";
import { fetchThoughtGalleryRuntimeConfig } from "./thought-v2-gallery-runtime";
import { verifyProvenance, type ThoughtProvenanceV2 } from "./thought-v2-provenance";
import {
  flattenThoughtProvenance,
  parseThoughtWorkTokenId,
  provenanceSectionTitle,
  thoughtWorkDetailHref,
} from "./thought-v2-work";

const thoughtAbi = [
  "function totalSupply() view returns (uint256)",
  "function tokenURI(uint256 tokenId) view returns (string)",
  "function ownerOf(uint256 tokenId) view returns (address)",
  "function authorOf(uint256 tokenId) view returns (address)",
  "function mintedAtOf(uint256 tokenId) view returns (uint64)",
  "function pathIdOf(uint256 tokenId) view returns (uint256)",
  "function pathSerialOf(uint256 tokenId) view returns (uint256)",
  "function promptLineOf(uint256 tokenId) view returns (string)",
  "function agentLineOf(uint256 tokenId) view returns (string)",
  "function declaredAgentOf(uint256 tokenId) view returns (string)",
  "function declaredModelOf(uint256 tokenId) view returns (string)",
  "function provenanceOf(uint256 tokenId) view returns (string)",
  "function promptLineHashOf(uint256 tokenId) view returns (bytes32)",
  "function agentLineHashOf(uint256 tokenId) view returns (bytes32)",
  "function agentIdentityHashOf(uint256 tokenId) view returns (bytes32)",
  "function binaryFieldOf(uint256 tokenId) view returns (bytes)",
  "function binaryFieldKeccak256Of(uint256 tokenId) view returns (bytes32)",
  "function workHashOf(uint256 tokenId) view returns (bytes32)",
  "function provenanceHashOf(uint256 tokenId) view returns (bytes32)",
  "function creationAttestationDigestOf(uint256 tokenId) view returns (bytes32)",
  "function thoughtSpecOf(uint256 tokenId) view returns (bytes32 specId, bytes32 specHash, string specName, string ref)",
  "function protocolReleaseId() view returns (bytes32)",
  "function protocolManifestHash() view returns (bytes32)",
  "function protocolManifestURI() view returns (string)",
  "function pathNft() view returns (address)",
  "function thoughtSpecRegistry() view returns (address)",
  "function thoughtRenderer() view returns (address)",
  "function creationAttestationVerifier() view returns (address)",
] as const;

type ThoughtSpecState = {
  id: string;
  hash: string;
  name: string;
  ref: string;
};

type ThoughtOnchainState = {
  owner: string;
  author: string;
  mintedAt: string;
  pathId: string;
  pathSerial: string;
  promptLine: string;
  agentLine: string;
  declaredAgent: string;
  declaredModel: string;
  provenance: string;
  promptLineHash: string;
  agentLineHash: string;
  agentIdentityHash: string;
  binaryFieldPacked: string;
  binaryFieldHash: string;
  workHash: string;
  provenanceHash: string;
  creationAttestationDigest: string;
  spec: ThoughtSpecState;
  protocolReleaseId: string;
  manifestHash: string;
  manifestUri: string;
  pathNft: string;
  thoughtSpecRegistry: string;
  thoughtRenderer: string;
  creationAttestationVerifier: string;
};

type IntegrityCheck = {
  label: string;
  detail: string;
  passed: boolean;
};

const encoder = new TextEncoder();

const element = <K extends keyof HTMLElementTagNameMap>(
  tagName: K,
  className?: string,
  textContent?: string,
) => {
  const node = document.createElement(tagName);
  if (className) node.className = className;
  if (textContent !== undefined) node.textContent = textContent;
  return node;
};

const valueText = (value: unknown): string => {
  if (typeof value === "string") return value;
  if (value === null || typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return JSON.stringify(value);
};

const lowercase = (value: string): `0x${string}` => value.toLowerCase() as `0x${string}`;

const requiredString = (value: unknown, label: string): string => {
  if (typeof value !== "string") throw new Error(`${label} is missing from tokenURI()`);
  return value;
};

const shortAddress = (address: string): string =>
  `${address.slice(0, 8)}…${address.slice(-6)}`;

const attributeList = (attributes: ThoughtTokenAttribute[]) => {
  const list = element("dl", "thought-token-detail__attributes");
  for (const attribute of attributes) {
    list.append(
      element("dt", "thought-token-detail__attributes__trait", attribute.trait_type),
      element("dd", "thought-token-detail__attributes__value", valueText(attribute.value)),
    );
  }
  return list;
};

const keyValueList = (
  entries: ReadonlyArray<readonly [string, unknown]>,
  className = "thought-work-facts",
) => {
  const list = element("dl", className);
  for (const [key, value] of entries) {
    const term = element("dt", `${className}__key`, key);
    const description = element("dd", `${className}__value`, valueText(value));
    description.title = typeof value === "string" ? value : "";
    list.append(term, description);
  }
  return list;
};

const provenanceDownload = (tokenId: number, metadata: ThoughtTokenMetadata) => {
  const file = provenanceFileForToken(tokenId, metadata);
  const row = element("div", "thought-provenance-file thought-provenance-file--detail");
  row.dataset.provenanceToken = String(tokenId);
  const label = element("span", "thought-provenance-file__label", "EXACT PROVENANCE");
  const link = element("a", "thought-provenance-file__link", file.filename) as HTMLAnchorElement;
  link.href = file.dataUri;
  link.download = file.filename;
  link.type = "application/json";
  link.setAttribute("aria-label", `Download exact canonical provenance for ${metadata.name}`);
  const fileMeta = element(
    "span",
    "thought-provenance-file__metadata",
    `${file.byteLength.toLocaleString("en-US")} B ↓`,
  );
  row.replaceChildren(label, link, fileMeta);
  return row;
};

const renderNavigation = (tokenId?: number, supply?: number) => {
  const nav = element("nav", "thought-work-nav");
  nav.setAttribute("aria-label", "Work navigation");
  const back = element("a", "thought-work-nav__back", "← ALL WORKS") as HTMLAnchorElement;
  back.href = "/thought-v2-lab.html";
  const sequence = element("div", "thought-work-nav__sequence");
  if (tokenId !== undefined && supply !== undefined) {
    if (tokenId > 1) {
      const previous = element("a", "thought-work-nav__link", `← ${tokenId - 1}`) as HTMLAnchorElement;
      previous.href = thoughtWorkDetailHref(tokenId - 1);
      previous.setAttribute("aria-label", `Open THOUGHT #${tokenId - 1}`);
      sequence.append(previous);
    } else {
      sequence.append(element("span", "thought-work-nav__disabled", "← —"));
    }
    sequence.append(element("span", "thought-work-nav__position", `${tokenId} / ${supply}`));
    if (tokenId < supply) {
      const next = element("a", "thought-work-nav__link", `${tokenId + 1} →`) as HTMLAnchorElement;
      next.href = thoughtWorkDetailHref(tokenId + 1);
      next.setAttribute("aria-label", `Open THOUGHT #${tokenId + 1}`);
      sequence.append(next);
    } else {
      sequence.append(element("span", "thought-work-nav__disabled", "— →"));
    }
  }
  nav.replaceChildren(back, sequence);
  return nav;
};

const readThoughtState = async (
  thoughtNft: Contract,
  tokenId: bigint,
): Promise<{ tokenUri: string; state: ThoughtOnchainState }> => {
  const [
    tokenUriValue,
    ownerValue,
    authorValue,
    mintedAtValue,
    pathIdValue,
    pathSerialValue,
    promptLineValue,
    agentLineValue,
    declaredAgentValue,
    declaredModelValue,
    provenanceValue,
    promptLineHashValue,
    agentLineHashValue,
    agentIdentityHashValue,
    binaryFieldValue,
    binaryFieldHashValue,
    workHashValue,
    provenanceHashValue,
    creationAttestationDigestValue,
    specValue,
    protocolReleaseIdValue,
    manifestHashValue,
    manifestUriValue,
    pathNftValue,
    thoughtSpecRegistryValue,
    thoughtRendererValue,
    creationAttestationVerifierValue,
  ] = await Promise.all([
    thoughtNft.tokenURI(tokenId, { gasLimit: 28_000_000n }),
    thoughtNft.ownerOf(tokenId),
    thoughtNft.authorOf(tokenId),
    thoughtNft.mintedAtOf(tokenId),
    thoughtNft.pathIdOf(tokenId),
    thoughtNft.pathSerialOf(tokenId),
    thoughtNft.promptLineOf(tokenId),
    thoughtNft.agentLineOf(tokenId),
    thoughtNft.declaredAgentOf(tokenId),
    thoughtNft.declaredModelOf(tokenId),
    thoughtNft.provenanceOf(tokenId),
    thoughtNft.promptLineHashOf(tokenId),
    thoughtNft.agentLineHashOf(tokenId),
    thoughtNft.agentIdentityHashOf(tokenId),
    thoughtNft.binaryFieldOf(tokenId),
    thoughtNft.binaryFieldKeccak256Of(tokenId),
    thoughtNft.workHashOf(tokenId),
    thoughtNft.provenanceHashOf(tokenId),
    thoughtNft.creationAttestationDigestOf(tokenId),
    thoughtNft.thoughtSpecOf(tokenId),
    thoughtNft.protocolReleaseId(),
    thoughtNft.protocolManifestHash(),
    thoughtNft.protocolManifestURI(),
    thoughtNft.pathNft(),
    thoughtNft.thoughtSpecRegistry(),
    thoughtNft.thoughtRenderer(),
    thoughtNft.creationAttestationVerifier(),
  ]);
  const specTuple = specValue as unknown as readonly [string, string, string, string];
  return {
    tokenUri: String(tokenUriValue),
    state: {
      owner: String(ownerValue),
      author: String(authorValue),
      mintedAt: String(mintedAtValue),
      pathId: String(pathIdValue),
      pathSerial: String(pathSerialValue),
      promptLine: String(promptLineValue),
      agentLine: String(agentLineValue),
      declaredAgent: String(declaredAgentValue),
      declaredModel: String(declaredModelValue),
      provenance: String(provenanceValue),
      promptLineHash: String(promptLineHashValue),
      agentLineHash: String(agentLineHashValue),
      agentIdentityHash: String(agentIdentityHashValue),
      binaryFieldPacked: String(binaryFieldValue),
      binaryFieldHash: String(binaryFieldHashValue),
      workHash: String(workHashValue),
      provenanceHash: String(provenanceHashValue),
      creationAttestationDigest: String(creationAttestationDigestValue),
      spec: {
        id: String(specTuple[0]),
        hash: String(specTuple[1]),
        name: String(specTuple[2]),
        ref: String(specTuple[3]),
      },
      protocolReleaseId: String(protocolReleaseIdValue),
      manifestHash: String(manifestHashValue),
      manifestUri: String(manifestUriValue),
      pathNft: String(pathNftValue),
      thoughtSpecRegistry: String(thoughtSpecRegistryValue),
      thoughtRenderer: String(thoughtRendererValue),
      creationAttestationVerifier: String(creationAttestationVerifierValue),
    },
  };
};

const verifyThoughtState = (
  metadata: ThoughtTokenMetadata,
  state: ThoughtOnchainState,
  chainId: number,
  thoughtAddress: string,
) => {
  const exactBytes = encoder.encode(state.provenance);
  const verification = verifyProvenance(exactBytes, undefined, {
    promptLine: state.promptLine,
    agentLine: state.agentLine,
    declaredAgent: state.declaredAgent,
    declaredModel: state.declaredModel,
    workHash: lowercase(state.workHash),
    provenanceHash: lowercase(state.provenanceHash),
    protocolReleaseId: lowercase(state.protocolReleaseId),
    manifestKeccak256: lowercase(state.manifestHash),
    thoughtSpecId: lowercase(state.spec.id),
    thoughtSpecHash: lowercase(state.spec.hash),
    thoughtNft: lowercase(thoughtAddress),
    intendedMinter: lowercase(state.author),
    chainId: String(chainId),
  });
  const parsed = verification.parsed;
  const thought = metadata.thought;
  const properties = metadata.properties;
  const checks: IntegrityCheck[] = [
    {
      label: "Canonical provenance",
      detail: "RFC 8785 JCS, schema, semantic commitments, and typed-state parity",
      passed: verification.conforming && parsed !== undefined,
    },
    {
      label: "Exact tokenURI bytes",
      detail: "Embedded provenance is byte-for-byte identical to provenanceOf(tokenId)",
      passed: thought.provenance === state.provenance,
    },
    {
      label: "Provenance commitment",
      detail: "Computed keccak256 equals contract state and tokenURI metadata",
      passed:
        verification.provenanceHash === lowercase(state.provenanceHash) &&
        thought.provenanceHash === lowercase(state.provenanceHash) &&
        properties.provenanceKeccak256 === lowercase(state.provenanceHash),
    },
    {
      label: "Work commitments",
      detail: "Lines, packed field, line hashes, identity hash, field hash, and work hash agree",
      passed:
        parsed?.work.promptLine === state.promptLine &&
        parsed.work.agentLine === state.agentLine &&
        parsed.work.promptLineKeccak256 === lowercase(state.promptLineHash) &&
        parsed.work.agentLineKeccak256 === lowercase(state.agentLineHash) &&
        parsed.work.agentIdentityHash === lowercase(state.agentIdentityHash) &&
        parsed.work.binaryFieldPacked === state.binaryFieldPacked &&
        parsed.work.binaryFieldKeccak256 === lowercase(state.binaryFieldHash) &&
        parsed.work.workHash === lowercase(state.workHash),
    },
    {
      label: "Selected THOUGHT spec",
      detail: "Canonical provenance, token state, and tokenURI carry the same registered pair",
      passed:
        parsed?.protocol.thoughtSpecId === lowercase(state.spec.id) &&
        parsed.protocol.thoughtSpecHash === lowercase(state.spec.hash) &&
        thought.thoughtSpecId === lowercase(state.spec.id) &&
        thought.thoughtSpecHash === lowercase(state.spec.hash),
    },
    {
      label: "Protocol release",
      detail: "Release ID and manifest hash agree across provenance, contract, and tokenURI",
      passed:
        parsed?.protocol.protocolReleaseId === lowercase(state.protocolReleaseId) &&
        parsed.protocol.manifestKeccak256 === lowercase(state.manifestHash) &&
        thought.protocolReleaseId === lowercase(state.protocolReleaseId) &&
        thought.manifestKeccak256 === lowercase(state.manifestHash),
    },
    {
      label: "Creation attestation",
      detail: "Status, verifier, and digest agree with token state",
      passed:
        properties.creationAttestationDigest === lowercase(state.creationAttestationDigest) &&
        requiredString(
          properties.creationAttestationVerifier,
          "creation attestation verifier",
        ).toLowerCase() === state.creationAttestationVerifier.toLowerCase(),
    },
  ];
  return { verification, checks };
};

const renderHero = (
  tokenId: number,
  metadata: ThoughtTokenMetadata,
  state: ThoughtOnchainState,
) => {
  const hero = element("section", "thought-v2-gallery__detail thought-work-page__hero");
  hero.setAttribute("aria-label", `${metadata.name} on-chain artwork and traits`);
  const figure = element("figure", "thought-token-detail__figure");
  const image = element("img", "thought-token-detail__image") as HTMLImageElement;
  image.src = metadata.image;
  image.alt = `${metadata.name} onchain SVG`;
  image.decoding = "async";
  figure.replaceChildren(
    image,
    element("figcaption", "thought-token-detail__caption", "SVG embedded by ThoughtNFT.tokenURI()"),
  );

  const information = element("div", "thought-token-detail__information");
  const verified = element("p", "thought-work-verification-badge", "✓ PROVENANCE VERIFIED");
  const tokenLabel = element("p", "thought-token-detail__token", `TOKEN ${tokenId}`);
  const name = element("h2", "thought-token-detail__name", metadata.name);
  const description = element(
    "p",
    "thought-token-detail__description",
    metadata.description ?? "Fully onchain THOUGHT metadata.",
  );
  const identity = element("p", "thought-work-page__identity");
  identity.replaceChildren(
    element("span", undefined, `PATH ${state.pathId} / SERIAL ${state.pathSerial}`),
    element("span", undefined, `OWNER ${shortAddress(state.owner)}`),
  );
  const traitsTitle = element("h3", "thought-token-detail__heading", "TRAITS / ATTRIBUTES");
  information.replaceChildren(
    verified,
    tokenLabel,
    name,
    description,
    identity,
    provenanceDownload(tokenId, metadata),
    traitsTitle,
    attributeList(metadata.attributes),
    element("p", "thought-token-detail__loom", loomSupportingText(metadata.properties)),
  );
  hero.replaceChildren(figure, information);
  return hero;
};

const renderIntegrity = (checks: readonly IntegrityCheck[], byteLength: number) => {
  const section = element("section", "thought-work-section thought-work-integrity");
  section.id = "integrity";
  const heading = element("div", "thought-work-section__heading");
  heading.append(
    element("p", "thought-work-section__index", "01"),
    element("h2", "thought-work-section__title", "PROVENANCE INTEGRITY"),
    element(
      "p",
      "thought-work-section__copy",
      `${byteLength.toLocaleString("en-US")} exact UTF-8 bytes verified against live Anvil contract state.`,
    ),
  );
  const list = element("ul", "thought-work-integrity__checks");
  for (const check of checks) {
    const item = element("li", "thought-work-integrity__check");
    item.dataset.check = check.passed ? "pass" : "fail";
    item.append(
      element("span", "thought-work-integrity__mark", check.passed ? "✓" : "×"),
      element("strong", "thought-work-integrity__label", check.label),
      element("span", "thought-work-integrity__detail", check.detail),
    );
    list.append(item);
  }
  section.replaceChildren(heading, list);
  return section;
};

const renderProvenance = (provenance: ThoughtProvenanceV2, exactJson: string) => {
  const section = element("section", "thought-work-section thought-work-provenance");
  section.id = "provenance";
  const heading = element("div", "thought-work-section__heading");
  heading.append(
    element("p", "thought-work-section__index", "02"),
    element("h2", "thought-work-section__title", "CANONICAL CREATION RECORD"),
    element(
      "p",
      "thought-work-section__copy",
      "Every field below comes from the exact inshell.thought.provenance.v2 bytes stored by the NFT.",
    ),
  );
  const sections = element("div", "thought-work-provenance__grid");
  let leafCount = 0;
  for (const [key, value] of Object.entries(provenance)) {
    const card = element("article", "thought-work-provenance__section");
    card.dataset.provenanceSection = key;
    card.append(element("h3", "thought-work-provenance__title", provenanceSectionTitle(key)));
    const leaves = flattenThoughtProvenance(value, `provenance.${key}`);
    leafCount += leaves.length;
    const list = element("dl", "thought-work-provenance__fields");
    for (const leaf of leaves) {
      const term = element("dt", "thought-work-provenance__path", leaf.path);
      const description = element("dd", "thought-work-provenance__value", leaf.value);
      description.dataset.provenancePath = leaf.path;
      list.append(term, description);
    }
    card.append(list);
    sections.append(card);
  }
  section.dataset.provenanceLeafCount = String(leafCount);

  const raw = element("details", "thought-work-raw");
  raw.append(
    element("summary", "thought-work-raw__summary", "RAW CANONICAL JSON"),
    element("pre", "thought-work-raw__json", exactJson),
  );
  section.replaceChildren(heading, sections, raw);
  return section;
};

const renderOnchainRecord = (
  tokenId: number,
  metadata: ThoughtTokenMetadata,
  state: ThoughtOnchainState,
  chainId: number,
  thoughtAddress: string,
) => {
  const section = element("section", "thought-work-section thought-work-onchain");
  section.id = "onchain-record";
  const heading = element("div", "thought-work-section__heading");
  heading.append(
    element("p", "thought-work-section__index", "03"),
    element("h2", "thought-work-section__title", "ON-CHAIN TOKEN RECORD"),
    element(
      "p",
      "thought-work-section__copy",
      "Typed NFT state that binds the creation record. PATH and mint time intentionally remain outside provenanceJson.",
    ),
  );
  const mintedDate = new Date(Number(state.mintedAt) * 1_000).toISOString();
  const grid = element("div", "thought-work-onchain__grid");
  const identity = element("article", "thought-work-onchain__card");
  identity.append(
    element("h3", "thought-work-onchain__title", "TOKEN / PATH"),
    keyValueList([
      ["tokenId", tokenId],
      ["chainId", chainId],
      ["thoughtNft", thoughtAddress],
      ["owner", state.owner],
      ["author / intendedMinter", state.author],
      ["pathNft", state.pathNft],
      ["pathId", state.pathId],
      ["pathSerial", state.pathSerial],
      ["mintedAt", `${state.mintedAt} / ${mintedDate}`],
    ]),
  );
  const release = element("article", "thought-work-onchain__card");
  release.append(
    element("h3", "thought-work-onchain__title", "SPEC / RELEASE"),
    keyValueList([
      ["specName", state.spec.name],
      ["specRef", state.spec.ref],
      ["thoughtSpecId", state.spec.id],
      ["thoughtSpecHash", state.spec.hash],
      ["thoughtSpecRegistry", state.thoughtSpecRegistry],
      ["protocolReleaseId", state.protocolReleaseId],
      ["manifestKeccak256", state.manifestHash],
      ["manifestURI", state.manifestUri],
      ["thoughtRenderer", state.thoughtRenderer],
    ]),
  );
  const commitments = element("article", "thought-work-onchain__card");
  commitments.append(
    element("h3", "thought-work-onchain__title", "WORK COMMITMENTS"),
    keyValueList([
      ["promptLine", state.promptLine],
      ["promptLineKeccak256", state.promptLineHash],
      ["agentLine", state.agentLine],
      ["agentLineKeccak256", state.agentLineHash],
      ["agentIdentityHash", state.agentIdentityHash],
      ["binaryFieldKeccak256", state.binaryFieldHash],
      ["workHash", state.workHash],
      ["provenanceHash", state.provenanceHash],
    ]),
  );
  const attestation = element("article", "thought-work-onchain__card");
  attestation.append(
    element("h3", "thought-work-onchain__title", "CREATION ATTESTATION"),
    keyValueList([
      ["status", metadata.thought.creationAttestation],
      ["declaredAgent", state.declaredAgent],
      ["declaredModel", state.declaredModel],
      ["profileId", metadata.properties.creationAttestationProfileId],
      ["verifier", state.creationAttestationVerifier],
      ["digest", state.creationAttestationDigest],
    ]),
  );
  grid.replaceChildren(identity, release, commitments, attestation);
  section.replaceChildren(heading, grid);
  return section;
};

const app = document.getElementById("thought-v2-work");
if (!app) throw new Error("missing #thought-v2-work");
app.dataset.workState = "loading";
app.replaceChildren(
  renderNavigation(),
  element("p", "thought-work-page__loading", "Reading complete work record from Anvil…"),
);

const renderError = (error: unknown) => {
  app.dataset.workState = "error";
  const message = error instanceof Error ? error.message : String(error);
  const panel = element("section", "thought-v2-gallery__error thought-work-page__error");
  panel.append(
    element("p", "thought-work-section__index", "WORK DETAIL"),
    element("h1", "thought-v2-gallery__error-title", "THOUGHT WORK UNAVAILABLE"),
    element("p", "thought-v2-gallery__error-message", message),
    element(
      "p",
      "thought-v2-gallery__error-help",
      "For local contract state, start a fresh Anvil node and prepare the gallery with:",
    ),
    element("code", "thought-v2-gallery__command", "npm run devnode:gallery"),
  );
  app.replaceChildren(renderNavigation(), panel);
};

const loadWork = async () => {
  let provider: JsonRpcProvider | undefined;
  try {
    const tokenId = parseThoughtWorkTokenId(window.location.search);
    const { config, thoughtAddress } = await fetchThoughtGalleryRuntimeConfig();
    provider = new JsonRpcProvider(config.rpcUrl);
    const [network, code] = await Promise.all([
      provider.getNetwork(),
      provider.getCode(thoughtAddress),
    ]);
    if (Number(network.chainId) !== config.chainId) {
      throw new Error(`chain mismatch: config ${config.chainId}, RPC ${network.chainId}`);
    }
    if (code === "0x") throw new Error(`THOUGHT is not deployed at ${thoughtAddress}`);

    const thoughtNft = new Contract(thoughtAddress, thoughtAbi, provider);
    const supplyValue = await thoughtNft.totalSupply();
    const supply = Number(supplyValue);
    if (!Number.isSafeInteger(supply) || supply < 1 || supply > 1_000) {
      throw new Error(`unsupported THOUGHT supply: ${String(supplyValue)}`);
    }
    if (tokenId > supply) {
      throw new Error(`THOUGHT #${tokenId} is not minted; current supply is ${supply}`);
    }

    const { tokenUri, state } = await readThoughtState(thoughtNft, BigInt(tokenId));
    const metadata = parseThoughtTokenUri(tokenUri);
    const { verification, checks } = verifyThoughtState(
      metadata,
      state,
      config.chainId,
      thoughtAddress,
    );
    const failed = checks.filter((check) => !check.passed);
    if (!verification.conforming || !verification.parsed || failed.length > 0) {
      const issues = [
        ...verification.errors,
        ...failed.map((check) => `${check.label} mismatch`),
      ];
      throw new Error(`on-chain provenance verification failed: ${issues.join("; ")}`);
    }

    document.title = `${metadata.name} — THOUGHT V2`;
    const masthead = element("header", "thought-v2-gallery__header thought-work-page__masthead");
    masthead.replaceChildren(
      element("p", "thought-v2-gallery__eyebrow", "ANVIL / COMPLETE ON-CHAIN WORK RECORD"),
      element("h1", "thought-v2-gallery__title", "THOUGHT"),
      element(
        "p",
        "thought-v2-gallery__subline",
        `chain ${config.chainId} · token ${tokenId} · ${shortAddress(thoughtAddress)} · source ThoughtNFT`,
      ),
    );
    app.dataset.workState = "ready";
    app.dataset.tokenId = String(tokenId);
    app.dataset.provenanceStatus = "verified";
    app.replaceChildren(
      renderNavigation(tokenId, supply),
      masthead,
      renderHero(tokenId, metadata, state),
      renderIntegrity(checks, verification.exactBytes.byteLength),
      renderProvenance(verification.parsed, state.provenance),
      renderOnchainRecord(tokenId, metadata, state, config.chainId, thoughtAddress),
    );
  } catch (error) {
    renderError(error);
  } finally {
    provider?.destroy();
  }
};

void loadWork();
