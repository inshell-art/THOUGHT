import "@fontsource/source-code-pro/200.css";
import "@fontsource/source-code-pro/300.css";
import "@fontsource/source-code-pro/400.css";
import "@fontsource/source-code-pro/500.css";
import "@fontsource/source-code-pro/600.css";
import "@fontsource/source-code-pro/700.css";
import "@fontsource/source-code-pro/800.css";
import "@fontsource/source-code-pro/900.css";
import "@fontsource-variable/roboto-mono/wght.css";
import {
  AbiCoder,
  BrowserProvider,
  Contract,
  JsonRpcProvider,
  getBytes,
  id,
  keccak256,
  toUtf8Bytes,
  type JsonRpcSigner,
} from "ethers";

import thoughtInstructions from "../THOUGHT.md?raw";
import thoughtInstructionsUrl from "../THOUGHT.md?url";
import colorFontRaw from "../colorFontJSON/colorfont.byToolv2.json?raw";
import addresses from "../evm/addresses.anvil.json";

type ColorFontFile = {
  colors: Array<{
    index: number;
    hex: string;
  }>;
};

type DrawImage = {
  char: string;
  fill: string;
};

type Mode = "connect" | "direct" | "local";

type DirectProviderId = "openai" | "openrouter" | "anthropic";

type ModelSourceId = DirectProviderId | "ollama";

type ProviderConfig = {
  id: DirectProviderId;
  label: string;
  defaultModel: string;
};

type ModelOption = {
  id: string;
  label: string;
};

type LegacyProviderState = {
  apiKey?: string;
  model?: string;
};

type LegacySessionState = {
  authMode?: "connect" | "raw";
  activeProvider?: string;
  providers?: Record<string, LegacyProviderState | undefined>;
};

type ThoughtInstructionsOverride = {
  name: string;
  content: string;
};

type ThoughtSessionState = {
  mode: Mode;
  prompt: string;
  connect: {
    apiKey: string;
    model: string;
  };
  direct: {
    provider: DirectProviderId;
    apiKey: string;
    model: string;
  };
  local: {
    available: boolean | null;
    model: string;
  };
};

type EvmAddresses = {
  rpcUrl?: string;
  chainId?: number;
  pathNft?: {
    address?: string;
  };
  thoughtSpecRegistry?: {
    address?: string;
  };
  thoughtToken?: {
    address?: string;
  };
};

type EthereumProvider = {
  isMetaMask?: boolean;
  providers?: EthereumProvider[];
  request(args: { method: string; params?: unknown[] | object }): Promise<unknown>;
  on?(event: string, listener: (...args: unknown[]) => void): void;
  removeListener?(event: string, listener: (...args: unknown[]) => void): void;
};

type MintTxState = "idle" | "awaiting_signature" | "submitted" | "failed";
type MintFlowErrorKind =
  | "none"
  | "thought"
  | "spec"
  | "path_invalid"
  | "path_not_found"
  | "path_spent"
  | "path_not_ready"
  | "wrong_network"
  | "funds"
  | "signature"
  | "mint";
type MintFlowState =
  | "closed"
  | "thought_checking"
  | "text_taken"
  | "wallet_required"
  | "path_required"
  | "path_checking"
  | "path_ready"
  | "authorizing"
  | "authorized"
  | "minting"
  | "minted"
  | "error";

type ThoughtRunState = "idle" | "running" | "output_ready" | "run_failed";

type PrimaryActionState =
  | "run"
  | "retry_run"
  | "connect_wallet"
  | "switch_wallet"
  | "mint"
  | "retry_mint"
  | "none";

type SecondaryActionState = "reset" | "view_thought" | "view_tx" | "none";

type ThoughtDebugCtaOverride =
  | "auto"
  | "run"
  | "running"
  | "retry"
  | "mint"
  | "view_thought";

type ThoughtDebugCtaStatusOverride =
  | "auto"
  | "none"
  | "ready"
  | "minted"
  | "model_needed"
  | "generation_failed"
  | "mint_unavailable";

type ThoughtDebugWarningOverride =
  | "auto"
  | "none"
  | "prompt_required"
  | "model_required"
  | "openrouter_required"
  | "api_key_required"
  | "ollama_not_found"
  | "spec_unavailable"
  | "provider_error"
  | "external_service"
  | "openrouter_connect_constraint"
  | "wallet_missing"
  | "wallet_connect_failed"
  | "wallet_switch_failed"
  | "thought_too_large"
  | "mint_contract_unavailable";

type PanelWarningLevel = "info" | "warn" | "error";

type ThoughtDebugState = {
  open: boolean;
  enabled: boolean;
  cta: ThoughtDebugCtaOverride;
  ctaStatus: ThoughtDebugCtaStatusOverride;
  warning: ThoughtDebugWarningOverride;
};

type ActionPresentation = {
  primaryLabel: string;
  primaryDisabled: boolean;
  primaryAction: PrimaryActionState;
  status: string;
  secondaryLabel: string;
  secondaryAction: SecondaryActionState;
  hidePrimary?: boolean;
};

type MintSheetAction =
  | "none"
  | "continue"
  | "connect_wallet"
  | "authorize"
  | "confirm_mint"
  | "view_tx"
  | "view_thought"
  | "choose_another"
  | "mint_path"
  | "refresh"
  | "reset"
  | "switch_network";

type MintSheetActionConfig = {
  action: MintSheetAction;
  disabled?: boolean;
  hidden?: boolean;
  label: string;
};

type MintFlowUiMode = "sheet" | "cli";

type CliEntryKind = "intro" | "command" | "output" | "error";

type CliEntry = {
  kind: CliEntryKind;
  lines: string[];
};

type CliSuggestion = {
  label: string;
  command: string;
};

type WalletDotState = "off" | "on" | "pending" | "error";

type ThoughtWalletState = {
  detected: boolean;
  address: string;
  chainId: number | null;
  txState: MintTxState;
  txHash: string;
  txError: string;
  mintPrice: bigint | null;
  balance: bigint | null;
  preflightLoading: boolean;
  preflightError: string;
  mintedTokenId: number | null;
  menuOpen: boolean;
};

type MintFlowData = {
  rawText: string;
  textHash: string;
  thoughtSpecId: string;
  provenanceJson: string;
  existingTokenId: number | null;
  pathIdInput: string;
  pathId: bigint | null;
  deadline: bigint | null;
  signature: string;
  txHash: string;
  error: string;
  errorKind: MintFlowErrorKind;
};

type ThoughtRunContext = {
  mode: Mode;
  provider: string;
  model: string;
  prompt: string;
  clientGeneratedAt: string;
};

type ThoughtTokenMetadata = {
  name?: string;
  image?: string;
  thought?: {
    text?: string;
    provenance?: string;
  };
  properties?: {
    rawText?: string;
    provenanceJson?: string;
    textHash?: string;
    provenanceHash?: string;
    thoughtSpecId?: string;
    pathId?: string | number;
    minter?: string;
    mintedAt?: string | number;
  };
};

type GalleryThought = {
  tokenId: number;
  pathId: string;
  minter: string;
  textHash: string;
  provenanceHash: string;
  thoughtSpecId: string;
  mintedAt: number | null;
  rawText: string;
  provenanceJson: string;
  image: string;
  tokenUri: string;
  txHash: string;
  blockNumber: number;
};

type ActiveThoughtSpec = {
  specId: string;
  specHash: string;
  ref: string;
  pointer: string;
  byteLength: number;
  text: string;
  fetchedAt: string;
};

const CANVAS_WIDTH = 960;
const MIN_CANVAS_SIZE = 180;
const IMAGE_SIZE = 29;
const IMAGE_GAP = 6;
const CANVAS_PADDING = 28;
const IMAGE_RADIUS = 0;
const BACKGROUND_FILL = "#050505";
const THOUGHT_SESSION_STORAGE_KEY = "thought-provider-session";
const THOUGHT_CLI_HISTORY_STORAGE_KEY = "thought-cli-command-history";
const THOUGHT_INSTRUCTIONS_OVERRIDE_KEY = "thought-instructions-override";
const ENABLE_THOUGHT_UPLOAD = window.location.port === "5188";
const OPENROUTER_PKCE_VERIFIER_KEY = "thought-openrouter-pkce-verifier";
const OPENROUTER_AUTH_URL = "https://openrouter.ai/auth";
const OPENROUTER_KEY_URL = "https://openrouter.ai/api/v1/auth/keys";
const OPENROUTER_MODEL_URL = "https://openrouter.ai/api/v1/models";
const OLLAMA_TAGS_URL = "http://127.0.0.1:11434/api/tags";
const MANUAL_MODEL_VALUE = "__manual__";
const LEGACY_OPENROUTER_DEFAULT_MODEL = "openai/gpt-4o-mini";
const OPENROUTER_DEFAULT_MODEL = "meta-llama/llama-3.3-70b-instruct:free";
const LOCAL_ENGINE_ID = "ollama";
const LOCAL_ENGINE_LABEL = "ollama";
const LOCAL_DEFAULT_MODEL = "llama3.2:1b";
const NOTICE_FLASH_MS = 2400;
const CLI_COMMAND_HISTORY_LIMIT = 80;
const APP_VERSION = "0.0.2";
const APP_BUILD = typeof import.meta.env.VITE_APP_BUILD === "string" && import.meta.env.VITE_APP_BUILD
  ? import.meta.env.VITE_APP_BUILD
  : "dev";
const IS_DEV_MODE = import.meta.env.DEV || import.meta.env.MODE === "development";
const MAX_RAW_TEXT_BYTES = 4096;
const MAX_PROVENANCE_BYTES = 1024;
const MINT_GAS_ESTIMATE = 602_800;
const COLOR_FONT_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const CANVAS_TEXT_FAMILY =
  '"Roboto Mono Variable", "Roboto Mono", "Source Code Pro", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace';
const OPENROUTER_PREFERRED_MODELS = [
  OPENROUTER_DEFAULT_MODEL,
  "tencent/hy3-preview:free",
  "inclusionai/ling-2.6-flash:free",
  "google/gemma-4-31b-it:free",
  "qwen/qwen3.6-plus",
  "mistralai/mistral-small-2603",
  "openai/gpt-5.4-mini",
];
const EVM_ADDRESSES = addresses as EvmAddresses;
const THOUGHT_RPC_URL = EVM_ADDRESSES.rpcUrl?.trim() ?? "";
const THOUGHT_CHAIN_ID = EVM_ADDRESSES.chainId ?? 31337;
const THOUGHT_CHAIN_ID_HEX = `0x${THOUGHT_CHAIN_ID.toString(16)}`;
const PATH_NFT_ADDRESS = EVM_ADDRESSES.pathNft?.address?.trim() ?? "";
const PATH_MINT_URL =
  typeof import.meta.env.VITE_PATH_MINT_URL === "string" && import.meta.env.VITE_PATH_MINT_URL.trim()
    ? import.meta.env.VITE_PATH_MINT_URL.trim()
    : ["localhost", "127.0.0.1", "[::1]"].includes(window.location.hostname)
      ? "http://localhost:5173"
      : "https://inshell.art";
const THOUGHT_SPEC_REGISTRY_ADDRESS = EVM_ADDRESSES.thoughtSpecRegistry?.address?.trim() ?? "";
const THOUGHT_TOKEN_ADDRESS = EVM_ADDRESSES.thoughtToken?.address?.trim() ?? "";
const THOUGHT_CHAIN_NAME =
  THOUGHT_CHAIN_ID === 31337 ? "Anvil Local" : THOUGHT_CHAIN_ID === 11155111 ? "Sepolia" : "THOUGHT";
const THOUGHT_EXPLORER_BASE_URL =
  THOUGHT_CHAIN_ID === 1
    ? "https://etherscan.io"
    : THOUGHT_CHAIN_ID === 11155111
      ? "https://sepolia.etherscan.io"
      : "";
const PATH_MOVEMENT_THOUGHT = "0x54484f5547485400000000000000000000000000000000000000000000000000";
const CONSUME_AUTHORIZATION_TYPEHASH = id(
  "ConsumeAuthorization(address pathNft,uint256 chainId,uint256 pathId,bytes32 movement,address claimer,address executor,uint256 nonce,uint256 deadline)",
);
const PATH_CONSUME_AUTH_TTL_SECONDS = 3600n;
const ROUTE_SEARCH_PARAMS = new URLSearchParams(window.location.search);
const RAW_PRESELECTED_PATH_ID = ROUTE_SEARCH_PARAMS.get("path")?.trim() ?? "";
const PRESELECTED_PATH_ID = /^[1-9]\d*$/.test(RAW_PRESELECTED_PATH_ID) ? RAW_PRESELECTED_PATH_ID : "";
const IS_GALLERY_PAGE =
  ROUTE_SEARCH_PARAMS.get("gallery") === "1" ||
  window.location.hash === "#gallery";
const RAW_ROUTE_THOUGHT_TOKEN_ID = ROUTE_SEARCH_PARAMS.get("thought")?.trim() ?? "";
const ROUTE_THOUGHT_TOKEN_ID = /^[1-9]\d*$/.test(RAW_ROUTE_THOUGHT_TOKEN_ID)
  ? Number(RAW_ROUTE_THOUGHT_TOKEN_ID)
  : null;
const GALLERY_TARGET_TOKEN_ID = IS_GALLERY_PAGE ? ROUTE_THOUGHT_TOKEN_ID : null;
const IS_THOUGHT_PAGE = !IS_GALLERY_PAGE && ROUTE_THOUGHT_TOKEN_ID !== null;
const THOUGHT_MINTED_TOPIC = id(
  "ThoughtMinted(uint256,address,uint256,bytes32,bytes32,bytes32,uint64)",
);
const THOUGHT_TOKEN_ABI = [
  "function mint(string rawText, uint256 pathId, bytes32 thoughtSpecId, string provenanceJson, uint256 deadline, bytes pathSignature) payable returns (uint256)",
  "function mintPrice() view returns (uint256)",
  "function tokenOfThought(bytes32 textHash) view returns (uint256)",
  "function tokenURI(uint256 tokenId) view returns (string)",
  "function totalSupply() view returns (uint256)",
  "function thoughtText(uint256 tokenId) view returns (string)",
  "function authorOf(uint256 tokenId) view returns (address)",
  "event ThoughtMinted(uint256 indexed tokenId, address indexed minter, uint256 indexed pathId, bytes32 textHash, bytes32 provenanceHash, bytes32 thoughtSpecId, uint64 mintedAt)",
] as const;
const PATH_NFT_ABI = [
  "function getConsumeNonce(address claimer) view returns (uint256)",
  "function getAuthorizedMinter(bytes32 movement) view returns (address)",
  "function getMovementQuota(bytes32 movement) view returns (uint32)",
  "function getStage(uint256 tokenId) view returns (uint8)",
  "function getStageMinted(uint256 tokenId) view returns (uint32)",
  "function ownerOf(uint256 tokenId) view returns (address)",
] as const;
const THOUGHT_SPEC_REGISTRY_ABI = [
  "function activeSpecMeta() view returns (bytes32 specId, bytes32 specHash, string ref, address pointer, uint32 byteLength, uint64 registeredAt, bool exists)",
  "function activeSpecText() view returns (string)",
  "function specMeta(bytes32 specId) view returns (bytes32 specHash, string ref, address pointer, uint32 byteLength, uint64 registeredAt, bool exists)",
  "function specText(bytes32 specId) view returns (string)",
  "function validateSpec(bytes32 specId) view returns (bool)",
] as const;
const EVM_ABI_CODER = AbiCoder.defaultAbiCoder();

const DIRECT_PROVIDERS: Record<DirectProviderId, ProviderConfig> = {
  openai: {
    id: "openai",
    label: "openai",
    defaultModel: "gpt-5-mini",
  },
  openrouter: {
    id: "openrouter",
    label: "openrouter",
    defaultModel: OPENROUTER_DEFAULT_MODEL,
  },
  anthropic: {
    id: "anthropic",
    label: "anthropic",
    defaultModel: "claude-3-5-haiku-latest",
  },
};

const STATIC_MODEL_OPTIONS: Record<ModelSourceId, ModelOption[]> = {
  openai: [
    { id: "gpt-5-mini", label: "gpt-5-mini" },
    { id: "gpt-5", label: "gpt-5" },
    { id: "gpt-5.4-mini", label: "gpt-5.4-mini" },
    { id: "gpt-5.4", label: "gpt-5.4" },
  ],
  openrouter: OPENROUTER_PREFERRED_MODELS.map((model) => ({ id: model, label: model })),
  anthropic: [
    { id: "claude-3-5-haiku-latest", label: "claude-3-5-haiku-latest" },
    { id: "claude-sonnet-4-5", label: "claude-sonnet-4-5" },
    { id: "claude-opus-4-5", label: "claude-opus-4-5" },
  ],
  ollama: [{ id: LOCAL_DEFAULT_MODEL, label: LOCAL_DEFAULT_MODEL }],
};

const parsedColorFont = JSON.parse(colorFontRaw) as ColorFontFile;
const COLOR_FONT = Object.fromEntries(
  parsedColorFont.colors
    .slice()
    .sort((left, right) => left.index - right.index)
    .map((entry, index) => [COLOR_FONT_ALPHABET[index] ?? "?", entry.hex])
    .filter(([letter]) => letter !== "?"),
) as Record<string, string>;

const frontpageShell = document.querySelector(".frontpage-shell") as HTMLElement | null;
const frontpageStage = document.querySelector(".frontpage-stage") as HTMLElement | null;
const frontpageMain = document.querySelector(".frontpage-main") as HTMLElement | null;
const frontpageTitle = document.getElementById("frontpage-title") as HTMLElement | null;
const modeConnectButton = document.getElementById("mode-connect") as HTMLButtonElement | null;
const modeDirectButton = document.getElementById("mode-direct") as HTMLButtonElement | null;
const modeLocalButton = document.getElementById("mode-local") as HTMLButtonElement | null;
const thoughtCliTranscript = document.getElementById("thought-cli-transcript") as HTMLElement | null;
const thoughtCliSuggestions = document.getElementById("thought-cli-suggestions") as HTMLElement | null;
const thoughtCliForm = document.getElementById("thought-cli-form") as HTMLFormElement | null;
const thoughtCliInput = document.getElementById("thought-cli-input") as HTMLInputElement | null;
const connectPanel = document.getElementById("connect-panel") as HTMLElement | null;
const connectOpenRouterButton = document.getElementById("connect-openrouter") as HTMLButtonElement | null;
const connectStatusRow = document.getElementById("connect-status-row") as HTMLElement | null;
const connectStatusCopy = document.getElementById("connect-status-copy") as HTMLElement | null;
const disconnectOpenRouterButton = document.getElementById("disconnect-openrouter") as HTMLButtonElement | null;
const providerField = document.getElementById("provider-field") as HTMLElement | null;
const providerBox = document.getElementById("provider-box") as HTMLSelectElement | null;
const apiKeyField = document.getElementById("api-key-field") as HTMLElement | null;
const apiKeyLabel = document.querySelector('label[for="api-key-box"]') as HTMLLabelElement | null;
const apiKeyBox = document.getElementById("api-key-box") as HTMLInputElement | null;
const localEngineField = document.getElementById("local-engine-field") as HTMLElement | null;
const localEngineValue = document.getElementById("local-engine-value") as HTMLElement | null;
const localStatus = document.getElementById("local-status") as HTMLElement | null;
const localHelper = document.getElementById("local-helper") as HTMLElement | null;
const thoughtCanvasPanel = document.querySelector(".thought-canvas-panel") as HTMLElement | null;
const thoughtCanvasFrame = document.querySelector(".thought-canvas-frame") as HTMLElement | null;
const modelBox = document.getElementById("model-box") as HTMLSelectElement | null;
const modelManualBox = document.getElementById("model-manual-box") as HTMLInputElement | null;
const promptBox = document.getElementById("prompt-box") as HTMLInputElement | null;
const thoughtFileField = document.getElementById("thought-file-field") as HTMLElement | null;
const uploadThoughtFileButton = document.getElementById("upload-thought-file") as HTMLButtonElement | null;
const clearThoughtFileButton = document.getElementById("clear-thought-file") as HTMLButtonElement | null;
const thoughtFileInput = document.getElementById("thought-file-input") as HTMLInputElement | null;
const thoughtFileStatus = document.getElementById("thought-file-status") as HTMLElement | null;
const runAgentButton = document.getElementById("run-agent") as HTMLButtonElement | null;
const actionStatusCopy = document.getElementById("action-status-copy") as HTMLElement | null;
const mintWalletToggle = document.getElementById("mint-wallet-toggle") as HTMLButtonElement | null;
const mintWalletDot = document.getElementById("mint-wallet-dot") as HTMLElement | null;
const mintWalletMenu = document.getElementById("mint-wallet-menu") as HTMLElement | null;
const mintWalletAddress = document.getElementById("mint-wallet-address") as HTMLElement | null;
const mintWalletNetwork = document.getElementById("mint-wallet-network") as HTMLElement | null;
const mintWalletTokenRow = document.getElementById("mint-wallet-token-row") as HTMLElement | null;
const mintWalletToken = document.getElementById("mint-wallet-token") as HTMLElement | null;
const mintWalletCopyAddress = document.getElementById("mint-wallet-copy-address") as HTMLButtonElement | null;
const mintWalletCopyTx = document.getElementById("mint-wallet-copy-tx") as HTMLButtonElement | null;
const mintWalletRefresh = document.getElementById("mint-wallet-refresh") as HTMLButtonElement | null;
const resetThoughtButton = document.getElementById("reset-thought") as HTMLButtonElement | null;
const runStatus = document.getElementById("run-status") as HTMLElement | null;
const warningBox = document.getElementById("input-warning") as HTMLElement | null;
const thoughtDebug = document.getElementById("thought-debug") as HTMLElement | null;
const thoughtDebugToggle = document.getElementById("thought-debug-toggle") as HTMLButtonElement | null;
const thoughtDebugPanel = document.getElementById("thought-debug-panel") as HTMLElement | null;
const thoughtDebugEnabled = document.getElementById("thought-debug-enabled") as HTMLInputElement | null;
const thoughtDebugReset = document.getElementById("thought-debug-reset") as HTMLButtonElement | null;
const thoughtDebugCta = document.getElementById("thought-debug-cta") as HTMLSelectElement | null;
const thoughtDebugCtaStatus = document.getElementById("thought-debug-cta-status") as HTMLSelectElement | null;
const thoughtDebugWarning = document.getElementById("thought-debug-warning") as HTMLSelectElement | null;
const thoughtInstructionsLink = document.getElementById("thought-instructions-link") as HTMLAnchorElement | null;
const thoughtGalleryLink = document.getElementById("thought-gallery-link") as HTMLAnchorElement | null;
const galleryPage = document.getElementById("gallery-page") as HTMLElement | null;
const galleryStatus = document.getElementById("gallery-status") as HTMLElement | null;
const galleryGrid = document.getElementById("gallery-grid") as HTMLElement | null;
const thoughtPage = document.getElementById("thought-page") as HTMLElement | null;
const thoughtDetailTitleToken = document.getElementById("thought-detail-token-id") as HTMLElement | null;
const thoughtDetailGalleryLink = document.getElementById("thought-detail-gallery-link") as HTMLAnchorElement | null;
const thoughtDetailStatus = document.getElementById("thought-detail-status") as HTMLElement | null;
const thoughtDetailBody = document.getElementById("thought-detail-body") as HTMLElement | null;
const thoughtDetailImage = document.getElementById("thought-detail-image") as HTMLImageElement | null;
const thoughtDetailCanonicalTitle = document.getElementById("thought-detail-canonical-title") as HTMLElement | null;
const thoughtDetailPath = document.getElementById("thought-detail-path") as HTMLElement | null;
const thoughtDetailMinter = document.getElementById("thought-detail-minter") as HTMLElement | null;
const thoughtDetailMinted = document.getElementById("thought-detail-minted") as HTMLElement | null;
const thoughtDetailTextHash = document.getElementById("thought-detail-text-hash") as HTMLElement | null;
const thoughtDetailProvenanceHash = document.getElementById("thought-detail-provenance-hash") as HTMLElement | null;
const thoughtDetailSpec = document.getElementById("thought-detail-spec") as HTMLElement | null;
const thoughtDetailTx = document.getElementById("thought-detail-tx") as HTMLElement | null;
const thoughtDetailProvenanceJson = document.getElementById("thought-detail-provenance-json") as HTMLElement | null;
const canvas = document.getElementById("thought-grid") as HTMLCanvasElement | null;
const mintSheetBackdrop = document.getElementById("mint-sheet-backdrop") as HTMLElement | null;
const mintSheet = document.getElementById("mint-sheet") as HTMLElement | null;
const mintSheetTitle = document.getElementById("mint-sheet-title") as HTMLElement | null;
const mintSheetClose = document.getElementById("mint-sheet-close") as HTMLButtonElement | null;
const mintSheetCopy = document.getElementById("mint-sheet-copy") as HTMLElement | null;
const mintSheetFlow = document.getElementById("mint-sheet-flow") as HTMLElement | null;
const mintSheetPathField = document.getElementById("mint-sheet-path-field") as HTMLElement | null;
const mintSheetPathBox = document.getElementById("mint-sheet-path-box") as HTMLInputElement | null;
const mintSheetProvenance = document.getElementById("mint-sheet-provenance") as HTMLElement | null;
const mintSheetStatus = document.getElementById("mint-sheet-status") as HTMLElement | null;
const mintSheetContext = document.getElementById("mint-sheet-context") as HTMLElement | null;
const mintSheetPrimary = document.getElementById("mint-sheet-primary") as HTMLButtonElement | null;
const mintSheetSecondary = document.getElementById("mint-sheet-secondary") as HTMLButtonElement | null;
const mintSheetTertiary = document.getElementById("mint-sheet-tertiary") as HTMLButtonElement | null;

