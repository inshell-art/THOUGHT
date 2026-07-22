import { Contract, JsonRpcProvider } from "ethers";

import "./thought-v2-lab.css";
import {
  buildThoughtGalleryFilterGroups,
  filterAndSortThoughtGalleryTokens,
  loomSupportingText,
  parseThoughtTokenUri,
  provenanceFileForToken,
  type ThoughtGalleryFilterGroup,
  type ThoughtGallerySort,
  type ThoughtGalleryToken,
  type ThoughtTokenAttribute,
} from "./thought-v2-gallery";
import { fetchThoughtGalleryRuntimeConfig } from "./thought-v2-gallery-runtime";
import { thoughtWorkDetailHref } from "./thought-v2-work";

type GalleryToken = ThoughtGalleryToken;

const thoughtAbi = [
  "function totalSupply() view returns (uint256)",
  "function tokenURI(uint256 tokenId) view returns (string)",
];

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

const valueText = (value: unknown) => {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean" || value === null) {
    return String(value);
  }
  return JSON.stringify(value);
};

const shortAddress = (address: string) => `${address.slice(0, 8)}…${address.slice(-6)}`;

const attributeList = (attributes: ThoughtTokenAttribute[], className: string) => {
  const list = element("dl", className);
  for (const attribute of attributes) {
    list.append(
      element("dt", `${className}__trait`, attribute.trait_type),
      element("dd", `${className}__value`, valueText(attribute.value)),
    );
  }
  return list;
};

const provenanceFileLink = (token: GalleryToken) => {
  const file = provenanceFileForToken(token.tokenId, token.metadata);
  const row = element(
    "div",
    "thought-provenance-file thought-provenance-file--card",
  );
  row.dataset.provenanceToken = String(token.tokenId);
  const label = element("span", "thought-provenance-file__label", "PROVENANCE");
  const link = element("a", "thought-provenance-file__link", file.filename) as HTMLAnchorElement;
  link.href = file.dataUri;
  link.download = file.filename;
  link.type = "application/json";
  link.setAttribute("aria-label", `Download exact provenance for ${token.metadata.name}`);
  const metadata = element(
    "span",
    "thought-provenance-file__metadata",
    `${file.byteLength.toLocaleString("en-US")} B ↓`,
  );
  row.replaceChildren(label, link, metadata);
  return row;
};

const mapWithConcurrency = async <T>(
  count: number,
  concurrency: number,
  map: (index: number) => Promise<T>,
  progress: (complete: number) => void,
) => {
  const output = new Array<T>(count);
  let nextIndex = 0;
  let complete = 0;
  const worker = async () => {
    while (nextIndex < count) {
      const index = nextIndex;
      nextIndex += 1;
      output[index] = await map(index);
      complete += 1;
      progress(complete);
    }
  };
  await Promise.all(Array.from({ length: Math.min(count, concurrency) }, worker));
  return output;
};

const app = document.getElementById("thought-v2-lab");
if (!app) throw new Error("missing #thought-v2-lab");
app.dataset.galleryState = "loading";

const header = element("header", "thought-v2-gallery__header");
const eyebrow = element(
  "p",
  "thought-v2-gallery__eyebrow",
  "ARCHIVED BINARY-WEAVE ATTEMPT / ANVIL TOKENURI()",
);
const title = element("h1", "thought-v2-gallery__title", "THOUGHT");
const subline = element("p", "thought-v2-gallery__subline", "Connecting to the local chain…");
const status = element("p", "thought-v2-gallery__status", "Loading gallery runtime");
status.setAttribute("role", "status");
status.setAttribute("aria-live", "polite");
header.replaceChildren(eyebrow, title, subline, status);

const galleryHeader = element("div", "thought-v2-gallery__section-header");
const galleryHeading = element("div", "thought-v2-gallery__section-heading");
const galleryTitle = element("h2", "thought-v2-gallery__section-title", "TOKENS");
const galleryCount = element("span", "thought-v2-gallery__count", "0 works");
galleryCount.setAttribute("role", "status");
galleryCount.setAttribute("aria-live", "polite");
galleryHeading.replaceChildren(galleryTitle, galleryCount);

