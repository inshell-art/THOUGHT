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

The Agent line is the identity-bearing face of a work. Exact UTF-8 Agent-line bytes are globally unique, so the same Agent line cannot mint twice even with a different prompt or provenance. The prompt remains fully stored, rendered, and included in the binary field. Both lines accept `1..64` exact UTF-8 bytes under the frozen visible-text profile. Display units affect only carousel rendering and are not an acceptance limit.

## Active Source

- [evm/src/ThoughtNFT.sol](evm/src/ThoughtNFT.sol): unversioned ERC-721 mint contract.
- [evm/src/ThoughtRenderer.sol](evm/src/ThoughtRenderer.sol): immutable renderer pinned by `ThoughtNFT`.
- [evm/src/ThoughtSpecRegistry.sol](evm/src/ThoughtSpecRegistry.sol): append-only exact-spec registry.
- [evm/src/ThoughtSpecRegistryV2.sol](evm/src/ThoughtSpecRegistryV2.sol): append-only compact protocol-release registry.
- [protocol/CURRENT.json](protocol/CURRENT.json): current protocol release pointer.
- [protocol/releases/v2/art/THOUGHT.v2.md](protocol/releases/v2/art/THOUGHT.v2.md): Agent-facing artistic specification.
- [protocol/integrations/agent-run/v2/thought-agent-run.v2.md](protocol/integrations/agent-run/v2/thought-agent-run.v2.md): sealed Agent transport integration.
- [artifacts/thought-v2/README.md](artifacts/thought-v2/README.md): artifact distribution contract for frontend consumers.

V1 contracts live in `evm/legacy/`; historical V1 specs and coordinator material remain in the repository as archive evidence. New deployment and integration code must not use V1 Color Font or preview dependencies.

## Renderer

`tokenURI` produces metadata with an embedded 960x960 SVG. The renderer id is `inshell.thought.svg.v2.binary-weave-32`.

The SVG uses a fixed 32x32 checkerboard field. Each exact UTF-8 line is independently cycled to 64 bytes/512 bits. Prompt bits travel row-wise through even-parity cells; Agent bits travel column-wise through odd-parity cells. The field is packed row-major, MSB-first into 128 bytes and is available through `binaryField(...)` and `binaryFieldOf(tokenId)`.

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

The active deployment registers `specs/THOUGHT.v2.md`, registers one exact manifest in `ThoughtSpecRegistryV2`, deploys `ThoughtRenderer` and the release-bound `ThoughtNFT`, configures PATH `THOUGHT` movement with quota `1`, then freezes that PATH movement configuration by default. Local scripts may use the draft manifest only on a local development chain. The draft is technically registrable but is not authorized for production registration. Sepolia and mainnet require an approved `release.manifest.json` and retrieval URI.

Sepolia uses `npm run ops:bundle:sepolia`. Mainnet requires the reviewed Ledger-admin procedure in [docs/ops/THOUGHT_MAINNET_DEPLOYMENT.md](docs/ops/THOUGHT_MAINNET_DEPLOYMENT.md).