if (
  !frontpageShell ||
  !frontpageStage ||
  !frontpageMain ||
  !frontpageTitle ||
  !modeConnectButton ||
  !modeDirectButton ||
  !modeLocalButton ||
  !thoughtCliTranscript ||
  !thoughtCliSuggestions ||
  !thoughtCliForm ||
  !thoughtCliInput ||
  !connectPanel ||
  !connectOpenRouterButton ||
  !connectStatusRow ||
  !connectStatusCopy ||
  !disconnectOpenRouterButton ||
  !providerField ||
  !providerBox ||
  !apiKeyField ||
  !apiKeyLabel ||
  !apiKeyBox ||
  !localEngineField ||
  !localEngineValue ||
  !localStatus ||
  !localHelper ||
  !thoughtCanvasPanel ||
  !thoughtCanvasFrame ||
  !modelBox ||
  !modelManualBox ||
  !promptBox ||
  !thoughtFileField ||
  !uploadThoughtFileButton ||
  !clearThoughtFileButton ||
  !thoughtFileInput ||
  !thoughtFileStatus ||
  !runAgentButton ||
  !actionStatusCopy ||
  !mintWalletToggle ||
  !mintWalletDot ||
  !mintWalletMenu ||
  !mintWalletAddress ||
  !mintWalletNetwork ||
  !mintWalletTokenRow ||
  !mintWalletToken ||
  !mintWalletCopyAddress ||
  !mintWalletCopyTx ||
  !mintWalletRefresh ||
  !resetThoughtButton ||
  !runStatus ||
  !warningBox ||
  !thoughtDebug ||
  !thoughtDebugToggle ||
  !thoughtDebugPanel ||
  !thoughtDebugEnabled ||
  !thoughtDebugReset ||
  !thoughtDebugCta ||
  !thoughtDebugCtaStatus ||
  !thoughtDebugWarning ||
  !thoughtInstructionsLink ||
  !thoughtGalleryLink ||
  !galleryPage ||
  !galleryStatus ||
  !galleryGrid ||
  !thoughtPage ||
  !thoughtDetailTitleToken ||
  !thoughtDetailGalleryLink ||
  !thoughtDetailStatus ||
  !thoughtDetailBody ||
  !thoughtDetailImage ||
  !thoughtDetailCanonicalTitle ||
  !thoughtDetailPath ||
  !thoughtDetailMinter ||
  !thoughtDetailMinted ||
  !thoughtDetailTextHash ||
  !thoughtDetailProvenanceHash ||
  !thoughtDetailSpec ||
  !thoughtDetailTx ||
  !thoughtDetailProvenanceJson ||
  !canvas ||
  !mintSheetBackdrop ||
  !mintSheet ||
  !mintSheetTitle ||
  !mintSheetClose ||
  !mintSheetCopy ||
  !mintSheetFlow ||
  !mintSheetPathField ||
  !mintSheetPathBox ||
  !mintSheetProvenance ||
  !mintSheetStatus ||
  !mintSheetContext ||
  !mintSheetPrimary ||
  !mintSheetSecondary ||
  !mintSheetTertiary
) {
  throw new Error("Front page elements are missing.");
}

localEngineValue.textContent = LOCAL_ENGINE_LABEL;

const context = canvas.getContext("2d");

if (!context) {
  throw new Error("Canvas 2D context is unavailable.");
}

let statusTimer: number | null = null;
let warningTimer: number | null = null;
let panelWarningMessage = "";
let panelWarningLevel: PanelWarningLevel = "error";
let currentOutputText = "";
let runInFlight = false;
let runState: ThoughtRunState = "idle";
let cliSuggestionContext: "auto" | "help" | "current" | "config" = "auto";
let walletConnectInFlight = false;
let primaryActionState: PrimaryActionState = "run";
let secondaryActionState: SecondaryActionState = "none";
let thoughtInstructionsObjectUrl: string | null = null;
const DEFAULT_DEBUG_STATE: ThoughtDebugState = {
  open: false,
  enabled: false,
  cta: "auto",
  ctaStatus: "auto",
  warning: "auto",
};
const DEBUG_CTA_LABELS: Record<ThoughtDebugCtaOverride, string> = {
  auto: "auto",
  run: "run",
  running: "running",
  retry: "retry",
  mint: "mint",
  view_thought: "view THOUGHT",
};
const DEBUG_CTA_STATUS_LABELS: Record<ThoughtDebugCtaStatusOverride, string> = {
  auto: "auto",
  none: "none",
  ready: "ready",
  minted: "minted",
  model_needed: "model access needed",
  generation_failed: "generation failed",
  mint_unavailable: "mint unavailable",
};
const DEBUG_WARNING_LABELS: Record<ThoughtDebugWarningOverride, string> = {
  auto: "auto",
  none: "none",
  prompt_required: "prompt required",
  model_required: "model required",
  openrouter_required: "openrouter required",
  api_key_required: "api key required",
  ollama_not_found: "ollama not found",
  spec_unavailable: "spec unavailable",
  provider_error: "provider error",
  external_service: "external service",
  openrouter_connect_constraint: "openrouter constraint",
  wallet_missing: "wallet missing",
  wallet_connect_failed: "wallet connect failed",
  wallet_switch_failed: "wallet switch failed",
  thought_too_large: "THOUGHT too large",
  mint_contract_unavailable: "mint unavailable",
};
const DEBUG_CTA_OPTIONS = Object.keys(DEBUG_CTA_LABELS) as ThoughtDebugCtaOverride[];
const DEBUG_STATUS_BY_CTA: Record<ThoughtDebugCtaOverride, ThoughtDebugCtaStatusOverride[]> = {
  auto: ["auto"],
  run: ["auto", "none", "model_needed"],
  running: ["auto", "none"],
  retry: ["auto", "generation_failed"],
  mint: ["auto", "ready", "mint_unavailable"],
  view_thought: ["auto", "minted"],
};
const DEBUG_DEFAULT_STATUS_BY_CTA: Record<ThoughtDebugCtaOverride, ThoughtDebugCtaStatusOverride> = {
  auto: "auto",
  run: "none",
  running: "none",
  retry: "generation_failed",
  mint: "ready",
  view_thought: "minted",
};
const DEBUG_WARNINGS_BY_CTA_STATUS: Record<
  ThoughtDebugCtaOverride,
  Partial<Record<ThoughtDebugCtaStatusOverride, ThoughtDebugWarningOverride[]>>
> = {
  auto: {
    auto: ["auto"],
  },
  run: {
    none: [
      "auto",
      "none",
      "prompt_required",
      "model_required",
      "spec_unavailable",
      "provider_error",
      "external_service",
    ],
    model_needed: [
      "auto",
      "none",
      "openrouter_required",
      "api_key_required",
      "ollama_not_found",
      "openrouter_connect_constraint",
    ],
  },
  running: {
    none: ["auto", "none"],
  },
  retry: {
    generation_failed: [
      "auto",
      "provider_error",
      "external_service",
      "ollama_not_found",
      "spec_unavailable",
    ],
  },
  mint: {
    ready: ["auto", "none", "thought_too_large"],
    mint_unavailable: ["auto", "none", "mint_contract_unavailable", "spec_unavailable"],
  },
  view_thought: {
    minted: ["auto", "none"],
  },
};
let debugState: ThoughtDebugState = { ...DEFAULT_DEBUG_STATE };

const getDebugStatusOptions = () => DEBUG_STATUS_BY_CTA[debugState.cta];

const getEffectiveDebugCtaStatus = () =>
  debugState.ctaStatus === "auto"
    ? DEBUG_DEFAULT_STATUS_BY_CTA[debugState.cta]
    : debugState.ctaStatus;

const getDebugWarningOptions = () => {
  const status = getEffectiveDebugCtaStatus();
  return DEBUG_WARNINGS_BY_CTA_STATUS[debugState.cta][status] ?? ["auto"];
};

const normalizeDebugHierarchy = () => {
  const statusOptions = getDebugStatusOptions();
  if (!statusOptions.includes(debugState.ctaStatus)) {
    debugState.ctaStatus = "auto";
  }

  const warningOptions = getDebugWarningOptions();
  if (!warningOptions.includes(debugState.warning)) {
    debugState.warning = "auto";
  }
};

const syncDebugSelect = <T extends string>(
  select: HTMLSelectElement,
  values: T[],
  labels: Record<T, string>,
  selectedValue: T,
) => {
  const options = values.map((value) => {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = labels[value];
    return option;
  });

  select.replaceChildren(...options);
  select.value = selectedValue;
};
const modelOptionsCache = new Map<ModelSourceId, ModelOption[]>();
const modelOptionsLoading = new Set<ModelSourceId>();
const walletState: ThoughtWalletState = {
  detected: false,
  address: "",
  chainId: null,
  txState: "idle",
  txHash: "",
  txError: "",
  mintPrice: null,
  balance: null,
  preflightLoading: false,
  preflightError: "",
  mintedTokenId: null,
  menuOpen: false,
};
let mintFlowState: MintFlowState = "closed";
let mintFlowUiMode: MintFlowUiMode = "sheet";
const mintFlowData: MintFlowData = {
  rawText: "",
  textHash: "",
  thoughtSpecId: "",
  provenanceJson: "",
  existingTokenId: null,
  pathIdInput: "",
  pathId: null,
  deadline: null,
  signature: "",
  txHash: "",
  error: "",
  errorKind: "none",
};
let currentRunContext: ThoughtRunContext | null = null;
let activeThoughtSpec: ActiveThoughtSpec | null = null;
let activeThoughtSpecPromise: Promise<ActiveThoughtSpec> | null = null;
let readProvider: JsonRpcProvider | null = null;
let readThoughtToken: Contract | null = null;
let readThoughtSpecRegistry: Contract | null = null;
let readPathNft: Contract | null = null;
let walletListenersBound = false;
let mintSheetPrimaryAction: MintSheetAction = "none";
let mintSheetSecondaryAction: MintSheetAction = "none";
let mintSheetTertiaryAction: MintSheetAction = "none";
let lastMintSheetFocusRefreshAt = 0;
const cliEntries: CliEntry[] = [];
const cliCommandHistory: string[] = [];
let cliCommandInFlight = false;
let cliHistoryIndex: number | null = null;
let cliHistoryDraft = "";

const getDefaultSessionState = (): ThoughtSessionState => ({
  mode: "connect",
  prompt: "",
  connect: {
    apiKey: "",
    model: OPENROUTER_DEFAULT_MODEL,
  },
  direct: {
    provider: "openai",
    apiKey: "",
    model: DIRECT_PROVIDERS.openai.defaultModel,
  },
  local: {
    available: null,
    model: LOCAL_DEFAULT_MODEL,
  },
});

const normalizeStoredModel = (sourceId: ModelSourceId, model: string | undefined) => {
  if (sourceId === "openrouter" && (!model || model === LEGACY_OPENROUTER_DEFAULT_MODEL)) {
    return DIRECT_PROVIDERS.openrouter.defaultModel;
  }

  const fallback =
    sourceId === LOCAL_ENGINE_ID ? LOCAL_DEFAULT_MODEL : DIRECT_PROVIDERS[sourceId].defaultModel;

  return model?.trim() || fallback;
};

const isMode = (value: unknown): value is Mode =>
  value === "connect" || value === "direct" || value === "local";

const isDirectProviderId = (value: unknown): value is DirectProviderId =>
  value === "openai" || value === "openrouter" || value === "anthropic";

const migrateLegacyState = (
  parsed: LegacySessionState,
  fallback: ThoughtSessionState,
): ThoughtSessionState => {
  const legacyProviders = parsed.providers ?? {};
  const connectModel = normalizeStoredModel("openrouter", legacyProviders.openrouter?.model);
  const connectApiKey = legacyProviders.openrouter?.apiKey?.trim() ?? "";
  const directProvider = isDirectProviderId(parsed.activeProvider) ? parsed.activeProvider : "openai";
  const directModel = normalizeStoredModel(directProvider, legacyProviders[directProvider]?.model);
  const directApiKey = legacyProviders[directProvider]?.apiKey?.trim() ?? "";
  const legacyLocalModel =
    legacyProviders.ollama?.model ?? legacyProviders.harness?.model ?? fallback.local.model;

  return {
    mode:
      parsed.authMode === "connect"
        ? "connect"
        : parsed.activeProvider === "ollama" || parsed.activeProvider === "harness"
          ? "local"
          : "direct",
    prompt: "",
    connect: {
      apiKey: connectApiKey,
      model: connectModel,
    },
    direct: {
      provider: directProvider,
      apiKey: directApiKey,
      model: directModel,
    },
    local: {
      available: null,
      model: normalizeStoredModel("ollama", legacyLocalModel),
    },
  };
};

const readSessionState = (): ThoughtSessionState => {
  const fallback = getDefaultSessionState();
  const raw = sessionStorage.getItem(THOUGHT_SESSION_STORAGE_KEY);

  if (!raw) {
    return fallback;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<ThoughtSessionState> & LegacySessionState;

    if (!("mode" in parsed)) {
      return migrateLegacyState(parsed, fallback);
    }

    const connect = (parsed.connect ?? {}) as Partial<ThoughtSessionState["connect"]>;
    const direct = (parsed.direct ?? {}) as Partial<ThoughtSessionState["direct"]>;
    const local = (parsed.local ?? {}) as Partial<ThoughtSessionState["local"]>;

    return {
      mode: isMode(parsed.mode) ? parsed.mode : fallback.mode,
      prompt: typeof parsed.prompt === "string" ? parsed.prompt : "",
      connect: {
        apiKey: typeof connect.apiKey === "string" ? connect.apiKey : "",
        model: normalizeStoredModel(
          "openrouter",
          typeof connect.model === "string" ? connect.model : undefined,
        ),
      },
      direct: {
        provider: isDirectProviderId(direct.provider) ? direct.provider : fallback.direct.provider,
        apiKey: typeof direct.apiKey === "string" ? direct.apiKey : "",
        model: normalizeStoredModel(
          isDirectProviderId(direct.provider) ? direct.provider : fallback.direct.provider,
          typeof direct.model === "string" ? direct.model : undefined,
        ),
      },
      local: {
        available:
          typeof local.available === "boolean" ? local.available : fallback.local.available,
        model: normalizeStoredModel(
          "ollama",
          typeof local.model === "string" ? local.model : undefined,
        ),
      },
    };
  } catch {
    return fallback;
  }
};

let sessionState = readSessionState();

const writeSessionState = () => {
  sessionStorage.setItem(THOUGHT_SESSION_STORAGE_KEY, JSON.stringify(sessionState));
};

const readThoughtInstructionsOverride = (): ThoughtInstructionsOverride | null => {
  if (!ENABLE_THOUGHT_UPLOAD) {
    sessionStorage.removeItem(THOUGHT_INSTRUCTIONS_OVERRIDE_KEY);
    return null;
  }

  const raw = sessionStorage.getItem(THOUGHT_INSTRUCTIONS_OVERRIDE_KEY);

  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<ThoughtInstructionsOverride>;
    const name = typeof parsed.name === "string" ? parsed.name.trim() : "";
    const content = typeof parsed.content === "string" ? parsed.content : "";

    if (!name || !content.trim()) {
      return null;
    }

    return { name, content };
  } catch {
    return null;
  }
};

let thoughtInstructionsOverride = readThoughtInstructionsOverride();

const writeThoughtInstructionsOverride = () => {
  if (!ENABLE_THOUGHT_UPLOAD) {
    sessionStorage.removeItem(THOUGHT_INSTRUCTIONS_OVERRIDE_KEY);
    return;
  }

  if (thoughtInstructionsOverride) {
    sessionStorage.setItem(
      THOUGHT_INSTRUCTIONS_OVERRIDE_KEY,
      JSON.stringify(thoughtInstructionsOverride),
    );
  } else {
    sessionStorage.removeItem(THOUGHT_INSTRUCTIONS_OVERRIDE_KEY);
  }
};

const getActiveThoughtInstructions = () =>
  activeThoughtSpec?.text ?? thoughtInstructionsOverride?.content ?? thoughtInstructions;

const getActiveThoughtInstructionsLabel = () => {
  if (activeThoughtSpec) {
    return `${activeThoughtSpec.ref} from chain`;
  }
  return THOUGHT_SPEC_REGISTRY_ADDRESS
    ? "onchain THOUGHT.md"
    : (thoughtInstructionsOverride?.name ?? "bundled THOUGHT.md");
};

const isLoopbackHost = (hostname: string) =>
  hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]";

const isOpenRouterConnectSupported = () => {
  if (isLoopbackHost(window.location.hostname)) {
    return true;
  }

  if (window.location.protocol !== "https:") {
    return false;
  }

  const port = window.location.port;
  return port === "" || port === "443" || port === "3000";
};

const getOpenRouterConnectConstraintMessage = () =>
  "openrouter connect needs localhost or https on port 443 or 3000. use config direct on LAN http.";

const revokeThoughtInstructionsObjectUrl = () => {
  if (thoughtInstructionsObjectUrl) {
    URL.revokeObjectURL(thoughtInstructionsObjectUrl);
    thoughtInstructionsObjectUrl = null;
  }
};

const syncThoughtInstructionsLink = () => {
  revokeThoughtInstructionsObjectUrl();

  if (activeThoughtSpec) {
    thoughtInstructionsObjectUrl = URL.createObjectURL(
      new Blob([activeThoughtSpec.text], {
        type: "text/markdown;charset=utf-8",
      }),
    );
    thoughtInstructionsLink.href = thoughtInstructionsObjectUrl;
    thoughtInstructionsLink.download = "THOUGHT.md";
    thoughtInstructionsLink.title = `Open ${activeThoughtSpec.ref} from chain`;
    return;
  }

  if (thoughtInstructionsOverride) {
    thoughtInstructionsObjectUrl = URL.createObjectURL(
      new Blob([thoughtInstructionsOverride.content], {
        type: "text/markdown;charset=utf-8",
      }),
    );
    thoughtInstructionsLink.href = thoughtInstructionsObjectUrl;
    thoughtInstructionsLink.download = thoughtInstructionsOverride.name || "THOUGHT.md";
    thoughtInstructionsLink.title = `Open ${thoughtInstructionsOverride.name || "THOUGHT.md"}`;
    return;
  }

  thoughtInstructionsLink.href = thoughtInstructionsUrl;
  thoughtInstructionsLink.download = "";
  thoughtInstructionsLink.title = "Open bundled THOUGHT.md";
};

const getInjectedProviders = () => {
  const injected = (window as Window & { ethereum?: EthereumProvider }).ethereum;

  if (!injected) {
    return [];
  }

  if (Array.isArray(injected.providers) && injected.providers.length > 0) {
    return injected.providers.filter(Boolean);
  }

  return [injected];
};

const getEthereumProvider = () => {
  const providers = getInjectedProviders();
  return providers.find((provider) => provider.isMetaMask) ?? providers[0] ?? null;
};

const extractPrimaryAccount = (accounts: unknown) =>
  Array.isArray(accounts) && typeof accounts[0] === "string" ? accounts[0] : "";

const waitForWalletAddress = async (ethereum: EthereumProvider, timeoutMs = 18000) => {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    try {
      const account = extractPrimaryAccount(await ethereum.request({ method: "eth_accounts" }));
      if (account) {
        return account;
      }
    } catch {
      // Keep polling while the wallet prompt is open.
    }

    await new Promise<void>((resolve) => {
      window.setTimeout(resolve, 250);
    });
  }

  return "";
};

const getReadProvider = () => {
  if (!THOUGHT_RPC_URL) {
    return null;
  }

  if (!readProvider) {
    readProvider = new JsonRpcProvider(THOUGHT_RPC_URL);
  }

  return readProvider;
};

const getReadThoughtToken = () => {
  const provider = getReadProvider();
  if (!provider || !THOUGHT_TOKEN_ADDRESS) {
    return null;
  }

  if (!readThoughtToken) {
    readThoughtToken = new Contract(THOUGHT_TOKEN_ADDRESS, THOUGHT_TOKEN_ABI, provider);
  }

  return readThoughtToken;
};

const getReadThoughtSpecRegistry = () => {
  const provider = getReadProvider();
  if (!provider || !THOUGHT_SPEC_REGISTRY_ADDRESS) {
    return null;
  }

  if (!readThoughtSpecRegistry) {
    readThoughtSpecRegistry = new Contract(
      THOUGHT_SPEC_REGISTRY_ADDRESS,
      THOUGHT_SPEC_REGISTRY_ABI,
      provider,
    );
  }

  return readThoughtSpecRegistry;
};

const getReadPathNft = () => {
  const provider = getReadProvider();
  if (!provider || !PATH_NFT_ADDRESS) {
    return null;
  }

  if (!readPathNft) {
    readPathNft = new Contract(PATH_NFT_ADDRESS, PATH_NFT_ABI, provider);
  }

  return readPathNft;
};

const byteLength = (value: string) => new TextEncoder().encode(value).length;

const formatCount = (value: number) => value.toLocaleString("en-US");

const hashText = (value: string) => keccak256(toUtf8Bytes(value));

const canonicalThoughtTitle = (value: string) => value.replace(/[^A-Za-z]+/g, "").toUpperCase();

const getThoughtSpecCacheKey = (specId: string, specHash: string) =>
  `thought.spec.${THOUGHT_CHAIN_ID}.${THOUGHT_SPEC_REGISTRY_ADDRESS.toLowerCase()}.${specId.toLowerCase()}.${specHash.toLowerCase()}`;

const getThoughtSpecStorage = () => {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
};

const readCachedThoughtSpec = (meta: Omit<ActiveThoughtSpec, "text" | "fetchedAt">) => {
  try {
    const storage = getThoughtSpecStorage();
    if (!storage) {
      return null;
    }

    const cacheKey = getThoughtSpecCacheKey(meta.specId, meta.specHash);
    const raw = storage.getItem(cacheKey);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as Partial<ActiveThoughtSpec> & {
      chainId?: number;
      registry?: string;
    };
    const text = typeof parsed.text === "string" ? parsed.text : "";
    if (
      parsed.chainId !== THOUGHT_CHAIN_ID ||
      typeof parsed.registry !== "string" ||
      parsed.registry.toLowerCase() !== THOUGHT_SPEC_REGISTRY_ADDRESS.toLowerCase() ||
      parsed.specId?.toLowerCase() !== meta.specId.toLowerCase() ||
      parsed.specHash?.toLowerCase() !== meta.specHash.toLowerCase() ||
      byteLength(text) !== meta.byteLength ||
      hashText(text).toLowerCase() !== meta.specHash.toLowerCase()
    ) {
      storage.removeItem(cacheKey);
      return null;
    }

    return {
      ...meta,
      text,
      fetchedAt: parsed.fetchedAt ?? new Date().toISOString(),
    };
  } catch {
    return null;
  }
};

const writeCachedThoughtSpec = (spec: ActiveThoughtSpec) => {
  try {
    const storage = getThoughtSpecStorage();
    if (!storage) {
      return;
    }

    storage.setItem(
      getThoughtSpecCacheKey(spec.specId, spec.specHash),
      JSON.stringify({
        chainId: THOUGHT_CHAIN_ID,
        registry: THOUGHT_SPEC_REGISTRY_ADDRESS,
        specId: spec.specId,
        specHash: spec.specHash,
        ref: spec.ref,
        byteLength: spec.byteLength,
        text: spec.text,
        fetchedAt: spec.fetchedAt,
      }),
    );
  } catch {
    // Public immutable cache is best-effort.
  }
};

const loadActiveThoughtSpec = async () => {
  const registry = getReadThoughtSpecRegistry();
  if (!registry) {
    throw new Error("spec unavailable.");
  }

  const [specId, specHash, ref, pointer, byteLength_,, exists] = (await registry.activeSpecMeta()) as [
    string,
    string,
    string,
    string,
    bigint,
    bigint,
    boolean,
  ];
  const meta = {
    specId,
    specHash,
    ref,
    pointer,
    byteLength: Number(byteLength_),
  };

  if (!exists || specId === "0x0000000000000000000000000000000000000000000000000000000000000000") {
    throw new Error("spec unavailable.");
  }

  const cached = readCachedThoughtSpec(meta);
  if (cached && await registry.validateSpec(specId)) {
    return cached;
  }

  const [validSpec, text] = await Promise.all([
    registry.validateSpec(specId) as Promise<boolean>,
    registry.activeSpecText() as Promise<string>,
  ]);
  if (!validSpec) {
    throw new Error("spec mismatch.");
  }
  if (byteLength(text) !== meta.byteLength || hashText(text).toLowerCase() !== specHash.toLowerCase()) {
    throw new Error("spec mismatch.");
  }

  const spec = {
    ...meta,
    text,
    fetchedAt: new Date().toISOString(),
  };
  writeCachedThoughtSpec(spec);
  return spec;
};

