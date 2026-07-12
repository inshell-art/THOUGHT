# THOUGHT

THOUGHT is a human prompt transformed by an Agent into a fully onchain work. The active mint contract is public and unversioned: `ThoughtNFT`.

## Product Contract

Each work has two visible UTF-8 lines:

```text
promptLine = visible human material
agentLine  = visible Agent return
```

The human supplies the prompt, reviews the result, chooses a PATH, authorizes the wallet transaction, and decides whether to mint. The Agent receives one sealed task and returns one `agentLine`; it has no authority to select PATH, use a wallet, or mint.

`ThoughtNFT.mint(MintThoughtInput)` remains permissionless. A direct caller can mint without an Agent run when PATH authorization, exact registered-spec validation, visible text validation, unique work validation, and non-empty provenance requirements pass.

The Agent line is the identity-bearing face of a work. Exact UTF-8 Agent-line bytes are globally unique, so the same Agent line cannot mint twice even with a different prompt or provenance. The prompt remains fully stored, rendered, and included in the binary field. Visible-line limits are deterministic: prompt `320` UTF-8 bytes / `433` display units; Agent `180` UTF-8 bytes / `162` display units.

## Active Source

- [evm/src/ThoughtNFT.sol](evm/src/ThoughtNFT.sol): unversioned ERC-721 mint contract.
- [evm/src/ThoughtSpecRegistry.sol](evm/src/ThoughtSpecRegistry.sol): append-only exact-spec registry.
- [specs/THOUGHT.v2.md](specs/THOUGHT.v2.md): formal human/Agent contract.
- [docs/agent/THOUGHT_AGENT_FLOW_V2.md](docs/agent/THOUGHT_AGENT_FLOW_V2.md): sealed Agent and Plugin/MCP integration contract.
- [artifacts/thought-v2/README.md](artifacts/thought-v2/README.md): artifact distribution contract for frontend consumers.

V1 contracts live in `evm/legacy/`; historical V1 specs and coordinator material remain in the repository as archive evidence. New deployment and integration code must not use V1 Color Font or preview dependencies.

## Renderer

`tokenURI` produces metadata with an embedded 960x960 SVG. The renderer id is `thought.svg.v2.fixed-a-32`.

The SVG uses a fixed 32x32 binary field. It derives 1024 bits from exact UTF-8 bytes of `promptLine` followed by `agentLine`; short payloads repeat and long payloads truncate. The exact field is independently available through `binaryField(...)` and `binaryFieldOf(tokenId)`.

## Development

```bash
npm install
npm run build:evm
npm run test:evm
npm test
npm run build
```

For local EVM deployment, start Anvil and supply a local PATH address:

```bash
PATH_NFT_ADDRESS=<path-nft> PRIVATE_KEY=<local-key> npm run deploy:evm-local
```

The active deployment registers `specs/THOUGHT.v2.md`, deploys `ThoughtSpecRegistry` and `ThoughtNFT`, configures PATH `THOUGHT` movement with quota `1`, then freezes that PATH movement configuration by default.

Sepolia uses `npm run ops:bundle:sepolia`. Mainnet requires the reviewed Ledger-admin procedure in [docs/ops/THOUGHT_MAINNET_DEPLOYMENT.md](docs/ops/THOUGHT_MAINNET_DEPLOYMENT.md).