const galleryControls = element("div", "thought-v2-gallery__controls");
const filterToggle = element("button", "thought-gallery-filter-toggle") as HTMLButtonElement;
filterToggle.type = "button";
filterToggle.disabled = true;
filterToggle.setAttribute("aria-controls", "thought-gallery-filters");
filterToggle.setAttribute("aria-expanded", "true");
filterToggle.replaceChildren(
  element("span", "thought-gallery-filter-toggle__icon", "≡"),
  element("span", "thought-gallery-filter-toggle__label", "FILTERS"),
);
const filterBadge = element("span", "thought-gallery-filter-toggle__badge", "0");
filterBadge.hidden = true;
filterToggle.append(filterBadge);

const searchLabel = element("label", "thought-gallery-search");
searchLabel.append(element("span", "thought-gallery-search__label", "SEARCH"));
const searchInput = element("input", "thought-gallery-search__input") as HTMLInputElement;
searchInput.type = "search";
searchInput.placeholder = "Search by token or trait";
searchInput.autocomplete = "off";
searchInput.disabled = true;
searchLabel.append(searchInput);

const sortLabel = element("label", "thought-gallery-sort");
sortLabel.append(element("span", "thought-gallery-sort__label", "SORT"));
const sortSelect = element("select", "thought-gallery-sort__select") as HTMLSelectElement;
sortSelect.disabled = true;
const sortOptions: ReadonlyArray<readonly [ThoughtGallerySort, string]> = [
  ["token-asc", "Token ID: low to high"],
  ["token-desc", "Recently minted"],
  ["loom-desc", "Loom: most filled"],
  ["loom-asc", "Loom: least filled"],
];
for (const [value, label] of sortOptions) {
  const option = element("option", undefined, label);
  option.value = value;
  sortSelect.append(option);
}
sortLabel.append(sortSelect);
galleryControls.replaceChildren(filterToggle, searchLabel, sortLabel);
galleryHeader.replaceChildren(galleryHeading, galleryControls);

const activeFilters = element("div", "thought-gallery-active-filters");
activeFilters.setAttribute("aria-label", "Applied gallery filters");
activeFilters.hidden = true;

const filterLayout = element("div", "thought-v2-gallery__filter-layout");
const filterPanel = element("aside", "thought-gallery-filters");
filterPanel.id = "thought-gallery-filters";
filterPanel.tabIndex = -1;
filterPanel.setAttribute("aria-label", "Filter THOUGHT tokens");
const filterPanelHeader = element("div", "thought-gallery-filters__header");
const filterPanelTitle = element("h3", "thought-gallery-filters__title", "FILTERS");
const filterPanelActions = element("div", "thought-gallery-filters__actions");
const filterPanelClear = element("button", "thought-gallery-filters__clear", "CLEAR") as HTMLButtonElement;
filterPanelClear.type = "button";
filterPanelClear.disabled = true;
const filterPanelClose = element("button", "thought-gallery-filters__close", "×") as HTMLButtonElement;
filterPanelClose.type = "button";
filterPanelClose.setAttribute("aria-label", "Close filters");
filterPanelActions.replaceChildren(filterPanelClear, filterPanelClose);
filterPanelHeader.replaceChildren(filterPanelTitle, filterPanelActions);
const filterGroups = element("div", "thought-gallery-filters__groups");
const filterPanelFooter = element("div", "thought-gallery-filters__footer");
const filterPanelShow = element("button", "thought-gallery-filters__show", "SHOW 0 WORKS") as HTMLButtonElement;
filterPanelShow.type = "button";
filterPanelFooter.append(filterPanelShow);
filterPanel.replaceChildren(filterPanelHeader, filterGroups, filterPanelFooter);

const grid = element("section", "thought-v2-gallery__grid");
grid.setAttribute("aria-label", "Minted THOUGHT tokens");
filterLayout.replaceChildren(filterPanel, grid);

const filterBackdrop = element("button", "thought-gallery-filter-backdrop") as HTMLButtonElement;
filterBackdrop.type = "button";
filterBackdrop.setAttribute("aria-label", "Close filters");
filterBackdrop.hidden = true;

app.replaceChildren(header, galleryHeader, activeFilters, filterLayout, filterBackdrop);

const selectedTraits = new Map<string, Set<string>>();
const filterGroupStatuses = new Map<string, { node: HTMLElement; optionCount: number }>();
let galleryTokens: GalleryToken[] = [];
let gallerySort: ThoughtGallerySort = "token-asc";
let desktopFiltersVisible = true;
let mobileFiltersOpen = false;
const filterViewport = window.matchMedia("(max-width: 900px)");