const ensureActiveThoughtSpec = async () => {
  if (activeThoughtSpec) {
    return activeThoughtSpec;
  }

  activeThoughtSpecPromise ??= loadActiveThoughtSpec()
    .then((spec) => {
      activeThoughtSpec = spec;
      activeThoughtSpecPromise = null;
      return spec;
    })
    .catch((error) => {
      activeThoughtSpecPromise = null;
      throw error;
    });

  return activeThoughtSpecPromise;
};

const formatThoughtSpecError = (error: unknown) => {
  const message = error instanceof Error ? error.message : "";
  if (/failed to fetch|network|connection refused|could not connect|econnrefused/i.test(message)) {
    return "Failed to fetch THOUGHT.md.";
  }

  if (!message || message === "spec unavailable.") {
    return "THOUGHT.md unavailable.";
  }

  if (message === "spec mismatch.") {
    return "THOUGHT.md spec mismatch.";
  }

  return message.includes("THOUGHT.md") ? message : `THOUGHT.md ${message}`;
};

type StableJsonValue =
  | string
  | number
  | boolean
  | null
  | StableJsonValue[]
  | { [key: string]: StableJsonValue };

const stableStringify = (value: StableJsonValue): string => {
  if (value === null || typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }

  return `{${Object.keys(value)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
    .join(",")}}`;
};

const getCurrentProviderForProvenance = () => {
  if (sessionState.mode === "connect") {
    return "openrouter";
  }

  if (sessionState.mode === "direct") {
    return sessionState.direct.provider;
  }

  return LOCAL_ENGINE_ID;
};

const buildProvenanceJson = (textHash: string) => {
  const spec = activeThoughtSpec;
  if (!spec) {
    throw new Error("spec unavailable.");
  }

  const context = currentRunContext ?? {
    mode: sessionState.mode,
    provider: getCurrentProviderForProvenance(),
    model: getCurrentModelValue().trim(),
    prompt: sessionState.prompt,
    clientGeneratedAt: new Date().toISOString(),
  };

  return stableStringify({
    app: "THOUGHT",
    appBuild: APP_BUILD,
    appVersion: APP_VERSION,
    client: {
      generatedAt: context.clientGeneratedAt,
    },
    hashes: {
      promptHash: hashText(context.prompt),
      textHash,
    },
    mode: context.mode,
    model: context.model,
    prompt: context.prompt,
    provider: context.provider,
    request: {
      maxTokens: "160",
      seed: null,
      stop: [],
      temperature: context.mode === "local" ? "0" : null,
      topK: null,
      topP: null,
    },
    response: {
      finishReason: null,
      providerResponseId: null,
      reportedModel: null,
      systemFingerprint: null,
      usage: null,
    },
    schema: "thought.provenance.v1",
    thoughtSpec: {
      hash: spec.specHash,
      id: spec.specId,
      ref: spec.ref,
    },
  });
};

const parsePathTokenId = (value: string) => {
  const trimmed = value.trim();
  if (!/^[1-9]\d*$/.test(trimmed)) {
    return null;
  }
  return BigInt(trimmed);
};

const verifyThoughtSpecAnchor = async () => {
  const registry = getReadThoughtSpecRegistry();
  if (!registry || !activeThoughtSpec) {
    return false;
  }

  const [specHash,,,,, exists] = (await registry.specMeta(activeThoughtSpec.specId)) as [
    string,
    string,
    string,
    bigint,
    bigint,
    boolean,
  ];
  return exists && specHash.toLowerCase() === activeThoughtSpec.specHash.toLowerCase();
};

const clearMintAuthorization = () => {
  mintFlowData.deadline = null;
  mintFlowData.signature = "";
};

const resetMintFlow = () => {
  mintFlowState = "closed";
  mintFlowUiMode = "sheet";
  mintFlowData.rawText = "";
  mintFlowData.textHash = "";
  mintFlowData.thoughtSpecId = "";
  mintFlowData.provenanceJson = "";
  mintFlowData.existingTokenId = null;
  mintFlowData.pathIdInput = "";
  mintFlowData.pathId = null;
  mintFlowData.txHash = "";
  mintFlowData.error = "";
  mintFlowData.errorKind = "none";
  clearMintAuthorization();
};

const resetMintRuntimeState = () => {
  resetMintFlow();
  walletState.txState = "idle";
  walletState.txError = "";
  walletState.txHash = "";
  walletState.mintedTokenId = null;
};

const closeMintSheet = () => {
  resetMintFlow();
  syncInterface();
};

const signPathConsumeAuthorization = async (
  signer: JsonRpcSigner,
  claimer: string,
  pathId: bigint,
) => {
  const pathNft = new Contract(PATH_NFT_ADDRESS, PATH_NFT_ABI, signer);
  const nonce = (await pathNft.getConsumeNonce(claimer)) as bigint;
  const deadline = BigInt(Math.floor(Date.now() / 1000)) + PATH_CONSUME_AUTH_TTL_SECONDS;
  const structHash = keccak256(
    EVM_ABI_CODER.encode(
      [
        "bytes32",
        "address",
        "uint256",
        "uint256",
        "bytes32",
        "address",
        "address",
        "uint256",
        "uint256",
      ],
      [
        CONSUME_AUTHORIZATION_TYPEHASH,
        PATH_NFT_ADDRESS,
        BigInt(THOUGHT_CHAIN_ID),
        pathId,
        PATH_MOVEMENT_THOUGHT,
        claimer,
        THOUGHT_TOKEN_ADDRESS,
        nonce,
        deadline,
      ],
    ),
  );
  const signature = await signer.signMessage(getBytes(structHash));
  return { deadline, signature };
};

const copyToClipboard = async (value: string) => {
  if (!value) {
    return false;
  }

  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(value);
      return true;
    } catch {
      // fall through
    }
  }

  const textarea = document.createElement("textarea");
  textarea.value = value;
  textarea.setAttribute("readonly", "true");
  textarea.style.position = "absolute";
  textarea.style.left = "-9999px";
  document.body.appendChild(textarea);
  textarea.select();
  let copied = false;
  try {
    copied = document.execCommand("copy");
  } catch {
    copied = false;
  }
  textarea.remove();
  return copied;
};

const getWalletNetworkLabel = () => {
  if (walletState.chainId === null) {
    return "not connected";
  }

  if (walletState.chainId === THOUGHT_CHAIN_ID) {
    return THOUGHT_CHAIN_NAME;
  }

  return `chain ${walletState.chainId}`;
};

const getWalletDotState = (): WalletDotState => {
  if (walletState.txState === "awaiting_signature" || walletState.txState === "submitted") {
    return "pending";
  }

  if (
    walletState.txState === "failed" ||
    (walletState.address && walletState.chainId !== null && walletState.chainId !== THOUGHT_CHAIN_ID) ||
    (!!walletState.preflightError && !!walletState.address && walletState.chainId === THOUGHT_CHAIN_ID)
  ) {
    return "error";
  }

  if (walletState.address && walletState.chainId === THOUGHT_CHAIN_ID) {
    return "on";
  }

  return "off";
};

const hasModelAccess = () => {
  if (sessionState.mode === "connect") {
    return sessionState.connect.apiKey.trim().length > 0;
  }

  if (sessionState.mode === "direct") {
    return sessionState.direct.apiKey.trim().length > 0;
  }

  return sessionState.local.available === true;
};

const isDebugActive = () => IS_DEV_MODE && debugState.enabled;

const isDebugCtaOverrideActive = () => isDebugActive() && debugState.cta !== "auto";

const getDebugActionPresentation = (): ActionPresentation | null => {
  if (!isDebugCtaOverrideActive()) {
    return null;
  }

  if (debugState.cta === "run") {
    return {
      primaryLabel: "[ run ]",
      primaryDisabled: false,
      primaryAction: "none",
      status: "",
      secondaryLabel: "",
      secondaryAction: "none",
    };
  }

  if (debugState.cta === "running") {
    return {
      primaryLabel: "[ running ]",
      primaryDisabled: true,
      primaryAction: "none",
      status: "",
      secondaryLabel: "",
      secondaryAction: "none",
    };
  }

  if (debugState.cta === "retry") {
    return {
      primaryLabel: "[ retry ]",
      primaryDisabled: false,
      primaryAction: "none",
      status: "generation failed",
      secondaryLabel: "",
      secondaryAction: "none",
    };
  }

  if (debugState.cta === "mint") {
    return {
      primaryLabel: "[ mint ]",
      primaryDisabled: debugState.ctaStatus === "mint_unavailable",
      primaryAction: "none",
      status: "ready",
      secondaryLabel: "[ reset ]",
      secondaryAction: "reset",
    };
  }

  if (debugState.cta === "view_thought") {
    return {
      primaryLabel: "[ view THOUGHT ]",
      primaryDisabled: false,
      primaryAction: "none",
      status: "minted",
      secondaryLabel: "",
      secondaryAction: "none",
    };
  }

  return null;
};

const applyDebugStatusOverride = (action: ActionPresentation): ActionPresentation => {
  if (!isDebugActive() || debugState.ctaStatus === "auto") {
    return action;
  }

  const debugStatusText: Record<Exclude<ThoughtDebugCtaStatusOverride, "auto">, string> = {
    none: "",
    ready: "ready",
    minted: "minted",
    model_needed: "model access needed",
    generation_failed: "generation failed",
    mint_unavailable: "mint unavailable",
  };

  return {
    ...action,
    status: debugStatusText[debugState.ctaStatus],
  };
};

const getActionPresentation = (): ActionPresentation => {
  const debugAction = getDebugActionPresentation();
  if (debugAction) {
    return applyDebugStatusOverride(debugAction);
  }

  const hasOutput = currentOutputText.length > 0;
  let action: ActionPresentation;

  if (runState === "running" || runInFlight) {
    action = {
      primaryLabel: "[ running ]",
      primaryDisabled: true,
      primaryAction: "none",
      status: "",
      secondaryLabel: "",
      secondaryAction: "none",
    };
    return applyDebugStatusOverride(action);
  }

  if (walletState.mintedTokenId !== null) {
    action = {
      primaryLabel: "",
      primaryDisabled: true,
      primaryAction: "none",
      status: "minted",
      secondaryLabel: "[ view THOUGHT ]",
      secondaryAction: "view_thought",
      hidePrimary: true,
    };
    return applyDebugStatusOverride(action);
  }

  if (hasOutput) {
    if (!THOUGHT_RPC_URL || !THOUGHT_TOKEN_ADDRESS) {
      action = {
        primaryLabel: "[ mint ]",
        primaryDisabled: true,
        primaryAction: "none",
        status: "mint unavailable",
        secondaryLabel: "[ reset ]",
        secondaryAction: "reset",
      };
      return applyDebugStatusOverride(action);
    }

    action = {
      primaryLabel: "[ mint ]",
      primaryDisabled: false,
      primaryAction: "mint",
      status: "ready",
      secondaryLabel: "[ reset ]",
      secondaryAction: "reset",
    };
    return applyDebugStatusOverride(action);
  }

  if (runState === "run_failed") {
    action = {
      primaryLabel: "[ retry ]",
      primaryDisabled: !hasModelAccess(),
      primaryAction: hasModelAccess() ? "retry_run" : "none",
      status: "generation failed",
      secondaryLabel: "",
      secondaryAction: "none",
    };
    return applyDebugStatusOverride(action);
  }

  action = {
    primaryLabel: "[ run ]",
    primaryDisabled: !hasModelAccess(),
    primaryAction: hasModelAccess() ? "run" : "none",
    status: hasModelAccess() ? "" : "model access needed",
    secondaryLabel: "",
    secondaryAction: "none",
  };
  return applyDebugStatusOverride(action);
};

const clearNoticeTimer = (timer: number | null) => {
  if (timer !== null) {
    window.clearTimeout(timer);
  }
};

const updateNotice = (element: HTMLElement, message: string) => {
  element.textContent = message;
  element.classList.toggle("is-hidden", message.length === 0);
};

const setWarning = (message: string, options?: { flashMs?: number; level?: PanelWarningLevel }) => {
  clearNoticeTimer(warningTimer);
  warningTimer = null;
  panelWarningMessage = message;
  panelWarningLevel = options?.level ?? "error";
  syncWarningBox();

  if (message && options?.flashMs) {
    warningTimer = window.setTimeout(() => {
      panelWarningMessage = "";
      panelWarningLevel = "error";
      syncWarningBox();
      warningTimer = null;
    }, options.flashMs);
  }
};

const setStatus = (message: string, options?: { flashMs?: number }) => {
  clearNoticeTimer(statusTimer);
  statusTimer = null;
  updateNotice(runStatus, message);

  if (message && options?.flashMs) {
    statusTimer = window.setTimeout(() => {
      updateNotice(runStatus, "");
      statusTimer = null;
    }, options.flashMs);
  }
};

const getDebugWarningPresentation = () => {
  const debugWarningCopy: Record<
    Exclude<ThoughtDebugWarningOverride, "auto">,
    { level: PanelWarningLevel; text: string }
  > = {
    none: { level: "info", text: "" },
    prompt_required: { level: "warn", text: "prompt is required." },
    model_required: { level: "warn", text: "model is required." },
    openrouter_required: { level: "warn", text: "authorize openrouter first." },
    api_key_required: { level: "warn", text: "api key is required." },
    ollama_not_found: { level: "error", text: "ollama not found." },
    spec_unavailable: { level: "error", text: "spec unavailable." },
    provider_error: { level: "error", text: "provider returned error." },
    external_service: { level: "error", text: "external service returned error." },
    openrouter_connect_constraint: {
      level: "warn",
      text: "openrouter connect needs localhost or https.",
    },
    wallet_missing: { level: "warn", text: "No supported wallet found." },
    wallet_connect_failed: { level: "error", text: "wallet connect failed." },
    wallet_switch_failed: { level: "error", text: "wallet switch failed." },
    thought_too_large: {
      level: "warn",
      text: `agent output exceeds the ${MAX_RAW_TEXT_BYTES}-byte mint limit.`,
    },
    mint_contract_unavailable: { level: "error", text: "mint contract not configured." },
  };

  return debugState.warning === "auto" ? null : debugWarningCopy[debugState.warning];
};

const syncWarningBox = () => {
  const debugWarning = isDebugActive() ? getDebugWarningPresentation() : null;
  const warningCopy = debugWarning?.text ?? panelWarningMessage;
  const warningLevel = debugWarning?.level ?? panelWarningLevel;
  warningBox.classList.remove("is-info", "is-warn", "is-error");
  warningBox.classList.add(`is-${warningLevel}`);
  updateNotice(warningBox, warningCopy);
};

const setMintFlowError = (message: string, kind: MintFlowErrorKind = "mint") => {
  mintFlowState = "error";
  mintFlowData.error = message;
  mintFlowData.errorKind = kind;
  clearMintAuthorization();
  walletState.txState = "failed";
  walletState.txError = message;
};

const hiddenMintSheetAction = (): MintSheetActionConfig => ({
  action: "none",
  hidden: true,
  label: "",
});

const mintSheetAction = (
  action: MintSheetAction,
  label: string,
  disabled = false,
): MintSheetActionConfig => ({
  action,
  disabled,
  label,
});

const isPathRecoveryError = () =>
  mintFlowState === "error" &&
  (
    mintFlowData.errorKind === "path_invalid" ||
    mintFlowData.errorKind === "path_not_found" ||
    mintFlowData.errorKind === "path_spent" ||
    mintFlowData.errorKind === "path_not_ready"
  );

const isThoughtLevelMintError = () =>
  mintFlowState === "error" &&
  (
    mintFlowData.errorKind === "thought" ||
    mintFlowData.errorKind === "spec" ||
    mintFlowData.errorKind === "mint" ||
    mintFlowData.errorKind === "funds" ||
    mintFlowData.errorKind === "signature"
  );

const canContinueWithPathInput = () => parsePathTokenId(mintFlowData.pathIdInput) !== null;

const getMintSheetActionConfigs = (): [
  MintSheetActionConfig,
  MintSheetActionConfig,
  MintSheetActionConfig,
] => {
  if (mintFlowState === "thought_checking") {
    return [
      mintSheetAction("none", "[ checking ]", true),
      hiddenMintSheetAction(),
      hiddenMintSheetAction(),
    ];
  }

  if (mintFlowState === "text_taken") {
    return [
      mintSheetAction("view_thought", "[ view THOUGHT ]"),
      mintSheetAction("reset", "[ reset ]"),
      hiddenMintSheetAction(),
    ];
  }

  if (mintFlowState === "wallet_required") {
    return [
      mintSheetAction("connect_wallet", "[ connect wallet ]", walletConnectInFlight),
      mintSheetAction("mint_path", "[ mint a $PATH ]"),
      hiddenMintSheetAction(),
    ];
  }

  if (mintFlowState === "path_required") {
    return [
      mintSheetAction("continue", "[ continue ]", !canContinueWithPathInput()),
      hiddenMintSheetAction(),
      hiddenMintSheetAction(),
    ];
  }

  if (mintFlowState === "path_checking") {
    return [
      mintSheetAction("none", "[ checking ]", true),
      hiddenMintSheetAction(),
      hiddenMintSheetAction(),
    ];
  }

  if (mintFlowState === "path_ready") {
    return [
      mintSheetAction("authorize", "[ authorize ]"),
      hiddenMintSheetAction(),
      hiddenMintSheetAction(),
    ];
  }

  if (mintFlowState === "authorizing") {
    return [
      mintSheetAction("none", "[ authorizing ]", true),
      hiddenMintSheetAction(),
      hiddenMintSheetAction(),
    ];
  }

  if (mintFlowState === "authorized") {
    return [
      mintSheetAction("confirm_mint", "[ confirm mint ]"),
      hiddenMintSheetAction(),
      hiddenMintSheetAction(),
    ];
  }

  if (mintFlowState === "minting") {
    return [
      mintSheetAction("none", "[ minting ]", true),
      hiddenMintSheetAction(),
      hiddenMintSheetAction(),
    ];
  }

  if (mintFlowState === "minted") {
    return [
      mintSheetAction("view_tx", "[ view tx ]"),
      mintSheetAction("view_thought", "[ view THOUGHT ]"),
      hiddenMintSheetAction(),
    ];
  }

  if (mintFlowState === "error") {
    if (mintFlowData.errorKind === "wrong_network") {
      return [
        mintSheetAction("switch_network", "[ switch network ]"),
        mintSheetAction("mint_path", "[ mint a $PATH ]"),
        hiddenMintSheetAction(),
      ];
    }

    if (isPathRecoveryError()) {
      return [
        mintSheetAction("choose_another", "[ choose another ]"),
        mintSheetAction("mint_path", "[ mint a $PATH ]"),
        mintSheetAction("refresh", "[ refresh ]"),
      ];
    }

    return [
      mintSheetAction("refresh", "[ refresh ]"),
      hiddenMintSheetAction(),
      hiddenMintSheetAction(),
    ];
  }

  return [
    mintSheetAction("continue", "[ continue ]", true),
    hiddenMintSheetAction(),
    hiddenMintSheetAction(),
  ];
};

const syncMintSheetFlow = () => {
  const activeStep =
    mintFlowState === "authorized" || mintFlowState === "minting" || mintFlowState === "minted"
      ? "confirm"
      : mintFlowState === "path_ready" || mintFlowState === "authorizing"
        ? "authorize"
        : "select";
  const completedSteps =
    activeStep === "authorize"
      ? new Set(["select"])
      : activeStep === "confirm"
        ? new Set(["select", "authorize"])
        : new Set<string>();

  mintSheetFlow.querySelectorAll<HTMLElement>("[data-step]").forEach((step) => {
    const stepId = step.dataset.step ?? "";
    step.classList.toggle("is-active", stepId === activeStep);
    step.classList.toggle("is-complete", completedSteps.has(stepId) || mintFlowState === "minted");
  });
};

const getMintSheetStatusCopy = () => {
  const selectedPathId = mintFlowData.pathId?.toString() ?? mintFlowData.pathIdInput.trim();

  if (mintFlowState === "thought_checking") {
    return "checking THOUGHT.";
  }
  if (mintFlowState === "text_taken") {
    return "already minted.";
  }
  if (mintFlowState === "wallet_required") {
    return "connect wallet to read $PATH.";
  }
  if (mintFlowState === "path_required") {
    return canContinueWithPathInput() ? "" : "enter a valid $PATH #.";
  }
  if (mintFlowState === "path_checking") {
    return `checking $PATH #${selectedPathId}.`;
  }
  if (mintFlowState === "path_ready") {
    return `$PATH #${selectedPathId} ready.`;
  }
  if (mintFlowState === "authorizing") {
    return "sign in wallet.";
  }
  if (mintFlowState === "authorized") {
    return "authorized.";
  }
  if (mintFlowState === "minting") {
    return walletState.txState === "submitted" ? "minting." : "confirm in wallet.";
  }
  if (mintFlowState === "minted") {
    return "minted.";
  }
  if (mintFlowState === "error") {
    return mintFlowData.error || "mint failed.";
  }
  return "";
};

const getMintSheetContextCopy = () => {
  const selectedPathId = mintFlowData.pathId?.toString() ?? mintFlowData.pathIdInput.trim();

  if (mintFlowState === "path_ready" || mintFlowState === "authorizing") {
    return "$PATH is consumed once for this THOUGHT.";
  }
  if ((mintFlowState === "authorized" || mintFlowState === "minting") && selectedPathId) {
    return `$PATH #${selectedPathId} selected.`;
  }
  return "";
};

const getMintSheetProvenanceCopy = () => {
  if (!mintFlowData.provenanceJson) {
    return "";
  }

  return `provenance ${byteLength(mintFlowData.provenanceJson)}/${MAX_PROVENANCE_BYTES} · ~${formatCount(MINT_GAS_ESTIMATE)} gas`;
};

const syncMintSheetButton = (
  button: HTMLButtonElement,
  config: MintSheetActionConfig,
) => {
  button.textContent = config.label;
  button.disabled = !!config.disabled;
  button.classList.toggle("is-hidden", !!config.hidden);
};

const syncMintSheet = () => {
  const isOpen = mintFlowUiMode === "sheet" && mintFlowState !== "closed";
  mintSheetBackdrop.classList.toggle("is-hidden", !isOpen);
  mintSheet.classList.toggle("is-hidden", !isOpen);

  if (!isOpen) {
    return;
  }

  const thoughtLevelMintError = isThoughtLevelMintError();
  mintSheetTitle.textContent = "mint THOUGHT";
  mintSheetCopy.textContent = "one THOUGHT needs one $PATH.";
  syncMintSheetFlow();

  const pathInputVisible =
    mintFlowState === "path_required" ||
    mintFlowState === "path_checking" ||
    mintFlowState === "path_ready" ||
    mintFlowState === "authorizing" ||
    mintFlowState === "authorized" ||
    (mintFlowState === "error" && !thoughtLevelMintError);
  mintSheetPathField.classList.toggle("is-hidden", !pathInputVisible);
  mintSheetPathBox.value = mintFlowData.pathIdInput;
  mintSheetPathBox.disabled =
    mintFlowState === "path_checking" ||
    mintFlowState === "path_ready" ||
    mintFlowState === "authorizing" ||
    mintFlowState === "authorized" ||
    mintFlowState === "minting" ||
    mintFlowState === "minted";

  const provenanceCopy = pathInputVisible ? getMintSheetProvenanceCopy() : "";
  mintSheetProvenance.textContent = provenanceCopy;
  mintSheetProvenance.classList.toggle("is-hidden", !provenanceCopy);

  mintSheetStatus.textContent = getMintSheetStatusCopy();
  const contextCopy = getMintSheetContextCopy();
  mintSheetContext.textContent = contextCopy;
  mintSheetContext.classList.toggle("is-hidden", !contextCopy);
  const [primary, secondary, tertiary] = getMintSheetActionConfigs();
  mintSheetPrimaryAction = primary.action;
  mintSheetSecondaryAction = secondary.action;
  mintSheetTertiaryAction = tertiary.action;
  syncMintSheetButton(mintSheetPrimary, primary);
  syncMintSheetButton(mintSheetSecondary, secondary);
  syncMintSheetButton(mintSheetTertiary, tertiary);
};

const syncWalletMenu = () => {
  mintWalletAddress.textContent = walletState.address || "-";
  mintWalletNetwork.textContent = getWalletNetworkLabel();
  mintWalletToken.textContent =
    walletState.mintedTokenId === null ? "-" : `#${walletState.mintedTokenId}`;
  mintWalletTokenRow.classList.toggle("is-hidden", walletState.mintedTokenId === null);
  mintWalletCopyAddress.disabled = walletState.address.length === 0;
  mintWalletCopyTx.classList.toggle("is-hidden", walletState.txHash.length === 0);
  mintWalletToggle.setAttribute("aria-expanded", walletState.menuOpen ? "true" : "false");
  mintWalletMenu.classList.toggle("is-hidden", !walletState.menuOpen);

  mintWalletDot.classList.remove("is-on", "is-pending", "is-error", "is-off");
  mintWalletDot.classList.add(`is-${getWalletDotState()}`);
};

const syncThoughtInstructionsControls = () => {
  thoughtFileField.classList.toggle("is-hidden", !ENABLE_THOUGHT_UPLOAD);
  thoughtFileStatus.textContent = `using ${getActiveThoughtInstructionsLabel()}.`;
  syncThoughtInstructionsLink();
  clearThoughtFileButton.classList.toggle(
    "is-hidden",
    !ENABLE_THOUGHT_UPLOAD || !thoughtInstructionsOverride,
  );
};

const syncPrimaryCtaAvailability = () => {
  const action = getActionPresentation();
  primaryActionState = action.primaryAction;
  secondaryActionState = action.secondaryAction;
  runAgentButton.disabled = action.primaryDisabled;
};

const refreshMintPreflight = async () => {
  walletState.preflightLoading = true;
  walletState.preflightError = "";
  syncPrimaryCtaAvailability();

  const token = getReadThoughtToken();
  const provider = getReadProvider();

  if (!token || !provider) {
    walletState.mintPrice = null;
    walletState.balance = null;
    walletState.preflightLoading = false;
    walletState.preflightError = "mint contract not configured.";
    syncPrimaryCtaAvailability();
    syncWalletMenu();
    return;
  }

  try {
    walletState.mintPrice = (await token.mintPrice()) as bigint;
    walletState.balance = walletState.address ? await provider.getBalance(walletState.address) : null;
    walletState.preflightError = "";
  } catch (error) {
    walletState.mintPrice = null;
    walletState.balance = null;
    walletState.preflightError =
      error instanceof Error ? error.message : "mint preflight failed.";
  } finally {
    walletState.preflightLoading = false;
    syncPrimaryCtaAvailability();
    syncWalletMenu();
  }
};

const refreshWalletState = async () => {
  const ethereum = getEthereumProvider();
  const previousAddress = walletState.address;
  const previousChainId = walletState.chainId;
  walletState.detected = ethereum !== null;

  if (!ethereum) {
    walletState.address = "";
    walletState.chainId = null;
    await refreshMintPreflight();
    return;
  }

  try {
    const [accounts, chainHex] = await Promise.all([
      ethereum.request({ method: "eth_accounts" }),
      ethereum.request({ method: "eth_chainId" }),
    ]);

    walletState.address =
      Array.isArray(accounts) && typeof accounts[0] === "string" ? accounts[0] : "";
    walletState.chainId =
      typeof chainHex === "string" && chainHex.length > 0 ? Number(BigInt(chainHex)) : null;
  } catch {
    walletState.address = "";
    walletState.chainId = null;
  }

  if (walletState.address !== previousAddress || walletState.chainId !== previousChainId) {
    clearMintAuthorization();
    if (mintFlowState !== "closed" && mintFlowState !== "wallet_required") {
      mintFlowState = walletState.address ? "path_required" : "wallet_required";
      mintFlowData.error = "";
      mintFlowData.errorKind = "none";
    }
  }

  await refreshMintPreflight();
};

const bindWalletProviderEvents = () => {
  if (walletListenersBound) {
    return;
  }

  const providers = getInjectedProviders().filter((provider) => typeof provider.on === "function");
  if (providers.length === 0) {
    return;
  }

  const handleWalletChange = () => {
    void refreshWalletState().then(() => {
      syncInterface();
    });
  };

  providers.forEach((provider) => {
    provider.on?.("accountsChanged", handleWalletChange);
    provider.on?.("chainChanged", handleWalletChange);
  });
  walletListenersBound = true;
};

const requestWalletConnect = async () => {
  const ethereum = getEthereumProvider();
  if (!ethereum) {
    setWarning("No supported wallet found.", { level: "warn" });
    setStatus("");
    return;
  }

  setWarning("");
  walletConnectInFlight = true;
  syncInterface();

  try {
    const existingAccount = extractPrimaryAccount(await ethereum.request({ method: "eth_accounts" }));

    if (!existingAccount) {
      let requestError: unknown = null;
      const requestAccounts = ethereum
        .request({ method: "eth_requestAccounts" })
        .then((accounts) => extractPrimaryAccount(accounts))
        .catch((error) => {
          requestError = error;
          return "";
        });

      const detectedAccount = await Promise.race([
        requestAccounts,
        waitForWalletAddress(ethereum),
      ]);

      if (!detectedAccount) {
        const requestedAccount = await requestAccounts;
        if (!requestedAccount && requestError) {
          throw requestError;
        }
      }
    }

    await refreshWalletState();

    if (!walletState.address) {
      throw new Error("wallet did not expose an account.");
    }

    syncInterface();
    setStatus("wallet linked.", { flashMs: NOTICE_FLASH_MS });
  } catch (error) {
    const message = error instanceof Error ? error.message : "wallet connect failed.";
    setWarning(message);
    setStatus("");
  } finally {
    walletConnectInFlight = false;
    syncInterface();
  }
};

const switchWalletChain = async () => {
  const ethereum = getEthereumProvider();
  if (!ethereum) {
    setWarning("No supported wallet found.", { level: "warn" });
    setStatus("");
    return;
  }

  setWarning("");
  setStatus("");

  try {
    await ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: THOUGHT_CHAIN_ID_HEX }],
    });
  } catch (error) {
    const errorCode =
      typeof error === "object" && error !== null && "code" in error
        ? Number((error as { code?: unknown }).code)
        : null;

    if (errorCode === 4902) {
      await ethereum.request({
        method: "wallet_addEthereumChain",
        params: [
          {
            chainId: THOUGHT_CHAIN_ID_HEX,
            chainName: THOUGHT_CHAIN_NAME,
            nativeCurrency: {
              name: "Ether",
              symbol: "ETH",
              decimals: 18,
            },
            rpcUrls: THOUGHT_RPC_URL ? [THOUGHT_RPC_URL] : [],
            blockExplorerUrls: THOUGHT_EXPLORER_BASE_URL ? [THOUGHT_EXPLORER_BASE_URL] : [],
          },
        ],
      });
    } else {
      const message = error instanceof Error ? error.message : "wallet switch failed.";
      setWarning(message);
      setStatus("");
      return;
    }
  }

  await refreshWalletState();
  syncInterface();
  setStatus("chain ready.", { flashMs: NOTICE_FLASH_MS });
};

const extractMintedTokenId = (receipt: { logs?: Array<{ topics: string[]; data: string }> }) => {
  const contract = getReadThoughtToken();
  if (!contract) {
    return null;
  }

  for (const log of receipt.logs ?? []) {
    try {
      const parsed = contract.interface.parseLog(log);
      if (parsed?.name === "ThoughtMinted") {
        return Number(parsed.args[0]);
      }
    } catch {
      continue;
    }
  }

  return null;
};

const handlePendingTx = async () => {
  if (!walletState.txHash) {
    return;
  }

  const copied = await copyToClipboard(walletState.txHash);
  if (copied) {
    setStatus("tx hash copied.", { flashMs: NOTICE_FLASH_MS });
  }
};

const openMintSheet = async (uiMode: MintFlowUiMode = "sheet") => {
  if (!currentOutputText) {
    return;
  }

  resetMintFlow();
  mintFlowUiMode = uiMode;
  mintFlowData.rawText = currentOutputText;
  mintFlowData.textHash = hashText(currentOutputText);
  mintFlowData.error = "";
  mintFlowData.errorKind = "none";
  mintFlowData.txHash = "";
  walletState.txState = "idle";
  walletState.txError = "";
  mintFlowState = "thought_checking";
  syncInterface();

  if (byteLength(mintFlowData.rawText) > MAX_RAW_TEXT_BYTES) {
    setMintFlowError("THOUGHT too large.", "thought");
    syncInterface();
    return;
  }

  let spec: ActiveThoughtSpec;
  try {
    spec = await ensureActiveThoughtSpec();
    syncThoughtInstructionsControls();
  } catch (error) {
    const message = formatThoughtSpecError(error);
    setMintFlowError(message, message.includes("THOUGHT.md") ? "spec" : "thought");
    syncInterface();
    return;
  }

  mintFlowData.thoughtSpecId = spec.specId;
  const provenanceJson = buildProvenanceJson(mintFlowData.textHash);
  if (byteLength(provenanceJson) > MAX_PROVENANCE_BYTES) {
    setMintFlowError("provenance too large.", "thought");
    syncInterface();
    return;
  }
  mintFlowData.provenanceJson = provenanceJson;

  const token = getReadThoughtToken();
  if (!token) {
    setMintFlowError("mint unavailable.", "thought");
    syncInterface();
    return;
  }

  try {
    if (!await verifyThoughtSpecAnchor()) {
      setMintFlowError("spec mismatch.", "spec");
      syncInterface();
      return;
    }

    const existingTokenId = (await token.tokenOfThought(mintFlowData.textHash)) as bigint;
    if (existingTokenId !== 0n) {
      mintFlowData.existingTokenId = Number(existingTokenId);
      mintFlowState = "text_taken";
      syncInterface();
      return;
    }

    if (!mintFlowData.pathIdInput && PRESELECTED_PATH_ID) {
      mintFlowData.pathIdInput = PRESELECTED_PATH_ID;
    }

    mintFlowData.pathId = parsePathTokenId(mintFlowData.pathIdInput);
    await refreshWalletState();
    mintFlowState = walletState.address ? "path_required" : "wallet_required";
    syncInterface();
  } catch {
    setMintFlowError("mint unavailable.", "thought");
    syncInterface();
  }
};

const checkPathEligibility = async () => {
  clearMintAuthorization();
  walletState.txState = "idle";
  walletState.txError = "";

  if (!PATH_NFT_ADDRESS || !THOUGHT_TOKEN_ADDRESS) {
    setMintFlowError("mint unavailable.", "thought");
    syncInterface();
    return;
  }

  const ethereum = getEthereumProvider();
  if (!ethereum) {
    mintFlowState = "wallet_required";
    syncInterface();
    return;
  }

  await refreshWalletState();

  if (!walletState.address) {
    mintFlowState = "wallet_required";
    syncInterface();
    return;
  }

  if (walletState.chainId !== THOUGHT_CHAIN_ID) {
    setMintFlowError("wrong network.", "wrong_network");
    syncInterface();
    return;
  }

  const pathId = parsePathTokenId(mintFlowData.pathIdInput);
  if (pathId === null) {
    setMintFlowError("enter a valid $PATH #.", "path_invalid");
    syncInterface();
    return;
  }

  const pathNft = getReadPathNft();
  if (!pathNft) {
    setMintFlowError("mint unavailable.", "thought");
    syncInterface();
    return;
  }

  mintFlowData.pathId = pathId;
  mintFlowState = "path_checking";
  mintFlowData.error = "";
  mintFlowData.errorKind = "none";
  syncInterface();

  try {
    const owner = (await pathNft.ownerOf(pathId)) as string;
    const [authorizedMinter, stage, stageMinted, movementQuota] =
      await Promise.all([
        pathNft.getAuthorizedMinter(PATH_MOVEMENT_THOUGHT) as Promise<string>,
        pathNft.getStage(pathId) as Promise<bigint>,
        pathNft.getStageMinted(pathId) as Promise<bigint>,
        pathNft.getMovementQuota(PATH_MOVEMENT_THOUGHT) as Promise<bigint>,
      ]);
    const wallet = walletState.address.toLowerCase();
    if (owner.toLowerCase() !== wallet) {
      setMintFlowError(`$PATH #${pathId.toString()} is not held by this wallet.`, "path_not_found");
      syncInterface();
      return;
    }

    if (authorizedMinter.toLowerCase() !== THOUGHT_TOKEN_ADDRESS.toLowerCase()) {
      setMintFlowError(`$PATH #${pathId.toString()} cannot mint THOUGHT.`, "path_not_ready");
      syncInterface();
      return;
    }

    if (movementQuota === 0n) {
      setMintFlowError(`$PATH #${pathId.toString()} cannot mint THOUGHT.`, "path_not_ready");
      syncInterface();
      return;
    }

    if (stage !== 0n || stageMinted >= movementQuota) {
      setMintFlowError(`$PATH #${pathId.toString()} already spent for THOUGHT.`, "path_spent");
      syncInterface();
      return;
    }

    if (
      walletState.mintPrice !== null &&
      walletState.balance !== null &&
      walletState.balance < walletState.mintPrice
    ) {
      setMintFlowError("not enough ETH.", "funds");
      syncInterface();
      return;
    }

    mintFlowState = "path_ready";
    mintFlowData.error = "";
    mintFlowData.errorKind = "none";
    syncInterface();
  } catch (error) {
    const notFound = error instanceof Error && /invalid token|nonexistent|revert/i.test(error.message);
    setMintFlowError(
      notFound ? `$PATH #${pathId.toString()} not found.` : `$PATH #${pathId.toString()} cannot mint THOUGHT.`,
      notFound ? "path_not_found" : "path_not_ready",
    );
    syncInterface();
  }
};

const authorizeMint = async () => {
  const ethereum = getEthereumProvider();
  if (!ethereum || !walletState.address || mintFlowData.pathId === null) {
    mintFlowState = "wallet_required";
    syncInterface();
    return;
  }

  try {
    if (!mintFlowData.provenanceJson) {
      const spec = await ensureActiveThoughtSpec();
      mintFlowData.thoughtSpecId = spec.specId;
      const provenanceJson = buildProvenanceJson(mintFlowData.textHash);
      if (byteLength(provenanceJson) > MAX_PROVENANCE_BYTES) {
        setMintFlowError("provenance too large.", "thought");
        syncInterface();
        return;
      }
      mintFlowData.provenanceJson = provenanceJson;
    }

    mintFlowState = "authorizing";
    walletState.txError = "";
    mintFlowData.error = "";
    mintFlowData.errorKind = "none";
    syncInterface();
    setWarning("");
    setStatus("");

    const browserProvider = new BrowserProvider(ethereum);
    const signer = await browserProvider.getSigner();
    const consumeAuth = await signPathConsumeAuthorization(signer, await signer.getAddress(), mintFlowData.pathId);
    mintFlowData.deadline = consumeAuth.deadline;
    mintFlowData.signature = consumeAuth.signature;
    mintFlowState = "authorized";
    syncInterface();
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    setMintFlowError(
      message.startsWith("spec ") ? message : "authorization rejected.",
      message.startsWith("spec ") ? "spec" : "signature",
    );
    syncInterface();
  }
};

const confirmMint = async () => {
  const ethereum = getEthereumProvider();
  if (
    !ethereum ||
    mintFlowData.pathId === null ||
    !mintFlowData.provenanceJson ||
    !mintFlowData.thoughtSpecId ||
    !mintFlowData.deadline ||
    !mintFlowData.signature
  ) {
    clearMintAuthorization();
    mintFlowState = "path_ready";
    syncInterface();
    return;
  }

  if (mintFlowData.deadline <= BigInt(Math.floor(Date.now() / 1000))) {
    setMintFlowError("authorization expired.", "signature");
    syncInterface();
    return;
  }

  try {
    const browserProvider = new BrowserProvider(ethereum);
    const signer = await browserProvider.getSigner();
    const mintPrice =
      walletState.mintPrice ?? ((await getReadThoughtToken()?.mintPrice()) as bigint | undefined) ?? 0n;
    const writableToken = new Contract(THOUGHT_TOKEN_ADDRESS, THOUGHT_TOKEN_ABI, signer);

    mintFlowState = "minting";
    walletState.txState = "awaiting_signature";
    walletState.txError = "";
    mintFlowData.error = "";
    mintFlowData.errorKind = "none";
    syncInterface();

    const tx = await writableToken.mint(
      mintFlowData.rawText,
      mintFlowData.pathId,
      mintFlowData.thoughtSpecId,
      mintFlowData.provenanceJson,
      mintFlowData.deadline,
      mintFlowData.signature,
      { value: mintPrice },
    );
    walletState.txState = "submitted";
    walletState.txHash = tx.hash;
    mintFlowData.txHash = tx.hash;
    syncInterface();
    setStatus("");

    const receipt = await tx.wait();
    const mintedTokenId = extractMintedTokenId(receipt ?? { logs: [] });

    walletState.txState = "idle";
    walletState.txError = "";
    walletState.mintedTokenId = mintedTokenId;
    walletState.txHash = tx.hash;
    mintFlowData.txHash = tx.hash;
    mintFlowState = "minted";
    await refreshMintPreflight();
    syncInterface();
  } catch (error) {
    const message = error instanceof Error ? error.message : "mint failed.";
    setMintFlowError(
      message.includes("expired") ? "authorization expired." : "mint failed.",
      message.includes("expired") ? "signature" : "mint",
    );
    syncInterface();
    setStatus("");
  }
};

const pathMintUrl = () => {
  try {
    const url = new URL(PATH_MINT_URL, window.location.href);
    url.searchParams.set("intent", "mint-path");
    url.searchParams.set("from", "thought");
    url.searchParams.set("returnTo", window.location.href);
    return url.toString();
  } catch {
    return PATH_MINT_URL;
  }
};

const handleMintPath = () => {
  window.open(pathMintUrl(), "_blank", "noopener,noreferrer");
};

const chooseAnotherPath = () => {
  clearMintAuthorization();
  walletState.txState = "idle";
  walletState.txError = "";
  mintFlowData.error = "";
  mintFlowData.errorKind = "none";
  mintFlowData.pathIdInput = "";
  mintFlowData.pathId = null;
  mintFlowState = walletState.address ? "path_required" : "wallet_required";
  syncInterface();
  if (mintFlowState === "path_required") {
    mintSheetPathBox.focus();
  }
};

const refreshMintSheetPath = async () => {
  await refreshWalletState();

  if (!walletState.address) {
    mintFlowState = "wallet_required";
    mintFlowData.error = "";
    mintFlowData.errorKind = "none";
    syncInterface();
    return;
  }

  if (walletState.chainId !== THOUGHT_CHAIN_ID) {
    setMintFlowError("wrong network.", "wrong_network");
    syncInterface();
    return;
  }

  if (canContinueWithPathInput()) {
    await checkPathEligibility();
    return;
  }

  mintFlowState = "path_required";
  mintFlowData.error = "";
  mintFlowData.errorKind = "none";
  syncInterface();
};

const handleMintSheetAction = async (action: MintSheetAction) => {
  if (action === "none") {
    return;
  }

  if (action === "continue") {
    await checkPathEligibility();
    return;
  }

  if (action === "connect_wallet") {
    await requestWalletConnect();
    mintFlowState = walletState.address ? "path_required" : "wallet_required";
    syncInterface();
    return;
  }

  if (action === "authorize") {
    await authorizeMint();
    return;
  }

  if (action === "confirm_mint") {
    await confirmMint();
    return;
  }

  if (action === "view_tx") {
    await handleViewTx();
    return;
  }

  if (action === "view_thought") {
    await handleViewThought(walletState.mintedTokenId ?? mintFlowData.existingTokenId);
    return;
  }

  if (action === "choose_another") {
    chooseAnotherPath();
    return;
  }

  if (action === "mint_path") {
    handleMintPath();
    return;
  }

  if (action === "refresh") {
    await refreshMintSheetPath();
    return;
  }

  if (action === "reset") {
    closeMintSheet();
    resetThought();
    return;
  }

  if (action === "switch_network") {
    await switchWalletChain();
    mintFlowState = walletState.address ? "path_required" : "wallet_required";
    syncInterface();
  }
};

const handleViewTx = async () => {
  if (!walletState.txHash) {
    return;
  }

  if (THOUGHT_EXPLORER_BASE_URL) {
    window.open(`${THOUGHT_EXPLORER_BASE_URL}/tx/${walletState.txHash}`, "_blank", "noopener,noreferrer");
    return;
  }

  const copied = await copyToClipboard(walletState.txHash);
  if (copied) {
    setStatus("tx hash copied.", { flashMs: NOTICE_FLASH_MS });
  }
};

const handleViewThought = async (tokenId?: number | null) => {
  const thoughtTokenId = tokenId ?? walletState.mintedTokenId ?? mintFlowData.existingTokenId;
  if (thoughtTokenId === null || thoughtTokenId === undefined) {
    setStatus("THOUGHT unavailable.", { flashMs: NOTICE_FLASH_MS });
    return;
  }

  const url = galleryUrl(thoughtTokenId);
  const opened = window.open(url, "_blank", "noopener,noreferrer");
  if (!opened && await copyToClipboard(url)) {
    setStatus("THOUGHT gallery link copied.", { flashMs: NOTICE_FLASH_MS });
  }
};

const galleryUrl = (targetTokenId?: number | null) => {
  const url = new URL(window.location.href);
  url.search = "";
  url.hash = "";
  url.searchParams.set("gallery", "1");
  if (targetTokenId !== null && targetTokenId !== undefined) {
    url.searchParams.set("thought", targetTokenId.toString());
  }
  return url.toString();
};

const thoughtDetailUrl = (tokenId: number) => {
  const url = new URL(window.location.href);
  url.search = "";
  url.hash = "";
  url.searchParams.set("thought", tokenId.toString());
  return url.toString();
};

const configureGalleryLink = () => {
  thoughtGalleryLink.href = galleryUrl();
  thoughtDetailGalleryLink.href = galleryUrl();
};

const decodeBase64Utf8 = (value: string) => {
  const binary = window.atob(value);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
};

const decodeDataUriText = (uri: string) => {
  const commaIndex = uri.indexOf(",");
  if (!uri.startsWith("data:") || commaIndex === -1) {
    throw new Error("unsupported token uri");
  }

  const header = uri.slice(0, commaIndex);
  const payload = uri.slice(commaIndex + 1);
  return header.includes(";base64") ? decodeBase64Utf8(payload) : decodeURIComponent(payload);
};

const readTokenMetadata = (uri: string): ThoughtTokenMetadata => {
  const decoded = decodeDataUriText(uri);
  const parsed = JSON.parse(decoded) as unknown;
  if (!parsed || typeof parsed !== "object") {
    return {};
  }
  return parsed as ThoughtTokenMetadata;
};

const metadataString = (value: unknown) => {
  if (typeof value === "string") {
    return value;
  }
  if (typeof value === "number" || typeof value === "bigint") {
    return value.toString();
  }
  return "";
};

const metadataNumber = (value: unknown) => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && /^\d+$/.test(value)) {
    return Number(value);
  }
  return null;
};

const shortHex = (value: string, front = 6, back = 4) =>
  value.length > front + back + 3 ? `${value.slice(0, front)}...${value.slice(-back)}` : value;

const galleryTime = (mintedAt: number | null) =>
  mintedAt === null ? "unknown time" : new Date(mintedAt * 1000).toISOString().replace(".000Z", "Z");

const formatProvenanceJson = (value: string) => {
  if (!value) {
    return "{}";
  }

  try {
    return JSON.stringify(JSON.parse(value) as unknown, null, 2);
  } catch {
    return value;
  }
};

const escapeSvgText = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");

const galleryThumbnailUri = (rawText: string) => {
  const title = canonicalThoughtTitle(rawText);
  const chars = Array.from(title);
  const { imageSize, gap, rowWidth } = fitImagesToRow(chars.length, CANVAS_WIDTH);
  const xStart = (CANVAS_WIDTH - rowWidth) / 2;
  const yStart = (CANVAS_WIDTH - imageSize) / 2;
  const blocks = chars.map((char, index) => {
    if (char === " ") {
      return "";
    }

    const x = xStart + index * (imageSize + gap);
    return `<rect x="${x}" y="${yStart}" width="${imageSize}" height="${imageSize}" fill="${colorForCharacter(char)}"/>`;
  }).join("");
  const textSize = chars.length > 90 ? 9 : chars.length > 64 ? 10 : chars.length > 48 ? 12 : chars.length > 32 ? 14 : 18;
  const label = title
    ? `<text x="${CANVAS_WIDTH / 2}" y="${CANVAS_WIDTH - CANVAS_PADDING}" font-family="monospace" font-size="${textSize}" font-weight="100" text-anchor="middle" fill="#E8EDF7" fill-opacity="0.72">${escapeSvgText(title)}</text>`
    : "";
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${CANVAS_WIDTH} ${CANVAS_WIDTH}" shape-rendering="crispEdges"><rect width="${CANVAS_WIDTH}" height="${CANVAS_WIDTH}" fill="${BACKGROUND_FILL}"/>${blocks}${label}</svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
};

const renderGalleryCard = (thought: GalleryThought) => {
  const card = document.createElement("article");
  card.className = "thought-gallery__card";
  card.dataset.tokenId = thought.tokenId.toString();
  const title = canonicalThoughtTitle(thought.rawText);

  const imageLink = document.createElement("a");
  imageLink.className = "thought-gallery__thumb";
  imageLink.href = thoughtDetailUrl(thought.tokenId);
  imageLink.setAttribute("aria-label", `Open THOUGHT #${thought.tokenId}`);

  const image = document.createElement("img");
  image.className = "thought-gallery__image";
  image.src = galleryThumbnailUri(title);
  image.alt = `THOUGHT #${thought.tokenId}`;
  image.loading = "lazy";

  const tip = document.createElement("span");
  tip.className = "thought-gallery__tip";
  const tipTitle = document.createElement("strong");
  tipTitle.textContent = `#${thought.tokenId} ${(title || "(empty)").toUpperCase()}`;
  const tipPath = document.createElement("span");
  tipPath.textContent = `$PATH #${thought.pathId} / ${galleryTime(thought.mintedAt)}`;
  const tipMinter = document.createElement("span");
  tipMinter.textContent = `minter ${shortHex(thought.minter, 8, 6)}`;
  const tipHash = document.createElement("span");
  tipHash.textContent = `text ${shortHex(thought.textHash, 10, 8)}`;
  tip.append(tipTitle, tipPath, tipMinter, tipHash);

  imageLink.append(image, tip);
  card.append(imageLink);
  return card;
};

const isGalleryThought = (value: GalleryThought | null): value is GalleryThought => value !== null;