const renderCard = (token: GalleryToken) => {
  const card = element("article", "thought-token-card");
  card.dataset.tokenId = String(token.tokenId);
  const select = element("a", "thought-token-card__select") as HTMLAnchorElement;
  select.href = thoughtWorkDetailHref(token.tokenId);
  select.setAttribute("aria-label", `Open complete details for ${token.metadata.name}`);
  const image = element("img", "thought-token-card__image") as HTMLImageElement;
  image.src = token.metadata.image;
  image.alt = `${token.metadata.name} onchain SVG`;
  image.loading = "lazy";
  image.decoding = "async";
  const cardHeader = element("span", "thought-token-card__header");
  cardHeader.append(
    element("span", "thought-token-card__name", token.metadata.name),
    element("span", "thought-token-card__path", `PATH ${valueText(token.metadata.thought.pathId)}`),
  );
  select.replaceChildren(image, cardHeader);

  const traitsLabel = element("p", "thought-token-card__traits-label", "TRAITS / ATTRIBUTES");
  const traits = attributeList(token.metadata.attributes, "thought-token-attributes");
  const loom = element(
    "p",
    "thought-token-card__loom",
    loomSupportingText(token.metadata.properties),
  );
  const provenanceFile = provenanceFileLink(token);
  card.replaceChildren(select, traitsLabel, traits, loom, provenanceFile);
  return card;
};

const selectedTraitRecord = (): Record<string, readonly string[]> =>
  Object.fromEntries(
    [...selectedTraits.entries()]
      .filter(([, values]) => values.size > 0)
      .map(([traitType, values]) => [traitType, [...values]]),
  );

const activeFilterCount = () =>
  (searchInput.value.trim() ? 1 : 0) +
  [...selectedTraits.values()].reduce((total, values) => total + values.size, 0);

const syncFilterInputs = () => {
  for (const input of filterGroups.querySelectorAll<HTMLInputElement>(
    "input[data-filter-trait][data-filter-value]",
  )) {
    const traitType = input.dataset.filterTrait;
    const value = input.dataset.filterValue;
    input.checked = Boolean(
      traitType && value && selectedTraits.get(traitType)?.has(value),
    );
  }
};

const clearAllFilters = () => {
  searchInput.value = "";
  selectedTraits.clear();
  syncFilterInputs();
  renderFilteredGallery();
};

const filterChip = (text: string, ariaLabel: string, remove: () => void) => {
  const chip = element("button", "thought-gallery-active-filters__chip", `${text} ×`) as HTMLButtonElement;
  chip.type = "button";
  chip.setAttribute("aria-label", ariaLabel);
  chip.addEventListener("click", remove);
  return chip;
};

const renderActiveFilters = () => {
  const count = activeFilterCount();
  activeFilters.hidden = count === 0;
  filterBadge.hidden = count === 0;
  filterBadge.textContent = String(count);
  filterPanelClear.disabled = count === 0;

  for (const [traitType, statusNode] of filterGroupStatuses) {
    const selectedCount = selectedTraits.get(traitType)?.size ?? 0;
    statusNode.node.textContent = selectedCount
      ? `${selectedCount} / ${statusNode.optionCount}`
      : String(statusNode.optionCount);
    statusNode.node.dataset.active = selectedCount ? "true" : "false";
  }

  if (count === 0) {
    activeFilters.replaceChildren();
    return;
  }

  const content: HTMLElement[] = [
    element("span", "thought-gallery-active-filters__label", "APPLIED"),
  ];
  const query = searchInput.value.trim();
  if (query) {
    content.push(
      filterChip(`Search: ${query}`, "Clear gallery search", () => {
        searchInput.value = "";
        renderFilteredGallery();
      }),
    );
  }
  for (const [traitType, values] of selectedTraits) {
    for (const value of values) {
      content.push(
        filterChip(
          `${traitType}: ${value}`,
          `Remove ${traitType} filter ${value}`,
          () => {
            const selected = selectedTraits.get(traitType);
            selected?.delete(value);
            if (selected?.size === 0) selectedTraits.delete(traitType);
            syncFilterInputs();
            renderFilteredGallery();
          },
        ),
      );
    }
  }
  const clear = element("button", "thought-gallery-active-filters__clear", "CLEAR ALL") as HTMLButtonElement;
  clear.type = "button";
  clear.addEventListener("click", clearAllFilters);
  content.push(clear);
  activeFilters.replaceChildren(...content);
};