const readGalleryThoughts = async (): Promise<GalleryThought[] | null> => {
  const provider = getReadProvider();
  const token = getReadThoughtToken();
  if (!provider || !token || !THOUGHT_TOKEN_ADDRESS) {
    return null;
  }

  const logs = await provider.getLogs({
    address: THOUGHT_TOKEN_ADDRESS,
    fromBlock: 0,
    toBlock: "latest",
    topics: [THOUGHT_MINTED_TOPIC],
  });

  const thoughts = (
    await Promise.all(logs.map(async (log): Promise<GalleryThought | null> => {
      try {
        const parsed = token.interface.parseLog({ topics: [...log.topics], data: log.data });
        if (!parsed || parsed.name !== "ThoughtMinted") {
          return null;
        }

        const tokenId = Number(parsed.args[0] as bigint);
        const minter = String(parsed.args[1]);
        const pathId = (parsed.args[2] as bigint).toString();
        const textHash = String(parsed.args[3]);
        const provenanceHash = String(parsed.args[4]);
        const thoughtSpecId = String(parsed.args[5]);
        const eventMintedAt = Number(parsed.args[6] as bigint);
        const tokenUri = (await token.tokenURI(tokenId)) as string;
        const metadata = readTokenMetadata(tokenUri);
        const properties = metadata.properties ?? {};
        const thoughtEnvelope = metadata.thought ?? {};

        return {
          tokenId,
          pathId: metadataString(properties.pathId) || pathId,
          minter: metadataString(properties.minter) || minter,
          textHash: metadataString(properties.textHash) || textHash,
          provenanceHash: metadataString(properties.provenanceHash) || provenanceHash,
          thoughtSpecId: metadataString(properties.thoughtSpecId) || thoughtSpecId,
          mintedAt: metadataNumber(properties.mintedAt) ?? eventMintedAt,
          rawText: metadataString(properties.rawText) || metadataString(thoughtEnvelope.text),
          provenanceJson: metadataString(properties.provenanceJson) || metadataString(thoughtEnvelope.provenance),
          image: metadata.image ?? "",
          tokenUri,
          txHash: log.transactionHash,
          blockNumber: log.blockNumber,
        };
      } catch {
        return null;
      }
    }))
  ).filter(isGalleryThought);

  thoughts.sort((left, right) => left.tokenId - right.tokenId);
  return thoughts;
};

const highlightGalleryTarget = () => {
  if (GALLERY_TARGET_TOKEN_ID === null) {
    return;
  }

  const target = galleryGrid.querySelector<HTMLElement>(
    `.thought-gallery__card[data-token-id="${GALLERY_TARGET_TOKEN_ID}"]`,
  );
  if (!target) {
    return;
  }

  target.scrollIntoView({ block: "center", behavior: "smooth" });
  target.classList.add("is-highlighted");
  window.setTimeout(() => {
    target.classList.remove("is-highlighted");
  }, 1000);
};

const loadThoughtGallery = async () => {
  galleryStatus.textContent = "loading minted THOUGHTs...";
  galleryGrid.replaceChildren();

  try {
    const thoughts = await readGalleryThoughts();
    if (!thoughts) {
      galleryStatus.textContent = "gallery unavailable.";
      return;
    }

    galleryStatus.textContent = thoughts.length === 0 ? "no minted THOUGHTs yet." : `${thoughts.length} minted THOUGHT${thoughts.length === 1 ? "" : "s"}.`;
    galleryGrid.replaceChildren(...thoughts.map(renderGalleryCard));
    highlightGalleryTarget();
  } catch {
    galleryStatus.textContent = "failed to read gallery.";
  }
};

const loadThoughtDetail = async () => {
  if (ROUTE_THOUGHT_TOKEN_ID === null) {
    thoughtDetailStatus.textContent = "THOUGHT unavailable.";
    return;
  }

  thoughtDetailTitleToken.textContent = ROUTE_THOUGHT_TOKEN_ID.toString();
  thoughtDetailBody.classList.add("is-hidden");
  thoughtDetailStatus.textContent = "loading THOUGHT...";

  try {
    const thoughts = await readGalleryThoughts();
    if (!thoughts) {
      thoughtDetailStatus.textContent = "THOUGHT unavailable.";
      return;
    }

    const thought = thoughts.find((item) => item.tokenId === ROUTE_THOUGHT_TOKEN_ID);
    if (!thought) {
      thoughtDetailStatus.textContent = `THOUGHT #${ROUTE_THOUGHT_TOKEN_ID} not found.`;
      return;
    }

    const title = canonicalThoughtTitle(thought.rawText);
    document.title = `THOUGHT #${thought.tokenId}`;
    thoughtDetailTitleToken.textContent = thought.tokenId.toString();
    thoughtDetailStatus.textContent = "";
    thoughtDetailImage.src = thought.image || galleryThumbnailUri(title);
    thoughtDetailImage.alt = `THOUGHT #${thought.tokenId} canvas`;
    thoughtDetailCanonicalTitle.textContent = title || "-";
    thoughtDetailPath.textContent = `#${thought.pathId}`;
    thoughtDetailMinter.textContent = thought.minter;
    thoughtDetailMinted.textContent = galleryTime(thought.mintedAt);
    thoughtDetailTextHash.textContent = thought.textHash;
    thoughtDetailProvenanceHash.textContent = thought.provenanceHash;
    thoughtDetailSpec.textContent = shortHex(thought.thoughtSpecId, 10, 8);
    thoughtDetailSpec.title = thought.thoughtSpecId;
    thoughtDetailTx.textContent = thought.txHash;
    thoughtDetailProvenanceJson.textContent = formatProvenanceJson(thought.provenanceJson);
    thoughtDetailBody.classList.remove("is-hidden");
  } catch {
    thoughtDetailStatus.textContent = "failed to load THOUGHT.";
  }
};

const getActionStatusKind = (status: string): "info" | "success" | "warn" | "error" => {
  if (status === "ready" || status === "minted") {
    return "success";
  }

  if (status === "model access needed") {
    return "warn";
  }

  if (status === "generation failed" || status === "mint unavailable") {
    return "error";
  }

  return "info";
};

const syncCtaState = () => {
  const action = getActionPresentation();

  primaryActionState = action.primaryAction;
  secondaryActionState = action.secondaryAction;
  runAgentButton.textContent = action.primaryLabel;
  runAgentButton.disabled = action.primaryDisabled;
  runAgentButton.classList.toggle("is-hidden", !!action.hidePrimary);
  actionStatusCopy.textContent = action.status;
  actionStatusCopy.classList.toggle("is-hidden", action.status.length === 0);
  actionStatusCopy.classList.remove("is-info", "is-success", "is-warn", "is-error");
  actionStatusCopy.classList.add(`is-${getActionStatusKind(action.status)}`);
  resetThoughtButton.textContent = action.secondaryLabel;
  resetThoughtButton.classList.toggle("is-hidden", action.secondaryAction === "none");
  resetThoughtButton.setAttribute("aria-label", action.secondaryLabel.replace(/[\[\]]/g, "").trim() || "Secondary THOUGHT action");

  walletState.menuOpen = false;
  mintWalletToggle.classList.add("is-hidden");
  mintWalletMenu.classList.add("is-hidden");
  syncWalletMenu();
};

const readPx = (value: string) => Number.parseFloat(value) || 0;

const getViewportWidthCap = () => {
  if (window.matchMedia("(max-width: 900px)").matches) {
    return CANVAS_WIDTH;
  }

  const viewportHeight = window.visualViewport?.height ?? window.innerHeight;
  const shellStyles = window.getComputedStyle(frontpageShell);
  const mainStyles = window.getComputedStyle(frontpageMain);
  const frameStyles = window.getComputedStyle(thoughtCanvasFrame);
  const shellInset = readPx(shellStyles.paddingTop) + readPx(shellStyles.paddingBottom);
  const frameInset = readPx(frameStyles.paddingTop) + readPx(frameStyles.paddingBottom);
  const titleHeight = frontpageTitle.getBoundingClientRect().height;
  const rowGap = readPx(mainStyles.rowGap);
  const availableHeight = Math.floor(
    viewportHeight - shellInset - titleHeight - rowGap - frameInset,
  );

  return Math.max(MIN_CANVAS_SIZE, availableHeight);
};

const getDisplayWidth = () => {
  const panelRect = thoughtCanvasPanel.getBoundingClientRect();
  const frameStyles = window.getComputedStyle(thoughtCanvasFrame);
  const horizontalInset =
    readPx(frameStyles.paddingLeft) +
    readPx(frameStyles.paddingRight) +
    readPx(frameStyles.borderLeftWidth) +
    readPx(frameStyles.borderRightWidth);
  const availableWidth = Math.max(MIN_CANVAS_SIZE, Math.floor(panelRect.width - horizontalInset));

  return Math.max(
    MIN_CANVAS_SIZE,
    Math.min(CANVAS_WIDTH, availableWidth, getViewportWidthCap()),
  );
};

const getMinimumHeight = (displayWidth: number) => displayWidth;

const resizeCanvas = (displayWidth: number, height: number) => {
  const deviceScale = window.devicePixelRatio || 1;

  canvas.width = Math.round(displayWidth * deviceScale);
  canvas.height = Math.round(height * deviceScale);
  canvas.style.width = `${displayWidth}px`;
  canvas.style.height = `${height}px`;
  document.documentElement.style.setProperty("--thought-canvas-outer-height", `${height}px`);

  context.setTransform(1, 0, 0, 1, 0, 0);
  context.scale(deviceScale, deviceScale);
};

const drawRoundedRect = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) => {
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, radius);
  ctx.closePath();
};

const colorForCharacter = (char: string): string => {
  if (char === " ") {
    return BACKGROUND_FILL;
  }

  const upper = char.toUpperCase();
  if (/^[A-Z]$/.test(upper)) {
    return COLOR_FONT[upper] ?? "#ffffff";
  }

  return "#778877";
};

const fitImagesToRow = (count: number, displayWidth: number) => {
  const availableWidth = displayWidth - 2 * CANVAS_PADDING;
  const itemCount = Math.max(1, count);
  const naturalWidth = itemCount * IMAGE_SIZE + Math.max(0, itemCount - 1) * IMAGE_GAP;
  const scale = Math.min(1, availableWidth / naturalWidth);
  const imageSize = IMAGE_SIZE * scale;
  const gap = itemCount > 1 ? IMAGE_GAP * scale : 0;
  const rowWidth = itemCount * imageSize + Math.max(0, itemCount - 1) * gap;

  return { imageSize, gap, rowWidth };
};

const renderCanvas = (rawText: string) => {
  const previewText = canonicalThoughtTitle(rawText);
  const chars = Array.from(previewText);
  const displayWidth = getDisplayWidth();
  const height = getMinimumHeight(displayWidth);
  resizeCanvas(displayWidth, height);

  context.clearRect(0, 0, displayWidth, height);
  context.fillStyle = BACKGROUND_FILL;
  context.fillRect(0, 0, displayWidth, height);

  if (!previewText) {
    return;
  }

  const images: DrawImage[] = chars.map((char) => ({
    char,
    fill: colorForCharacter(char),
  }));

  const { imageSize, gap, rowWidth } = fitImagesToRow(images.length, displayWidth);
  const xStart = (displayWidth - rowWidth) / 2;
  const yStart = (height - imageSize) / 2;

  images.forEach((image, index) => {
    const x = xStart + index * (imageSize + gap);
    const y = yStart;

    if (image.char === " ") {
      return;
    }

    drawRoundedRect(context, x, y, imageSize, imageSize, IMAGE_RADIUS);
    context.fillStyle = image.fill;
    context.fill();
  });

  const maxTextWidth = displayWidth - 2 * CANVAS_PADDING;
  let textSize = Math.min(18, displayWidth * 0.034);
  do {
    context.font = `100 ${textSize}px ${CANVAS_TEXT_FAMILY}`;
    if (context.measureText(previewText).width <= maxTextWidth || textSize <= 9) {
      break;
    }
    textSize -= 1;
  } while (textSize > 9);

  context.fillStyle = "rgba(232, 237, 247, 0.72)";
  context.textAlign = "center";
  context.textBaseline = "alphabetic";
  context.fillText(previewText, displayWidth / 2, height - CANVAS_PADDING);
};

const syncOutputToCanvas = (raw: string, options?: { suppressWarning?: boolean }) => {
  const title = canonicalThoughtTitle(raw);

  if (!options?.suppressWarning && byteLength(title) > MAX_RAW_TEXT_BYTES) {
    setWarning(`agent output exceeds the ${MAX_RAW_TEXT_BYTES}-byte mint limit.`, {
      flashMs: NOTICE_FLASH_MS,
      level: "warn",
    });
  } else if (options?.suppressWarning) {
    setWarning("");
  }

  renderCanvas(raw);
};

const setAgentOutput = (text: string) => {
  resetMintRuntimeState();
  currentOutputText = canonicalThoughtTitle(text);
  syncOutputToCanvas(currentOutputText);
};

const recordThoughtRun = (
  mode: Mode,
  provider: string,
  model: string,
  prompt: string,
  rawOutput: string,
  thoughtTitle: string,
) => {
  const clientGeneratedAt = new Date().toISOString();
  currentRunContext = {
    mode,
    provider,
    model,
    prompt,
    clientGeneratedAt,
  };

  const run = {
    mode,
    provider,
    model,
    prompt,
    rawOutput,
    thoughtTitle,
    clientGeneratedAt,
  };

  (
    window as Window & {
      __thoughtLastRun?: typeof run;
    }
  ).__thoughtLastRun = run;

  console.info("[thought] provider output", run);
};

const resetThought = () => {
  runState = "idle";
  walletConnectInFlight = false;
  currentOutputText = "";
  currentRunContext = null;
  resetMintRuntimeState();
  walletState.menuOpen = false;
  syncOutputToCanvas("", { suppressWarning: true });
  setWarning("");
  setStatus("");
  syncCtaState();
  syncPrimaryCtaAvailability();
};

const base64UrlEncode = (bytes: Uint8Array) => {
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });

  return window
    .btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
};

const createCodeVerifier = () => {
  const bytes = new Uint8Array(32);
  globalThis.crypto.getRandomValues(bytes);
  return base64UrlEncode(bytes);
};

const rotateRight = (value: number, shift: number) =>
  (value >>> shift) | (value << (32 - shift));

const sha256Fallback = (input: Uint8Array) => {
  const constants = new Uint32Array([
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4,
    0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe,
    0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f,
    0x4a7484aa, 0x5cb0a9dc, 0x76f988da, 0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7,
    0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc,
    0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b,
    0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070, 0x19a4c116,
    0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7,
    0xc67178f2,
  ]);
  const state = new Uint32Array([
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab,
    0x5be0cd19,
  ]);
  const bitLength = input.length * 8;
  const paddingLength = ((56 - ((input.length + 1) % 64)) + 64) % 64;
  const padded = new Uint8Array(input.length + 1 + paddingLength + 8);
  const view = new DataView(padded.buffer);
  const words = new Uint32Array(64);

  padded.set(input);
  padded[input.length] = 0x80;
  view.setUint32(padded.length - 8, Math.floor(bitLength / 0x100000000), false);
  view.setUint32(padded.length - 4, bitLength >>> 0, false);

  for (let offset = 0; offset < padded.length; offset += 64) {
    for (let index = 0; index < 16; index += 1) {
      words[index] = view.getUint32(offset + index * 4, false);
    }

    for (let index = 16; index < 64; index += 1) {
      const sigma0 =
        rotateRight(words[index - 15], 7) ^
        rotateRight(words[index - 15], 18) ^
        (words[index - 15] >>> 3);
      const sigma1 =
        rotateRight(words[index - 2], 17) ^
        rotateRight(words[index - 2], 19) ^
        (words[index - 2] >>> 10);
      words[index] = (words[index - 16] + sigma0 + words[index - 7] + sigma1) >>> 0;
    }

    let a = state[0];
    let b = state[1];
    let c = state[2];
    let d = state[3];
    let e = state[4];
    let f = state[5];
    let g = state[6];
    let h = state[7];

    for (let index = 0; index < 64; index += 1) {
      const sum1 = rotateRight(e, 6) ^ rotateRight(e, 11) ^ rotateRight(e, 25);
      const choice = (e & f) ^ (~e & g);
      const temp1 = (h + sum1 + choice + constants[index] + words[index]) >>> 0;
      const sum0 = rotateRight(a, 2) ^ rotateRight(a, 13) ^ rotateRight(a, 22);
      const majority = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (sum0 + majority) >>> 0;

      h = g;
      g = f;
      f = e;
      e = (d + temp1) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (temp1 + temp2) >>> 0;
    }

    state[0] = (state[0] + a) >>> 0;
    state[1] = (state[1] + b) >>> 0;
    state[2] = (state[2] + c) >>> 0;
    state[3] = (state[3] + d) >>> 0;
    state[4] = (state[4] + e) >>> 0;
    state[5] = (state[5] + f) >>> 0;
    state[6] = (state[6] + g) >>> 0;
    state[7] = (state[7] + h) >>> 0;
  }

  const digest = new Uint8Array(32);
  const digestView = new DataView(digest.buffer);
  state.forEach((value, index) => {
    digestView.setUint32(index * 4, value, false);
  });
  return digest;
};

const createCodeChallenge = async (verifier: string) => {
  const encoded = new TextEncoder().encode(verifier);
  const subtle = globalThis.crypto?.subtle;

  if (subtle?.digest) {
    const digest = await subtle.digest("SHA-256", encoded);
    return base64UrlEncode(new Uint8Array(digest));
  }

  return base64UrlEncode(sha256Fallback(encoded));
};

const extractResponseText = (payload: unknown): string => {
  if (typeof payload !== "object" || payload === null) {
    return "";
  }

  const response = payload as {
    output_text?: unknown;
    output?: Array<{
      type?: string;
      content?: Array<{ type?: string; text?: string }>;
    }>;
  };

  if (typeof response.output_text === "string" && response.output_text.trim()) {
    return response.output_text.trim();
  }

  const parts =
    response.output
      ?.filter((item) => item.type === "message")
      .flatMap((item) => item.content ?? [])
      .filter((item) => item.type === "output_text" && typeof item.text === "string")
      .map((item) => item.text?.trim() ?? "")
      .filter(Boolean) ?? [];

  return parts.join(" ").trim();
};

const normalizeErrorMessage = (message: string) => message.trim().replace(/\s+/g, " ");

const readErrorString = (value: unknown) =>
  typeof value === "string" && value.trim() ? normalizeErrorMessage(value) : "";

const readNestedProviderErrorMessage = (value: unknown): string => {
  if (typeof value === "string") {
    const raw = value.trim();
    if (!raw) {
      return "";
    }

    try {
      const parsed = JSON.parse(raw) as unknown;
      return readNestedProviderErrorMessage(parsed) || normalizeErrorMessage(raw);
    } catch {
      return normalizeErrorMessage(raw);
    }
  }

  if (typeof value !== "object" || value === null) {
    return "";
  }

  const payload = value as {
    error?: unknown;
    message?: unknown;
    detail?: unknown;
    details?: unknown;
    metadata?: { raw?: unknown };
  };
  if (typeof payload.error === "object" && payload.error !== null) {
    const nested = readNestedProviderErrorMessage(payload.error);
    if (nested) {
      return nested;
    }
  }

  return (
    readErrorString(payload.message) ||
    readErrorString(payload.detail) ||
    readErrorString(payload.details) ||
    readNestedProviderErrorMessage(payload.metadata?.raw)
  );
};

const readErrorMessage = (payload: unknown, fallback: string): string => {
  if (typeof payload !== "object" || payload === null) {
    return fallback;
  }

  const error = (payload as { error?: { message?: unknown; metadata?: { raw?: unknown } } }).error;
  if (error && typeof error === "object") {
    const message = readErrorString(error.message);
    const providerMessage = readNestedProviderErrorMessage(error.metadata?.raw);
    if (providerMessage && (!message || message.toLowerCase() === "provider returned error")) {
      return providerMessage;
    }

    if (message) {
      return message;
    }
  }

  const errorString = readErrorString((payload as { error?: unknown }).error);
  if (errorString) {
    return errorString;
  }

  const message = readErrorString((payload as { message?: unknown }).message);
  if (message) {
    return message;
  }

  return fallback;
};

const buildOllamaPrompt = (prompt: string) =>
  [getActiveThoughtInstructions(), "", "User prompt:", prompt.trim(), "", "Response:"].join("\n");

const requestOllama = async (model: string, prompt: string) => {
  let response: Response;
  const ollamaModel = model.replace(/^ollama:/, "").trim();

  try {
    response = await fetch("http://127.0.0.1:11434/api/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: ollamaModel,
        prompt: buildOllamaPrompt(prompt),
        stream: false,
        options: {
          temperature: 0,
          num_predict: 160,
        },
      }),
    });
  } catch {
    throw new Error("ollama not found.");
  }

  const payload = (await response.json().catch(() => null)) as unknown;

  if (!response.ok) {
    throw new Error(readErrorMessage(payload, "ollama request failed."));
  }

  if (
    typeof payload === "object" &&
    payload !== null &&
    "response" in payload &&
    typeof (payload as { response?: unknown }).response === "string"
  ) {
    return ((payload as { response: string }).response).trim();
  }

  return "";
};

const requestOpenAIResponses = async (apiKey: string, model: string, prompt: string) => {
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      instructions: getActiveThoughtInstructions(),
      input: prompt,
      max_output_tokens: 160,
      store: false,
    }),
  });

  const payload = (await response.json().catch(() => null)) as unknown;

  if (!response.ok) {
    throw new Error(readErrorMessage(payload, "openai request failed."));
  }

  return extractResponseText(payload);
};

const requestAnthropicMessages = async (apiKey: string, model: string, prompt: string) => {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body: JSON.stringify({
      model,
      system: getActiveThoughtInstructions(),
      max_tokens: 160,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  const payload = (await response.json().catch(() => null)) as unknown;

  if (!response.ok) {
    throw new Error(readErrorMessage(payload, "anthropic request failed."));
  }

  if (typeof payload !== "object" || payload === null) {
    return "";
  }

  const content = (payload as { content?: Array<{ type?: string; text?: string }> }).content ?? [];
  return content
    .filter((item) => item.type === "text" && typeof item.text === "string")
    .map((item) => item.text?.trim() ?? "")
    .filter(Boolean)
    .join(" ")
    .trim();
};

const requestOpenRouterChat = async (apiKey: string, model: string, prompt: string) => {
  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: getActiveThoughtInstructions() },
        { role: "user", content: prompt },
      ],
    }),
  });

  const payload = (await response.json().catch(() => null)) as unknown;

  if (!response.ok) {
    throw new Error(readErrorMessage(payload, "openrouter request failed."));
  }

  if (typeof payload !== "object" || payload === null) {
    return "";
  }

  const choices =
    (payload as { choices?: Array<{ message?: { content?: unknown } }> }).choices ?? [];
  const content = choices[0]?.message?.content;

  if (typeof content === "string") {
    return content.trim();
  }

  if (Array.isArray(content)) {
    return content
      .flatMap((part) => {
        if (typeof part === "string") {
          return [part];
        }

        if (
          typeof part === "object" &&
          part !== null &&
          "text" in part &&
          typeof (part as { text?: unknown }).text === "string"
        ) {
          return [(part as { text: string }).text];
        }

        return [];
      })
      .join(" ")
      .trim();
  }

  return "";
};

const extractOpenRouterKey = (payload: unknown): string => {
  if (typeof payload !== "object" || payload === null) {
    return "";
  }

  const key = (payload as { key?: unknown }).key;
  return typeof key === "string" ? key.trim() : "";
};

const cleanOpenRouterCallbackUrl = () => {
  const url = new URL(window.location.href);
  let changed = false;

  ["code", "error", "error_description"].forEach((param) => {
    if (url.searchParams.has(param)) {
      url.searchParams.delete(param);
      changed = true;
    }
  });

  if (changed) {
    window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
  }
};

const exchangeOpenRouterCode = async (code: string) => {
  const verifier = sessionStorage.getItem(OPENROUTER_PKCE_VERIFIER_KEY);

  if (!verifier) {
    throw new Error("openrouter verifier is missing. authorize again.");
  }

  const response = await fetch(OPENROUTER_KEY_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      code,
      code_verifier: verifier,
      code_challenge_method: "S256",
    }),
  });

  const payload = (await response.json().catch(() => null)) as unknown;

  if (!response.ok) {
    throw new Error(readErrorMessage(payload, "openrouter connect failed."));
  }

  const key = extractOpenRouterKey(payload);
  if (!key) {
    throw new Error("openrouter returned no key.");
  }

  sessionStorage.removeItem(OPENROUTER_PKCE_VERIFIER_KEY);
  sessionState.mode = "connect";
  sessionState.connect.apiKey = key;
  sessionState.connect.model =
    sessionState.connect.model || DIRECT_PROVIDERS.openrouter.defaultModel;
  writeSessionState();
};

const handleOpenRouterCallback = async () => {
  const params = new URLSearchParams(window.location.search);
  const error = params.get("error");
  const code = params.get("code");

  if (error) {
    cleanOpenRouterCallbackUrl();
    throw new Error(params.get("error_description") || error);
  }

  if (!code) {
    return false;
  }

  setStatus("authorizing openrouter...");
  connectOpenRouterButton.disabled = true;

  try {
    await exchangeOpenRouterCode(code);
    cleanOpenRouterCallbackUrl();
    syncInterface();
    setWarning("");
    setStatus("openrouter linked.", { flashMs: NOTICE_FLASH_MS });
    return true;
  } finally {
    connectOpenRouterButton.disabled = false;
  }
};

const startOpenRouterConnect = async () => {
  if (!isOpenRouterConnectSupported()) {
    throw new Error(getOpenRouterConnectConstraintMessage());
  }

  const verifier = createCodeVerifier();
  const challenge = await createCodeChallenge(verifier);
  const callbackUrl = `${window.location.origin}${window.location.pathname}`;
  const authUrl = new URL(OPENROUTER_AUTH_URL);

  authUrl.searchParams.set("callback_url", callbackUrl);
  authUrl.searchParams.set("code_challenge", challenge);
  authUrl.searchParams.set("code_challenge_method", "S256");

  sessionStorage.setItem(OPENROUTER_PKCE_VERIFIER_KEY, verifier);
  window.location.assign(authUrl.toString());
};

const disconnectOpenRouter = () => {
  sessionState.connect.apiKey = "";
  sessionStorage.removeItem(OPENROUTER_PKCE_VERIFIER_KEY);
  writeSessionState();
  syncInterface();
  setWarning("");
  setStatus("openrouter disconnected.", { flashMs: NOTICE_FLASH_MS });
};

const dedupeModelOptions = (options: ModelOption[]) => {
  const seen = new Set<string>();

  return options.filter((option) => {
    const id = option.id.trim();
    if (!id || seen.has(id)) {
      return false;
    }

    seen.add(id);
    return true;
  });
};

const hasTextModality = (value: unknown) => Array.isArray(value) && value.includes("text");

const fetchOpenRouterModels = async (): Promise<ModelOption[]> => {
  const response = await fetch(OPENROUTER_MODEL_URL);
  const payload = (await response.json().catch(() => null)) as unknown;

  if (!response.ok) {
    throw new Error(readErrorMessage(payload, "openrouter model list failed."));
  }

  const data = (payload as { data?: unknown })?.data;
  if (!Array.isArray(data)) {
    return STATIC_MODEL_OPTIONS.openrouter;
  }

  const preferredRank = new Map(
    OPENROUTER_PREFERRED_MODELS.map((model, index) => [model, index]),
  );

  const options = data
    .flatMap((entry): ModelOption[] => {
      if (typeof entry !== "object" || entry === null) {
        return [];
      }

      const model = entry as {
        id?: unknown;
        architecture?: {
          input_modalities?: unknown;
          output_modalities?: unknown;
        };
        pricing?: {
          prompt?: unknown;
          completion?: unknown;
        };
      };
      const id = typeof model.id === "string" ? model.id.trim() : "";

      if (!id) {
        return [];
      }

      if (!hasTextModality(model.architecture?.input_modalities)) {
        return [];
      }

      if (!hasTextModality(model.architecture?.output_modalities)) {
        return [];
      }

      if (
        Array.isArray(model.architecture?.output_modalities) &&
        model.architecture.output_modalities.includes("image")
      ) {
        return [];
      }

      if (String(model.pricing?.prompt) === "-1" || String(model.pricing?.completion) === "-1") {
        return [];
      }

      return [{ id, label: id }];
    })
    .sort((left, right) => {
      const leftRank = preferredRank.get(left.id) ?? Number.MAX_SAFE_INTEGER;
      const rightRank = preferredRank.get(right.id) ?? Number.MAX_SAFE_INTEGER;

      if (leftRank !== rightRank) {
        return leftRank - rightRank;
      }

      const leftFreeRank = left.id.endsWith(":free") ? 0 : 1;
      const rightFreeRank = right.id.endsWith(":free") ? 0 : 1;

      if (leftFreeRank !== rightFreeRank) {
        return leftFreeRank - rightFreeRank;
      }

      return left.id.localeCompare(right.id);
    });

  return dedupeModelOptions(options);
};

const fetchOllamaModels = async (): Promise<ModelOption[]> => {
  const response = await fetch(OLLAMA_TAGS_URL);
  const payload = (await response.json().catch(() => null)) as unknown;

  if (!response.ok) {
    throw new Error(readErrorMessage(payload, "ollama model list failed."));
  }

  const data = (payload as { models?: unknown })?.models;
  if (!Array.isArray(data)) {
    return STATIC_MODEL_OPTIONS.ollama;
  }

  const options = data.flatMap((entry): ModelOption[] => {
    if (typeof entry !== "object" || entry === null) {
      return [];
    }

    const model = entry as { model?: unknown; name?: unknown };
    const id =
      typeof model.model === "string"
        ? model.model.trim()
        : typeof model.name === "string"
          ? model.name.trim()
          : "";

    return id ? [{ id, label: id }] : [];
  });

  return dedupeModelOptions(options);
};

const getCurrentModelSourceId = (): ModelSourceId => {
  if (sessionState.mode === "connect") {
    return "openrouter";
  }

  if (sessionState.mode === "local") {
    return "ollama";
  }

  return sessionState.direct.provider;
};

const getCurrentModelValue = () => {
  if (sessionState.mode === "connect") {
    return sessionState.connect.model;
  }

  if (sessionState.mode === "local") {
    return sessionState.local.model;
  }

  return sessionState.direct.model;
};

const setCurrentModelValue = (value: string) => {
  if (sessionState.mode === "connect") {
    sessionState.connect.model = value;
  } else if (sessionState.mode === "local") {
    sessionState.local.model = value;
  } else {
    sessionState.direct.model = value;
  }
};

const getModelOptions = (sourceId: ModelSourceId) =>
  modelOptionsCache.get(sourceId) ?? STATIC_MODEL_OPTIONS[sourceId];

const formatModelLabel = (label: string, maxLength = 28) => {
  const trimmed = label.trim();
  if (trimmed.length <= maxLength) {
    return trimmed;
  }

  return `${trimmed.slice(0, Math.max(0, maxLength - 3))}...`;
};

const syncManualModelField = () => {
  modelManualBox.classList.toggle("is-hidden", modelBox.value !== MANUAL_MODEL_VALUE);
};

const setModelOptions = (
  sourceId: ModelSourceId,
  options: ModelOption[],
  selectedModel: string,
) => {
  const allowManual = sourceId !== LOCAL_ENGINE_ID;
  const modelOptions = dedupeModelOptions(options.length ? options : STATIC_MODEL_OPTIONS[sourceId]);
  const defaultModel =
    sourceId === LOCAL_ENGINE_ID ? LOCAL_DEFAULT_MODEL : DIRECT_PROVIDERS[sourceId].defaultModel;
  const optionIds = new Set(modelOptions.map((option) => option.id));
  const selected = selectedModel.trim();
  const resolvedModel =
    !selected || (selected === defaultModel && !optionIds.has(selected))
      ? (optionIds.has(defaultModel) ? defaultModel : modelOptions[0]?.id) || defaultModel
      : selected;
  const hasSelectedModel = optionIds.has(resolvedModel);

  modelBox.replaceChildren();
  modelOptions.forEach((option) => {
    const renderedOption = new Option(formatModelLabel(option.label), option.id);
    renderedOption.title = option.label;
    modelBox.append(renderedOption);
  });

  if (allowManual) {
    modelBox.append(new Option("custom model id", MANUAL_MODEL_VALUE));
  }

  if (allowManual && !hasSelectedModel) {
    modelBox.value = MANUAL_MODEL_VALUE;
    modelManualBox.value = resolvedModel;
  } else {
    modelBox.value = hasSelectedModel ? resolvedModel : modelOptions[0]?.id ?? "";
    modelManualBox.value = "";
  }

  syncManualModelField();
  modelBox.disabled = false;
  modelManualBox.disabled = !allowManual;
  modelBox.title = resolvedModel;
  modelManualBox.title = modelManualBox.value.trim();
  return allowManual && modelBox.value === MANUAL_MODEL_VALUE
    ? modelManualBox.value.trim()
    : modelBox.value.trim();
};

const disableModelControls = (message: string) => {
  modelBox.replaceChildren(new Option(message, ""));
  modelBox.disabled = true;
  modelBox.title = "";
  modelManualBox.value = "";
  modelManualBox.title = "";
  modelManualBox.disabled = true;
  modelManualBox.classList.add("is-hidden");
};

const getSelectedModelValue = () => {
  if (modelBox.disabled) {
    return "";
  }

  if (modelBox.value === MANUAL_MODEL_VALUE) {
    return modelManualBox.value.trim();
  }

  return modelBox.value.trim();
};

const syncConnectControls = () => {
  const isConnectMode = sessionState.mode === "connect";
  const hasCredential = sessionState.connect.apiKey.trim().length > 0;
  const connectSupported = isOpenRouterConnectSupported();

  connectPanel.classList.toggle("is-hidden", !isConnectMode);
  connectOpenRouterButton.classList.toggle("is-hidden", hasCredential);
  connectStatusRow.classList.toggle("is-hidden", !hasCredential);
  connectStatusCopy.textContent = "openrouter linked";
  connectOpenRouterButton.disabled = hasCredential ? false : !connectSupported;
  connectOpenRouterButton.title = connectSupported ? "" : getOpenRouterConnectConstraintMessage();

  if (!hasCredential) {
    connectOpenRouterButton.textContent = connectSupported
      ? "[ authorize openrouter ]"
      : "[ openrouter connect unavailable ]";
  }
};

const syncModeControls = () => {
  const isConnectMode = sessionState.mode === "connect";
  const isDirectMode = sessionState.mode === "direct";
  const isLocalMode = sessionState.mode === "local";

  modeConnectButton.classList.toggle("is-active", isConnectMode);
  modeDirectButton.classList.toggle("is-active", isDirectMode);
  modeLocalButton.classList.toggle("is-active", isLocalMode);
  providerField.classList.toggle("is-hidden", !isDirectMode);
  apiKeyField.classList.toggle("is-hidden", !isDirectMode);
  localEngineField.classList.toggle("is-hidden", !isLocalMode);
  localStatus.classList.toggle("is-hidden", !isLocalMode);
  localHelper.classList.add("is-hidden");
  syncConnectControls();
};

const syncDirectControls = () => {
  providerBox.value = sessionState.direct.provider;
  apiKeyLabel.textContent = "api key";
  apiKeyBox.placeholder = "session only. never stored by THOUGHT.";
  apiKeyBox.value = sessionState.direct.apiKey;
};

const syncLocalControls = () => {
  if (sessionState.local.available === true) {
    localStatus.innerHTML = "ollama detected.<br />runs on this machine.<br />no cloud call.";
  } else if (sessionState.local.available === false) {
    localStatus.innerHTML = "ollama not found.<br />start ollama, then retry.";
  } else {
    localStatus.innerHTML = "checking ollama...";
  }
};

const syncPromptField = () => {
  if (promptBox.value !== sessionState.prompt) {
    promptBox.value = sessionState.prompt;
  }
};

const syncModelControls = () => {
  const sourceId = getCurrentModelSourceId();

  if (sourceId === "ollama" && sessionState.local.available === false) {
    disableModelControls("ollama not found");
    return;
  }

  const resolvedModel = setModelOptions(sourceId, getModelOptions(sourceId), getCurrentModelValue());

  if (resolvedModel && getCurrentModelValue() !== resolvedModel) {
    setCurrentModelValue(resolvedModel);
    writeSessionState();
  }
};

const syncRunAvailability = () => {
  syncPrimaryCtaAvailability();
};

const syncDebugPanel = () => {
  thoughtDebug.classList.toggle("is-hidden", !IS_DEV_MODE);

  if (!IS_DEV_MODE) {
    return;
  }

  thoughtDebugPanel.classList.toggle("is-hidden", !debugState.open);
  thoughtDebugToggle.setAttribute("aria-expanded", debugState.open ? "true" : "false");
  normalizeDebugHierarchy();
  syncDebugSelect(thoughtDebugCta, DEBUG_CTA_OPTIONS, DEBUG_CTA_LABELS, debugState.cta);
  syncDebugSelect(
    thoughtDebugCtaStatus,
    getDebugStatusOptions(),
    DEBUG_CTA_STATUS_LABELS,
    debugState.ctaStatus,
  );
  syncDebugSelect(
    thoughtDebugWarning,
    getDebugWarningOptions(),
    DEBUG_WARNING_LABELS,
    debugState.warning,
  );
  thoughtDebugEnabled.checked = debugState.enabled;
  thoughtDebugCta.disabled = !debugState.enabled;
  thoughtDebugCtaStatus.disabled = !debugState.enabled;
  thoughtDebugWarning.disabled = !debugState.enabled;
};

const syncInterface = () => {
  syncModeControls();
  syncDirectControls();
  syncLocalControls();
  syncPromptField();
  syncModelControls();
  syncThoughtInstructionsControls();
  syncCtaState();
  syncMintSheet();
  syncRunAvailability();
  syncDebugPanel();
  syncWarningBox();
  syncCliPanel();
};

const loadModelOptionsForSource = async (
  sourceId: ModelSourceId,
  options?: { silent?: boolean },
) => {
  if (modelOptionsLoading.has(sourceId)) {
    return;
  }

  modelOptionsLoading.add(sourceId);

  try {
    let modelOptions = STATIC_MODEL_OPTIONS[sourceId];

    if (sourceId === "openrouter") {
      modelOptions = await fetchOpenRouterModels();
    } else if (sourceId === LOCAL_ENGINE_ID) {
      modelOptions = await fetchOllamaModels();
      sessionState.local.available = true;
    }

    modelOptionsCache.set(sourceId, modelOptions.length ? modelOptions : STATIC_MODEL_OPTIONS[sourceId]);
    writeSessionState();

    if (getCurrentModelSourceId() === sourceId) {
      syncInterface();
    }
  } catch (error) {
    if (sourceId === LOCAL_ENGINE_ID) {
      sessionState.local.available = false;
      modelOptionsCache.delete(sourceId);
      writeSessionState();

      if (sessionState.mode === "local") {
        syncInterface();
      }
    } else {
      modelOptionsCache.set(sourceId, STATIC_MODEL_OPTIONS[sourceId]);

      if (!options?.silent && getCurrentModelSourceId() === sourceId) {
        const message = error instanceof Error ? error.message : "model list failed.";
        setWarning(message, { flashMs: NOTICE_FLASH_MS });
      }

      if (getCurrentModelSourceId() === sourceId) {
        syncInterface();
      }
    }
  } finally {
    modelOptionsLoading.delete(sourceId);
    syncRunAvailability();
  }
};

const refreshCurrentModels = (options?: { silent?: boolean }) =>
  loadModelOptionsForSource(getCurrentModelSourceId(), options);

const setMode = (mode: Mode) => {
  sessionState.mode = mode;
  resetMintRuntimeState();
  writeSessionState();
  syncInterface();

  if (mode === "local") {
    void refreshCurrentModels({ silent: true });
  } else {
    void refreshCurrentModels({ silent: true });
  }

  if (mode === "connect" && !sessionState.connect.apiKey.trim() && !isOpenRouterConnectSupported()) {
    setWarning(getOpenRouterConnectConstraintMessage(), { level: "warn" });
  } else {
    setWarning("");
  }

  setStatus("");
};

const setThoughtInstructionsOverride = (override: ThoughtInstructionsOverride | null) => {
  thoughtInstructionsOverride = ENABLE_THOUGHT_UPLOAD ? override : null;
  writeThoughtInstructionsOverride();
  syncThoughtInstructionsControls();
};

const handleThoughtFileSelection = async () => {
  const file = thoughtFileInput.files?.[0];
  thoughtFileInput.value = "";

  if (!file) {
    return;
  }

  try {
    const content = await file.text();

    if (!content.trim()) {
      throw new Error("THOUGHT.md is empty.");
    }

    setThoughtInstructionsOverride({
      name: file.name || "uploaded THOUGHT.md",
      content,
    });
    setWarning("");
    setStatus(`loaded ${file.name || "THOUGHT.md"}.`, { flashMs: NOTICE_FLASH_MS });
  } catch (error) {
    const message = error instanceof Error ? error.message : "THOUGHT.md upload failed.";
    setWarning(message, { flashMs: NOTICE_FLASH_MS });
    setStatus("failed.");
  }
};

const runAgent = async () => {
  if (isDebugCtaOverrideActive()) {
    setStatus("debug CTA only.", { flashMs: NOTICE_FLASH_MS });
    return;
  }

  if (primaryActionState === "connect_wallet") {
    await requestWalletConnect();
    return;
  }

  if (primaryActionState === "switch_wallet") {
    await switchWalletChain();
    return;
  }

  if (primaryActionState === "mint" || primaryActionState === "retry_mint") {
    await openMintSheet();
    return;
  }

  if (primaryActionState === "none") {
    return;
  }

  const prompt = sessionState.prompt.trim();
  const model = getCurrentModelValue().trim();

  if (!prompt) {
    setWarning("prompt is required.", { level: "warn" });
    setStatus("");
    return;
  }

  if (!model) {
    setWarning("model is required.", { level: "warn" });
    setStatus("");
    return;
  }

  if (sessionState.mode === "connect" && !sessionState.connect.apiKey.trim()) {
    setWarning("authorize openrouter first.", { level: "warn" });
    setStatus("");
    return;
  }

  if (sessionState.mode === "direct" && !sessionState.direct.apiKey.trim()) {
    setWarning("api key is required.", { level: "warn" });
    setStatus("");
    return;
  }

  if (sessionState.mode === "local" && sessionState.local.available === false) {
    setWarning("ollama not found.");
    setStatus("");
    return;
  }

  try {
    await ensureActiveThoughtSpec();
    syncThoughtInstructionsControls();
  } catch (error) {
    const message = formatThoughtSpecError(error);
    runState = "run_failed";
    setWarning(message);
    setStatus("");
    syncInterface();
    return;
  }

  setWarning("");
  setStatus("");
  runState = "running";
  runInFlight = true;
  syncInterface();

  try {
    let text = "";
    let provider = "";

    if (sessionState.mode === "connect") {
      provider = "openrouter";
      text = await requestOpenRouterChat(sessionState.connect.apiKey.trim(), model, prompt);
    } else if (sessionState.mode === "direct") {
      provider = sessionState.direct.provider;
      const apiKey = sessionState.direct.apiKey.trim();

      if (provider === "openai") {
        text = await requestOpenAIResponses(apiKey, model, prompt);
      } else if (provider === "openrouter") {
        text = await requestOpenRouterChat(apiKey, model, prompt);
      } else {
        text = await requestAnthropicMessages(apiKey, model, prompt);
      }
    } else {
      provider = LOCAL_ENGINE_ID;
      text = await requestOllama(model, prompt);
    }

    const thoughtTitle = canonicalThoughtTitle(text);

    if (!thoughtTitle) {
      throw new Error("agent returned no text.");
    }

    recordThoughtRun(sessionState.mode, provider, model, prompt, text, thoughtTitle);
    setAgentOutput(text);
    runState = "output_ready";
    walletState.txState = "idle";
    walletState.txError = "";
    walletState.txHash = "";
    walletState.mintedTokenId = null;
    syncCtaState();
    void refreshWalletState().then(() => {
      syncInterface();
    });
    setStatus("");
  } catch (error) {
    runState = "run_failed";
    const message = error instanceof Error ? error.message : "agent request failed.";
    setWarning(message);
    setStatus("");
  } finally {
    runInFlight = false;
    syncInterface();
  }
};

const trimCliEntries = () => {
  if (cliEntries.length > 80) {
    cliEntries.splice(0, cliEntries.length - 80);
  }
};

const appendCliEntry = (kind: CliEntryKind, lines: string | string[]) => {
  const normalizedLines = Array.isArray(lines) ? lines : [lines];
  if (!normalizedLines.some((line) => line.length > 0)) {
    return;
  }

  cliEntries.push({ kind, lines: normalizedLines });
  trimCliEntries();
  syncCliPanel();
};

const displayCliCommand = (command: string) => {
  const [head = "", second = ""] = command.split(/\s+/, 2);
  const lowerHead = head.toLowerCase();
  const lowerSecond = second.toLowerCase();
  const isKeyCommand = lowerHead === "key" || (lowerHead === "config" && lowerSecond === "key");

  if (!isKeyCommand) {
    return command;
  }

  const prefix = lowerHead === "config" ? "config key" : "key";
  const rest = command.slice(prefix.length).trim();
  if (!rest || rest.toLowerCase() === "clear" || rest.toLowerCase() === "help") {
    return command;
  }

  return `${prefix} ********`;
};

const shouldRecordCliCommand = (command: string) => {
  const [head = "", second = ""] = command.split(/\s+/, 2);
  const lowerHead = head.toLowerCase();
  const lowerSecond = second.toLowerCase();
  const isKeyCommand = lowerHead === "key" || (lowerHead === "config" && lowerSecond === "key");

  if (!isKeyCommand) {
    return true;
  }

  const prefix = lowerHead === "config" ? "config key" : "key";
  const rest = command.slice(prefix.length).trim().toLowerCase();
  return !rest || rest === "clear" || rest === "help";
};

const readStoredCliCommandHistory = () => {
  const raw = sessionStorage.getItem(THOUGHT_CLI_HISTORY_STORAGE_KEY);
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .filter((entry): entry is string => typeof entry === "string")
      .map((entry) => entry.trim())
      .filter((entry) => entry.length > 0 && shouldRecordCliCommand(entry))
      .slice(-CLI_COMMAND_HISTORY_LIMIT);
  } catch {
    return [];
  }
};

const writeCliCommandHistory = () => {
  sessionStorage.setItem(
    THOUGHT_CLI_HISTORY_STORAGE_KEY,
    JSON.stringify(cliCommandHistory.slice(-CLI_COMMAND_HISTORY_LIMIT)),
  );
};

const loadCliCommandHistory = () => {
  cliCommandHistory.splice(0, cliCommandHistory.length, ...readStoredCliCommandHistory());
};

const resetCliHistoryCursor = () => {
  cliHistoryIndex = null;
  cliHistoryDraft = "";
};

const recordCliCommandHistory = (command: string) => {
  if (!shouldRecordCliCommand(command)) {
    resetCliHistoryCursor();
    return;
  }

  const previous = cliCommandHistory[cliCommandHistory.length - 1];
  if (previous !== command) {
    cliCommandHistory.push(command);
  }

  if (cliCommandHistory.length > CLI_COMMAND_HISTORY_LIMIT) {
    cliCommandHistory.splice(0, cliCommandHistory.length - CLI_COMMAND_HISTORY_LIMIT);
  }
  writeCliCommandHistory();
  resetCliHistoryCursor();
};

const setCliInputCommand = (command: string) => {
  thoughtCliInput.value = command;
  requestAnimationFrame(() => {
    thoughtCliInput.setSelectionRange(command.length, command.length);
  });
};

const showPreviousCliCommand = () => {
  if (!cliCommandHistory.length) {
    return;
  }

  if (cliHistoryIndex === null) {
    cliHistoryDraft = thoughtCliInput.value;
    cliHistoryIndex = cliCommandHistory.length - 1;
  } else {
    cliHistoryIndex = Math.max(0, cliHistoryIndex - 1);
  }

  setCliInputCommand(cliCommandHistory[cliHistoryIndex]);
};

const showNextCliCommand = () => {
  if (cliHistoryIndex === null) {
    return;
  }

  if (cliHistoryIndex < cliCommandHistory.length - 1) {
    cliHistoryIndex += 1;
    setCliInputCommand(cliCommandHistory[cliHistoryIndex]);
    return;
  }

  setCliInputCommand(cliHistoryDraft);
  resetCliHistoryCursor();
};

const appendCliCommand = (command: string) => {
  appendCliEntry("command", displayCliCommand(command));
};

const appendCliOutput = (lines: string | string[]) => {
  appendCliEntry("output", lines);
};

const appendCliError = (lines: string | string[]) => {
  appendCliEntry("error", lines);
};

let cliScrollHideTimer = 0;
let cliScrollFrame = 0;

const revealCliScrollbar = () => {
  window.clearTimeout(cliScrollHideTimer);
  thoughtCliTranscript.classList.add("is-scrolling");
  cliScrollHideTimer = window.setTimeout(() => {
    thoughtCliTranscript.classList.remove("is-scrolling");
  }, 800);
};

const scrollCliTranscriptToBottom = () => {
  thoughtCliTranscript.scrollTop = thoughtCliTranscript.scrollHeight;
};

const scheduleCliTranscriptScrollToBottom = () => {
  window.cancelAnimationFrame(cliScrollFrame);
  revealCliScrollbar();
  scrollCliTranscriptToBottom();
  cliScrollFrame = window.requestAnimationFrame(() => {
    scrollCliTranscriptToBottom();
    cliScrollFrame = window.requestAnimationFrame(() => {
      scrollCliTranscriptToBottom();
      cliScrollFrame = 0;
    });
  });
};

const renderCliTranscript = () => {
  const nodes = cliEntries.map((entry) => {
    const block = document.createElement("div");
    block.className = `thought-cli-entry thought-cli-entry--${entry.kind}`;
    entry.lines.forEach((line, index) => {
      const row = document.createElement("div");
      const displayLine = entry.kind === "command" && index === 0 ? `> ${line}` : line;
      row.textContent = displayLine || " ";
      block.append(row);
    });
    return block;
  });

  thoughtCliTranscript.replaceChildren(...nodes);
};

const getProvenanceSummary = () => {
  if (!currentOutputText) {
    return null;
  }

  try {
    const provenanceJson = buildProvenanceJson(hashText(currentOutputText));
    return {
      bytes: byteLength(provenanceJson),
      json: provenanceJson,
    };
  } catch {
    return null;
  }
};