const renderFilteredGallery = () => {
  const filteredTokens = filterAndSortThoughtGalleryTokens(galleryTokens, {
    query: searchInput.value,
    selectedTraits: selectedTraitRecord(),
    sort: gallerySort,
  });

  grid.replaceChildren();
  grid.classList.toggle("thought-v2-gallery__grid--empty", filteredTokens.length === 0);
  for (const token of filteredTokens) grid.append(renderCard(token));

  if (filteredTokens.length === 0) {
    const empty = element("section", "thought-gallery-empty");
    empty.append(
      element("h3", "thought-gallery-empty__title", "NO WORKS FOUND"),
      element(
        "p",
        "thought-gallery-empty__copy",
        "No on-chain token matches this combination of search and traits.",
      ),
    );
    const clear = element("button", "thought-gallery-empty__clear", "CLEAR FILTERS") as HTMLButtonElement;
    clear.type = "button";
    clear.addEventListener("click", clearAllFilters);
    empty.append(clear);
    grid.append(empty);
  }

  const total = galleryTokens.length;
  galleryCount.textContent =
    filteredTokens.length === total
      ? `${total} works`
      : `${filteredTokens.length} of ${total} works`;
  filterPanelShow.textContent = `SHOW ${filteredTokens.length} ${
    filteredTokens.length === 1 ? "WORK" : "WORKS"
  }`;
  app.dataset.resultCount = String(filteredTokens.length);
  renderActiveFilters();
};

const renderFilterGroups = (groups: ThoughtGalleryFilterGroup[]) => {
  filterGroups.replaceChildren();
  filterGroupStatuses.clear();
  for (const group of groups) {
    const disclosure = element("details", "thought-gallery-filter-group");
    disclosure.open = ["Creation Attestation", "Texture Density"].includes(group.traitType);
    const summary = element("summary", "thought-gallery-filter-group__summary");
    const groupName = element("span", "thought-gallery-filter-group__name", group.traitType);
    const groupStatus = element(
      "span",
      "thought-gallery-filter-group__status",
      String(group.options.length),
    );
    summary.replaceChildren(groupName, groupStatus);
    filterGroupStatuses.set(group.traitType, {
      node: groupStatus,
      optionCount: group.options.length,
    });

    const options = element("div", "thought-gallery-filter-group__options");
    for (const option of group.options) {
      const label = element("label", "thought-gallery-filter-option");
      const input = element("input", "thought-gallery-filter-option__input") as HTMLInputElement;
      input.type = "checkbox";
      input.dataset.filterTrait = group.traitType;
      input.dataset.filterValue = option.value;
      input.addEventListener("change", () => {
        let selected = selectedTraits.get(group.traitType);
        if (input.checked) {
          selected ??= new Set<string>();
          selected.add(option.value);
          selectedTraits.set(group.traitType, selected);
        } else {
          selected?.delete(option.value);
          if (selected?.size === 0) selectedTraits.delete(group.traitType);
        }
        renderFilteredGallery();
      });
      const value = element("span", "thought-gallery-filter-option__value", option.value);
      value.title = option.value;
      const count = element(
        "span",
        "thought-gallery-filter-option__count",
        String(option.count),
      );
      label.replaceChildren(input, value, count);
      options.append(label);
    }
    disclosure.replaceChildren(summary, options);
    filterGroups.append(disclosure);
  }
};

const applyFilterPanelState = () => {
  const mobile = filterViewport.matches;
  const visible = mobile ? mobileFiltersOpen : desktopFiltersVisible;
  filterLayout.classList.toggle(
    "thought-v2-gallery__filter-layout--collapsed",
    !mobile && !desktopFiltersVisible,
  );
  app.classList.toggle("thought-v2-lab--filters-open", mobile && mobileFiltersOpen);
  document.body.classList.toggle("thought-v2-filter-drawer-open", mobile && mobileFiltersOpen);
  filterToggle.setAttribute("aria-expanded", visible ? "true" : "false");
  filterPanel.setAttribute("aria-hidden", visible ? "false" : "true");
  filterPanel.toggleAttribute("inert", !visible);
  filterPanelClose.hidden = !mobile;
  filterBackdrop.hidden = !(mobile && mobileFiltersOpen);
};