const getCliSuggestions = (): CliSuggestion[] => {
  if (cliCommandInFlight) {
    return [
      { label: "current", command: "current" },
      { label: "help", command: "help" },
    ];
  }

  if (cliSuggestionContext === "help") {
    return [
      { label: "config", command: "config" },
      { label: "prompt <text>", command: "prompt " },
      { label: "run", command: "run" },
      { label: "current", command: "current" },
    ];
  }

  if (cliSuggestionContext === "config") {
    if (sessionState.mode === "connect" && !sessionState.connect.apiKey.trim()) {
      return [
        { label: "config connect openrouter", command: "config connect openrouter" },
        { label: "config engine list", command: "config engine list" },
        { label: "current", command: "current" },
      ];
    }

    if (sessionState.mode === "connect" && sessionState.connect.apiKey.trim()) {
      return [
        { label: "run", command: "run" },
        { label: "config disconnect openrouter", command: "config disconnect openrouter" },
        { label: "config engine list", command: "config engine list" },
      ];
    }

    if (sessionState.mode === "direct" && !sessionState.direct.apiKey.trim()) {
      return [
        { label: `config provider ${sessionState.direct.provider}`, command: `config provider ${sessionState.direct.provider}` },
        { label: "config key <api-key>", command: "config key " },
        { label: "current", command: "current" },
      ];
    }

    if (sessionState.mode === "local") {
      return [
        { label: "config engine list", command: "config engine list" },
        { label: "prompt <text>", command: "prompt " },
        { label: "run", command: "run" },
      ];
    }

    return [
      { label: "prompt <text>", command: "prompt " },
      { label: "run", command: "run" },
      { label: "config engine list", command: "config engine list" },
    ];
  }

  if (mintFlowState === "wallet_required") {
    return [
      { label: "wallet connect", command: "wallet connect" },
      { label: "mint-path", command: "mint-path" },
      { label: "help mint", command: "help mint" },
    ];
  }

  if (mintFlowState === "path_required" || isPathRecoveryError()) {
    return [
      { label: "path <id>", command: "path " },
      { label: "mint-path", command: "mint-path" },
      { label: "current", command: "current" },
    ];
  }

  if (mintFlowState === "path_ready" || mintFlowState === "authorizing") {
    return [
      { label: "authorize", command: "authorize" },
      { label: "path <id>", command: "path " },
      { label: "current", command: "current" },
    ];
  }

  if (mintFlowState === "authorized" || mintFlowState === "minting") {
    return [
      { label: "confirm", command: "confirm" },
      { label: "current", command: "current" },
    ];
  }

  if (mintFlowState === "minted") {
    return [
      { label: "view tx", command: "view tx" },
      { label: "view THOUGHT", command: "view THOUGHT" },
      { label: "gallery", command: "gallery" },
    ];
  }

  if (runState === "output_ready") {
    return [
      { label: "mint", command: "mint" },
      { label: "rerun", command: "rerun" },
      { label: "provenance", command: "provenance" },
      { label: "reset", command: "reset" },
    ];
  }

  if (runState === "run_failed") {
    return [
      { label: "retry run", command: "retry run" },
      { label: "current", command: "current" },
      { label: "help", command: "help" },
    ];
  }

  if (!sessionState.prompt.trim()) {
    return [
      { label: "config", command: "config" },
      { label: "prompt <text>", command: "prompt " },
      { label: "run", command: "run" },
      { label: "mint", command: "mint" },
    ];
  }

  if (sessionState.mode === "connect" && !sessionState.connect.apiKey.trim()) {
    return [
      { label: "config connect openrouter", command: "config connect openrouter" },
      { label: "config engine list", command: "config engine list" },
      { label: "current", command: "current" },
    ];
  }

  if (sessionState.mode === "direct" && !sessionState.direct.apiKey.trim()) {
    return [
      { label: `config provider ${sessionState.direct.provider}`, command: `config provider ${sessionState.direct.provider}` },
      { label: "config key <api-key>", command: "config key " },
      { label: "current", command: "current" },
    ];
  }

  return [
    { label: "run", command: "run" },
    { label: "config engine list", command: "config engine list" },
    { label: "current", command: "current" },
    { label: "help", command: "help" },
  ];
};

const renderCliSuggestions = () => {
  const label = document.createElement("span");
  label.className = "thought-cli__suggestion-label";
  label.textContent = "next:";

  const buttons = getCliSuggestions().map((suggestion) => {
    const button = document.createElement("button");
    button.className = "thought-cli__suggestion";
    button.type = "button";
    button.textContent = `[ ${suggestion.label} ]`;
    button.title = suggestion.command;
    button.addEventListener("click", () => {
      if (suggestion.command.endsWith(" ")) {
        thoughtCliInput.value = suggestion.command;
        thoughtCliInput.focus();
        return;
      }
      void executeCliCommand(suggestion.command);
    });
    return button;
  });

  thoughtCliSuggestions.replaceChildren(label, ...buttons);
};

function syncCliPanel() {
  renderCliTranscript();
  renderCliSuggestions();
  if (thoughtCliInput) {
    thoughtCliInput.disabled = cliCommandInFlight;
  }
  scheduleCliTranscriptScrollToBottom();
}

const initializeCliTranscript = () => {
  if (cliEntries.length) {
    return;
  }

  const intro = [
    "THOUGHT operator.",
    "",
    "one round on a model.",
    "prompt + THOUGHT.md in.",
    "canvas out.",
    "",
    "quick start:",
    "config",
    "prompt <text>",
    "run",
    "mint",
  ];

  appendCliEntry("intro", intro);
};

const focusCliInput = () => {
  if (document.activeElement === thoughtCliInput || thoughtCliInput.disabled) {
    return;
  }

  requestAnimationFrame(() => {
    thoughtCliInput.focus();
  });
};

const shouldRefocusCliFromClick = (target: EventTarget | null) => {
  if (frontpageStage.classList.contains("is-hidden") || !(target instanceof HTMLElement)) {
    return false;
  }

  const editableTarget = target.closest("input, textarea, select, [contenteditable='true']");
  return !editableTarget || editableTarget === thoughtCliInput;
};

const shouldRefocusCliFromKeyboard = (event: KeyboardEvent) => {
  if (
    frontpageStage.classList.contains("is-hidden") ||
    thoughtCliInput.disabled ||
    event.isComposing ||
    event.altKey ||
    event.ctrlKey ||
    event.metaKey
  ) {
    return false;
  }

  if (document.activeElement === thoughtCliInput) {
    return false;
  }

  const target = event.target;
  if (target instanceof HTMLElement) {
    const editableTarget = target.closest("input, textarea, select, [contenteditable='true']");
    if (editableTarget && editableTarget !== thoughtCliInput) {
      return false;
    }
  }

  if (mintFlowUiMode === "sheet" && mintFlowState !== "closed") {
    return false;
  }

  return event.key.length === 1 || event.key === "Backspace" || event.key === "ArrowUp" || event.key === "ArrowDown";
};

const focusCliInputFromKeyboard = (event: KeyboardEvent) => {
  thoughtCliInput.focus();

  if (event.key.length === 1) {
    event.preventDefault();
    setCliInputCommand(`${thoughtCliInput.value}${event.key}`);
    resetCliHistoryCursor();
    return;
  }

  if (event.key === "Backspace") {
    event.preventDefault();
    setCliInputCommand(thoughtCliInput.value.slice(0, -1));
    resetCliHistoryCursor();
    return;
  }

  if (event.key === "ArrowUp") {
    event.preventDefault();
    showPreviousCliCommand();
  } else if (event.key === "ArrowDown") {
    event.preventDefault();
    showNextCliCommand();
  }
};

const currentSpecLabel = () => activeThoughtSpec?.ref || getActiveThoughtInstructionsLabel();

const cliRouteLabel = (mode: Mode) => mode;

const cliProviderLabel = () => {
  if (sessionState.mode === "local") {
    return "ollama";
  }

  if (sessionState.mode === "connect") {
    return "openrouter";
  }

  return sessionState.direct.provider;
};

const cliAuthorizationState = () =>
  sessionState.connect.apiKey.trim() ? "linked" : "empty";

const cliApiKeyState = () =>
  sessionState.direct.apiKey.trim() ? "set" : "not set";

const formatCliAddress = (address: string) => shortHex(address, 6, 4);

const cliSpecStatus = () => {
  if (!activeThoughtSpec) {
    return {
      state: "missing",
      hint: "run blocked",
      ref: "n/a",
      hash: "n/a",
      shortHash: "n/a",
    };
  }

  return {
    state: "ready",
    hint: `spec ${activeThoughtSpec.ref}`,
    ref: activeThoughtSpec.ref,
    hash: activeThoughtSpec.specHash,
    shortHash: shortHex(activeThoughtSpec.specHash, 10, 8),
  };
};

const cliOutputStatus = () => {
  if (mintFlowState === "minted") {
    return {
      state: "minted",
      hint: "use: view THOUGHT",
    };
  }

  if (runState === "output_ready") {
    return {
      state: "ready",
      hint: "use: mint",
    };
  }

  if (runState === "running") {
    return {
      state: "running",
      hint: "",
    };
  }

  if (runState === "run_failed") {
    return {
      state: "failed",
      hint: "",
    };
  }

  return {
    state: "empty",
    hint: "",
  };
};

const cliCurrentMintState = () => {
  if (mintFlowState === "closed") {
    return runState === "output_ready" ? "ready" : "idle";
  }
  if (mintFlowState === "wallet_required") {
    return "needs wallet";
  }
  if (mintFlowState === "path_required" || mintFlowState === "path_checking") {
    return "needs $PATH";
  }
  if (mintFlowState === "path_ready" || mintFlowState === "authorizing") {
    return "needs authorization";
  }
  if (mintFlowState === "authorized") {
    return "authorized";
  }
  if (mintFlowState === "minting") {
    return "confirming";
  }
  if (mintFlowState === "minted") {
    return "minted";
  }
  if (mintFlowState === "text_taken") {
    return "already minted";
  }
  if (mintFlowState === "error") {
    return "failed";
  }
  return "idle";
};

const cliPromptState = () => sessionState.prompt.trim() ? "set" : "empty";

const cliPathState = () => {
  const path = mintFlowData.pathId?.toString() ?? mintFlowData.pathIdInput.trim();
  return path || "empty";
};

const buildCliCurrentLines = () => {
  const provenance = getProvenanceSummary();
  const output = cliOutputStatus();
  const spec = cliSpecStatus();
  const tokenId = walletState.mintedTokenId ?? mintFlowData.existingTokenId;

  const lines = [
    "current:",
    `route: ${cliRouteLabel(sessionState.mode)}`,
    `provider: ${cliProviderLabel()}`,
  ];

  if (sessionState.mode === "connect") {
    lines.push(`authorization: ${cliAuthorizationState()}`);
  }
  if (sessionState.mode === "direct") {
    lines.push(`api key: ${cliApiKeyState()}`);
  }
  if (sessionState.mode === "local") {
    lines.push(`status: ${sessionState.local.available === false ? "ollama not detected" : "ollama detected"}`);
  }

  lines.push(
    `engine: ${getCurrentModelValue().trim() || "empty"}`,
    `prompt: ${cliPromptState()}`,
    `THOUGHT.md: ${spec.state}`,
    `wallet: ${walletState.address ? "connected" : "disconnected"}`,
    `output: ${output.state}`,
    `provenance: ${provenance ? `${provenance.bytes}/${MAX_PROVENANCE_BYTES} bytes. ~${formatCount(MINT_GAS_ESTIMATE)} gas.` : "empty"}`,
  );

  if (output.state !== "empty" || mintFlowState !== "closed") {
    lines.push(`$PATH: ${cliPathState()}`, `mint: ${cliCurrentMintState()}`);
  }
  if (output.state === "minted" && tokenId !== null) {
    lines.push(`THOUGHT #${tokenId}`);
  }
  if (walletState.txHash) {
    lines.push(`tx: ${walletState.txHash}`);
  }

  return lines;
};

const listModelsForCli = () => {
  const options = getModelOptions(getCurrentModelSourceId());
  if (!options.length) {
    return ["engine list unavailable."];
  }

  return [
    "engines:",
    ...options.slice(0, 8).map((option) => option.id),
    "",
    "use: config engine <id>",
  ];
};

const setCliModel = (modelId: string) => {
  const options = getModelOptions(getCurrentModelSourceId());
  if (!modelId || modelId.toLowerCase() === "help") {
    appendCliOutput([
      `engine: ${getCurrentModelValue().trim() || "empty"}`,
      `route: ${sessionState.mode}`,
      "use: config engine list",
      "use: config engine <id>",
      "alias: model -> config engine",
    ]);
    return;
  }

  if (!options.some((option) => option.id === modelId)) {
    appendCliError(["engine not found.", "use: config engine list"]);
    return;
  }

  resetMintRuntimeState();
  setCurrentModelValue(modelId);
  writeSessionState();
  syncInterface();
  appendCliOutput(["engine set.", `engine: ${modelId}`, "use: run"]);
};

const setCliProvider = (providerId: string) => {
  if (!providerId || providerId.toLowerCase() === "help") {
    const lines = [
      `provider: ${sessionState.direct.provider}`,
      "route: direct",
      "use: config provider <openai|openrouter|anthropic>",
    ];
    if (sessionState.mode !== "direct") {
      lines.push("note: provider is used by config direct.");
    }
    appendCliOutput(lines);
    return;
  }

  if (!isDirectProviderId(providerId)) {
    appendCliError(["provider not found.", "use: config provider <openai|openrouter|anthropic>"]);
    return;
  }

  resetMintRuntimeState();
  sessionState.mode = "direct";
  sessionState.direct.provider = providerId;
  sessionState.direct.apiKey = "";
  sessionState.direct.model = DIRECT_PROVIDERS[providerId].defaultModel;
  writeSessionState();
  syncInterface();
  void refreshCurrentModels({ silent: true });
  appendCliOutput(["provider set.", `provider: ${providerId}`, "route: direct", "use: config key <api-key>"]);
};

const setCliApiKey = (keyInput: string) => {
  const key = keyInput.trim();
  if (!key || key.toLowerCase() === "help") {
    const lines = [
      `api key: ${cliApiKeyState()}`,
      "policy: session only.",
      "use: config key <api-key>",
    ];
    if (sessionState.direct.apiKey.trim()) {
      lines.push("clear: config key clear");
    }
    appendCliOutput(lines);
    return;
  }

  if (key.toLowerCase() === "clear") {
    sessionState.direct.apiKey = "";
    writeSessionState();
    syncInterface();
    appendCliOutput(["api key cleared.", "use: config key <api-key>"]);
    return;
  }

  resetMintRuntimeState();
  sessionState.mode = "direct";
  sessionState.direct.apiKey = key;
  writeSessionState();
  syncInterface();
  appendCliOutput(["api key set.", "policy: session only.", "use: run"]);
};

const formatCliTextValue = (value: string) => JSON.stringify(value);

const setCliPrompt = (promptInput: string) => {
  const prompt = promptInput.trim();
  if (!prompt || prompt.toLowerCase() === "help") {
    const currentPrompt = sessionState.prompt.trim();
    appendCliOutput([
      `prompt: ${currentPrompt ? formatCliTextValue(currentPrompt) : "empty"}`,
      "use: prompt <text>",
      "clear: prompt clear",
    ]);
    return;
  }

  if (prompt.toLowerCase() === "clear") {
    resetMintRuntimeState();
    sessionState.prompt = "";
    writeSessionState();
    syncInterface();
    appendCliOutput(["prompt cleared.", "next: prompt <text>"]);
    return;
  }

  resetMintRuntimeState();
  sessionState.prompt = promptInput.trim();
  writeSessionState();
  syncInterface();
  appendCliOutput(["prompt set.", "next: run"]);
};

const outputCliMode = async (mode: Mode | "") => {
  if (!mode) {
    appendCliOutput(["use: config", "alias: mode -> config route"]);
    return;
  }

  setMode(mode);
  await refreshCurrentModels({ silent: true });
  const lines =
    mode === "local"
      ? [
          "route: local",
          "runs on this machine.",
          `status: ${sessionState.local.available === false ? "ollama not detected" : "ollama detected"}`,
          "use:",
          "config engine list",
          "config engine <id>",
          "run",
          "config connect",
          "config direct",
        ]
      : mode === "connect"
        ? [
            "route: connect",
            "delegated cloud access.",
            "provider: openrouter",
            `authorization: ${sessionState.connect.apiKey.trim() ? "linked" : "empty"}`,
            "use:",
            "config connect openrouter",
            "config disconnect openrouter",
            "config engine list",
            "config engine <id>",
            "run",
          ]
        : [
            "route: direct",
            "raw provider key. session only.",
            `provider: ${sessionState.direct.provider}`,
            `api key: ${cliApiKeyState()}`,
            "use:",
            "config provider <id>",
            "config key <api-key>",
            "config key clear",
            "config engine list",
            "config engine <id>",
            "run",
          ];
  appendCliOutput(lines.filter(Boolean));
};

const outputCliConfigSummary = () => {
  const lines = [
    "config sets the route and engine for one round.",
    "",
    `route: ${sessionState.mode}`,
  ];

  if (sessionState.mode === "local") {
    lines.push(
      "provider: ollama",
      `status: ${sessionState.local.available === false ? "ollama not detected" : "ollama detected"}`,
      `engine: ${getCurrentModelValue().trim() || "empty"}`,
    );
  } else if (sessionState.mode === "connect") {
    lines.push(
      `engine: ${getCurrentModelValue().trim() || "empty"}`,
      "provider: openrouter",
      `authorization: ${cliAuthorizationState()}`,
    );
  } else {
    lines.push(
      `provider: ${sessionState.direct.provider}`,
      `api key: ${cliApiKeyState()}`,
      `engine: ${getCurrentModelValue().trim() || "empty"}`,
    );
  }

  lines.push(
    "",
    "routes:",
    "local     runs on this machine.",
    "connect   delegated cloud access.",
    "direct    raw provider key. session only.",
    "",
    "use:",
    "config local",
    "config connect",
    "config direct",
    "config engine list",
    "config engine <id>",
  );

  if (sessionState.mode === "connect" && !sessionState.connect.apiKey.trim()) {
    lines.push("config connect openrouter");
  }
  if (sessionState.mode === "connect" && sessionState.connect.apiKey.trim()) {
    lines.push("config disconnect openrouter");
  }
  if (sessionState.mode === "direct") {
    lines.push("config provider <id>");
    if (!sessionState.direct.apiKey.trim()) {
      lines.push("config key <api-key>");
    } else {
      lines.push("config key clear");
    }
  }

  appendCliOutput(lines);
};

const startOpenRouterConnectFromCli = async () => {
  if (sessionState.mode !== "connect") {
    setMode("connect");
  }
  if (sessionState.connect.apiKey.trim()) {
    appendCliOutput(["openrouter linked.", "route: connect", "use: run"]);
    return;
  }
  if (!isOpenRouterConnectSupported()) {
    appendCliError([getOpenRouterConnectConstraintMessage(), "use: config direct"]);
    return;
  }

  appendCliOutput("opening openrouter...");
  await startOpenRouterConnect();
};

const outputCliConfig = async (configInput: string) => {
  const [head = ""] = configInput.trim().split(/\s+/, 1);
  const rest = configInput.trim().slice(head.length).trim();
  const lowerHead = head.toLowerCase();
  const lowerRest = rest.toLowerCase();

  if (!lowerHead || lowerHead === "help") {
    outputCliConfigSummary();
    return;
  }

  if (lowerHead === "local" || lowerHead === "direct") {
    await outputCliMode(lowerHead);
    return;
  }

  if (lowerHead === "connect") {
    if (!lowerRest) {
      await outputCliMode("connect");
      return;
    }
    if (lowerRest === "openrouter") {
      await startOpenRouterConnectFromCli();
      return;
    }
  }

  if (lowerHead === "disconnect" && lowerRest === "openrouter") {
    disconnectOpenRouter();
    appendCliOutput(["openrouter unlinked.", "use: config connect openrouter"]);
    return;
  }

  if (lowerHead === "engine") {
    if (!lowerRest || lowerRest === "help") {
      setCliModel("");
      return;
    }
    if (lowerRest === "list") {
      await refreshCurrentModels({ silent: true });
      appendCliOutput(listModelsForCli());
      return;
    }
    setCliModel(rest);
    return;
  }

  if (lowerHead === "provider") {
    setCliProvider(lowerRest);
    return;
  }

  if (lowerHead === "key") {
    setCliApiKey(rest);
    return;
  }

  appendCliError(["config option not found.", "use: config"]);
};

const outputCliProvenance = async (json = false) => {
  if (!currentOutputText) {
    appendCliError(["no THOUGHT ready.", "next: run"]);
    return;
  }

  try {
    await ensureActiveThoughtSpec();
    const provenance = getProvenanceSummary();
    if (!provenance) {
      throw new Error("provenance unavailable.");
    }

    if (json && IS_DEV_MODE) {
      appendCliOutput(["provenance --json", formatProvenanceJson(provenance.json)]);
      return;
    }

    appendCliOutput([
      "provenance",
      "schema: thought.provenance.v1",
      `spec: ${currentSpecLabel()}`,
      `bytes: ${provenance.bytes}/${MAX_PROVENANCE_BYTES}`,
      `gas: ~${formatCount(MINT_GAS_ESTIMATE)}`,
    ]);
  } catch (error) {
    appendCliError([formatThoughtSpecError(error), "next: current"]);
  }
};

const isThoughtInstructionsCommand = (commandHead: string) =>
  commandHead === "thought" || commandHead === "thought.md";

const thoughtInstructionsUsageLines = (
  state: "available" | "unavailable",
  errorMessage = "",
) => [
  `THOUGHT.md ${state === "available" ? "ready." : "unavailable."}`,
  ...(state === "available" && activeThoughtSpec ? [`spec: ${activeThoughtSpec.ref}`] : []),
  ...(errorMessage ? [`error: ${errorMessage}`] : []),
  "use: THOUGHT.md text",
];

const outputCliThoughtInstructions = async (topic: string) => {
  try {
    await ensureActiveThoughtSpec();
    syncThoughtInstructionsControls();
  } catch (error) {
    appendCliOutput(
      thoughtInstructionsUsageLines(
        "unavailable",
        formatThoughtSpecError(error),
      ),
    );
    return;
  }

  const normalizedTopic = topic.trim().toLowerCase();
  const text = getActiveThoughtInstructions().trim();
  const label = getActiveThoughtInstructionsLabel();

  if (normalizedTopic === "text" || normalizedTopic === "show" || normalizedTopic === "cat") {
    appendCliOutput([`THOUGHT.md: ${label}`, ...text.split(/\r?\n/)]);
    return;
  }

  appendCliOutput(thoughtInstructionsUsageLines("available"));
};

const runFromCli = async () => {
  if (!sessionState.prompt.trim()) {
    appendCliError(["run failed.", "prompt empty.", "next: prompt <text>"]);
    return;
  }

  if (!getCurrentModelValue().trim()) {
    appendCliError(["run failed.", "engine empty.", "use: config engine list"]);
    return;
  }

  if (sessionState.mode === "connect" && !sessionState.connect.apiKey.trim()) {
    appendCliError(["run failed.", "openrouter not linked.", "use: config connect openrouter"]);
    return;
  }

  if (sessionState.mode === "direct" && !sessionState.direct.apiKey.trim()) {
    appendCliError(["run failed.", "api key not set.", "use: config key <api-key>"]);
    return;
  }

  if (sessionState.mode === "local") {
    await refreshCurrentModels({ silent: true });
    if (sessionState.local.available === false) {
      appendCliError(["run failed.", "ollama not detected.", "use: config connect"]);
      return;
    }
  }

  appendCliOutput([
    "running...",
    "one round on a model.",
    "prompt + THOUGHT.md in.",
    "canvas out.",
  ]);
  await runAgent();

  if (runState === "output_ready") {
    const provenance = getProvenanceSummary();
    appendCliOutput([
      "canvas ready.",
      provenance
        ? `provenance ${provenance.bytes}/${MAX_PROVENANCE_BYTES} bytes. ~${formatCount(MINT_GAS_ESTIMATE)} gas.`
        : "provenance ready.",
      "use: mint",
    ]);
    return;
  }

  appendCliError(panelWarningMessage ? ["run failed.", panelWarningMessage] : ["run failed."]);
};

const switchMintFlowToCli = () => {
  if (mintFlowUiMode === "cli") {
    return;
  }

  mintFlowUiMode = "cli";
  syncInterface();
};

const selectedCliPathId = () =>
  mintFlowData.pathId?.toString() ?? mintFlowData.pathIdInput.trim();

const buildCliMintStateLines = () => {
  const pathId = selectedCliPathId();

  if (mintFlowState === "thought_checking") {
    return ["checking THOUGHT..."];
  }
  if (mintFlowState === "wallet_required") {
    return ["wallet disconnected.", "use: wallet connect"];
  }
  if (mintFlowState === "path_required") {
    return [
      walletState.address ? `wallet linked: ${formatCliAddress(walletState.address)}` : "wallet linked.",
      "select $PATH.",
      "use: path <id>",
      "use: mint-path",
    ];
  }
  if (mintFlowState === "path_checking") {
    return [`checking $PATH #${pathId || "?"}...`];
  }
  if (mintFlowState === "path_ready") {
    return [`$PATH #${pathId || "?"} ready.`, "use: authorize"];
  }
  if (mintFlowState === "authorizing") {
    return ["signing authorization..."];
  }
  if (mintFlowState === "authorized") {
    return [`$PATH #${pathId || "?"} authorized.`, "use: confirm"];
  }
  if (mintFlowState === "minting") {
    return ["confirming mint..."];
  }
  if (mintFlowState === "minted") {
    return ["minted.", "use: view tx", "use: view THOUGHT"];
  }
  if (mintFlowState === "text_taken") {
    const token = mintFlowData.existingTokenId;
    return [token ? `THOUGHT #${token} already minted.` : "THOUGHT already minted.", "use: view THOUGHT"];
  }
  if (mintFlowState === "error") {
    return [mintFlowData.error || "mint unavailable.", "use: current"];
  }

  return [];
};

const appendCliMintState = () => {
  const lines = buildCliMintStateLines();
  if (!lines.length) {
    return;
  }

  if (mintFlowState === "error") {
    appendCliError(lines);
    return;
  }

  appendCliOutput(lines);
};

const startCliMint = async () => {
  if (!currentOutputText) {
    appendCliError(["nothing to mint.", "use: run"]);
    return;
  }

  appendCliOutput([
    "mint THOUGHT.",
    "one THOUGHT needs one $PATH.",
    "select $PATH · authorize · confirm.",
  ]);
  await openMintSheet("cli");
  appendCliMintState();
};

const ensureCliMintFlow = async () => {
  if (mintFlowState !== "closed") {
    switchMintFlowToCli();
    return true;
  }

  if (!currentOutputText) {
    appendCliError(["nothing to mint.", "use: run"]);
    return false;
  }

  await openMintSheet("cli");
  return mintFlowState !== "closed";
};

const checkCliPath = async (pathInput: string) => {
  if (!await ensureCliMintFlow()) {
    return;
  }

  if (!pathInput.trim()) {
    appendCliError(["enter a $PATH #.", "use: path <id>", "use: mint-path"]);
    return;
  }

  mintFlowData.pathIdInput = pathInput.trim();
  mintFlowData.pathId = parsePathTokenId(pathInput);
  appendCliOutput(`checking $PATH #${pathInput.trim()}...`);
  await checkPathEligibility();

  if (mintFlowState === "path_ready") {
    appendCliOutput([`$PATH #${mintFlowData.pathId?.toString() ?? pathInput.trim()} ready.`, "use: authorize"]);
  } else if (mintFlowState === "wallet_required") {
    appendCliError(["wallet disconnected.", "use: wallet connect"]);
  } else if (mintFlowState === "error") {
    appendCliError([mintFlowData.error || `$PATH #${pathInput.trim()} not available.`, "use: path <id>", "use: mint-path"]);
  }
};

const authorizeFromCli = async () => {
  if (!await ensureCliMintFlow()) {
    return;
  }

  if (mintFlowState !== "path_ready") {
    appendCliError(mintFlowState === "authorized" ? ["authorized.", "use: confirm"] : ["not ready.", "use: path <id>"]);
    return;
  }

  appendCliOutput("sign in wallet...");
  await authorizeMint();
  const state = mintFlowState as MintFlowState;
  if (state === "authorized") {
    appendCliOutput(["authorized.", "use: confirm"]);
  } else if (state === "error") {
    appendCliError([mintFlowData.error || "authorization failed.", "use: path <id>"]);
  }
};

const confirmFromCli = async () => {
  if (!await ensureCliMintFlow()) {
    return;
  }

  if (mintFlowState !== "authorized") {
    appendCliError(["not authorized.", "use: authorize"]);
    return;
  }

  appendCliOutput("confirm in wallet...");
  await confirmMint();
  const state = mintFlowState as MintFlowState;
  if (state === "minted") {
    appendCliOutput(["minted.", "use: view tx", "use: view THOUGHT"]);
  } else if (state === "error") {
    appendCliError([mintFlowData.error || "mint failed.", "use: current"]);
  }
};

const connectWalletFromCli = async () => {
  const mintFlowWasActive = mintFlowState !== "closed";
  if (mintFlowWasActive) {
    switchMintFlowToCli();
  }

  appendCliOutput("connecting wallet...");
  await requestWalletConnect();

  if (mintFlowWasActive && walletState.address && mintFlowState === "wallet_required") {
    mintFlowState = "path_required";
    mintFlowData.error = "";
    mintFlowData.errorKind = "none";
  }

  if (mintFlowState !== "closed") {
    switchMintFlowToCli();
    syncInterface();
    appendCliMintState();
    return;
  }

  appendCliOutput(walletState.address ? ["wallet linked.", "use: mint"] : ["wallet disconnected.", "use: wallet connect"]);
};

const outputCliWalletUsage = () => {
  appendCliOutput([
    "wallet is used for $PATH and minting.",
    `wallet: ${walletState.address ? `linked ${formatCliAddress(walletState.address)}` : "disconnected"}`,
    "use: wallet connect",
    "clear: wallet disconnect",
  ]);
};

const disconnectWalletFromCli = () => {
  walletState.address = "";
  walletState.chainId = null;
  walletState.menuOpen = false;
  resetMintRuntimeState();
  syncInterface();
  appendCliOutput(["wallet unlinked.", "use: wallet connect"]);
};

const cliCommandsHelpLines = () => [
  "commands:",
  "config",
  "config local | connect | direct",
  "config connect openrouter",
  "config disconnect openrouter",
  "config provider <id>",
  "config key <api-key>",
  "config key clear",
  "config engine list",
  "config engine <id>",
  "",
  "prompt <text>",
  "prompt clear",
  "THOUGHT.md",
  "THOUGHT.md text",
  "",
  "run",
  "rerun",
  "retry run",
  "",
  "mint",
  "path <id>",
  "authorize",
  "confirm",
  "wallet connect",
  "wallet disconnect",
  "mint-path",
  "",
  "current",
  "provenance",
  "provenance --json",
  "gallery",
  "view tx",
  "view THOUGHT",
  "clear",
  "reset",
  "help",
  "commands",
];

const cliHelpLines = (topic = "") => {
  const normalizedTopic = topic.trim().toLowerCase();

  if (!normalizedTopic) {
    return [
      "THOUGHT takes a prompt and THOUGHT.md,",
      "runs one round on the selected engine,",
      "then renders the returned text to canvas.",
      "",
      "flow:",
      "config    choose route + engine",
      "prompt    write intention",
      "run       make canvas",
      "mint      keep it onchain",
      "",
      "try:",
      "config",
      "prompt <text>",
      "run",
      "",
      "more:",
      "help config",
      "help prompt",
      "help run",
      "help mint",
      "commands",
      "current",
    ];
  }

  if (normalizedTopic === "commands") {
    return cliCommandsHelpLines();
  }

  if (normalizedTopic === "flow") {
    return [
      "flow:",
      "1 config",
      "  choose how THOUGHT reaches a model.",
      "",
      "2 prompt",
      "  set the user intention.",
      "",
      "3 run",
      "  one round only.",
      "  prompt + THOUGHT.md in.",
      "  canvas out.",
      "",
      "4 mint",
      "  one THOUGHT needs one $PATH.",
      "  select $PATH · authorize · confirm",
    ];
  }

  if (normalizedTopic === "config") {
    return [
      "config sets the route and engine for one round.",
      "",
      "route is how THOUGHT reaches the engine.",
      "engine is the selected model/runtime.",
      "",
      "use:",
      "config",
      "config local",
      "config connect",
      "config direct",
      "config engine list",
      "config engine <id>",
      "current",
    ];
  }

  if (normalizedTopic === "mode") {
    return ["use: config", "alias: mode -> config route"];
  }

  if (normalizedTopic === "model") {
    return [
      `engine: ${getCurrentModelValue().trim() || "empty"}`,
      "use: config engine list",
      "use: config engine <id>",
      "alias: model -> config engine",
    ];
  }

  if (normalizedTopic === "prompt") {
    return [
      "prompt sets the user intention for one round.",
      "",
      "use:",
      "prompt <text>",
      "prompt clear",
      "",
      "flow:",
      "config",
      "prompt <text>",
      "run",
      "mint",
    ];
  }

  if (normalizedTopic === "thought.md" || normalizedTopic === "thought") {
    return [
      "THOUGHT.md is the generation spec.",
      "",
      "prompt + THOUGHT.md in.",
      "canvas out.",
      "",
      "use:",
      "THOUGHT.md",
      "THOUGHT.md text",
    ];
  }

  if (normalizedTopic === "run") {
    return [
      "run sends prompt + THOUGHT.md to the selected engine.",
      "",
      "one round only.",
      "canvas out.",
      "",
      "use:",
      "run",
      "rerun",
      "retry run",
    ];
  }

  if (normalizedTopic === "provenance") {
    return [
      "provenance records the run context.",
      "",
      "prompt, engine, THOUGHT.md,",
      "route, hashes, and mint context.",
      "",
      "it is a record, not proof.",
      "",
      "use:",
      "provenance",
      "provenance --json",
    ];
  }

  if (normalizedTopic === "mint") {
    return [
      "mint keeps the current THOUGHT.",
      "",
      "one THOUGHT needs one $PATH.",
      "select $PATH · authorize · confirm",
      "",
      "use:",
      "mint",
      "path <id>",
      "authorize",
      "confirm",
      "",
      "need $PATH:",
      "mint-path",
    ];
  }

  if (normalizedTopic === "wallet") {
    return [
      "wallet is used for minting.",
      "",
      "connect it when you keep a THOUGHT.",
      "",
      "use:",
      "wallet connect",
      "wallet disconnect",
      "mint",
    ];
  }

  if (normalizedTopic === "direct") {
    return [
      "direct uses a raw provider key.",
      "",
      "session only.",
      "never printed.",
      "not stored by THOUGHT.",
      "",
      "use:",
      "config direct",
      "config provider <id>",
      "config key <api-key>",
      "config key clear",
    ];
  }

  if (normalizedTopic === "connect") {
    return [
      "connect uses openrouter authorization.",
      "",
      "no raw key paste.",
      "revocable.",
      "cloud engine route.",
      "",
      "use:",
      "config connect",
      "config connect openrouter",
      "config disconnect openrouter",
    ];
  }

  if (normalizedTopic === "local") {
    return [
      "local uses ollama on this machine.",
      "",
      "no cloud call.",
      "no api key.",
      "",
      "use:",
      "config local",
      "config engine list",
      "run",
    ];
  }

  return ["unknown help topic.", "use: help", "use: commands"];
};

const executeCliCommand = async (rawCommand: string) => {
  const command = rawCommand.trim();
  if (!command || cliCommandInFlight) {
    return;
  }

  recordCliCommandHistory(command);
  appendCliCommand(command);
  cliCommandInFlight = true;
  syncCliPanel();

  try {
    const [head = "", second = ""] = command.split(/\s+/, 2);
    const rest = command.slice(head.length).trim();
    const lowerHead = head.toLowerCase();
    const lowerRest = rest.toLowerCase();
    cliSuggestionContext = "auto";

    if (command === "?" || command === "--help" || lowerHead === "help") {
      appendCliOutput(cliHelpLines(lowerRest));
      cliSuggestionContext = "help";
    } else if (lowerHead === "commands") {
      appendCliOutput(cliCommandsHelpLines());
      cliSuggestionContext = "help";
    } else if (lowerHead === "current" || lowerHead === "status") {
      appendCliOutput(buildCliCurrentLines());
      cliSuggestionContext = "current";
    } else if (lowerHead === "clear") {
      cliEntries.length = 0;
      initializeCliTranscript();
    } else if (lowerHead === "reset") {
      resetThought();
      appendCliOutput(["reset.", "next: prompt <text>"]);
    } else if (lowerHead === "gallery") {
      appendCliOutput("opening gallery...");
      window.location.href = galleryUrl();
    } else if (lowerHead === "config") {
      await outputCliConfig(rest);
      cliSuggestionContext = "config";
    } else if (lowerHead === "mode") {
      const mode = lowerRest as Mode | "";
      if (!lowerRest || lowerRest === "help") {
        await outputCliMode("");
      } else if (mode && !isMode(mode)) {
        appendCliError(["route not found.", "use: config local | connect | direct"]);
      } else {
        await outputCliMode(mode);
      }
    } else if (lowerHead === "connect" && (!rest || lowerRest === "openrouter")) {
      await startOpenRouterConnectFromCli();
    } else if (lowerHead === "disconnect" && (!rest || lowerRest === "openrouter")) {
      disconnectOpenRouter();
      appendCliOutput("openrouter unlinked.");
    } else if (lowerHead === "provider") {
      setCliProvider(lowerRest);
    } else if (lowerHead === "key") {
      setCliApiKey(rest);
    } else if (lowerHead === "models") {
      await refreshCurrentModels({ silent: true });
      appendCliOutput(listModelsForCli());
    } else if (lowerHead === "model") {
      if (lowerRest === "list") {
        await refreshCurrentModels({ silent: true });
        appendCliOutput(listModelsForCli());
      } else {
        setCliModel(rest);
      }
    } else if (lowerHead === "prompt") {
      setCliPrompt(rest);
    } else if (isThoughtInstructionsCommand(lowerHead)) {
      await outputCliThoughtInstructions(lowerRest);
    } else if (lowerHead === "run" || lowerHead === "rerun" || command.toLowerCase() === "retry run") {
      await runFromCli();
    } else if (lowerHead === "provenance") {
      await outputCliProvenance(lowerRest === "--json");
    } else if (lowerHead === "wallet") {
      if (lowerRest === "connect") {
        await connectWalletFromCli();
      } else if (lowerRest === "disconnect") {
        disconnectWalletFromCli();
      } else {
        outputCliWalletUsage();
      }
    } else if (lowerHead === "mint") {
      await startCliMint();
    } else if (lowerHead === "mint-path") {
      appendCliOutput("opening $PATH...");
      handleMintPath();
    } else if (lowerHead === "path") {
      await checkCliPath(rest);
    } else if (lowerHead === "authorize") {
      await authorizeFromCli();
    } else if (lowerHead === "confirm") {
      await confirmFromCli();
    } else if (lowerHead === "view" && second.toLowerCase() === "tx") {
      appendCliOutput("opening tx...");
      await handleViewTx();
    } else if (lowerHead === "view" && second.toLowerCase() === "thought") {
      appendCliOutput("opening THOUGHT...");
      await handleViewThought(walletState.mintedTokenId ?? mintFlowData.existingTokenId);
    } else {
      appendCliError(["unknown command.", "use: help"]);
    }
  } finally {
    cliCommandInFlight = false;
    syncInterface();
    focusCliInput();
  }
};

thoughtCliForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const command = thoughtCliInput.value;
  thoughtCliInput.value = "";
  void executeCliCommand(command);
  focusCliInput();
});

thoughtCliInput.addEventListener("keydown", (event) => {
  if (
    event.ctrlKey &&
    !event.altKey &&
    !event.metaKey &&
    !event.shiftKey &&
    event.key.toLowerCase() === "c" &&
    thoughtCliInput.value
  ) {
    event.preventDefault();
    thoughtCliInput.value = "";
    resetCliHistoryCursor();
    return;
  }

  if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) {
    return;
  }

  if (event.key === "ArrowUp") {
    event.preventDefault();
    showPreviousCliCommand();
  } else if (event.key === "ArrowDown") {
    event.preventDefault();
    showNextCliCommand();
  }
});

thoughtCliInput.addEventListener("input", () => {
  if (cliHistoryIndex !== null) {
    resetCliHistoryCursor();
  }
});

thoughtCliTranscript.addEventListener("scroll", () => {
  revealCliScrollbar();
});

frontpageShell.addEventListener("click", (event) => {
  if (shouldRefocusCliFromClick(event.target)) {
    focusCliInput();
  }
});

document.addEventListener("keydown", (event) => {
  if (shouldRefocusCliFromKeyboard(event)) {
    focusCliInputFromKeyboard(event);
  }
});

modeConnectButton.addEventListener("click", () => {
  setMode("connect");
});

modeDirectButton.addEventListener("click", () => {
  setMode("direct");
});

modeLocalButton.addEventListener("click", () => {
  setMode("local");
});

providerBox.addEventListener("change", () => {
  if (!isDirectProviderId(providerBox.value)) {
    return;
  }

  resetMintRuntimeState();
  sessionState.direct.provider = providerBox.value;
  sessionState.direct.apiKey = "";
  sessionState.direct.model = DIRECT_PROVIDERS[providerBox.value].defaultModel;
  writeSessionState();
  syncInterface();
  void refreshCurrentModels({ silent: true });
  setWarning("");
  setStatus("");
});

apiKeyBox.addEventListener("input", () => {
  sessionState.direct.apiKey = apiKeyBox.value.trim();
  writeSessionState();
  setWarning("");
});

modelBox.addEventListener("change", () => {
  syncManualModelField();
  resetMintRuntimeState();

  if (modelBox.value === MANUAL_MODEL_VALUE) {
    modelManualBox.focus();
  }

  setCurrentModelValue(getSelectedModelValue());
  modelBox.title = getSelectedModelValue();
  writeSessionState();
  setWarning("");
});

modelManualBox.addEventListener("input", () => {
  resetMintRuntimeState();
  setCurrentModelValue(modelManualBox.value.trim());
  modelManualBox.title = modelManualBox.value.trim();
  writeSessionState();
  setWarning("");
});

promptBox.addEventListener("input", () => {
  resetMintRuntimeState();
  sessionState.prompt = promptBox.value;
  writeSessionState();
  setWarning("");
});

promptBox.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && !event.isComposing) {
    event.preventDefault();
    void runAgent();
  }
});

uploadThoughtFileButton.addEventListener("click", () => {
  thoughtFileInput.click();
});

thoughtFileInput.addEventListener("change", () => {
  void handleThoughtFileSelection();
});

clearThoughtFileButton.addEventListener("click", () => {
  setThoughtInstructionsOverride(null);
  setWarning("");
  setStatus(`using ${getActiveThoughtInstructionsLabel()}.`, { flashMs: NOTICE_FLASH_MS });
});

mintSheetClose.addEventListener("click", () => {
  closeMintSheet();
});

mintSheetBackdrop.addEventListener("click", () => {
  closeMintSheet();
});

mintSheetPathBox.addEventListener("input", () => {
  const value = mintSheetPathBox.value.trim();
  mintFlowData.pathIdInput = value;
  mintFlowData.pathId = parsePathTokenId(value);
  mintFlowData.error = "";
  mintFlowData.errorKind = "none";
  clearMintAuthorization();
  if (mintFlowState !== "closed") {
    mintFlowState = "path_required";
  }
  syncInterface();
});

mintSheetPathBox.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && !event.isComposing) {
    event.preventDefault();
    void handleMintSheetAction(mintSheetPrimaryAction);
  }
});

mintSheetPrimary.addEventListener("click", () => {
  void handleMintSheetAction(mintSheetPrimaryAction);
});

mintSheetSecondary.addEventListener("click", () => {
  void handleMintSheetAction(mintSheetSecondaryAction);
});

mintSheetTertiary.addEventListener("click", () => {
  void handleMintSheetAction(mintSheetTertiaryAction);
});

thoughtDebugToggle.addEventListener("click", () => {
  debugState.open = !debugState.open;
  syncDebugPanel();
});

thoughtDebugEnabled.addEventListener("change", () => {
  debugState.enabled = thoughtDebugEnabled.checked;
  syncInterface();
});

thoughtDebugReset.addEventListener("click", () => {
  debugState = { ...DEFAULT_DEBUG_STATE };
  syncInterface();
});

thoughtDebugCta.addEventListener("change", () => {
  debugState.cta = thoughtDebugCta.value as ThoughtDebugCtaOverride;
  debugState.ctaStatus = "auto";
  debugState.warning = "auto";
  syncInterface();
});

thoughtDebugCtaStatus.addEventListener("change", () => {
  debugState.ctaStatus = thoughtDebugCtaStatus.value as ThoughtDebugCtaStatusOverride;
  debugState.warning = "auto";
  syncInterface();
});

thoughtDebugWarning.addEventListener("change", () => {
  debugState.warning = thoughtDebugWarning.value as ThoughtDebugWarningOverride;
  syncInterface();
});

connectOpenRouterButton.addEventListener("click", () => {
  connectOpenRouterButton.disabled = true;
  setWarning("");
  setStatus("opening openrouter...");

  void startOpenRouterConnect().catch((error) => {
    const message = error instanceof Error ? error.message : "openrouter connect failed.";
    connectOpenRouterButton.disabled = false;
    setWarning(message);
    setStatus("failed.");
  });
});

disconnectOpenRouterButton.addEventListener("click", () => {
  disconnectOpenRouter();
});

mintWalletToggle.addEventListener("click", () => {
  if (mintWalletToggle.classList.contains("is-hidden")) {
    return;
  }

  walletState.menuOpen = !walletState.menuOpen;
  syncWalletMenu();
});

mintWalletCopyAddress.addEventListener("click", () => {
  void copyToClipboard(walletState.address).then((copied) => {
    if (copied) {
      walletState.menuOpen = false;
      syncWalletMenu();
      setStatus("address copied.", { flashMs: NOTICE_FLASH_MS });
    }
  });
});

mintWalletCopyTx.addEventListener("click", () => {
  void handlePendingTx().then(() => {
    walletState.menuOpen = false;
    syncWalletMenu();
  });
});

mintWalletRefresh.addEventListener("click", () => {
  void refreshWalletState().then(() => {
    syncInterface();
    setStatus("wallet refreshed.", { flashMs: NOTICE_FLASH_MS });
  });
});

runAgentButton.addEventListener("click", () => {
  void runAgent();
});

resetThoughtButton.addEventListener("click", () => {
  if (isDebugCtaOverrideActive()) {
    setStatus("debug action only.", { flashMs: NOTICE_FLASH_MS });
    return;
  }

  if (secondaryActionState === "reset") {
    resetThought();
    return;
  }

  if (secondaryActionState === "view_tx") {
    void handleViewTx();
    return;
  }

  if (secondaryActionState === "view_thought") {
    void handleViewThought(walletState.mintedTokenId);
  }
});

const handleViewportResize = () => {
  syncOutputToCanvas(currentOutputText, { suppressWarning: true });
};

window.addEventListener("resize", handleViewportResize);
window.visualViewport?.addEventListener("resize", handleViewportResize);
window.addEventListener("beforeunload", revokeThoughtInstructionsObjectUrl);
window.addEventListener("focus", () => {
  const canSoftRefresh =
    mintFlowState === "path_required" ||
    mintFlowState === "path_ready" ||
    (mintFlowState === "error" && isPathRecoveryError());

  if (
    !canSoftRefresh ||
    !walletState.address ||
    !canContinueWithPathInput() ||
    Date.now() - lastMintSheetFocusRefreshAt < 8000
  ) {
    return;
  }

  lastMintSheetFocusRefreshAt = Date.now();
  void refreshMintSheetPath();
});
document.addEventListener("mousedown", (event) => {
  if (!walletState.menuOpen) {
    return;
  }

  const target = event.target;
  if (!(target instanceof Node)) {
    return;
  }

  if (mintWalletToggle.contains(target) || mintWalletMenu.contains(target)) {
    return;
  }

  walletState.menuOpen = false;
  syncWalletMenu();
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && mintFlowState !== "closed") {
    closeMintSheet();
  }
});

const initFrontpage = async () => {
  configureGalleryLink();
  document.title = IS_GALLERY_PAGE ? "Gallery" : IS_THOUGHT_PAGE ? "THOUGHT" : "THOUGHT";

  if (IS_GALLERY_PAGE) {
    frontpageStage.classList.add("is-hidden");
    galleryPage.classList.remove("is-hidden");
    thoughtPage.classList.add("is-hidden");
    await loadThoughtGallery();
    return;
  }

  if (IS_THOUGHT_PAGE) {
    frontpageStage.classList.add("is-hidden");
    galleryPage.classList.add("is-hidden");
    thoughtPage.classList.remove("is-hidden");
    await loadThoughtDetail();
    return;
  }

  frontpageStage.classList.remove("is-hidden");
  galleryPage.classList.add("is-hidden");
  thoughtPage.classList.add("is-hidden");
  loadCliCommandHistory();
  syncInterface();
  resetThought();
  initializeCliTranscript();
  syncInterface();

  try {
    const handledOpenRouterCallback = await handleOpenRouterCallback();
    if (handledOpenRouterCallback) {
      appendCliOutput(["openrouter linked.", "route: connect", "use: run"]);
    }
    void refreshCurrentModels({ silent: true });
  } catch (error) {
    cleanOpenRouterCallbackUrl();
    const message = error instanceof Error ? error.message : "openrouter connect failed.";
    setWarning(message);
    setStatus("failed.");
    appendCliError(
      message === "openrouter connect failed." ? message : ["openrouter connect failed.", message],
    );
  }

  bindWalletProviderEvents();
  await refreshWalletState();
  syncInterface();

  void ensureActiveThoughtSpec()
    .then(() => {
      syncThoughtInstructionsControls();
    })
    .catch(() => {
      syncThoughtInstructionsControls();
    });

  void document.fonts.load(`100 12px ${CANVAS_TEXT_FAMILY}`).then(() => {
    syncOutputToCanvas(currentOutputText, { suppressWarning: true });
  });
};

void initFrontpage();