const closeMobileFilters = (returnFocus: boolean) => {
  if (!mobileFiltersOpen) return;
  mobileFiltersOpen = false;
  applyFilterPanelState();
  if (returnFocus) filterToggle.focus();
};

filterToggle.addEventListener("click", () => {
  if (filterViewport.matches) {
    mobileFiltersOpen = !mobileFiltersOpen;
  } else {
    desktopFiltersVisible = !desktopFiltersVisible;
  }
  applyFilterPanelState();
  if (mobileFiltersOpen) filterPanel.focus();
});
filterPanelClose.addEventListener("click", () => closeMobileFilters(true));
filterBackdrop.addEventListener("click", () => closeMobileFilters(true));
filterPanelShow.addEventListener("click", () => closeMobileFilters(true));
filterPanelClear.addEventListener("click", clearAllFilters);
searchInput.addEventListener("input", renderFilteredGallery);
sortSelect.addEventListener("change", () => {
  gallerySort = sortSelect.value as ThoughtGallerySort;
  renderFilteredGallery();
});
filterViewport.addEventListener("change", () => {
  mobileFiltersOpen = false;
  applyFilterPanelState();
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && filterViewport.matches && mobileFiltersOpen) {
    closeMobileFilters(true);
  }
});
applyFilterPanelState();

const renderError = (error: unknown) => {
  app.dataset.galleryState = "error";
  const message = error instanceof Error ? error.message : String(error);
  status.textContent = "Gallery unavailable";
  const panel = element("section", "thought-v2-gallery__error");
  panel.append(
    element("h2", "thought-v2-gallery__error-title", "ANVIL GALLERY NOT READY"),
    element("p", "thought-v2-gallery__error-message", message),
    element("p", "thought-v2-gallery__error-help", "Start a fresh Anvil node, then prepare the fixtures with:"),
    element("code", "thought-v2-gallery__command", "npm run devnode:gallery"),
  );
  grid.replaceChildren(panel);
};

const loadGallery = async () => {
  let provider: JsonRpcProvider | undefined;
  try {
    const { config, thoughtAddress } = await fetchThoughtGalleryRuntimeConfig();
    status.textContent = "Checking Anvil deployment";
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
      throw new Error(`unsupported THOUGHT supply: ${supplyValue}`);
    }
    if (config.gallery?.fixtureCount !== undefined && config.gallery.fixtureCount !== supply) {
      throw new Error(
        `fixture supply mismatch: config ${config.gallery.fixtureCount}, contract ${supply}`,
      );
    }

    subline.replaceChildren(
      element("span", undefined, `chain ${config.chainId}`),
      element("span", undefined, `${supply} minted works`),
      ...(config.gallery?.omittedDuplicates?.length
        ? [
            element(
              "span",
              "thought-v2-gallery__constraint",
              `${config.gallery.omittedDuplicates.length} duplicate fixture omitted by Agent uniqueness`,
            ),
          ]
        : []),
      element("span", undefined, config.protocolRelease?.status ?? "local release"),
      element("code", undefined, shortAddress(thoughtAddress)),
      element("span", undefined, "source ThoughtNFT.tokenURI()"),
    );
    subline.querySelector("code")?.setAttribute("title", thoughtAddress);
    galleryCount.textContent = `${supply} works`;

    const tokens = await mapWithConcurrency(
      supply,
      4,
      async (index) => {
        const tokenId = index + 1;
        const tokenUri = (await thoughtNft.tokenURI(BigInt(tokenId), {
          gasLimit: 28_000_000n,
        })) as string;
        return { tokenId, metadata: parseThoughtTokenUri(tokenUri) };
      },
      (complete) => {
        status.textContent = `Reading tokenURI() ${complete}/${supply}`;
      },
    );

    galleryTokens = tokens;
    renderFilterGroups(buildThoughtGalleryFilterGroups(tokens));
    filterToggle.disabled = false;
    searchInput.disabled = false;
    sortSelect.disabled = false;
    renderFilteredGallery();
    app.dataset.galleryState = "ready";
    status.textContent = `${supply} tokenURI records loaded from Anvil`;
  } catch (error) {
    renderError(error);
  } finally {
    provider?.destroy();
  }
};

void loadGallery();
